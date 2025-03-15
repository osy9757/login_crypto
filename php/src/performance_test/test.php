<?php
// 테이블 데이터 뷰어 스크립트
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 데이터베이스 연결 함수
function connectDB() {
    $host = 'excel_test_mysql';
    $dbname = 'excel_test';
    $user = 'testuser';
    $pass = 'testpassword';
    
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        die("연결 실패: " . $e->getMessage());
    }
}

// 테이블 초기화 함수
function clearAllTables() {
    try {
        $pdo = connectDB();
        $pdo->beginTransaction();
        
        // excel_full 테이블 초기화
        $pdo->exec("TRUNCATE TABLE excel_full");
        
        // excel_part1 ~ excel_part30 테이블 초기화
        for ($i = 1; $i <= 30; $i++) {
            $tableName = "excel_part$i";
            $pdo->exec("TRUNCATE TABLE $tableName");
        }
        
        $pdo->commit();
        return ['success' => true, 'message' => '모든 테이블 초기화 완료'];
    } catch (PDOException $e) {
        if (isset($pdo)) $pdo->rollBack();
        return ['success' => false, 'message' => '테이블 초기화 오류: ' . $e->getMessage()];
    }
}

// 테이블 초기화 처리
if (isset($_POST['action']) && $_POST['action'] === 'clear_tables') {
    $result = clearAllTables();
    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
}

// HTML 헤더 출력
echo "<!DOCTYPE html>
<html>
<head>
    <title>Excel 테스트 - 테이블 데이터 뷰어</title>
    <meta charset='utf-8'>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .btn-container { display: flex; flex-wrap: wrap; margin-bottom: 20px; }
        .btn { 
            margin: 5px; padding: 8px 12px; 
            background-color: #4CAF50; color: white;
            border: none; border-radius: 4px; cursor: pointer;
            text-decoration: none;
        }
        .btn:hover { background-color: #45a049; }
        .btn.active { background-color: #2196F3; }
        .btn.clear { background-color: #f44336; }
        .btn.clear:hover { background-color: #d32f2f; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .pagination { margin-top: 20px; }
        .pagination a { 
            color: black; padding: 8px 16px; text-decoration: none;
            transition: background-color .3s; border: 1px solid #ddd;
            margin: 0 4px;
        }
        .pagination a.active { background-color: #4CAF50; color: white; }
        .pagination a:hover:not(.active) { background-color: #ddd; }
        .row-count { margin-bottom: 10px; }
        .clear-container { margin-top: 30px; padding: 15px; background-color: #f8f8f8; border-radius: 5px; }
        .message { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background-color: #dff0d8; color: #3c763d; }
        .error { background-color: #f2dede; color: #a94442; }
    </style>
    <script>
    function clearAllTables() {
        if (confirm('정말로 모든 테이블의 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            // AJAX 요청 생성
            var xhr = new XMLHttpRequest();
            xhr.open('POST', window.location.href, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    var messageElement = document.getElementById('clear-message');
                    
                    if (response.success) {
                        messageElement.className = 'message success';
                        messageElement.textContent = response.message;
                        // 페이지 새로고침 (1초 후)
                        setTimeout(function() {
                            window.location.reload();
                        }, 1000);
                    } else {
                        messageElement.className = 'message error';
                        messageElement.textContent = response.message;
                    }
                }
            };
            xhr.send('action=clear_tables');
        }
    }
    </script>
</head>
<body>
    <h1>Excel 테스트 - 테이블 데이터 뷰어</h1>
    <div class='btn-container'>
        <a href='?table=excel_full' class='btn".($_GET['table'] == 'excel_full' ? ' active' : '')."'>excel_full</a>";

// 테이블 버튼 생성 (excel_part1 ~ excel_part30)
for ($i = 1; $i <= 30; $i++) {
    $tableName = "excel_part$i";
    $isActive = ($_GET['table'] == $tableName) ? ' active' : '';
    echo "<a href='?table=$tableName' class='btn$isActive'>$tableName</a>";
}

echo "</div>";

// 테이블 데이터 표시
$selectedTable = isset($_GET['table']) ? $_GET['table'] : 'excel_full';

// 유효한 테이블 이름인지 확인 (SQL 인젝션 방지)
$validTables = ['excel_full'];
for ($i = 1; $i <= 30; $i++) {
    $validTables[] = "excel_part$i";
}

if (!in_array($selectedTable, $validTables)) {
    die("유효하지 않은 테이블 이름입니다.");
}

try {
    $pdo = connectDB();
    
    // 전체 행 수 계산
    $countStmt = $pdo->query("SELECT COUNT(*) FROM $selectedTable");
    $totalRows = $countStmt->fetchColumn();
    
    // 페이지네이션 설정
    $rowsPerPage = isset($_GET['rows']) ? (int)$_GET['rows'] : 20;
    $currentPage = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $totalPages = ceil($totalRows / $rowsPerPage);
    $offset = ($currentPage - 1) * $rowsPerPage;
    
    // 테이블 데이터 가져오기
    $stmt = $pdo->query("SELECT * FROM $selectedTable LIMIT $offset, $rowsPerPage");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 테이블 컬럼 가져오기
    $columnsStmt = $pdo->query("SHOW COLUMNS FROM $selectedTable");
    $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);
    
    // 데이터 표시
    echo "<h2>테이블: $selectedTable</h2>";
    echo "<div class='row-count'>총 행 수: $totalRows</div>";
    
    // 페이지당 행 수 선택
    echo "<div>";
    echo "페이지당 행 수: ";
    foreach ([10, 20, 50, 100] as $option) {
        echo "<a href='?table=$selectedTable&rows=$option' class='btn".($rowsPerPage == $option ? ' active' : '')."'>$option</a> ";
    }
    echo "</div><br>";
    
    if (count($rows) > 0) {
        echo "<table>";
        echo "<tr>";
        foreach ($columns as $column) {
            echo "<th>$column</th>";
        }
        echo "</tr>";
        
        foreach ($rows as $row) {
            echo "<tr>";
            foreach ($columns as $column) {
                echo "<td>" . htmlspecialchars($row[$column] ?? '') . "</td>";
            }
            echo "</tr>";
        }
        echo "</table>";
        
        // 페이지네이션 링크
        if ($totalPages > 1) {
            echo "<div class='pagination'>";
            
            // 이전 페이지 링크
            if ($currentPage > 1) {
                echo "<a href='?table=$selectedTable&page=".($currentPage-1)."&rows=$rowsPerPage'>&laquo; 이전</a>";
            }
            
            // 페이지 번호 링크
            $startPage = max(1, $currentPage - 2);
            $endPage = min($totalPages, $currentPage + 2);
            
            for ($i = $startPage; $i <= $endPage; $i++) {
                $activeClass = ($i == $currentPage) ? " class='active'" : "";
                echo "<a href='?table=$selectedTable&page=$i&rows=$rowsPerPage'$activeClass>$i</a>";
            }
            
            // 다음 페이지 링크
            if ($currentPage < $totalPages) {
                echo "<a href='?table=$selectedTable&page=".($currentPage+1)."&rows=$rowsPerPage'>다음 &raquo;</a>";
            }
            
            echo "</div>";
        }
    } else {
        echo "<p>테이블에 데이터가 없습니다.</p>";
    }
    
    // 테이블 초기화 버튼 섹션 추가
    echo "<div class='clear-container'>
        <h3>테이블 데이터 초기화</h3>
        <p>모든 테이블(excel_full 및 excel_part1~30)의 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.</p>
        <button onclick='clearAllTables()' class='btn clear'>모든 테이블 초기화</button>
        <div id='clear-message'></div>
    </div>";
    
} catch (PDOException $e) {
    echo "<p>오류: " . $e->getMessage() . "</p>";
}

echo "</body></html>";
?>