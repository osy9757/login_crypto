<?php
/**
 * chunk_worker2.php
 *
 * - 멀티프로세스로 전달받은 JSON($inputFile)에 들어 있는 행들을,
 *   "패스워드+솔트→PBKDF2→AES-GCM 복호화" 로 복호화.
 * - row_identifier 필드는 그대로 유지하고, 그 외 모든 문자열 필드는
 *   Base64 디코딩 후 AES-GCM 복호화를 시도하여 평문으로 덮어씀.
 * - 최종 결과를 "<tempFile>.result.json"에 저장하고,
 *   부모( test_fetch_all_multi.php )가 이를 병합해 Excel 생성.
 */

//---------------------------[전역 설정값]---------------------------
$password     = "MySecretPass!";
$salt         = "\x01\x02\x03\x04";  // 4바이트
$key_len      = 32;                  // AES-256
$iteration    = 10000;
$USE_BASE64   = true;               // true → Base64 decode 먼저 시도
//---------------------------------------------------------------


if ($argc < 2) {
    file_put_contents('php://stderr', "Error: Temporary file path argument is required.\n");
    exit(1);
}

$inputFile = $argv[1];
if (!file_exists($inputFile)) {
    file_put_contents('php://stderr', "Error: Temporary file does not exist: $inputFile\n");
    exit(1);
}

// 로그: 시작 (stderr)
file_put_contents('php://stderr', "Worker started: reading file $inputFile at " . date('Y-m-d H:i:s') . "\n");

// 1. JSON 읽기
$jsonData = file_get_contents($inputFile);
$dataSize = strlen($jsonData);
file_put_contents('php://stderr', "Received data size: {$dataSize} bytes.\n");

// 2. JSON 파싱
$data = json_decode($jsonData, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents('php://stderr', "Error: JSON parsing error: " . json_last_error_msg() . "\n");
    exit(1);
}

//----------------------------------------------------------------
//  3. FFI로 aes_gcm_multi.so 로드 (경로는 환경에 맞게 수정)
//----------------------------------------------------------------
$ffi = FFI::cdef('

    typedef struct hcrypt_gcm_kdf hcrypt_gcm_kdf;

    // 객체 생성/소멸
    hcrypt_gcm_kdf* hcrypt_new();
    void hcrypt_delete(hcrypt_gcm_kdf* hc);

    // KDF (PBKDF2)
    void hcrypt_deriveKeyFromPassword(
        hcrypt_gcm_kdf* hc,
        const char* password,
        const uint8_t* salt,
        int salt_len,
        int key_len,
        int iteration
    );

    // 단일 청크 복호화
    uint8_t* hcrypt_decrypt_alloc(
        hcrypt_gcm_kdf* hc,
        const uint8_t* cipher, int cipher_len,
        int* out_len
    );

    // 메모리 해제
    void hcrypt_free(uint8_t* data);

', __DIR__ . '/aes_gcm_multi.so');  // 예: __DIR__ . '/aes_gcm_multi.so'


//----------------------------------------------------------------
//  4. hcrypt_gcm_kdf 객체 생성 + PBKDF2로 키 파생
//----------------------------------------------------------------
$hc = $ffi->hcrypt_new();
if ($hc === null) {
    file_put_contents('php://stderr', "Error: failed to create hcrypt_gcm_kdf object.\n");
    exit(1);
}

// salt -> C쪽 uint8_t*
$salt_len = strlen($salt);
$saltCData = FFI::new("uint8_t[$salt_len]");
FFI::memcpy($saltCData, $salt, $salt_len);

// PBKDF2로 AES-256 키 설정
$ffi->hcrypt_deriveKeyFromPassword(
    $hc,
    $password,
    $saltCData,
    $salt_len,
    $key_len,
    $iteration
);

//----------------------------------------------------------------
//  5. 각 행의 모든 필드 중 "row_identifier" 제외한 문자열 필드만 복호화
//----------------------------------------------------------------
$processedData = [];

foreach ($data as $row) {
    foreach ($row as $colName => $colValue) {
        // row_identifier 필드는 스킵
        if ($colName === 'row_identifier') {
            continue;
        }

        // 문자열만 복호화 시도
        if (is_string($colValue)) {
            // 1) Base64 디코딩
            $cipherRaw = $USE_BASE64 ? base64_decode($colValue, true) : $colValue;

            if ($cipherRaw !== false && !empty($cipherRaw)) {
                // 2) AES-GCM 복호화
                $cipherLen = strlen($cipherRaw);
                $cipherCData = FFI::new("uint8_t[$cipherLen]");
                FFI::memcpy($cipherCData, $cipherRaw, $cipherLen);

                $outLenPtr  = FFI::new("int");
                $decDataPtr = $ffi->hcrypt_decrypt_alloc($hc, $cipherCData, $cipherLen, FFI::addr($outLenPtr));

                if ($decDataPtr !== null) {
                    $decLen = $outLenPtr->cdata;
                    if ($decLen > 0) {
                        $row[$colName] = FFI::string($decDataPtr, $decLen);
                    } else {
                        $row[$colName] = "";
                    }
                    $ffi->hcrypt_free($decDataPtr);
                } else {
                    file_put_contents('php://stderr', "[WARN] AES-GCM decrypt failed for '$colName'.\n");
                    $row[$colName] = null;
                }
            } else {
                // Base64 decode 실패 or empty
                file_put_contents('php://stderr', "[WARN] Invalid or empty Base64 for '$colName'.\n");
                $row[$colName] = null;
            }
        }
    }
    $processedData[] = $row;
}

//----------------------------------------------------------------
//  6. 결과 JSON 기록 (<inputFile>.result.json)
//----------------------------------------------------------------
$resultJson = json_encode($processedData, JSON_UNESCAPED_UNICODE);
$resultSize = strlen($resultJson);
file_put_contents('php://stderr', "Processed result size: {$resultSize} bytes.\n");

$resultFile = $inputFile . ".result.json";
if (file_put_contents($resultFile, $resultJson) === false) {
    file_put_contents('php://stderr', "Error: Failed to write result to file $resultFile\n");
    exit(1);
}
file_put_contents('php://stderr', "Worker finished: result written to $resultFile at " . date('Y-m-d H:i:s') . "\n");

// FFI 객체 정리
$ffi->hcrypt_delete($hc);

// STDOUT 버퍼 정리 후 최소 JSON 응답
if (ob_get_length()) {
    ob_clean();
}

echo json_encode([
    'success'      => true,
    'resultFile'   => $resultFile,
    'rowsAffected' => 0,
    'processedRows'=> 0,
    'encrypted'    => false,
    'encryptMethod'=> null
]);
exit(0);
