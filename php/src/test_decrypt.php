<?php
/**
 * test_decrypt.php - 멀티프로세스 복호화 테스트 페이지
 */

// DB 설정 파일 포함
require_once __DIR__ . '/db_config.php';

// 로깅 설정
$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0777, true);
}
$logFile = $logDir . '/test_decrypt_' . date('Ymd') . '.log';

// 로그 저장을 위한 배열
$logMessages = [];

// 로깅 함수
function test_log($message) {
    global $logFile, $logMessages;
    $timestamp = date('Y-m-d H:i:s');
    // 파일에 저장 (선택적)
    // @file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
    
    // 로그 메시지 배열에 추가
    $logMessages[] = "[$timestamp] $message";
}

// AJAX 요청 처리
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    // 전체 데이터 불러오기 (복호화 없음)
    if ($_GET['action'] === 'fetch_data') {
        try {
            test_log("데이터 불러오기 요청 시작");
            $startTime = microtime(true);
            
            $pdo = getDBConnection();
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // 테이블 상태 확인
            $tableInfo = [];
            for ($i = 1; $i <= 30; $i++) {
                $tableName = "excel_part" . $i;
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM $tableName");
                $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                $tableInfo[$tableName] = $count;
            }
            
            // 마스터 테이블 상태 확인
            $stmt = $pdo->query("SELECT COUNT(*) FROM excel_master");
            $totalRows = $stmt->fetchColumn();
            $tableInfo['excel_master'] = $totalRows;
            
            // 테이블 간 ID 불일치 확인
            test_log("테이블 간 ID 불일치 확인 시작");
            $idMismatchInfo = [];
            $totalExpectedRows = 0;
            
            // 1. 전체 테이블의 고유 ID 수 확인
            $stmt = $pdo->query("
                SELECT COUNT(DISTINCT master_id) as unique_ids_count 
                FROM (
                    SELECT master_id FROM excel_part1
                    UNION ALL SELECT master_id FROM excel_part2
                    UNION ALL SELECT master_id FROM excel_part3
                    UNION ALL SELECT master_id FROM excel_part4
                    UNION ALL SELECT master_id FROM excel_part5
                    UNION ALL SELECT master_id FROM excel_part6
                    UNION ALL SELECT master_id FROM excel_part7
                    UNION ALL SELECT master_id FROM excel_part8
                    UNION ALL SELECT master_id FROM excel_part9
                    UNION ALL SELECT master_id FROM excel_part10
                    UNION ALL SELECT master_id FROM excel_part11
                    UNION ALL SELECT master_id FROM excel_part12
                    UNION ALL SELECT master_id FROM excel_part13
                    UNION ALL SELECT master_id FROM excel_part14
                    UNION ALL SELECT master_id FROM excel_part15
                    UNION ALL SELECT master_id FROM excel_part16
                    UNION ALL SELECT master_id FROM excel_part17
                    UNION ALL SELECT master_id FROM excel_part18
                    UNION ALL SELECT master_id FROM excel_part19
                    UNION ALL SELECT master_id FROM excel_part20
                    UNION ALL SELECT master_id FROM excel_part21
                    UNION ALL SELECT master_id FROM excel_part22
                    UNION ALL SELECT master_id FROM excel_part23
                    UNION ALL SELECT master_id FROM excel_part24
                    UNION ALL SELECT master_id FROM excel_part25
                    UNION ALL SELECT master_id FROM excel_part26
                    UNION ALL SELECT master_id FROM excel_part27
                    UNION ALL SELECT master_id FROM excel_part28
                    UNION ALL SELECT master_id FROM excel_part29
                    UNION ALL SELECT master_id FROM excel_part30
                ) as all_ids
            ");
            $uniqueIdsCount = $stmt->fetch(PDO::FETCH_ASSOC)['unique_ids_count'];
            
            // 2. 전체 테이블의 총 행 수 합계
            $stmt = $pdo->query("
                SELECT SUM(row_count) as total_rows FROM (
                    SELECT COUNT(*) as row_count FROM excel_part1
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part2
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part3
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part4
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part5
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part6
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part7
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part8
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part9
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part10
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part11
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part12
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part13
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part14
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part15
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part16
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part17
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part18
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part19
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part20
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part21
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part22
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part23
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part24
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part25
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part26
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part27
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part28
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part29
                    UNION ALL SELECT COUNT(*) as row_count FROM excel_part30
                ) as all_counts
            ");
            $totalRowsCount = $stmt->fetch(PDO::FETCH_ASSOC)['total_rows'];
            
            // 3. 각 테이블의, 다른 테이블에 없는 ID 개수 확인
            $tableUniqueIds = [];
            for ($i = 1; $i <= 30; $i++) {
                $tableName = "excel_part" . $i;
                $otherTables = [];
                for ($j = 1; $j <= 30; $j++) {
                    if ($j != $i) {
                        $otherTables[] = "excel_part" . $j;
                    }
                }
                
                // 이 테이블에만 있는 ID 찾기
                $query = "
                    SELECT COUNT(*) as exclusive_count 
                    FROM $tableName t1
                    WHERE NOT EXISTS (
                        SELECT 1 FROM " . $otherTables[0] . " t2
                        WHERE t1.master_id = t2.master_id
                    )";
                
                $stmt = $pdo->query($query);
                $exclusiveCount = $stmt->fetch(PDO::FETCH_ASSOC)['exclusive_count'];
                
                if ($exclusiveCount > 0) {
                    $tableUniqueIds[$tableName] = $exclusiveCount;
                }
            }
            
            // 4. excel_master 테이블과 비교
            test_log("excel_master 테이블과 분산 테이블 ID 비교");
            $masterOnlyIds = $pdo->query("
                SELECT COUNT(*) as count FROM excel_master m
                WHERE NOT EXISTS (
                    SELECT 1 FROM excel_part1 p1 WHERE m.id = p1.master_id
                )
            ")->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($masterOnlyIds > 0) {
                $tableUniqueIds['excel_master_only'] = $masterOnlyIds;
            }
            
            // 5. 저장 프로시저 정보 확인
            try {
                $stmt = $pdo->query("SHOW CREATE PROCEDURE sp_merge_excel_data_all");
                if ($stmt) {
                    $procInfo = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($procInfo) {
                        $idMismatchInfo['procedure_info'] = $procInfo;
                    }
                }
            } catch (Exception $e) {
                // 저장 프로시저 정보 확인 실패 시 무시하고 계속 진행
                test_log("저장 프로시저 정보 확인 실패: " . $e->getMessage());
            }
            
            $idMismatchInfo['unique_ids_count'] = $uniqueIdsCount;
            $idMismatchInfo['total_rows_count'] = $totalRowsCount;
            $idMismatchInfo['duplicate_ids_count'] = $totalRowsCount - $uniqueIdsCount;
            $idMismatchInfo['table_unique_ids'] = $tableUniqueIds;
            $idMismatchInfo['master_table_count'] = $totalRows;
            
            test_log("ID 불일치 확인 완료: 중복 ID 수 = " . ($totalRowsCount - $uniqueIdsCount));
            
            // 저장 프로시저 호출
            test_log("sp_merge_excel_data_all 프로시저 호출");
            $stmt = $pdo->prepare("CALL sp_merge_excel_data_all()");
            $stmt->execute();
            
            // 컬럼 메타데이터 가져오기
            $columnCount = $stmt->columnCount();
            $headers = [];
            for ($i = 0; $i < $columnCount; $i++) {
                $meta = $stmt->getColumnMeta($i);
                $headers[] = $meta['name'];
            }
            
            // 결과 데이터
            $rows = [];
            $count = 0;
            $sampleData = [];
            
            // 최대 100,000행까지만 메모리에 로드
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $count++;
                
                // 처음 10개 행은 샘플 데이터로 저장
                if ($count <= 10) {
                    $sampleData[] = $row;
                }
            }
            
            $endTime = microtime(true);
            $elapsedTime = round($endTime - $startTime, 2);
            
            test_log("데이터 불러오기 완료: $count 행, $elapsedTime 초");
            
            echo json_encode([
                'success' => true,
                'message' => "데이터 불러오기 완료",
                'rowCount' => $count,
                'columnCount' => $columnCount,
                'headers' => $headers,
                'sampleData' => $sampleData,
                'tableInfo' => $tableInfo,
                'idMismatchInfo' => $idMismatchInfo,
                'elapsedTime' => $elapsedTime,
                'logMessages' => $logMessages
            ]);
        } catch (Exception $e) {
            test_log("데이터 불러오기 오류: " . $e->getMessage());
            echo json_encode([
                'success' => false,
                'message' => "데이터 불러오기 오류: " . $e->getMessage(),
                'logMessages' => $logMessages
            ]);
        }
        
        exit;
    }
    
    // 불러온 데이터 복호화
    if ($_GET['action'] === 'decrypt_data') {
        try {
            // 파라미터 확인
            $processCount = isset($_GET['process_count']) ? (int)$_GET['process_count'] : 4;
            $chunkSize = isset($_GET['chunk_size']) ? (int)$_GET['chunk_size'] : 1000; // 청크 크기 기본값 설정
            
            test_log("복호화 요청 시작: 프로세스 수 $processCount, 청크 크기: $chunkSize");
            $startTime = microtime(true);
            
            // PHP 메모리 제한 정보 로깅
            $memoryLimit = ini_get('memory_limit');
            test_log("PHP 메모리 제한: $memoryLimit");
            test_log("현재 메모리 사용량: " . memory_get_usage(true) / 1024 / 1024 . " MB");
            
            // 시간 제한 정보 로깅
            $maxExecutionTime = ini_get('max_execution_time');
            test_log("PHP 최대 실행 시간: $maxExecutionTime 초");
            
            // 시간 제한 늘리기 시도
            set_time_limit(600); // 10분으로 설정 시도
            $newMaxExecutionTime = ini_get('max_execution_time');
            test_log("새 PHP 최대 실행 시간: $newMaxExecutionTime 초");
            
            // FFI 확장 확인
            if (!extension_loaded('ffi')) {
                throw new Exception("PHP FFI 확장이 로드되지 않았습니다. PHP 설정을 확인하세요.");
            }
            test_log("FFI 확장 상태: 로드됨");
            
            // SO 파일 확인
            $soPath = __DIR__ . '/aes_gcm_multi.so';
            if (!file_exists($soPath)) {
                throw new Exception("SO 파일을 찾을 수 없음: $soPath");
            }
            
            if (!is_readable($soPath)) {
                throw new Exception("SO 파일 읽기 권한 없음: $soPath (권한: " . decoct(fileperms($soPath) & 0777) . ")");
            }
            test_log("SO 파일 상태: $soPath 존재, 읽기 권한 있음 (크기: " . filesize($soPath) . " 바이트)");
            
            $pdo = getDBConnection();
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // 1. 전체 데이터 행 수 확인
            test_log("전체 데이터 행 수 확인 중");
            $stmt = $pdo->query("SELECT COUNT(*) FROM excel_master");
            $totalRows = $stmt->fetchColumn();
            test_log("총 데이터 행 수: $totalRows");
            
            if ($totalRows === 0) {
                throw new Exception("복호화할 데이터가 없습니다. 먼저 데이터 불러오기를 실행하세요.");
            }
            
            // 샘플 암호화 데이터 (최대 3행)
            $sampleEncrypted = [];
            
            // 복호화 옵션 설정
            $options = [
                "password" => "MySecretPass!",
                "salt" => "\x01\x02\x03\x04",
                "key_len" => 32,
                "iteration" => 10000,
                "threadCount" => $processCount
            ];
            test_log("복호화 옵션 설정 완료");
            
            // 모든 데이터를 한 번에 가져오기
            test_log("저장 프로시저 호출로 모든 데이터 로드 시작");
            $fetchStartTime = microtime(true);
            
            try {
                $stmt = $pdo->prepare("CALL sp_merge_excel_data_all()");
                $stmt->execute();
                
                // 모든 데이터를 메모리에 로드
                test_log("모든 데이터를 메모리에 로드 중");
                $allEncryptedData = [];
                $encryptedRowCount = 0;
                
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $allEncryptedData[] = $row;
                    $encryptedRowCount++;
                    
                    // 샘플 데이터 저장 (최대 3행)
                    if ($encryptedRowCount <= 3) {
                        $sampleEncrypted[] = $row;
                    }
                    
                    // 로그 메시지 (1000행마다)
                    if ($encryptedRowCount % 1000 === 0) {
                        test_log("$encryptedRowCount 행 로드 완료");
                    }
                }
                
                $fetchEndTime = microtime(true);
                $fetchTime = round($fetchEndTime - $fetchStartTime, 2);
                test_log("모든 데이터 로드 완료: $encryptedRowCount 행, $fetchTime 초");
                
                // 데이터가 없는 경우 체크
                if ($encryptedRowCount === 0) {
                    throw new Exception("저장 프로시저에서 데이터를 가져오지 못했습니다.");
                }
                
                // 데이터 컬럼 수 확인
                $firstRow = $allEncryptedData[0];
                $dataColumnCount = count($firstRow) - 1; // row_identifier 제외
                test_log("데이터 컬럼 수: $dataColumnCount");
                
                // 메모리 정보 로깅
                test_log("전체 데이터 로드 후 메모리 사용량: " . memory_get_usage(true) / 1024 / 1024 . " MB");
            } catch (Exception $e) {
                test_log("데이터 로드 오류: " . $e->getMessage());
                throw new Exception("데이터 로드 오류: " . $e->getMessage());
            }
            
            // 복호화 시작
            test_log("전체 데이터 복호화 시작 (멀티프로세스 사용: $processCount 개)");
            $decryptStartTime = microtime(true);
            
            try {
                // 전체 데이터를 한 번에 복호화 (내부적으로 멀티프로세스 사용)
                $decryptedData = directDecryptData($allEncryptedData, $encryptedRowCount, $dataColumnCount, $options);
                
                $decryptEndTime = microtime(true);
                $decryptTime = round($decryptEndTime - $decryptStartTime, 2);
                $totalProcessedRows = count($decryptedData);
                
                test_log("전체 데이터 복호화 완료: $totalProcessedRows 행, $decryptTime 초");
                
                // 샘플 복호화 데이터 저장 (최대 3행)
                $sampleDecrypted = array_slice($decryptedData, 0, 3);
                
                // 메모리 정리
                $allEncryptedData = null;
                gc_collect_cycles();
                test_log("전체 데이터 메모리 해제 후: " . memory_get_usage(true) / 1024 / 1024 . " MB");
            } catch (Exception $e) {
                test_log("복호화 오류: " . $e->getMessage());
                throw $e;
            }
            
            $totalTime = microtime(true) - $startTime;
            test_log("모든 처리 완료: $totalProcessedRows 행 복호화됨, 총 소요 시간: " . round($totalTime, 2) . " 초");
            
            echo json_encode([
                'success' => true,
                'message' => "복호화 완료",
                'encryptedRowCount' => $encryptedRowCount,
                'decryptedRowCount' => $totalProcessedRows,
                'columnCount' => $dataColumnCount,
                'sampleEncrypted' => $sampleEncrypted,
                'sampleDecrypted' => $sampleDecrypted,
                'fetchTime' => round($fetchTime, 2),
                'decryptTime' => $decryptTime,
                'totalTime' => round($totalTime, 2),
                'processCount' => $processCount,
                'chunkSize' => 0, // 청크 사용 안함
                'totalChunks' => 1, // 한 번에 처리
                'logMessages' => $logMessages
            ]);
        } catch (Exception $e) {
            test_log("복호화 오류: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            
            // 에러 위치 확인
            $errorLocation = "";
            if (strpos($e->getMessage(), "SO 파일") !== false) {
                $errorLocation = "SO 파일 로드 중 오류";
            } else if (strpos($e->getMessage(), "암호화 컨텍스트") !== false) {
                $errorLocation = "암호화 컨텍스트 생성 중 오류";
            } else if (strpos($e->getMessage(), "Base64 디코딩") !== false) {
                $errorLocation = "데이터 디코딩 중 오류";
            } else if (strpos($e->getMessage(), "복호화 실패") !== false) {
                $errorLocation = "C 라이브러리 복호화 함수 실행 중 오류";
            } else if (strpos($e->getMessage(), "파싱") !== false) {
                $errorLocation = "복호화된 데이터 파싱 중 오류";
            } else if (strpos($e->getMessage(), "FFI") !== false) {
                $errorLocation = "PHP FFI 확장 관련 오류";
            }
            
            echo json_encode([
                'success' => false,
                'message' => "복호화 오류: " . $e->getMessage(),
                'errorLocation' => $errorLocation,
                'logMessages' => $logMessages
            ]);
        }
        
        exit;
    }
    
    exit;
}

// directDecryptData 함수: so 파일을 직접 로드하여 복호화 수행
function directDecryptData($encryptedData, $rowCount, $colCount, $options = array()) {
    test_log("directDecryptData 함수 시작: rowCount=$rowCount, colCount=$colCount");
    
    // 옵션 기본값
    $password = isset($options['password']) ? $options['password'] : "MySecretPass!";
    $salt = isset($options['salt']) ? $options['salt'] : "\x01\x02\x03\x04";
    $key_len = isset($options['key_len']) ? (int)$options['key_len'] : 32;
    $iteration = isset($options['iteration']) ? (int)$options['iteration'] : 10000;
    $threadCount = isset($options['threadCount']) ? (int)$options['threadCount'] : 4;
    
    test_log("메모리 사용량 (병합 전): " . memory_get_usage(true) / 1024 / 1024 . " MB");
    
    // 1. 암호화된 데이터 병합
    // 각 행의 "row_identifier" 외의 셀은 Base64 인코딩된 문자열이므로 디코딩 후 순서대로 연결
    $mergedBinary = "";
    $cellCount = 0;
    
    foreach ($encryptedData as $rowIndex => $row) {
        foreach ($row as $key => $cell) {
            if ($key === "row_identifier") continue;
            
            // Base64 디코딩 시도
            $decoded = base64_decode($cell, true);
            if ($decoded === false) {
                $sampleValue = substr($cell, 0, 30) . (strlen($cell) > 30 ? '...' : '');
                throw new Exception("Base64 디코딩 실패 (행 $rowIndex, 열 $key): $sampleValue");
            }
            
            $mergedBinary .= $decoded;
            $cellCount++;
            
            // 1000개 셀마다 메모리 사용량 로깅
            if ($cellCount % 1000 === 0 && $rowIndex < 10) {
                test_log("$cellCount 셀 병합 완료");
            }
        }
    }
    
    $mergedLen = strlen($mergedBinary);
    test_log("병합된 데이터: {$mergedLen} 바이트, 셀 수: {$cellCount}, 메모리: " . memory_get_usage(true) / 1024 / 1024 . " MB");
    
    // 2. FFI로 so 파일 로드
    $soPath = __DIR__ . '/aes_gcm_multi.so';
    if (!file_exists($soPath) || !is_readable($soPath)) {
        $permissions = file_exists($soPath) ? decoct(fileperms($soPath) & 0777) : 'N/A';
        throw new Exception("SO 파일 문제: {$soPath} (존재: " . (file_exists($soPath) ? '예' : '아니오') . ", 권한: $permissions)");
    }
    
    test_log("SO 파일 로드 시작: " . realpath($soPath));
    
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
    ";
    
    try {
        test_log("FFI 정의 시작");
        $ffi = FFI::cdef($ffiCdef, $soPath);
        test_log("FFI 초기화 완료");
    } catch (Throwable $e) {
        test_log("FFI 초기화 실패: " . $e->getMessage());
        throw new Exception("FFI 초기화 실패: " . $e->getMessage());
    }
    
    try {
        // 3. 암호화 컨텍스트 생성 및 키 도출
        test_log("암호화 컨텍스트 생성 시작");
        $hc = $ffi->hcrypt_new();
        if (FFI::isNull($hc)) {
            throw new Exception("암호화 컨텍스트 생성 실패");
        }
        test_log("암호화 컨텍스트 생성 완료");
        
        $saltLen = strlen($salt);
        test_log("키 도출 시작: salt 길이=$saltLen, 반복 횟수=$iteration, 키 길이=$key_len");
        $salt_c = $ffi->new("uint8_t[" . $saltLen . "]", false);
        FFI::memcpy($salt_c, $salt, $saltLen);
        $ffi->hcrypt_deriveKeyFromPassword($hc, $password, $salt_c, $saltLen, $key_len, $iteration);
        test_log("키 도출 완료");
        
        // 4. 병합된 바이너리 데이터를 C 배열에 복사
        test_log("C 메모리에 데이터 복사 시작: $mergedLen 바이트");
        $enc_data = $ffi->new("uint8_t[" . $mergedLen . "]");
        FFI::memcpy($enc_data, $mergedBinary, $mergedLen);
        test_log("C 메모리에 데이터 복사 완료");
        
        // 원본 PHP 문자열 메모리 해제 도움
        $mergedBinary = null;
        
        // 5. 출력 길이 변수 준비
        $out_len = $ffi->new("int");
        
        // 6. 복호화 함수 호출 (멀티 스레드)
        test_log("복호화 함수 호출 시작: rowCount={$rowCount}, colCount={$colCount}, threadCount={$threadCount}");
        $decrypted_ptr = $ffi->hcrypt_decrypt_table_mt_alloc(
            $hc, $enc_data, $mergedLen, $rowCount, $colCount, $threadCount, FFI::addr($out_len)
        );
        
        test_log("복호화 함수 호출 완료");
        
        if (FFI::isNull($decrypted_ptr)) {
            throw new Exception("복호화 실패: NULL 결과");
        }
        
        $resultLen = $out_len->cdata;
        test_log("복호화 결과 길이: {$resultLen} 바이트, 메모리: " . memory_get_usage(true) / 1024 / 1024 . " MB");
        
        test_log("복호화된 데이터 PHP로 복사 시작");
        $decryptedBin = FFI::string($decrypted_ptr, $resultLen);
        test_log("복호화된 데이터 PHP로 복사 완료, 메모리: " . memory_get_usage(true) / 1024 / 1024 . " MB");
        
        test_log("C 라이브러리 메모리 해제 시작");
        $ffi->hcrypt_free($decrypted_ptr);
        $ffi->hcrypt_delete($hc);
        test_log("C 라이브러리 메모리 해제 완료");
        
        // 더이상 필요없는 변수 해제
        $enc_data = null;
        
        // 7. 복호화 결과 파싱
        // 각 셀은 [4바이트 평문 길이][평문 데이터] 형식
        test_log("복호화 결과 파싱 시작");
        $decryptedData = array();
        $offset = 0;
        for ($i = 0; $i < $rowCount; $i++) {
            $rowData = array();
            for ($j = 0; $j < $colCount; $j++) {
                if ($offset + 4 > $resultLen) {
                    $rowData[] = "";
                    continue;
                }
                
                $lenBytes = substr($decryptedBin, $offset, 4);
                $plainLen = unpack("V", $lenBytes)[1];
                $offset += 4;
                
                if ($plainLen > 0 && $offset + $plainLen <= $resultLen) {
                    $cellPlain = substr($decryptedBin, $offset, $plainLen);
                    $offset += $plainLen;
                    $rowData[] = $cellPlain;    
                } else {
                    $rowData[] = "";
                    if ($plainLen > 0) {
                        $offset += min($plainLen, $resultLen - $offset);
                    }
                }
            }
            $decryptedData[] = $rowData;
            
            // 1000행마다 로그
            if ($i > 0 && $i % 1000 === 0) {
                test_log("$i 행 파싱 완료, 메모리: " . memory_get_usage(true) / 1024 / 1024 . " MB");
            }
        }
        
        // 더이상 필요없는 변수 해제
        $decryptedBin = null;
        
        test_log("데이터 파싱 완료: " . count($decryptedData) . " 행, 메모리: " . memory_get_usage(true) / 1024 / 1024 . " MB");
        return $decryptedData;
    } catch (Throwable $e) {
        // 오류 발생 시 메모리 해제 시도
        if (isset($hc) && !FFI::isNull($hc)) {
            try {
                $ffi->hcrypt_delete($hc);
                test_log("오류 발생 후 hcrypt_delete 호출 성공");
            } catch (Throwable $e2) {
                test_log("오류 발생 후 hcrypt_delete 호출 실패: " . $e2->getMessage());
            }
        }
        
        test_log("directDecryptData 함수 오류: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        throw $e;
    }
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>멀티프로세스 복호화 테스트</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <style>
        body {
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            background-color: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .loader {
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 2s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .result-section {
            display: none;
        }
        .data-container {
            max-height: 400px;
            overflow-y: auto;
            margin-top: 20px;
        }
        .step-card {
            margin-bottom: 20px;
        }
        pre {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            max-height: 200px;
            overflow-y: auto;
        }
        .table-info {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .table-badge {
            background-color: #e9ecef;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="mb-4">멀티프로세스 복호화 테스트</h1>
        
        <!-- 1단계: 데이터 불러오기 -->
        <div class="card step-card">
            <div class="card-header bg-primary text-white">
                1. 데이터 불러오기 (복호화 없음)
            </div>
            <div class="card-body">
                <p class="card-text">데이터베이스에서 전체 데이터를 불러옵니다. 이 단계에서는 복호화를 수행하지 않습니다.</p>
                <button id="fetchDataBtn" class="btn btn-primary">데이터 불러오기</button>
                <div id="fetchLoader" class="loader mt-3" style="display: none;"></div>
                <div id="fetchResult" class="alert alert-info mt-3" style="display: none;"></div>
                
                <div id="fetchDataSection" class="data-container result-section">
                    <h5>데이터 불러오기 결과</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <p>총 행 수: <span id="rowCount">0</span></p>
                            <p>총 열 수: <span id="columnCount">0</span></p>
                            <p>소요 시간: <span id="fetchTime">0</span>초</p>
                        </div>
                        <div class="col-md-6">
                            <h6>테이블 상태</h6>
                            <div id="tableInfo" class="table-info">
                                <!-- 테이블 상태 정보가 여기에 표시됩니다 -->
                            </div>
                        </div>
                    </div>
                    
                    <h6 class="mt-3">샘플 데이터 (암호화된 상태)</h6>
                    <pre id="sampleData">데이터를 불러오면 여기에 표시됩니다.</pre>
                    
                    <div class="card mt-3">
                        <div class="card-header bg-warning">
                            <h6 class="mb-0">테이블 ID 불일치 정보</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p>총 행 수: <span id="totalRowsCount">0</span></p>
                                    <p>고유 master_id 수: <span id="uniqueIdsCount">0</span></p>
                                    <p>중복 master_id 수: <span id="duplicateIdsCount">0</span></p>
                                </div>
                                <div class="col-md-6">
                                    <h6>테이블별 고유 ID (다른 테이블에 없는 master_id)</h6>
                                    <div id="tableUniqueIds" class="table-info">
                                        <!-- 테이블별 고유 ID 정보가 여기에 표시됩니다 -->
                                    </div>
                                    <small class="text-muted mt-2 d-block">참고: excel_master_only는 마스터 테이블에는 있지만 분산 테이블에 없는 ID를 나타냅니다.</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 2단계: 데이터 복호화 -->
        <div class="card step-card">
            <div class="card-header bg-success text-white">
                2. 데이터 복호화 (멀티프로세스)
            </div>
            <div class="card-body">
                <p class="card-text">데이터베이스에서 데이터를 다시 불러온 후 멀티프로세스를 사용하여 복호화합니다.</p>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="processCount" class="form-label">프로세스 수</label>
                        <select id="processCount" class="form-select">
                            <option value="1">1 (단일 프로세스)</option>
                            <option value="2">2</option>
                            <option value="4" selected>4</option>
                            <option value="8">8</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="chunkSize" class="form-label">청크 크기</label>
                        <select id="chunkSize" class="form-select">
                            <option value="100">100 행 (매우 작음)</option>
                            <option value="500">500 행 (작음)</option>
                            <option value="1000" selected>1000 행 (기본)</option>
                            <option value="2000">2000 행 (중간)</option>
                            <option value="5000">5000 행 (큼)</option>
                        </select>
                        <small class="text-muted d-block mt-1">큰 청크는 더 빠를 수 있지만 메모리를 더 많이 사용합니다</small>
                    </div>
                </div>
                
                <button id="decryptBtn" class="btn btn-success">복호화 실행</button>
                <div id="decryptLoader" class="loader mt-3" style="display: none;"></div>
                <div id="decryptResult" class="alert mt-3" style="display: none;"></div>
                
                <div id="decryptDataSection" class="data-container result-section">
                    <h5>복호화 결과</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <p>암호화 데이터 행 수: <span id="encryptedRowCount">0</span></p>
                            <p>복호화 데이터 행 수: <span id="decryptedRowCount">0</span></p>
                            <p>데이터 열 수: <span id="decryptedColumnCount">0</span></p>
                        </div>
                        <div class="col-md-6">
                            <p>데이터 불러오기 시간: <span id="dataFetchTime">0</span>초</p>
                            <p>복호화 처리 시간: <span id="decryptTime">0</span>초</p>
                            <p>총 소요 시간: <span id="totalTime">0</span>초</p>
                        </div>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <h6>암호화된 샘플 데이터</h6>
                            <pre id="encryptedSample">복호화를 실행하면 여기에 표시됩니다.</pre>
                        </div>
                        <div class="col-md-6">
                            <h6>복호화된 샘플 데이터</h6>
                            <pre id="decryptedSample">복호화를 실행하면 여기에 표시됩니다.</pre>
                        </div>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-12">
                            <h6>처리 통계</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered">
                                    <tr>
                                        <th>청크 크기</th>
                                        <td><span id="chunkSizeInfo">-</span> 행</td>
                                        <th>총 청크 수</th>
                                        <td><span id="totalChunksInfo">-</span></td>
                                    </tr>
                                    <tr>
                                        <th>프로세스 수</th>
                                        <td><span id="processCountInfo">-</span></td>
                                        <th>평균 청크 처리 시간</th>
                                        <td><span id="avgChunkTime">-</span> 초</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        $(document).ready(function() {
            // 데이터 불러오기 버튼 이벤트
            $('#fetchDataBtn').click(function() {
                fetchData();
            });
            
            // 복호화 버튼 이벤트
            $('#decryptBtn').click(function() {
                decryptData();
            });
        });
        
        // 데이터 불러오기 함수
        function fetchData() {
            // 로딩 표시
            $('#fetchLoader').show();
            $('#fetchResult').hide();
            $('#fetchDataSection').hide();
            
            // AJAX 요청
            $.ajax({
                url: '/test_decrypt.php?action=fetch_data',
                type: 'GET',
                dataType: 'json',
                timeout: 300000 // 5분 타임아웃
            })
            .done(function(response) {
                console.log('데이터 불러오기 응답:', response);
                
                if (response.success) {
                    // 성공 메시지
                    $('#fetchResult').removeClass('alert-danger').addClass('alert-success');
                    $('#fetchResult').html(`
                        <h5>데이터 불러오기 성공!</h5>
                        <p>${response.message}</p>
                    `);
                    
                    // 데이터 표시
                    $('#rowCount').text(response.rowCount);
                    $('#columnCount').text(response.columnCount);
                    $('#fetchTime').text(response.elapsedTime);
                    
                    // 테이블 정보 표시
                    $('#tableInfo').empty();
                    
                    // 마스터 테이블 정보가 있으면 별도로 표시
                    if (response.tableInfo['excel_master'] !== undefined) {
                        const masterCount = response.tableInfo['excel_master'];
                        $('#tableInfo').append(`
                            <span class="table-badge bg-primary text-white">excel_master: ${masterCount}행</span>
                        `);
                        delete response.tableInfo['excel_master'];
                    }
                    
                    // 나머지 테이블 정보 표시
                    $.each(response.tableInfo, function(table, count) {
                        $('#tableInfo').append(`
                            <span class="table-badge">${table}: ${count}행</span>
                        `);
                    });
                    
                    // ID 불일치 정보 표시
                    if (response.idMismatchInfo) {
                        // 기본 정보 업데이트
                        $('#totalRowsCount').text(response.idMismatchInfo.total_rows_count);
                        $('#uniqueIdsCount').text(response.idMismatchInfo.unique_ids_count);
                        
                        // 중복 ID 수 계산 및 표시
                        const duplicateCount = response.idMismatchInfo.duplicate_ids_count;
                        $('#duplicateIdsCount').text(duplicateCount);
                        
                        // 중복이 많으면 경고 색상으로 표시
                        if (duplicateCount > 0) {
                            $('#duplicateIdsCount').addClass('text-danger');
                        } else {
                            $('#duplicateIdsCount').removeClass('text-danger');
                        }
                        
                        // 테이블별 고유 ID 정보 표시
                        $('#tableUniqueIds').empty();
                        if (response.idMismatchInfo.table_unique_ids && Object.keys(response.idMismatchInfo.table_unique_ids).length > 0) {
                            $.each(response.idMismatchInfo.table_unique_ids, function(table, count) {
                                let badgeClass = "bg-danger text-white";
                                if (table === 'excel_master_only') {
                                    badgeClass = "bg-warning text-dark";
                                }
                                $('#tableUniqueIds').append(`
                                    <span class="table-badge ${badgeClass}">${table}: ${count}개 고유 ID</span>
                                `);
                            });
                        } else {
                            $('#tableUniqueIds').append('<p>모든 테이블의 ID가 일치합니다.</p>');
                        }
                        
                        // 마스터 테이블 정보 추가
                        if (response.idMismatchInfo.master_table_count !== undefined) {
                            $('#totalRowsCount').after(`<p>마스터 테이블 행 수: <span id="masterTableCount">${response.idMismatchInfo.master_table_count}</span></p>`);
                        }
                    }
                    
                    // 샘플 데이터 표시
                    if (response.sampleData && response.sampleData.length > 0) {
                        $('#sampleData').text(JSON.stringify(response.sampleData, null, 2));
                    } else {
                        $('#sampleData').text('샘플 데이터가 없습니다.');
                    }
                    
                    // 결과 섹션 표시
                    $('#fetchDataSection').show();
                } else {
                    // 실패 메시지
                    $('#fetchResult').removeClass('alert-success').addClass('alert-danger');
                    $('#fetchResult').html(`
                        <h5>데이터 불러오기 실패</h5>
                        <p>${response.message}</p>
                    `);
                }
                
                $('#fetchResult').show();
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('데이터 불러오기 요청 실패:', textStatus, errorThrown);
                
                $('#fetchResult').removeClass('alert-success').addClass('alert-danger');
                $('#fetchResult').html(`
                    <h5>데이터 불러오기 요청 실패</h5>
                    <p>오류: ${textStatus}</p>
                    <p>상태: ${jqXHR.status} ${jqXHR.statusText}</p>
                    <details>
                        <summary>자세한 오류</summary>
                        <pre>${jqXHR.responseText}</pre>
                    </details>
                `);
                $('#fetchResult').show();
            })
            .always(function() {
                $('#fetchLoader').hide();
            });
        }
        
        // 데이터 복호화 함수
        function decryptData() {
            // 프로세스 수 가져오기
            const processCount = $('#processCount').val();
            
            // 로딩 표시
            $('#decryptLoader').show();
            $('#decryptResult').hide();
            $('#decryptDataSection').hide();
            
            // AJAX 요청
            $.ajax({
                url: `/test_decrypt.php?action=decrypt_data&process_count=${processCount}&chunk_size=${$('#chunkSize').val()}`,
                type: 'GET',
                dataType: 'json',
                timeout: 600000 // 10분 타임아웃
            })
            .done(function(response) {
                console.log('복호화 응답:', response);
                
                if (response.success) {
                    // 성공 메시지
                    $('#decryptResult').removeClass('alert-danger').addClass('alert-success');
                    $('#decryptResult').html(`
                        <h5>복호화 성공!</h5>
                        <p>${response.message}</p>
                    `);
                    
                    // 행 수 일치 여부 확인 및 표시
                    const rowsMatch = response.encryptedRowCount === response.decryptedRowCount;
                    
                    // 결과 데이터 표시
                    $('#encryptedRowCount').text(response.encryptedRowCount);
                    $('#decryptedRowCount').text(
                        rowsMatch 
                            ? response.decryptedRowCount 
                            : `${response.decryptedRowCount} (불일치! ${response.encryptedRowCount}행이어야 함)`
                    );
                    
                    if (!rowsMatch) {
                        $('#decryptedRowCount').addClass('text-danger');
                    } else {
                        $('#decryptedRowCount').removeClass('text-danger');
                    }
                    
                    $('#decryptedColumnCount').text(response.columnCount);
                    $('#dataFetchTime').text(response.fetchTime);
                    $('#decryptTime').text(response.decryptTime);
                    $('#totalTime').text(response.totalTime);
                    
                    // 청크 처리 통계 표시
                    $('#chunkSizeInfo').text(response.chunkSize);
                    $('#totalChunksInfo').text(response.totalChunks);
                    $('#processCountInfo').text(response.processCount);
                    
                    // 평균 청크 처리 시간 계산
                    if (response.totalChunks > 0) {
                        const avgTime = (response.decryptTime / response.totalChunks).toFixed(2);
                        $('#avgChunkTime').text(avgTime);
                    } else {
                        $('#avgChunkTime').text('-');
                    }
                    
                    // 샘플 데이터 표시
                    if (response.sampleEncrypted && response.sampleEncrypted.length > 0) {
                        $('#encryptedSample').text(JSON.stringify(response.sampleEncrypted, null, 2));
                    } else {
                        $('#encryptedSample').text('암호화된 샘플 데이터가 없습니다.');
                    }
                    
                    if (response.sampleDecrypted && response.sampleDecrypted.length > 0) {
                        $('#decryptedSample').text(JSON.stringify(response.sampleDecrypted, null, 2));
                    } else {
                        $('#decryptedSample').text('복호화된 샘플 데이터가 없습니다.');
                    }
                    
                    // 결과 섹션 표시
                    $('#decryptDataSection').show();
                } else {
                    // 실패 메시지
                    $('#decryptResult').removeClass('alert-success').addClass('alert-danger');
                    let errorMsg = `<h5>복호화 실패</h5><p>${response.message}</p>`;
                    
                    // 오류 위치 표시
                    if (response.errorLocation) {
                        errorMsg += `<p><strong>오류 발생 위치:</strong> ${response.errorLocation}</p>`;
                    }
                    
                    // 암호화된 행 수 표시
                    if (response.encryptedRowCount) {
                        errorMsg += `<p><strong>데이터 불러오기는 성공:</strong> ${response.encryptedRowCount}행</p>`;
                    }
                    
                    $('#decryptResult').html(errorMsg);
                }
                
                $('#decryptResult').show();
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('복호화 요청 실패:', textStatus, errorThrown);
                
                $('#decryptResult').removeClass('alert-success').addClass('alert-danger');
                $('#decryptResult').html(`
                    <h5>복호화 요청 실패</h5>
                    <p>오류: ${textStatus}</p>
                    <p>상태: ${jqXHR.status} ${jqXHR.statusText}</p>
                    <details>
                        <summary>자세한 오류</summary>
                        <pre>${jqXHR.responseText}</pre>
                    </details>
                `);
                $('#decryptResult').show();
            })
            .always(function() {
                $('#decryptLoader').hide();
            });
        }
    </script>
    
    <!-- 로그 표시 영역 -->
    <div class="container mt-4 mb-5">
        <div class="card">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0">실시간 로그 메시지</h5>
                <button id="clearLogBtn" class="btn btn-sm btn-outline-light">로그 지우기</button>
            </div>
            <div class="card-body p-0">
                <pre id="logMessages" class="m-0 p-3 bg-dark text-light" style="max-height: 500px; overflow-y: auto; font-size: 0.85rem; border-radius: 0 0 5px 5px;"></pre>
            </div>
        </div>
    </div>

    <script>
        // 로그 메시지 표시 함수
        function displayLogs(logs) {
            if (!logs || !logs.length) return;
            
            const logContainer = $('#logMessages');
            // 기존 로그에 추가
            const existingLogs = logContainer.html();
            const newLogs = logs.join('\n');
            
            if (existingLogs) {
                logContainer.html(existingLogs + '\n' + newLogs);
            } else {
                logContainer.html(newLogs);
            }
            
            // 스크롤을 가장 아래로 이동
            logContainer.scrollTop(logContainer[0].scrollHeight);
        }
        
        // 로그 지우기 버튼 이벤트
        $('#clearLogBtn').click(function() {
            $('#logMessages').empty();
        });
        
        // Ajax 응답에서 로그 처리
        $(document).ajaxComplete(function(event, xhr, settings) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response && response.logMessages) {
                    displayLogs(response.logMessages);
                }
            } catch (e) {
                // 파싱 오류 무시
            }
        });
    </script>
</body>
</html> 