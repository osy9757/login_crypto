<?php
// clearTable.php

header('Content-Type: application/json'); 

/*******************************************************
 * env 파일 
 *******************************************************/
require __DIR__ . '/vendor/autoload.php'; 

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();


/*******************************************************
 * DB 연결정보
 *******************************************************/
$dbHost = $_ENV['DB_HOST'];
$dbName = $_ENV['DB_NAME'];
$dbUser = $_ENV['DB_USER'];
$dbPass = $_ENV['DB_PASS'];


$response = [
    'success' => false,
    'message' => ''
];

try {
    // DB 연결
    $pdo = new PDO("pgsql:host={$dbHost};dbname={$dbName}", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 테이블 초기화 (TRUNCATE)
    $tableName = 'big_table'; // 초기화할 테이블명
    $sql = "TRUNCATE TABLE $tableName RESTART IDENTITY";
    // RESTART IDENTITY는 시퀀스(자동 증가 id)도 함께 리셋

    $pdo->exec($sql);

    $response['success'] = true;
    $response['message'] = "테이블 [$tableName] 초기화 완료!";
} catch (PDOException $e) {
    $response['message'] = "DB connection error: " . $e->getMessage();
} catch (Exception $ex) {
    $response['message'] = "초기화 실패: " . $ex->getMessage();
}

echo json_encode($response);

//docker-compose exec db /bin/bash 
//psql -h localhost -U osy -d login_crypto_db