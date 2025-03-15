<?php
// 워커 프로세스 수동 테스트

// 테스트용 데이터 생성
$testData = [
    ['col1' => 'test1', 'col2' => 'value1'],
    ['col1' => 'test2', 'col2' => 'value2']
];

// 임시 파일에 저장
$tempFile = tempnam(sys_get_temp_dir(), 'test_');
file_put_contents($tempFile, json_encode($testData));

// 실행 명령어
$workerScript = __DIR__ . '/chunk_worker.php';
$cmd = sprintf('php %s %s', escapeshellarg($workerScript), escapeshellarg($tempFile));

// 실행 및 결과 출력
echo "명령어 실행: $cmd\n";
echo "결과:\n";
system($cmd);

// 임시 파일 정리
unlink($tempFile); 