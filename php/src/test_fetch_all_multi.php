<?php
/**
 * test_fetch_all_multi.php
 *
 * 1. 저장 프로시저 sp_merge_excel_data_all()를 호출하여 전체 데이터를 가져옴.
 * 2. 데이터를 2000행 단위로 청크로 분할.
 * 3. (이전: 직접 임시파일 생성) -> 삭제
 * 4. 최대 동시 4개의 자식 프로세스(chunk_worker2.php)를 ProcessManager2를 사용하여 실행
 *    -> 자식은 각 청크 데이터를 처리하여 결과 JSON 파일을 생성, 그 경로를 JSON 응답.
 * 5. 부모는 자식 응답에서 결과 파일명을 확인하고, 그 JSON 파일을 직접 읽어 최종 결과($finalData)에 합침.
 * 6. 최종 데이터를 JSON / Excel 파일로 저장.
 */

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/process_manager2.php'; // 바뀐 파일명
require_once __DIR__ . '/vendor/autoload.php';   // Spout autoloader

use Box\Spout\Writer\Common\Creator\WriterEntityFactory;

$startTime = microtime(true);
$message   = "";
$success   = false;
$finalData = [];
$childProcessLogs = [];

// 시작 시 tmp 디렉토리 비우기
$tmpDir = __DIR__ . '/tmp';
if (is_dir($tmpDir)) {
    $files = glob($tmpDir . '/*');
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
} else {
    mkdir($tmpDir, 0777, true);
}

try {
    // 1. 전체 데이터 호출 (저장 프로시저)
    $pdo = getDBConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("CALL sp_merge_excel_data_all()");
    $stmt->execute();

    $allData = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $allData[] = $row;
    }
    $rowCount      = count($allData);
    $dbElapsedTime = microtime(true) - $startTime;

    // 2. 2000행 단위로 청크 분할
    $chunkSize   = 2000;
    $dataChunks  = array_chunk($allData, $chunkSize);
    $totalTasks  = count($dataChunks);

    // [기존] 3. 각 청크를 임시 파일로 저장 -> **삭제** (ProcessManager2에서 대신 함)

    // 4. 자식 프로세스 실행 (ProcessManager2)
    $manager = new ProcessManager2();
    // 첫 번째 인자로 $dataChunks(배열)을 넘기면, manager 내부에서 각 청크를 임시파일로 씁니다.
    $results = $manager->processInParallel($dataChunks, __DIR__ . '/chunk_worker2.php', 4, '');

    // 5. 자식 프로세스 응답 처리
    foreach ($results['results'] as $procResult) {
        // JSON 안에 resultFile이 있으면, 그 파일을 읽어 최종배열에 합친다
        if (isset($procResult['result']['resultFile'])) {
            $resultFile = $procResult['result']['resultFile'];
            $childProcessLogs[] = "Received result file: '$resultFile'.";
            if (file_exists($resultFile)) {
                $chunkResultJson = file_get_contents($resultFile);
                $chunkResult     = json_decode($chunkResultJson, true);
                $rowsInChunk     = is_array($chunkResult) ? count($chunkResult) : 0;

                $childProcessLogs[] = "Result file '$resultFile' contains $rowsInChunk rows.";

                if (is_array($chunkResult)) {
                    $finalData = array_merge($finalData, $chunkResult);
                }
                // 사용 끝난 뒤 파일 삭제
                unlink($resultFile);
            } else {
                $childProcessLogs[] = "Result file '$resultFile' not found.";
            }
        }
    }
    $childProcessLogs[] = "Final merged data contains " . count($finalData) . " rows.";

    usort($finalData, function($a, $b) {
        // 정렬 기준 칼럼명을 예: 'id' 로 가정
        return $a['row_identifier'] <=> $b['row_identifier'];
    });

    // 5-1. 최종 데이터를 JSON 파일로 저장
    $mergedJsonFile = $tmpDir . '/merged_result_' . date('YmdHis') . '_' . uniqid() . ".json";
    file_put_contents($mergedJsonFile, json_encode($finalData));
    $childProcessLogs[] = "Merged JSON file created at '$mergedJsonFile' with " . count($finalData) . " rows.";

    // 6. Spout로 Excel 파일 생성
    $excelFilePath = __DIR__ . '/final_result.xlsx';
    $writer = WriterEntityFactory::createXLSXWriter();
    $writer->openToFile($excelFilePath);

    if (!empty($finalData)) {
        // 헤더 행
        $headers = array_keys(reset($finalData));
        $headerRow = WriterEntityFactory::createRowFromArray($headers);
        $writer->addRow($headerRow);

        // 데이터 행들
        foreach ($finalData as $row) {
            $rowData = [];
            foreach ($headers as $key) {
                $rowData[] = isset($row[$key]) ? $row[$key] : "";
            }
            $writer->addRow(WriterEntityFactory::createRowFromArray($rowData));
        }
        $childProcessLogs[] = "Excel file generated with " . count($finalData) . " rows.";
    }
    $writer->close();

    $totalElapsedTime = microtime(true) - $startTime;
    $message = "Success: {$rowCount} rows (in {$totalTasks} chunks) processed, DB time: "
             . round($dbElapsedTime, 2) . " sec, total time: " . round($totalElapsedTime, 2) 
             . " sec. Excel file created at: final_result.xlsx";
    $success = true;

} catch (Exception $e) {
    $totalElapsedTime = microtime(true) - $startTime;
    $message = "Failure: " . $e->getMessage() 
             . " (total time: " . round($totalElapsedTime, 2) . " sec)";
    $success = false;
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Chunk Split, Merge & Excel Export Test</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link 
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" 
        rel="stylesheet"
    >
    <style>
        pre {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            max-height: 400px;
            overflow-y: auto;
        }
        .download-link {
            margin-top: 20px;
        }
        .log-box {
            margin-top: 20px;
            background-color: #eee;
            padding: 10px;
            border-radius: 5px;
            max-height: 300px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
<div class="container mt-5">
    <h1 class="mb-4">Chunk Split, Merge & Excel Export Test</h1>
    <div class="alert <?php echo $success ? 'alert-success' : 'alert-danger'; ?>">
        <?php echo htmlspecialchars($message, ENT_QUOTES, 'UTF-8'); ?>
    </div>

    <h4>Final Data (Total rows: <?php echo count($finalData); ?>)</h4>
    <pre><?php echo htmlspecialchars(
        json_encode($finalData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        ENT_QUOTES,
        'UTF-8'
    ); ?></pre>

    <div class="download-link">
        <a href="final_result.xlsx" download class="btn btn-primary">엑셀 파일 다운로드</a>
    </div>

    <div class="log-box">
        <h5>Child Process Logs</h5>
        <pre id="childLogs"><?php echo htmlspecialchars(
            json_encode($childProcessLogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            ENT_QUOTES,
            'UTF-8'
        ); ?></pre>
    </div>

    <div class="log-box">
        <h5>Child Process Responses</h5>
        <pre id="childResponses"><?php echo htmlspecialchars(
            json_encode($results['results'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            ENT_QUOTES,
            'UTF-8'
        ); ?></pre>
    </div>
</div>
<script>
    console.log(
        "Child Process Logs:", 
        <?php echo json_encode($childProcessLogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE); ?>
    );
    console.log(
        "Child Process Responses:",
        <?php echo json_encode($results['results'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE); ?>
    );
</script>
</body>
</html>
