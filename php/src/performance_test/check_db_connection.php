<?php
// 출력 버퍼링 시작 (헤더 전송 문제 해결)
ob_start();

// 데이터베이스 설정 포함
require_once __DIR__ . '/db_config.php';

// CORS 및 응답 형식 설정
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

try {
    // 오류 표시 끄기 (프로덕션 환경에 적합)
    ini_set('display_errors', 0);
    error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);
    
    // 데이터베이스 연결 시도
    $pdo = getDBConnection();
    
    // MySQL 버전 확인
    $stmt = $pdo->query("SELECT version() as version");
    $dbVersion = $stmt->fetch(PDO::FETCH_ASSOC)['version'];
    
    // 테이블 목록 확인
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $tableCount = count($tables);
    
    // 기존 출력 버퍼 비우기
    ob_clean();
    
    // 성공 응답
    echo json_encode([
        'success' => true,
        'message' => "MySQL 버전: $dbVersion, 테이블 수: $tableCount",
        'tables' => $tables
    ]);
    
} catch (Exception $e) {
    // 기존 출력 버퍼 비우기
    ob_clean();
    
    // 오류 응답 (항상 JSON 형식)
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// 출력 버퍼 전송 및 종료
ob_end_flush();
?> 