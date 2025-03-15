<?php
/**
 * distributed_save.php - 엑셀 데이터를 30개 테이블에 암호화 후 저장 프로시저 호출
 */

ob_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 간소화된 로깅 함수
function log_msg($message) {
    static $logFile = null;
    if ($logFile === null) {
        $logFile = __DIR__ . '/debug.log';
    }
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

try {
    // 응답 형식 설정
    header('Content-Type: application/json; charset=utf-8');
    
    // DB 설정 파일 포함
    require_once __DIR__ . '/db_config.php';
    
    // 요청 데이터 파싱
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    if (!$input || !isset($input['data']) || !is_array($input['data'])) {
        throw new Exception("유효하지 않은 입력 데이터");
    }
    
    $data = $input['data'];
    $rowCount = count($data);
    
    if ($rowCount == 0) {
        throw new Exception("데이터가 없습니다");
    }
    
    // 시작 시간 기록
    $startTime = microtime(true);
    
    // DB 연결
    $pdo = getDBConnection();
    
    // 첫 번째 행의 키로 컬럼 이름 결정
    $firstRow = reset($data);
    $originalColumnNames = array_keys($firstRow);
    $columnCount = count($originalColumnNames);
    
    // 컬럼명 정규화
    $columnNames = [];
    foreach ($originalColumnNames as $idx => $name) {
        $columnNames[] = (is_numeric($name) || !preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $name)) 
            ? "col" . ($idx + 1) : $name;
    }
    
    // 사용할 컬럼 수 결정 (최대 60개)
    $maxColumns = 60;
    $useColumns = min($maxColumns, $columnCount);
    
    // 실제 사용할 컬럼 이름
    $usedColumnNames = array_slice($columnNames, 0, $useColumns);
    $usedOriginalColumnNames = array_slice($originalColumnNames, 0, $useColumns);
    
    // 2차원 배열 데이터 변환
    $transformedData = [];
    foreach ($data as $row) {
        $rowValues = [];
        foreach ($usedOriginalColumnNames as $col) {
            $rowValues[] = isset($row[$col]) ? (string)$row[$col] : '';
        }
        $transformedData[] = $rowValues;
    }
    
    // === AES-GCM 암호화 시작 ===
    
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
    $encryptedData = [];
    for ($r = 0; $r < count($transformedData); $r++) {
        $rowAssoc = [];
        for ($c = 0; $c < $useColumns; $c++) {
            $colName = "col" . ($c + 1);
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
        $encryptedData[] = $rowAssoc;
    }
    
    // === 암호화 종료 ===
    
    // 데이터 배열을 JSON 문자열로 변환
    $jsonData = json_encode($encryptedData);
    
    // 저장 프로시저 호출
    $stmt = $pdo->prepare("CALL sp_distribute_excel_data(?)");
    $stmt->execute([$jsonData]);
    
    // 결과 가져오기
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $rowsAffected = $result['total_rows_affected'] ?? $rowCount;
    $inputRowCount = $result['input_row_count'] ?? $rowCount;
    
    // 소요 시간 계산
    $elapsedSec = microtime(true) - $startTime;
    
    // 성공 응답
    ob_clean();
    echo json_encode([
        'success' => true,
        'message' => "데이터 분산 저장 완료 (테이블 30개, AES-GCM 암호화, 저장 프로시저 사용)",
        'rowsAffected' => $rowsAffected,
        'inputRowCount' => $inputRowCount,
        'tableCount' => 30,
        'elapsedSec' => round($elapsedSec, 4),
        'method' => 'stored_procedure',
        'encrypted' => true,
        'encryptMethod' => "AES-GCM (FFI)"
    ]);
    
} catch (PDOException $e) {
    ob_clean();
    log_msg("DB 오류: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $e->getMessage()]);
} catch (Exception $e) {
    ob_clean();
    log_msg("오류: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

ob_end_flush(); 