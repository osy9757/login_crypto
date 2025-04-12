/**
 * 엑셀 파일 저장 성능 테스트 스크립트
 */

// 전역 상태 객체
const appState = {
    selectedFile: null,
    testRunning: false,
    results: {
      test1: { time: null, status: '대기중', notes: '' },
      test2: { time: null, status: '대기중', notes: '' },
      test3: { time: null, status: '대기중', notes: '' },
      test4: { time: null, status: '대기중', notes: '' }
    },
    loaderLoaded: false
  };
  
  /**
   * 페이지 로드 시 이벤트 리스너 설정
   */
  $(document).ready(function() {
    // 파일 입력 변경 이벤트
    $('#excelFile').change(handleFileSelect);
    
    // 테스트 실행 버튼 클릭 이벤트
    $('#runTestBtn').click(runPerformanceTests);
    
    // 초기화 버튼 클릭 이벤트
    $('#resetBtn').click(resetTests);
    
    // DB 연결 확인 버튼 클릭 이벤트
    $('#checkDbBtn').click(checkDatabaseConnection);
    
    // 테이블 초기화 버튼 클릭 이벤트
    $('#resetTablesBtn').click(resetAllTables);
    
    // 로더 HTML 미리 로드
    loadBallsLoaderHTML();
    
    // 복호화 및 다운로드 버튼 이벤트
    $('#decryptDownloadBtn').on('click', runDecryptAndDownload);
    
    // DB 파싱 데이터 복원 (페이지 이동 후 돌아왔을 때)
    const savedDBData = sessionStorage.getItem('dbParsedData');
    if (savedDBData) {
      try {
        const parsedData = JSON.parse(savedDBData);
        if (parsedData && parsedData.length) {
          renderDBParsedData(parsedData);
        }
      } catch (e) {
        console.error('DB 파싱 데이터 복원 실패:', e);
      }
    }
  });
  
  /**
   * Balls Loader HTML 로드
   */
  function loadBallsLoaderHTML() {
    $.ajax({
      url: '/frontend/animation/Balls_Loader/Balls_Loader.html',
      type: 'GET',
      success: function(data) {
        // HTML 문자열을 jQuery 객체로 변환
        const loaderHtml = $(data);
        
        // 로딩 컨테이너에 HTML 삽입
        $('#loaderContainer').html(loaderHtml);
        
        // 스타일 커스터마이징을 위한 CSS 추가
        $("<style>")
          .prop("type", "text/css")
          .html(`
            #loaderContainer {
              padding-top: 20px; 
            }
            #loaderContainer .loader div {
              background: #3498db;
            }
            @keyframes animate {
              0% { left: 100px; top: 0; }
              80% { left: 0; top: 0; }
              85% { left: 0; top: -20px; width: 20px; height: 20px; background: #3498db; }
              90% { width: 40px; height: 15px; background: linear-gradient(to top, #2980b9, #3498db); }
              95% { left: 100px; top: -20px; width: 20px; height: 20px; background: linear-gradient(to top, #2980b9, #3498db); }
              100% { left: 100px; top: 0; }
            }
          `)
          .appendTo("head");
        
        appState.loaderLoaded = true;
      },
      error: function(xhr, status, error) {
        console.error('Failed to load Balls Loader HTML:', status, error);
        // 백업 로더 HTML 사용
        $('#loaderContainer').html('<div style="text-align:center; padding-top:20px;"><div class="spinner"></div><p>로딩 중...</p></div>');
      }
    });
  }
  
  /**
   * 모달 로더 표시/숨김
   */
  function showLoader(show, message = '테스트 실행 중...') {
    if (show) {
      console.log('로딩 표시: ' + message);
      $('.loader-text').text(message);
      $('.modal-loader').css('display', 'flex');
    } else {
      console.log('로딩 숨김');
      $('.modal-loader').hide();
    }
  }
  
  /**
   * 파일 선택 처리
   */
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 엑셀 파일 확장자 확인
    const validExts = ['.xlsx', '.xls'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExts.includes(fileExt)) {
      alert('엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다.');
      this.value = '';
      return;
    }
    
    // 파일 정보 표시 및 상태 업데이트
    appState.selectedFile = file;
    $('#fileInfo').text(`파일명: ${file.name} (${formatFileSize(file.size)})`);
    $('#runTestBtn').prop('disabled', false);
    $('#resetBtn').prop('disabled', false);
    
    // 테스트 결과 초기화
    resetTestResults();
  }
  
  /**
   * 파일 크기를 읽기 쉬운 형식으로 변환
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * 성능 테스트 실행
   */
  function runPerformanceTests() {
    // 파일 및 테스트 상태 확인
    if (!appState.selectedFile) {
        alert('먼저 엑셀 파일을 선택해주세요.');
        return;
    }

    if (appState.testRunning) {
        alert('이미 테스트가 실행 중입니다.');
        return;
    }

    // 테스트 상태 업데이트
    appState.testRunning = true;
    
    // 데이터 준비 - 이미 파싱된 데이터가 있는지 확인
    if (!parsedDataTable || !parsedDataTable.data().count()) {
        alert('먼저 엑셀 파일을 선택하여 파싱해주세요.');
        appState.testRunning = false;
        return;
    }
    
    // 데이터 추출 (DataTables에서 전체 데이터 가져오기)
    const data = [];
    parsedDataTable.data().each(function(rowData) {
        const row = [];
        // 행 데이터에서 모든 값을 배열로 변환
        Object.keys(rowData).forEach(key => {
            row.push(rowData[key]);
        });
        data.push(row);
    });
    
    // 헤더 행 추가 (columns에서 title 값 가져오기)
    const headers = [];
    parsedDataTable.columns().header().each(function(header) {
        headers.push($(header).text());
    });
    data.unshift(headers);
    
    // 모든 테스트 상태 초기화
    for (let i = 1; i <= 4; i++) {
      $(`#status${i}`).text('대기중').attr('class', 'status-waiting');
      $(`#time${i}`).text('-');
      $(`#notes${i}`).text('');
    }

    // initializeTables 함수를 Promise로 래핑
    const initializeTablesPromise = () => {
      return new Promise((resolve, reject) => {
        // 대화상자 없이 바로 진행
        showLoader(true, '테이블 초기화 중...');
        // API 호출
        $.ajax({
          url: '/test_distributed_save.php?action=initialize_tables',
          type: 'GET',
          dataType: 'json'
        })
        .done(function(response) {
          showLoader(false);
          if (response.success) {
            console.log('테이블 초기화 성공:', response.message);
            resolve(); // 성공 시 Promise 해결
          } else {
            console.error('테이블 초기화 실패:', response.message);
            reject(new Error('테이블 초기화 실패: ' + response.message)); // 실패 시 Promise 거부
          }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          showLoader(false);
          console.error('API 요청 실패:', textStatus, errorThrown);
          reject(new Error('테이블 초기화 요청 실패: ' + textStatus)); // 실패 시 Promise 거부
        });
      });
    };
    
    // 테스트 시작 전 첫 번째 초기화
    initializeTablesPromise()
      .then(() => {
        // 테스트 1 실행
        return runSingleTableSaveTest(data);
      })
      .then(() => {
        // 1초 대기 후 테스트 2 실행
        console.log('테스트 1 완료, 1초 후 테스트 2 시작');
        return new Promise(resolve => setTimeout(() => {
          resolve(runDistributedTableTest(data));
        }, 1000));
      })
      .then(() => {
        // 테스트 2 완료 후 다시 테이블 초기화
        console.log('테스트 2 완료, 테이블 초기화 후 테스트 3 시작');
        return initializeTablesPromise();
      })
      .then(() => {
        // 테스트 3 실행
        return runMultithreadDistributedTableTest(data);
      })
      .then(() => {
        // 1초 대기 후 테스트 4 실행
        console.log('테스트 3 완료, 1초 후 테스트 4 시작');
        return new Promise(resolve => setTimeout(() => {
          resolve(runExcelDownloadTest());
        }, 1000));
      })
      .then(() => {
        // 모든 테스트 완료
        console.log('모든 테스트 완료');
        appState.testRunning = false;
      })
      .catch(error => {
        // 오류 발생 시
        console.error('테스트 실행 중 오류 발생:', error);
        showLoader(false);
        alert('테스트 실행 중 오류가 발생했습니다: ' + error.message);
        appState.testRunning = false;
      });
  }
  
  /**
   * 테스트 1: 단일 테이블 저장 (Promise 반환)
   */
  function runSingleTableSaveTest(data) {
    return new Promise((resolve, reject) => {
      // 테스트 시작 상태 업데이트
      $('#status1').text('실행중').attr('class', 'status-running');
      $('#time1').text('-');
      $('#notes1').text('');
      
      // 로딩 표시
      showLoader(true, '단일 테이블 암호화 저장 중...');
      
      // 시작 시간 기록
      const startTime = performance.now();
      
      // 2차원 배열을 객체 배열로 변환
      const headers = data[0];
      const rows = data.slice(1);
      
      // 객체 배열로 변환
      const objectData = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          // 숫자만으로 된 컬럼명 대신 col+숫자 형식 사용
          const colName = 'col' + (index + 1); // 반드시 'col1', 'col2' 형태로
          obj[colName] = row[index];
        });
        return obj;
      });
      
      // API 호출 - 단일 테이블 저장 (객체 배열 형식으로 전송)
      $.ajax({
        url: '/save_excel_test.php',
        type: 'POST',
        data: JSON.stringify({
          mode: 'singleTable',
          data: objectData
        }),
        contentType: 'application/json',
        dataType: 'json',
        timeout: 300000 // 5분 타임아웃
      })
      .done(function(response) {
        const endTime = performance.now();
        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
        
        // 로딩 숨기기
        showLoader(false);
        
        if (response.success) {
          // 성공: 결과 표시
          $('#status1').text('완료').attr('class', 'status-success');
          $('#time1').text(`${elapsedTime}초`);
          $('#notes1').text(`저장된 행: ${response.rowsAffected}, 열: ${response.colCount}`);
          
          // 결과 저장
          appState.results.test1 = { 
            time: elapsedTime, 
            status: '완료', 
            notes: `저장된 행: ${response.rowsAffected}, 열: ${response.colCount}` 
          };
          
          // Promise 성공 완료
          resolve();
        } else {
          // 실패: 오류 메시지
          $('#status1').text('실패').attr('class', 'status-error');
          $('#time1').text(`${elapsedTime}초`);
          $('#notes1').text(`오류: ${response.message}`);
          
          // Promise 실패
          reject(new Error(response.message || '테스트 1 실패'));
        }
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        const endTime = performance.now();
        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
        
        showLoader(false);
        
        $('#status1').text('실패').attr('class', 'status-error');
        $('#time1').text(`${elapsedTime}초`);
        $('#notes1').text(`요청 실패: ${textStatus}`);
        
        console.error('API 요청 실패:', textStatus, errorThrown);
        console.error('응답 상태:', jqXHR.status, jqXHR.statusText);
        console.error('응답 텍스트:', jqXHR.responseText);
        
        // Promise 실패
        reject(new Error(`요청 실패: ${textStatus} (${errorThrown})`));
      });
    });
  }
  
  /**
   * 테스트 2: 테이블 30개 분산 저장 (Promise 반환)
   */
  function runDistributedTableTest(data) {
    return new Promise((resolve, reject) => {
      // 테스트 시작 상태 업데이트
      $('#status2').text('실행중').attr('class', 'status-running');
      $('#time2').text('-');
      $('#notes2').text('');
      
      // 로딩 표시
      showLoader(true, '데이터를 30개 테이블에 분산 저장 중...');
      
      // 시작 시간 기록
      const startTime = performance.now();
      
      // 2차원 배열을 객체 배열로 변환
      const headers = data[0];
      const rows = data.slice(1);
      
      // 객체 배열로 변환
      const objectData = rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
              // 숫자만으로 된 컬럼명 대신 col+숫자 형식 사용
              const colName = 'col' + (index + 1);
              obj[colName] = row[index];
          });
          return obj;
      });
      
      // API 호출 - 분산 테이블 저장
      $.ajax({
          url: '/distributed_save.php',
          type: 'POST',
          data: JSON.stringify({
              mode: 'distributed',
              tableCount: 30,
              data: objectData
          }),
          contentType: 'application/json',
          dataType: 'json',
          timeout: 300000 // 5분 타임아웃
      })
      .done(function(response) {
          const endTime = performance.now();
          const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
          
          // 로딩 숨기기
          showLoader(false);
          
          if (response.success) {
              // 성공: 결과 표시
              $('#status2').text('완료').attr('class', 'status-success');
              $('#time2').text(`${elapsedTime}초`);
              $('#notes2').text(`저장된 행: ${response.rowsAffected}, 테이블 수: ${response.tableCount}`);
              
              // 결과 저장
              appState.results.test2 = { 
                  time: elapsedTime, 
                  status: '완료', 
                  notes: `저장된 행: ${response.rowsAffected}, 테이블 수: ${response.tableCount}` 
              };
              
              // Promise 성공 완료
              resolve();
          } else {
              // 실패: 오류 메시지
              $('#status2').text('실패').attr('class', 'status-error');
              $('#time2').text(`${elapsedTime}초`);
              $('#notes2').text(`오류: ${response.message}`);
              
              // Promise 실패
              reject(new Error(response.message || '테스트 2 실패'));
          }
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
          const endTime = performance.now();
          const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
          
          showLoader(false);
          
          $('#status2').text('실패').attr('class', 'status-error');
          $('#time2').text(`${elapsedTime}초`);
          $('#notes2').text(`요청 실패: ${textStatus}`);
          
          console.error('API 요청 실패:', textStatus, errorThrown);
          console.error('응답 상태:', jqXHR.status, jqXHR.statusText);
          console.error('응답 텍스트:', jqXHR.responseText);
          
          // Promise 실패
          reject(new Error(`요청 실패: ${textStatus} (${errorThrown})`));
      });
    });
  }
  
  /**
   * 테스트 3: 멀티프로세스 분산 테이블 테스트 (암호화 추가) (Promise 반환)
   */
  function runMultithreadDistributedTableTest(data) {
    return new Promise((resolve, reject) => {
      // 테스트 시작 상태 업데이트
      $('#status3').text('실행중').attr('class', 'status-running');
      $('#time3').text('-');
      $('#notes3').text('');
      
      // 로딩 표시 - 텍스트 변경
      showLoader(true, '멀티프로세스 분산 저장 중...');
      
      // 시작 시간 기록
      const startTime = performance.now();
      
      const headers = data[0];
      const rows = data.slice(1);

      // 암호화 옵션 추가
      const payload = {
          data: rows,
          processCount: 4,
          encrypt: true  // 암호화 활성화
      };
      
      // API 요청
      $.ajax({
          url: '/multiprocess_distributed_save.php',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(payload),
          dataType: 'json',
          timeout: 60000
      })
      .done(function(response) {
          // 로딩 숨기기
          showLoader(false);
          
          // 종료 시간 기록 및 경과 시간 계산
          const endTime = performance.now();
          const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
          
          if (response.success) {
              // 성공 처리
              const encryptInfo = response.encrypted ? ` (${response.encryptMethod} 암호화)` : '';
              $('#status3').text('완료').attr('class', 'status-success');
              $('#time3').text(`${elapsedTime}초`);
              // "스레드" 대신 "프로세스"로 표현 변경
              $('#notes3').text(`저장된 행: ${response.rowsAffected}, 테이블 수: ${response.tableCount}${encryptInfo}`);
              
              // Promise 완료
              resolve();
          } else {
              // 실패 처리
              $('#status3').text('실패').attr('class', 'status-error');
              $('#time3').text(`${elapsedTime}초`);
              $('#notes3').text(`오류: ${response.message}`);
              
              // Promise 실패
              reject(new Error(response.message || '테스트 3 실패'));
          }
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
          // 로딩 숨기기
          showLoader(false);
          
          // 종료 시간 및 경과 시간 계산
          const endTime = performance.now();
          const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
          
          // 오류 상태 표시
          $('#status3').text('실패').attr('class', 'status-error');
          $('#time3').text(`${elapsedTime}초`);
          $('#notes3').text(`AJAX 오류: ${textStatus}, ${errorThrown}`);
          
          console.error('테스트 3 실패:', textStatus, errorThrown);
          
          // Promise 실패
          reject(new Error(`AJAX 오류: ${textStatus}, ${errorThrown}`));
      });
    });
  }
  
  /**
   * 테스트 4: 프로시저를 통한 데이터 조회 - 전체 데이터 가져오기 (Promise 반환)
   */
  function runExcelDownloadTest() {
    return new Promise((resolve, reject) => {
      console.log('테스트 4 시작: 프로시저를 통한 전체 데이터 조회');
    
      // 상태 업데이트
      $('#status4').text('실행 중').attr('class', 'status-running');
      $('#time4').text('-');
      $('#notes4').text('');
    
      // 로딩 표시
      showLoader(true, '전체 데이터 조회 중...');
    
      // 시작 시간 기록
      const startTime = performance.now();
    
      // 옵션 - 더 많은 데이터를 가져오도록 수정
      const options = {
        fetchFullData: true,  // 전체 데이터 요청 플래그
        limit: 100000         // 최대 100000행까지 요청 (필요에 따라 조정)
      };
    
      // API 호출
      $.ajax({
        url: '/decrypt_and_download.php',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(options),
        dataType: 'json',
        timeout: 600000  // 10분 타임아웃
      })
      .done(function(response) {
        // 로딩 숨기기
        showLoader(false);
    
        // 종료 시간 기록
        const endTime = performance.now();
        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
    
        if (response.success) {
          // 성공: 결과 표시
          $('#status4').text('완료').attr('class', 'status-success');
          $('#time4').text(`${elapsedTime}초`);
          
          // 1. 비고에 총 행수와 시간 표시
          $('#notes4').text(`총 ${response.rowCount}행, ${elapsedTime}초`);
          
          // 2. DB 파싱 결과 영역 표시 및 데이터 렌더링 
          // sampleData 대신 전체 데이터 또는 많은 데이터 사용
          const displayData = response.resultData || response.sampleData || [];
          console.log(`표시할 데이터 개수: ${displayData.length}행`);
          renderDBParsedData(displayData);
          
          // 3. 결과 데이터를 세션 스토리지에 저장 (페이지 이동 후에도 유지)
          sessionStorage.setItem('dbParsedData', JSON.stringify(displayData));
          
          // Promise 완료
          resolve();
        } else {
          // 실패: 오류 메시지
          $('#status4').text('실패').attr('class', 'status-error');
          $('#time4').text(`${elapsedTime}초`);
          $('#notes4').text(`오류: ${response.message || '알 수 없는 오류'}`);
          
          reject(new Error(response.message || '테스트 4 실패'));
        }
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        // 로딩 숨기기
        showLoader(false);
    
        const endTime = performance.now();
        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
    
        // 오류 표시
        $('#status4').text('실패').attr('class', 'status-error');
        $('#time4').text(`${elapsedTime}초`);
        $('#notes4').text(`요청 실패: ${textStatus}`);
    
        console.error('API 요청 실패:', textStatus, errorThrown);
        console.error('응답 상태:', jqXHR.status, jqXHR.statusText);
        console.error('응답 텍스트:', jqXHR.responseText);
    
        // Promise 실패
        reject(new Error(`요청 실패: ${textStatus} (${errorThrown})`));
      });
    });
  }
  
  /**
   * DB 파싱 결과 데이터 렌더링
   * @param {Array} data DB에서 가져온 데이터 배열
   */
  function renderDBParsedData(data) {
    if (!data || !data.length) {
      console.warn('DB 파싱 결과 없음');
      $('#dbParsedDataSection').hide();
      return;
    }
    
    console.log(`데이터 렌더링 시작: ${data.length}행`);
    
    // DB 파싱 결과 섹션 표시
    $('#dbParsedDataSection').show();
    
    // 행 및 열 수 표시
    $('#dbRowCount').text(data.length);
    $('#dbColCount').text(Object.keys(data[0]).length);
    
    // 기존 테이블 삭제 (초기화)
    if ($.fn.DataTable.isDataTable('#dbParsedDataTable')) {
      $('#dbParsedDataTable').DataTable().destroy();
    }
    
    // 테이블 헤더 및 바디 초기화
    $('#dbParsedDataTable thead').empty();
    $('#dbParsedDataTable tbody').empty();
    
    // 헤더 생성
    const headers = Object.keys(data[0]);
    let headerHtml = '<tr>';
    headers.forEach(header => {
      headerHtml += `<th>${header}</th>`;
    });
    headerHtml += '</tr>';
    $('#dbParsedDataTable thead').append(headerHtml);
    
    // DataTable 초기화 (대용량 데이터에 최적화)
    const dbDataTable = $('#dbParsedDataTable').DataTable({
      data: data,
      columns: headers.map(header => ({ 
        data: header,
        title: header,
        // 셀 렌더링을 편집 가능한 입력 필드로
        render: function(data, type, row, meta) {
          if (type === 'display') {
            return '<input type="text" class="cell-editor" value="' + (data || '') + '">';
          }
          return data;
        }
      })),
      // 표시 개선 설정
      pageLength: 25,  // 한 페이지에 25행 표시
      lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "전체"]], // 페이지 크기 옵션
      scrollX: true,   // 가로 스크롤
      scrollY: '500px', // 세로 스크롤 (높이 제한)
      scrollCollapse: true,
      processing: true, // 처리 중 표시
      deferRender: true, // 렌더링 지연 (성능 향상)
      scroller: true,   // 가상 스크롤링 활성화
      dom: 'lfrtip',    // 기본 DataTable UI 요소
      select: true,
      language: {       // 한국어 설정
        processing: "처리 중...",
        search: "검색:",
        lengthMenu: "_MENU_ 개씩 보기",
        info: "_START_ - _END_ / _TOTAL_",
        infoEmpty: "데이터 없음",
        infoFiltered: "(_MAX_ 개 중 필터링됨)",
        paginate: {
          first: "처음",
          last: "마지막",
          next: "다음",
          previous: "이전"
        }
      }
    });
    
    // 셀 데이터 변경 이벤트 처리 (수정 감지)
    $('#dbParsedDataTable').on('change', '.cell-editor', function() {
      const cell = dbDataTable.cell($(this).closest('td'));
      const rowIdx = cell.index().row;
      const colIdx = cell.index().column;
      const headerName = headers[colIdx];
      
      // 원본 데이터 업데이트
      const rowData = dbDataTable.row(rowIdx).data();
      rowData[headerName] = $(this).val();
      
      // 세션 스토리지 업데이트 (페이지 이동 후 복원을 위해)
      // 성능 문제로 인해 타이머 사용하여 디바운스 처리
      if (window.dbUpdateTimer) {
        clearTimeout(window.dbUpdateTimer);
      }
      window.dbUpdateTimer = setTimeout(function() {
        const allData = dbDataTable.data().toArray();
        sessionStorage.setItem('dbParsedData', JSON.stringify(allData));
        console.log('세션 스토리지 데이터 업데이트 완료');
      }, 2000); // 2초 후에 저장
      
      console.log(`데이터 수정: [${rowIdx}][${headerName}] = ${$(this).val()}`);
    });
    
    // 다운로드 버튼 이벤트 바인딩
    $('#dbDownloadBtn').off('click').on('click', function() {
      downloadModifiedExcel();
    });
    
    console.log('DataTable 렌더링 완료');
  }
  
  /**
   * 수정된 데이터를 엑셀 파일로 다운로드
   */
  function downloadModifiedExcel() {
    // 로딩 표시
    showLoader(true, '수정된 데이터로 엑셀 파일 생성 중...');
    
    // DataTable에서 현재 데이터 가져오기
    let modifiedData = [];
    
    if ($.fn.DataTable.isDataTable('#dbParsedDataTable')) {
      const table = $('#dbParsedDataTable').DataTable();
      
      // 데이터 가져오기
      table.rows().every(function() {
        const rowData = this.data();
        
        // 현재 사용자가 수정한 값으로 업데이트
        const rowNode = this.node();
        $(rowNode).find('input.cell-editor').each(function() {
          const colName = $(this).closest('td').index();
          const headerName = Object.keys(rowData)[colName];
          rowData[headerName] = $(this).val();
        });
        
        modifiedData.push(rowData);
      });
    } else {
      // 테이블이 없으면 세션 스토리지에서 복원
      const savedData = sessionStorage.getItem('dbParsedData');
      if (savedData) {
        modifiedData = JSON.parse(savedData);
      }
    }
    
    if (!modifiedData.length) {
      alert('다운로드할 데이터가 없습니다.');
      showLoader(false);
      return;
    }
    
    // 서버에 수정된 데이터 전송하여 엑셀 파일 생성 요청
    $.ajax({
      url: '/create_excel_from_data.php',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        data: modifiedData
      }),
      dataType: 'json',
      timeout: 300000  // 5분 타임아웃
    })
    .done(function(response) {
      showLoader(false);
      
      if (response.success && response.downloadUrl) {
        // 다운로드 링크 생성 및 클릭
        const downloadLink = document.createElement('a');
        downloadLink.href = response.downloadUrl;
        downloadLink.download = response.filename || 'modified_data.xlsx';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        console.log('수정된 데이터로 엑셀 파일 다운로드 성공');
      } else {
        alert('엑셀 파일 생성 실패: ' + (response.message || '알 수 없는 오류'));
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      showLoader(false);
      console.error('엑셀 생성 요청 실패:', textStatus, errorThrown);
      alert('엑셀 파일 생성 요청 실패: ' + textStatus);
    });
  }
  
  /**
   * 모든 테이블 초기화 함수
   */
  function resetAllTables() {
    if (!confirm('정말로 모든 테이블의 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }
    
    console.log('모든 테이블 초기화 시작');
    $('#resetStatus').text('초기화 중...').attr('class', 'status-indicator status-checking');
    $('#resetResult').hide();
    showLoader(true, '테이블 초기화 중...');
    
    $.ajax({
      url: '/reset_tables_keep_cache.php',
      type: 'POST',
      dataType: 'json',
      timeout: 30000
    })
    .done(function(response) {
      showLoader(false);
      console.log('테이블 초기화 응답:', response);
      
      if (response.success) {
        $('#resetStatus').text('성공!').attr('class', 'status-indicator status-success');
        $('#resetResult').show();
        setTimeout(function() {
          $('#resetResult').fadeOut(1000);
        }, 3000);
      } else {
        $('#resetStatus').text('실패: ' + response.message).attr('class', 'status-indicator status-error');
        alert('테이블 초기화 실패: ' + response.message);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      showLoader(false);
      $('#resetStatus').text('요청 실패').attr('class', 'status-indicator status-error');
      console.error('테이블 초기화 API 오류:', textStatus, errorThrown);
      console.error('응답 상태:', jqXHR.status, jqXHR.statusText);
      console.error('응답 텍스트:', jqXHR.responseText);
      
      alert('테이블 초기화 요청 실패!\n' + textStatus);
    });
  }

  /**
   *  테이블 초기화 함수 (버튼 클릭 없이)
   */
  function initializeTables() {
    if (!confirm('모든 테이블의 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return;
    }
    
    showLoader(true, '테이블 초기화 중...');
    // API 호출
    $.ajax({
      url: '/test_distributed_save.php?action=initialize_tables',
      type: 'GET',
      dataType: 'json'
    })
    .done(function(response) {
      showLoader(false);
      if (response.success) {
        alert(response.message);
      } else {
        alert('테이블 초기화 실패: ' + response.message);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      showLoader(false);
      console.error('API 요청 실패:', textStatus, errorThrown);
      alert('테이블 초기화 요청 실패: ' + textStatus);
    })
  }
  
  /**
   * 테스트 결과 업데이트
   */
  function updateTestResult(testNumber, time, status, statusClass, notes) {
    $(`#time${testNumber}`).text(`${time}초`);
    $(`#status${testNumber}`).text(status).attr('class', statusClass);
    $(`#notes${testNumber}`).text(notes);
    
    // 상태 객체 업데이트
    appState.results[`test${testNumber}`] = {
      time: time,
      status: status,
      notes: notes
    };
  }
  
  /**
   * 테스트 상태 업데이트 (시간 없이)
   */
  function updateTestStatus(testNumber, status, statusClass) {
    $(`#status${testNumber}`).text(status).attr('class', statusClass);
  }
  
  /**
   * 테스트 결과 초기화
   */
  function resetTestResults() {
    // 0번부터 4번까지 (엑셀 파싱 포함)
    for (let i = 0; i <= 4; i++) {
      $(`#time${i}`).text('-');
      $(`#status${i}`).text('대기중').attr('class', 'status-waiting');
      $(`#notes${i}`).text('');
    }
    
    // 상태 객체 초기화 (엑셀 파싱 추가)
    appState.results = {
      test0: { time: null, status: '대기중', notes: '' },
      test1: { time: null, status: '대기중', notes: '' },
      test2: { time: null, status: '대기중', notes: '' },
      test3: { time: null, status: '대기중', notes: '' },
      test4: { time: null, status: '대기중', notes: '' }
    };
  }
  
  /**
   * 모든 테스트 초기화 (페이지 새로고침 방식)
   */
  function resetTests() {
    // 페이지 새로고침
    location.reload();
  }

  /**
   * 데이터베이스 연결 확인
   */
  function checkDatabaseConnection() {
    $('#dbStatus').text('확인 중...').attr('class', 'status-checking');
    
    $.ajax({
      url: '/check_db_connection.php',
      type: 'POST',
      dataType: 'json'
    })
    .done(function(response) {
      if (response.success) {
        $('#dbStatus').text('연결 성공: ' + response.message).addClass('status-success');
        alert('데이터베이스 연결 성공!\n' + response.message);
      } else {
        $('#dbStatus').text('연결 실패: ' + response.error).addClass('status-error');
        alert('데이터베이스 연결 실패!\n' + response.error);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      console.error('API 요청 실패:', textStatus, errorThrown);
      console.error('응답 상태:', jqXHR.status, jqXHR.statusText);
      console.error('응답 텍스트:', jqXHR.responseText);
      $('#dbStatus').text('요청 실패: ' + textStatus + ' (상태: ' + jqXHR.status + ')').addClass('status-error');
      alert('데이터베이스 연결 확인 요청 실패!\n서버 응답: ' + jqXHR.status + ' ' + jqXHR.statusText);
    });
  }

  /**
   * 복호화 및 다운로드 실행 (UI 버튼에서 호출)
   */
  function runDecryptAndDownload() {
    if (appState.testRunning) {
        alert('다른 테스트가 진행 중입니다. 완료 후 시도해주세요.');
        return;
    }
    
    // 상태 초기화
    $('#decryptStatus').text('');
    $('#downloadResult').hide();
    
    // 옵션 가져오기 - limit 제거
    const options = {
        processCount: $('#processCountOption').val(),
        outputFormat: $('#outputFormatOption').val(),
        useEncryption: $('#useEncryptionOption').is(':checked')
    };
    
    // 로딩 표시
    showLoader(true, '전체 데이터 복호화 및 파일 생성 중...');
    
    // 시작 시간 기록
    const startTime = performance.now();
    
    // API 호출
    $.ajax({
        url: '/decrypt_and_download.php',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(options),
        dataType: 'json',
        timeout: 600000  // 10분으로 유지
    })
    .done(function(response) {
        // 로딩 숨기기
        showLoader(false);
        
        // 종료 시간 기록 및 경과 시간 계산
        const endTime = performance.now();
        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
        
        if (response.success) {
            // 다운로드 URL 생성
            const downloadUrl = '/downloads/' + response.file;
            
            // 성공: 결과 표시
            $('#status4').text('완료').attr('class', 'status-success');
            $('#time4').text(`${elapsedTime}초`);
            $('#notes4').text(`전체 ${response.rowCount}행, 프로세스: ${options.processCount}, URL: ${downloadUrl}`);
            
            // 샘플 데이터 콘솔에 출력 (추가)
            if (response.sampleData && response.sampleData.length > 0) {
                console.log('===== 복호화된 데이터 runExcelDownloadTest (처음 10개 행) =====');
                console.table(response.sampleData);
                console.log('=================================================');
            }
            
            // 결과 저장
            appState.results.test4 = { 
                time: elapsedTime, 
                status: '완료', 
                notes: `전체 ${response.rowCount}행, 프로세스: ${options.processCount}, 파일: ${response.file}` 
            };
            
            console.log('테스트 5 완료');
            
            // 모든 테스트 완료
            appState.testRunning = false;
        } else {
            // 실패: 오류 메시지
            $('#status4').text('실패').attr('class', 'status-error');
            $('#time4').text(`${elapsedTime}초`);
            $('#notes4').text(`오류: ${response.message}`);
            appState.testRunning = false;
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        const endTime = performance.now();
        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
        
        showLoader(false);
        
        $('#status4').text('실패').attr('class', 'status-error');
        $('#time4').text(`${elapsedTime}초`);
        $('#notes4').text(`요청 실패: ${textStatus}`);
        
        console.error('API 요청 실패:', textStatus, errorThrown);
        console.error('응답 상태:', jqXHR.status, jqXHR.statusText);
        console.error('응답 텍스트:', jqXHR.responseText);
        
        alert('파일 다운로드 테스트 실패. 개발자 콘솔에서 상세 정보를 확인하세요.');
        appState.testRunning = false;
    });
  }
  