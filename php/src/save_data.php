<?php
/*******************************************************
 * save_data.php
 *  - 클라이언트에서:
 *      1) "mode: partialUpdate" + "modified": { rowId => { colName => plainVal, ... }, ... }
 *         => 여러 셀을 한꺼번에 테이블 암호화 (AES-GCM) 후 UPDATE
 *      2) "mode: plainSave / encryptSave / upload / dbLoad" + "data": 2차원 배열
 *         => 기존 Insert(plain / 암호화) 로직
 *  - DB Insert or Update
 *  - JSON 응답 (JSON 형식)
 *******************************************************/

/*******************************************************
 * 로깅 함수
 *******************************************************/
function log_msg($message) {
    // 1) debug.log 에 기록
    $logFile = __DIR__ . '/debug.log';
    $timestamp = date("Y-m-d H:i:s");
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

/*******************************************************
 * env 파일 
 *******************************************************/
require __DIR__ . '/vendor/autoload.php'; 

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

/*******************************************************
 * PHP 에러 설정
 *******************************************************/
ini_set('display_errors', 0);
error_reporting(E_ALL);

/*******************************************************
 * JSON 응답 헤더
 *******************************************************/
header('Content-Type: application/json; charset=utf-8');

/*******************************************************
 * DB 연결정보
 *******************************************************/
$dbHost = $_ENV['DB_HOST'];
$dbName = $_ENV['DB_NAME'];
$dbUser = $_ENV['DB_USER'];
$dbPass = $_ENV['DB_PASS'];

/*******************************************************
 * 1) 요청 방식 체크 (POST 필수)
 *******************************************************/
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    log_msg("비정상 요청: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['success' => false, 'message' => 'Only POST allowed']);
    exit;
}
log_msg("요청 방식이 POST임을 확인.");

/*******************************************************
 * 2) JSON 파싱
 *******************************************************/
$rawInput = file_get_contents("php://input");
log_msg("원시 입력(앞부분): " . substr($rawInput, 0, 300));

$json = json_decode($rawInput, true);
if (!$json || !isset($json['mode'])) {
    log_msg("JSON 파싱 실패 or mode 필드 없음.");
    echo json_encode(['success' => false, 'message' => 'No mode in JSON']);
    exit;
}
$currentMode = $json['mode'];
log_msg("mode: $currentMode");

/*******************************************************
 * 3) DB 연결
 *******************************************************/
try {
    $pdo = new PDO("pgsql:host={$dbHost};dbname={$dbName}", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    log_msg("DB 연결 성공.");
} catch (\Exception $e) {
    log_msg("DB 연결 오류: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'DB connect error: ' . $e->getMessage()]);
    exit;
}

// 처리 시작 시각
$startTime = microtime(true);

/*******************************************************
 * (1) partialUpdate (테이블 암호화 후 일부만 UPDATE)
 *******************************************************/
if ($currentMode === 'partialUpdate') {
    log_msg("partialUpdate 모드 처리 시작.");

    if (!isset($json['modified']) || !is_array($json['modified'])) {
        log_msg("modified 데이터가 없거나 배열이 아님.");
        echo json_encode(['success' => false, 'message' => 'No modified data']);
        exit;
    }
    $modified = $json['modified']; // [ rowId => [ colName => plainVal, ... ], ... ]
    log_msg("modified: " . print_r($modified, true));

    // (A-1) rowList, colList 뽑기
    $rowList = array_keys($modified);
    sort($rowList, SORT_NUMERIC);
    $colSet = [];
    foreach ($modified as $rid => $colMap) {
        foreach ($colMap as $cName => $val) {
            $colSet[$cName] = true;
        }
    }
    $colList = array_keys($colSet);
    sort($colList, SORT_STRING);

    $rowCountEnc = count($rowList);
    $colCountEnc = count($colList);
    log_msg("rowCountEnc=$rowCountEnc, colCountEnc=$colCountEnc");

    // (A-2) 평문 테이블 구성
    $plainTable = [];
    for ($r=0; $r<$rowCountEnc; $r++){
        $rid = $rowList[$r];
        $rowData = $modified[$rid];
        $arr = [];
        for ($c=0; $c<$colCountEnc; $c++){
            $cName = $colList[$c];
            $arr[$c] = isset($rowData[$cName]) ? (string)$rowData[$cName] : "";
        }
        $plainTable[$r] = $arr;
    }

    // (A-3) AES-GCM 설정
    $password    = "MySecretPass!";
    $salt        = "\x01\x02\x03\x04";
    $key_len     = 32;
    $iteration   = 10000;
    $USE_BASE64  = true;
    $THREAD_COUNT= 4;

    // (A-3-a) FFI 로딩
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

            uint8_t* hcrypt_encrypt_table_mt_alloc(
                hcrypt_gcm_kdf* hc,
                const uint8_t** table,
                const int* cell_sizes,
                int rowCount,
                int colCount,
                int threadCount,
                int* out_len
            );

            void hcrypt_free(uint8_t* data);
        ", $soPath);
        log_msg("FFI so 로딩 성공: $soPath");
    } catch(\Exception $ex) {
        log_msg("FFI 로딩 오류: " . $ex->getMessage());
        echo json_encode(['success'=>false,'message'=>'FFI load error: '.$ex->getMessage()]);
        exit;
    }

    $hc = $ffi->hcrypt_new();
    if (!$hc) {
        log_msg("hcrypt_new 실패");
        echo json_encode(['success'=>false,'message'=>'hcrypt_new fail']);
        exit;
    }
    // KDF
    $salt_c = FFI::new("uint8_t[" . strlen($salt) . "]", false);
    FFI::memcpy($salt_c, $salt, strlen($salt));
    $ffi->hcrypt_deriveKeyFromPassword(
        $hc,
        $password,
        $salt_c,
        strlen($salt),
        $key_len,
        $iteration
    );

    // (A-4) 2D -> C 포인터
    $totalCells = $rowCountEnc * $colCountEnc;
    $table_c = $ffi->new("const uint8_t*[$totalCells]");
    $size_c  = $ffi->new("int[$totalCells]");
    $cellIndex = 0;
    for ($r=0; $r<$rowCountEnc; $r++){
        for ($c=0; $c<$colCountEnc; $c++){
            $plainVal = $plainTable[$r][$c];
            $valLen = strlen($plainVal);
            $size_c[$cellIndex] = $valLen;
            if ($valLen > 0) {
                $plain_c = $ffi->new("uint8_t[$valLen]", false);
                FFI::memcpy($plain_c, $plainVal, $valLen);
                $table_c[$cellIndex] = $plain_c;
            } else {
                $table_c[$cellIndex] = null;
            }
            $cellIndex++;
        }
    }

    // (A-5) 암호화
    $out_len_c = $ffi->new("int", false);
    $enc_ptr = $ffi->hcrypt_encrypt_table_mt_alloc(
        $hc,
        $table_c,
        $size_c,
        $rowCountEnc,
        $colCountEnc,
        $THREAD_COUNT,
        FFI::addr($out_len_c)
    );
    if (!$enc_ptr) {
        $ffi->hcrypt_delete($hc);
        log_msg("encrypt_table_mt_alloc 실패");
        echo json_encode(['success'=>false,'message'=>'encrypt_table_mt_alloc fail']);
        exit;
    }
    $encSize = $out_len_c->cdata;
    $encBin  = FFI::string($enc_ptr, $encSize);
    $ffi->hcrypt_free($enc_ptr);

    // (A-6) 암호문 분할
    $offset = 0;
    $encryptedCells = [];
    for ($r=0; $r<$rowCountEnc; $r++){
        $rowEnc = [];
        for ($c=0; $c<$colCountEnc; $c++){
            if ($offset + 4 > $encSize) {
                $rowEnc[$c] = "";
                continue;
            }
            $cellLenData = substr($encBin, $offset, 4);
            $cellLen = unpack("l", $cellLenData)[1];
            $offset += 4;
            if ($offset + $cellLen > $encSize) {
                $rowEnc[$c] = "";
                continue;
            }
            $cellCipher = substr($encBin, $offset, $cellLen);
            $offset += $cellLen;

            if ($USE_BASE64 && $cellLen > 0) {
                $rowEnc[$c] = base64_encode($cellCipher);
            } else {
                $rowEnc[$c] = $cellCipher;
            }
        }
        $encryptedCells[$r] = $rowEnc;
    }

    // (A-7) DB Update
    $rowsUpdated = 0;
    try {
        $pdo->beginTransaction();
        for ($r=0; $r<$rowCountEnc; $r++){
            $idVal = $rowList[$r];
            $updateMap = [];
            for ($c=0; $c<$colCountEnc; $c++){
                $colName = $colList[$c];
                if (!isset($modified[$idVal][$colName])) {
                    continue;
                }
                $updateMap[$colName] = $encryptedCells[$r][$c] ?? "";
            }
            if (empty($updateMap)) {
                continue;
            }
            $setParts = [];
            $values   = [];
            foreach ($updateMap as $cName => $cVal) {
                $setParts[] = "$cName=?";
                $values[]   = $cVal;
            }
            $sql = "UPDATE big_table SET ".implode(',', $setParts)." WHERE id=?";
            $values[] = $idVal;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
            $cnt = $stmt->rowCount();
            $rowsUpdated += $cnt;
        }
        $pdo->commit();
        $ffi->hcrypt_delete($hc);

        $elapsedSec = microtime(true) - $startTime;
        log_msg("partialUpdate 완료. rowsUpdated=$rowsUpdated, elapsedSec=$elapsedSec");

        echo json_encode([
            'success'=>true,
            'message'=>"partialUpdate(테이블 암호화) 완료",
            'rowsUpdated'=>$rowsUpdated,
            'elapsedSec'=>round($elapsedSec,4)
        ]);
        exit;
    } catch(\Exception $ex) {
        $pdo->rollBack();
        $ffi->hcrypt_delete($hc);
        log_msg("partialUpdate 중 오류: ".$ex->getMessage());
        echo json_encode(['success'=>false,'message'=>'partialUpdate error: '.$ex->getMessage()]);
        exit;
    }
} // end of partialUpdate

/*******************************************************
 * (2) plainSave / encryptSave / etc.
 *     여기서는 "data" (2차원 배열)이 필요
 *******************************************************/
if (!isset($json['data']) || !is_array($json['data'])) {
    log_msg("data가 없거나 배열이 아님.");
    echo json_encode(['success'=>false,'message'=>'No data in JSON']);
    exit;
}

$allRows = $json['data'];
$rowCount = count($allRows);
$colCount = 0;
foreach ($allRows as $r) {
    $c = count($r);
    if ($c > $colCount) $colCount = $c;
}
log_msg("수신된 data 행: $rowCount, 열: $colCount");
// log_msg("수신된 allRows(일부): " . print_r($allRows, true)); // 필요 시 전체 출력

// 필요하다면, 여기서 "헤더 제거" 로직을 적용할 수도 있음
// array_shift($allRows);
// $rowCount = count($allRows);

/*******************************************************
 * (2-A) plainSave
 *******************************************************/
if ($currentMode === 'plainSave') {
    try {
        $pdo->beginTransaction();
        $rowsAffected = 0;

        foreach ($allRows as $rIdx => $rowData) {
            // rowData = ["1"=>"박사영","2"=>"1111111111","3"=>"012345-6789012",...]

            // 숫자 키를 "col{숫자}" 로 변환
            $mapped = [];
            foreach ($rowData as $numKey => $val) {
                $colName = "col{$numKey}";
                $mapped[$colName] = $val;
            }
            // $mapped = ["col1"=>"박사영","col2"=>"1111111111","col3"=>"012345-6789012",...]

            // 이제 $mapped의 키를 사용
            $colNames = array_keys($mapped);         // ["col1","col2","col3",...]
            sort($colNames);                         // 정렬 (선택)
            // Postgres 안전하게 열 이름에 쌍따옴표
            $colNamesQuoted = array_map(fn($cn) => "\"$cn\"", $colNames);

            $placeholders = array_fill(0, count($colNames), '?');
            $sql = "INSERT INTO big_table (".implode(',', $colNamesQuoted).") 
                    VALUES (".implode(',', $placeholders).")";
            $stmt = $pdo->prepare($sql);

            // values
            $values = [];
            foreach ($colNames as $cn) {
                $values[] = $mapped[$cn];
            }

            $stmt->execute($values);
            $rowsAffected++;
        }

        $pdo->commit();
        $elapsed = microtime(true) - $startTime;
        log_msg("plainSave 완료. rowsAffected=$rowsAffected, elapsed=$elapsed");

        echo json_encode([
            'success' => true,
            'message' => "plainSave 완료",
            'rowCount' => $rowCount,
            'colCount' => $colCount,
            'rowsAffected' => $rowsAffected,
            'elapsedSec' => round($elapsed, 4)
        ]);
        exit;
    } catch(\Exception $ex) {
        $pdo->rollBack();
        log_msg("plainSave 오류: ".$ex->getMessage());
        echo json_encode(['success'=>false,'message'=>'plainSave error: '.$ex->getMessage()]);
        exit;
    }
}

/*******************************************************
 * (2-B) 암호화 후 저장 (encryptSave, upload, dbLoad)
 *******************************************************/
elseif ($currentMode === 'encryptSave'
     || $currentMode === 'upload'
     || $currentMode === 'dbLoad')
{
    log_msg("$currentMode 모드 시작.");

    // --------------------------------------------------
    // (B-0) "allRows"는 [ { col1:"aaa", col2:"bbb", ...}, {...} ] 형태라 가정
    //       암호화 로직은 2차원 [r][c] 인덱스 구조를 요구하므로,
    //       전송된 연관배열 each row → 정수 인덱스 배열로 변환
    // --------------------------------------------------
    $transformed = [];    // 2차원 정수 인덱스용
    $maxCols = 0;         // 실제 열 개수

    foreach ($allRows as $rIndex => $rowAssoc) {
        // 예: $rowAssoc = ["col1"=>"박사영","col2"=>"1111111111","col3"=>"012345-6789012",...]

        // 1) 정렬하여 col1, col2, col3 순서 확정
        $colKeys = array_keys($rowAssoc);
        sort($colKeys);  // ["col1","col2","col3",...]

        // 2) 이 행을 숫자 인덱스로 변환
        $numericRow = [];
        foreach ($colKeys as $ck) {
            $numericRow[] = (string)$rowAssoc[$ck];
        }
        // numericRow 예: [ "박사영","1111111111","012345-6789012",...]

        $transformed[$rIndex] = $numericRow;
        if (count($numericRow) > $maxCols) {
            $maxCols = count($numericRow);
        }
    }

    // 이제 $transformed[r][c]가 기존 암호화 로직이 기대하던 형태
    $rowCount = count($transformed);
    $colCount = $maxCols;
    $allRows  = $transformed; // 아래 기존 암호화 코드에서 $allRows를 씀

    // --------------------------------------------------
    // (B-1) 이하 기존 AES-GCM 로직 (hcrypt_encrypt_table_mt_alloc 등)은 그대로
    // --------------------------------------------------

    $password    = "MySecretPass!";
    $salt        = "\x01\x02\x03\x04";
    $key_len     = 32;
    $iteration   = 10000;
    $USE_BASE64  = true;
    $THREAD_COUNT= 4;

    // so 파일 로딩
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

            uint8_t* hcrypt_encrypt_table_mt_alloc(
                hcrypt_gcm_kdf* hc,
                const uint8_t** table,
                const int* cell_sizes,
                int rowCount,
                int colCount,
                int threadCount,
                int* out_len
            );

            void hcrypt_free(uint8_t* data);
        ", $soPath);
        log_msg("FFI 로딩 성공: $soPath");
    } catch (\Exception $ex) {
        log_msg("FFI 로딩 오류: " . $ex->getMessage());
        echo json_encode(['success'=>false,'message'=>'FFI load error: '.$ex->getMessage()]);
        exit;
    }

    $hc = $ffi->hcrypt_new();
    if (!$hc) {
        log_msg("hcrypt_new 실패.");
        echo json_encode(['success'=>false,'message'=>'hcrypt_new fail']);
        exit;
    }

    // KDF
    $salt_c = FFI::new("uint8_t[" . strlen($salt) . "]", false);
    FFI::memcpy($salt_c, $salt, strlen($salt));
    $ffi->hcrypt_deriveKeyFromPassword(
        $hc,
        $password,
        $salt_c,
        strlen($salt),
        $key_len,
        $iteration
    );

    // (B-2) 2D 배열 -> C 포인터 (기존)
    $totalCells = $rowCount * $colCount;
    $table_c = $ffi->new("const uint8_t*[$totalCells]");
    $size_c  = $ffi->new("int[$totalCells]");
    log_msg("encryptSave: totalCells=$totalCells ($rowCount 행 x $colCount 열)");

    $cellIndex = 0;
    for ($r=0; $r<$rowCount; $r++) {
        $vals = $allRows[$r]; // [ "박사영","1111111111","012345-6789012", ... ]
        for ($c=0; $c<$colCount; $c++) {
            $origVal = isset($vals[$c]) ? (string)$vals[$c] : '';
            $cellLen = strlen($origVal);
            $size_c[$cellIndex] = $cellLen;
            if ($cellLen > 0) {
                $plain_c = $ffi->new("uint8_t[$cellLen]", false);
                FFI::memcpy($plain_c, $origVal, $cellLen);
                $table_c[$cellIndex] = $plain_c;
            } else {
                $table_c[$cellIndex] = null;
            }
            $cellIndex++;
        }
    }

    // (B-3) 암호화 (멀티스레드)
    $out_len_c = $ffi->new("int", false);
    $enc_ptr = $ffi->hcrypt_encrypt_table_mt_alloc(
        $hc,
        $table_c,
        $size_c,
        $rowCount,
        $colCount,
        $THREAD_COUNT,
        FFI::addr($out_len_c)
    );
    if (!$enc_ptr) {
        log_msg("hcrypt_encrypt_table_mt_alloc 실패");
        echo json_encode(['success'=>false,'message'=>'encrypt_table_mt_alloc fail']);
        exit;
    }
    $encSize = $out_len_c->cdata;
    $encBin  = FFI::string($enc_ptr, $encSize);
    $ffi->hcrypt_free($enc_ptr);

    log_msg("암호화된 전체 크기: $encSize bytes");

    // (B-4) 암호문 -> 분할, 다시 ["col1"=>"(암호문)", "col2"=>"(암호문)", ...] 형태로 만들기
    function colName($idx) { return "col".($idx+1); }

    $offset = 0;
    $encryptedRows = [];

    for ($r=0; $r<$rowCount; $r++) {
        $rowAssoc = [];
        for ($c=0; $c<$colCount; $c++){
            if ($offset + 4 > $encSize) {
                $rowAssoc[colName($c)] = '';
                continue;
            }
            $encCellLenData = substr($encBin, $offset, 4);
            $encCellLen = unpack("l", $encCellLenData)[1];
            $offset += 4;

            if ($offset + $encCellLen > $encSize) {
                $rowAssoc[colName($c)] = '';
                continue;
            }
            $cipherData = substr($encBin, $offset, $encCellLen);
            $offset += $encCellLen;

            if ($USE_BASE64 && $encCellLen > 0) {
                $rowAssoc[colName($c)] = base64_encode($cipherData);
            } else {
                $rowAssoc[colName($c)] = $cipherData;
            }
        }
        // 예: rowAssoc = [ "col1"=>"(암호문)", "col2"=>"(암호문)" ... ]
        $encryptedRows[] = $rowAssoc;
    }

    // (B-5) DB Insert / Update
    $rowsAffected = 0;
    try {
        $pdo->beginTransaction();

        if ($currentMode === 'encryptSave' || $currentMode === 'upload') {
            // 새 Insert 예시
            foreach ($encryptedRows as $rIndex => $rAssoc) {
                $cols = array_keys($rAssoc);
                // Postgres 안전하게 "col1","col2"
                $colNamesQuoted = array_map(fn($cn) => "\"".$cn."\"", $cols);

                $placeholders = array_fill(0, count($cols), '?');
                $sql = "INSERT INTO big_table (".implode(',', $colNamesQuoted).") 
                        VALUES (".implode(',', $placeholders).")";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(array_values($rAssoc));
                $rowsAffected++;
            }
        } elseif ($currentMode === 'dbLoad') {
            // 예: 첫 행만 id=1 에 업데이트
            if (!empty($encryptedRows)) {
                $rAssoc = $encryptedRows[0];
                $sets = [];
                foreach ($rAssoc as $col => $val) {
                    $sets[] = "\"$col\"=?";
                }
                $sql = "UPDATE big_table SET ".implode(',', $sets)." WHERE id=1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(array_values($rAssoc));
                $rowsAffected = $stmt->rowCount();
            }
        }

        $pdo->commit();
        $ffi->hcrypt_delete($hc);
        $elapsedSec = microtime(true) - $startTime;
        log_msg("$currentMode 완료. rowsAffected=$rowsAffected, elapsed=$elapsedSec");

        echo json_encode([
            'success'=>true,
            'message'=>"암호화 후 DB($currentMode) 완료",
            'rowCount'=>$rowCount,
            'colCount'=>$colCount,
            'rowsAffected'=>$rowsAffected,
            'elapsedSec'=>round($elapsedSec,4)
        ]);
        exit;
    } catch(\Exception $ex) {
        $pdo->rollBack();
        $ffi->hcrypt_delete($hc);
        log_msg("$currentMode 중 오류: " . $ex->getMessage());
        echo json_encode(['success'=>false,'message'=>"DB error: ".$ex->getMessage()]);
        exit;
    }
} // end encryptSave|upload|dbLoad


/*******************************************************
 * (3) 기타 모드
 *******************************************************/
else {
    log_msg("알 수 없는 모드: $currentMode");
    echo json_encode(['success'=>false,'message'=>"Unknown mode: $currentMode"]);
    exit;
}
?>
