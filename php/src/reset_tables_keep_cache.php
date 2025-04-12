<?php
require_once __DIR__ . '/db_config.php';

try {
    $pdo = getDBConnection();
    
    // 1. 웜업 실행 (옵션)
    $warmupData = json_encode([
        ["col1" => "warmup", "col2" => "data", /* ... col60까지 */]
    ]);
    $pdo->prepare("CALL sp_distribute_excel_data(?)")->execute([$warmupData]);
    
    // 2. DELETE로 테이블 비우기 및 auto-increment 초기화 (캐시 유지)
    $pdo->beginTransaction();
    for ($i = 1; $i <= 30; $i++) {
        $pdo->query("DELETE FROM excel_part$i");
        $pdo->query("ALTER TABLE excel_part$i AUTO_INCREMENT = 1");
    }
    $pdo->query("DELETE FROM excel_full");
    $pdo->query("ALTER TABLE excel_full AUTO_INCREMENT = 1");
    $pdo->commit();
    
    echo json_encode([
        'success' => true, 
        'message' => '테이블 및 auto-increment 초기화 완료 (캐시 유지)', 
        'tables' => 31
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
