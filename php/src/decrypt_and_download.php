<?php
// 출력 버퍼링 시작
ob_start();

/**
 * decrypt_and_download.php - 테이블 데이터 가져오기 및 복호화 처리
 * 
 * 전체 데이터를 가져와 복호화하는 기능 추가
 */

// 오류 처리 및 타임아웃 설정
ini_set('display_errors', 0); // 에러 출력하지 않음
error_reporting(E_ALL);
set_time_limit(600); // 10분으로 증가 (대용량 데이터 처리용)
ini_set('memory_limit', '2G'); // 메모리 한도 증가

// 필요한 라이브러리 로드
require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/AesGcmEncryptor.php'; // 복호화 클래스 로드

// 로깅 함수
function log_msg($message) {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0777, true);
    }
    $logFile = $logDir . '/data_fetch.log';
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

/**
 * 저장 프로시저를 사용하여 전체 데이터 가져오기
 */
function fetchDataFromProcedure() {
    try {
        log_msg("프로시저를 통한 전체 데이터 조회 시작");
        
        // 시작 시간 기록
        $startTime = microtime(true);
        
        // 데이터베이스 연결
        $pdo = getDBConnection();
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // 테스트용: 행 수 확인
        $testStmt = $pdo->query("SELECT COUNT(*) as count FROM excel_part1");
        $testResult = $testStmt->fetch(PDO::FETCH_ASSOC);
        log_msg("excel_part1 테이블 행 수: " . $testResult['count']);
        
        // 저장 프로시저 호출 (페이징 없이 전체 데이터)
        $stmt = $pdo->prepare("CALL sp_merge_excel_data_all()");
        $stmt->execute();
        
        // 컬럼 이름 가져오기
        $columnCount = $stmt->columnCount();
        $headers = [];
        for ($i = 0; $i < $columnCount; $i++) {
            $meta = $stmt->getColumnMeta($i);
            $headers[] = $meta['name'];
        }
        log_msg("컬럼 정보: 총 " . $columnCount . "개 컬럼");
        
        // 결과 데이터 가져오기
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $rowCount = count($rows);
        
        // 소요 시간 계산
        $endTime = microtime(true);
        $elapsedTime = round($endTime - $startTime, 2);
        
        log_msg("전체 데이터 조회 완료: $rowCount 행, $elapsedTime 초 소요");
        
        // 첫 번째 행 확인 (샘플 데이터)
        if ($rowCount > 0) {
            $firstRowKeys = array_keys($rows[0]);
            log_msg("샘플 데이터 - 첫 번째 행의 컬럼: " . implode(", ", $firstRowKeys));
            log_msg("첫 번째 행의 첫 번째 값: " . (isset($rows[0][$firstRowKeys[0]]) ? substr($rows[0][$firstRowKeys[0]], 0, 50) . "..." : "NULL"));
        }
        
        return [
            'success' => true,
            'headers' => $headers,
            'data' => $rows,
            'rowCount' => $rowCount,
            'elapsedTime' => $elapsedTime,
            'message' => "전체 데이터 조회 완료 ($rowCount 행)"
        ];
        
    } catch (Exception $e) {
        log_msg("데이터 조회 오류: " . $e->getMessage());
        log_msg("오류 위치: " . $e->getFile() . ":" . $e->getLine());
        log_msg("스택 트레이스: " . print_r($e->getTrace(), true));
        return [
            'success' => false,
            'message' => "데이터 조회 오류: " . $e->getMessage()
        ];
    }
}

/**
 * AesGcmEncryptor 클래스 분석 및 메서드 식별
 */
function analyzeEncryptorClass() {
    try {
        log_msg("암호화 클래스 분석 시작");
        
        // 테스트 인스턴스 생성
        $encryptor = new AesGcmEncryptor("test", "\x01\x02\x03\x04");
        
        // 사용 가능한 메서드 확인 및 기록
        $methods = get_class_methods($encryptor);
        log_msg("AesGcmEncryptor 메서드 목록: " . implode(", ", $methods));
        
        // 클래스 속성 확인
        $reflection = new ReflectionClass($encryptor);
        $properties = $reflection->getProperties();
        $propNames = [];
        foreach ($properties as $prop) {
            $propNames[] = $prop->getName();
        }
        log_msg("AesGcmEncryptor 속성 목록: " . implode(", ", $propNames));
        
        return [
            'success' => true,
            'methods' => $methods,
            'properties' => $propNames
        ];
    } catch (Exception $e) {
        log_msg("암호화 클래스 분석 오류: " . $e->getMessage());
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}

/**
 * 복호화 함수 - 식별된 메서드 사용
 */
function decryptData($encryptedData, $options = []) {
    try {
        log_msg("데이터 복호화 시작: " . count($encryptedData) . "행");
        $startTime = microtime(true);
        
        // 암호화 클래스 분석
        $classAnalysis = analyzeEncryptorClass();
        if (!$classAnalysis['success']) {
            throw new Exception("암호화 클래스 분석 실패: " . $classAnalysis['message']);
        }
        
        // 클래스에서 복호화 관련 메서드 식별
        $decryptMethod = null;
        $methods = $classAnalysis['methods'];
        
        // 가능한 복호화 메서드 검색
        $decryptionMethods = ['decryptData', 'decrypt', 'decryptText', 'decryptString', 'decode'];
        foreach ($decryptionMethods as $method) {
            if (in_array($method, $methods)) {
                $decryptMethod = $method;
                log_msg("복호화 메서드 발견: $method");
                break;
            }
        }
        
        if (!$decryptMethod) {
            log_msg("복호화 메서드를 찾을 수 없음. 가능한 메서드: " . implode(", ", $methods));
            
            // 확인된 메서드 중 가장 가능성 높은 것 선택
            foreach ($methods as $method) {
                if (strpos(strtolower($method), 'decrypt') !== false || 
                    strpos(strtolower($method), 'decode') !== false) {
                    $decryptMethod = $method;
                    log_msg("추정 복호화 메서드: $method (추정)");
                    break;
                }
            }
            
            if (!$decryptMethod) {
                throw new Exception("사용 가능한 복호화 메서드를 찾을 수 없습니다");
            }
        }
        
        // 암호화 설정
        $password = isset($options['password']) ? $options['password'] : "MySecretPass!";
        $salt = isset($options['salt']) ? $options['salt'] : "\x01\x02\x03\x04";
        $key_len = isset($options['key_len']) ? (int)$options['key_len'] : 32;
        $iteration = isset($options['iteration']) ? (int)$options['iteration'] : 10000;
        $useBase64 = isset($options['useBase64']) ? (bool)$options['useBase64'] : true;
        
        // AesGcmEncryptor 인스턴스 생성
        $encryptor = new AesGcmEncryptor($password, $salt, $key_len, $iteration, $useBase64);
        
        // 복호화할 데이터 준비
        $decryptedData = [];
        $processedRows = 0;
        $errorCount = 0;
        
        // 첫 번째 행 분석하여 암호화된 컬럼 식별
        $firstRow = $encryptedData[0];
        $encryptedColumns = [];
        foreach ($firstRow as $column => $value) {
            if ($column != 'row_identifier' && !empty($value)) {
                $encryptedColumns[] = $column;
            }
        }
        log_msg("복호화할 컬럼 수: " . count($encryptedColumns));
        
        // 각 행 처리
        foreach ($encryptedData as $rowIndex => $row) {
            $decryptedRow = ['row_identifier' => $row['row_identifier']];
            
            // 각 컬럼 복호화
            foreach ($encryptedColumns as $column) {
                if (isset($row[$column]) && !empty($row[$column])) {
                    try {
                        // 동적으로 식별된 메서드 호출
                        // 단일 문자열 복호화 메서드
                        if (in_array($decryptMethod, ['decrypt', 'decryptText', 'decryptString', 'decode'])) {
                            $decryptedText = $encryptor->$decryptMethod($row[$column]);
                            $decryptedRow[$column] = $decryptedText;
                        }
                        // 배열 데이터 복호화 메서드
                        else if ($decryptMethod == 'decryptData') {
                            $singleValueArray = [$column => $row[$column]];
                            $decryptedArray = $encryptor->decryptData($singleValueArray);
                            $decryptedRow[$column] = $decryptedArray[$column];
                        }
                        else {
                            // 알 수 없는 메서드 형식일 경우
                            throw new Exception("지원되지 않는 복호화 메서드 형식: $decryptMethod");
                        }
                    } catch (Exception $ex) {
                        $errorCount++;
                        $decryptedRow[$column] = '[복호화 실패: ' . $ex->getMessage() . ']';
                        
                        if ($errorCount <= 5) {
                            log_msg("컬럼 복호화 오류 ($column): " . $ex->getMessage());
                        }
                    }
                } else {
                    $decryptedRow[$column] = '';
                }
            }
            
            $decryptedData[] = $decryptedRow;
            $processedRows++;
            
            // 진행 상황 보고 (1000행마다)
            if ($processedRows % 1000 === 0) {
                log_msg("복호화 진행 중: $processedRows/" . count($encryptedData) . " 행");
            }
            
            // 테스트 모드에서는 첫 10개 행만 처리
            if (isset($options['testMode']) && $options['testMode'] && $processedRows >= 10) {
                log_msg("테스트 모드: 첫 10개 행만 처리");
                break;
            }
        }
        
        $endTime = microtime(true);
        $elapsedTime = round($endTime - $startTime, 2);
        
        if ($errorCount > 0) {
            log_msg("복호화 완료 (오류 포함): $processedRows 행 처리, $errorCount 오류, $elapsedTime 초 소요");
        } else {
            log_msg("복호화 성공: $processedRows 행 처리, $elapsedTime 초 소요");
        }
        
        return [
            'success' => true,
            'data' => $decryptedData,
            'rowCount' => count($decryptedData),
            'elapsedTime' => $elapsedTime,
            'errorCount' => $errorCount,
            'message' => "복호화 완료 ($processedRows 행, $errorCount 오류)"
        ];
    } catch (Exception $e) {
        log_msg("복호화 오류: " . $e->getMessage());
        return [
            'success' => false,
            'message' => "복호화 오류: " . $e->getMessage()
        ];
    }
}

/**
 * 데이터를 파일로 저장
 */
function saveToFile($data, $format = 'json') {
    try {
        // 다운로드 디렉토리 확인
        $downloadDir = __DIR__ . '/../downloads';
        if (!is_dir($downloadDir)) {
            mkdir($downloadDir, 0777, true);
        }
        
        // 파일명 생성
        $timestamp = date('Ymd_His');
        $filename = "data_$timestamp.$format";
        $filepath = "$downloadDir/$filename";
        
        // 데이터 저장
        if ($format === 'json') {
            file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT));
        } else if ($format === 'csv') {
            $fp = fopen($filepath, 'w');
            // 헤더 추가
            if (!empty($data)) {
                fputcsv($fp, array_keys($data[0]));
                // 데이터 추가
                foreach ($data as $row) {
                    fputcsv($fp, $row);
                }
            }
            fclose($fp);
        } else {
            throw new Exception("지원하지 않는 파일 형식: $format");
        }
        
        return [
            'success' => true,
            'file' => $filename,
            'path' => $filepath,
            'format' => $format,
            'size' => filesize($filepath),
            'message' => "파일 저장 완료: $filename"
        ];
    } catch (Exception $e) {
        log_msg("파일 저장 오류: " . $e->getMessage());
        return [
            'success' => false,
            'message' => "파일 저장 오류: " . $e->getMessage()
        ];
    }
}

// API 요청 처리
try {
    // CORS 헤더 설정
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    // OPTIONS 요청 처리
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    
    // 요청 데이터 파싱
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    // 옵션 설정
    $options = [
        'processCount' => isset($input['processCount']) ? (int)$input['processCount'] : 4,
        'outputFormat' => isset($input['outputFormat']) ? $input['outputFormat'] : 'json',
        'useEncryption' => isset($input['useEncryption']) ? (bool)$input['useEncryption'] : true,
        'testMode' => isset($input['testMode']) ? (bool)$input['testMode'] : false,
        // 복호화 관련 옵션 추가
        'password' => isset($input['password']) ? $input['password'] : "MySecretPass!",
        'salt' => isset($input['salt']) ? $input['salt'] : "\x01\x02\x03\x04",
        'debug' => isset($input['debug']) ? (bool)$input['debug'] : false
    ];
    
    log_msg("데이터 요청 시작: useEncryption=" . ($options['useEncryption'] ? 'true' : 'false') . 
            ", testMode=" . ($options['testMode'] ? 'true' : 'false'));
    
    // 1. 데이터 가져오기
    $fetchResult = fetchDataFromProcedure();
    if (!$fetchResult['success']) {
        throw new Exception($fetchResult['message']);
    }
    
    // 2. 데이터 복호화
    $data = $fetchResult['data'];
    if ($options['useEncryption']) {
        $decryptResult = decryptData($data, $options);
        if (!$decryptResult['success']) {
            throw new Exception($decryptResult['message']);
        }
        $data = $decryptResult['data'];
    }
    
    // 3. 파일로 저장
    $fileResult = saveToFile($data, $options['outputFormat']);
    if (!$fileResult['success']) {
        throw new Exception($fileResult['message']);
    }
    
    // 4. 응답 형식 구성
    $response = [
        'success' => true,
        'message' => $options['useEncryption'] ? "데이터 복호화 및 파일 생성 완료" : "데이터 조회 및 파일 생성 완료",
        'rowCount' => count($data),
        'elapsedTime' => isset($decryptResult) ? $decryptResult['elapsedTime'] : $fetchResult['elapsedTime'],
        'file' => $fileResult['file'],
        'path' => $fileResult['path'],
        'size' => $fileResult['size'],
        'format' => $fileResult['format']
    ];
    
    // 디버그 모드인 경우 추가 정보 제공
    if ($options['debug']) {
        $response['encryptorMethodsAvailable'] = get_class_methods(new AesGcmEncryptor($options['password'], $options['salt']));
    }
    
    // 데이터 샘플 추가
    if (!empty($data)) {
        $sampleData = array_slice($data, 0, 10);
        $response['sampleData'] = $sampleData;
    }
    
    // 응답 출력 전에 버퍼 정리
    ob_clean();
    
    // 응답 출력
    echo json_encode($response);
    
} catch (Exception $e) {
    // 오류 시 버퍼 비우기
    ob_clean();
    log_msg("API 오류: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => '오류: ' . $e->getMessage()
    ]);
} finally {
    // 버퍼 종료 및 출력
    ob_end_flush();
} 