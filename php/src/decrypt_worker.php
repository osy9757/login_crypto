<?php
/**
 * decrypt_worker.php - 복호화 워커 프로세스
 * 
 * 개별 테이블 그룹에서 데이터를 읽고 복호화하는 프로세스
 */

ini_set('display_errors', 0); // 오류 메시지 숨김 - 깨끗한 JSON 응답을 위해
error_reporting(E_ALL);

// DB 설정 로드
require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/AesGcmEncryptor.php';

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
$workerLogFile = $logDir . '/decrypt_worker_' . getmypid() . '.log';

// 로깅 함수 - 실패해도 계속 진행
function worker_log($message) {
    global $workerLogFile;
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($workerLogFile, "[$timestamp] $message\n", FILE_APPEND);
}

try {
    // 입력 검증
    if ($argc < 2) {
        worker_log("인자 부족: 임시 파일 경로가 필요합니다");
        echo json_encode(['success' => false, 'message' => '인자 부족']);
        exit(1);
    }
    
    // 환경 변수 로드
    worker_log("환경 변수 로드 시도");
    loadEnv();
    
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
    
    $taskData = json_decode($jsonString, true);
    if (!$taskData || !isset($taskData['tableRange'])) {
        worker_log("잘못된 JSON 형식 또는 필수 필드 누락");
        echo json_encode(['success' => false, 'message' => '잘못된 작업 데이터']);
        exit(1);
    }
    
    // 작업 정보 추출
    $tableRange = $taskData['tableRange'];
    $useEncryption = $taskData['useEncryption'] ?? true;
    $taskId = $taskData['taskId'] ?? uniqid('task_');
    
    worker_log("작업 시작: ID={$taskId}, 테이블 수=" . count($tableRange));
    
    // DB 연결
    $pdo = getDBConnection();
    
    // 데이터 수집
    $allData = [];
    $headers = null;
    $columnMap = []; // 열 이름과 인덱스 매핑
    
    foreach ($tableRange as $tableNum) {
        $tableName = "excel_part" . $tableNum;
        worker_log("테이블 데이터 가져오기: $tableName");
        
        // 우선 테이블의 모든 컬럼 이름을 가져옴
        $columnsStmt = $pdo->query("SHOW COLUMNS FROM $tableName");
        $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);
        
        // 'id'와 'created_at' 열 제외
        $columns = array_filter($columns, function($col) {
            return !in_array($col, ['id', 'created_at']);
        });
        
        if ($headers === null) {
            $headers = array_values($columns);
        }
        
        $stmt = $pdo->query("SELECT * FROM $tableName ORDER BY id");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($rows)) {
            // 데이터 행 처리
            foreach ($rows as $row) {
                $dataRow = [];
                // 안전하게 컬럼 매핑
                foreach ($headers as $col) {
                    // 해당 컬럼이 행에 있는지 확인
                    $dataRow[$col] = isset($row[$col]) ? $row[$col] : '';
                }
                $allData[] = $dataRow;
            }
        }
    }
    
    worker_log("데이터 수집 완료: " . count($allData) . "행, 열 수: " . count($headers));
    
    // 암호화된 데이터인 경우 복호화
    if ($useEncryption && !empty($allData)) {
        worker_log("데이터 복호화 시작");
        try {
            $encryptor = new AesGcmEncryptor();
            $allData = $encryptor->decryptData($allData);
            worker_log("데이터 복호화 완료: " . count($allData) . "행");
        } catch (Exception $e) {
            worker_log("복호화 오류: " . $e->getMessage());
            echo json_encode([
                'success' => false,
                'message' => '복호화 오류: ' . $e->getMessage()
            ]);
            exit(1);
        }
    }
    
    // 결과를 임시 파일에 저장
    $outputDir = sys_get_temp_dir();
    $outputFile = $outputDir . '/decrypt_result_' . $taskId . '.json';
    
    $result = [
        'headers' => $headers,
        'data' => $allData
    ];
    
    file_put_contents($outputFile, json_encode($result));
    worker_log("결과 저장 완료: $outputFile");
    
    // 성공 응답
    echo json_encode([
        'success' => true,
        'message' => '데이터 처리 완료',
        'dataFile' => $outputFile,
        'rowCount' => count($allData),
        'tableCount' => count($tableRange)
    ]);
    
    exit(0);
    
} catch (PDOException $e) {
    worker_log("PDO 오류: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'DB 오류: ' . $e->getMessage()
    ]);
    exit(1);
} catch (Exception $e) {
    worker_log("일반 오류: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => '오류: ' . $e->getMessage()
    ]);
    exit(1);
} 