<?php
/**
 * decrypt_and_download.php 
 *
 *  - "runExcelDownloadTest()"에서 POST 호출 시
 *  - 전체 프로시저 데이터를 가져와 병렬 복호화 후, Excel 파일 생성
 *  - JSON으로 결과를 응답
 */

require_once __DIR__ . '/db_config.php';
require_once __DIR__ . '/process_manager2.php';
require_once __DIR__ . '/vendor/autoload.php';

use Box\Spout\Writer\Common\Creator\WriterEntityFactory;

// JSON 헤더 지정
header('Content-Type: application/json; charset=utf-8');

// 요청 파라미터(JSON) 받기 (필요시 사용)
$inputJSON  = file_get_contents('php://input');
$inputArray = json_decode($inputJSON, true);
// 여기서는 $inputArray['someKey'] 등으로 옵션을 받을 수 있음

// 전체 데이터 요청 여부 확인
$fetchFullData = isset($inputArray['fetchFullData']) && $inputArray['fetchFullData'] === true;
$limit = isset($inputArray['limit']) && is_numeric($inputArray['limit']) ? (int)$inputArray['limit'] : 10;

$startTime = microtime(true);
$finalData = [];
$success   = false;
$message   = '';
$rowCount  = 0;
$downloadUrl = '';
try {
    // ---------------------------------------------------
    // 1) DB에서 전체 데이터 조회 (저장 프로시저)
    // ---------------------------------------------------
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

    // ---------------------------------------------------
    // 2) 2000행 단위로 청크 분할
    // ---------------------------------------------------
    $chunkSize  = 2000;
    $dataChunks = array_chunk($allData, $chunkSize);
    $totalTasks = count($dataChunks);

    // ---------------------------------------------------
    // 3) 병렬 처리 (ProcessManager2 이용)
    // ---------------------------------------------------
    $manager = new ProcessManager2();
    $results = $manager->processInParallel($dataChunks, __DIR__ . '/chunk_worker2.php', 4, '');

    // ---------------------------------------------------
    // 4) 자식 프로세스 결과 병합
    // ---------------------------------------------------
    foreach ($results['results'] as $procResult) {
        // resultFile이 있으면 그 JSON을 읽어서 최종 $finalData에 합침
        if (isset($procResult['result']['resultFile'])) {
            $resultFile = $procResult['result']['resultFile'];
            if (file_exists($resultFile)) {
                $chunkJson = file_get_contents($resultFile);
                $chunkArr  = json_decode($chunkJson, true);
                if (is_array($chunkArr)) {
                    $finalData = array_merge($finalData, $chunkArr);
                }
                // 사용 끝난 뒤 파일 삭제
                unlink($resultFile);
            }
        }
    }
    // 필요 시 정렬 (row_identifier 기준)
    usort($finalData, function($a, $b) {
        return $a['row_identifier'] <=> $b['row_identifier'];
    });

    // ---------------------------------------------------
    // 5) Excel 파일 생성 (Spout)
    // ---------------------------------------------------
    $excelFilePath = __DIR__ . '/final_result.xlsx';
    $writer = WriterEntityFactory::createXLSXWriter();
    $writer->openToFile($excelFilePath);

    if (!empty($finalData)) {
        // 헤더 행
        $headers = array_keys(reset($finalData));
        $headerRow = WriterEntityFactory::createRowFromArray($headers);
        $writer->addRow($headerRow);

        // 데이터 행
        foreach ($finalData as $row) {
            $rowData = [];
            foreach ($headers as $h) {
                $rowData[] = isset($row[$h]) ? $row[$h] : "";
            }
            $writer->addRow(WriterEntityFactory::createRowFromArray($rowData));
        }
    }
    $writer->close();

    // ---------------------------------------------------
    // 6) 성공 응답 정보 구성
    // ---------------------------------------------------
    $totalElapsedTime = microtime(true) - $startTime;
    $success = true;
    $message = sprintf(
        "총 %d행 처리 (청크 %d개), DB: %.2f초, 전체: %.2f초",
        $rowCount,
        $totalTasks,
        $dbElapsedTime,
        $totalElapsedTime
    );

    // 다운받을 경로 (프론트엔드에서 /final_result.xlsx 접근 가능하도록 설정)
    // 예: Apache/Nginx 설정에 따라 접근 경로를 맞춰야 함
    $downloadUrl = 'final_result.xlsx';

} catch (Exception $e) {
    $totalElapsedTime = microtime(true) - $startTime;
    $success = false;
    $message = "오류 발생: " . $e->getMessage() 
             . " (total time: " . round($totalElapsedTime, 2) . " sec)";
}

// ---------------------------------------------------
// 최종 JSON 응답 (runExcelDownloadTest()에서 기대하는 구조)
// ---------------------------------------------------
echo json_encode([
    'success'     => $success,
    'message'     => $message,
    'rowCount'    => $rowCount,
    // 전체 처리 소요 시간
    'elapsedTime' => isset($totalElapsedTime) 
                     ? round($totalElapsedTime, 2) 
                     : round(microtime(true) - $startTime, 2),
    // 엑셀 다운로드 URL (프론트에서 이 경로를 <a href=...>로 사용)
    'downloadUrl' => $downloadUrl,
    // 전체 데이터 또는 제한된 데이터를 resultData로 반환
    'resultData'  => $fetchFullData ? array_slice($finalData, 0, $limit) : array_slice($finalData, 0, 10),
    // 샘플 데이터는 호환성을 위해 유지 (기존 코드)
    'sampleData'  => array_slice($finalData, 0, 10)
], JSON_UNESCAPED_UNICODE);

exit; // 스크립트 종료
