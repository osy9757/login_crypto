<?php
// 환경 변수 체크 스크립트
require_once __DIR__ . '/db_config.php';

// 환경 변수 로드
loadEnv();

// 환경 변수 출력
echo "환경 변수 확인:\n";
echo "MYSQL_HOST: " . getenv('MYSQL_HOST') . "\n";
echo "MYSQL_DATABASE: " . getenv('MYSQL_DATABASE') . "\n";
echo "MYSQL_USER: " . getenv('MYSQL_USER') . "\n";
echo "MYSQL_PASSWORD: " . getenv('MYSQL_PASSWORD') . "\n";
echo "MYSQL_PORT: " . getenv('MYSQL_PORT') . "\n";

// 실행 방법: php check_env.php 