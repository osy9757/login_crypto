/**
 * 통합 날짜 선택기 Web Component
 * date_selector_component.js
 * 월별 및 날짜별 선택 UI를 캡슐화하는 커스텀 요소를 정의합니다.
 * Refactor 버전의 UI/렌더링 로직을 적용합니다.
 */
class DateSelectorComponent extends HTMLElement {
  constructor() {
    super();
    // 상태 변수 초기화
    const today = new Date();
    this._startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // 시간 정보 제거
    this._endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    this._currentYearStart = this._startDate.getFullYear();
    this._currentMonthStart = this._startDate.getMonth();
    this._currentYearEnd = this._endDate.getFullYear();
    this._currentMonthEnd = this._endDate.getMonth();

    this.attachTemplate(); 
    this.cacheElements();
  }

  static get observedAttributes() {
    // select-mode만 관찰 (다른 복잡한 속성 제외)
    return ['select-mode', 'output-classes']; 
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'select-mode' && oldValue !== newValue) {
      this.updateViewMode(newValue);
    } else if (name === 'output-classes') {
        // output-classes 속성이 변경될 때 특별히 할 작업은 없음 (필요시 추가)
    }
  }

  connectedCallback() {
    const initialMode = this.getAttribute('select-mode') || 'date'; 
    this.updateViewMode(initialMode);
    this.setupEventListeners();
    this.updateOutputElements(); // 초기 날짜 출력
  }

  cacheElements() {
    // 기본 구조 요소
    this.modalOverlay = this.querySelector('.modal-overlay');
    this.modalContainer = this.querySelector('.modal-container');
    this.closeButton = this.querySelector('.close-button');
    this.confirmButton = this.querySelector('#confirmDateBtn');
    this.selectionDates = this.querySelector('#selectionDates');

    // 시작 섹션 요소
    this.startYearSelect = this.querySelector('#startYearSelect');
    this.startMonthSelect = this.querySelector('#startMonthSelect');
    this.startMonthGrid = this.querySelector('#startMonthGrid');
    this.startCalendarGrid = this.querySelector('#startCalendarGrid');
    this.prevYearStartBtn = this.querySelector('.prev-year-start');
    this.nextYearStartBtn = this.querySelector('.next-year-start');

    // 종료 섹션 요소
    this.endYearSelect = this.querySelector('#endYearSelect');
    this.endMonthSelect = this.querySelector('#endMonthSelect');
    this.endMonthGrid = this.querySelector('#endMonthGrid');
    this.endCalendarGrid = this.querySelector('#endCalendarGrid');
    this.prevYearEndBtn = this.querySelector('.prev-year-end');
    this.nextYearEndBtn = this.querySelector('.next-year-end');
  }

  setupEventListeners() {
     this.addEventListener('click', (event) => {
      const targetElement = event.target;
      
      if (targetElement.matches('button[slot="trigger"]')) {
        this.showModal();
      }
      else if (targetElement === this.closeButton) {
          this.hideModal();
      }
      else if (event.target === this.modalOverlay) {
          this.hideModal();
      }
      else if (targetElement.matches('.nav-button')) {
          this.handleNavigationClick(targetElement);
      }
      else if (targetElement.matches('.month-button')) {
          const year = parseInt(targetElement.dataset.year);
          const month = parseInt(targetElement.dataset.month);
          const type = targetElement.closest('#startMonthGrid') ? 'start' : 'end';
          this.selectMonth(type, year, month);
      }
       else if (targetElement.matches('.day:not(.other-month):not(.disabled)')) { // 비활성화 아닌 날짜만
           const dateStr = targetElement.dataset.date;
           const type = targetElement.closest('#startCalendarGrid') ? 'start' : 'end';
           this.selectDate(type, this.parseDate(dateStr));
        }
       else if (targetElement === this.confirmButton) {
           this.handleConfirm();
       }
    });
  }

  handleNavigationClick(button) {
    const mode = this.getAttribute('select-mode') || 'date';
    const isStart = button.classList.contains('prev-year-start') || button.classList.contains('next-year-start');
    const direction = button.classList.contains('prev-year-start') || button.classList.contains('prev-year-end') ? -1 : 1;
    const calendarType = isStart ? 'start' : 'end';

    if (mode === 'month') {
        this.changeYear(calendarType, direction);
    } else {
        this.navigateMonth(calendarType, direction);
    }
  }

  attachTemplate() {
    const template = document.createElement('template');
    // Refactor 버전의 전체 HTML/CSS 구조 붙여넣기
    template.innerHTML = `
       <style>
         /* Web Component 공통 스타일 */
         :host { display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
         .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: none; justify-content: center; align-items: center; z-index: 1000; }
         .modal-container { background-color: #fff; overflow: hidden; padding: 20px; border-radius: 8px; width: 90%; max-width: 700px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); }
         .modal-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid #eee; margin-bottom: 15px; }
         .modal-title { font-size: 18px; font-weight: bold; color: #333; }
         .close-button { background: none; border: none; font-size: 24px; cursor: pointer; color: #333; padding: 0; line-height: 1; }
         .calendar-container { display: flex; gap: 20px; margin-bottom: 20px; }
         .calendar-section { flex: 1; background-color: #f9f9f9; border-radius: 10px; padding: 15px; }
         .calendar-header { text-align: center; margin-bottom: 15px; font-weight: 600; color: #333; }
         .year-selector { display: flex; justify-content: center; align-items: center; margin-bottom: 15px; position: relative; }
         .year-select, .month-select { padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; margin: 0 5px; min-width: 70px; text-align: center; background-color: #fff; cursor: default; }
         .nav-button { background: none; border: 1px solid #ddd; border-radius: 6px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; color: #555; background-color: #fff; transition: background-color 0.2s; }
         .nav-button:hover { background-color: #f0f0f0; }
         .nav-button.prev-year-start, .nav-button.prev-year-end { margin-right: 10px; }
         .nav-button.next-year-start, .nav-button.next-year-end { margin-left: 10px; }
         
         /* 월/날짜 그리드 공통 */
         .month-grid, .calendar-grid { min-height: 210px; display: none; /* 모드 전환으로 display: grid 설정 */ align-content: start; }
         .month-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
         .calendar-grid { grid-template-columns: repeat(7, 1fr); gap: 5px; }
         
         .weekday { text-align: center; font-weight: 500; padding: 5px 0; font-size: 13px; color: #666; }
         .weekday:first-child { color: #e53935; }
         .weekday:last-child { color: #4373c5; }
         
         .month-button { background-color: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 10px 0; font-size: 14px; cursor: pointer; text-align: center; transition: all 0.2s; }
         .month-button:hover:not(.disabled) { background-color: #f0f8ff; }
         .month-button.selected { background-color: #2563eb; color: white; border-color: #2563eb; }
         .month-button.in-range:not(.selected) { background-color: #e6edf9; color: #333; }
         .month-button.disabled { background-color: #e9ecef; border-color: #ddd; color: #999; cursor: not-allowed; pointer-events: none; }
         
         .day { text-align: center; padding: 0; cursor: pointer; font-size: 14px; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin: 1px auto; transition: background-color 0.2s, color 0.2s; }
         .day:not(.disabled):not(.other-month):hover { background-color: #e6edf9; }
         .day.sunday:not(.other-month) { color: #e53935; }
         .day.saturday:not(.other-month) { color: #4373c5; }
         .day.other-month { color: #bbb; cursor: default; }
         .day.selected { background-color: #2563eb; color: white !important; font-weight: 600; }
         .day.in-range:not(.selected) { background-color: #e6edf9; color: #333; border-radius: 0; /* 범위 중간은 사각형 */ }
         /* 범위의 시작/끝은 둥글게 (선택된 날짜와 겹칠 때 고려) */
         .day.range-start:not(.selected) { background-color: #e6edf9; border-top-left-radius: 50%; border-bottom-left-radius: 50%; }
         .day.range-end:not(.selected) { background-color: #e6edf9; border-top-right-radius: 50%; border-bottom-right-radius: 50%; }
         /* 시작/종료일이 같을 때 */
         .day.range-start.range-end:not(.selected) { border-radius: 50%; } 

         .day.disabled { color: #ccc; cursor: not-allowed; pointer-events: none; opacity: 0.6; }
         
         /* 모드 전환 */
         .month-view-element, .date-view-element { display: none; }
         .modal-container.show-month-view .month-view-element, .modal-container.show-month-view .month-grid { display: grid; }
         .modal-container.show-date-view .date-view-element, .modal-container.show-date-view .calendar-grid { display: grid; }
         .modal-container.show-date-view .month-select { display: inline-block; }

         /* 선택 정보/버튼 */
         .selection-info { display: flex; padding: 10px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 15px; align-items: center; }
         .selection-label { font-weight: 600; margin-right: 10px; min-width: 60px; }
         .selection-dates { font-weight: 500; color: #333; }
         .button-area { display: flex; justify-content: center; padding-top: 10px; }
         .confirm-button { background-color: #2563eb; color: white; border: none; border-radius: 6px; padding: 10px 30px; font-size: 15px; font-weight: 500; cursor: pointer; transition: background-color 0.2s; }
         .confirm-button:hover { background-color: #1d4ed8; }
       </style>

       <slot name="trigger"></slot>

       <div class="modal-overlay">
         <div class="modal-container"> 
           <div class="modal-header">
             <div class="modal-title">날짜선택</div>
             <button class="close-button">×</button>
           </div>
           <div class="calendar-container">
             <div class="calendar-section">
               <div class="calendar-header month-view-element">조회 시작월</div>
               <div class="calendar-header date-view-element">조회 시작일</div>
               <div class="year-selector">
                 <button class="nav-button prev-year-start">＜</button>
                 <div class="year-select" id="startYearSelect"></div>
                 <div class="month-select date-view-element" id="startMonthSelect"></div>
                 <button class="nav-button next-year-start">＞</button>
               </div>
               <div class="month-grid month-view-element" id="startMonthGrid"></div>
               <div class="calendar-grid date-view-element" id="startCalendarGrid">
                 <div class="weekday">일</div> <div class="weekday">월</div> <div class="weekday">화</div>
                 <div class="weekday">수</div> <div class="weekday">목</div> <div class="weekday">금</div>
                 <div class="weekday">토</div>
               </div>
             </div>
             <div class="calendar-section">
               <div class="calendar-header month-view-element">조회 종료월</div>
               <div class="calendar-header date-view-element">조회 종료일</div>
               <div class="year-selector">
                 <button class="nav-button prev-year-end">＜</button>
                 <div class="year-select" id="endYearSelect"></div>
                 <div class="month-select date-view-element" id="endMonthSelect"></div>
                 <button class="nav-button next-year-end">＞</button>
               </div>
               <div class="month-grid month-view-element" id="endMonthGrid"></div>
               <div class="calendar-grid date-view-element" id="endCalendarGrid">
                 <div class="weekday">일</div> <div class="weekday">월</div> <div class="weekday">화</div>
                 <div class="weekday">수</div> <div class="weekday">목</div> <div class="weekday">금</div>
                 <div class="weekday">토</div>
               </div>
             </div>
           </div>
           <div class="selection-info">
             <div class="selection-label">선택기간</div>
             <div class="selection-dates" id="selectionDates">-</div>
           </div>
           <div class="button-area">
             <button id="confirmDateBtn" class="confirm-button">확인</button>
           </div>
         </div>
       </div>
     `;
    this.appendChild(template.content.cloneNode(true));
  }

  updateViewMode(mode) {
    if (!this.modalContainer) return;
    this.modalContainer.classList.remove('show-month-view', 'show-date-view');
    if (mode === 'month') {
      this.modalContainer.classList.add('show-month-view');
      this.initMonthView();
    } else { 
      this.modalContainer.classList.add('show-date-view');
      this.initDateView();
    }
  }

  initMonthView() {
    this.updateYearMonthDisplay();
    this.renderMonthButtons(this.startMonthGrid, this._currentYearStart, 'start');
    this.renderMonthButtons(this.endMonthGrid, this._currentYearEnd, 'end');
    this.updateMonthSelection(); // 선택 시각화
    this.updateSelectionDisplay(); // 하단 텍스트 업데이트
  }

  initDateView() {
    this.updateYearMonthDisplay();
    this.renderCalendar(this.startCalendarGrid, this._currentYearStart, this._currentMonthStart);
    this.renderCalendar(this.endCalendarGrid, this._currentYearEnd, this._currentMonthEnd);
    this.updateDateSelection(); // 선택 시각화
    this.updateSelectionDisplay(); // 하단 텍스트 업데이트
  }

  updateYearMonthDisplay() {
      if (!this.startYearSelect || !this.endYearSelect) return;
      const mode = this.getAttribute('select-mode') || 'date';
      this.startYearSelect.textContent = this._currentYearStart;
      this.endYearSelect.textContent = this._currentYearEnd;
      if (mode === 'date') {
          this.startMonthSelect.textContent = this._currentMonthStart + 1;
          this.endMonthSelect.textContent = this._currentMonthEnd + 1;
      }
  }

  renderMonthButtons(container, year, type) {
      if (!container) return;
      container.innerHTML = '';
      for (let month = 0; month < 12; month++) {
          const button = document.createElement('button');
          button.className = 'month-button';
          button.textContent = month + 1;
          button.dataset.year = year;
          button.dataset.month = month;
          // 기본 비활성화 로직 (시작 < 종료)
          if (type === 'end' && this._startDate) {
              const startDate = new Date(this._startDate);
              startDate.setDate(1);
              if (year < startDate.getFullYear() || (year === startDate.getFullYear() && month < startDate.getMonth())) {
                  button.classList.add('disabled');
              }
          }
          container.appendChild(button);
      }
      this.updateMonthSelection(); // 렌더링 후 선택 상태 업데이트
  }

  renderCalendar(container, year, month) {
      if (!container) return;
      const existingDays = container.querySelectorAll('.day');
      existingDays.forEach(day => day.remove());

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfMonth = new Date(year, month, 1).getDay();

      for (let i = 0; i < firstDayOfMonth; i++) {
          const emptyCell = document.createElement('div');
          emptyCell.className = 'day other-month';
          container.appendChild(emptyCell);
      }

      for (let day = 1; day <= daysInMonth; day++) {
          const dayCell = document.createElement('div');
          const currentDate = new Date(year, month, day);
          dayCell.className = 'day';
          dayCell.textContent = day;
          dayCell.dataset.date = this.formatDateForData(currentDate);
          
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek === 0) dayCell.classList.add('sunday');
          if (dayOfWeek === 6) dayCell.classList.add('saturday');

          // 기본 비활성화 로직 (시작 <= 종료)
          const isStartCalendar = container.id === 'startCalendarGrid';
          if (!isStartCalendar && this._startDate) {
             if (currentDate < this._startDate) {
                  dayCell.classList.add('disabled');
             }
          }
          container.appendChild(dayCell);
      }
      this.updateDateSelection(); // 렌더링 후 선택 상태 업데이트
      this.updateYearMonthDisplay();
  }

  // 날짜/월 선택 로직
  selectDate(type, date) {
      if (type === 'start') {
          this._startDate = date;
          // 시작일이 종료일보다 뒤면 종료일도 같이 변경
          if (this._endDate < this._startDate) {
              this._endDate = new Date(this._startDate);
          }
          // 종료 달력 리렌더링 (비활성화 업데이트)
          this.renderCalendar(this.endCalendarGrid, this._currentYearEnd, this._currentMonthEnd);
      } else { // type === 'end'
          this._endDate = date;
          // 종료일이 시작일보다 앞이면 시작일도 같이 변경 (기본 비활성화 로직 때문에 발생 안 할 수 있음)
          if (this._endDate < this._startDate) {
              this._startDate = new Date(this._endDate);
              this.renderCalendar(this.startCalendarGrid, this._currentYearStart, this._currentMonthStart);
          }
      }
      this.updateDateSelection();
      this.updateSelectionDisplay();
  }

  selectMonth(type, year, month) {
      const date = new Date(year, month, 1);
      if (type === 'start') {
          this._startDate = date;
          if (this._endDate < this._startDate) {
              this._endDate = new Date(this._startDate);
          }
          this.renderMonthButtons(this.endMonthGrid, this._currentYearEnd, 'end');
      } else {
          this._endDate = date;
          if (this._endDate < this._startDate) {
              this._startDate = new Date(this._endDate);
              this.renderMonthButtons(this.startMonthGrid, this._currentYearStart, 'start');
          }
      }
      this.updateMonthSelection();
      this.updateSelectionDisplay();
  }

  // 날짜 선택 시각화 업데이트
  updateDateSelection() {
      if (!this._startDate || !this.startCalendarGrid || !this.endCalendarGrid) return;
      const startTimestamp = this._startDate.getTime();
      const endTimestamp = this._endDate ? this._endDate.getTime() : startTimestamp;

      this.querySelectorAll('.day:not(.other-month)').forEach(day => {
          day.classList.remove('selected', 'in-range', 'range-start', 'range-end');
          const cellDate = this.parseDate(day.dataset.date);
          const cellTimestamp = cellDate.getTime();

          if (this.isSameDate(cellDate, this._startDate)) {
              day.classList.add('selected', 'range-start');
          }
          if (this._endDate && this.isSameDate(cellDate, this._endDate)) {
              day.classList.add('selected', 'range-end');
          }
          if (cellTimestamp > startTimestamp && cellTimestamp < endTimestamp) {
              day.classList.add('in-range');
          }
          // 시작과 끝이 같은 경우 range-start/end 모두 추가됨 (CSS에서 처리)
      });
  }

  // 월 선택 시각화 업데이트
  updateMonthSelection() {
      if (!this._startDate || !this.startMonthGrid || !this.endMonthGrid) return;
      const startYear = this._startDate.getFullYear();
      const startMonth = this._startDate.getMonth();
      const endYear = this._endDate ? this._endDate.getFullYear() : startYear;
      const endMonth = this._endDate ? this._endDate.getMonth() : startMonth;

      this.querySelectorAll('.month-button').forEach(button => {
          button.classList.remove('selected', 'in-range');
          const year = parseInt(button.dataset.year);
          const month = parseInt(button.dataset.month);
          const buttonTime = new Date(year, month, 1).getTime();
          const startTime = new Date(startYear, startMonth, 1).getTime();
          const endTime = new Date(endYear, endMonth, 1).getTime();

          if (year === startYear && month === startMonth) {
              button.classList.add('selected');
          }
          if (this._endDate && year === endYear && month === endMonth) {
              button.classList.add('selected');
          }
          if (buttonTime > startTime && buttonTime < endTime) {
              button.classList.add('in-range');
          }
      });
  }

  // 하단 선택 기간 텍스트 업데이트
  updateSelectionDisplay() {
      if (!this.selectionDates) return;
      const mode = this.getAttribute('select-mode') || 'date';
      let text = '-';
      if (this._startDate) {
          const startStr = mode === 'month' 
              ? `${this._startDate.getFullYear()}.${String(this._startDate.getMonth() + 1).padStart(2, '0')}`
              : this.formatDateForDisplay(this._startDate);
          const endStr = this._endDate 
              ? (mode === 'month' 
                  ? `${this._endDate.getFullYear()}.${String(this._endDate.getMonth() + 1).padStart(2, '0')}`
                  : this.formatDateForDisplay(this._endDate))
              : startStr;
          text = `${startStr} ~ ${endStr}`;
      }
      this.selectionDates.textContent = text;
  }

  // 확인 버튼 처리
  handleConfirm() {
    this.dispatchEvent(new CustomEvent('confirm-dates', {
        detail: {
            startDate: new Date(this._startDate), // 복사본 전달
            endDate: new Date(this._endDate),   // 복사본 전달
            formattedText: this.selectionDates.textContent
        }
    }));
    this.updateOutputElements(); // 연결된 요소 업데이트
    this.hideModal();
  }
  
  // output-classes에 지정된 요소 업데이트
  updateOutputElements() {
      const outputClasses = this.getAttribute('output-classes')?.split(',').map(s => s.trim());
      if (!outputClasses || outputClasses.length === 0 || !document) return;

      const startStr = this.formatDateForDisplay(this._startDate);
      const endStr = this.formatDateForDisplay(this._endDate);

      if (outputClasses.length === 1) {
          document.querySelectorAll(`.${outputClasses[0]}`).forEach(el => {
              el.textContent = `${startStr} ~ ${endStr}`;
          });
      } else if (outputClasses.length >= 2) {
          document.querySelectorAll(`.${outputClasses[0]}`).forEach(el => {
              el.textContent = startStr;
          });
          document.querySelectorAll(`.${outputClasses[1]}`).forEach(el => {
              el.textContent = endStr;
          });
      }
  }

  // --- Helper Functions --- 
  parseDate(dateStr) { // YYYY-MM-DD
      const [year, month, day] = dateStr.split('-').map(Number);
      // 시간 정보 없이 Date 객체 생성
      return new Date(year, month - 1, day);
  }
  isSameDate(date1, date2) {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate();
  }
  formatDateForData(date) { // YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }
  formatDateForDisplay(date) { // YYYY.MM.DD
      if (!date) return '';
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  }

  // --- Navigation --- 
  changeYear(calendarType, step) {
      if (calendarType === 'start') {
          this._currentYearStart += step;
          this.renderMonthButtons(this.startMonthGrid, this._currentYearStart, 'start');
      } else {
          this._currentYearEnd += step;
          this.renderMonthButtons(this.endMonthGrid, this._currentYearEnd, 'end');
      }
      this.updateYearMonthDisplay();
  }

  navigateMonth(calendarType, step) {
      if (calendarType === 'start') {
          this._currentMonthStart += step;
          if (this._currentMonthStart < 0) {
              this._currentMonthStart = 11;
              this._currentYearStart--;
          } else if (this._currentMonthStart > 11) {
              this._currentMonthStart = 0;
              this._currentYearStart++;
          }
          this.renderCalendar(this.startCalendarGrid, this._currentYearStart, this._currentMonthStart);
      } else {
          this._currentMonthEnd += step;
          if (this._currentMonthEnd < 0) {
              this._currentMonthEnd = 11;
              this._currentYearEnd--;
          } else if (this._currentMonthEnd > 11) {
              this._currentMonthEnd = 0;
              this._currentYearEnd++;
          }
          this.renderCalendar(this.endCalendarGrid, this._currentYearEnd, this._currentMonthEnd);
      }
  }

  // --- Modal --- 
  showModal() {
    if (this.modalOverlay) {
      const currentMode = this.getAttribute('select-mode') || 'date';
      // 모달 열기 전 현재 연/월/선택 상태로 리렌더링
      this._currentYearStart = this._startDate.getFullYear();
      this._currentMonthStart = this._startDate.getMonth();
      this._currentYearEnd = this._endDate.getFullYear();
      this._currentMonthEnd = this._endDate.getMonth();
      this.updateViewMode(currentMode); 
      this.modalOverlay.style.display = 'flex';
    }
  }

  hideModal() {
    if (this.modalOverlay) {
      this.modalOverlay.style.display = 'none';
    }
  }
}

customElements.define('date-selector-component', DateSelectorComponent);