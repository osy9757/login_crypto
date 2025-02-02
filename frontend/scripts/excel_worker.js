/*******************************************************
 * excel_worker.js
 *  - Web Worker에서 XLSX 라이브러리를 사용하여
 *    대용량 엑셀 파일을 파싱 (메인 스레드와 분리)
 *******************************************************/

/**
 * importScripts로 CDN의 XLSX 라이브러리를 로드한다.
 * (CORS 이슈가 있을 수 있으니, 실무에서는 자체 호스팅/번들링 권장)
 */
importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

self.onmessage = function (e) {
  try {
    console.log("excel_worker");
    // e.data에는 ArrayBuffer 형태의 엑셀 파일 바이너리가 들어있음
    const arrayBuffer = e.data;
    const data = new Uint8Array(arrayBuffer);
    
    // XLSX 파싱
    const workbook = XLSX.read(data, { type: 'array' });
    
    // 첫번째 시트명
    const sheetName = workbook.SheetNames[0];
    // 첫번째 시트 object
    const worksheet = workbook.Sheets[sheetName];
    
    // 2차원 배열 형태로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 성공적으로 파싱한 데이터를 메인 스레드에 전달
    self.postMessage({
      success: true,
      sheetName: sheetName,
      data: jsonData
    });
  } catch (error) {
    // 에러 발생 시 메인 스레드에 통보
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};
