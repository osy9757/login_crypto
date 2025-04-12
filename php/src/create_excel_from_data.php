<?php
/**
 * create_excel_from_data.php
 * 
 * 클라이언트에서 전송한 수정된 데이터를 받아 엑셀 파일로 변환하여 다운로드 URL 반환
 */

require_once __DIR__ . '/vendor/autoload.php';
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;

// JSON 헤더 지정
header('Content-Type: application/json; charset=utf-8');

// 요청 파라미터(JSON) 받기
$inputJSON = file_get_contents('php://input');
$inputArray = json_decode($inputJSON, true);

if (!isset($inputArray['data']) || !is_array($inputArray['data']) || empty($inputArray['data'])) {
    echo json_encode([
        'success' => false,
        'message' => '유효한 데이터가 없습니다.'
    ]);
    exit;
}

$data = $inputArray['data'];
$startTime = microtime(true);

try {
    // 파일명 생성 (타임스탬프 추가)
    $filename = 'modified_data_' . date('YmdHis') . '.xlsx';
    $excelFilePath = __DIR__ . '/downloads/' . $filename;
    
    // 디렉토리 존재 확인 및 생성
    $dir = __DIR__ . '/downloads';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // Excel 파일 생성
    $writer = WriterEntityFactory::createXLSXWriter();
    $writer->openToFile($excelFilePath);
    
    if (!empty($data)) {
        // 헤더 행
        $headers = array_keys(reset($data));
        $headerRow = WriterEntityFactory::createRowFromArray($headers);
        $writer->addRow($headerRow);
        
        // 데이터 행
        foreach ($data as $row) {
            $rowData = [];
            foreach ($headers as $h) {
                $rowData[] = isset($row[$h]) ? $row[$h] : "";
            }
            $writer->addRow(WriterEntityFactory::createRowFromArray($rowData));
        }
    }
    $writer->close();
    
    // 다운로드 URL
    $downloadUrl = '/downloads/' . $filename;
    
    echo json_encode([
        'success' => true,
        'message' => '엑셀 파일이 생성되었습니다.',
        'downloadUrl' => $downloadUrl,
        'filename' => $filename,
        'elapsedTime' => round(microtime(true) - $startTime, 2)
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => '엑셀 파일 생성 중 오류 발생: ' . $e->getMessage()
    ]);
}
