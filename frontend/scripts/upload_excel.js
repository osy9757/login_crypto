/*******************************************************
 * upload_excel.js
 *  - 파일 선택 시, Web Worker(excel_worker.js)에 파일 파싱
 *  - 파싱 결과(2차원 배열)를 원본에 저장 + (선택) 일부 페이지만 DataTables 렌더링
 *******************************************************/

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  clearMemoryAndSession();

  showLoading();

  const startTime = Date.now();
  const reader = new FileReader();

  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    const worker = new Worker("../scripts/excel_worker.js");

    worker.onmessage = function(msgEvent) {

      hideLoading();

      const message = msgEvent.data;
      if (message.success) {
        const { sheetName, data } = message; // data: 2차원 배열

        // 1) 업로드 모드
        appState.currentMode = "upload";

        // 2) 2D -> 객체 배열 (한 번만)
        //    이후 "renderTableData()"에서 중복 변환 안 함
        storeExcelAsObjectArray(data);  

        // 3) 테이블 렌더링(객체 배열 그대로 사용)
        renderTableData(file.name, sheetName);

        const endTime = Date.now();
        alert(`"${file.name}" 파싱 완료: ${endTime - startTime}ms`);
      } else {
        alert("엑셀 파싱 실패: " + message.error);
      }
      worker.terminate();
    };

    worker.postMessage(arrayBuffer);
  };

  reader.readAsArrayBuffer(file);
}

/** 2차원 배열을 "객체 배열"로 변환 → appState.originalExcelData 저장 */
function storeExcelAsObjectArray(jsonData) {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    appState.originalExcelData = [];
    return;
  }
  const headers = jsonData[0];
  const bodyRows = jsonData.slice(1);

  const converted = bodyRows.map((row, idx) => {
    let obj = {};
    headers.forEach((header, colIdx) => {
      if (colIdx === 0) {
        obj["id"] = (row[colIdx] !== undefined) ? row[colIdx] : (idx + 1);
      } else {
        obj[header] = row[colIdx];
      }
    });
    return obj;
  });

  appState.originalExcelData = converted;
  console.log("storeExcelAsObjectArray: row count =", converted.length);
}
