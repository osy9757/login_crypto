<?php
/**
 * save_excel_test.php - 엑셀 데이터 테스트용 저장 처리 (PHP 7.4 호환)
 * 객체 배열 형태 데이터 처리
 * 항상 AES-GCM 멀티스레드 암호화 적용
 */

// 로깅 함수
function log_msg($message) {
    $logFile = __DIR__ . '/../debug.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// PHP 에러 설정 - 모든 오류 표시 및 로깅
ini_set('display_errors', 1);
error_reporting(E_ALL);
log_msg("스크립트 시작 - 객체 배열 형태 데이터 처리 (항상 암호화 적용)");

try {
    // JSON 응답 헤더
    header('Content-Type: application/json; charset=utf-8');
    
    // PHP 버전 및 시스템 정보 확인
    log_msg("PHP 버전: " . PHP_VERSION);
    log_msg("운영체제: " . PHP_OS);
    log_msg("서버 소프트웨어: " . $_SERVER['SERVER_SOFTWARE']);
    
    // 로드된 PHP 확장 모듈 확인
    $extensions = get_loaded_extensions();
    log_msg("로드된 PHP 확장 모듈: " . implode(", ", $extensions));
    
    // FFI 확장 모듈 확인
    if (!extension_loaded('ffi')) {
        log_msg("오류: FFI 확장 모듈이 로드되지 않았습니다. 암호화가 필요합니다.");
        throw new Exception("FFI 확장 모듈이 로드되지 않았습니다. 암호화를 위해 필요합니다.");
    } else {
        log_msg("FFI 확장 모듈 로드 확인됨");
    }
    
    // DB 설정 파일 포함
    require_once __DIR__ . '/db_config.php';
    log_msg("DB 설정 로드 완료");
    
    // 요청 방식 체크 (POST 필수)
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        log_msg("비정상 요청: " . $_SERVER['REQUEST_METHOD']);
        echo json_encode(['success' => false, 'message' => 'Only POST allowed']);
        exit;
    }
    
    // 요청 데이터 파싱
    $rawInput = file_get_contents('php://input');
    log_msg("원시 입력 데이터 수신 길이: " . strlen($rawInput));
    
    $input = json_decode($rawInput, true);
    if (!$input) {
        log_msg("JSON 파싱 실패: " . json_last_error_msg());
        echo json_encode(['success' => false, 'message' => 'Invalid JSON: ' . json_last_error_msg()]);
        exit;
    }
    
    // 모드는 무조건 암호화로 설정 (무시)
    $mode = isset($input['mode']) ? $input['mode'] : 'singleTable';
    log_msg("모드: $mode (항상 암호화 적용)");
    
    if (!isset($input['data']) || !is_array($input['data'])) {
        log_msg("잘못된 요청 형식 - 'data' 필드 없음 또는 배열이 아님");
        echo json_encode(['success' => false, 'message' => 'Invalid request format - missing or invalid data field']);
        exit;
    }
    
    $data = $input['data'];
    $rowCount = count($data);
    log_msg("데이터 행 수: " . $rowCount);
    
    // 데이터 검증
    if ($rowCount == 0) {
        throw new Exception("데이터가 없습니다");
    }
    
    // 첫 번째 객체의 키를 사용하여 컬럼 이름 결정
    $firstRow = reset($data);
    $originalColumnNames = array_keys($firstRow);
    $columnCount = count($originalColumnNames);
    log_msg("원본 컬럼 이름: " . implode(", ", $originalColumnNames));
    
    // 컬럼명이 숫자인 경우 col 접두어 추가
    $columnNames = [];
    foreach ($originalColumnNames as $idx => $name) {
        // 숫자 키만 있는 경우 (0, 1, 2...) 또는 다른 유효하지 않은 컬럼명이 있는 경우
        if (is_numeric($name) || !preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $name)) {
            $columnNames[] = "col" . ($idx + 1);
        } else {
            $columnNames[] = $name;
        }
    }
    log_msg("변환된 컬럼 이름: " . implode(", ", $columnNames));
    
    // 시작 시간 기록
    $startTime = microtime(true);
    log_msg("엑셀 데이터 저장 시작 (암호화 적용)");
    
    // DB 연결
    log_msg("DB 연결 시도");
    $pdo = getDBConnection();
    log_msg("DB 연결 성공");
    
    // 트랜잭션 시작
    $pdo->beginTransaction();
    
    // 사용할 컬럼 수 결정 (최대 60개)
    $maxColumns = 60;
    $useColumns = min($maxColumns, $columnCount);
    
    // 실제 사용할 컬럼 이름 (처음 $useColumns개만)
    $usedColumnNames = array_slice($columnNames, 0, $useColumns);
    $usedOriginalColumnNames = array_slice($originalColumnNames, 0, $useColumns);
    
    // 모든 컬럼명을 백틱(`)으로 감싸기
    $escapedColumnNames = array_map(function($colName) {
        return "`" . $colName . "`";
    }, $usedColumnNames);
    
    // 암호화를 위한 데이터 준비
    // 2차원 배열로 변환
    $transformedData = [];
    foreach ($data as $row) {
        $rowValues = [];
        foreach ($usedOriginalColumnNames as $colName) {
            $rowValues[] = isset($row[$colName]) ? (string)$row[$colName] : '';
        }
        $transformedData[] = $rowValues;
    }
    
    // AES-GCM 설정
    $password    = "MySecretPass!";  // 실제 구현시 환경 변수나 안전한 방법으로 관리해야 함
    $salt        = "\x01\x02\x03\x04";
    $key_len     = 32;
    $iteration   = 10000;
    $USE_BASE64  = true;
    $THREAD_COUNT= 4;
    
    // FFI 로딩
    try {
        $soPath = __DIR__ . '/../aes_gcm_multi.so';
        if (!file_exists($soPath)) {
            throw new Exception("암호화 라이브러리 파일을 찾을 수 없습니다: $soPath");
        }
        
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
    } catch (\Exception $ex) {
        log_msg("FFI 로딩 오류: " . $ex->getMessage());
        throw new Exception("암호화 라이브러리 로딩 실패: " . $ex->getMessage());
    }
    
    // 암호화 컨텍스트 생성
    $hc = $ffi->hcrypt_new();
    if (!$hc) {
        throw new Exception("암호화 컨텍스트 생성 실패");
    }
    
    // KDF (키 유도 함수)
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
    
    // 2D 배열 -> C 포인터
    $totalCells = $rowCount * $useColumns;
    $table_c = $ffi->new("const uint8_t*[$totalCells]");
    $size_c  = $ffi->new("int[$totalCells]");
    
    log_msg("암호화 준비: $rowCount 행 x $useColumns 열 = $totalCells 셀");
    
    $cellIndex = 0;
    for ($r = 0; $r < $rowCount; $r++) {
        $rowData = $transformedData[$r];
        for ($c = 0; $c < $useColumns; $c++) {
            $plainVal = isset($rowData[$c]) ? (string)$rowData[$c] : '';
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
    
    // 암호화 실행
    log_msg("멀티스레드 암호화 실행 시작 ($THREAD_COUNT 스레드)");
    $out_len_c = $ffi->new("int", false);
    $enc_ptr = $ffi->hcrypt_encrypt_table_mt_alloc(
        $hc,
        $table_c,
        $size_c,
        $rowCount,
        $useColumns,
        $THREAD_COUNT,
        FFI::addr($out_len_c)
    );
    
    if (!$enc_ptr) {
        $ffi->hcrypt_delete($hc);
        throw new Exception("암호화 실패");
    }
    
    $encSize = $out_len_c->cdata;
    $encBin = FFI::string($enc_ptr, $encSize);
    $ffi->hcrypt_free($enc_ptr);
    $ffi->hcrypt_delete($hc);
    
    log_msg("암호화 완료: $encSize 바이트");
    
    // 암호문 분할 및 재구성
    $offset = 0;
    $encryptedRows = [];
    
    for ($r = 0; $r < $rowCount; $r++) {
        $rowAssoc = [];
        for ($c = 0; $c < $useColumns; $c++) {
            $colName = $usedColumnNames[$c];
            
            if ($offset + 4 > $encSize) {
                $rowAssoc[$colName] = '';
                continue;
            }
            
            // 암호문 길이 읽기 (4바이트)
            $encCellLenData = substr($encBin, $offset, 4);
            $encCellLen = unpack("l", $encCellLenData)[1];
            $offset += 4;
            
            if ($offset + $encCellLen > $encSize) {
                $rowAssoc[$colName] = '';
                continue;
            }
            
            // 암호문 읽기
            $cipherData = substr($encBin, $offset, $encCellLen);
            $offset += $encCellLen;
            
            // Base64 인코딩
            if ($USE_BASE64 && $encCellLen > 0) {
                $rowAssoc[$colName] = base64_encode($cipherData);
            } else {
                $rowAssoc[$colName] = $cipherData;
            }
        }
        $encryptedRows[] = $rowAssoc;
    }
    
    // 암호화된 데이터 DB 저장
    $rowsAffected = 0;
    
    // SQL 준비 - excel_full 테이블에 데이터 삽입
    $columnList = implode(', ', $escapedColumnNames);
    $placeholders = implode(', ', array_fill(0, $useColumns, '?'));
    
    $sql = "INSERT INTO excel_full ($columnList) VALUES ($placeholders)";
    log_msg("SQL: " . substr($sql, 0, 100) . "...");
    
    // 준비된 명령문
    $stmt = $pdo->prepare($sql);
    
    // 각 행에 대해 데이터 삽입
    foreach ($encryptedRows as $row) {
        $values = [];
        foreach ($usedColumnNames as $colName) {
            $values[] = isset($row[$colName]) ? $row[$colName] : '';
        }
        
        // 실행
        $stmt->execute($values);
        $rowsAffected++;
    }
    
    log_msg("암호화된 데이터 저장 완료: $rowsAffected 행");
    
    // 트랜잭션 완료
    $pdo->commit();
    
    // 결과 반환
    $elapsedSec = microtime(true) - $startTime;
    log_msg("데이터 저장 완료. 저장된 행: $rowsAffected, 열 수: $useColumns, 소요 시간: $elapsedSec 초");
    
    echo json_encode([
        'success' => true,
        'message' => '데이터 저장 완료 (AES-GCM 암호화 적용)',
        'rowsAffected' => $rowsAffected,
        'colCount' => $useColumns,
        'encrypted' => true,
        'encryptMethod' => 'AES-GCM',
        'elapsedSec' => round($elapsedSec, 4)
    ]);

} catch (PDOException $e) {
    if (isset($pdo)) $pdo->rollBack();
    log_msg("DB 오류: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $e->getMessage()]);
} catch (Exception $e) {
    if (isset($pdo)) $pdo->rollBack();
    log_msg("처리 오류: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    echo json_encode(['success' => false, 'message' => 'Processing error: ' . $e->getMessage()]);
}

// 스크립트 종료 로깅
log_msg("스크립트 종료");