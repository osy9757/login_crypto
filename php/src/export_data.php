<?php
/*******************************************************
 * export_data.php
 *  - GET 파라미터 ?mode=plainExport or encryptExport
 *    기존 기능 유지
 *  - POST 요청 시
 *    - mode: loadDecrypted
 *    - modifiedData: sessionStorage에서 전달된 수정된 데이터
 *    - 복호화된 데이터에 modifiedData 적용 후 엑셀 다운로드
 *******************************************************/
ini_set('display_errors', 0);
error_reporting(E_ALL);

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

require __DIR__ . '/vendor/autoload.php'; // PhpSpreadsheet + Composer

$method = $_SERVER['REQUEST_METHOD'];

/*******************************************************
 * DB 연결정보
 *******************************************************/
$dbHost = $_ENV['DB_HOST'];
$dbName = $_ENV['DB_NAME'];
$dbUser = $_ENV['DB_USER'];
$dbPass = $_ENV['DB_PASS'];

if ($method === 'POST') {
    // 2. POST 요청 처리
    // JSON 데이터 파싱
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['currentMode']) || $input['currentMode'] !== 'loadDecrypted') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid mode or missing parameters.']);
        exit;
    }

    if (!isset($input['modifiedData']) || !is_array($input['modifiedData'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or missing modifiedData.']);
        exit;
    }

    $modifiedData = $input['modifiedData'];

    // 4. 데이터베이스에서 모든 데이터 복호화

    try {
        $pdo = new PDO("pgsql:host={$dbHost};dbname={$dbName}", $dbUser, $dbPass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch(Exception $e) {
        echo json_encode(['success' => false, 'message' => 'DB connection error: ' . $e->getMessage()]);
        exit;
    }

    // 조회할 컬럼 설정 (예: id, col1, col2, ..., col120)
    $columns = ['id'];
    for ($i = 1; $i <= 120; $i++) {
        $columns[] = 'col' . $i;
    }
    $columnsStr = implode(', ', $columns);

    try {
        $sql = "SELECT $columnsStr FROM big_table ORDER BY id ASC";
        $stmt = $pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch(Exception $ex) {
        echo json_encode(['success' => false, 'message' => 'Select error: ' . $ex->getMessage()]);
        exit;
    }

    if (!$rows) {
        $rows = [];
    }

    // "id"를 제외한 나머지 컬럼을 "암호문 컬럼"으로 취급
    $allColumns = array_keys($rows[0] ?? []);
    $encColumns = [];
    foreach ($allColumns as $col) {
        if ($col !== 'id') {
            $encColumns[] = $col;
        }
    }

    // mode가 'loadDecrypted'인 경우 복호화 수행
    if ($input['currentMode'] === 'loadDecrypted') {
        // 복호화 설정
        $password   = "MySecretPass!";
        $salt       = "\x01\x02\x03\x04";
        $key_len    = 32; 
        $iteration  = 10000; 
        $THREAD_COUNT = 4;

        try {
            $soPath = __DIR__ . '/aes_gcm_multi.so';
            $ffi = FFI::cdef("
                typedef struct hcrypt_gcm_kdf hcrypt_gcm_kdf;
                hcrypt_gcm_kdf* hcrypt_new();
                void hcrypt_delete(hcrypt_gcm_kdf* hc);

                void hcrypt_deriveKeyFromPassword(
                    hcrypt_gcm_kdf* hc,
                    const char* password,
                    const uint8_t* salt,
                    int salt_len,
                    int key_len,
                    int iteration
                );

                // 멀티스레드 복호화 함수
                uint8_t* hcrypt_decrypt_table_mt_alloc(
                    hcrypt_gcm_kdf* hc,
                    const uint8_t* enc_data,
                    int enc_data_len,
                    int rowCount,
                    int colCount,
                    int threadCount,
                    int* out_len
                );

                void hcrypt_free(uint8_t* data);
            ", $soPath);
            if(!$ffi) {
                throw new Exception("FFI load failed");
            }
        } catch(Exception $ex) {
            echo json_encode(['success' => false, 'message' => 'FFI load error: ' . $ex->getMessage()]);
            exit;
        }

        $hc = $ffi->hcrypt_new();
        if(!$hc){
            echo json_encode(['success' => false, 'message' => 'hcrypt_new failed']);
            exit;
        }

        // 키 파생 (KDF)
        $salt_c = FFI::new("uint8_t[" . strlen($salt) . "]", false);
        FFI::memcpy($salt_c, $salt, strlen($salt));
        $ffi->hcrypt_deriveKeyFromPassword($hc, $password, $salt_c, strlen($salt), $key_len, $iteration);

        // 암호화된 데이터 블록 생성
        $rowCount = count($rows);
        $colCountEnc = count($encColumns);

        $encBin = '';
        foreach ($rows as $r) {
            foreach ($encColumns as $encCol) {
                $cipherB64 = $r[$encCol] ?? null;
                if (is_null($cipherB64) || trim($cipherB64) === '') {
                    $encBin .= pack('l', 0);
                } else {
                    $cipherBin = base64_decode($cipherB64);
                    $encLen = strlen($cipherBin);
                    $encBin .= pack('l', $encLen) . $cipherBin;
                }
            }
        }
        $enc_data = $encBin;
        $enc_len  = strlen($enc_data);

        $enc_data_c = $ffi->new("uint8_t[$enc_len]", false);
        FFI::memcpy($enc_data_c, $enc_data, $enc_len);

        // 복호화 호출
        $out_len_c = FFI::new("int", false);
        $dec_ptr = $ffi->hcrypt_decrypt_table_mt_alloc(
            $hc,
            $enc_data_c,
            $enc_len,
            $rowCount,
            $colCountEnc,
            $THREAD_COUNT,
            FFI::addr($out_len_c)
        );
        if(!$dec_ptr){
            $ffi->hcrypt_delete($hc);
            echo json_encode(['success' => false, 'message' => 'Decrypt failed']);
            exit;
        }
        $decSize = $out_len_c->cdata;
        $decBin = FFI::string($dec_ptr, $decSize);
        $ffi->hcrypt_free($dec_ptr);

        // 복호화된 데이터 삽입
        $ofs = 0;
        foreach($rows as $rIndex => &$rowObj){
            foreach($encColumns as $encCol){
                if($ofs + 4 > $decSize){
                    $rowObj[$encCol] = "";
                    continue;
                }
                $plainLenData = substr($decBin, $ofs, 4);
                $plainLen = unpack("l", $plainLenData)[1];
                $ofs += 4;

                if($ofs + $plainLen > $decSize){
                    $rowObj[$encCol] = "";
                    continue;
                }
                $plainData = substr($decBin, $ofs, $plainLen);
                $ofs += $plainLen;

                // 평문 대입
                $rowObj[$encCol] = $plainData;
            }
        }
        unset($rowObj);

        $ffi->hcrypt_delete($hc);
    }

    // 5. modifiedData를 복호화된 데이터에 업데이트 (데이터베이스에 영향 주지 않음)
    foreach ($rows as &$row) {
        $rowId = $row['id'];
        if (isset($modifiedData[$rowId]) && is_array($modifiedData[$rowId])) {
            foreach ($modifiedData[$rowId] as $colName => $newValue) {
                if (array_key_exists($colName, $row)) {
                    $row[$colName] = $newValue;
                }
            }
        }
    }
    unset($row);

    // 6. 업데이트된 데이터를 엑셀 파일로 다운로드
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();

    // 컬럼 목록 동적으로 구하기
    $colNames = [];
    if (count($rows) > 0) {
        $colNames = array_keys($rows[0]);
    }
    $colCount = count($colNames);

    // 헤더 설정
    for($i = 0; $i < $colCount; $i++){
        $sheet->setCellValueByColumnAndRow($i + 1, 1, $colNames[$i]);
    }

    // 내용 삽입
    $rowNum = 2;
    foreach($rows as $rowObj){
        $colIndex = 1;
        foreach($colNames as $cn){
            $val = isset($rowObj[$cn]) ? $rowObj[$cn] : "";
            $sheet->setCellValueByColumnAndRow($colIndex, $rowNum, $val);
            $colIndex++;
        }
        $rowNum++;
    }

    // 엑셀 파일 생성 및 다운로드
    $writer = new Xlsx($spreadsheet);
    
    // 엑셀 파일 다운로드를 위해 헤더 설정
    header("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    header('Content-Disposition: attachment; filename="updated_export.xlsx"');
    header('Cache-Control: max-age=0');

    $writer->save("php://output");
    exit;

} elseif ($method === 'GET') {
    // 기존 GET 방식 처리 (plainExport or encryptExport)

    $mode = isset($_GET['mode']) ? $_GET['mode'] : 'encryptExport';

    try {
        $pdo = new PDO("pgsql:host={$dbHost};dbname={$dbName}", $dbUser, $dbPass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch(Exception $e) {
        echo "DB error: " . $e->getMessage();
        exit;
    }

    /*******************************************************
     * 1) 테이블 SELECT (모든 열) -> $rows
     *******************************************************/
    // 예시: big_table에 1개 PK(id) + 여러 colX
    $columns = ['id']; // 평문 컬럼
    for ($i = 1; $i <= 120; $i++) {
        $columns[] = 'col' . $i;
    }
    $columnsStr = implode(', ', $columns);
    try {
        // SELECT * 로 모든 컬럼. 필요하면 "WHERE" etc. 
        // 아래 예에선 "id, col1, col2, ..., colN"이 전부.
        $sql = "SELECT $columnsStr FROM big_table ORDER BY id ASC";
        $stmt= $pdo->query($sql);
        $rows= $stmt->fetchAll(PDO::FETCH_ASSOC);

    } catch(Exception $ex) {
        echo "Select error: ".$ex->getMessage();
        exit;
    }

    if (!$rows) {
        // 빈 엑셀
        $rows = [];
    }

    /*******************************************************
     * (A) 동적으로 "어떤 컬럼들이 암호문인지" 결정
     *******************************************************/
    // 예시: "id"는 평문(자동증가), 나머지 "colX"들은 암호문
    // 실제론 DB 스키마에 맞춰 조정
    $allColumns = array_keys($rows[0] ?? []);  // 예: ["id","col1","col2","col3",...]
    $colCount   = count($allColumns);

    // "id"를 제외한 나머지 컬럼을 "암호문 컬럼"으로 취급
    $encColumns = [];
    foreach ($allColumns as $col) {
        if ($col !== 'id') {
            $encColumns[] = $col;
        }
    }

    /*******************************************************
     * (B) 평문 vs 암호문 분기
     *     - encryptExport => 그대로
     *     - plainExport => aes_gcm_multi.so 복호화
     *******************************************************/
    if ($mode === 'plainExport') {
        // (B-1) aes_gcm_multi.so 로드 + KDF
        $password   = "MySecretPass!";
        $salt       = "\x01\x02\x03\x04";
        $key_len    = 32; 
        $iteration  = 10000; 
        $THREAD_COUNT = 4;

        try {
            $soPath = __DIR__ . '/aes_gcm_multi.so';
            $ffi = FFI::cdef("
                typedef struct hcrypt_gcm_kdf hcrypt_gcm_kdf;
                hcrypt_gcm_kdf* hcrypt_new();
                void hcrypt_delete(hcrypt_gcm_kdf* hc);

                void hcrypt_deriveKeyFromPassword(
                    hcrypt_gcm_kdf* hc,
                    const char* password,
                    const uint8_t* salt,
                    int salt_len,
                    int key_len,
                    int iteration
                );

                // 멀티스레드 복호화 함수
                uint8_t* hcrypt_decrypt_table_mt_alloc(
                    hcrypt_gcm_kdf* hc,
                    const uint8_t* enc_data,
                    int enc_data_len,
                    int rowCount,
                    int colCount,
                    int threadCount,
                    int* out_len
                );

                void hcrypt_free(uint8_t* data);
            ", $soPath);
            if(!$ffi) {
                throw new Exception("FFI load failed");
            }
        } catch(Exception $ex) {
            echo "FFI load error: ".$ex->getMessage();
            exit;
        }

        $hc= $ffi->hcrypt_new();
        if(!$hc){
            echo "hcrypt_new fail";
            exit;
        }

        // KDF
        $salt_c = FFI::new("uint8_t[".strlen($salt)."]", false);
        FFI::memcpy($salt_c, $salt, strlen($salt));
        $ffi->hcrypt_deriveKeyFromPassword($hc, $password, $salt_c, strlen($salt), $key_len, $iteration);

        // (B-2) 암호화된 데이터 블록 만들기
        //  - 각 행 × (암호문 컬럼만) => [4바이트 encSize + encData]
        //  - "id" 등 평문 컬럼은 복호화 필요 없음 => 그대로 유지
        $rowCount = count($rows);
        $colCountEnc = count($encColumns);

        // encBin
        $encBin = '';
        foreach ($rows as $r) {
            foreach ($encColumns as $encCol) {
                // null 혹은 빈 문자열 체크
                $cipherB64 = $r[$encCol] ?? null;
                if (is_null($cipherB64) || trim($cipherB64) === '') {
                    // NULL/빈값이면, 길이 0인 암호문으로 취급
                    $encBin .= pack('l', 0);
                } else {
                    // base64 decode
                    $cipherBin = base64_decode($cipherB64);
                    $encLen = strlen($cipherBin);
                    $encBin .= pack('l', $encLen) . $cipherBin;
                }
            }
        }
        $enc_data = $encBin;
        $enc_len  = strlen($enc_data);

        $enc_data_c= $ffi->new("uint8_t[$enc_len]", false);
        FFI::memcpy($enc_data_c, $enc_data, $enc_len);

        // (B-3) 복호화 => [4바이트 plainLen+plainData] × (rowCount*encColumns)
        $out_len_c= FFI::new("int", false);
        $dec_ptr= $ffi->hcrypt_decrypt_table_mt_alloc(
            $hc,
            $enc_data_c,
            $enc_len,
            $rowCount,
            $colCountEnc,
            $THREAD_COUNT,
            FFI::addr($out_len_c)
        );
        if(!$dec_ptr){
            $ffi->hcrypt_delete($hc);
            echo "decrypt fail";
            exit;
        }
        $decSize= $out_len_c->cdata;
        $decBin= FFI::string($dec_ptr, $decSize);
        $ffi->hcrypt_free($dec_ptr);

        // (B-4) 파싱 => rows[][]에 복호문 대입
        $ofs=0;
        $cellIndex=0;
        foreach($rows as $rIndex => &$rowObj){
            foreach($encColumns as $encCol){
                if($ofs + 4 > $decSize){
                    $rowObj[$encCol] = "";
                    continue;
                }
                $plainLenData = substr($decBin, $ofs, 4);
                $plainLen = unpack("l", $plainLenData)[1];
                $ofs += 4;

                if($ofs + $plainLen > $decSize){
                    $rowObj[$encCol] = "";
                    continue;
                }
                $plainData = substr($decBin, $ofs, $plainLen);
                $ofs += $plainLen;

                // 평문 대입
                $rowObj[$encCol] = $plainData;
                $cellIndex++;
            }
        }
        unset($rowObj);

        $ffi->hcrypt_delete($hc);
    } // else if($mode==='encryptExport') => 그냥 $rows 그대로

    // 5. modifiedData를 복호화된 데이터에 업데이트 (데이터베이스에 영향 주지 않음)
    // 'loadDecrypted' 모드일 때만 수행
    if ($mode === 'loadDecrypted') {
        // POST 요청에서 전달된 modifiedData는 이미 복호화된 데이터에 적용되었을 것으로 가정
        // 하지만 현재 GET 요청 처리 부분과 분리되어 있으므로, 별도로 처리하지 않음
        // 실제로는 POST 요청에서 처리되므로 여기서는 GET 요청에 'loadDecrypted'가 올 가능성은 낮음
    }

    /*******************************************************
     * 3) PhpSpreadsheet로 XLSX
     *******************************************************/
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();

    // (C-1) 컬럼 목록 동적으로 구하기 (array_keys of first row)
    $colNames = [];
    if (count($rows) > 0) {
        $colNames = array_keys($rows[0]); // e.g. ["id","col1","col2","col3","col4",...]
    }
    $colCount = count($colNames);

    // (C-2) 헤더: 1행
    for($i=0; $i<$colCount; $i++){
        $sheet->setCellValueByColumnAndRow($i+1,1,$colNames[$i]);
    }

    // (C-3) 내용
    $rowNum=2;
    foreach($rows as $rowObj){
        $colIndex=1;
        foreach($colNames as $cn){
            $val = isset($rowObj[$cn]) ? $rowObj[$cn] : "";
            $sheet->setCellValueByColumnAndRow($colIndex, $rowNum, $val);
            $colIndex++;
        }
        $rowNum++;
    }

    /*******************************************************
     * 4) 출력(다운로드)
     *******************************************************/
    $writer= new Xlsx($spreadsheet);

    if ($mode === 'loadDecrypted') {
        // 6. 업데이트된 데이터를 엑셀 파일로 다운로드
        // 별도의 헤더 설정 없이 파일을 직접 다운로드

        // 엑셀 파일 다운로드를 위해 헤더 재설정
        header("Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        header('Content-Disposition: attachment; filename="updated_export.xlsx"');
        header('Cache-Control: max-age=0');

        $writer->save("php://output");
        exit;
    } else {
        // 기존 GET 요청 처리 (plainExport or encryptExport)
        // 엑셀 파일 다운로드

        $writer->save("php://output");
        exit;
    }
}
?>
