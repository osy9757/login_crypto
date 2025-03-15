<?php
/**
 * process_manager.php - PHP에서 멀티프로세스 구현을 위한 관리자
 */

class ProcessManager {
    private $workers = [];
    private $tempFiles = [];
    private $results = [];
    private $processLogFile;
    
    /**
     * 데이터를 여러 프로세스로 분산 처리
     */
    public function processInParallel($dataChunks, $workerScript, $maxProcesses = 4, $extraArg = '') {
        $startTime = microtime(true);
        
        $logDir = $this->setupLogging();
        
        // 임시 디렉터리가 존재하는지 확인하고 권한 설정
        $tempDir = $this->getTempDir();
        chmod($tempDir, 0777); // 모든 사용자에게 읽기/쓰기/실행 권한 부여
        
        // 프로세스 시작
        foreach ($dataChunks as $i => $chunk) {
            // 최대 동시 프로세스 제한
            if (count($this->workers) >= $maxProcesses) {
                $this->waitForAnyProcess();
            }
            
            // 임시 파일에 데이터 저장
            $tempFile = $tempDir . '/chunk_' . uniqid();
            file_put_contents($tempFile, json_encode($chunk));
            chmod($tempFile, 0666); // 임시 파일에 읽기/쓰기 권한 부여
            
            // 파일이 확실히 디스크에 쓰여졌는지 확인
            clearstatcache(true, $tempFile);
            if (!file_exists($tempFile)) {
                throw new Exception("임시 파일을 생성할 수 없습니다: $tempFile");
            }
            
            $this->tempFiles[] = $tempFile;
            
            // 로그 기록
            file_put_contents($this->processLogFile, 
                "[" . date('Y-m-d H:i:s') . "] 임시 파일 생성: $tempFile (크기: " . filesize($tempFile) . " 바이트)\n", 
                FILE_APPEND);
            
            // 워커 프로세스 실행 (추가 인자 적용)
            $cmd = sprintf('php %s %s %s %s 2>&1', 
                escapeshellarg($workerScript), 
                escapeshellarg($tempFile),
                escapeshellarg($logDir),
                escapeshellarg($extraArg)
            );
            $descriptorspec = [
                0 => ["pipe", "r"],  // stdin
                1 => ["pipe", "w"],  // stdout
                2 => ["pipe", "w"]   // stderr
            ];
            
            // 로그에 실행 명령어 기록
            file_put_contents($this->processLogFile, 
                "[" . date('Y-m-d H:i:s') . "] 실행: $cmd\n", 
                FILE_APPEND);
            
            $process = proc_open($cmd, $descriptorspec, $pipes);
            if (is_resource($process)) {
                // 논블로킹 모드 설정
                stream_set_blocking($pipes[1], 0);
                stream_set_blocking($pipes[2], 0);
                
                $this->workers[] = [
                    'process' => $process,
                    'pipes' => $pipes,
                    'stdout' => '',
                    'stderr' => '',
                    'index' => $i
                ];
            }
        }
        
        // 남은 모든 프로세스 완료 대기
        while (count($this->workers) > 0) {
            $this->waitForAnyProcess();
        }
        
        // 임시 파일 정리
        foreach ($this->tempFiles as $file) {
            if (file_exists($file)) {
                unlink($file);
            }
        }
        
        // 총 소요 시간
        $totalTime = microtime(true) - $startTime;
        
        // 결과 반환
        return [
            'results' => $this->results,
            'totalTime' => $totalTime
        ];
    }
    
    /**
     * 아무 프로세스나 하나 완료될 때까지 대기
     */
    private function waitForAnyProcess() {
        $read = [];
        foreach ($this->workers as $i => $worker) {
            $read[] = $worker['pipes'][1];
            $read[] = $worker['pipes'][2];
        }
        
        if (empty($read)) {
            return;
        }
        
        $write = null;
        $except = null;
        
        // 스트림 활동 체크
        if (stream_select($read, $write, $except, 1)) {
            foreach ($this->workers as $i => $worker) {
                // 표준 출력 확인
                if (in_array($worker['pipes'][1], $read)) {
                    $data = fread($worker['pipes'][1], 4096);
                    if ($data === false || feof($worker['pipes'][1])) {
                        // 프로세스 완료 처리
                        $this->completeProcess($i);
                        continue;
                    }
                    $this->workers[$i]['stdout'] .= $data;
                }
                
                // 표준 에러 확인
                if (in_array($worker['pipes'][2], $read)) {
                    $data = fread($worker['pipes'][2], 4096);
                    if ($data === false || feof($worker['pipes'][2])) {
                        // 프로세스 완료 처리
                        $this->completeProcess($i);
                        continue;
                    }
                    $this->workers[$i]['stderr'] .= $data;
                }
                
                // 프로세스 상태 확인
                $status = proc_get_status($worker['process']);
                if (!$status['running']) {
                    $this->completeProcess($i);
                }
            }
        }
    }
    
    /**
     * 완료된 프로세스 처리
     */
    private function completeProcess($index) {
        $worker = $this->workers[$index];
        
        // 남은 출력 수집
        $stdout = $this->workers[$index]['stdout'];
        $stderr = $this->workers[$index]['stderr'];
        
        if ($pipes = $worker['pipes']) {
            $stdout .= stream_get_contents($pipes[1]);
            $stderr .= stream_get_contents($pipes[2]);
            
            // 파이프 닫기
            fclose($pipes[0]);
            fclose($pipes[1]);
            fclose($pipes[2]);
        }
        
        // 프로세스 종료 상태 얻기
        $exitCode = proc_close($worker['process']);
        
        // 결과 파싱
        $result = null;
        try {
            if (!empty($stdout)) {
                $result = json_decode($stdout, true);
                if ($result === null && json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception("JSON 파싱 오류: " . json_last_error_msg() . ", 원본: " . substr($stdout, 0, 100));
                }
            } else {
                throw new Exception("빈 응답");
            }
        } catch (Exception $e) {
            $result = [
                'success' => false,
                'message' => 'JSON 파싱 오류: ' . $e->getMessage(),
                'raw' => substr($stdout, 0, 100)
            ];
        }
        
        // 결과 저장
        $this->results[$worker['index']] = [
            'result' => $result,
            'exit_code' => $exitCode,
            'stderr' => $stderr,
            'stdout' => $stdout,
            'index' => $worker['index']
        ];
        
        // 작업자 리스트에서 제거
        unset($this->workers[$index]);
        $this->workers = array_values($this->workers); // 인덱스 재정렬
    }
    
    private function setupLogging() {
        // 로그 디렉토리 생성 - 더 안전한 방식
        $logDir = __DIR__ . '/logs';
        try {
            if (!is_dir($logDir) && !@mkdir($logDir, 0777, true)) {
                $logDir = sys_get_temp_dir();
            }
        } catch (Exception $e) {
            $logDir = sys_get_temp_dir();
        }
        
        // 프로세스 로그 파일
        $this->processLogFile = $logDir . '/process_manager.log';
        
        return $logDir;
    }
    
    // 임시 파일을 위한 안전한 디렉토리 가져오기
    private function getTempDir() {
        $tempDir = __DIR__ . '/tmp';
        try {
            if (!is_dir($tempDir) && !@mkdir($tempDir, 0777, true)) {
                return sys_get_temp_dir();
            }
            return $tempDir;
        } catch (Exception $e) {
            return sys_get_temp_dir();
        }
    }
} 