<?php
/**
 * process_manager2.php
 * - 멀티프로세싱을 관리하되, stderr/stdout 분리 + 안정적인 종료 처리를 구현한 예시
 */

class ProcessManager2 {
    private $workers = [];    // 실행 중인 워커 목록
    private $tempFiles = [];  // 생성한 임시 파일 목록
    private $results = [];    // 각 워커의 최종 결과
    private $processLogFile;  // 메인 로그 파일 경로

    /**
     * 여러 데이터 청크를 병렬로 처리하고 결과를 반환
     *
     * @param array  $dataChunks    분할된 청크 데이터
     * @param string $workerScript  실행할 자식 스크립트 경로 (php)
     * @param int    $maxProcesses  동시에 실행할 프로세스 최대 수
     * @param string $extraArg      워커 스크립트에 전달할 추가 인자
     * @return array [
     *    'results'   => (int index => [ 'result'=>..., 'exit_code'=>..., ... ]),
     *    'totalTime' => 전체 처리 시간(초)
     * ]
     */
    public function processInParallel($dataChunks, $workerScript, $maxProcesses = 4, $extraArg = '') {
        $startTime = microtime(true);

        // 로그 디렉토리 준비
        $logDir = $this->setupLogging();

        // 임시 디렉토리 준비
        $tempDir = $this->getTempDir();
        @chmod($tempDir, 0777);

        // 청크별로 자식 프로세스를 띄우기
        foreach ($dataChunks as $i => $chunk) {
            // 동시 프로세스 제한
            if (count($this->workers) >= $maxProcesses) {
                $this->waitForAnyProcess();  // 하나 끝날 때까지 대기
            }

            // 청크 데이터를 임시 파일에 저장
            $tempFile = $tempDir . '/chunk_' . uniqid();
            file_put_contents($tempFile, json_encode($chunk));
            @chmod($tempFile, 0666);

            $this->tempFiles[] = $tempFile;

            file_put_contents(
                $this->processLogFile,
                "[" . date('Y-m-d H:i:s') . "] 임시 파일 생성: {$tempFile} (크기: " . filesize($tempFile) . " 바이트)\n",
                FILE_APPEND
            );

            // 자식 프로세스 실행 (stderr->stdout 합치지 않음)
            $cmd = sprintf(
                'php %s %s %s %s',
                escapeshellarg($workerScript),
                escapeshellarg($tempFile),
                escapeshellarg($logDir),
                escapeshellarg($extraArg)
            );

            // 파이프 설정: 0=stdin, 1=stdout, 2=stderr
            $descriptorspec = [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ];

            file_put_contents(
                $this->processLogFile,
                "[" . date('Y-m-d H:i:s') . "] 실행: {$cmd}\n",
                FILE_APPEND
            );

            $process = proc_open($cmd, $descriptorspec, $pipes);
            if (!is_resource($process)) {
                throw new \Exception("프로세스 실행에 실패했습니다: $cmd");
            }

            // 논블로킹
            stream_set_blocking($pipes[1], 0);
            stream_set_blocking($pipes[2], 0);

            $this->workers[] = [
                'process' => $process,
                'pipes'   => $pipes,
                'stdout'  => '',
                'stderr'  => '',
                'index'   => $i, // dataChunks 순서 (int)
            ];
        }

        // 남은 프로세스가 모두 완료될 때까지 반복 대기
        while (count($this->workers) > 0) {
            $this->waitForAnyProcess();
        }

        // 임시 파일 정리
        foreach ($this->tempFiles as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }

        $totalTime = microtime(true) - $startTime;
        return [
            'results'   => $this->results,
            'totalTime' => $totalTime
        ];
    }

    /**
     * 자식 프로세스들 중 "하나라도" 종료될 때까지(또는 timeout 1초) 대기,
     * 그 후 종료된 프로세스를 완료 처리.
     */
    private function waitForAnyProcess() {
        if (empty($this->workers)) {
            return;
        }

        // --- (1) 읽을 수 있는 파이프 수집 ---
        $readPipes = [];
        $pipeMap   = []; // (int)$pipeResource => ['workerIndex'=>..., 'pipeType'=>'stdout'/'stderr']

        foreach ($this->workers as $wIndex => $worker) {
            $stdoutPipe = $worker['pipes'][1];
            $stderrPipe = $worker['pipes'][2];

            $readPipes[] = $stdoutPipe;
            $pipeMap[(int)$stdoutPipe] = ['workerIndex' => $wIndex, 'pipeType' => 'stdout'];

            $readPipes[] = $stderrPipe;
            $pipeMap[(int)$stderrPipe] = ['workerIndex' => $wIndex, 'pipeType' => 'stderr'];
        }

        $write  = null;
        $except = null;

        // --- (2) select로 I/O 변화 감지 ---
        if (stream_select($readPipes, $write, $except, 1) > 0) {
            // 읽을 수 있는 스트림 처리
            foreach ($readPipes as $rp) {
                $id = (int)$rp;
                if (!isset($pipeMap[$id])) {
                    continue;
                }
                $info = $pipeMap[$id];
                $wIndex   = $info['workerIndex'];
                $pipeType = $info['pipeType'];

                // 혹시 이미 완료된(제거된) 워커인지 확인
                if (!isset($this->workers[$wIndex])) {
                    continue;
                }

                // 데이터를 읽는다
                $data = fread($rp, 8192);
                if ($data !== false && strlen($data) > 0) {
                    $this->workers[$wIndex][$pipeType] .= $data;
                }
            }
        }

        // --- (3) 어떤 프로세스가 실제로 종료되었는지 확인 ---
        $finishedIndexes = [];
        foreach ($this->workers as $wIndex => $worker) {
            // 프로세스 리소스가 유효한지
            if (!is_resource($worker['process'])) {
                // 이미 종료된 경우
                $finishedIndexes[] = $wIndex;
                continue;
            }

            $status = proc_get_status($worker['process']);
            if (!$status['running']) {
                // 프로세스가 더 이상 실행 중이 아님
                $finishedIndexes[] = $wIndex;
            }
        }

        // --- (4) 종료된 프로세스들 completeProcess() ---
        // 한 루프에서 여러 개가 동시에 종료될 수 있으므로 배열로 처리
        foreach ($finishedIndexes as $fIndex) {
            // 이미 제거되지 않았다면 완료 처리
            if (isset($this->workers[$fIndex])) {
                $this->completeProcess($fIndex);
            }
        }
    }

    /**
     * 특정 워커 인덱스를 최종 종료 처리하여 results에 기록
     */
    private function completeProcess($wIndex) {
        $worker = $this->workers[$wIndex];

        // 남은 stdout/stderr 끝까지 읽기
        // (논블로킹이므로 혹시 남은 데이터 있을 수 있음)
        $pipes = $worker['pipes'];
        if (isset($pipes[1]) && is_resource($pipes[1])) {
            $worker['stdout'] .= stream_get_contents($pipes[1]);
        }
        if (isset($pipes[2]) && is_resource($pipes[2])) {
            $worker['stderr'] .= stream_get_contents($pipes[2]);
        }

        // 파이프 닫기
        if (isset($pipes[0]) && is_resource($pipes[0])) fclose($pipes[0]);
        if (isset($pipes[1]) && is_resource($pipes[1])) fclose($pipes[1]);
        if (isset($pipes[2]) && is_resource($pipes[2])) fclose($pipes[2]);

        // 프로세스 종료 코드
        $exitCode = proc_close($worker['process']); // -1, 255 등 특이값이 나올 수도 있음(환경에 따라)

        // stderr 로그를 메인 로그에 기록(필요시 자유롭게 처리)
        file_put_contents(
            $this->processLogFile,
            "\n[" . date('Y-m-d H:i:s') . "] Worker #{$worker['index']} stderr logs:\n" . $worker['stderr'] . "\n",
            FILE_APPEND
        );

        // stdout의 JSON 파싱
        $stdoutData = trim($worker['stdout']);
        $result = null;
        if ($stdoutData === '') {
            // 빈 응답
            $result = [
                'success' => false,
                'message' => 'JSON 파싱 오류: 빈 응답(stdout)이 반환되었습니다.',
                'raw'     => ''
            ];
        } else {
            $decoded = json_decode($stdoutData, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $result = $decoded;
            } else {
                $result = [
                    'success' => false,
                    'message' => 'JSON 파싱 오류: ' . json_last_error_msg(),
                    'raw'     => mb_substr($stdoutData, 0, 300)
                ];
            }
        }

        // 최종 결과 저장
        $this->results[$worker['index']] = [
            'result'    => $result,
            'exit_code' => $exitCode,
            'stderr'    => $worker['stderr'],
            'stdout'    => $worker['stdout'],
            'index'     => $worker['index']
        ];

        // workers 배열에서 제거
        unset($this->workers[$wIndex]);
    }

    /**
     * 로그 디렉토리/파일 셋업
     */
    private function setupLogging() {
        $logDir = __DIR__ . '/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
        }
        $this->processLogFile = $logDir . '/process_manager2.log';
        return $logDir;
    }

    /**
     * 임시 디렉토리 경로 리턴
     */
    private function getTempDir() {
        $tempDir = __DIR__ . '/tmp';
        if (!is_dir($tempDir)) {
            @mkdir($tempDir, 0777, true);
        }
        return $tempDir;
    }
}
