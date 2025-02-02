<?php
/*******************************************************
 * load_decrypted_data.php
 *  - DataTables serverSide
 *  - POST or GET 파라미터: draw, start, length
 *  - 120개 암호화 열(col1..col120) + 1개 id (평문)
 *  - LIMIT/OFFSET + aes_gcm_multi.so로 부분 복호화
 *  - 응답: { draw, recordsTotal, recordsFiltered, data: [...] }
 *******************************************************/
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

/*******************************************************
 * (A) DataTables 파라미터
 *******************************************************/
$draw   = isset($_POST['draw'])   ? (int)$_POST['draw']   : 1;
$start  = isset($_POST['start'])  ? (int)$_POST['start']  : 0;
$length = isset($_POST['length']) ? (int)$_POST['length'] : 10;

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
} catch (Exception $ex) {
    echo json_encode([
      "draw"=>$draw,
      "recordsTotal"=>0,
      "recordsFiltered"=>0,
      "data"=>[],
      "error"=>"DB connect error: " . $ex->getMessage()
    ]);
    exit;
}

/*******************************************************
 * (C) 전체 행 개수 (recordsTotal)
 *******************************************************/
try {
    $countSql= "SELECT COUNT(*) FROM big_table";
    $rowCount= (int)$pdo->query($countSql)->fetchColumn();
} catch(Exception $ex){
    echo json_encode([
      "draw"=>$draw,
      "recordsTotal"=>0,
      "recordsFiltered"=>0,
      "data"=>[],
      "error"=>"Count error: ".$ex->getMessage()
    ]);
    exit;
}

/*******************************************************
 * (D) SELECT id + col1..col120, 부분 범위
 *******************************************************/
try {
    // id + col1..col120
    // 실제로는 col1..col120 을 전부 나열하거나, SELECT * 로도 가능
    $sql = "SELECT
                *
            FROM big_table
            ORDER BY id ASC
            LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":limit",  $length, PDO::PARAM_INT);
    $stmt->bindValue(":offset", $start,  PDO::PARAM_INT);
    $stmt->execute();

    // rows: [{ "id":..., "col1":..., ..., "col120":... }, ...]
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch(Exception $ex){
    echo json_encode([
      "draw"=>$draw,
      "recordsTotal"=>$rowCount,
      "recordsFiltered"=>$rowCount,
      "data"=>[],
      "error"=>"Select error: ".$ex->getMessage()
    ]);
    exit;
}

$pageRowCount= count($rows);
if($pageRowCount===0){
    // 빈 페이지
    echo json_encode([
      "draw"=>$draw,
      "recordsTotal"=>$rowCount,
      "recordsFiltered"=>$rowCount,
      "data"=>[]
    ]);
    exit;
}

/*******************************************************
 * (E) aes_gcm_multi.so 로딩 & KDF
 *******************************************************/
$password    = "MySecretPass!";
$salt        = "\x01\x02\x03\x04";
$key_len     = 32; // AES-256
$iteration   = 10000;
$THREAD_COUNT= 4;

try {
    $soPath= __DIR__."/aes_gcm_multi.so";
    $ffi = FFI::cdef("
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
        uint8_t* hcrypt_decrypt_table_mt_alloc(
            hcrypt_gcm_kdf* hc,
            const uint8_t* enc_data,
            int enc_data_len,
            int rowCount,
            int colCount,
            int threadCount,
            int* out_len
        );
        void hcrypt_free(uint8_t* data);
    ", $soPath);
    if(!$ffi){
        throw new Exception("FFI load failed");
    }
} catch(Exception $ex){
    echo json_encode([
      "draw"=>$draw,
      "recordsTotal"=>$rowCount,
      "recordsFiltered"=>$rowCount,
      "data"=>[],
      "error"=>"FFI load error: ".$ex->getMessage()
    ]);
    exit;
}

$hc = $ffi->hcrypt_new();
if(!$hc){
    echo json_encode([
      "draw"=>$draw,
      "recordsTotal"=>$rowCount,
      "recordsFiltered"=>$rowCount,
      "data"=>[],
      "error"=>"hcrypt_new fail"
    ]);
    exit;
}

// KDF
$salt_c= FFI::new("uint8_t[".strlen($salt)."]", false);
FFI::memcpy($salt_c,$salt,strlen($salt));
$ffi->hcrypt_deriveKeyFromPassword(
    $hc, $password, $salt_c, strlen($salt), $key_len, $iteration
);

/*******************************************************
 * (F) [4바이트 encSize + encData] × (pageRowCount*120)
 *******************************************************/
// colCount=120 (암호화 열), id는 평문
$colCount = 120;

$encBin='';
foreach($rows as $rowObj){
    for($c=1;$c<=120;$c++){
        $b64Enc= $rowObj["col{$c}"] ?? "";
        $binEnc= base64_decode($b64Enc);
        $encLen= strlen($binEnc);

        $encBin .= pack("V",$encLen).$binEnc;
    }
}
$enc_data    = $encBin;
$enc_data_len= strlen($enc_data);

$enc_data_c= $ffi->new("uint8_t[$enc_data_len]",false);
FFI::memcpy($enc_data_c,$enc_data,$enc_data_len);

/*******************************************************
 * (G) 복호화 (멀티스레드)
 *******************************************************/
$out_len_c= FFI::new("int",false);
$dec_ptr= $ffi->hcrypt_decrypt_table_mt_alloc(
    $hc,
    $enc_data_c,
    $enc_data_len,
    $pageRowCount,
    $colCount,
    $THREAD_COUNT,
    FFI::addr($out_len_c)
);
if(!$dec_ptr){
    $ffi->hcrypt_delete($hc);
    echo json_encode([
      "draw"=>$draw,
      "recordsTotal"=>$rowCount,
      "recordsFiltered"=>$rowCount,
      "data"=>[],
      "error"=>"hcrypt_decrypt_table_mt_alloc fail"
    ]);
    exit;
}
$decSize= $out_len_c->cdata;
$decBin= FFI::string($dec_ptr,$decSize);
$ffi->hcrypt_free($dec_ptr);

/*******************************************************
 * (H) 복호화 결과 파싱
 *******************************************************/
$decryptedRows=[];
$ofs=0;
$cellIndex=0;

foreach($rows as $rIndex => $rowObj){
    // id(평문)는 그대로
    $decRow= ["id"=>$rowObj["id"]];
    for($c=1;$c<=120;$c++){
        if($ofs+4>$decSize){
            $decRow["col{$c}"]="";
            $cellIndex++;
            continue;
        }
        $plainLenData= substr($decBin,$ofs,4);
        $plainLen= unpack("V",$plainLenData)[1];
        $ofs+=4;

        if($ofs+$plainLen>$decSize){
            $decRow["col{$c}"]="";
            $cellIndex++;
            continue;
        }
        $plainData= substr($decBin,$ofs,$plainLen);
        $ofs+=$plainLen;

        $decRow["col{$c}"]= $plainData;
        $cellIndex++;
    }
    $decryptedRows[]= $decRow;
}

$ffi->hcrypt_delete($hc);

/*******************************************************
 * (I) DataTables 표준 JSON 응답
 *******************************************************/
echo json_encode([
  "draw"            => $draw,
  "recordsTotal"    => $rowCount,
  "recordsFiltered" => $rowCount,
  "data"            => $decryptedRows
]);
exit;
