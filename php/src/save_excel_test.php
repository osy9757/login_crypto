<?php
/**
 * save_excel_test.php - 엑셀 데이터 테스트용 저장 처리 (PHP 7.4 호환)
 * 객체 배열 형태 데이터 처리, AES-GCM 멀티스레드 암호화 적용
 */

ob_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

// DB 설정 파일 포함
require_once __DIR__ . '/db_config.php';

// POST 방식 및 JSON 데이터 검증
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!$input || !isset($input['data']) || !is_array($input['data'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid request format']);
    exit;
}

$data = $input['data'];
if (count($data) === 0) {
    echo json_encode(['success' => false, 'message' => '데이터가 없습니다']);
    exit;
}

// 첫 번째 행의 키로 컬럼 이름 결정 (유효하지 않으면 colN으로 변경)
$firstRow = reset($data);
$originalColumnNames = array_keys($firstRow);
$columnNames = [];
foreach ($originalColumnNames as $idx => $name) {
    $columnNames[] = (is_numeric($name) || !preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $name))
                     ? "col" . ($idx + 1) : $name;
}

$startTime = microtime(true);
$pdo = getDBConnection();
$pdo->beginTransaction();

// 최대 60개 컬럼 사용
$maxColumns = 60;
$useColumns = min($maxColumns, count($originalColumnNames));
$usedColumnNames = array_slice($columnNames, 0, $useColumns);
$usedOriginalColumnNames = array_slice($originalColumnNames, 0, $useColumns);
$escapedColumnNames = array_map(function($col) { return "`$col`"; }, $usedColumnNames);

// 2차원 배열 데이터 변환
$transformedData = [];
foreach ($data as $row) {
    $rowValues = [];
    foreach ($usedOriginalColumnNames as $col) {
        $rowValues[] = isset($row[$col]) ? (string)$row[$col] : '';
    }
    $transformedData[] = $rowValues;
}

// AES-GCM 설정
$password    = "MySecretPass!";
$salt        = "\x01\x02\x03\x04";
$key_len     = 32;
$iteration   = 10000;
$USE_BASE64  = true;
$THREAD_COUNT= 4;

// FFI 로딩
$soPath = __DIR__ . '/aes_gcm_multi.so';
if (!file_exists($soPath) || !is_readable($soPath)) {
    throw new Exception("암호화 라이브러리 파일 문제: $soPath");
}
try {
    $ffiCdef = "
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
    ";
    $ffi = FFI::cdef($ffiCdef, $soPath);
} catch (\FFI\ParserException $ex) {
    throw new Exception("암호화 라이브러리 파서 오류: " . $ex->getMessage());
} catch (\FFI\Exception $ex) {
    throw new Exception("암호화 라이브러리 로딩 실패: " . $ex->getMessage());
}

// 암호화 컨텍스트 생성 및 KDF 호출
$hc = $ffi->hcrypt_new();
if (FFI::isNull($hc)) {
    throw new Exception("암호화 컨텍스트 생성 실패");
}
$salt_c = FFI::new("uint8_t[" . strlen($salt) . "]", false);
FFI::memcpy($salt_c, $salt, strlen($salt));
$ffi->hcrypt_deriveKeyFromPassword($hc, $password, $salt_c, strlen($salt), $key_len, $iteration);

// 2D 배열 -> C 포인터 변환
$totalCells = count($transformedData) * $useColumns;
try {
    $table_c = $ffi->new("const uint8_t*[$totalCells]");
    $size_c  = $ffi->new("int[$totalCells]");
} catch (\FFI\Exception $ex) {
    $ffi->hcrypt_delete($hc);
    throw new Exception("메모리 할당 실패: " . $ex->getMessage());
}
$cellIndex = 0;
foreach ($transformedData as $rowData) {
    for ($c = 0; $c < $useColumns; $c++) {
        $plainVal = isset($rowData[$c]) ? (string)$rowData[$c] : '';
        $valLen = strlen($plainVal);
        $size_c[$cellIndex] = $valLen;
        if ($valLen > 0) {
            try {
                $plain_c = $ffi->new("uint8_t[$valLen]", false);
                FFI::memcpy($plain_c, $plainVal, $valLen);
                $table_c[$cellIndex] = $plain_c;
            } catch (\FFI\Exception $ex) {
                $ffi->hcrypt_delete($hc);
                throw new Exception("셀 메모리 할당 실패: " . $ex->getMessage());
            }
        } else {
            $table_c[$cellIndex] = null;
        }
        $cellIndex++;
    }
}

// 암호화 실행
$out_len_c = $ffi->new("int", false);
try {
    $enc_ptr = $ffi->hcrypt_encrypt_table_mt_alloc(
        $hc, $table_c, $size_c, count($transformedData), $useColumns, $THREAD_COUNT, FFI::addr($out_len_c)
    );
    if (FFI::isNull($enc_ptr)) {
        $ffi->hcrypt_delete($hc);
        throw new Exception("암호화 실패");
    }
    $encSize = $out_len_c->cdata;
    $encBin = FFI::string($enc_ptr, $encSize);
    $ffi->hcrypt_free($enc_ptr);
    $ffi->hcrypt_delete($hc);
} catch (\FFI\Exception $ex) {
    if (isset($enc_ptr) && !FFI::isNull($enc_ptr)) {
        $ffi->hcrypt_free($enc_ptr);
    }
    $ffi->hcrypt_delete($hc);
    throw new Exception("암호화 처리 중 오류: " . $ex->getMessage());
}

// 암호문 분할 및 재구성
$offset = 0;
$encryptedRows = [];
for ($r = 0; $r < count($transformedData); $r++) {
    $rowAssoc = [];
    for ($c = 0; $c < $useColumns; $c++) {
        $colName = $usedColumnNames[$c];
        if ($offset + 4 > $encSize) {
            $rowAssoc[$colName] = '';
            continue;
        }
        $encCellLenData = substr($encBin, $offset, 4);
        $encCellLen = unpack("l", $encCellLenData)[1];
        $offset += 4;
        if ($offset + $encCellLen > $encSize) {
            $rowAssoc[$colName] = '';
            continue;
        }
        $cipherData = substr($encBin, $offset, $encCellLen);
        $offset += $encCellLen;
        $rowAssoc[$colName] = ($USE_BASE64 && $encCellLen > 0) ? base64_encode($cipherData) : $cipherData;
    }
    $encryptedRows[] = $rowAssoc;
}

// DB 저장
$columnList = implode(', ', $escapedColumnNames);
$placeholders = implode(', ', array_fill(0, $useColumns, '?'));
$sql = "INSERT INTO excel_full ($columnList) VALUES ($placeholders)";
$stmt = $pdo->prepare($sql);
$rowsAffected = 0;
foreach ($encryptedRows as $row) {
    $values = [];
    foreach ($usedColumnNames as $colName) {
        $values[] = $row[$colName] ?? '';
    }
    $stmt->execute($values);
    $rowsAffected++;
}
$pdo->commit();

$elapsedSec = microtime(true) - $startTime;
ob_clean();
echo json_encode([
    'success'      => true,
    'message'      => "데이터 저장 완료 (AES-GCM (FFI) 암호화 적용)",
    'rowsAffected' => $rowsAffected,
    'colCount'     => $useColumns,
    'encrypted'    => true,
    'encryptMethod'=> "AES-GCM (FFI)",
    'elapsedSec'   => round($elapsedSec, 4)
]);
ob_end_flush();
