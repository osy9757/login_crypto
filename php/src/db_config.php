<?php
// 순수 PHP로 구현 (Composer 사용 안 함)

// 상수 정의 (이 부분 추가)
if (!defined('DB_HOST')) {
    define('DB_HOST', getenv('MYSQL_HOST') ?: 'excel_test_mysql');
    define('DB_NAME', getenv('MYSQL_DATABASE') ?: 'excel_test');
    define('DB_USER', getenv('MYSQL_USER') ?: 'testuser');
    define('DB_PASS', getenv('MYSQL_PASSWORD') ?: 'testpassword');
    define('DB_PORT', getenv('MYSQL_PORT') ?: '3306');
}

// 환경 변수 로드 함수
function loadEnv() {
    $envFile = __DIR__ . '/../../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                putenv("$name=$value");
                $_ENV[$name] = $value;
            }
        }
    }
}

// 출력 버퍼링 시작 - 맨 앞에 추가
ob_start();

// 데이터베이스 연결 함수
function getDBConnection() {
    // 환경 변수 로드
    loadEnv();
    
    // 환경 변수에서 설정 가져오기
    $host = getenv('MYSQL_HOST') ?: 'excel_test_mysql';
    $dbname = getenv('MYSQL_DATABASE') ?: 'excel_test';
    $user = getenv('MYSQL_USER') ?: 'testuser';
    $pass = getenv('MYSQL_PASSWORD') ?: 'testpassword';
    $port = getenv('MYSQL_PORT') ?: '3306';
    $rootPass = getenv('MYSQL_ROOT_PASSWORD') ?: 'root_password';
    
    // 로그 기록 (출력 대신 error_log 사용)
    error_log("DB 연결 정보: host=$host, dbname=$dbname, user=$user");
    
    try {
        // TCP/IP 연결 사용
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];
        
        // 먼저 일반 사용자로 시도
        try {
            $pdo = new PDO($dsn, $user, $pass, $options);
            return $pdo;
        } catch (PDOException $e) {
            // 실패하면 root로 시도
            error_log("사용자 '$user' 연결 실패, root로 시도합니다: " . $e->getMessage());
            $pdo = new PDO($dsn, 'root', $rootPass, $options);
            return $pdo;
        }
    } catch (PDOException $e) {
        error_log("모든 연결 시도 실패: " . $e->getMessage());
        throw new PDOException("Database connection failed: " . $e->getMessage());
    }
}

// 로그 함수 또는 디버깅 코드 수정
function db_log($message) {
    // 파일에 로그 기록 (출력하지 않음)
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0777, true);
    }
    $logFile = $logDir . '/db_access.log';
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}
?> 