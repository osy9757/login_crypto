/**
 * 엑셀 파일 파싱 모듈
 * - 고성능 엑셀 파싱 구현
 * - Web Worker 활용
 * - DataTables로 결과 표시
 */

// 엑셀 파싱용 Web Worker 코드 (문자열로 정의)
const excelWorkerCode = `
  // SheetJS 라이브러리 로드
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  
  // 메인 스레드로부터 메시지 수신
  self.onmessage = function(e) {
    try {
      const arrayBuffer = e.data;
      
      // 성능 최적화 옵션
      const options = {
        type: 'array',
        cellDates: false,
        raw: true
      };
      
      // 워크북 파싱
      const workbook = XLSX.read(arrayBuffer, options);
      
      // 첫 번째 시트 선택
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 시트를 JSON으로 변환 (헤더 자동감지)
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      });
      
      // 결과 반환
      self.postMessage({
        success: true,
        sheetName: firstSheetName,
        data: data,
      });
    } catch (error) {
      self.postMessage({
        success: false,
        error: error.message
      });
    }
  };
`;

// Worker 초기화 함수
function createExcelWorker() {
  const blob = new Blob([excelWorkerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  return new Worker(workerUrl);
}

// DataTables 인스턴스
let parsedDataTable = null;

// DOM이 로드된 후 이벤트 리스너 설정
$(document).ready(function() {
  // 파일 선택 이벤트 -> 자동 파싱 실행
  $('#excelFile').change(function(event) {
    // 기존 handleFileSelect 함수는 유지
    if (typeof handleFileSelect === 'function') {
      handleFileSelect(event);
    }
    
    // 파일 선택 시 자동으로 파싱 시작
    parseExcelFile();
  });
});

/**
 * 엑셀 파일 파싱 실행
 */
function parseExcelFile() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('먼저 엑셀 파일을 선택해주세요.');
    return;
  }
  
  // 상태 초기화
  $('#status0').text('실행중').attr('class', 'status-running');
  $('#time0').text('-');
  $('#notes0').text('');
  
  // 로딩 표시
  showLoader(true, '엑셀 파일 파싱 중...');
  
  // 성능 측정 시작
  const startTime = performance.now();
  
  // FileReader로 파일 읽기
  const reader = new FileReader();
  reader.onload = function(e) {
    // 워커 생성 및 메시지 처리
    const worker = createExcelWorker();
    
    worker.onmessage = function(event) {
      const result = event.data;
      const endTime = performance.now();
      const elapsedTime = ((endTime - startTime) / 1000).toFixed(2); // 초 단위
      
      // 로딩 숨기기
      showLoader(false);
      
      if (result.success) {
        // 성공: 결과 표시
        displayParsingResult(result.data, elapsedTime);
        
        // 상태 업데이트
        $('#status0').text('완료').attr('class', 'status-success');
        $('#time0').text(`${elapsedTime}초`);
        $('#notes0').text(`시트명: ${result.sheetName}, 행 수: ${result.data.length}`);
      } else {
        // 실패: 오류 메시지
        $('#status0').text('실패').attr('class', 'status-error');
        $('#time0').text(`${elapsedTime}초`);
        $('#notes0').text(`오류: ${result.error}`);
        
        alert('엑셀 파싱 중 오류가 발생했습니다: ' + result.error);
      }
      
      // 워커 및 메모리 정리
      worker.terminate();
      URL.revokeObjectURL(worker.workerURL);
    };
    
    // 워커에 데이터 전송
    worker.postMessage(e.target.result);
  };
  
  reader.onerror = function() {
    showLoader(false);
    $('#status0').text('실패').attr('class', 'status-error');
    $('#notes0').text('파일 읽기 오류');
    alert('파일을 읽는 중 오류가 발생했습니다.');
  };
  
  // 파일을 ArrayBuffer로 읽기 (가장 빠른 방법)
  reader.readAsArrayBuffer(file);
}

/**
 * 파싱 결과 화면에 표시 (DataTables 사용) - 수정 가능하게 변경
 */
function displayParsingResult(data, elapsedTime) {
  if (!data || !data.length) {
    alert('파싱된 데이터가 없습니다.');
    return;
  }
  
  // 기본 정보 업데이트
  const rowCount = data.length;
  const colCount = data[0].length;
  
  $('#rowCount').text(rowCount);
  $('#colCount').text(colCount);
  
  // DataTables 초기화 또는 새로고침
  if (parsedDataTable) {
    parsedDataTable.destroy();
  }
  
  // 데이터를 DataTables 형식에 맞게 변환
  const headers = data[0]; // 첫 번째 행을 헤더로 사용
  const tableData = [];
  
  // 첫 번째 행(헤더)을 제외한 모든 행을 데이터로 변환
  for (let i = 1; i < data.length; i++) {
    const rowData = {};
    for (let j = 0; j < headers.length; j++) {
      // 헤더 이름이 비어있으면 인덱스 기반 이름 생성
      const headerName = headers[j] || `Column ${j+1}`;
      rowData[headerName] = data[i][j] || '';
    }
    tableData.push(rowData);
  }
  
  // 컬럼 정의 생성 - 수정 가능한 입력 필드로 렌더링하도록 변경
  const columns = headers.map(header => {
    const headerName = header || '';
    return { 
      title: headerName, 
      data: headerName,
      // 셀 렌더링을 편집 가능한 입력 필드로 변경
      render: function(data, type, row, meta) {
        if (type === 'display') {
          return '<input type="text" class="cell-editor" value="' + (data || '') + '">';
        }
        return data;
      }
    };
  });
  
  // DataTables 초기화
  parsedDataTable = $('#parsedDataTable').DataTable({
    data: tableData,
    columns: columns,
    scrollY: '500px',
    scrollX: true,
    scrollCollapse: true,
    paging: true,
    pageLength: 100,
    ordering: true,
    searching: true,
    info: true,
    lengthMenu: [10, 25, 50, 100, 200, 500, 1000],
    language: {
      lengthMenu: '페이지당 _MENU_ 행 표시',
      zeroRecords: '결과가 없습니다',
      info: '_TOTAL_ 행 중 _START_ ~ _END_ 표시',
      infoEmpty: '0개 행',
      infoFiltered: '(전체 _MAX_ 행에서 필터링됨)',
      search: '검색:',
      paginate: {
        first: '처음',
        last: '마지막',
        next: '다음',
        previous: '이전'
      }
    },
    // 데이터 저장을 위한 추가 옵션
    drawCallback: function() {
      // 입력 필드에 변경 이벤트 리스너 추가
      $('.cell-editor').on('change', function() {
        const cell = parsedDataTable.cell($(this).closest('td'));
        const rowData = parsedDataTable.row(cell.index().row).data();
        const colName = columns[cell.index().column].data;
        
        // 데이터 업데이트
        rowData[colName] = $(this).val();
        
        console.log(`셀 데이터 변경: ${colName} = ${$(this).val()}`);
      });
    }
  });
  
  // 결과 섹션 표시
  $('#parsedDataSection').show();
}

/**
 * resetTests 함수에서 호출할 수 있는 DataTables 정리 함수
 */
function cleanupDataTable() {
  if (parsedDataTable) {
    parsedDataTable.destroy();
    parsedDataTable = null;
  }
  $('#parsedDataSection').hide();
} 