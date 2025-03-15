<?php
/**
 * reset_tables.php - 모든 테스트 테이블 초기화
 * - excel_full 테이블 및 excel_part1 ~ excel_part30 테이블 데이터 삭제
 */

// 오류 표시 중지 (JSON 응답 유지를 위해)
ini_set('display_errors', 0);
error_reporting(E_ALL);

// JSON 응답 헤더 설정
header('Content-Type: application/json; charset=utf-8');

// 로깅 함수
function log_msg($message) {
    static $logFile = null;
    if ($logFile === null) {
        $logDir = __DIR__ . '/logs';
        if (!is_dir($logDir)) {
            if (!@mkdir($logDir, 0777, true)) {
                // 로그 디렉토리 생성 실패 시 처리하지 않음
                return;
            }
        }
        $logFile = $logDir . '/reset_tables.log';
    }
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// DB 설정 파일 포함
require_once __DIR__ . '/db_config.php';

try {
    // 요청 방식 확인
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("POST 요청만 허용됩니다");
    }
    
    // DB 연결
    log_msg("DB 연결 시도");
    $pdo = getDBConnection();
    
    // 테이블 초기화하기 전에 버퍼 풀 상태 저장
    $pdo->query("SET GLOBAL innodb_buffer_pool_dump_now=ON");
    
    // 모든 테이블 초기화
    $pdo->beginTransaction();
    
    // excel_full 테이블 초기화
    $pdo->exec("TRUNCATE TABLE excel_full");
    log_msg("excel_full 테이블 초기화 완료");
    
    // excel_part1 ~ excel_part30 테이블 초기화
    for ($i = 1; $i <= 30; $i++) {
        $tableName = "excel_part" . $i;
        $pdo->exec("TRUNCATE TABLE $tableName");
    }
    
    $pdo->commit();
    log_msg("모든 테이블 초기화 완료");
    
    // 버퍼 풀 상태 복원
    $pdo->query("SET GLOBAL innodb_buffer_pool_load_now=ON");
    
    // 성공 응답
    echo json_encode([
        'success' => true,
        'message' => '모든 테이블 초기화 완료 (버퍼 풀 유지)',
        'tables' => 31 // excel_full + excel_part1~30
    ]);
    
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    log_msg("DB 오류: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $e->getMessage()]);
} catch (Exception $e) {
    log_msg("일반 오류: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
} 