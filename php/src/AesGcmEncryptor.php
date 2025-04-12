<?php
/**
 * AesGcmEncryptor.php - AES-GCM 암호화/복호화를 위한 헬퍼 클래스
 * 복호화 기능 추가 - Base64 디코딩 추가
 */

class AesGcmEncryptor {
    private $ffi;
    private $hc;
    private $password;
    private $salt;
    private $key_len;
    private $iteration;
    private $useBase64;
    private $threadCount;
    
    /**
     * 암호화 설정으로 인스턴스 초기화
     */
    public function __construct($password = "MySecretPass!", $salt = "\x01\x02\x03\x04", $key_len = 32, 
                              $iteration = 10000, $useBase64 = true, $threadCount = 4) {
        $this->password = $password;
        $this->salt = $salt;
        $this->key_len = $key_len;
        $this->iteration = $iteration;
        $this->useBase64 = $useBase64;
        $this->threadCount = $threadCount;
        
        $this->initFFI();
    }
    
    /**
     * FFI 초기화 및 암호화 컨텍스트 생성
     */
    private function initFFI() {
        // FFI 로딩
        $soPath = __DIR__ . '/aes_gcm_multi.so';
        if (!file_exists($soPath) || !is_readable($soPath)) {
            throw new Exception("암호화 라이브러리 파일 문제: $soPath");
        }
        
        try {
            $ffiCdef = "
                typedef struct hcrypt_gcm_kdf hcrypt_gcm_kdf;
                hcrypt_gcm_kdf* hcrypt_new();
                void hcrypt_delete(hcrypt_gcm_kdf* hc);
                void hcrypt_deriveKeyFromPassword(
                    hcrypt_gcm_kdf* hc,
                    const char* password,
                    const uint8_t* salt,
                    int salt_len,
                    int key_len,
                    int iteration
                );
                uint8_t* hcrypt_encrypt_table_mt_alloc(
                    hcrypt_gcm_kdf* hc,
                    const uint8_t** table,
                    const int* cell_sizes,
                    int rowCount,
                    int colCount,
                    int threadCount,
                    int* out_len
                );
                void hcrypt_free(uint8_t* data);
                uint8_t* hcrypt_decrypt_table_mt_alloc(
                    hcrypt_gcm_kdf* hc,
                    const uint8_t* enc_data,
                    int enc_data_len,
                    int rowCount,
                    int colCount,
                    int threadCount,
                    int* out_len
                );
            ";
            $this->ffi = FFI::cdef($ffiCdef, $soPath);
        } catch (\FFI\ParserException $ex) {
            throw new Exception("암호화 라이브러리 파서 오류: " . $ex->getMessage());
        } catch (\FFI\Exception $ex) {
            throw new Exception("암호화 라이브러리 로딩 실패: " . $ex->getMessage());
        }
        
        // 암호화 컨텍스트 생성 및 KDF 호출
        $this->hc = $this->ffi->hcrypt_new();
        if (FFI::isNull($this->hc)) {
            throw new Exception("암호화 컨텍스트 생성 실패");
        }
        
        $salt_c = $this->ffi->new("uint8_t[" . strlen($this->salt) . "]", false);
        FFI::memcpy($salt_c, $this->salt, strlen($this->salt));
        $this->ffi->hcrypt_deriveKeyFromPassword(
            $this->hc, $this->password, $salt_c, strlen($this->salt), $this->key_len, $this->iteration
        );
    }
    
    /**
     * 2D 데이터 배열 암호화
     */
    public function encryptData($dataArray, $useColumns) {
        $rowCount = count($dataArray);
        if ($rowCount == 0) {
            return [];
        }
        
        // 2D 배열 -> C 포인터 변환
        $totalCells = $rowCount * $useColumns;
        try {
            $table_c = $this->ffi->new("const uint8_t*[$totalCells]");
            $size_c = $this->ffi->new("int[$totalCells]");
        } catch (\FFI\Exception $ex) {
            throw new Exception("메모리 할당 실패: " . $ex->getMessage());
        }
        
        $cellIndex = 0;
        foreach ($dataArray as $rowData) {
            for ($c = 0; $c < $useColumns; $c++) {
                $plainVal = isset($rowData[$c]) ? (string)$rowData[$c] : '';
                $valLen = strlen($plainVal);
                $size_c[$cellIndex] = $valLen;
                if ($valLen > 0) {
                    try {
                        $plain_c = $this->ffi->new("uint8_t[$valLen]", false);
                        FFI::memcpy($plain_c, $plainVal, $valLen);
                        $table_c[$cellIndex] = $plain_c;
                    } catch (\FFI\Exception $ex) {
                        throw new Exception("셀 메모리 할당 실패: " . $ex->getMessage());
                    }
                } else {
                    $table_c[$cellIndex] = null;
                }
                $cellIndex++;
            }
        }
        
        // 암호화 실행
        $out_len_c = $this->ffi->new("int", false);
        try {
            $enc_ptr = $this->ffi->hcrypt_encrypt_table_mt_alloc(
                $this->hc, $table_c, $size_c, $rowCount, $useColumns, 
                $this->threadCount, FFI::addr($out_len_c)
            );
            
            if (FFI::isNull($enc_ptr)) {
                throw new Exception("암호화 실패");
            }
            
            $encSize = $out_len_c->cdata;
            $encBin = FFI::string($enc_ptr, $encSize);
            $this->ffi->hcrypt_free($enc_ptr);
            
            // 암호문 분할 및 재구성
            $offset = 0;
            $encryptedRows = [];
            
            for ($r = 0; $r < $rowCount; $r++) {
                $encRow = [];
                for ($c = 0; $c < $useColumns; $c++) {
                    if ($offset + 4 > $encSize) {
                        $encRow[] = '';
                        continue;
                    }
                    $encCellLenData = substr($encBin, $offset, 4);
                    $encCellLen = unpack("l", $encCellLenData)[1];
                    $offset += 4;
                    
                    if ($offset + $encCellLen > $encSize) {
                        $encRow[] = '';
                        continue;
                    }
                    
                    $cipherData = substr($encBin, $offset, $encCellLen);
                    $offset += $encCellLen;
                    $encRow[] = ($this->useBase64 && $encCellLen > 0) ? base64_encode($cipherData) : $cipherData;
                }
                $encryptedRows[] = $encRow;
            }
            
            return $encryptedRows;
        } catch (\FFI\Exception $ex) {
            if (isset($enc_ptr) && !FFI::isNull($enc_ptr)) {
                $this->ffi->hcrypt_free($enc_ptr);
            }
            throw new Exception("암호화 처리 중 오류: " . $ex->getMessage());
        }
    }
    
    /**
     * 암호화된 데이터 복호화
     */
    public function decryptData($encryptedData) {
        if (empty($encryptedData)) {
            return [];
        }
        
        try {
            // 데이터 구조 준비
            $rowCount = count($encryptedData);
            $headerKeys = array_keys($encryptedData[0]);
            $colCount = count($headerKeys);
            
            worker_log("복호화 시작: 행=$rowCount, 열=$colCount");
            
            // 암호화된 데이터를 한 덩어리로 수집
            $encDataBin = '';
            $cellCounter = 0;
            
            // 모든 행과 열을 순회하며 데이터 수집
            foreach ($encryptedData as $row) {
                foreach ($headerKeys as $key) {
                    $cellData = isset($row[$key]) ? $row[$key] : '';
                    
                    // Base64 복호화 
                    $bin = @base64_decode($cellData, true);
                    if ($bin === false) {
                        worker_log("경고: 유효하지 않은 Base64 인코딩 데이터 발견, 빈 값으로 대체");
                        $bin = '';
                    }                    
                    // 데이터 추가
                    $encDataBin .= $bin;
                    $cellCounter++;
                }
            }
            
            // 데이터가 없으면 원본 반환
            if (empty($encDataBin)) {
                return $encryptedData;
            }
            
            worker_log("총 셀 데이터: $cellCounter, 크기: " . strlen($encDataBin) . "바이트");
            
            // 암호화된 데이터를 C 배열로 변환
            $enc_data = $this->ffi->new("uint8_t[" . strlen($encDataBin) . "]");
            FFI::memcpy($enc_data, $encDataBin, strlen($encDataBin));
            
            // 출력 길이 변수
            $out_len = $this->ffi->new("int");
            
            // 복호화 함수 호출
            worker_log("hcrypt_decrypt_table_mt_alloc 호출: 스레드=$this->threadCount");
            $out_ptr = $this->ffi->hcrypt_decrypt_table_mt_alloc(
                $this->hc,
                $enc_data,
                strlen($encDataBin),
                $rowCount,
                $colCount,
                $this->threadCount,
                FFI::addr($out_len)
            );
            
            if (FFI::isNull($out_ptr)) {
                throw new Exception("테이블 복호화 실패: NULL 결과");
            }
            
            // 결과 복사
            $out_size = $out_len->cdata;
            worker_log("복호화 완료: 결과 크기=$out_size 바이트");
            $decrypted_bin = FFI::string($out_ptr, $out_size);
            
            // 메모리 해제
            $this->ffi->hcrypt_free($out_ptr);
            
            // 결과 파싱: [길이 4바이트][데이터] 형식
            $decryptedData = [];
            $offset = 0;
            
            for ($i = 0; $i < $rowCount; $i++) {
                $decRow = [];
                for ($j = 0; $j < $colCount; $j++) {
                    // 길이 정보가 없으면 빈 값
                    if ($offset + 4 > $out_size) {
                        $decRow[$headerKeys[$j]] = '';
                        continue;
                    }
                    
                    // 길이 읽기 (4바이트 정수)
                    $plainLen = unpack('V', substr($decrypted_bin, $offset, 4))[1];
                    $offset += 4;
                    
                    // 실제 데이터 읽기
                    if ($plainLen > 0 && $offset + $plainLen <= $out_size) {
                        $cellData = substr($decrypted_bin, $offset, $plainLen);
                        $offset += $plainLen;
                        $decRow[$headerKeys[$j]] = $cellData;
                    } else {
                        $decRow[$headerKeys[$j]] = '';
                        if ($plainLen > 0) {
                            // 사이즈가 있지만 범위를 벗어나면 안전하게 건너뛰기
                            $offset += min($plainLen, $out_size - $offset);
                        }
                    }
                }
                $decryptedData[] = $decRow;
            }
            
            worker_log("데이터 파싱 완료: " . count($decryptedData) . "행");
            return $decryptedData;
            
        } catch (\FFI\Exception $ex) {
            throw new Exception("복호화 처리 중 오류: " . $ex->getMessage());
        }
    }
    
    /**
     * 인스턴스 소멸 시 자원 해제
     */
    public function __destruct() {
        if (isset($this->hc) && !FFI::isNull($this->hc)) {
            $this->ffi->hcrypt_delete($this->hc);
        }
    }
    
}
    