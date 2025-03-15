<?php
/**
 * reset_tables.php - 모든 테스트 테이블 초기화
 * - excel_full 테이블 및 excel_part1 ~ excel_part30 테이블 데이터 삭제
 */

// 로깅 함수
function log_msg($message) {
    $logFile = __DIR__ . '/../debug.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// env 파일 로드
require __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// PHP 에러 설정
ini_set('display_errors', 0);
error_reporting(E_ALL);

// JSON 응답 헤더
header('Content-Type: application/json; charset=utf-8');

// DB 연결정보
$dbHost = $_ENV['DB_HOST'];
$dbName = $_ENV['DB_NAME'];
$dbUser = $_ENV['DB_USER'];
$dbPass = $_ENV['DB_PASS'];

// 요청 방식 체크 (POST 필수)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    log_msg("비정상 요청: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['success' => false, 'message' => 'Only POST allowed']);
    exit;
}

// DB 연결
try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName}", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    log_msg("DB 연결 성공");
} catch (\PDOException $e) {
    log_msg("DB 연결 오류: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'DB connect error: ' . $e->getMessage()]);
    exit;
}

// 모든 테이블 초기화
try {
    $pdo->beginTransaction();
    
    // excel_full 테이블 초기화
    $pdo->exec("TRUNCATE TABLE excel_full");
    log_msg("excel_full 테이블 초기화 완료");
    
    // excel_part1 ~ excel_part30 테이블 초기화
    for ($i = 1; $i <= 30; $i++) {
        $tableName = "excel_part" . $i;
        $pdo->exec("TRUNCATE TABLE $tableName");
        log_msg("$tableName 테이블 초기화 완료");
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => '모든 테이블 초기화 완료',
        'tables' => 31 // excel_full + excel_part1~30
    ]);
    
} catch (\PDOException $e) {
    $pdo->rollBack();
    log_msg("테이블 초기화 오류: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Table reset error: ' . $e->getMessage()]);
} 