<?php
/*******************************************************
 * load_encrypted_data.php
 *  - DataTables(serverSide)
 *  - GET 파라미터: draw, start, length
 *  - big_table 구조: id + col1..col120
 *  - "SELECT id, col1..col120" + LIMIT/OFFSET
 *  - 응답: { draw, recordsTotal, recordsFiltered, data }
 *******************************************************/
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

/*******************************************************
 * (1) DataTables 표준 파라미터
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
} catch(Exception $e) {
    echo json_encode([
      "draw"            => $draw,
      "recordsTotal"    => 0,
      "recordsFiltered" => 0,
      "data"            => [],
      "error"           => "DB connect error: ".$e->getMessage()
    ]);
    exit;
}

/*******************************************************
 * (3) 전체 행 개수 (recordsTotal)
 *******************************************************/
try {
    $countSql = "SELECT COUNT(*) FROM big_table";
    $rowCount = (int)$pdo->query($countSql)->fetchColumn();
} catch(Exception $ex){
    echo json_encode([
      "draw"            => $draw,
      "recordsTotal"    => 0,
      "recordsFiltered" => 0,
      "data"            => [],
      "error"           => "Count error: ".$ex->getMessage()
    ]);
    exit;
}

/*******************************************************
 * (4) 부분 SELECT (id + col1..col120)
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
      "draw"            => $draw,
      "recordsTotal"    => $rowCount,
      "recordsFiltered" => $rowCount,
      "data"            => [],
      "error"           => "Select error: ".$ex->getMessage()
    ]);
    exit;
}

/*******************************************************
 * (5) DataTables 표준 JSON
 *******************************************************/
echo json_encode([
    "draw"            => $draw,
    "recordsTotal"    => $rowCount,
    "recordsFiltered" => $rowCount, // 간단히 동일
    "data"            => $rows
]);
exit;
