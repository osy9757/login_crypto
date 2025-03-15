<?php
// 오류 표시 활성화
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/plain; charset=utf-8');

// reset_tables.php 파일 확인
$resetFile = __DIR__ . '/reset_tables.php';
if (!file_exists($resetFile)) {
    echo "오류: reset_tables.php 파일이 존재하지 않습니다.\n";
    echo "현재 디렉토리: " . __DIR__ . "\n";
    echo "디렉토리 내용:\n";
    echo implode("\n", scandir(__DIR__));
    exit;
}

echo "reset_tables.php 파일 확인 완료\n";

// DB 연결 설정 확인
require_once __DIR__ . '/db_config.php';

try {
    $pdo = getDBConnection();
    echo "DB 연결 성공\n";
    
    // 테이블 존재 여부 확인
    $tables = [];
    $tables[] = 'excel_full';
    for ($i = 1; $i <= 30; $i++) {
        $tables[] = "excel_part$i";
    }
    
    $existingTables = [];
    foreach ($tables as $table) {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        if ($stmt->rowCount() > 0) {
            $existingTables[] = $table;
        }
    }
    
    echo "존재하는 테이블: " . count($existingTables) . "/" . count($tables) . "\n";
    echo implode(", ", $existingTables);
    
} catch (Exception $e) {
    echo "오류 발생: " . $e->getMessage() . "\n";
    echo "스택 트레이스:\n" . $e->getTraceAsString();
} 