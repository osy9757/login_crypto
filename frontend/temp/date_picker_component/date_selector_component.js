/**
 * 통합 날짜 선택기 Web Component
 * date_selector_component.js
 * 월별 및 날짜별 선택 UI를 캡슐화하는 커스텀 요소를 정의합니다.
 */
class DateSelectorComponent extends HTMLElement {
  constructor() {
    super();
    
    // 기본 크기 설정
    this._width = '90%';
    this._maxWidth = '800px';

    // 선택 모드 (month 또는 date)
    this._selectMode = 'month';
    // 최대 일 수 제한
    this._maxDays = null;

    // 현재 연도
    this._currentYear = new Date().getFullYear();
    
    // 선택된 날짜 저장
    this._startDate = new Date();
    this._endDate = new Date();

    // 선택 가능한 날짜 범위
    this._minSelectableDate = null;
    this._maxSelectableDate = null;
    
    // 선택 불가능한 기간 목록
    this._disabledDateRanges = [];
    
    // 템플릿 생성
    this.attachTemplate();
    
    // DOM 요소 참조 저장
    this.cacheElements();
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
    
    // 초기 스타일 적용
    this.updateStyles();
  }
  
  // 관찰할 속성 목록을 반환하는 정적 메서드
  static get observedAttributes() {
    return ['width', 'max-width', 'current-year', 'select-mode', 'max-days', 'min-selectable-date', 'max-selectable-date', 'disabled-date-ranges'];
  }

  updateDateRanges() {
    this.updateUIForMode();
  } 
  
  // 속성이 변경되었을 때 호출되는 메서드
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'width') {
      this._width = newValue;
      this.updateStyles();
    } else if (name === 'max-width') {
      this._maxWidth = newValue;
      this.updateStyles();
    } else if (name === 'current-year') {
      this._currentYear = parseInt(newValue) || new Date().getFullYear();
      this.updateYearDisplay();
    } else if (name === 'select-mode') {
      this._selectMode = newValue;
      this.updateUIForMode();
    } else if (name === 'max-days') {
      this._maxDays = newValue ? parseInt(newValue) : null;
      // 월별 모드인 경우
      if (this._selectMode === 'month') {
        if (this.endMonthSelect) {
          this.renderMonthButtons(
            this.endMonthGrid,
            parseInt(this.endYearSelect.textContent),
          'end'
          );
        }
      } else {
        // 날짜 모드인 경우
        if (this.endCalendarGrid) {
          const year = parseInt(this.endYearSelect.textContent);
          const month = parseInt(this.endMonthSelect.textContent) - 1;
          this.renderCalendar('end', year, month);
        }
      }
    } else if (name === 'min-selectable-date') {
      // 최소 선택 가능 날짜 설정
      if (newValue) {
        this._minSelectableDate = new Date(newValue);
      } else {
        this._minSelectableDate = null;
      }
      this.updateUIForMode();
    } else if (name === 'max-selectable-date') {  
      // 최대 선택 가능 날짜 설정
      if (newValue) {
        this._maxSelectableDate = new Date(newValue);
      } else {
        this._maxSelectableDate = null;
      }
      this.updateUIForMode();
    } else if (name === 'disabled-date-ranges') {
      // 선택 불가능한 기간 설정
      try {
        if(newValue) {
          const parsedRanges = JSON.parse(newValue);
          this.setDisabledDateRanges(parsedRanges.map(range => ({
            startDate: new Date(range.start || range.startDate),
            endDate: new Date(range.end || range.endDate)
          })));
        } else {
          this._disabledDateRanges = [];
        }
        this.updateDateRanges();
      } catch (error) {
        console.error('disabled-date-ranges 속성 파싱 오류:', error);
        this._disabledDateRanges = [];  
      }
    }
  }

  // 선택 불가능한 기간 설정 메서드
  setDisabledDateRanges(ranges) {
    if (Array.isArray(ranges)) {
      this._disabledDateRanges = ranges.map(range => ({
        startDate: new Date(range.startDate),
        endDate: new Date(range.endDate)
      }));
      
      this.updateUIForMode();
    }
  }

  // 선택 불가능한 기간에 포함되는지 확인
  isDateInDisabledRanges(date) {
    if (!this._disabledDateRanges.length) return false;
    
    // 시간 정보 제거
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const dateTime = checkDate.getTime();
    
    return this._disabledDateRanges.some(range => {
      // 각 범위의 시작일과 종료일도 시간 정보 제거
      const startDate = new Date(range.startDate);
      startDate.setHours(0, 0, 0, 0);
      const startTime = startDate.getTime();
      
      const endDate = new Date(range.endDate);
      endDate.setHours(0, 0, 0, 0);
      const endTime = endDate.getTime();
      
      return dateTime >= startTime && dateTime <= endTime;
    });
  }

  // 시작일과 종료일 사이에 선택 불가능한 기간이 있는지 확인
  hasDisabledPeriodBetween(startDate, endDate) {
    if (!this._disabledDateRanges.length) return false;
    
    // 시간 정보 제거
    const checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);
    const startTime = checkStartDate.getTime();
    
    const checkEndDate = new Date(endDate);
    checkEndDate.setHours(0, 0, 0, 0);
    const endTime = checkEndDate.getTime();
    
    return this._disabledDateRanges.some(range => {
      // 각 범위의 시작일과 종료일도 시간 정보 제거
      const rangeStartDate = new Date(range.startDate);
      rangeStartDate.setHours(0, 0, 0, 0);
      const rangeStartTime = rangeStartDate.getTime();
      
      const rangeEndDate = new Date(range.endDate);
      rangeEndDate.setHours(0, 0, 0, 0);
      const rangeEndTime = rangeEndDate.getTime();
      
      return (
        (rangeStartTime >= startTime && rangeStartTime <= endTime) ||
        (rangeEndTime >= startTime && rangeEndTime <= endTime) ||
        (rangeStartTime <= startTime && rangeEndTime >= endTime)
      );
    });
  }

  // 특정 연도에 선택 불가능한 월 목록 가져오기
  getDisabledMonthsForYear(year) {
    if (!this._disabledDateRanges.length) return [];
    
    const disabledMonths = new Set();
    
    this._disabledDateRanges.forEach(range => {
      const startYear = range.startDate.getFullYear();
      const endYear = range.endDate.getFullYear();
      
      if (year < startYear || year > endYear) return;
      
      const startMonth = year === startYear ? range.startDate.getMonth() : 0;
      const endMonth = year === endYear ? range.endDate.getMonth() : 11;
      
      for (let month = startMonth; month <= endMonth; month++) {
        disabledMonths.add(month);
      }
    });
    
    return Array.from(disabledMonths);
  }




  setSelectableDateRange(minDate, maxDate) {
    if(minDate) {
      this._minSelectableDate = new Date(minDate);
    } 
    if(maxDate) {
      this._maxSelectableDate = new Date(maxDate);
    }
    this.updateUIForMode();
  }
  
  // 스타일 직접 업데이트
  updateStyles() {
    // 요소 자체에 스타일 적용
    this.style.width = this._width;
    this.style.maxWidth = this._maxWidth;
  }
  
  // 템플릿 생성 및 추가
  attachTemplate() {
    // 내부 스타일 추가
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      /* Web Component 공통 스타일 */
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      .modal-container {
        background-color: #fff;
        overflow: hidden;
        padding: 20px;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 10px 20px 10px;
      }
      
      .modal-title {
        font-size: 18px;
        font-weight: bold;
        color: #333;
      }
      
      .close-button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #333;
        padding: 0;
        line-height: 1;
      }
      
      .calendar-container {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .calendar-section {
        flex: 1;
        background-color: #f9f9f9;
        border-radius: 10px;
        padding: 20px;
      }
      
      .calendar-header {
        text-align: center;
        margin-bottom: 20px;
        font-weight: 600;
        color: #333;
      }
      
      .year-selector {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 20px;
        position: relative;
      }
      
      .year-select, .month-select {
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 15px;
        margin: 0 5px;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23333' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: calc(100% - 8px) center;
        background-color: #fff;
        min-width: 90px;
        text-align: center;
        cursor: pointer;
        position: relative;
      }

      /* 네비게이션 버튼들에 대한 마진 추가 */
      .nav-button.prev-year-start,
      .nav-button.prev-year-end {
        margin-right: 20px; /* 왼쪽 버튼과 선택 박스 사이의 간격 */
      }

      .nav-button.next-year-start,
      .nav-button.next-year-end {
        margin-left: 20px; /* 오른쪽 버튼과 선택 박스 사이의 간격 */
      }

      .dropdown {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 100px;
        max-height: 200px;
        overflow-y: auto;
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        display: none;
        margin-top: 5px;
      }
      
      .dropdown.show {
        display: block;
      }
      
      .dropdown-option {
        padding: 8px 12px;
        cursor: pointer;
        text-align: center;
      }
      
      .dropdown-option:hover {
        background-color: #f5f5f5;
      }
      
      .dropdown-option.selected {
        background-color: #e6f0ff;
      }
      
      .nav-button {
        background: none;
        border: 1px solid #ddd;
        border-radius: 6px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 16px;
        color: #555;
        background-color: #fff;
        transition: background-color 0.2s;
      }
      
      .nav-button:hover {
        background-color: #f0f0f0;
      }
      
      /* 월별 선택 스타일 */
      .month-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      
      .month-button {
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 12px 0;
        width: 90%;
        font-size: 15px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
      }
      
      .month-button:hover {
        background-color: #f0f8ff;
      }
      
      .month-button.selected {
        background-color: #2563eb;
        color: white;
        border-color: #2563eb;
      }

      .month-button.disabled {
        background-color: #e9ecef;
        border-color: #ddd;
        color: #999;
        cursor: not-allowed;
        pointer-events: none;
      }
      
      /* 날짜 선택 스타일 */
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 5px;
        background-color: #f9f9f9;
        padding: 0;
      }

      .weekday {
        text-align: center;
        font-weight: 500;
        padding: 10px 0;
        font-size: 14px;
      }

      .weekday:first-child {
        color: #e53935;
      }

      .weekday:last-child,
      .calendar-grid .weekday:nth-child(7) {
        color: #4373c5 !important;
      }

      .day {
        text-align: center;
        padding: 10px 0;
        cursor: pointer;
        font-size: 14px;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
      }

      .day:hover {
        background-color: #e6edf9;
      }

      .day.sunday {
        color: #e53935;
      }

      .day.saturday {
        color: #4373c5;
      }

      .day.other-month {
        color: #bbb;
      }

      .day.selected {
        background-color: #2563eb;
        color: white !important;
        font-weight: 600;
      }

      .day.in-range {
        background-color: #e6edf9;
        color: #333;
      }

      .day.disabled {
        color: #ccc;
        cursor: not-allowed;
        pointer-events: none;
        opacity: 0.5;
      }
      
      /* 선택 정보 영역 */
      .selection-info {
        display: flex;
        padding: 15px 20px;
        background-color: #fff;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin-bottom: 25px;
        align-items: center;
      }
      
      .selection-label {
        font-weight: 600;
        margin-right: 15px;
        color: #333;
        min-width: 80px;
      }
      
      .selection-dates {
        font-weight: 500;
        color: #333;
      }
      
      /* 버튼 영역 */
      .button-area {
        display: flex;
        justify-content: center;
        padding: 10px 0;
      }
      
      .confirm-button {
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 40px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        width: 30%;
        min-width: 120px;
      }
      
      .confirm-button:hover {
        background-color: #1d4ed8;
      }
      
      /* UI 모드에 따른 표시/숨김 설정 */
      .month-view-element {
        display: none;
      }
      
      .date-view-element {
        display: none;
      }
      
      .show-month-view .month-view-element {
        display: block;
      }
      
      .show-date-view .date-view-element {
        display: block;
      }
      
      /* 각 모드에 따른 그리드 표시 설정 */
      .show-month-view .month-grid {
        display: grid;
      }
      
      .show-date-view .calendar-grid {
        display: grid;
      }
    `;
    
    this.appendChild(this.styleElement);
    
    // HTML 템플릿 추가
    this.innerHTML += `
      <div class="modal-container show-month-view" id="modalContainer">
        <div class="modal-header">
          <div class="modal-title">날짜선택</div>
          <button class="close-button">×</button>
        </div>
        
        <div class="calendar-container">
          <!-- 시작일/월 선택 섹션 -->
          <div class="calendar-section">
            <!-- 월별 모드에서 사용 -->
            <div class="calendar-header month-view-element">조회 시작월</div>
            <!-- 날짜 모드에서 사용 -->
            <div class="calendar-header date-view-element">조회 시작일</div>
            
            <!-- 공통 네비게이션 -->
            <div class="year-selector">
              <button class="nav-button prev-year-start">＜</button>
              <div class="year-select" id="startYearSelect"></div>
              
              <!-- 날짜 모드에서 표시되는 월 선택기 -->
              <div class="month-select date-view-element" id="startMonthSelect"></div>
              
              <button class="nav-button next-year-start">＞</button>
            </div>
            
            <!-- 월별 선택 그리드 -->
            <div class="month-grid month-view-element" id="startMonthGrid">
              <!-- 월 버튼은 JavaScript로 생성됩니다 -->
            </div>
            
            <!-- 날짜 선택 그리드 -->
            <div class="calendar-grid date-view-element" id="startCalendarGrid">
              <div class="weekday">일</div>
              <div class="weekday">월</div>
              <div class="weekday">화</div>
              <div class="weekday">수</div>
              <div class="weekday">목</div>
              <div class="weekday">금</div>
              <div class="weekday">토</div>
              <!-- 날짜는 JavaScript로 생성됩니다 -->
            </div>
          </div>
          
          <!-- 종료일/월 선택 섹션 -->
          <div class="calendar-section">
            <!-- 월별 모드에서 사용 -->
            <div class="calendar-header month-view-element">조회 종료월</div>
            <!-- 날짜 모드에서 사용 -->
            <div class="calendar-header date-view-element">조회 종료일</div>
            
            <!-- 공통 네비게이션 -->
            <div class="year-selector">
              <button class="nav-button prev-year-end">＜</button>
              <div class="year-select" id="endYearSelect"></div>
              
              <!-- 날짜 모드에서 표시되는 월 선택기 -->
              <div class="month-select date-view-element" id="endMonthSelect"></div>
              
              <button class="nav-button next-year-end">＞</button>
            </div>
            
            <!-- 월별 선택 그리드 -->
            <div class="month-grid month-view-element" id="endMonthGrid">
              <!-- 월 버튼은 JavaScript로 생성됩니다 -->
            </div>
            
            <!-- 날짜 선택 그리드 -->
            <div class="calendar-grid date-view-element" id="endCalendarGrid">
              <div class="weekday">일</div>
              <div class="weekday">월</div>
              <div class="weekday">화</div>
              <div class="weekday">수</div>
              <div class="weekday">목</div>
              <div class="weekday">금</div>
              <div class="weekday">토</div>
              <!-- 날짜는 JavaScript로 생성됩니다 -->
            </div>
          </div>
        </div>
        
        <!-- 선택된 날짜 범위 표시 -->
        <div class="selection-info">
          <div class="selection-label">선택기간</div>
          <div class="selection-dates" id="selectionDates"></div>
        </div>
        
        <!-- 확인 버튼 -->
        <div class="button-area">
          <button id="confirmDateBtn" class="confirm-button">확인</button>
        </div>
      </div>
    `;
  }
  
  // DOM 요소 캐싱
  cacheElements() {
    // 모달 컨테이너
    this.modalContainer = this.querySelector('#modalContainer');
    
    // 모달 요소들
    this.closeButton = this.querySelector('.close-button');
    this.confirmButton = this.querySelector('#confirmDateBtn');
    
    // 연도/월 선택 요소들
    this.startYearSelect = this.querySelector('#startYearSelect');
    this.startMonthSelect = this.querySelector('#startMonthSelect');
    this.endYearSelect = this.querySelector('#endYearSelect');
    this.endMonthSelect = this.querySelector('#endMonthSelect');
    
    // 월 그리드 요소들
    this.startMonthGrid = this.querySelector('#startMonthGrid');
    this.endMonthGrid = this.querySelector('#endMonthGrid');
    
    // 달력 그리드 요소들
    this.startCalendarGrid = this.querySelector('#startCalendarGrid');
    this.endCalendarGrid = this.querySelector('#endCalendarGrid');
    
    // 선택 정보 요소
    this.selectionDates = this.querySelector('#selectionDates');
    
    // 네비게이션 버튼들
    this.prevYearStartBtn = this.querySelector('.prev-year-start');
    this.nextYearStartBtn = this.querySelector('.next-year-start');
    this.prevYearEndBtn = this.querySelector('.prev-year-end');
    this.nextYearEndBtn = this.querySelector('.next-year-end');
  }
  
  // 이벤트 리스너 설정
  setupEventListeners() {
    // 닫기 버튼 클릭 이벤트
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('close-picker'));
      });
    }
    
    // 확인 버튼 클릭 이벤트
    if (this.confirmButton) {
      this.confirmButton.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('confirm-dates', {
          detail: {
            startDate: this._startDate,
            endDate: this._endDate,
            formattedText: this.selectionDates.textContent
          }
        }));
      });
    }
    
    // 연도 선택 클릭 이벤트 - 커스텀 드롭다운 표시
    if (this.startYearSelect) {
      this.startYearSelect.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown(this.startYearSelect, 'year', 'start');
      });
    }
    
    if (this.endYearSelect) {
      this.endYearSelect.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown(this.endYearSelect, 'year', 'end');
      });
    }
    
    // 월 선택 클릭 이벤트 (날짜 모드)
    if (this.startMonthSelect) {
      this.startMonthSelect.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown(this.startMonthSelect, 'month', 'start');
      });
    }
    
    if (this.endMonthSelect) {
      this.endMonthSelect.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown(this.endMonthSelect, 'month', 'end');
      });
    }
    
    // 네비게이션 버튼 이벤트
    if (this.prevYearStartBtn) {
      this.prevYearStartBtn.addEventListener('click', () => {
        this._selectMode === 'month' 
          ? this.changeYear('start', -1) 
          : this.navigateMonth('start', -1);
      });
    }
    
    if (this.nextYearStartBtn) {
      this.nextYearStartBtn.addEventListener('click', () => {
        this._selectMode === 'month' 
          ? this.changeYear('start', 1) 
          : this.navigateMonth('start', 1);
      });
    }
    
    if (this.prevYearEndBtn) {
      this.prevYearEndBtn.addEventListener('click', () => {
        this._selectMode === 'month' 
          ? this.changeYear('end', -1) 
          : this.navigateMonth('end', -1);
      });
    }
    
    if (this.nextYearEndBtn) {
      this.nextYearEndBtn.addEventListener('click', () => {
        this._selectMode === 'month' 
          ? this.changeYear('end', 1) 
          : this.navigateMonth('end', 1);
      });
    }
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', () => {
      this.closeAllDropdowns();
    });
  }
  
  // UI 모드에 따른 화면 업데이트
  updateUIForMode() {
    // 모달 컨테이너의 클래스 업데이트
    if (this.modalContainer) {
      this.modalContainer.classList.remove('show-month-view', 'show-date-view');
      
      if (this._selectMode === 'month') {
        this.modalContainer.classList.add('show-month-view');
        this.initMonthView();
      } else {
        this.modalContainer.classList.add('show-date-view');
        this.initDateView();
      }
    }
  }
  
  // 컴포넌트가 DOM에 연결될 때 호출되는 메서드
  connectedCallback() {
    const today = new Date();
    this._currentYear = today.getFullYear();
    
    // 기본 날짜 초기화
    this._startDate = new Date(today);
    this._endDate = new Date(today);
    
    // 월 버튼 범위 스타일 추가
    const styleElement = this.querySelector('style');
    if (styleElement) {
      styleElement.textContent += `
        .month-button.in-range {
          background-color: #e6edf9;
          color: #333;
        }
      `;
    }
    
    // 초기 UI 설정
    this.updateUIForMode();
    
    // 컴포넌트가 연결되었음을 알리는 이벤트 발생
    this.dispatchEvent(new CustomEvent('component-connected'));
  }
  
  //=================== 월별 선택 관련 메서드 ===================//
  
  // 월별 선택 모드 초기화
  initMonthView() {
    // 초기 날짜 설정 (선택 가능 범위 내에서)
    let initialDate = new Date();
    
    if (this._minSelectableDate && initialDate < this._minSelectableDate) {
      initialDate = new Date(this._minSelectableDate);
    } else if (this._maxSelectableDate && initialDate > this._maxSelectableDate) {
      initialDate = new Date(this._maxSelectableDate);
    }
    
    const currentYear = initialDate.getFullYear();
    const currentMonth = initialDate.getMonth();
    
    // 연도 표시 초기화
    this.startYearSelect.textContent = currentYear;
    this.endYearSelect.textContent = currentYear;
    
    // 날짜 초기화 (월의 첫 날)
    this._startDate = new Date(currentYear, currentMonth, 1);
    this._endDate = new Date(currentYear, currentMonth, 1);
    
    // 월 버튼 렌더링
    this.renderMonthButtons(this.startMonthGrid, currentYear, 'start');
    this.renderMonthButtons(this.endMonthGrid, currentYear, 'end');
    
    // 초기 선택 설정
    this.selectMonth('start', currentYear, currentMonth);
    this.selectMonth('end', currentYear, currentMonth);
    
    // 선택 정보 업데이트
    this.updateMonthSelectionDisplay();
  }

  // 월별 선택 정보 표시 업데이트 메소드 수정
  updateMonthSelectionDisplay() {
    if (!this._startDate || !this._endDate || !this.selectionDates) return;
    
    const startYear = this._startDate.getFullYear();
    const startMonth = String(this._startDate.getMonth() + 1).padStart(2, '0');
    
    const endYear = this._endDate.getFullYear();
    const endMonth = String(this._endDate.getMonth() + 1).padStart(2, '0');
    
    // 선택 정보 텍스트 설정
    const formattedText = `${startYear}.${startMonth} ~ ${endYear}.${endMonth}`;
    this.selectionDates.textContent = formattedText;
    
    // 선택 변경 이벤트 발생
    this.dispatchEvent(new CustomEvent('selection-updated', {
      detail: {
        startDate: this._startDate,
        endDate: this._endDate,
        formattedText: formattedText
      }
    }));
  }
  
  // 월 버튼 렌더링
  renderMonthButtons(container, year, type) {
    if (!container) return;
    
    container.innerHTML = '';
  
    // 종료 섹션에서 시작월/년보다 이전 날짜 체크를 위한 변수들
    const isEndSection = (type === 'end');
    const startYear = this._startDate ? this._startDate.getFullYear() : null;
    const startMonth = this._startDate ? this._startDate.getMonth() : null;

    // 선택 불가능한 기간에 해당하는 월 비활성화
    const disabledMonths = this.getDisabledMonthsForYear(year);
  
    // max-days 계산을 위한 변수
    let maxAllowedDate = null;
    if (this._maxDays && this._startDate && isEndSection) {
      maxAllowedDate = new Date(this._startDate);
      maxAllowedDate.setDate(maxAllowedDate.getDate() + this._maxDays);
    }
  
    // 선택 가능한 월 범위 계산 (새로 추가)
    let minSelectableMonth = 0;
    let maxSelectableMonth = 11;
    
    // 최소 선택 가능 날짜가 설정되어 있고, 현재 연도와 같은 경우 최소 월 제한
    if (this._minSelectableDate && year === this._minSelectableDate.getFullYear()) {
      minSelectableMonth = this._minSelectableDate.getMonth();
    }
    
    // 최대 선택 가능 날짜가 설정되어 있고, 현재 연도와 같은 경우 최대 월 제한
    if (this._maxSelectableDate && year === this._maxSelectableDate.getFullYear()) {
      maxSelectableMonth = this._maxSelectableDate.getMonth();
    }
  
    // 1월부터 12월까지 버튼 생성
    for (let month = 0; month < 12; month++) {
      const button = document.createElement('button');
      button.className = 'month-button';
      button.textContent = month + 1;
      button.dataset.year = year;
      button.dataset.month = month;
  
      let isDisabled = false;
  
      // 선택 가능 범위 제한 적용 (새로 추가)
      if (year < this._minSelectableDate?.getFullYear() || 
          (year === this._minSelectableDate?.getFullYear() && month < minSelectableMonth) ||
          year > this._maxSelectableDate?.getFullYear() || 
          (year === this._maxSelectableDate?.getFullYear() && month > maxSelectableMonth)) {
        isDisabled = true;
      }

      // 선택 불가능한 기간에 해당하는 월 비활성화 체크
      if (!isDisabled && disabledMonths.includes(month)) {
        isDisabled = true;
      }
      
      // 종료 섹션에서는 시작월/년 이전 비활성화
      if (!isDisabled && isEndSection && this._startDate) {
        if (year < startYear || (year === startYear && month < startMonth)) {
          isDisabled = true;
        }
  
        // max-days 제한 적용
        if (maxAllowedDate && !isDisabled) {
          const buttonMonthLastDay = new Date(year, month + 1, 0); // 해당 월의 마지막 날
          if (buttonMonthLastDay > maxAllowedDate) {
            // 해당 월의 첫날이 max-days 이내인지 확인
            const buttonMonthFirstDay = new Date(year, month, 1);
            if (buttonMonthFirstDay > maxAllowedDate) {
              isDisabled = true; // 월 전체가 max-days를 초과
            }
          }
        }
        // 종료 달력에서 시작일과 종료일 사이에 불가능한 기간이 있는지 확인
        if (!isDisabled && isEndSection && this._startDate && this.hasDisabledPeriodBetween(this._startDate, new Date(year, month + 1, 0))) {
          isDisabled = true;
        }
      }
  
      if (isDisabled) {
        button.disabled = true;
        button.classList.add('disabled');
      } else {
        // 이벤트 리스너 등록
        button.addEventListener('click', () => {
          this.selectMonth(type, year, month);
        });
      }
  
      // 선택된 월 클래스 추가 (시작 섹션과 종료 섹션 분리)
      if (type === 'start' && this._startDate && 
          year === this._startDate.getFullYear() && 
          month === this._startDate.getMonth()) {
        button.classList.add('selected');
      } else if (type === 'end' && this._endDate && 
                 year === this._endDate.getFullYear() && 
                 month === this._endDate.getMonth()) {
        button.classList.add('selected');
      }  
    
      container.appendChild(button);
    }
  }
  
  // 월 선택 처리
  selectMonth(type, year, month) {
    const date = new Date(year, month, 1);
  
    // 종료월인데, 이미 설정된 시작월보다 과거라면 선택 불가
    if (type === 'end' && this._startDate && date < this._startDate) {
      return;
    }
  
    if (type === 'end' && this._maxDays && this.isMonthBeyondMaxDays(year, month)) {
      return;
    }
  
    if (type === 'start') {
      this._startDate = date;
    
      // 시작 날짜가 종료 날짜보다 이후라면, 종료 날짜도 동일하게 맞춤
      if (this._endDate && this._startDate > this._endDate) {
        this._endDate = new Date(this._startDate);
        this.renderMonthButtons(
          this.endMonthGrid,
          this._endDate.getFullYear(),
          'end'
        );
      } else {
        // 종료월 섹션을 다시 그려서 disabled 상태를 업데이트
        this.renderMonthButtons(
          this.endMonthGrid,
          parseInt(this.endYearSelect.textContent),
          'end'
        );
      }
    
      // 시작월 섹션도 다시 렌더링
      this.renderMonthButtons(this.startMonthGrid, year, 'start');
    
    } else if (type === 'end') {
      this._endDate = date;
    
      if (this._startDate && this._endDate < this._startDate) {
        this._startDate = new Date(this._endDate);
        this.renderMonthButtons(
          this.startMonthGrid,
          this._startDate.getFullYear(),
          'start'
        );
      }
    
      // 종료월 섹션 다시 렌더링
      this.renderMonthButtons(this.endMonthGrid, year, 'end');
    }
    
    // 월별 선택 상태 업데이트 (시작 항목과 종료 항목 분리)
    this.updateMonthSelection();
    
    // 선택 정보 업데이트
    this.updateMonthSelectionDisplay();
    
    // 선택 이벤트 발생
    this.dispatchEvent(new CustomEvent('month-selected', {
      detail: {
        type,
        year,
        month,
        date,
        startDate: this._startDate,
        endDate: this._endDate
      }
    }));
  }
  
  // 연도 변경 (월별 모드)
  changeYear(type, step) {
    const yearSelect = type === 'start' ? this.startYearSelect : this.endYearSelect;
    const currentYear = parseInt(yearSelect.textContent);
    const newYear = currentYear + step;
    
    // 선택 가능한 범위를 벗어나면 이동 제한 (새로 추가)
    if (this._minSelectableDate && newYear < this._minSelectableDate.getFullYear()) {
      return;
    }
    
    if (this._maxSelectableDate && newYear > this._maxSelectableDate.getFullYear()) {
      return;
    }
    
    yearSelect.textContent = newYear;
    
    // 월 그리드 업데이트
    const monthGrid = type === 'start' ? this.startMonthGrid : this.endMonthGrid;
    this.renderMonthButtons(monthGrid, newYear, type);
  }
  
  // 월별 선택 정보 표시 업데이트
  updateMonthSelection() {
    // 모든 월 버튼 초기화
    const allMonthButtons = this.querySelectorAll('.month-button');
    allMonthButtons.forEach(button => {
      button.classList.remove('selected', 'in-range');
    });
    
    if (!this._startDate || !this._endDate) return;
    
    const startYear = this._startDate.getFullYear();
    const startMonth = this._startDate.getMonth();
    const endYear = this._endDate.getFullYear();
    const endMonth = this._endDate.getMonth();
    
    // 시작 그리드의 월 버튼
    const startMonthButtons = this.startMonthGrid.querySelectorAll('.month-button');
    startMonthButtons.forEach(button => {
      const buttonYear = parseInt(button.dataset.year);
      const buttonMonth = parseInt(button.dataset.month);
      
      // 시작 달력의 시작월 강조
      if (buttonYear === startYear && buttonMonth === startMonth) {
        button.classList.add('selected');
      }
      // 시작 달력의 시작월 이후 모든 월에 범위 표시
      else if (
        (buttonYear === startYear && buttonMonth > startMonth) ||
        (buttonYear > startYear)
      ) {
        // 종료월/년보다 이전이거나 같은 경우만 범위 표시
        if (
          (buttonYear < endYear) ||
          (buttonYear === endYear && buttonMonth <= endMonth)
        ) {
          button.classList.add('in-range');
        }
      }
    });
    
    // 종료 그리드의 월 버튼
    const endMonthButtons = this.endMonthGrid.querySelectorAll('.month-button');
    endMonthButtons.forEach(button => {
      const buttonYear = parseInt(button.dataset.year);
      const buttonMonth = parseInt(button.dataset.month);
      
      // 종료 달력의 종료월 강조
      if (buttonYear === endYear && buttonMonth === endMonth) {
        button.classList.add('selected');
      }
      // 종료 달력의 시작월부터 종료월 전까지 모든 월에 범위 표시
      else if (
        (buttonYear === endYear && buttonMonth < endMonth) ||
        (buttonYear < endYear)
      ) {
        // 시작월/년 이후이거나 같은 경우만 범위 표시
        if (
          (buttonYear > startYear) ||
          (buttonYear === startYear && buttonMonth >= startMonth)
        ) {
          button.classList.add('in-range');
        }
      }
    });
  }
  
  // 드롭다운 토글
  toggleDropdown(element, type, calendarType) {
    // 이미 열려있는 드롭다운 닫기
    this.closeAllDropdowns();
    
    // 현재 드롭다운이 있는지 확인
    let dropdown = element.querySelector('.dropdown');
    if (!dropdown) {
      // 새 드롭다운 생성
      dropdown = document.createElement('div');
      dropdown.className = 'dropdown';
      
      const currentValue = parseInt(element.textContent);
      
      if (type === 'year') {
        // 연도 드롭다운 생성 - 선택 가능 범위에 따라 제한
        const minYear = this._minSelectableDate ? this._minSelectableDate.getFullYear() : currentValue - 60;
        const maxYear = this._maxSelectableDate ? this._maxSelectableDate.getFullYear() : currentValue + 60;
        
        for (let year = minYear; year <= maxYear; year++) {
          const option = document.createElement('div');
          option.className = 'dropdown-option';
          if (year === currentValue) {
            option.classList.add('selected');
          }
          option.textContent = year;
          option.dataset.value = year;
          
          option.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (this._selectMode === 'month') {
              // 월별 모드
              const yearSelect = calendarType === 'start' ? this.startYearSelect : this.endYearSelect;
              yearSelect.textContent = year;
              
              // 월 그리드 업데이트
              const monthGrid = calendarType === 'start' ? this.startMonthGrid : this.endMonthGrid;
              this.renderMonthButtons(monthGrid, year, calendarType);
              
              this.updateMonthSelectionDisplay();
            } else {
              // 날짜 모드
              this.handleYearChange(calendarType, year);
            }
            
            // 드롭다운 닫기
            this.closeAllDropdowns();
          });
          
          dropdown.appendChild(option);
        }
      } else if (type === 'month') {
        // 월 드롭다운 생성 (날짜 모드에서만 사용) - 선택 가능 범위에 따라 제한
        const year = parseInt(calendarType === 'start' ? this.startYearSelect.textContent : this.endYearSelect.textContent);
        
        let minMonth = 0;
        let maxMonth = 11;
        
        // 최소 선택 가능 날짜가 설정되어 있고, 현재 연도와 같은 경우 최소 월 제한
        if (this._minSelectableDate && year === this._minSelectableDate.getFullYear()) {
          minMonth = this._minSelectableDate.getMonth();
        }
        
        // 최대 선택 가능 날짜가 설정되어 있고, 현재 연도와 같은 경우 최대 월 제한
        if (this._maxSelectableDate && year === this._maxSelectableDate.getFullYear()) {
          maxMonth = this._maxSelectableDate.getMonth();
        }
        
        // 종료일 선택 시 시작일 이전 날짜는 선택 불가
        if (calendarType === 'end' && this._startDate) {
          const startYear = this._startDate.getFullYear();
          if (year === startYear) {
            minMonth = Math.max(minMonth, this._startDate.getMonth());
          }
        }
        
        for (let month = 1; month <= 12; month++) {
          const monthIndex = month - 1;
          
          // 선택 범위를 벗어나는 월은 건너뜀
          if (monthIndex < minMonth || monthIndex > maxMonth) {
            continue;
          }
          
          const option = document.createElement('div');
          option.className = 'dropdown-option';
          if (month === currentValue) {
            option.classList.add('selected');
          }
          option.textContent = month;
          option.dataset.value = month;
          
          option.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleMonthChange(calendarType, month - 1);
            
            // 드롭다운 닫기
            this.closeAllDropdowns();
          });
          
          dropdown.appendChild(option);
        }
      }
      
      element.appendChild(dropdown);
    }
    
    // 드롭다운 표시/숨김 토글
    dropdown.classList.toggle('show');
    
    // 선택된 옵션으로 스크롤
    if (dropdown.classList.contains('show')) {
      const selectedOption = dropdown.querySelector('.dropdown-option.selected');
      if (selectedOption) {
        dropdown.scrollTop = selectedOption.offsetTop - dropdown.clientHeight / 2;
      }
    }
  }
  
  // 모든 드롭다운 닫기
  closeAllDropdowns() {
    const dropdowns = this.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }
  
  //=================== 날짜 선택 관련 메서드 ===================//
  
  // 날짜 선택 모드 초기화
  initDateView() {
    // 초기 날짜 설정 (선택 가능 범위 내에서)
    let initialDate = new Date();
  
    if (this._minSelectableDate) {
      initialDate = initialDate < this._minSelectableDate ? 
        new Date(this._minSelectableDate) : initialDate;
    }
    
    if (this._maxSelectableDate) {
      initialDate = initialDate > this._maxSelectableDate ? 
        new Date(this._maxSelectableDate) : initialDate;
    }
    
    const currentYear = initialDate.getFullYear();
    const currentMonth = initialDate.getMonth();
    
    // 연도 및 월 표시 초기화
    this.startYearSelect.textContent = currentYear;
    this.startMonthSelect.textContent = currentMonth + 1;
    this.endYearSelect.textContent = currentYear;
    this.endMonthSelect.textContent = currentMonth + 1;
    
    // 날짜 초기화
    this._startDate = new Date(currentYear, currentMonth, initialDate.getDate());
    this._endDate = new Date(currentYear, currentMonth, initialDate.getDate());
    
    // 달력 날짜 렌더링
    this.renderCalendar('start', currentYear, currentMonth);
    this.renderCalendar('end', currentYear, currentMonth);
    
    // 초기 선택 상태 설정
    this.updateDateSelectionDisplay();
  }
  
  // 달력 날짜 그리기 메소드 수정
  renderCalendar(calendarType, year, month) {
    const grid = calendarType === 'start' ? this.startCalendarGrid : this.endCalendarGrid;
    
    // 요일 헤더를 제외한 내용 삭제
    const existingDays = grid.querySelectorAll('.day');
    existingDays.forEach(day => day.remove());
    
    // 해당 월의 날짜 수
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // 첫 날의 요일 (0: 일요일, 1: 월요일, ...)
    const firstDay = new Date(year, month, 1).getDay();
    
    // 달의 시작 전 빈 칸 추가
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'day other-month';
      grid.appendChild(emptyCell);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // max-days가 설정된 경우 최대 허용 날짜 계산
    let maxAllowedDate = null;
    if (this._maxDays && this._startDate && calendarType === 'end') {
      maxAllowedDate = new Date(this._startDate);
      maxAllowedDate.setDate(maxAllowedDate.getDate() + this._maxDays - 1);
      maxAllowedDate.setHours(0, 0, 0, 0);
    }
  
    const isEndCalendar = calendarType === 'end'; 
    
    // 달력에 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'day';
      dayCell.textContent = day;
      
      // 날짜 데이터 속성 설정
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      dayCell.dataset.date = this.formatDateForData(date);
      
      // 주말 클래스 추가
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) dayCell.classList.add('sunday');
      if (dayOfWeek === 6) dayCell.classList.add('saturday');
      
      // 오늘 날짜 표시
      if (today.getTime() === date.getTime()) {
        dayCell.classList.add('today');
      }
      
      let isDisabled = false;
      
      // 선택 가능 범위 제한 적용
      if ((this._minSelectableDate && date < this._minSelectableDate) || 
          (this._maxSelectableDate && date > this._maxSelectableDate)) {
        isDisabled = true;
      }
    
      // 선택 불가능한 기간에 포함되는지 확인
      if (!isDisabled && this.isDateInDisabledRanges(date)) {
        isDisabled = true;
      }
      
      // 종료 달력에서 추가 제약 조건 적용
      if (!isDisabled && calendarType === 'end' && this._startDate) {
        const startDateMidnight = new Date(this._startDate);
        startDateMidnight.setHours(0, 0, 0, 0);
        
        // 시작일보다 이전 날짜 비활성화
        if (date.getTime() < startDateMidnight.getTime()) {
          isDisabled = true;
        }
        
        // 최대 일 수 제한이 있는 경우 그 이후 날짜도 비활성화
        if (!isDisabled && maxAllowedDate && date.getTime() > maxAllowedDate.getTime()) {
          isDisabled = true;
        }
        
        // 시작일과 해당 날짜 사이에 선택 불가능한 기간이 있으면 비활성화
        if (!isDisabled && this.hasDisabledPeriodBetween(this._startDate, date)) {
          isDisabled = true;
        }
      }
      
      if (isDisabled) {
        dayCell.classList.add('disabled');
      } else {
        // 날짜 클릭 이벤트 (시작 달력, 종료 달력 모두에 추가)
        dayCell.addEventListener('click', () => {
          this.selectDate(calendarType, date);
        });
      }
      
      grid.appendChild(dayCell);
    }
    
    // 선택 상태 업데이트
    this.updateDateSelection();
  }
  // 날짜 선택 처리 메소드 수정
  selectDate(calendarType, date) {
    // 날짜 선택 처리
    if (calendarType === 'start') {
      const selectedDate = new Date(date);
      const currentEndDate = this._endDate ? new Date(this._endDate) : null;
      
      this._startDate = selectedDate;
      
      // 선택한 시작일이 현재 종료일보다 이후인 경우에만 종료일 변경
      if (currentEndDate === null || selectedDate > currentEndDate) {
        this._endDate = selectedDate;
      }
      
      // 시작일이 변경되었으므로 종료일 달력을 다시 렌더링하여 비활성화 상태 즉시 적용
      const endYear = parseInt(this.endYearSelect.textContent);
      const endMonth = parseInt(this.endMonthSelect.textContent) - 1;
      this.renderCalendar('end', endYear, endMonth);
    } else if (calendarType === 'end') {
      this._endDate = date;
    }
    
    // 날짜 선택 업데이트
    this.updateDateSelection();
    this.updateDateSelectionDisplay();
  }
  
  // 날짜 선택 상태 시각화
  updateDateSelection() {
    // 모든 날짜 셀 초기화
    const allDays = this.querySelectorAll('.day');
    allDays.forEach(day => {
      day.classList.remove('selected', 'in-range');
    });
    
    if (!this._startDate || !this._endDate) return;
    
    // 시작일과 종료일 사이의 날짜 범위 찾기
    const startTimestamp = new Date(this._startDate).setHours(0, 0, 0, 0);
    const endTimestamp = new Date(this._endDate).setHours(0, 0, 0, 0);
    
    // 시작일 달력 처리
    const startCalendarDays = this.startCalendarGrid.querySelectorAll('.day');
    startCalendarDays.forEach(day => {
      if (!day.dataset.date) return;
      
      const cellDate = this.parseDate(day.dataset.date);
      const cellTimestamp = cellDate.getTime();
      
      // 시작일 달력에는 시작일만 선택됨으로 표시
      if (this.isSameDate(cellDate, this._startDate)) {
        day.classList.add('selected');
      }
      // 시작일 이후부터 모든 날짜는 범위로 표시 (시작일 달력의 마지막 날까지)
      else if (cellTimestamp > startTimestamp && cellTimestamp <= endTimestamp) {
        day.classList.add('in-range');
      }
    });
    
    // 종료일 달력 처리
    const endCalendarDays = this.endCalendarGrid.querySelectorAll('.day');
    endCalendarDays.forEach(day => {
      if (!day.dataset.date) return;
      
      const cellDate = this.parseDate(day.dataset.date);
      const cellTimestamp = cellDate.getTime();
      
      // 종료일 달력에는 종료일만 선택됨으로 표시
      if (this.isSameDate(cellDate, this._endDate)) {
        day.classList.add('selected');
      }
      // 시작일부터 종료일 전까지 모든 날짜는 범위로 표시
      else if (cellTimestamp >= startTimestamp && cellTimestamp < endTimestamp) {
        day.classList.add('in-range');
      }
    });
  }
  
  // 날짜별 선택 정보 표시 업데이트
  updateDateSelectionDisplay() {
    if (this._startDate && this._endDate && this.selectionDates) {
      const startDisplayDate = this.formatDateForDisplay(this._startDate);
      const endDisplayDate = this.formatDateForDisplay(this._endDate);
      
      const formattedText = `${startDisplayDate} ~ ${endDisplayDate}`;
      this.selectionDates.textContent = formattedText;
      
      // 선택 변경 이벤트 발생
      this.dispatchEvent(new CustomEvent('selection-updated', {
        detail: {
          startDate: this._startDate,
          endDate: this._endDate,
          formattedText: formattedText
        }
      }));
    }
  }
  
  // 문자열에서 날짜 객체로 변환 (YYYY-MM-DD 형식)
  parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // 날짜가 같은지 비교 (연, 월, 일만 비교)
  isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
  
  // 날짜를 데이터 속성에 저장하기 위한 형식으로 변환 (YYYY-MM-DD)
  formatDateForData(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // 날짜를 표시를 위한 형식으로 변환 (YYYY.MM.DD)
  formatDateForDisplay(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }
  
  // 연도 변경 처리 (날짜 모드)
  handleYearChange(calendarType, year) {
    const yearSelect = calendarType === 'start' ? this.startYearSelect : this.endYearSelect;
    const monthSelect = calendarType === 'start' ? this.startMonthSelect : this.endMonthSelect;
    
    yearSelect.textContent = year;
    const month = parseInt(monthSelect.textContent) - 1;
    
    this.renderCalendar(calendarType, year, month);
  }
  
  // 월 변경 처리 (날짜 모드)
  handleMonthChange(calendarType, month) {
    const yearSelect = calendarType === 'start' ? this.startYearSelect : this.endYearSelect;
    const monthSelect = calendarType === 'start' ? this.startMonthSelect : this.endMonthSelect;
    
    const year = parseInt(yearSelect.textContent);
    monthSelect.textContent = month + 1;
    
    this.renderCalendar(calendarType, year, month);
  }
  
  // 선택된 날짜 업데이트 (날짜 모드)
  updateSelectedDate(calendarType, year, month) {
    const currentDate = calendarType === 'start' ? this._startDate : this._endDate;
    const newDay = Math.min(currentDate.getDate(), new Date(year, month + 1, 0).getDate());
    
    if (calendarType === 'start') {
      this._startDate = new Date(year, month, newDay);
      
      // 종료일보다 나중이면 종료일도 같이 변경
      if (this._endDate && this._startDate > this._endDate) {
        this._endDate = new Date(this._startDate);
        
        // 종료일 UI 업데이트
        this.endYearSelect.textContent = year;
        this.endMonthSelect.textContent = month + 1;
        this.renderCalendar('end', year, month);
      }
    } else {
      this._endDate = new Date(year, month, newDay);
      
      // 시작일보다 이전이면 시작일도 같이 변경
      if (this._endDate < this._startDate) {
        this._startDate = new Date(this._endDate);
        
        // 시작일 UI 업데이트
        this.startYearSelect.textContent = year;
        this.startMonthSelect.textContent = month + 1;
        this.renderCalendar('start', year, month);
      }
    }
    
    // 선택 시각화 및 정보 업데이트
    this.updateDateSelection();
    this.updateDateSelectionDisplay();
  }

  // 날짜/월이 최대 일 수를 초과하는지 체크하는 유틸리티 메서드 추가
  // 최대 일 수 제한이 있는지 체크하고, 제한된 날짜인지 확인
  isDateBeyondMaxDays(date) {
    if (!this._maxDays || !this._startDate) return false;
    
    // 시작일과 대상 날짜 모두 시간 정보 제거하고 비교
    const startDateCopy = new Date(this._startDate);
    startDateCopy.setHours(0, 0, 0, 0);
    
    const dateCopy = new Date(date);
    dateCopy.setHours(0, 0, 0, 0);
    
    // 시작일로부터 최대 일 수를 더한 날짜 계산
    const maxDate = new Date(startDateCopy);
    maxDate.setDate(maxDate.getDate() + this._maxDays);
    
    // 주어진 날짜가 최대 날짜를 초과하는지 확인
    return dateCopy.getTime() > maxDate.getTime();
  }

  // 주어진 월이 최대 일 수 제한을 초과하는지 확인
  isMonthBeyondMaxDays(year, month) {
    if (!this._maxDays || !this._startDate) return false;
    
    // 시작월의 첫날 (시간 정보 제거)
    const startDateCopy = new Date(this._startDate);
    startDateCopy.setHours(0, 0, 0, 0);
    
    // 대상 월의 첫날
    const targetMonthFirstDay = new Date(year, month, 1);
    targetMonthFirstDay.setHours(0, 0, 0, 0);
    
    // 시작일로부터 최대 일 수를 더한 날짜 계산
    const maxDate = new Date(startDateCopy);
    maxDate.setDate(maxDate.getDate() + this._maxDays);
    
    // 주어진 월의 첫날이 최대 날짜보다 이후인지 확인
    if (targetMonthFirstDay.getTime() > maxDate.getTime()) {
      return true;
    }
    
    // 주어진 월의 마지막 날이 최대 날짜보다 이전인지 확인
    const lastDayOfMonth = new Date(year, month + 1, 0);
    lastDayOfMonth.setHours(0, 0, 0, 0);
    
    // 월의 첫날은 최대 날짜 이전이지만, 마지막 날은 최대 날짜 이후인 경우
    // (월의 일부만 선택 가능한 경우는 false 반환 - 월은 선택 가능)
    return false;
  }
  
  // 월 앞/뒤로 이동 (날짜 모드)
  navigateMonth(calendarType, step) {
    const yearSelect = calendarType === 'start' ? this.startYearSelect : this.endYearSelect;
    const monthSelect = calendarType === 'start' ? this.startMonthSelect : this.endMonthSelect;
    
    let year = parseInt(yearSelect.textContent);
    let month = parseInt(monthSelect.textContent) - 1 + step;
    
    if (month < 0) {
      month = 11;
      year--;
    } else if (month > 11) {
      month = 0;
      year++;
    }
    
    // 선택 가능 범위 제한 검사 (새로 추가)
    const newDate = new Date(year, month, 1);
    
    if (this._minSelectableDate) {
      const minYear = this._minSelectableDate.getFullYear();
      const minMonth = this._minSelectableDate.getMonth();
      
      if ((year < minYear) || (year === minYear && month < minMonth)) {
        return; // 이동 취소
      }
    }
  
    
    if (this._maxSelectableDate) {
      const maxYear = this._maxSelectableDate.getFullYear();
      const maxMonth = this._maxSelectableDate.getMonth();
      
      if (year > maxYear || (year === maxYear && month > maxMonth)) {
        return;
      }
    }
    
    yearSelect.textContent = year;
    monthSelect.textContent = month + 1;
    
    this.renderCalendar(calendarType, year, month);
  }
  
  /**
 * setDateRange 메서드 업데이트 - 선택 가능 범위 추가
 * 
 * @param {Date|null} startDate - 시작 날짜 (default: 현재 설정된 시작 날짜)
 * @param {Date|null} endDate - 종료 날짜 (default: 현재 설정된 종료 날짜)
 * @param {Date|null} minSelectableDate - 선택 가능한 최소 날짜 (default: null)
 * @param {Date|null} maxSelectableDate - 선택 가능한 최대 날짜 (default: null)
 */
setDateRange(startDate = null, endDate = null, minSelectableDate = null, maxSelectableDate = null) {
  // 선택 가능 날짜 범위 설정 (새로 추가)
  if (minSelectableDate) {
    this._minSelectableDate = new Date(minSelectableDate);
  }
  
  if (maxSelectableDate) {
    this._maxSelectableDate = new Date(maxSelectableDate);
  }
  
  // 설정된 날짜가 범위 내에 있도록 검증
  if (startDate) {
    this._startDate = new Date(startDate);
    
    // 최소 선택 가능 날짜 제한 적용
    if (this._minSelectableDate && this._startDate < this._minSelectableDate) {
      this._startDate = new Date(this._minSelectableDate);
    }
    
    // 최대 선택 가능 날짜 제한 적용
    if (this._maxSelectableDate && this._startDate > this._maxSelectableDate) {
      this._startDate = new Date(this._maxSelectableDate);
    }
  }
  
  if (endDate) {
    this._endDate = new Date(endDate);
    
    // 최소 선택 가능 날짜 제한 적용
    if (this._minSelectableDate && this._endDate < this._minSelectableDate) {
      this._endDate = new Date(this._minSelectableDate);
    }
    
    // 최대 선택 가능 날짜 제한 적용
    if (this._maxSelectableDate && this._endDate > this._maxSelectableDate) {
      this._endDate = new Date(this._maxSelectableDate);
    }
    
    // 종료일이 시작일보다 이전이면 시작일로 설정
    if (this._endDate < this._startDate) {
      this._endDate = new Date(this._startDate);
    }
  }
  
  // 월별 모드 적용
  if (this._selectMode === 'month') {
    // 월별 모드에서는 월의 첫 날로 설정
    this._startDate.setDate(1);
    this._endDate.setDate(1);
    
    // UI 업데이트
    this.startYearSelect.textContent = this._startDate.getFullYear();
    this.endYearSelect.textContent = this._endDate.getFullYear();
    
    // 월 그리드 업데이트
    this.renderMonthButtons(this.startMonthGrid, this._startDate.getFullYear(), 'start');
    this.renderMonthButtons(this.endMonthGrid, this._endDate.getFullYear(), 'end');
    
    // 선택 정보 업데이트
    this.updateMonthSelectionDisplay();
  } else {
    // 날짜 모드
    this.startYearSelect.textContent = this._startDate.getFullYear();
    this.startMonthSelect.textContent = this._startDate.getMonth() + 1;
    this.endYearSelect.textContent = this._endDate.getFullYear();
    this.endMonthSelect.textContent = this._endDate.getMonth() + 1;
    
    // 달력 렌더링
    this.renderCalendar('start', this._startDate.getFullYear(), this._startDate.getMonth());
    this.renderCalendar('end', this._endDate.getFullYear(), this._endDate.getMonth());
    
    // 선택 정보 업데이트
    this.updateDateSelectionDisplay();
  }
}
}

// Web Component 등록
customElements.define('date-selector-component', DateSelectorComponent);