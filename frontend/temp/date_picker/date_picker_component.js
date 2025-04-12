/**
 * 날짜 선택기 Web Component
 * date_picker_component.js
 * 모달 내부의 달력 UI를 캡슐화하는 커스텀 요소를 정의합니다.
 */
class DatePickerComponent extends HTMLElement {
  constructor() {
    super();
    
    // 기본 크기 설정
    this._width = '90%';
    this._maxWidth = '800px';
    
    // 기본 연도 범위 설정 (현재 연도 기준 앞뒤 연도 범위)
    this._yearRange = 50;
    
    // 선택 모드 설정
    this._selectMode = 'date'; // 'date' 또는 다른 값으로 설정 가능
    
    // 선택된 날짜 저장
    this._startDate = new Date();
    this._endDate = new Date();
    
    // 템플릿 생성
    this.attachTemplate();
    
    // DOM 요소 참조 저장
    this.cacheElements();
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
    
    // 초기 스타일 적용
    this.updateStyles();
    
    // 초기 달력 설정
    this.initCalendar();
  }
  
  // 관찰할 속성 목록을 반환하는 정적 메서드 (필요한 것만 유지)
  static get observedAttributes() {
    return ['select-mode']; 
  }
  
  // 속성이 변경되었을 때 호출되는 메서드
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'select-mode') {
      this._selectMode = newValue;
      console.log(`선택 모드 변경: ${this._selectMode}`);
      // 필요한 경우 모드에 따른 UI 변경 로직 추가
    }
  }
  
  // 스타일 직접 업데이트
  updateStyles() {
    // 요소 자체에 스타일 적용
    this.style.width = this._width;
    this.style.maxWidth = this._maxWidth;
  }
  
  // 템플릿 생성 및 추가 (기존 코드 유지)
  attachTemplate() {
    // 기존 템플릿 코드 유지 (생략)...
    
    // 내부 스타일 추가
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      /* Web Component 스타일 */
      :host {
        display: block;
      }

      .modal-content {
        background-color: #fff;
        width: 100%;
        overflow: hidden;
        padding: 9px 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 0 20px 0;
        margin-bottom: 20px;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: bold;
        color: #333;
      }

      .close-button {
        background: none;
        border: none;
        font-size: 26px;
        cursor: pointer;
        color: #333;
        padding: 0;
        margin: 0;
        line-height: 1;
      }

      .modal-body {
        padding: 0;
      }

      /* 달력 컨테이너 스타일 */
      .calendar-container {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 25px;
      }

      .calendar {
        flex: 1;
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 12px;
      }

      .calendar-header {
        text-align: center;
        padding: 0 0 15px 0;
        font-weight: 600;
        font-size: 16px;
        color: #333;
      }

      /* 달력 월 선택기 스타일 */
      .month-selector {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0 0 15px 0;
        gap: 5px;
        position: relative;
      }

      /* 버튼에만 margin 추가 */
      .month-selector .nav-button.prev-start,
      .month-selector .nav-button.prev-end {
        margin-right: 20px; /* 원하는 간격으로 조정 */
      }

      .month-selector .nav-button.next-start,
      .month-selector .nav-button.next-end {
        margin-left: 20px; /* 원하는 간격으로 조정 */
      }

      .year-select, .month-select {
        padding: 8px 15px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #fff;
        font-size: 15px;
        color: #333;
        cursor: pointer;
        position: relative;
        text-align: center;
        user-select: none;
      }
      
      /* 드롭다운 스타일 */
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
        border-radius: 4px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #333;
        font-size: 16px;
      }

      .nav-button:hover {
        background-color: #f0f0f0;
      }

      /* 달력 그리드 스타일 */
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

      /* 요일별 색상 */
      .weekday:first-child {
        color: #e53935; /* 일요일 - 빨간색 */
      }

      .weekday:last-child,
      .calendar-grid .weekday:nth-child(7) {
        color: #4373c5 !important; /* 토요일 - 파란색 */
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

      .day.today {
        font-weight: 700;
      }

      .day.selected {
        background-color: #4373c5;
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

      .day.disabled:hover {
        background-color: transparent;
      }

      /* 선택 정보 영역 스타일 */
      .selection-info {
        display: flex;
        padding: 15px 20px;
        background-color: #fff;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin-bottom: 25px;
      }

      .selection-label {
        font-weight: 600;
        margin-right: 15px;
        color: #333;
      }

      .selection-dates {
        font-weight: 500;
        color: #333;
      }

      /* 확인 버튼 영역 스타일 */
      .button-area {
        display: flex;
        justify-content: center;
        padding: 10px 0;
      }

      .confirm-button {
        background-color: #4373c5;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 12px 40px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        width: 30%;
      }

      .confirm-button:hover {
        background-color: #365b9f;
      }
    `;
    
    this.appendChild(this.styleElement);
    
    // HTML 템플릿 추가
    this.innerHTML += `
      <div class="modal-content">
        <div class="modal-header">
          <h2>날짜선택</h2>
          <button class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="calendar-container">
            <!-- 첫 번째 달력 (시작일) -->
            <div class="calendar">
              <div class="calendar-header">조회 시작일</div>
              <div class="month-selector">
                <button class="nav-button prev-start">&lt;</button>
                <div class="year-select" id="startYearSelect"></div>
                <div class="month-select" id="startMonthSelect"></div>
                <button class="nav-button next-start">&gt;</button>
              </div>
              <div class="calendar-grid" id="startCalendarGrid">
                <div class="weekday">일</div>
                <div class="weekday">월</div>
                <div class="weekday">화</div>
                <div class="weekday">수</div>
                <div class="weekday">목</div>
                <div class="weekday">금</div>
                <div class="weekday">토</div>
                <!-- 달력 날짜는 JavaScript로 생성됩니다 -->
              </div>
            </div>
            
            <!-- 두 번째 달력 (종료일) -->
            <div class="calendar">
              <div class="calendar-header">조회 종료일</div>
              <div class="month-selector">
                <button class="nav-button prev-end">&lt;</button>
                <div class="year-select" id="endYearSelect"></div>
                <div class="month-select" id="endMonthSelect"></div>
                <button class="nav-button next-end">&gt;</button>
              </div>
              <div class="calendar-grid" id="endCalendarGrid">
                <div class="weekday">일</div>
                <div class="weekday">월</div>
                <div class="weekday">화</div>
                <div class="weekday">수</div>
                <div class="weekday">목</div>
                <div class="weekday">금</div>
                <div class="weekday">토</div>
                <!-- 달력 날짜는 JavaScript로 생성됩니다 -->
              </div>
            </div>
          </div>
          
          <!-- 선택된 날짜 범위 표시 -->
          <div class="selection-info">
            <div class="selection-label">선택기간</div>
            <div class="selection-dates" id="selectionDates">2025.03.20 ~ 2025.03.27</div>
          </div>
          
          <!-- 확인 버튼 -->
          <div class="button-area">
            <button id="confirmDateBtn" class="confirm-button">확인</button>
          </div>
        </div>
      </div>
    `;
  }
  
  // DOM 요소 캐싱 (기존 코드 유지)
  cacheElements() {
    // 모달 요소들
    this.closeButton = this.querySelector('.close-button');
    this.confirmButton = this.querySelector('#confirmDateBtn');
    
    // 달력 요소들
    this.startYearSelect = this.querySelector('#startYearSelect');
    this.startMonthSelect = this.querySelector('#startMonthSelect');
    this.endYearSelect = this.querySelector('#endYearSelect');
    this.endMonthSelect = this.querySelector('#endMonthSelect');
    this.startCalendarGrid = this.querySelector('#startCalendarGrid');
    this.endCalendarGrid = this.querySelector('#endCalendarGrid');
    this.selectionDates = this.querySelector('#selectionDates');
    
    // 네비게이션 버튼들
    this.prevStartButton = this.querySelector('.prev-start');
    this.nextStartButton = this.querySelector('.next-start');
    this.prevEndButton = this.querySelector('.prev-end');
    this.nextEndButton = this.querySelector('.next-end');
  }
  
  // 초기 달력 설정
  initCalendar() {
    // 오늘 날짜로 초기화
    const today = new Date();
    this._startDate = new Date(today);
    this._endDate = new Date(today);
    
    // 연도 및 월 표시 초기화
    this.startYearSelect.textContent = today.getFullYear();
    this.startMonthSelect.textContent = today.getMonth() + 1;
    this.endYearSelect.textContent = today.getFullYear();
    this.endMonthSelect.textContent = today.getMonth() + 1;
    
    // 달력 날짜 렌더링
    this.renderCalendar('start', today.getFullYear(), today.getMonth());
    this.renderCalendar('end', today.getFullYear(), today.getMonth());
    
    // 초기 선택 상태 설정
    this.updateSelectionInfo(this._startDate, this._endDate);
  }
  
  // 이벤트 리스너 설정 (수정)
  setupEventListeners() {
    // 닫기 버튼 클릭 이벤트 (유지)
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('close-picker'));
      });
    }
    
    // 확인 버튼 클릭 이벤트 (수정)
    if (this.confirmButton) {
      this.confirmButton.addEventListener('click', () => {
        // 선택된 날짜 및 포맷된 텍스트 전달
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
    
    // 월 선택 클릭 이벤트 - 커스텀 드롭다운 표시
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
    
    // 이전/다음 버튼 이벤트
    if (this.prevStartButton) {
      this.prevStartButton.addEventListener('click', () => {
        this.navigateMonth('start', -1);
      });
    }
    
    if (this.nextStartButton) {
      this.nextStartButton.addEventListener('click', () => {
        this.navigateMonth('start', 1);
      });
    }
    
    if (this.prevEndButton) {
      this.prevEndButton.addEventListener('click', () => {
        this.navigateMonth('end', -1);
      });
    }
    
    if (this.nextEndButton) {
      this.nextEndButton.addEventListener('click', () => {
        this.navigateMonth('end', 1);
      });
    }
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', () => {
      this.closeAllDropdowns();
    });
  }
  
  // 드롭다운 토글 메서드
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
        // 연도 드롭다운 생성
        const currentYear = currentValue;
        const startYear = currentYear - 60;
        const endYear = currentYear + 60;
        
        for (let year = startYear; year <= endYear; year++) {
          const option = document.createElement('div');
          option.className = 'dropdown-option';
          if (year === currentYear) {
            option.classList.add('selected');
          }
          option.textContent = year;
          option.dataset.value = year;
          
          option.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleYearChange(calendarType, year);
            
            // 드롭다운 닫기
            this.closeAllDropdowns();
          });
          
          dropdown.appendChild(option);
        }
      } else if (type === 'month') {
        // 월 드롭다운 생성
        for (let month = 1; month <= 12; month++) {
          const option = document.createElement('div');
          option.className = 'dropdown-option';
          if (month === currentValue) {
            option.classList.add('selected');
          }
          option.textContent = month;
          option.dataset.value = month;
          
          option.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleMonthChange(calendarType, month - 1);  // 월은 0부터 시작하므로
            
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
  
  // 연도 변경 처리
  handleYearChange(calendarType, year) {
    const yearSelect = calendarType === 'start' ? this.startYearSelect : this.endYearSelect;
    const monthSelect = calendarType === 'start' ? this.startMonthSelect : this.endMonthSelect;
    
    yearSelect.textContent = year;
    const month = parseInt(monthSelect.textContent) - 1;
    
    this.renderCalendar(calendarType, year, month);
    
    // 선택된 날짜 업데이트
    this.updateSelectedDate(calendarType, year, month);
  }
  
  // 월 변경 처리
  handleMonthChange(calendarType, month) {
    const yearSelect = calendarType === 'start' ? this.startYearSelect : this.endYearSelect;
    const monthSelect = calendarType === 'start' ? this.startMonthSelect : this.endMonthSelect;
    
    const year = parseInt(yearSelect.textContent);
    monthSelect.textContent = month + 1;
    
    this.renderCalendar(calendarType, year, month);
    
    // 선택된 날짜 업데이트
    this.updateSelectedDate(calendarType, year, month);
  }
  
  // 선택된 날짜 업데이트
  updateSelectedDate(calendarType, year, month) {
    const currentDate = calendarType === 'start' ? this._startDate : this._endDate;
    const newDay = Math.min(currentDate.getDate(), new Date(year, month + 1, 0).getDate());
    
    if (calendarType === 'start') {
      this._startDate = new Date(year, month, newDay);
      
      // 종료일보다 나중이면 종료일도 같이 변경
      if (this._startDate > this._endDate) {
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
    this.updateSelectionInfo(this._startDate, this._endDate);
    
    // 선택 변경 이벤트 발생
    this.dispatchEvent(new CustomEvent('selection-updated', {
      detail: {
        startDate: this._startDate,
        endDate: this._endDate,
        formattedText: this.selectionDates.textContent
      }
    }));
  }
  
  // 월 앞/뒤로 이동
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
    
    yearSelect.textContent = year;
    monthSelect.textContent = month + 1;
    
    this.renderCalendar(calendarType, year, month);
    this.updateSelectedDate(calendarType, year, month);
  }
  
  // 달력 날짜 그리기
  renderCalendar(calendarType, year, month) {
    const grid = calendarType === 'start' ? this.startCalendarGrid : this.endCalendarGrid;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    // 기존 날짜 셀 제거 (요일 헤더는 유지)
    const existingDays = grid.querySelectorAll('.day');
    existingDays.forEach(day => day.remove());
    
    // 달의 시작 전 빈 칸 추가
    for (let i = 0; i < firstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'day other-month';
      grid.appendChild(emptyCell);
    }
    
    // 달력에 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'day';
      dayCell.textContent = day;
      
      // 날짜 데이터 속성 설정
      const date = new Date(year, month, day);
      dayCell.dataset.date = this.formatDateForData(date);
      
      // 주말 클래스 추가
      const dayOfWeek = new Date(year, month, day).getDay();
      if (dayOfWeek === 0) dayCell.classList.add('sunday');
      if (dayOfWeek === 6) dayCell.classList.add('saturday');
      
      // 오늘 날짜 표시
      const today = new Date();
      if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
        dayCell.classList.add('today');
      }
      
      // 날짜 클릭 이벤트
      dayCell.addEventListener('click', () => {
        this.selectDate(calendarType, date);
      });
      
      grid.appendChild(dayCell);
    }
    
    // 선택 상태 업데이트
    this.updateDateSelection();
  }
  
  // 날짜 선택 처리
  selectDate(calendarType, date) {
    if (calendarType === 'start') {
      this._startDate = new Date(date);
      
      // 종료일보다 나중이면 종료일도 같이 변경
      if (this._startDate > this._endDate) {
        this._endDate = new Date(this._startDate);
        
        // 종료일 달력 업데이트
        this.endYearSelect.textContent = this._endDate.getFullYear();
        this.endMonthSelect.textContent = this._endDate.getMonth() + 1;
        this.renderCalendar('end', this._endDate.getFullYear(), this._endDate.getMonth());
      }
    } else {
      this._endDate = new Date(date);
      
      // 시작일보다 이전이면 시작일도 같이 변경
      if (this._endDate < this._startDate) {
        this._startDate = new Date(this._endDate);
        
        // 시작일 달력 업데이트
        this.startYearSelect.textContent = this._startDate.getFullYear();
        this.startMonthSelect.textContent = this._startDate.getMonth() + 1;
        this.renderCalendar('start', this._startDate.getFullYear(), this._startDate.getMonth());
      }
    }
    
    // 선택 시각화 및 정보 업데이트
    this.updateDateSelection();
    this.updateSelectionInfo(this._startDate, this._endDate);
    
    // 선택 변경 이벤트 발생
    this.dispatchEvent(new CustomEvent('selection-updated', {
      detail: {
        startDate: this._startDate,
        endDate: this._endDate,
        formattedText: this.selectionDates.textContent
      }
    }));
  }
  
  // 날짜 선택 상태 시각화
  updateDateSelection() {
    // 모든 날짜 셀 초기화
    const allDays = this.querySelectorAll('.day');
    allDays.forEach(day => {
      day.classList.remove('selected', 'in-range');
    });
    
    if (!this._startDate || !this._endDate) return;
    
    // 선택 범위에 해당하는 날짜 셀에 클래스 추가
    allDays.forEach(day => {
      if (!day.dataset.date) return;
      
      const cellDate = this.parseDate(day.dataset.date);
      
      // 시작일 또는 종료일은 선택됨으로 표시
      if (this.isSameDate(cellDate, this._startDate) || 
          this.isSameDate(cellDate, this._endDate)) {
        day.classList.add('selected');
      }
      // 범위 내 날짜는 범위로 표시
      else if (cellDate > this._startDate && cellDate < this._endDate) {
        day.classList.add('in-range');
      }
    });
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
  
  // 선택된 날짜 정보 업데이트
  updateSelectionInfo(startDate, endDate) {
    if (startDate && endDate && this.selectionDates) {
      const startDisplayDate = this.formatDateForDisplay(startDate);
      const endDisplayDate = this.formatDateForDisplay(endDate);
      
      const formattedText = `${startDisplayDate} ~ ${endDisplayDate}`;
      this.selectionDates.textContent = formattedText;
    }
  }
  
  // 날짜 범위 설정 (외부에서 호출 가능)
  setDateRange(startDate, endDate) {
    this._startDate = new Date(startDate);
    this._endDate = new Date(endDate);
    
    // 달력 연도/월 업데이트
    this.startYearSelect.textContent = this._startDate.getFullYear();
    this.startMonthSelect.textContent = this._startDate.getMonth() + 1;
    this.endYearSelect.textContent = this._endDate.getFullYear();
    this.endMonthSelect.textContent = this._endDate.getMonth() + 1;
    
    // 달력 렌더링
    this.renderCalendar('start', this._startDate.getFullYear(), this._startDate.getMonth());
    this.renderCalendar('end', this._endDate.getFullYear(), this._endDate.getMonth());
    
    // 선택 정보 업데이트 
    this.updateSelectionInfo(this._startDate, this._endDate);
  }
  
  // 컴포넌트가 DOM에 연결될 때 호출되는 메서드
  connectedCallback() {
    // 초기화 로직
    this.initCalendar();
    
    // 컴포넌트가 연결되었음을 알리는 이벤트 발생
    this.dispatchEvent(new CustomEvent('component-connected'));
  }
}

// Web Component 등록
customElements.define('date-picker-component', DatePickerComponent);