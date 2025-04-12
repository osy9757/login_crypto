<?php
/**
 * test_distributed_save.php - 멀티프로세스 분산 저장 테스트 페이지
 */

// DB 설정 파일 포함
require_once __DIR__ . '/db_config.php';

// 테이블 상태 확인 함수
function check_table_status() {
    $pdo = getDBConnection();
    $results = [];
    
    // excel_part1부터 excel_part30까지 테이블 상태 확인
    for ($i = 1; $i <= 30; $i++) {
        $tableName = "excel_part" . $i;
        
        // 테이블의 레코드 수 확인
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM $tableName");
        $rowCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // NULL 값 있는지 확인
        $colNames = [];
        if ($i == 1) $colNames = ['col1', 'col2'];
        else if ($i == 2) $colNames = ['col3', 'col4'];
        else {
            $start = ($i - 1) * 2 + 1;
            $colNames = ["col$start", "col" . ($start + 1)];
        }
        
        $nullCheckQuery = "SELECT COUNT(*) as null_count FROM $tableName WHERE " . 
                        $colNames[0] . " IS NULL OR " . $colNames[1] . " IS NULL";
        $stmt = $pdo->query($nullCheckQuery);
        $nullCount = $stmt->fetch(PDO::FETCH_ASSOC)['null_count'];
        
        // 마지막 ID 값 확인 (master_id로 변경됨)
        $stmt = $pdo->query("SELECT MAX(master_id) as max_id FROM $tableName");
        $maxId = $stmt->fetch(PDO::FETCH_ASSOC)['max_id'];
        
        $results[$tableName] = [
            'count' => $rowCount,
            'max_id' => $maxId,
            'null_count' => $nullCount,
            'has_null' => $nullCount > 0
        ];
    }
    
    // excel_master 테이블도 확인
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM excel_master");
    $masterCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $pdo->query("SELECT MAX(id) as max_id FROM excel_master");
    $masterMaxId = $stmt->fetch(PDO::FETCH_ASSOC)['max_id'];
    
    $results['excel_master'] = [
        'count' => $masterCount,
        'max_id' => $masterMaxId,
        'null_count' => 0,
        'has_null' => false
    ];
    
    return $results;
}

// AJAX 요청 처리
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    if ($_GET['action'] === 'check_tables') {
        // 테이블 상태 확인
        $tableStatus = check_table_status();
        echo json_encode([
            'success' => true,
            'data' => $tableStatus
        ]);
        exit;
    }
    
    if ($_GET['action'] === 'initialize_tables') {
        try {
            $pdo = getDBConnection();
            
            // 트랜잭션 시작
            $pdo->beginTransaction();
            
            // 분산 테이블 초기화 (외래 키 제약조건 때문에 마스터 테이블 이전에 삭제)
            for ($i = 1; $i <= 30; $i++) {
                $tableName = "excel_part" . $i;
                $pdo->exec("DELETE FROM $tableName");
            }
            
            // 마스터 테이블 초기화
            $pdo->exec("DELETE FROM excel_master");
            
            // AUTO_INCREMENT 재설정 (필요한 경우)
            $pdo->exec("ALTER TABLE excel_master AUTO_INCREMENT = 1");
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => '모든 테이블이 초기화되었습니다.'
            ]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => '테이블 초기화 중 오류 발생: ' . $e->getMessage()
            ]);
        }
        exit;
    }
    
    exit;
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>멀티프로세스 분산 저장 테스트</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <style>
        body {
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            background-color: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .table-status {
            margin-top: 30px;
        }
        .status-card {
            margin-bottom: 20px;
        }
        .loader {
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 2s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .result-section {
            display: none;
        }
        .table-container {
            max-height: 400px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="mb-4">멀티프로세스 분산 저장 테스트</h1>
        
        <!-- 파일 선택 및 파싱 섹션 -->
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                1. 엑셀 파일 선택 및 파싱
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label for="excelFile" class="form-label">엑셀 파일 선택 (파싱 자동 실행)</label>
                    <input class="form-control" type="file" id="excelFile" accept=".xlsx, .xls">
                </div>
                <div class="file-info mb-3" id="fileInfo">
                    선택된 파일 없음
                </div>
                <div id="parsingLoader" class="loader" style="display: none;"></div>
                <div id="parsedDataSection" class="mt-3" style="display: none;">
                    <h5>파싱 결과</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <p>행 수: <span id="rowCount">0</span></p>
                        </div>
                        <div class="col-md-6">
                            <p>열 수: <span id="colCount">0</span></p>
                        </div>
                    </div>
                    <div class="table-container">
                        <table id="parsedDataTable" class="table table-striped table-bordered">
                            <thead>
                                <tr id="headerRow"></tr>
                            </thead>
                            <tbody id="dataRows"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 저장 섹션 -->
        <div class="card mb-4">
            <div class="card-header bg-success text-white">
                2. 데이터 분산 저장
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-5">
                        <label for="processCount" class="form-label">프로세스 수</label>
                        <select id="processCount" class="form-select">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="4" selected>4</option>
                            <option value="8">8</option>
                        </select>
                    </div>
                    <div class="col-md-4 d-flex align-items-center">
                        <div class="form-check ms-3">
                            <input class="form-check-input" type="checkbox" id="encryptOption" checked>
                            <label class="form-check-label" for="encryptOption">
                                암호화 사용
                            </label>
                        </div>
                    </div>
                    <div class="col-md-3 d-flex align-items-center">
                        <button id="initTablesBtn" class="btn btn-warning btn-sm">테이블 초기화</button>
                    </div>
                </div>
                <button id="saveBtn" class="btn btn-success" disabled>저장 실행</button>
                <div id="saveLoader" class="loader mt-3" style="display: none;"></div>
                <div id="saveResult" class="alert alert-info mt-3" style="display: none;"></div>
            </div>
        </div>
        
        <!-- 테이블 상태 확인 섹션 -->
        <div class="card mb-4 result-section" id="tableStatusSection">
            <div class="card-header bg-info text-white">
                3. 테이블 상태 확인
            </div>
            <div class="card-body">
                <button id="checkTablesBtn" class="btn btn-info mb-3">테이블 상태 확인</button>
                <div id="tableStatusLoader" class="loader" style="display: none;"></div>
                <div class="row" id="tableStatusResults">
                    <!-- 결과가 여기에 동적으로 표시됩니다 -->
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // 전역 변수
        let parsedData = null;
        
        $(document).ready(function() {
            // 파일 선택 이벤트
            $('#excelFile').change(handleFileSelect);
            
            // 저장 버튼 이벤트
            $('#saveBtn').click(saveData);
            
            // 테이블 확인 버튼 이벤트
            $('#checkTablesBtn').click(checkTableStatus);
            
            // 테이블 초기화 버튼 이벤트
            $('#initTablesBtn').click(initializeTables);
        });
        
        // 파일 선택 처리
        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // 파일 정보 표시
            $('#fileInfo').text(`파일명: ${file.name} (${formatFileSize(file.size)})`);
            
            // 로딩 표시
            $('#parsingLoader').show();
            $('#parsedDataSection').hide();
            
            // 파일 읽기
            const reader = new FileReader();
            reader.onload = function(e) {
                parseExcel(e.target.result);
            };
            reader.readAsArrayBuffer(file);
        }
        
        // 파일 크기 포맷
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // 엑셀 파싱
        function parseExcel(data) {
            try {
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // 데이터 변환 (헤더 포함)
                parsedData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // 통계 업데이트
                const rowCount = parsedData.length - 1; // 헤더 제외
                const colCount = parsedData[0].length;
                
                $('#rowCount').text(rowCount);
                $('#colCount').text(colCount);
                
                // 테이블 초기화
                $('#headerRow').empty();
                $('#dataRows').empty();
                
                // 헤더 행 추가
                const headers = parsedData[0];
                headers.forEach((header, index) => {
                    $('#headerRow').append(`<th>${header || 'Column ' + (index + 1)}</th>`);
                });
                
                // 데이터 행 추가 (최대 10행만)
                const maxRows = Math.min(10, parsedData.length - 1);
                for (let i = 1; i <= maxRows; i++) {
                    const row = parsedData[i];
                    let rowHtml = '<tr>';
                    
                    for (let j = 0; j < headers.length; j++) {
                        const cellValue = row[j] !== undefined ? row[j] : '';
                        rowHtml += `<td>${cellValue}</td>`;
                    }
                    
                    rowHtml += '</tr>';
                    $('#dataRows').append(rowHtml);
                }
                
                // 결과 표시 및 버튼 활성화
                $('#parsedDataSection').show();
                $('#saveBtn').prop('disabled', false);
                
            } catch (error) {
                console.error('엑셀 파싱 오류:', error);
                alert('엑셀 파일 파싱 중 오류가 발생했습니다: ' + error.message);
            } finally {
                $('#parsingLoader').hide();
            }
        }
        
        // 데이터 저장
        function saveData() {
            if (!parsedData || parsedData.length < 2) {
                alert('파싱된 데이터가 없습니다.');
                return;
            }
            
            // 옵션 설정
            const processCount = $('#processCount').val();
            const encrypt = $('#encryptOption').is(':checked');
            
            // 데이터 준비
            const headers = parsedData[0];
            const rows = parsedData.slice(1);
            
            // 객체 배열로 변환
            const objectData = rows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    const colName = header || 'col' + (index + 1);
                    obj[colName] = row[index] !== undefined ? row[index] : '';
                });
                return obj;
            });
            
            // API 요청 데이터
            const requestData = {
                data: objectData,
                processCount: parseInt(processCount),
                encrypt: encrypt
            };
            
            // 로딩 표시
            $('#saveBtn').prop('disabled', true);
            $('#saveLoader').show();
            $('#saveResult').hide();
            
            // API 호출
            $.ajax({
                url: '/multiprocess_distributed_save.php',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(requestData),
                dataType: 'json',
                timeout: 300000 // 5분 타임아웃
            })
            .done(function(response) {
                console.log('저장 응답:', response);
                
                // 성공/실패 메시지 표시
                if (response.success) {
                    $('#saveResult').removeClass('alert-danger').addClass('alert-success');
                    $('#saveResult').html(`
                        <h5>저장 성공!</h5>
                        <p>저장된 행: ${response.rowsAffected}</p>
                        <p>테이블 수: ${response.tableCount}</p>
                        <p>프로세스 수: ${response.processCount}</p>
                        <p>소요 시간: ${response.elapsedSec}초</p>
                        <p>암호화: ${response.encrypted ? '사용 (' + response.encryptMethod + ')' : '미사용'}</p>
                    `);
                    
                    // 테이블 상태 확인 섹션 표시
                    $('#tableStatusSection').show();
                } else {
                    $('#saveResult').removeClass('alert-success').addClass('alert-danger');
                    $('#saveResult').html(`
                        <h5>저장 실패</h5>
                        <p>${response.message}</p>
                    `);
                }
                
                $('#saveResult').show();
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('API 요청 실패:', textStatus, errorThrown);
                console.error('응답 상태:', jqXHR.status, jqXHR.statusText);
                console.error('응답 텍스트:', jqXHR.responseText);
                
                $('#saveResult').removeClass('alert-success').addClass('alert-danger');
                $('#saveResult').html(`
                    <h5>저장 요청 실패</h5>
                    <p>오류: ${textStatus}</p>
                    <p>상태: ${jqXHR.status} ${jqXHR.statusText}</p>
                    <details>
                        <summary>자세한 오류</summary>
                        <pre>${jqXHR.responseText}</pre>
                    </details>
                `);
                $('#saveResult').show();
            })
            .always(function() {
                $('#saveBtn').prop('disabled', false);
                $('#saveLoader').hide();
            });
        }
        
        // 테이블 상태 확인
        function checkTableStatus() {
            // 로딩 표시
            $('#tableStatusLoader').show();
            $('#tableStatusResults').empty();
            
            // API 호출
            $.ajax({
                url: '/test_distributed_save.php?action=check_tables',
                type: 'GET',
                dataType: 'json'
            })
            .done(function(response) {
                if (response.success) {
                    // 테이블 상태 결과 표시
                    const tableData = response.data;
                    
                    // 마스터 테이블을 먼저 표시
                    if (tableData['excel_master']) {
                        const masterInfo = tableData['excel_master'];
                        $('#tableStatusResults').append(`
                            <div class="col-md-12 mb-3">
                                <div class="card status-card bg-light">
                                    <div class="card-header bg-primary text-white">마스터 테이블 (excel_master)</div>
                                    <div class="card-body">
                                        <p>레코드 수: <strong>${masterInfo.count}</strong></p>
                                        <p>최대 ID: <strong>${masterInfo.max_id || 'N/A'}</strong></p>
                                    </div>
                                </div>
                            </div>
                        `);
                    }
                    
                    // 나머지 테이블 표시
                    Object.keys(tableData).forEach(tableName => {
                        if (tableName === 'excel_master') return; // 이미 처리함
                        
                        const tableInfo = tableData[tableName];
                        const hasNullClass = tableInfo.has_null ? 'text-danger' : 'text-success';
                        
                        $('#tableStatusResults').append(`
                            <div class="col-md-4 mb-3">
                                <div class="card status-card">
                                    <div class="card-header">${tableName}</div>
                                    <div class="card-body">
                                        <p>레코드 수: <strong>${tableInfo.count}</strong></p>
                                        <p>최대 master_id: <strong>${tableInfo.max_id || 'N/A'}</strong></p>
                                        <p>NULL 값: <strong class="${hasNullClass}">${tableInfo.has_null ? '있음 (' + tableInfo.null_count + ')' : '없음'}</strong></p>
                                    </div>
                                </div>
                            </div>
                        `);
                    });
                } else {
                    alert('테이블 상태 확인 실패');
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('API 요청 실패:', textStatus, errorThrown);
                alert('테이블 상태 확인 요청 실패: ' + textStatus);
            })
            .always(function() {
                $('#tableStatusLoader').hide();
            });
        }
        
        // 테이블 초기화
        function initializeTables() {
            if (!confirm('모든 테이블의 데이터가 삭제됩니다. 계속하시겠습니까?')) {
                return;
            }
            
            $('#initTablesBtn').prop('disabled', true).text('초기화 중...');
            
            // API 호출
            $.ajax({
                url: '/test_distributed_save.php?action=initialize_tables',
                type: 'GET',
                dataType: 'json'
            })
            .done(function(response) {
                if (response.success) {
                    alert(response.message);
                    // 상태 업데이트를 위해 테이블 체크 실행
                    if ($('#tableStatusSection').is(':visible')) {
                        checkTableStatus();
                    }
                } else {
                    alert('테이블 초기화 실패: ' + response.message);
                }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error('API 요청 실패:', textStatus, errorThrown);
                alert('테이블 초기화 요청 실패: ' + textStatus);
            })
            .always(function() {
                $('#initTablesBtn').prop('disabled', false).text('테이블 초기화');
            });
        }
    </script>
</body>
</html> 