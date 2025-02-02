<?php
// signup_process.php

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

try {
    $pdo = new PDO("pgsql:host={$dbHost};dbname={$dbName}", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("DB 연결 오류: " . $e->getMessage());
}

// POST 값 수신
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';

// 간단한 검증
if (empty($email) || empty($password)) {
    echo "이메일 또는 비밀번호가 누락되었습니다.";
    exit;
}

// 이메일 형식 검사
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "유효한 이메일이 아닙니다.";
    exit;
}

// 비밀번호 해싱
$hashedPassword = password_hash($password, PASSWORD_ARGON2ID); 
// Argon2id 지원이 안 되면, password_hash($password, PASSWORD_DEFAULT);

// INSERT 시도
try {
    $stmt = $pdo->prepare("INSERT INTO users (email, password_hash) VALUES (:email, :phash)");
    $stmt->execute([
        ':email' => $email,
        ':phash' => $hashedPassword
    ]);
    
    // 가입 성공 → 로그인 페이지로 리다이렉트
    header('Location: /frontend/pages/index.html'); 
    exit;

} catch (PDOException $e) {
    if ($e->getCode() == 23505) { 
        // 23505: unique_violation (이미 가입된 이메일)
        echo "이미 존재하는 이메일입니다.";
    } else {
        echo "DB 오류: " . $e->getMessage();
    }
}
