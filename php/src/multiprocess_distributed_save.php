<?php
/**
 * multiprocess_distributed_save.php - 멀티프로세스를 활용한 데이터 분산 저장
 * - AES-GCM 암호화 옵션 추가
 */

ob_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 로깅 함수
function log_msg($message) {
    static $logFile = null;
    if ($logFile === null) {
        $logFile = __DIR__ . '/debug.log';
    }
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// 프로세스 매니저 포함
require_once __DIR__ . '/process_manager.php';

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
    
    // 암호화 옵션 확인 (기본값: 비활성화)
    $encrypt = isset($input['encrypt']) ? (bool)$input['encrypt'] : false;
    
    // 시작 시간 기록
    $startTime = microtime(true);
    
    // 프로세스 수 설정 (기본값 4개)
    $processCount = isset($input['processCount']) ? (int)$input['processCount'] : 
                   (isset($input['threadCount']) ? (int)$input['threadCount'] : 4);
    
    // 데이터를 프로세스 수만큼 나누기
    $chunkSize = ceil($rowCount / $processCount);
    $dataChunks = array_chunk($data, $chunkSize);
    
    log_msg("데이터 행 수: $rowCount, 프로세스 수: $processCount, 청크 크기: $chunkSize");
    
    // 워커 스크립트 경로
    $workerScript = __DIR__ . '/chunk_worker.php';
    if (!file_exists($workerScript)) {
        throw new Exception("워커 스크립트가 존재하지 않습니다: $workerScript");
    }
    
    // 프로세스 매니저 초기화
    $manager = new ProcessManager();
    
    // 암호화 옵션을 전달하여 병렬 처리 실행
    $workerArgs = $encrypt ? 'encrypt' : '';
    $results = $manager->processInParallel($dataChunks, $workerScript, $processCount, $workerArgs);
    
    // 결과 분석
    $totalRowsAffected = 0;
    $success = true;
    $errors = [];
    $isEncrypted = false;
    $encryptMethod = null;
    
    foreach ($results['results'] as $result) {
        // 유효한 결과 확인
        if (!isset($result['result']) || !is_array($result['result'])) {
            $success = false;
            $errors[] = "유효하지 않은 워커 응답: " . json_encode($result);
            continue;
        }
        
        if (isset($result['result']['success']) && $result['result']['success']) {
            // rowsAffected 누적
            $workerRowsAffected = $result['result']['rowsAffected'] ?? 0;
            if ($workerRowsAffected == 0 && isset($result['result']['processedRows'])) {
                $workerRowsAffected = $result['result']['processedRows'];
                log_msg("워커 #{$result['index']} - 영향 행 수 0, 처리된 행 수({$workerRowsAffected})로 대체");
            }
            $totalRowsAffected += $workerRowsAffected;
            log_msg("워커 #{$result['index']} - 영향 행 수: {$workerRowsAffected}, 누적: {$totalRowsAffected}");
            
            // 암호화 정보 확인
            if (isset($result['result']['encrypted']) && $result['result']['encrypted']) {
                $isEncrypted = true;
                $encryptMethod = $result['result']['encryptMethod'] ?? "AES-GCM";
            }
        } else {
            $success = false;
            // 오류 메시지가 없는 경우 기본 메시지 사용
            $errorMsg = isset($result['result']['message']) && !empty($result['result']['message']) 
                ? $result['result']['message'] 
                : "알 수 없는 오류 (워커 #" . $result['index'] . ")";
            
            // stderr도 함께 로깅
            if (!empty($result['stderr'])) {
                log_msg("워커 오류 (stderr): " . $result['stderr']);
                $errorMsg .= " [stderr: " . substr($result['stderr'], 0, 100) . "]";
            }
            
            $errors[] = $errorMsg;
        }
    }
    
    // 소요 시간
    $elapsedSec = microtime(true) - $startTime;
    
    // 성공 응답
    ob_clean();
    echo json_encode([
        'success' => $success,
        'message' => $success 
            ? "데이터 분산 저장 완료 (테이블 30개, 멀티프로세스 {$processCount}개 사용" .
              ($isEncrypted ? ", AES-GCM 암호화" : "") . ")"
            : "일부 프로세스에서 오류 발생: " . implode("; ", $errors),
        'rowsAffected' => $totalRowsAffected,
        'inputRowCount' => $rowCount,
        'tableCount' => 30,
        'processCount' => $processCount,
        'elapsedSec' => round($elapsedSec, 4),
        'method' => 'multiprocess_distributed',
        'encrypted' => $isEncrypted,
        'encryptMethod' => $encryptMethod
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