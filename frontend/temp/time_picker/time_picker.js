/**
 * TimePicker 웹 컴포넌트
 * 시작 시간과 종료 시간을 선택할 수 있는 모달 UI를 제공합니다.
 */
class TimePicker extends HTMLElement {
  /**
   * 생성자: Shadow DOM 설정 및 초기 상태 설정
   */
  constructor() {
    super();
    // Shadow DOM 생성 및 연결
    this.attachShadow({ mode: 'open' });
    
    // 내부 상태 초기화
    this._modal = null; // 모달 요소 참조
    this._isOpen = false; // 모달 열림 상태
    this._outputElements = []; // 시간 값을 출력할 요소 참조
    this._confirmButton = null; // 확인 버튼 참조
    this._scrollTimeout = null; // 스크롤 디바운싱 타이머
    this._isAdjustingScroll = false; // 스크롤 조정 중 플래그
    this._minuteStep = 1; // 분 단위 기본값 1

    // 선택된 시간 상태 (초기값 설정, 필요시 attribute에서 로드)
    this._selectedStartTime = { day: 0, hour: 9, minute: 0 }; // 금일 09:00
    this._selectedEndTime = { day: 0, hour: 18, minute: 0 }; // 금일 18:00

    // --- 시작일 및 종료일의 선택 가능 범위 ---
    // 시작일의 시간 범위 (항상 당일)
    this._startRange = {
        start: { hour: 9, minute: 0 }, // 최소 시작 시간 (08:00)
        end: { hour: 23, minute: 59 }  // 최대 시작 시간 (23:59)
    };
    // 종료일의 시간 범위 (시작일에 따라 동적으로 변하지만, 절대적인 최대 범위)
    this._endRange = {
        // 최소 종료 시간은 시작일의 시작 시간과 같음 (실제 선택은 시작 시간 이후부터)
        start: { day: 0, hour: 8, minute: 0 },
        // 최대 종료 시간 (익일 15:00)
        end: { day: 1, hour: 15, minute: 0 }
    };

    // 스크롤 선택기 참조 초기화
    this._startDaySelector = null;
    this._startHourSelector = null;
    this._startMinuteSelector = null;
    this._endDaySelector = null;
    this._endHourSelector = null;
    this._endMinuteSelector = null;
  }

  /**
   * 컴포넌트가 DOM에 연결될 때 호출됩니다.
   * 초기 렌더링 및 이벤트 리스너 설정을 수행합니다.
   */
  connectedCallback() {
    // 초기 속성 확인 및 적용
    this._initializeFromAttributes();
    
    this._render();
    this._setupTriggerListeners();
    this._queryOutputElements(); // output-classes 속성으로 지정된 요소 찾기
    this._setInitialOutputDisplay(); // 초기 시간 값을 출력 요소에 표시
  }

  /**
   * 컴포넌트가 DOM에서 제거될 때 호출됩니다.
   * 이벤트 리스너를 정리합니다.
   */
  disconnectedCallback() {
    this._cleanupEventListeners();
  }

  /**
   * 관찰할 속성 목록을 정의합니다.
   * 'output-classes', 'minute-steps', 'start-range', 'end-range' 속성 변경을 감지합니다.
   */
  static get observedAttributes() {
    return ['output-classes', 'minute-steps', 'start-range', 'end-range'];
  }

  /**
   * 속성이 변경될 때 호출됩니다.
   * @param {string} name - 변경된 속성 이름
   * @param {string} oldValue - 이전 값
   * @param {string} newValue - 새 값
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'output-classes') {
      this._queryOutputElements(); // output-classes가 변경되면 요소 다시 찾기
    } else if (name === 'minute-steps') {
      const step = parseInt(newValue, 10);
      // 유효한 숫자이고 0 이상인 경우만 적용, 아니면 기본값 1
      this._minuteStep = (!isNaN(step) && step >= 0) ? step : 1;
      // 스텝 변경 시 Picker UI 즉시 업데이트
      if (this.shadowRoot) { // 컴포넌트가 연결된 상태인지 확인
        this._updatePickerUI('start');
        this._updatePickerUI('end');
      }
    } else if (name === 'start-range') {
      try {
        // JSON으로 파싱 또는 기본 형식 파싱
        const rangeData = this._parseRangeAttribute(newValue);
        if (rangeData) {
          // 기존 설정에 덮어씌우기 (없는 속성은 유지)
          this._startRange = { 
            ...this._startRange,
            start: { ...this._startRange.start, ...rangeData.start },
            end: { ...this._startRange.end, ...rangeData.end }
          };
          // UI 업데이트
          if (this.shadowRoot) {
            this._updatePickerUI('start');
            this._updatePickerUI('end'); // 종료 시간 옵션도 업데이트 필요할 수 있음
          }
        }
      } catch (error) {
        console.error('시작 범위 속성 파싱 오류:', error);
      }
    } else if (name === 'end-range') {
      try {
        // JSON으로 파싱 또는 기본 형식 파싱
        const rangeData = this._parseRangeAttribute(newValue);
        if (rangeData) {
          // 기존 설정에 덮어씌우기 (없는 속성은 유지)
          this._endRange = { 
            ...this._endRange,
            start: { ...this._endRange.start, ...rangeData.start },
            end: { ...this._endRange.end, ...rangeData.end }
          };
          // UI 업데이트
          if (this.shadowRoot) {
            this._updatePickerUI('end');
          }
        }
      } catch (error) {
        console.error('종료 범위 속성 파싱 오류:', error);
      }
    }
  }

  /**
   * 범위 속성 문자열 파싱 함수
   * @param {string} attributeStr - JSON 또는 특수 형식 문자열
   * @returns {object|null} 파싱된 범위 객체 또는 null
   * @private
   */
  _parseRangeAttribute(attributeStr) {
    if (!attributeStr) return null;
    
    try {
      // 먼저 JSON으로 파싱 시도
      return JSON.parse(attributeStr);
    } catch (e) {
      // JSON 파싱 실패 시 수동 파싱 시도
      // 예: "start:8:30,end:23:59" 또는 "start:0:8:30,end:1:15:00" 형식
      const result = { 
        start: {}, 
        end: {} 
      };
      
      const parts = attributeStr.split(',');
      parts.forEach(part => {
        const [key, ...values] = part.split(':');
        if (key.trim() === 'start') {
          if (values.length === 3) {
            // 일(day) 포함 형식: "start:0:8:30"
            result.start.day = parseInt(values[0], 10);
            result.start.hour = parseInt(values[1], 10);
            result.start.minute = parseInt(values[2], 10);
          } else if (values.length === 2) {
            // 일(day) 미포함 형식: "start:8:30"
            result.start.hour = parseInt(values[0], 10);
            result.start.minute = parseInt(values[1], 10);
          }
        } else if (key.trim() === 'end') {
          if (values.length === 3) {
            // 일(day) 포함 형식: "end:1:15:00"
            result.end.day = parseInt(values[0], 10);
            result.end.hour = parseInt(values[1], 10);
            result.end.minute = parseInt(values[2], 10);
          } else if (values.length === 2) {
            // 일(day) 미포함 형식: "end:23:59"
            result.end.hour = parseInt(values[0], 10);
            result.end.minute = parseInt(values[1], 10);
          }
        }
      });
      
      // start 또는 end에 유효한 값이 있는지 확인
      const hasValidStart = Object.keys(result.start).length > 0;
      const hasValidEnd = Object.keys(result.end).length > 0;
      
      return (hasValidStart || hasValidEnd) ? result : null;
    }
  }

  /**
   * 'output-classes' 속성에 지정된 클래스명을 가진 요소들을 찾습니다.
   * @private
   */
  _queryOutputElements() {
    this._outputElements = [];
    const classNames = (this.getAttribute('output-classes') || '').split(',');
    if (classNames.length > 0 && classNames[0]) {
      // 컴포넌트 외부의 document에서 클래스명을 가진 요소들을 찾습니다.
      // 여기서는 temp.html의 .start-box와 .end-box를 찾게 됩니다.
      classNames.forEach(className => {
        const element = document.querySelector(`.${className.trim()}`);
        if (element) {
          this._outputElements.push(element);
        }
      });
    }
  }

  /**
   * 컴포넌트의 기본 구조와 스타일을 Shadow DOM에 렌더링합니다.
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* 기본 스타일 */
        :host {
          display: inline-block;
        }

        /* --- 모달 스타일 --- */
        .time-picker-modal {
          display: none;
          position: fixed;
          left: 0; top: 0; width: 100%; height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          justify-content: center;
          align-items: center;
        }

        .time-picker-modal.open {
          display: flex;
        }

        .modal-content {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          min-width: 450px; /* 너비 조정 */
          max-height: 80vh; /* 최대 높이 설정 */
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 15px;
          flex-shrink: 0; /* 헤더 크기 고정 */
        }

        .modal-title {
          font-size: 1.2em;
          font-weight: bold;
        }

        .close-button {
          background: none; border: none;
          font-size: 1.5em; cursor: pointer; padding: 0 5px;
        }

        /* --- 시간 선택 영역 스타일 --- */
        .modal-body {
          display: flex;
          justify-content: space-around; /* 시작/종료 패널 간격 */
          gap: 20px; /* 패널 사이 간격 */
          overflow-y: auto; /* 내용 많을 시 스크롤 */
          padding: 10px 0;
        }

        .time-panel {
          text-align: center;
        }

        .time-panel-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #555;
        }

        .scroll-picker-container {
          display: flex;
          justify-content: center;
          height: 150px; /* 스크롤 영역 높이 고정 */
          position: relative; /* selection-indicator 기준 */
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden; /* 내부 스크롤 */
          background-color: #f9f9f9;
        }

        /* --- 스크롤 선택기 컬럼 스타일 --- */
        .scroll-picker-column {
          width: 60px; /* 컬럼 너비 */
          overflow-y: scroll;
          scroll-snap-type: y mandatory; /* 스크롤 시 항목에 맞춤 */
          -webkit-overflow-scrolling: touch; /* iOS 부드러운 스크롤 */
          scrollbar-width: none; /* Firefox 스크롤바 숨김 */
        }
        .scroll-picker-column::-webkit-scrollbar {
          display: none; /* Chrome, Safari 스크롤바 숨김 */
        }

        .scroll-picker-item {
          height: 30px; /* 항목 높이 */
          line-height: 30px; /* 세로 중앙 정렬 */
          text-align: center;
          scroll-snap-align: center; /* 중앙에 스냅 */
          cursor: pointer;
          user-select: none; /* 텍스트 선택 방지 */
          font-size: 0.9em;
        }
        .scroll-picker-item:hover {
          background-color: #eee;
        }

        /* --- 선택 표시선 스타일 --- */
        .selection-indicator {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 30px; /* 항목 높이와 동일하게 */
          transform: translateY(-50%);
          border-top: 1px solid #bbb;
          border-bottom: 1px solid #bbb;
          pointer-events: none; /* 클릭 방해 방지 */
          box-sizing: border-box;
          background-color: rgba(0, 0, 0, 0.03);
        }

        /* --- 당일/익일 컬럼 스타일 --- */
        .day-selector {
          width: 70px; /* 너비 살짝 넓게 */
          border-right: 1px solid #eee;
        }
        .day-selector .scroll-picker-item {
          font-weight: 500;
        }

        /* --- 시/분 컬럼 스타일 --- */
        .hour-selector {
          border-right: 1px solid #eee;
        }

        /* --- 모달 푸터 스타일 --- */
        .modal-footer {
          border-top: 1px solid #eee;
          padding-top: 15px;
          margin-top: 15px;
          text-align: right;
          flex-shrink: 0; /* 푸터 크기 고정 */
        }

        .confirm-button {
          padding: 8px 15px;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
        }
        .confirm-button:hover {
          background-color: #1565c0;
        }

      </style>

      <!-- temp.html에서 제공된 버튼들을 표시할 슬롯 -->
        <slot name="trigger"></slot>

      <!-- 모달 창 구조 -->
      <div class="time-picker-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">시간 선택</span>
            <button type="button" class="close-button" aria-label="닫기">&times;</button>
          </div>

          <div class="modal-body">
            <!-- 시작 시간 패널 -->
            <div class="time-panel start-panel">
              <div class="time-panel-title">시작 시간</div>
              <div class="scroll-picker-container">
                <div class="scroll-picker-column day-selector" data-type="day" data-group="start">
                    <!-- 내용은 _updatePickerUI 에서 채움 -->
                </div>
                <div class="scroll-picker-column hour-selector" data-type="hour" data-group="start">
                    <!-- 내용은 _updatePickerUI 에서 채움 -->
                </div>
                <div class="scroll-picker-column minute-selector" data-type="minute" data-group="start">
                    <!-- 내용은 _updatePickerUI 에서 채움 -->
                </div>
                <div class="selection-indicator"></div>
              </div>
            </div>

            <!-- 종료 시간 패널 -->
            <div class="time-panel end-panel">
              <div class="time-panel-title">종료 시간</div>
              <div class="scroll-picker-container">
                 <div class="scroll-picker-column day-selector" data-type="day" data-group="end">
                    <!-- 내용은 _updatePickerUI 에서 채움 -->
                </div>
                <div class="scroll-picker-column hour-selector" data-type="hour" data-group="end">
                    <!-- 내용은 _updatePickerUI 에서 채움 -->
                </div>
                <div class="scroll-picker-column minute-selector" data-type="minute" data-group="end">
                    <!-- 내용은 _updatePickerUI 에서 채움 -->
                </div>
                <div class="selection-indicator"></div>
              </div>
            </div>
          </div>

          <!-- 시간 요약 (옵션) -->
          <div class="time-summary" style="text-align: center; margin-top: 15px; font-size: 0.9em; color: #333;">
            선택시간: <span class="summary-start"></span> 부터 <span class="summary-end"></span>
          </div>
          <div class="duration-summary" style="text-align: center; margin-top: 5px; font-size: 0.9em; color: #333;">
            근무시간: <span class="summary-duration"></span>
          </div>

          <div class="modal-footer">
             <button type="button" class="confirm-button">확인</button>
          </div>

        </div>
      </div>
    `;
    
    // --- 요소 참조 저장 ---
    this._modal = this.shadowRoot.querySelector('.time-picker-modal');
    this._confirmButton = this.shadowRoot.querySelector('.confirm-button');
    this._summaryStartEl = this.shadowRoot.querySelector('.summary-start');
    this._summaryEndEl = this.shadowRoot.querySelector('.summary-end');
    this._summaryDurationEl = this.shadowRoot.querySelector('.summary-duration'); // 근무시간 표시 요소 참조 추가

    const closeButton = this._modal.querySelector('.close-button');
    if (closeButton) closeButton.addEventListener('click', this._handleCloseModal);
    if (this._confirmButton) this._confirmButton.addEventListener('click', this._handleConfirmClick);
    this._modal.addEventListener('click', (event) => {
      if (event.target === this._modal) this._handleCloseModal();
    });

    this._saveSelectorReferences();
    this._setupScrollListeners();

    // 초기 Picker UI 생성
    this._updatePickerUI('start');
    this._updatePickerUI('end');
    this._updateTimeSummary();
  }

  /**
   * 모든 스크롤 선택기 컬럼에 대한 참조를 저장합니다.
   * @private
   */
  _saveSelectorReferences() {
    this._startDaySelector = this.shadowRoot.querySelector('.start-panel .day-selector');
    this._startHourSelector = this.shadowRoot.querySelector('.start-panel .hour-selector');
    this._startMinuteSelector = this.shadowRoot.querySelector('.start-panel .minute-selector');

    this._endDaySelector = this.shadowRoot.querySelector('.end-panel .day-selector');
    this._endHourSelector = this.shadowRoot.querySelector('.end-panel .hour-selector');
    this._endMinuteSelector = this.shadowRoot.querySelector('.end-panel .minute-selector');
  }

  /**
   * 모든 스크롤 선택기 컬럼에 스크롤 이벤트 리스너를 추가합니다.
   * @private
   */
  _setupScrollListeners() {
    const selectors = [
      this._startDaySelector, this._startHourSelector, this._startMinuteSelector,
      this._endDaySelector, this._endHourSelector, this._endMinuteSelector
    ];

    selectors.forEach(selector => {
      if (selector) {
        // 스크롤 이벤트에 _handleScroll 핸들러 연결
        selector.addEventListener('scroll', this._handleScroll, { passive: true });
      }
    });
  }

  /**
   * 슬롯에 할당된 트리거 버튼들에 클릭 이벤트 리스너를 추가합니다.
   * @private
   */
  _setupTriggerListeners() {
    const slot = this.shadowRoot.querySelector('slot[name="trigger"]');
    if (slot) {
      // 슬롯에 할당된 요소들(버튼)을 가져옵니다.
      const assignedNodes = slot.assignedNodes({ flatten: true });

      assignedNodes.forEach(node => {
        // HTML 요소인 경우에만 이벤트 리스너를 추가합니다.
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BUTTON') {
          node.addEventListener('click', this._handleTriggerClick);
        }
      });

      // 슬롯 내용이 동적으로 변경될 경우를 대비 (옵션)
      slot.addEventListener('slotchange', () => {
          this._cleanupEventListeners(); // 기존 리스너 정리
          this._setupTriggerListeners(); // 새 노드에 리스너 다시 설정
      });
    }
  }

  /**
   * 컴포넌트 제거 시 추가된 이벤트 리스너를 정리합니다.
   * @private
   */
  _cleanupEventListeners() {
    // 슬롯 버튼 리스너 제거 (Shadow DOM 외부 요소)
    const slot = this.shadowRoot.querySelector('slot[name="trigger"]');
     if (slot) {
       const assignedNodes = slot.assignedNodes({ flatten: true });
       assignedNodes.forEach(node => {
         if (node.nodeType === Node.ELEMENT_NODE) {
           node.removeEventListener('click', this._handleTriggerClick);
         }
       });
     }
     // 모달 관련 리스너는 Shadow DOM 재생성 시 자동으로 제거됨
  }

  /**
   * 지정된 그룹의 스크롤 피커 UI를 업데이트합니다.
   * @param {'start' | 'end'} group
   * @private
   */
  _updatePickerUI(group) {
      const daySelector = group === 'start' ? this._startDaySelector : this._endDaySelector;
      const hourSelector = group === 'start' ? this._startHourSelector : this._endHourSelector;
      const minuteSelector = group === 'start' ? this._startMinuteSelector : this._endMinuteSelector;

      // 일자 옵션 업데이트 (시작은 항상 당일, 종료는 당일/익일)
      if (daySelector) daySelector.innerHTML = this._generateDayOptions(group);
      // 시간 옵션 업데이트 (범위 적용)
      if (hourSelector) hourSelector.innerHTML = this._generateHourOptions(group);
      // 분 옵션 업데이트 (범위 적용)
      if (minuteSelector) minuteSelector.innerHTML = this._generateMinuteOptions(group);

      // UI 업데이트 후 현재 값으로 스크롤 위치 재설정 (조정 플래그 사용)
      const time = group === 'start' ? this._selectedStartTime : this._selectedEndTime;

      this._scrollToValue(daySelector, time.day);
      this._scrollToValue(hourSelector, time.hour);
      this._scrollToValue(minuteSelector, time.minute);
  }

  /**
   * 스크롤 컬럼의 현재 중앙에 위치한 아이템 값을 가져옵니다.
   * 패딩 아이템은 무시합니다.
   * @param {HTMLElement} selector - 스크롤 컬럼 요소
   * @returns {string | null} 중앙 아이템의 data-value, 없거나 패딩이면 null
   * @private
   */
  _getCurrentValueFromScroll(selector) {
    const items = selector.querySelectorAll('.scroll-picker-item');
    if (!selector || items.length === 0) return null;

    const containerHeight = selector.offsetHeight; // 150px
    const itemHeight = items[1]?.offsetHeight || 30; // Use item[1] to avoid potential padding issues, default 30
    const centerOffset = selector.scrollTop + containerHeight / 2; // 스크롤 영역 중앙의 절대 위치

    // 중앙 위치에 가장 가까운 아이템 인덱스 계산
    // (각 아이템의 중앙 위치 = index * itemHeight + itemHeight / 2)
    // (centerOffset 에 가장 가까운 index * itemHeight + itemHeight / 2 찾기)
    const selectedIndex = Math.round((centerOffset - itemHeight / 2) / itemHeight);

    if (selectedIndex >= 0 && selectedIndex < items.length) {
        const selectedItem = items[selectedIndex];
        if (selectedItem.hasAttribute('data-value')) {
            return selectedItem.dataset.value;
        }
    }
    return null;
  }

  /**
   * 시간 객체를 분 단위로 변환 (금일 00:00 기준)
   * @param {object} time - { day: number, hour: number, minute: number }
   * @returns {number}
   * @private
   */
  _timeToMinutes(time) {
    // 당일 24시 00분은 1440분 (다음 날 0시 0분과 동일한 시점이지만 표현상 구분)
    if (time.hour === 24) {
        // day가 0일 때만 24시 허용 (당일 24:00)
        return time.day * 1440 + 1440;
    }
    return time.day * 1440 + time.hour * 60 + time.minute;
  }

  /**
   * 분 단위를 시간 객체로 변환
   * @param {number} totalMinutes - 금일 00:00 기준 총 분
   * @returns {object} - { day: number, hour: number, minute: number }
   * @private
   */
  _minutesToTime(totalMinutes) {
    // 분이 음수가 되지 않도록 보정 (예: -1분 -> day -1, 23:59)
    const clampedMinutes = Math.max(0, totalMinutes);
    const day = Math.floor(clampedMinutes / 1440);
    const remainingMinutes = clampedMinutes % 1440;
    const hour = Math.floor(remainingMinutes / 60);
    const minute = remainingMinutes % 60;
    return { day, hour, minute };
  }

  /**
   * 주어진 범위와 타입에 맞는 스크롤 아이템 HTML 배열 생성 (패딩 포함)
   * @param {Array<object>} items - { value: number|string, text: string } 배열
   * @param {number} [paddingCount=2] - 앞뒤에 추가할 패딩 아이템 수
   * @returns {string} - 전체 아이템 HTML 문자열
   * @private
   */
  _buildPickerItemsHtml(items, paddingCount = 2) {
      const paddingDiv = '<div class="scroll-picker-item padding-item">&nbsp;</div>';
      const topPadding = Array(paddingCount).fill(paddingDiv).join('');
      const bottomPadding = Array(paddingCount).fill(paddingDiv).join('');
      const itemDivs = items.map(item => `<div class="scroll-picker-item" data-value="${item.value}">${item.text}</div>`).join('');
      return topPadding + itemDivs + bottomPadding;
  }

  /**
   * Day 옵션 HTML 생성
   * @param {'start' | 'end'} group - 'start' 또는 'end'
   * @returns {string} Day 컬럼 아이템 HTML
   * @private
   */
  _generateDayOptions(group) {
      let dayItems = [];
      if (group === 'start') {
          dayItems = [{ value: '0', text: '당일' }]; // 시작은 항상 당일
      } else { // end
          dayItems = [
              { value: '0', text: '당일' },
              { value: '1', text: '익일' }
          ];
      }
      return this._buildPickerItemsHtml(dayItems);
  }

  /**
   * Hour 옵션 HTML 생성
   * @param {'start' | 'end'} group - 'start' 또는 'end'
   * @returns {string} Hour 컬럼 아이템 HTML
   * @private
   */
  _generateHourOptions(group) {
      let hourItems = [];
      const startHour = this._selectedStartTime.hour;
      const startDay = this._selectedStartTime.day;

      if (group === 'start') {
          // 시작 시간: _startRange 범위 사용 (예: 8시 ~ 23시)
          const minStartHour = this._startRange.start.hour;
          const maxStartHour = this._startRange.end.hour;
          hourItems = Array.from({ length: maxStartHour - minStartHour + 1 }, (_, i) => i + minStartHour)
                         .map(h => ({ value: h, text: String(h).padStart(2, '0') }));
      } else { // end
            const startTime = this._selectedStartTime;
            const startMinutes = this._timeToMinutes(startTime);
            // _endRange 사용
            const MAX_END_DAY = this._endRange.end.day;
            const MAX_END_HOUR = this._endRange.end.hour;
            // 익일 15:00에 해당하는 분 값. 종료 시간 옵션 생성 시 이 값을 넘지 않도록 함.
            // 분 옵션 생성 시에는 이 값에 해당하는 분(0)까지만 허용됨.
            const MAX_END_MINUTES_CHECK = MAX_END_DAY * 1440 + MAX_END_HOUR * 60 + this._endRange.end.minute;

            let addedHours = new Set(); // 추가된 '시' 값 추적 (중복 방지, 0-23)

            // 시작 시간의 '시'부터 순회 시작
            let currentDay = startTime.day;
            let currentHour = startTime.hour;

            let counter = 0; // 무한 루프 방지용 카운터

            while (counter < 48) { // 최대 48시간 (이틀 분량)
                // 현재 시간(day, hour)의 시작 분 값 계산
                const currentHourStartMinutes = currentDay * 1440 + currentHour * 60;

                // 1. 현재 시간(currentDay, currentHour)이 유효 범위 내에 있는지 확인
                //    - 시작 시간의 '시' 이후여야 함 (시작 시간과 같은 시각 포함)
                //    - 최대 종료 시간 이전이어야 함 (최대 종료 시각 포함)
                const isAfterOrEqualStartTimeHour = (currentDay > startTime.day) || (currentDay === startTime.day && currentHour >= startTime.hour);
                // 최대 종료 시간 비교 시 분까지 고려 (MAX_END_MINUTES_CHECK 사용)
                const isBeforeOrEqualMaxEndTimeHour = (currentDay < MAX_END_DAY) ||
                                                      (currentDay === MAX_END_DAY && currentHour < MAX_END_HOUR) ||
                                                      (currentDay === MAX_END_DAY && currentHour === MAX_END_HOUR && this._endRange.end.minute === 0); // 최대 시간이 0분일 경우

                // 최대 종료 시간 로직 수정: MAX_END_MINUTES_CHECK를 직접 비교하기보다 day, hour 기준으로 먼저 거름
                const isBeforeMaxEndTimeStrict = (currentDay < MAX_END_DAY) || (currentDay === MAX_END_DAY && currentHour < MAX_END_HOUR);
                const isAtMaxEndTimeHour = (currentDay === MAX_END_DAY && currentHour === MAX_END_HOUR);


                if (isAfterOrEqualStartTimeHour && (isBeforeMaxEndTimeStrict || isAtMaxEndTimeHour)) {
                    // 2. 아직 추가되지 않은 시간이면 목록에 추가 (0-23 범위)
                    const hourValue = currentHour;
                    if (!addedHours.has(hourValue)) {
                        // 최대 종료 시간에 도달했고, 그 시간의 분이 0보다 크면 해당 시간은 포함하지 않음
                        if (!(isAtMaxEndTimeHour && this._endRange.end.minute > 0)) {
                             addedHours.add(hourValue);
                        } else if (isBeforeMaxEndTimeStrict) { // 최대 종료 시간 이전 시간은 항상 포함
                            addedHours.add(hourValue);
                        }
                    }
                }

                // 3. 최대 종료 시간을 넘었는지 확인하고 루프 종료 (시간 단위로만 체크)
                if (currentDay > MAX_END_DAY || (currentDay === MAX_END_DAY && currentHour >= MAX_END_HOUR)) {
                    break;
                }

                // 4. 다음 시간으로 이동
                currentHour++;
                if (currentHour === 24) {
                    currentHour = 0;
                    currentDay++;
                }

                counter++;
            }
             if (counter >= 48) {
                console.warn("Max loop count reached in _generateHourOptions");
            }

            // --- 시간 정렬 및 24시 처리 ---
            let validHours = Array.from(addedHours); // Set을 배열로 변환

            // Custom Sort: 시작 시간을 기준으로 시간 순서 정렬
            const startHourValue = startTime.hour;
            validHours.sort((a, b) => {
                // 시작 시간 이전의 시간은 24를 더해서 비교 (예: 시작 8시 -> 0시는 24, 7시는 31로 간주)
                const valA = a < startHourValue ? a + 24 : a;
                const valB = b < startHourValue ? b + 24 : b;
                return valA - valB;
            });

            // 시작 시간이 당일(0)이고 정렬된 목록에 _startRange.end.hour(23시)가 있으면 24시 추가
            // 단, _endRange.end 가 당일 24:00 미만이면 24시 추가 안 함
            const canAdd24Hour = this._endRange.end.day > 0 || (this._endRange.end.day === 0 && this._endRange.end.hour === 24);
            if (startTime.day === 0 && canAdd24Hour) {
                const indexOfMaxStartHour = validHours.indexOf(this._startRange.end.hour);
                if (indexOfMaxStartHour !== -1) {
                    // 24시가 이미 없는 경우에만 추가
                    if (!validHours.includes(24)) {
                        validHours.splice(indexOfMaxStartHour + 1, 0, 24); // _startRange.end.hour 바로 뒤에 24 삽입
                    }
                }
            }


            // 최종 hourItems 배열 생성
            hourItems = validHours.map(h => ({
                value: h,
                text: h === 24 ? '24' : String(h).padStart(2, '0')
            }));
        }
      return this._buildPickerItemsHtml(hourItems);
  }

  /**
   * Minute 옵션 HTML 생성
   * @param {'start' | 'end'} group - 'start' 또는 'end'
   * @returns {string} Minute 컬럼 아이템 HTML
   * @private
   */
  _generateMinuteOptions(group) {
      let minuteItems = [];
      const startDay = this._selectedStartTime.day;
      // Use the appropriate hour based on the group
      const selectedHour = (group === 'start') ? this._selectedStartTime.hour : this._selectedEndTime.hour;
      const selectedDay = (group === 'start') ? this._selectedStartTime.day : this._selectedEndTime.day; // 그룹에 맞는 day 가져오기
      const startMinute = this._selectedStartTime.minute; // Keep for 'end' logic reference
      const startHour = this._selectedStartTime.hour; // Keep for 'end' logic reference
      const step = this._minuteStep; // 설정된 분 단위 사용

      // 기본 분 목록 생성 함수 (0-59)
      const generateBaseMinutes = (currentStep) => {
          if (currentStep <= 0) { // 0 또는 음수면 00만 반환
              return [{ value: 0, text: '00' }];
          }
          if (currentStep === 1) { // 1이면 전체 분 반환
              return Array.from({ length: 60 }, (_, i) => i)
                          .map(m => ({ value: m, text: String(m).padStart(2, '0') }));
          }
          // 1보다 큰 스텝이면 해당 간격으로 분 생성
          const minutes = [];
          for (let m = 0; m < 60; m += currentStep) {
              minutes.push({ value: m, text: String(m).padStart(2, '0') });
          }
          return minutes;
      };

      const baseMinuteItems = generateBaseMinutes(step);

      if (group === 'start') {
          // 시작 시간 범위(_startRange)에 따른 분 필터링 추가
          const minStartHour = this._startRange.start.hour;
          const minStartMinute = this._startRange.start.minute;
          const maxStartHour = this._startRange.end.hour;
          const maxStartMinute = this._startRange.end.minute;

          minuteItems = baseMinuteItems.filter(item => {
              const minuteValue = item.value;
              if (selectedHour === minStartHour && minuteValue < minStartMinute) {
                  return false; // 최소 시작 시간의 최소 분 미만 제외
              }
              if (selectedHour === maxStartHour && minuteValue > maxStartMinute) {
                  return false; // 최대 시작 시간의 최대 분 초과 제외
              }
              return true;
          });

      } else { // end
          const endDay = selectedDay; // Use selectedDay for consistency
          const endHour = selectedHour; // Use selectedHour directly here

          // 만약 선택된 종료 시간이 24시면 분은 0만 가능
          if (endHour === 24) {
              // day가 0(당일)일 때만 24시 허용
              if (endDay === 0) {
                  // _endRange.end 가 당일 24:00 인지 확인
                   if (this._endRange.end.day === 0 && this._endRange.end.hour === 24 && this._endRange.end.minute === 0) {
                       return this._buildPickerItemsHtml([{ value: 0, text: '00' }]);
                   } else {
                        // 최대 종료 시간이 당일 24:00 이 아니면 24시 옵션 자체가 나오면 안됨(hour에서 필터링), 비우기
                        return this._buildPickerItemsHtml([]);
                   }
              } else { // 익일 24시는 없음
                   return this._buildPickerItemsHtml([]);
              }
          }

          let minMinute = 0;
          // 종료 시간이 시작 시간과 같은 날짜/시간일 경우, 시작 분 *이후* 부터 선택 가능
          if (endDay === startDay && endHour === startHour) {
              // 시작 분과 같거나 큰 첫 번째 스텝 찾기
              const firstValidStep = baseMinuteItems.find(item => item.value >= startMinute);
              minMinute = firstValidStep ? firstValidStep.value : 60; // 없으면 60으로 설정하여 모두 필터링
          }

          let maxMinute = 59;
          // 종료 시간이 최대 종료 시간(_endRange.end)과 같은 날짜/시간일 경우, 최대 분까지 제한
          if (endDay === this._endRange.end.day && endHour === this._endRange.end.hour) {
              maxMinute = this._endRange.end.minute;
          }

          // --- 분 목록 필터링 (스텝 적용 후) ---
          minuteItems = baseMinuteItems.filter(item => {
              const minuteValue = item.value;
              // 최소 분 제약 (시작 시간과 동일한 시각일 때)
              if (minuteValue < minMinute) return false;
              // 최대 분 제약 (최대 종료 시간과 동일한 시각일 때)
              if (minuteValue > maxMinute) return false;

              return true; // 위의 조건에 걸리지 않으면 포함
          });
          // ... (기존 필터링 후 비어있는 경우 처리 로직 유지) ...
           if (minuteItems.length === 0 && baseMinuteItems.length > 0) {
              // 만약 허용 범위 내 스텝 값이 없다면, 가장 가까운 값? 또는 그냥 비우기?
              // 여기서는 비우는 것으로 유지
          }
          // ------------------------------------
      }
       return this._buildPickerItemsHtml(minuteItems); // Apply padding etc. here
  }

  /**
   * 선택된 시간 상태를 업데이트하고 유효성 검사 및 조정을 수행합니다.
   * 분 wrap-around 시 시간/날짜 자동 조정을 포함합니다.
   * @param {string} group - 'start' 또는 'end'
   * @param {string} type - 'day', 'hour', 'minute'
   * @param {number} value - 선택된 숫자 값
   * @private
   */
  _updateSelectedTime(group, type, value) {
    let changed = false;
    let needsEndTimePickerUpdate = false;
    let adjusted = false; // 조정 발생 여부 플래그
    // needsScrollUpdate 초기화
    let needsScrollUpdate = {
        start: { day: false, hour: false, minute: false },
        end: { day: false, hour: false, minute: false }
    };

    const timeToUpdate = group === 'start' ? this._selectedStartTime : this._selectedEndTime;
    const previousTime = { ...timeToUpdate }; // 업데이트 전 상태 저장

    // 1. 시간 상태 업데이트 시도
    if (timeToUpdate[type] !== value) {
        // --- 추가: day 변경 시 hour/minute 초기화 방지 ---
        // day가 변경될 때는 hour/minute 값은 그대로 유지한다.
        // hour/minute 변경 시에는 해당 type만 업데이트한다.
        timeToUpdate[type] = value;
        changed = true;

        if (group === 'start') {
            needsEndTimePickerUpdate = true; // 시작 시간 바뀌면 종료 옵션 재계산 필요
            adjusted = true; // 시작 시간 변경은 조정으로 간주하여 후속 처리 유도
        } else if (group === 'end') {
            // 종료 시간이 변경되면 항상 종료 피커 UI 업데이트 필요
            needsEndTimePickerUpdate = true;
             adjusted = true; // 종료 시간 변경도 조정으로 간주
        }
    }

    if (!changed) return; // 실제 변경 없으면 종료

    // === 추가: 종료 시간 '시' 변경 시 자동 '일' 조정 가능성 ===
    if (group === 'end' && type === 'hour') {
        const startHour = this._selectedStartTime.hour;
        const startDay = this._selectedStartTime.day;
        const endDay = timeToUpdate.day; // 현재 종료 시간의 '일'
        const endHour = value; // 새로 선택된 '시'

        // 시작이 '당일'이고, 현재 종료도 '당일'인데, 선택한 '시'가 시작 '시'보다 작으면 '익일'로 자동 변경 시도
        if (startDay === 0 && endDay === 0 && endHour < startHour) {
             // 단, _endRange.end 가 익일 이전이면 익일로 변경 불가
             if(this._endRange.end.day >= 1) {
                timeToUpdate.day = 1;
                needsScrollUpdate.end.day = true; // '일' 스크롤 업데이트 필요
                adjusted = true; // 조정 발생 간주
             } else {
                 // 익일 변경 불가하면 그냥 시간만 업데이트된 상태 유지 (하단 유효성 검사에서 처리)
             }

        }
        // (선택사항) 사용자가 '익일'에서 '시'를 시작 '시'보다 크게 변경하는 경우 '당일'로 되돌릴지? -> 보류.
    } else if (group === 'end' && type === 'day' && value === 0) { // 종료 '일'을 '당일'로 변경
        const startHour = this._selectedStartTime.hour;
        const endHour = timeToUpdate.hour; // 현재 종료 '시'

        // 만약 현재 종료 시간이 시작 시간보다 작다면, 시간을 시작 시간으로 강제 조정
        if (endHour < startHour) {
            // 시작 시간으로 돌리는 것보다, 유효한 가장 빠른 시간으로?
            // -> 아니면 그냥 두고 아래 유효성 검사에서 처리
            // timeToUpdate.hour = startHour;
            // timeToUpdate.minute = this._selectedStartTime.minute; // 분도 맞춰야 할 수도?
            // needsScrollUpdate.end.hour = true;
            // needsScrollUpdate.end.minute = true;
             adjusted = true;
        }
        // 24시에서 당일로 온 경우 처리
        if (timeToUpdate.hour === 24) {
             timeToUpdate.hour = 23; // 이전 유효한 시간으로
             timeToUpdate.minute = 59;
             needsScrollUpdate.end.hour = true;
             needsScrollUpdate.end.minute = true;
             adjusted = true;
        }
    }


    // === 분 Wrap-Around 처리 (59->00 또는 00->59) ===
    let needsHourDayUpdate = false;
    if (type === 'minute') {
      // 분 스텝 고려: step=1 일때만 wrap-around 정확히 동작
      const step = this._minuteStep;
      if (step === 1) {
           if (previousTime.minute === 59 && timeToUpdate.minute === 0) { // 59 -> 00
            // ... (기존 시간/날짜 증가 로직) ...
            timeToUpdate.hour++;
            if (timeToUpdate.hour === 24) {
              timeToUpdate.hour = 0;
              timeToUpdate.day++; // 날짜 증가
              needsHourDayUpdate = true; // 시간 및 날짜 스크롤 업데이트 필요
            } else {
              needsHourDayUpdate = true; // 시간 스크롤 업데이트 필요
            }
             if (group === 'start') needsEndTimePickerUpdate = true; // 시작 시간 변경 시 종료 옵션 업데이트
             adjusted = true;

           } else if (previousTime.minute === 0 && timeToUpdate.minute === 59) { // 00 -> 59
            // ... (기존 시간/날짜 감소 로직) ...
             timeToUpdate.hour--;
            if (timeToUpdate.hour < 0) {
              timeToUpdate.hour = 23;
              timeToUpdate.day--; // 날짜 감소
              needsHourDayUpdate = true; // 시간 및 날짜 스크롤 업데이트 필요
            } else {
               needsHourDayUpdate = true; // 시간 스크롤 업데이트 필요
            }
             if (group === 'start') needsEndTimePickerUpdate = true; // 시작 시간 변경 시 종료 옵션 업데이트
             adjusted = true;
           }
      } else {
          // 스텝이 1이 아니면 wrap-around 시 시간 변경은 발생하지 않음 (선택된 분 값만 변경)
          // 필요하다면 스텝 단위 wrap-around 로직 추가 가능
      }
    }

    // 2. 시간 범위 상수 (분 단위로 변환) - _timeToMinutes 사용
    // _startRange 는 day가 없으므로 0으로 간주
    const MIN_START_MINUTES = this._timeToMinutes({ day: 0, ...this._startRange.start });
    const MAX_START_MINUTES = this._timeToMinutes({ day: 0, ...this._startRange.end });
    // _endRange 는 day 포함
    const MAX_END_MINUTES = this._timeToMinutes(this._endRange.end);


    // needsScrollUpdate는 위에서 초기화, 분 wrap-around 발생 시 해당 플래그 업데이트
    needsScrollUpdate.start.day = needsScrollUpdate.start.day || (needsHourDayUpdate && group === 'start');
    needsScrollUpdate.start.hour = needsScrollUpdate.start.hour || (needsHourDayUpdate && group === 'start');
    needsScrollUpdate.end.day = needsScrollUpdate.end.day || (needsHourDayUpdate && group === 'end');
    needsScrollUpdate.end.hour = needsScrollUpdate.end.hour || (needsHourDayUpdate && group === 'end');

    let startMinutes = this._timeToMinutes(this._selectedStartTime);
    let endMinutes = this._timeToMinutes(this._selectedEndTime);

    // === 추가: 24시 선택 시 분 0 강제 ===
    let minuteForcedToZero = false;
    if (timeToUpdate.hour === 24) {
        // day 가 0(당일) 일때만 24시 허용, day 1의 24시는 없음
        if (timeToUpdate.day === 0) {
             if (timeToUpdate.minute !== 0) {
                timeToUpdate.minute = 0;
                needsScrollUpdate[group].minute = true;
                adjusted = true; // 조정 발생 간주
                minuteForcedToZero = true; // 아래에서 end picker update 유발 가능
            }
        } else { // day 가 0이 아니면 24시는 유효하지 않음 -> 시간 조정 필요
             timeToUpdate.hour = 23; // 이전 시간으로 강제
             timeToUpdate.minute = 59;
             needsScrollUpdate[group].hour = true;
             needsScrollUpdate[group].minute = true;
             adjusted = true;
        }

    }

    // === 유효성 검사 및 조정 (자동 '일' 조정 로직 통합) ===

    // 3a. 시작 시간 범위 조정
    let startChangedByValidation = false;
    if (startMinutes < MIN_START_MINUTES) {
      this._selectedStartTime = this._minutesToTime(MIN_START_MINUTES);
      startMinutes = MIN_START_MINUTES;
      needsScrollUpdate.start = { day: true, hour: true, minute: true };
      adjusted = true;
      startChangedByValidation = true;
    } else if (startMinutes > MAX_START_MINUTES) {
      this._selectedStartTime = this._minutesToTime(MAX_START_MINUTES);
      startMinutes = MAX_START_MINUTES;
      needsScrollUpdate.start = { day: true, hour: true, minute: true };
      adjusted = true;
      startChangedByValidation = true;
    }
    // 시작 시간이 조정된 경우, 종료 시간 옵션 및 유효성 재검토 필요
    if (startChangedByValidation) {
        needsEndTimePickerUpdate = true;
        // 시작 시간 조정 후 endMinutes 다시 계산 필요할 수 있음 (종료 시간이 시작보다 빨라졌을 경우 대비)
        endMinutes = this._timeToMinutes(this._selectedEndTime);
    }

    // 3b. 종료 시간 유효성 검사 및 조정
    let endChangedByValidation = false;
    // 종료 시간은 시작 시간보다 *반드시 커야* 하며, 최대 제한을 넘지 않아야 합니다.
    // (시작 시간과 같으면 안됨)
    if (endMinutes <= startMinutes || endMinutes > MAX_END_MINUTES) {
        // 종료 시간을 시작 시간 이후의 가장 빠른 유효한 시간으로 설정 시도
        // 스텝을 고려하여 다음 스텝 시간으로 설정
        let resetTargetMinutes = startMinutes;
        const step = this._minuteStep;
        if (step > 0) {
            resetTargetMinutes = Math.floor(startMinutes / step) * step + step;
             // 만약 스텝 적용 시 60분이 넘어가면 다음 시간으로 올림 (시간/일 조정은 minutesToTime이 처리)
             if (resetTargetMinutes % 60 === 0 && startMinutes % 60 !== 0) {
                 // 분이 0이 되는 경우, 실제로는 분 계산 후 시간 올림 필요
                 // _minutesToTime 이 처리하므로 여기선 분 값만 계산
             }
             // 혹은 그냥 startMinutes + 1 로 할 수도 있음
             // resetTargetMinutes = startMinutes + 1;
        } else { // 스텝 0 또는 음수면 그냥 시작시간 + 1
             resetTargetMinutes = startMinutes + 1;
        }


        // 시작 시간 + step (or 1) 이 최대 제한을 넘는 경우, 최대 제한으로 설정
        if (resetTargetMinutes > MAX_END_MINUTES) {
            resetTargetMinutes = MAX_END_MINUTES;
        }
         // 그래도 시작 시간보다 작거나 같으면 (예: MAX_END_MINUTES가 startMinutes와 같은 경우)
        // 그냥 MAX_END_MINUTES로 설정
        if (resetTargetMinutes <= startMinutes) {
            resetTargetMinutes = MAX_END_MINUTES;
        }

        // 재설정 목표 시간으로 설정
        this._selectedEndTime = this._minutesToTime(resetTargetMinutes);


        // 재설정 후 endMinutes 다시 계산
        endMinutes = this._timeToMinutes(this._selectedEndTime);

        needsScrollUpdate.end = { day: true, hour: true, minute: true }; // 종료 시간 스크롤 업데이트 필요
        adjusted = true; // 조정 발생
        endChangedByValidation = true; // 유효성 검사로 인한 변경
        needsEndTimePickerUpdate = true; // 유효한 시작 시간을 기준으로 종료 옵션 재생성 필요
    }

    // 5. 종료 시간 옵션 재생성 (필요시, 스크롤 조정 전에)
    // 스크롤 조정이 필요한 경우, 조정 전에 UI를 먼저 업데이트해야
    // 올바른 옵션 목록에 대해 스크롤 위치를 계산할 수 있습니다.
    if (needsEndTimePickerUpdate) {
        // 종료 피커 UI 업데이트 전에 startMinutes, endMinutes 최신화
        startMinutes = this._timeToMinutes(this._selectedStartTime);
        endMinutes = this._timeToMinutes(this._selectedEndTime);

        this._updatePickerUI('end');
        // UI 업데이트 후, endMinutes 및 관련 상태가 변경되었을 수 있으므로 다시 계산
        // 예를 들어, 분 옵션이 필터링되어 선택된 분이 바뀔 수 있음
        // 하지만 여기서는 UI 업데이트 후 상태를 강제로 바꾸기보다,
        // 조정이 필요하면 아래 스크롤 조정에서 처리하도록 둠.
        // endMinutes = this._timeToMinutes(this._selectedEndTime);
    }


    // --- 추가: 조정 발생 시 해당 그룹 UI 업데이트 ---
    if (adjusted) {
        // 조정이 종료 시간 유효성 검사에서 발생했다면, 종료 UI는 이미 위에서 업데이트 됨 (needsEndTimePickerUpdate)
        // 시작 시간 조정 또는 분 wrap-around 등으로 시작 UI 업데이트가 필요할 수 있음
        if (group === 'start' || startChangedByValidation) {
             this._updatePickerUI('start');
             // UI 업데이트 후 상태 재계산 (만약 _updatePickerUI가 상태를 변경할 수 있다면)
             startMinutes = this._timeToMinutes(this._selectedStartTime);
        }
       // 종료 시간이 변경되었고, needsEndTimePickerUpdate가 true가 아니었다면(예: 분 wrap around) 여기서 종료 UI 업데이트
       if (group === 'end' && !needsEndTimePickerUpdate) {
            this._updatePickerUI('end');
       }
        // 조정 후 최신 상태로 분 재계산
        endMinutes = this._timeToMinutes(this._selectedEndTime);
    }
    // ----------------------------------------------


    // 4. 스크롤 위치 업데이트 (조정 필요 시)
    const shouldUpdateStartScroll = Object.values(needsScrollUpdate.start).some(v => v);
    const shouldUpdateEndScroll = Object.values(needsScrollUpdate.end).some(v => v);

    const needsManualScroll = shouldUpdateStartScroll || shouldUpdateEndScroll;
    if (needsManualScroll) {
      const wasAdjusting = this._isAdjustingScroll;
      this._isAdjustingScroll = true; // 스크롤 조정 시작

      const updateScroll = (selector, groupKey, typeKey, time) => {
          // Optional chaining으로 키 존재 여부 안전하게 확인
          if (selector && needsScrollUpdate[groupKey]?.[typeKey]) {
              this._scrollToValue(selector, time[typeKey]);
          }
      };

      // 시작 시간 스크롤 업데이트
      updateScroll(this._startDaySelector, 'start', 'day', this._selectedStartTime);
      updateScroll(this._startHourSelector, 'start', 'hour', this._selectedStartTime);
      updateScroll(this._startMinuteSelector, 'start', 'minute', this._selectedStartTime);
      // 종료 시간 스크롤 업데이트
      updateScroll(this._endDaySelector, 'end', 'day', this._selectedEndTime);
      updateScroll(this._endHourSelector, 'end', 'hour', this._selectedEndTime);
      updateScroll(this._endMinuteSelector, 'end', 'minute', this._selectedEndTime);

      // 스크롤 조정 후 플래그 해제 (타임아웃 필요)
      // 플래그 해제 타이머: 스크롤 핸들러의 디바운스(150ms)보다 약간 길게 설정
      setTimeout(() => {
          this._isAdjustingScroll = false;
      }, 160);
    }


    // 7. 최종 상태 로깅 및 시간 요약 업데이트
    // 8. 시간 요약 업데이트
    this._updateTimeSummary();
  }

  /**
   * 특정 스크롤 컬럼을 지정된 값에 해당하는 아이템 위치로 스크롤합니다.
   * @param {HTMLElement} selector - 스크롤 컬럼 요소
   * @param {number | string} value - 스크롤할 대상 값 (data-value)
   * @private
   */
  _scrollToValue(selector, value) {
    if (!selector) {
        return;
    }
    const items = selector.querySelectorAll('.scroll-picker-item');
    let targetItemIndex = -1;
    let foundItem = null; // 찾은 아이템 확인용
    items.forEach((item, index) => {
      if (item.hasAttribute('data-value') && item.dataset.value == value) {
        targetItemIndex = index;
        foundItem = item; // 찾은 아이템 저장
      }
    });
    // === 로그 추가: _scrollToValue 내부 확인 ===

    if (targetItemIndex !== -1) {
      // 아이템 높이를 실제 데이터 아이템에서 가져오도록 시도 (패딩 제외)
      const nonPaddingItem = selector.querySelector('.scroll-picker-item[data-value]');
      const itemHeight = nonPaddingItem?.offsetHeight || 30;

      // 목표 아이템이 스크롤 컨테이너 중앙에 오도록 scrollTop 계산
      // (아이템 중앙 위치 = 아이템 인덱스 * 아이템 높이 + 아이템 높이 / 2)
      // (스크롤 컨테이너 중앙 = 컨테이너 높이 / 2)
      // scrollTop = 아이템 중앙 위치 - 스크롤 컨테이너 중앙
      const containerHeight = selector.offsetHeight; // 스크롤 컨테이너 높이 (150px)
      const scrollToY = targetItemIndex * itemHeight + itemHeight / 2 - containerHeight / 2;

      // 스크롤 실행 (즉시 이동하도록 behavior: 'auto')
      selector.scrollTo({ top: scrollToY, behavior: 'auto' });
    } else {
    }
  }

  /**
   * 모달이 열릴 때 현재 선택된 시간을 기준으로 스크롤 위치를 설정합니다.
   * @private
   */
  _setInitialScrollPositions() {
    // Picker UI가 먼저 생성/업데이트 된 후 스크롤 위치 설정
    this._updatePickerUI('start');
    this._updatePickerUI('end');
    // 스크롤은 _updatePickerUI 내부에서 처리됨
  }

  /**
   * 확인 버튼 클릭 핸들러
   * @private
   */
  _handleConfirmClick = () => {
    // 최종 시간 업데이트 (혹시 모를 동기화)
    this._updateTimeSummary();

    const formattedStartTime = this._formatTimeForDisplay(this._selectedStartTime);
    const formattedEndTime = this._formatTimeForDisplay(this._selectedEndTime);

    if (this._outputElements.length >= 2) {
      this._outputElements[0].textContent = formattedStartTime;
      this._outputElements[1].textContent = formattedEndTime;
    } else {
        console.warn("TimePicker: Not enough output elements found.");
    }
    this._handleCloseModal();
  };

  /**
   * 선택된 시간 객체를 화면 표시용 문자열로 변환합니다.
   * @param {object} time - { day: number, hour: number, minute: number }
   * @returns {string} - "당일 HH:MM" 또는 "익일 HH:MM" 형태의 문자열
   * @private
   */
  _formatTimeForDisplay(time) {
    // 당일 24:00 특별 처리
    if (time.day === 0 && time.hour === 24) {
        return '당일 24:00';
    }
    // 익일 00:00을 당일 24:00으로 잘못 표시하지 않도록 주의
    // (현재 _minutesToTime은 1440분을 {day: 1, hour: 0, minute: 0}으로 반환)

    const dayString = time.day === 1 ? '익일' : '당일';
    const hourString = String(time.hour).padStart(2, '0');
    const minuteString = String(time.minute).padStart(2, '0');
    return `${dayString} ${hourString}:${minuteString}`;
  }

  /** 시간 요약 업데이트 함수 */
  _updateTimeSummary() {
      if (this._summaryStartEl && this._summaryEndEl) {
          this._summaryStartEl.textContent = this._formatTimeForDisplay(this._selectedStartTime);
          this._summaryEndEl.textContent = this._formatTimeForDisplay(this._selectedEndTime);
      }
      // 근무 시간 계산 및 표시
      if (this._summaryDurationEl) {
          const startMinutes = this._timeToMinutes(this._selectedStartTime);
          const endMinutes = this._timeToMinutes(this._selectedEndTime);
          const durationMinutes = Math.max(0, endMinutes - startMinutes); // 음수 방지

          const durationHours = Math.floor(durationMinutes / 60);
          const remainingMinutes = durationMinutes % 60;

          this._summaryDurationEl.textContent = `${durationHours}시간 ${String(remainingMinutes).padStart(2, '0')}분`;
      }
  }

  /**
   * 컴포넌트 연결 시 초기 시간 값을 output 요소에 표시합니다.
   * @private
   */
  _setInitialOutputDisplay() {
    if (this._outputElements.length >= 2) {
      const initialStartTime = this._formatTimeForDisplay(this._selectedStartTime);
      const initialEndTime = this._formatTimeForDisplay(this._selectedEndTime);
      this._outputElements[0].textContent = initialStartTime;
      this._outputElements[1].textContent = initialEndTime;
    } else {
    }
  }

  /**
   * 스크롤 이벤트 핸들러 (디바운싱 적용)
   * @param {Event} event - 스크롤 이벤트 객체
   * @private
   */
  _handleScroll = (event) => {
    const currentSelector = event.target;
    if (!currentSelector || this._isAdjustingScroll) {
      return;
    }
    clearTimeout(this._scrollTimeout);
    this._scrollTimeout = setTimeout(() => {
      if (this._isAdjustingScroll) return;
      const group = currentSelector.dataset.group;
      const type = currentSelector.dataset.type;
      const value = this._getCurrentValueFromScroll(currentSelector);
      if (value !== null && group && type) {
        this._updateSelectedTime(group, type, parseInt(value, 10));
      }
    }, 150);
  };

  /**
   * 트리거 버튼 클릭 시 모달을 엽니다.
   * @param {Event} event - 클릭 이벤트 객체
   * @private
   */
  _handleTriggerClick = (event) => {
    if (this._modal && !this._isOpen) {
      this._modal.classList.add('open');
      this._isOpen = true;
      this._setInitialScrollPositions();
    }
  };

  /**
   * 모달 닫기 버튼 또는 배경 클릭 시 모달을 닫습니다.
   * @private
   */
  _handleCloseModal = () => {
    if (this._modal && this._isOpen) {
      this._modal.classList.remove('open');
      this._isOpen = false;
    }
  };

  /**
   * 초기 속성 값을 파싱하여 컴포넌트 상태에 적용합니다.
   * @private
   */
  _initializeFromAttributes() {
    // minute-steps 속성 초기화
    const minuteStepsAttr = this.getAttribute('minute-steps');
    if (minuteStepsAttr) {
      const step = parseInt(minuteStepsAttr, 10);
      this._minuteStep = (!isNaN(step) && step >= 0) ? step : 1;
    }
    
    // start-range 속성 초기화
    const startRangeAttr = this.getAttribute('start-range');
    if (startRangeAttr) {
      try {
        const rangeData = this._parseRangeAttribute(startRangeAttr);
        if (rangeData) {
          this._startRange = { 
            ...this._startRange,
            start: { ...this._startRange.start, ...rangeData.start },
            end: { ...this._startRange.end, ...rangeData.end }
          };
        }
      } catch (error) {
        console.error('시작 범위 속성 초기화 오류:', error);
      }
    }
    
    // end-range 속성 초기화
    const endRangeAttr = this.getAttribute('end-range');
    if (endRangeAttr) {
      try {
        const rangeData = this._parseRangeAttribute(endRangeAttr);
        if (rangeData) {
          this._endRange = { 
            ...this._endRange,
            start: { ...this._endRange.start, ...rangeData.start },
            end: { ...this._endRange.end, ...rangeData.end }
          };
        }
      } catch (error) {
        console.error('종료 범위 속성 초기화 오류:', error);
      }
    }
  }
}

// 커스텀 엘리먼트 정의
customElements.define('time-picker', TimePicker);
