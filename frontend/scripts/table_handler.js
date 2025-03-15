/*******************************************************
 * table_handler.js
 * - Web Worker로 파싱된 엑셀 데이터를 받아 DataTables로 렌더링
 * - "불러오기(복호화)" / "불러오기(원본)" / "저장하기"/ "수정하기" / "내보내기" 등
 * - 각 셀 contenteditable + sessionStorage로 수정 내용 일부 동기화
 * - "partialUpdate": id 기반으로 변경된 셀만 서버에 UPDATE
 * - 임시저장, 암호화 저장, 초기화, DB 삭제 등 모달 조작
 *******************************************************/

// 전역 상태(필요한 것만 모아 관리)
const appState = {
  excelDataTable: null,  // DataTables 인스턴스
  currentMode: null,     // 현재 작업 모드 (예: "upload", "loadOriginal", "loadDecrypted", "partialUpdate" 등)

  // 수정된 셀 정보를 메모리에 저장 (rowId -> {컬럼명: 새 값})
  modifiedData: {},
  // 편집 전 상태를 유지하기 위함
  originalExcelData: [], 
};

/**
 * ========================================================
 * 1. Web Worker 파싱 -> 테이블 렌더링 (엑셀 업로드 시)
 * ========================================================
 */

/**
 * 파일 업로드 후, appState.originalExcelData에 저장된 데이터를
 * DataTables로 렌더링 (중복 변환 없음)
 * @param {string} fileName - 업로드된 파일명
 * @param {string} sheetName - 시트명
 */
function renderTableData(fileName, sheetName) {
  try {
    resetDataTable();

    // 원본 (객체 배열)
    const original = appState.originalExcelData || [];
    if (!original.length) {
      alert("엑셀 원본 데이터가 없습니다.");
      return;
    }

    // === 병합 로직 추가: 원본 + 수정사항 ===
    const mergedData = original.map(row => {
      const rowId = row.id;
      // row 복사
      let newRow = { ...row };
      // 수정사항 있으면 덮어쓰기
      if (appState.modifiedData[rowId]) {
        Object.assign(newRow, appState.modifiedData[rowId]);
      }
      return newRow;
    });

    // 열 목록: (id를 맨 앞에)
    let headers = Object.keys(mergedData[0] || {});
    const idIndex = headers.indexOf("id");
    if (idIndex > 0) {
      headers.splice(idIndex, 1);
      headers.unshift("id");
    }

    // DataTables 생성
    appState.excelDataTable = $("#excelTable").DataTable({
      data: mergedData,
      scrollY: "900px",
      scrollX: true,
      scrollCollapse: true,
      fixedHeader: true,
      paging: true,
      pageLength: 100,
      columns: headers.map(h => ({ data: h, title: h })),
      columnDefs: [{
        targets: "_all",
        createdCell: function(td) {
          $(td).attr("contenteditable", "true");
        }
      }]
    });

    console.log(`renderTableData() - file="${fileName}", sheet="${sheetName}", rowCount=${mergedData.length}`);

    $("#saveBtn").text("저장하기").prop("disabled", false);
    updateEditButtonState();

  } catch (error) {
    console.error("renderTableData() 실패:", error);
    alert("테이블 렌더링 중 오류 발생");
  }
}


/**
 * DataTables 초기화 해제
 * - 기존 DataTables 인스턴스 destroy 후, thead/tbody 비움
 */
function resetDataTable() {
  if (appState.excelDataTable) {
    appState.excelDataTable.destroy();
    $("#excelTable thead").empty();
    $("#excelTable tbody").empty();
    appState.excelDataTable = null;
  }
}

/**
 * ========================================================
 * 2. DataTables 공통 생성 로직 (서버사이드 모드용)
 * ========================================================
 */

/**
 * DataTables 공통 설정 함수
 * @param {Object} options
 *  - ajaxUrl: 서버에 요청할 URL
 *  - columns: DataTables용 컬럼 배열
 *  - pageLength: 페이지당 표시 행 수
 *  - disableFirstColEdit: 첫 번째 컬럼 편집 불가 여부(기본값 false)
 * @returns DataTable 인스턴스
 */
function createDataTable(options) {
  const {
    ajaxUrl,
    columns,
    pageLength = 25,
    disableFirstColEdit = false,
    disableAllEdit = false,
  } = options;

  // DataTables 서버사이드 렌더링
  return $("#excelTable").DataTable({
    processing: true,
    serverSide: true,
    ajax: {
      url: ajaxUrl,
      type: "POST",
      dataSrc: function(json) {
        // 메모리에 있는 modifiedData를 서버에서 받은 json.data에 병합
        const modifiedData = getModifiedData();
        json.data.forEach(row => {
          if (modifiedData[row.id]) {
            Object.assign(row, modifiedData[row.id]);
          }
        });
        return json.data;
      }
    },
    columns: columns,
    scrollY: "900px",
    scrollX: true,
    scrollCollapse: true,
    fixedHeader: true,
    paging: true,
    info: true,
    lengthMenu: [10, 25, 50, 100, 200, 500, 1000, 3000],
    pageLength: pageLength,
    columnDefs: [
      // 첫 번째 컬럼을 편집 불가로 만들고 싶을 때
      disableFirstColEdit
        ? {
            targets: 0,
            createdCell: function(td) {
              // contenteditable 비활성
              $(td).attr("contenteditable", "false");
            },
          }
        : {},
      // 나머지 컬럼은 contenteditable
      {
        targets: "_all",
        createdCell: function(td, cellData, rowData, rowIdx, colIdx) {
          // disableAllEdit가 true면 모든 셀 편집 불가
          if (disableAllEdit) {
            $(td).attr("contenteditable","false");
          }
          // disableFirstColEdit가 true면 첫 번째 컬럼만 편집불가
          else if (disableFirstColEdit && colIdx === 0) {
            $(td).attr("contenteditable", "false");
          } 
          else {
            $(td).attr("contenteditable", "true");
          }
        }
      }
    ]
  });
}

/**
 * 1~N개의 col 열 이름을 자동 생성
 * @param {number} count
 * @returns {Array} DataTables columns 배열
 */
function generateColumns(count) {
  const columns = [{ data: "id", title: "id" }];
  for (let i = 1; i <= count; i++) {
    columns.push({ data: "col" + i, title: "col" + i });
  }
  return columns;
}

/**
 * ========================================================
 * 3. 수정 데이터 관리 (메모리 중심)
 * ========================================================
 */

/**
 * 메모리에 저장된 modifiedData 가져오기
 * @returns {Object} appState.modifiedData
 */
function getModifiedData() {
  return appState.modifiedData;
}

/**
 * 메모리에 있는 수정 데이터를 sessionStorage에 JSON으로 백업
 * @param {object} data (필요 시 인자로 받아도 되지만, 여기선 appState에서 바로 사용)
 */
function setModifiedData(data) {
  // sessionStorage에 실제로 기록하고 싶다면, 아래 코드 활용:
  sessionStorage.setItem("modifiedData", JSON.stringify(data));
  // 원한다면 appState.modifiedData = data; 로 동기화할 수도 있음
}

/**
 * 특정 셀 수정 시(blur) => 메모리(appState.modifiedData)에 반영
 * (이벤트 위임으로 호출)
 */
function onCellBlur(e) {
  const td = e.target; // 이벤트가 발생한 셀
  const rowNode = $(td).closest("tr");
  if (!rowNode.length) return;

  // DataTables API를 통해 row/column index 파악
  const cell = appState.excelDataTable.cell(td);
  if (!cell || cell.index() === null) return;

  const { row, column } = cell.index();
  const rowData = appState.excelDataTable.row(row).data();
  if (!rowData || !rowData.id) return; // id가 없으면 수정 무시

  const colName = appState.excelDataTable.column(column).dataSrc();
  const newValue = $(td).text().trim();
  const rowId = rowData.id;

  // appState.modifiedData에 저장 (sessionStorage는 임시저장 시점에 별도 보관 가능)
  if (!appState.modifiedData[rowId]) {
    appState.modifiedData[rowId] = {};
  }
  appState.modifiedData[rowId][colName] = newValue;

  updateEditButtonState();
}

/**
 * DataTables 전체(모든 페이지) 내용을 2차원 배열 or 객체 배열로 수집
 * + 메모리에 있는 modifiedData 병합
 * @returns {Array} 최종 병합된 테이블 데이터
 */
function gatherUpdatedTableData() {
  if (!appState.excelDataTable) return [];

  const dataArray = [];

  // DataTables의 모든 row 데이터 순회
  appState.excelDataTable.rows().every(function(rowIdx) {
    const rowData = this.data(); 
    // 서버사이드 모드면 실제 현재 페이지 외 데이터는 Ajax 시점에만 불러옴에 주의
    dataArray.push({ ...rowData }); 
  });

  // 메모리에 있는 수정 내용(appState.modifiedData) 적용
  const modifiedData = getModifiedData();
  dataArray.forEach(row => {
    const rowId = row.id;
    if (modifiedData[rowId]) {
      Object.assign(row, modifiedData[rowId]);
    }
  });

  dataArray.forEach(r => { delete r["id"]; });

  return dataArray;
}

/**
 * 메모리의 수정 정보를 sessionStorage에 백업(임시저장)
 */
function saveToSessionStorage() {
  sessionStorage.setItem(
    "modifiedDataBackup",
    JSON.stringify(appState.modifiedData)
  );
  alert("임시저장 완료!");
  console.log("임시저장 → sessionStorage에 백업:", appState.modifiedData);

  updateEditButtonState();
}

/**
 * 새로운 작업을 시작할때마다 appState.modifiedData와 
 * sessionStorage 등을 비워준다.
 */
function clearMemoryAndSession() {
  appState.modifiedData = {};
  sessionStorage.removeItem("modifiedDataBackup");
  sessionStorage.removeItem("modifiedData");
}

/**
 * 두 객체(메모리/백업)가 "다른가"를 간단 비교
 */
function isDataDifferent(obj1, obj2) {
  // 1) 문자열로 변환하여 비교 (간단 방법)
  //    -> 큰 데이터 시 성능 부담이 있을 수 있으나, 대부분 상황엔 문제 없음
  return JSON.stringify(obj1) !== JSON.stringify(obj2);
}

/**
 * ========================================================
 * 4. Ajax 통신 헬퍼 & 구체적 로직
 * ========================================================
 */

/**
 * 공통 Ajax 헬퍼
 * @param {string} url - 요청 URL
 * @param {object} data - 전송할 데이터
 * @param {function} onSuccess - 성공 시 콜백
 */
function ajaxCall(url, data, onSuccess) {
  $.ajax({
    url,
    method: "POST",
    data: JSON.stringify(data),
    contentType: "application/json; charset=utf-8",
    success: function(resp) {
      if (resp.success) {
        onSuccess(resp);
      } else {
        alert("실패: " + resp.message);
      }
    },
    error: function(err) {
      console.error("서버 오류:", err);
      alert("서버 통신 오류가 발생했습니다.");
    }
  });
}

/**
 * 전체 저장 (plainSave, encryptSave 등) or partialUpdate(수정하기)
 */
function performSave() {
  const mode = appState.currentMode || "upload";

  // 부분 업데이트 모드면 별도 처리
  if (mode === "partialUpdate") {
    performPartialUpdate();
    return;
  }

  // 전체 저장 로직
  const startTime = performance.now();
  const updatedData = gatherUpdatedTableData();

  // id 컬럼은 제외
  const dataToSave = updatedData.map(row => {
    const newRow = { ...row };
    delete newRow["id"];
    return newRow;
  });

  showLoading();
  ajaxCall("/save_data.php", { mode, data: dataToSave }, (response) => {
    alert("저장 성공: " + response.message);
    sessionStorage.removeItem("modifiedData"); // sessionStorage에 있던 수정 내용 초기화
    hideLoading();

    const endTime = performance.now();
    const elapsedMs = (endTime - startTime).toFixed(2);
    console.log(`[저장하기] 걸린 시간: ${elapsedMs} ms`);
  });
}

/**
 * 부분 업데이트(수정하기) Ajax 호출
 */
function performPartialUpdate() {
  const modifiedData = getModifiedData();
  if (Object.keys(modifiedData).length === 0) {
    alert("수정된 항목이 없습니다.");
    return;
  }

  showLoading();
  $.ajax({
    url: "/save_data.php",
    method: "POST",
    data: JSON.stringify({
      mode: "partialUpdate",
      modified: modifiedData
    }),
    contentType: "application/json; charset=utf-8",
    success: function(resp) {
      if (resp.success) {
        alert("수정 성공!");

        clearMemoryAndSession();

        // 부분 업데이트 끝났으니, 복호화 모드로 재로드
        switchToDecryptedMode();

      } else {
        alert("수정 실패: " + resp.message);
      }
    },
    error: function(err) {
      console.error("서버 오류:", err);
      alert("서버 통신 오류가 발생했습니다.");
    },
    complete: function() {
      hideLoading();
    }
  });
}

/**
 * 서버로 엑셀 내보내기 (단순 링크 이동)
 * (mode: plainExport, encryptExport 등)
 */
function performExport() {
  const mode = appState.currentMode || "plainExport";
  showLoading();

  // 다운로드 트리거
  window.location.href = "/export_data.php?mode=" + encodeURIComponent(mode);

  // 2초 후 로딩 스피너 숨김 (간단 처리)
  setTimeout(() => hideLoading(), 2000);
}

/**
 * 클라이언트 측에서 엑셀 파일로 내보내기
 * @param {Array} data - 내보낼 데이터(배열 of 객체)
 * @param {string} fileName - 파일명
 */
function exportToExcelClientSide(data, fileName) {
  showLoading();

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, fileName);

  setTimeout(() => hideLoading(), 2000);
}

/**
 * loadDecrypted 모드에서 임시저장 API 호출 (Blob 다운로드)
 */
function performExportDecrypted() {
  const modifiedData = getModifiedData();

  showLoading();
  $.ajax({
    url: "/export_data.php",
    method: "POST",
    data: JSON.stringify({
      currentMode: appState.currentMode,
      modifiedData: modifiedData
    }),
    contentType: "application/json; charset=utf-8",
    xhrFields: {
      responseType: "blob" // 응답을 Blob으로 받기
    },
    success: function(blob, status, xhr) {
      // 파일 이름 추출
      let filename = "";
      const disposition = xhr.getResponseHeader("Content-Disposition");
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }
      if (!filename) {
        filename = "download.xlsx";
      }

      // Blob URL 생성 후 다운로드
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // 모달 닫기
      $("#saveOptionModal").modal("hide");
      hideLoading();

      console.log("서버 응답:", xhr);
    },
    error: function(xhr, status, error) {
      console.error("서버 오류:", error);
      alert("임시저장 중 오류가 발생했습니다.");
      hideLoading();
    }
  });
}

/**
 * sessionStorage에서 수정 내용을 복원
 * (페이지 로드 시 불러올 수 있음)
 */
function restoreFromSessionStorage() {
  const stored = sessionStorage.getItem("modifiedDataBackup");
  if (stored) {
    try {
      // 세션스토리지에 백업된 내용을 메모리에 반영
      appState.modifiedData = JSON.parse(stored);
      console.log("sessionStorage에서 복원 완료:", appState.modifiedData);
    } catch (e) {
      console.error("복원 오류:", e);
      appState.modifiedData = {};
    }
  } else {
    appState.modifiedData = {};
  }
}

/**
 * 부분 업데이트 후 복호화 모드로 전환하는 로직
 * (기존 "불러오기(복호화)" 버튼 동작을 함수로 추출한 예)
 */
function switchToDecryptedMode() {
  appState.currentMode = "loadDecrypted";

  resetDataTable();
  const columns = generateColumns(120);
  appState.excelDataTable = createDataTable({
    ajaxUrl: "/load_decrypted_data.php",
    columns,
    pageLength: 25,
    disableFirstColEdit: true 
  });

  updateEditButtonState();
}


/**
 * ========================================================
 * 5. 기타 기능: 초기화 / DB 삭제
 * ========================================================
 */

/**
 * 테이블/수정 내용/파일 입력 초기화
 */
function performInitialize() {
  showLoading();
  resetDataTable();
  sessionStorage.removeItem("modifiedData"); // sessionStorage 정리
  $("#excelFileInput").val(""); // 업로드 파일 입력 리셋(선택 사항)
  hideLoading();
  alert("초기화가 완료되었습니다.");
}

/**
 * DB 삭제 (서버의 특정 테이블 지우기 등)
 */
function performDeleteFromDb() {
  showLoading();
  $.ajax({
    url: "/clearTable.php", // 실제 서버 URL에 맞게 수정
    method: "POST",
    dataType: "json",
    success: function(response) {
      if (response.success) {
        alert("DB 삭제 성공: " + response.message);
        performInitialize();
      } else {
        alert("DB 삭제 실패: " + response.message);
      }
    },
    error: function(xhr, status, error) {
      console.log("서버 오류: ", error);
      alert("서버 통신 오류가 발생했습니다.");
    },
    complete: function() {
      hideLoading();
    }
  });
}

/**
 * ========================================================
 * 6. 로딩 스피너
 * ========================================================
 */

/** 로딩 스피너 표시 */
function showLoading() {
  $("#loadingSpinner").show();
}

/** 로딩 스피너 숨김 */
function hideLoading() {
  $("#loadingSpinner").hide();
}

/**
 * ========================================================
 * 7. 버튼 / 모달 등 이벤트 핸들러 초기화
 * ========================================================
 */

/**
 * 버튼, 테이블 이벤트, 모달 이벤트 등을 한곳에서 초기화
 */
function initEventHandlers() {
  // 테이블 셀 수정(blur) 이벤트를 tbody에 위임
  $("#excelTable tbody").on("blur", "td[contenteditable='true']", onCellBlur);

  // "불러오기(원본)" 버튼 클릭 => 서버사이드 DataTables 로딩
  $("#loadOriginalBtn").on("click", function() {
    appState.currentMode = "loadOriginal";

    resetDataTable();

    clearMemoryAndSession();

    const columns = generateColumns(120);
    // 서버에서 암호화된 데이터 불러오기
    appState.excelDataTable = createDataTable({
      ajaxUrl: "/load_encrypted_data.php",
      columns,
      pageLength: 25,
      disableAllEdit: true // 모든 열 수정 불가
    });

    // 버튼 상태 업데이트
    updateEditButtonState();
  });

  // "불러오기(복호화)" 버튼 클릭 => 서버사이드 DataTables 로딩
  $("#loadDecryptedBtn").on("click", function() {
    appState.currentMode = "loadDecrypted";

    resetDataTable();

    clearMemoryAndSession();

    const columns = generateColumns(120);
    // 서버에서 복호화된 데이터 불러오기
    appState.excelDataTable = createDataTable({
      ajaxUrl: "/load_decrypted_data.php",
      columns,
      pageLength: 25,
      // id 컬럼 편집 불가
      disableFirstColEdit: true 
    });

    // "수정하기" 버튼 가능
    updateEditButtonState();
  });

  // "저장하기"(또는 "수정하기") 버튼 클릭
  $("#saveBtn").on("click", function() {
    const btnText = $(this).text().trim();
    if (btnText === "수정하기") {
      // 부분 업데이트 모드
      appState.currentMode = "partialUpdate";
      performSave();
    } else {
      // plainSave, encryptSave, upload 등 모달로 선택
      $("#plainSaveBtn, #encryptSaveBtn").show();
      $("#plainExportBtn, #encryptExportBtn, #exportExcelBtn").hide();
      $("#saveOptionModal").modal("show");
    }
  });

  // "되돌리기" 버튼
  $("#undoBtn").on("click", function() {
    const mode = appState.currentMode;
  
    if (mode === "loadDecrypted") {
      // 1) sessionStorage 백업 불러와서 appState.modifiedData 덮어쓰기
      const stored = sessionStorage.getItem("modifiedDataBackup") || "{}";
      let backupObj = {};
      try {
        backupObj = JSON.parse(stored);
      } catch(e) {
        console.error("되돌리기 parse 오류:", e);
        backupObj = {};
      }
      appState.modifiedData = backupObj;
      
      switchToDecryptedMode();
  
    }
    else if (mode === "upload") {
      // 1) sessionStorage 백업 불러오기
      const stored = sessionStorage.getItem("modifiedDataBackup") || "{}";
      let backupObj = {};
      try {
        backupObj = JSON.parse(stored);
      } catch(e) {
        console.error("되돌리기 parse 오류:", e);
        backupObj = {};
      }
      // 2) 수정사항 덮어쓰기
      appState.modifiedData = backupObj;

      // 3) 테이블 재렌더링 (renderTableData)
      //    파일명/시트명 인자는 굳이 없어도 되지만, 표시용으로 전달 가능
      resetDataTable();
      renderTableData("되돌리기", "(undo)");
    }
    else {
      alert("이 모드에서는 되돌리기를 지원하지 않습니다.");
    }
  });
 

  // "내보내기" 버튼 클릭 => 내보내기 모달 열기
  $("#exportBtn").on("click", function(){
    $("#plainSaveBtn, #encryptSaveBtn").hide();
    $("#plainExportBtn, #encryptExportBtn, #exportExcelBtn").show();
    $("#saveOptionModal").modal("show");
  });

  // "삭제하기" 버튼 클릭 => 삭제 옵션 모달 열기
  $("#deleteBtn").on("click", function() {
    $("#deleteOptionModal").modal("show");
  });

  // 모달 내 버튼들 (평문 저장 / 암호화 저장)
  $("#plainSaveBtn").on("click", function() {
    appState.currentMode = "plainSave";
    $("#saveOptionModal").modal("hide");
    performSave();
  });
  $("#encryptSaveBtn").on("click", function() {
    appState.currentMode = "encryptSave";
    $("#saveOptionModal").modal("hide");
    performSave();
  });

  // 모달 내 버튼들 (평문 내보내기 / 암호화 내보내기)
  $("#plainExportBtn").on("click", function(){
    appState.currentMode = "plainExport";
    $("#saveOptionModal").modal("hide");
    performExport();
  });
  $("#encryptExportBtn").on("click", function(){
    appState.currentMode = "encryptExport";
    $("#saveOptionModal").modal("hide");
    performExport();
  });

  // 임시저장 버튼 클릭 시 saveToSessionStorage() 호출
  $("#tempSaveBtn").on("click", saveToSessionStorage);

  // "임시저장" 버튼 (엑셀 내보내기 or 서버 Blob 다운로드)
  $("#exportExcelBtn").on("click", function() {
    if (appState.currentMode === "upload") {
      // 업로드 후 테이블에 직접 렌더링된 경우
      const originalData = appState.excelDataTable.rows().data().toArray();
      const modifiedData = getModifiedData();
      // 병합
      const mergedData = originalData.map(row => {
        const rowId = row.id;
        return modifiedData[rowId] ? { ...row, ...modifiedData[rowId] } : row;
      });
      // 클라이언트에서 엑셀로 내보내기
      exportToExcelClientSide(mergedData, "임시저장_데이터.xlsx");
      console.log("임시저장 - upload 모드: 데이터가 임시저장되었습니다.");

    } else if (appState.currentMode === "loadOriginal") {
      // loadOriginal 모드 -> 암호화 내보내기로 전환
      appState.currentMode = "encryptExport";
      performExport();

    } else if (appState.currentMode === "loadDecrypted") {
      // 복호화 모드 -> Decrypted 내보내기(Blob)
      performExportDecrypted();

    } else {
      console.warn("알 수 없는 모드:", appState.currentMode);
    }
  });

  // 삭제 모달 내 "초기화" 버튼
  $("#initializeBtn").on("click", function() {
    $("#deleteOptionModal").modal("hide");
    performInitialize();
  });

  // 삭제 모달 내 "DB 삭제" 버튼
  $("#deleteFromDbBtn").on("click", function() {
    $("#deleteOptionModal").modal("hide");
    performDeleteFromDb();
  });
}

function updateEditButtonState() {
  // 현재 모드
  const mode = appState.currentMode; // "loadOriginal", "loadDecrypted", "upload" 등

  // 메모리에 수정사항이 있는지
  const modDataNotEmpty = Object.keys(appState.modifiedData).length > 0;

  // sessionStorage 백업(`modifiedDataBackup`)이 있는지
  let backupObj = {};
  let backupNotEmpty = false;

  const backupStr = sessionStorage.getItem("modifiedDataBackup");
  if (backupStr) {
    try {
      const backupObj = JSON.parse(backupStr);
      backupNotEmpty = Object.keys(backupObj).length > 0;
    } catch (e) {
      console.error("sessionStorage JSON 파싱 오류:", e);
    }
  }

  // 버튼 참조
  const $saveBtn = $("#saveBtn");       // “수정하기” / “저장하기”
  const $tempSaveBtn = $("#tempSaveBtn"); // “임시저장” 버튼
  const $undoBtn = $("#undoBtn");

  // 우선 기본값(모두 비활성 + "저장하기" 텍스트)으로 세팅
  // 이후 조건에 따라 활성화/텍스트 수정
  $saveBtn.text("저장하기").prop("disabled", true);
  $tempSaveBtn.prop("disabled", true);
  $undoBtn.prop("disabled", true);

  // -----------------------------
  // CASE 1~4: loadOriginal
  // -----------------------------
  if (mode === "loadOriginal") {
    // 원본 모드 => 항상 편집 불가
    // => "저장하기" 비활성, "임시저장" 비활성
    // 이미 기본값으로 모두 비활성

    return; // 더 이상 할 필요 없음
  }

  // -----------------------------
  // CASE 5~8: loadDecrypted
  // -----------------------------
  else if (mode === "loadDecrypted") {
    // 복호화 모드 => 편집 가능 -> "수정하기" 텍스트
    $saveBtn.text("수정하기");

    // Case 5: (메모리 empty, 백업 empty)
    if (!modDataNotEmpty && !backupNotEmpty) {
      // 수정사항 전혀 없으므로 "수정하기" 비활성, "임시저장" 비활성
      $saveBtn.prop("disabled", true);
      // 이미 기본값이 비활성이므로 추가 조치 X
    } 
    // Case 6: (메모리 empty, 백업 not empty)
    else if (!modDataNotEmpty && backupNotEmpty) {
      // 수정하기: 활성, 임시저장: 비활성
      $saveBtn.prop("disabled", false);
      // $tempSaveBtn 여전히 disabled
    }
    // Case 7: (메모리 not empty, 백업 empty)
    else if (modDataNotEmpty && !backupNotEmpty) {
      // 수정하기: 활성, 임시저장: 활성
      $saveBtn.prop("disabled", false);
      $tempSaveBtn.prop("disabled", false);
    }
    // Case 8: (메모리 not empty, 백업 not empty)
    else if (modDataNotEmpty && backupNotEmpty) {
      // 수정하기: 활성, 임시저장: 활성
      $saveBtn.prop("disabled", false);
      $tempSaveBtn.prop("disabled", false);
    }
  }

  // -----------------------------
  // CASE 9~12: upload
  // -----------------------------
  else if (mode === "upload") {
    // 업로드된 엑셀 => "저장하기" 텍스트
    // 편집 가능, 수정사항 있으면 전체 저장
    // 우선 저장하기 버튼 enable로 (case 9~12 모두)
    $saveBtn.text("저장하기").prop("disabled", false);

    // 그 뒤 임시저장 버튼은 case별로
    // Case 9: (empty, empty) => 임시저장 disabled
    // Case 10: (empty, not empty) => 임시저장 disabled
    // Case 11: (not empty, empty) => 임시저장 enable
    // Case 12: (not empty, not empty) => 임시저장 enable

    if (!modDataNotEmpty && !backupNotEmpty) {
      // 그대로 임시저장 비활성
    } 
    else if (!modDataNotEmpty && backupNotEmpty) {
      // 임시저장 비활성
    } 
    else if (modDataNotEmpty && !backupNotEmpty) {
      // 임시저장 활성
      $tempSaveBtn.prop("disabled", false);
    } 
    else if (modDataNotEmpty && backupNotEmpty) {
      // 임시저장 활성
      $tempSaveBtn.prop("disabled", false);
    }
  }

  if (isDataDifferent(appState.modifiedData, backupObj)) {
    $undoBtn.prop("disabled", false);
  }
}

/**
 * ========================================================
 * 8. 문서 준비 시점
 * ========================================================
 */
$(document).ready(function() {
  // 페이지 로드시, 기존에 임시저장된 sessionStorage 데이터 복원
  restoreFromSessionStorage();

  // 이벤트 핸들러들 초기화
  initEventHandlers();

  // 필요 시 추가 초기화 (버튼 상태 등)
  // $("#saveBtn").prop("disabled", true);
});
