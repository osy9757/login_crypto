<div class="container">
  <!-- 기존 섹션들 -->
  
  <!-- 엑셀 파싱 테스트 섹션 -->
  <div class="card mt-4">
    <div class="card-header">
      <h2>테스트 항목 1: 엑셀 파싱</h2>
    </div>
    <div class="card-body">
      <p>대용량 엑셀 파일 파싱 성능을 테스트합니다. 파일을 선택하고 "파싱" 버튼을 클릭하세요.</p>
      
      <div class="mb-3">
        <div class="input-group">
          <div class="custom-file">
            <input type="file" class="custom-file-input" id="excel-file-input" accept=".xlsx,.xls">
            <label class="custom-file-label" for="excel-file-input">파일 선택...</label>
          </div>
          <div class="input-group-append">
            <button class="btn btn-primary" type="button" id="excel-parse-btn" disabled>파싱</button>
          </div>
        </div>
        <small class="form-text text-muted">
          지원 형식: .xlsx, .xls (Excel 97-2003 이상)
        </small>
      </div>
      
      <!-- 로딩 스피너 -->
      <div id="excel-loading-spinner" class="text-center my-3 d-none">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">로딩 중...</span>
        </div>
        <p class="mt-2">대용량 파일 처리 중입니다. 잠시만 기다려주세요...</p>
      </div>
      
      <!-- 메트릭 표시 영역 -->
      <div id="excel-parse-metrics"></div>
      
      <!-- 결과 테이블 -->
      <div id="excel-result-table"></div>
    </div>
  </div>
  
  <!-- 기존 섹션들 계속... -->
</div> 