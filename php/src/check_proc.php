<?php
// proc_open 기능 테스트
$descriptorspec = [
    0 => ["pipe", "r"],
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
];

echo "proc_open 테스트 시작\n";
$process = proc_open('echo "Hello World"', $descriptorspec, $pipes);

if (is_resource($process)) {
    echo "프로세스 생성 성공\n";
    $output = stream_get_contents($pipes[1]);
    fclose($pipes[0]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $return_value = proc_close($process);
    echo "출력: $output\n";
    echo "반환값: $return_value\n";
} else {
    echo "프로세스 생성 실패\n";
}

echo "완료\n"; 