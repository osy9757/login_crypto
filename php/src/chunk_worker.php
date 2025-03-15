<?php
/**
 * chunk_worker.php - 단일 데이터 청크를 처리하는 워커
 * 
 * 사용법: php chunk_worker.php <temp_file_path>
 */

// 로그 디렉토리 설정 - 안전한 생성 로직
$logDir = __DIR__ . '/logs';
if (!is_dir($logDir)) {
    try {
        if (!@mkdir($logDir, 0777, true)) {
            // 실패하면 기본 시스템 임시 디렉토리 사용
            $logDir = sys_get_temp_dir();
        }
    } catch (Exception $e) {
        $logDir = sys_get_temp_dir();
    }
}

// 로그 파일 경로 설정
$workerLogFile = $logDir . '/worker_' . getmypid() . '.log';

// 로깅 함수 - 실패해도 계속 진행
function worker_log($message) {
    global $workerLogFile;
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($workerLogFile, "[$timestamp] $message\n", FILE_APPEND);
}

// 시작 로그
worker_log("워커 시작: PID=" . getmypid() . ", 인자=" . json_encode($argv));

// DB 설정 로드 - getDBConnection 함수 사용
require_once __DIR__ . '/db_config.php';

// AES-GCM 암호화 클래스 로드
require_once __DIR__ . '/AesGcmEncryptor.php';

// 입력 검증
if ($argc < 2) {
    worker_log("인자 부족: " . json_encode($argv));
    echo json_encode(['success' => false, 'message' => '파일 경로 인자가 필요합니다']);
    exit(1);
}

// 파일 존재 여부 확인 및 재시도
$maxRetries = 3;
$retryDelay = 200000; // 0.2초 (마이크로초 단위)
$tempFile = $argv[1];

for ($retry = 0; $retry < $maxRetries; $retry++) {
    clearstatcache(true, $tempFile);
    if (file_exists($tempFile)) {
        break;
    }
    worker_log("파일을 찾을 수 없음, 재시도 #{$retry}: {$tempFile}");
    usleep($retryDelay);
}

if (!file_exists($tempFile)) {
    worker_log("최대 재시도 후에도 파일을 찾을 수 없음: {$tempFile}");
    echo json_encode(['success' => false, 'message' => '파일을 찾을 수 없음: ' . $tempFile]);
    exit(1);
}

// 파일 읽기 및 JSON 파싱
worker_log("파일 읽기: " . $tempFile . ", 크기: " . filesize($tempFile) . " 바이트");
$jsonString = file_get_contents($tempFile);
if (empty($jsonString)) {
    worker_log("파일이 비어 있습니다: " . $tempFile);
    echo json_encode(['success' => false, 'message' => '파일이 비어 있음: ' . $tempFile]);
    exit(1);
}

try {
    // 환경 변수 로드 (db_config.php 에서 가져온 함수)
    worker_log("환경 변수 로드 시도");
    loadEnv();
    
    // DB 설정 직접 가져오기
    $host = getenv('MYSQL_HOST') ?: 'excel_test_mysql';
    $dbname = getenv('MYSQL_DATABASE') ?: 'excel_test';
    $user = getenv('MYSQL_USER') ?: 'testuser';
    $pass = getenv('MYSQL_PASSWORD') ?: 'testpassword';
    $port = getenv('MYSQL_PORT') ?: '3306';
    
    worker_log("DB 설정: host=$host, db=$dbname, user=$user, port=$port");
    
    // 데이터 로드
    worker_log("JSON 파싱: " . substr($jsonString, 0, 100) . "...");
    $chunkData = json_decode($jsonString, true);
    if ($chunkData === null && json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON 파싱 오류: " . json_last_error_msg());
    }
    
    if (empty($chunkData) || !is_array($chunkData)) {
        throw new Exception("유효한 데이터가 없습니다");
    }
    
    worker_log("데이터 항목 수: " . count($chunkData));
    
    // 암호화 옵션 확인
    $encrypt = isset($argv[3]) && $argv[3] === 'encrypt';
    
    // 데이터 준비 (암호화 여부에 따라 처리)
    if ($encrypt) {
        worker_log("AES-GCM 암호화 시작");
        
        // 첫번째 행에서 컬럼 수 확인
        $firstRow = reset($chunkData);
        $columnCount = count($firstRow);
        worker_log("컬럼 수: $columnCount");
        
        // 2차원 배열로 변환 (연관 배열 -> 인덱스 배열)
        $transformedData = [];
        foreach ($chunkData as $row) {
            $rowValues = [];
            foreach ($row as $value) {
                $rowValues[] = (string)$value;
            }
            $transformedData[] = $rowValues;
        }
        
        // AES-GCM 암호화 실행
        try {
            $encryptor = new AesGcmEncryptor();
            $encryptedData = $encryptor->encryptData($transformedData, $columnCount);
            
            // 암호화된 데이터를 원래 키와 매핑
            $finalData = [];
            $i = 0;
            foreach ($chunkData as $originalRow) {
                $keys = array_keys($originalRow);
                $encRow = [];
                foreach ($keys as $idx => $key) {
                    $encRow[$key] = $encryptedData[$i][$idx] ?? '';
                }
                $finalData[] = $encRow;
                $i++;
            }
            
            worker_log("암호화 완료: " . count($finalData) . " 행");
            $jsonData = json_encode($finalData);
        } catch (Exception $e) {
            worker_log("암호화 실패: " . $e->getMessage());
            throw $e;
        }
    } else {
        // 암호화 없이 그대로 사용
        worker_log("암호화 없이 원본 데이터 사용");
        $jsonData = json_encode($chunkData);
    }
    
    // DB 연결 - 직접 환경 변수에서 가져온 값 사용
    worker_log("DB 연결 시도");
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;port=$port",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // 저장 프로시저 호출
    worker_log("저장 프로시저 호출 준비");
    $stmt = $pdo->prepare("CALL sp_distribute_excel_data(?)");
    $stmt->execute([$jsonData]);
    
    // 결과 처리
    worker_log("결과 처리");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $rowsAffected = $result['total_rows_affected'] ?? count($chunkData);
    
    // 결과가 0이면 처리한 행 수로 대체
    if ($rowsAffected == 0) {
        $rowsAffected = count($chunkData);
        worker_log("저장 프로시저가 총 영향 행 수를 반환하지 않아 처리한 행 수({$rowsAffected})로 대체합니다.");
    }
    
    // 연결 종료
    $pdo = null;
    
    // 성공 응답에 암호화 정보 추가
    $response = [
        'success' => true,
        'rowsAffected' => $rowsAffected,
        'processedRows' => count($chunkData),
        'encrypted' => $encrypt,
        'encryptMethod' => $encrypt ? "AES-GCM (FFI)" : null
    ];
    worker_log("성공 응답 반환: " . json_encode($response));
    echo json_encode($response);
    
    exit(0);
    
} catch (PDOException $e) {
    worker_log("PDO 오류: " . $e->getMessage());
    // DB 오류 자세히 기록
    echo json_encode([
        'success' => false,
        'message' => 'DB 오류: ' . $e->getMessage(),
        'code' => $e->getCode()
    ]);
    exit(1);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => '워커 오류: ' . $e->getMessage(),
        'error_details' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
    exit(1);
} 