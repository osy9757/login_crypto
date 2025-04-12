/**
 * 날짜 선택기 JavaScript
 * date_picker.js
 * 두 달력이 있는 모달 형태의 날짜 선택기를 구현합니다.
 */

// 전역 변수
let startDate = new Date();           // 선택된 시작일
let endDate = new Date();             // 선택된 종료일
let currentStartMonth = new Date();   // 현재 표시되는 시작 달력의 월
let currentEndMonth = new Date();     // 현재 표시되는 종료 달력의 월
let isSelecting = false;              // 날짜 선택 중인지 여부
let tempStartDate = null;             // 임시 시작일

// DOM 요소
const dateRangePicker = document.getElementById('dateRangePicker');
const datePickerModal = document.getElementById('datePickerModal');
const datePickerComponent = document.querySelector('date-picker-component');
const calculateDateBtn = document.getElementById('calculateDateBtn');
const clearDateBtn = document.getElementById('clearDateBtn');
const dateResult = document.getElementById('dateResult');

// 컴포넌트 내부 요소는 컴포넌트 로드 후 참조
let startYearSelect, startMonthSelect, endYearSelect, endMonthSelect, startCalendarGrid, endCalendarGrid, selectionDates;

// 날짜 선택 모달 열기
function openDatePicker(options = {}) {
  // 기본 옵션
  const defaultOptions = {
    width: '90%',
    maxWidth: '800px',
    yearRange: 50  // 연도 범위 기본값
  };
  
  // 옵션 병합
  const modalOptions = { ...defaultOptions, ...options };
  
  console.log("날짜 선택기 열기:", modalOptions);
  
  // 모달 크기 설정
  if (datePickerComponent) {
    // 모달 크기 설정
    datePickerComponent.setSize(modalOptions.width, modalOptions.maxWidth);
    
    // 연도 범위 설정 (컴포넌트의 새 메서드 활용)
    datePickerComponent.setYearRange(modalOptions.yearRange);
    
    // 강제로 스타일 적용 확인
    setTimeout(() => {
      console.log("현재 모달 스타일:", 
        `width=${datePickerComponent.style.width}, ` +
        `maxWidth=${datePickerComponent.style.maxWidth}`);
    }, 10);
  } else {
    console.error("datePickerComponent를 찾을 수 없습니다.");
  }
  
  // 모달 표시
  datePickerModal.classList.add('active');
  
  // 컴포넌트 내부 요소 참조 업데이트
  updateComponentReferences();
  
  // 월 선택 옵션 생성 (연도 옵션은 컴포넌트에서 처리)
  populateMonthOptions();
  
  // 달력 생성
  renderCalendars();
  
  // 현재 연도와 월을 선택박스에 설정
  startYearSelect.value = currentStartMonth.getFullYear();
  startMonthSelect.value = currentStartMonth.getMonth();
  endYearSelect.value = currentEndMonth.getFullYear();
  endMonthSelect.value = currentEndMonth.getMonth();
  
  // 선택된 날짜 범위 표시
  updateSelectionInfo();
}

// 컴포넌트 내부 요소 참조 업데이트
function updateComponentReferences() {
  startYearSelect = datePickerComponent.querySelector('#startYearSelect');
  startMonthSelect = datePickerComponent.querySelector('#startMonthSelect');
  endYearSelect = datePickerComponent.querySelector('#endYearSelect');
  endMonthSelect = datePickerComponent.querySelector('#endMonthSelect');
  startCalendarGrid = datePickerComponent.querySelector('#startCalendarGrid');
  endCalendarGrid = datePickerComponent.querySelector('#endCalendarGrid');
  selectionDates = datePickerComponent.querySelector('#selectionDates');
}

// 날짜 선택 모달 닫기
function closeDatePicker() {
  datePickerModal.classList.remove('active');
}

// 월 선택 옵션 생성
function populateMonthOptions() {
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  
  startMonthSelect.innerHTML = '';
  endMonthSelect.innerHTML = '';
  
  months.forEach((month, index) => {
    const startOption = document.createElement('option');
    startOption.value = index;
    startOption.textContent = month;
    startMonthSelect.appendChild(startOption);
    
    const endOption = document.createElement('option');
    endOption.value = index;
    endOption.textContent = month;
    endMonthSelect.appendChild(endOption);
  });
  
  startMonthSelect.value = currentStartMonth.getMonth();
  endMonthSelect.value = currentEndMonth.getMonth();
}

// 달력 렌더링
function renderCalendars() {
  renderCalendar(startCalendarGrid, currentStartMonth, 'start');
  renderCalendar(endCalendarGrid, currentEndMonth, 'end');
  updateEndCalendarDisabledDates();
}

// 개별 달력 렌더링
function renderCalendar(calendarElement, date, calendarType) {
  // 요일 헤더는 HTML에 이미 있으므로 여기서는 날짜만 생성
  
  // 기존 날짜 제거 (요일 헤더 유지)
  while (calendarElement.children.length > 7) {
    calendarElement.removeChild(calendarElement.lastChild);
  }
  
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // 해당 월의 첫날과 마지막날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 첫 날의 요일 (0: 일요일, 6: 토요일)
  const firstDayOfWeek = firstDay.getDay();
  
  // 이전 달의 마지막 날짜
  const prevLastDay = new Date(year, month, 0);
  
  // 이전 달의 날짜 생성
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevLastDay.getDate() - i;
    const dayElement = createDayElement(new Date(year, month - 1, day), 'other-month', calendarType);
    calendarElement.appendChild(dayElement);
  }
  
  // 현재 달의 날짜 생성
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const currentDate = new Date(year, month, i);
    const dayElement = createDayElement(currentDate, '', calendarType);
    calendarElement.appendChild(dayElement);
  }
  
  // 다음 달의 날짜로 나머지 채우기 (총 42칸 = 6주)
  const remainingDays = 42 - (firstDayOfWeek + lastDay.getDate());
  for (let i = 1; i <= remainingDays; i++) {
    const dayElement = createDayElement(new Date(year, month + 1, i), 'other-month', calendarType);
    calendarElement.appendChild(dayElement);
  }
  
  // 선택된 날짜 및 범위 표시
  updateCalendarSelection();
}

// 날짜 요소 생성
function createDayElement(date, additionalClass = '', calendarType) {
  const dayElement = document.createElement('div');
  dayElement.className = 'day';
  dayElement.textContent = date.getDate();
  
  // 날짜를 정확히 저장 (시간 정보 없이)
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const formattedDate = datePickerComponent.formatDateForData(new Date(year, month, day));
  dayElement.dataset.date = formattedDate;
  dayElement.dataset.calendarType = calendarType;
  
  // 추가 클래스 적용
  if (additionalClass) {
    dayElement.classList.add(additionalClass);
  }
  
  // 일요일, 토요일 클래스 추가
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) {
    dayElement.classList.add('sunday');
  } else if (dayOfWeek === 6) {
    dayElement.classList.add('saturday');
  }
  
  // 오늘 날짜 표시
  const today = new Date();
  if (date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear()) {
    dayElement.classList.add('today');
  }
  
  // 날짜 클릭 이벤트
  dayElement.addEventListener('click', (e) => {
    // 비활성화된 날짜는 클릭 불가
    if (dayElement.classList.contains('disabled')) {
      return;
    }
    // 정확한 날짜 전달 (시간 정보 제거)
    selectDate(new Date(year, month, day), calendarType);
  });
  
  return dayElement;
}

// 날짜 선택 처리
function selectDate(date, calendarType) {
  // 정확한 날짜 생성 (시간대 문제로 다음날로 표시되는 문제 해결)
  const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (calendarType === 'start') {
    // 시작일 선택 처리
    startDate = selectedDate;
    
    // 시작일이 종료일보다 이후인 경우에만 종료일을 시작일로 변경
    if (startDate > endDate) {
      endDate = new Date(selectedDate);
    }
  } else {
    // 종료일 선택 처리
    const newEndDate = selectedDate;
    
    // 종료일이 시작일보다 이전이면 선택하지 않음
    if (newEndDate < startDate) {
      alert('종료일은 시작일보다 이전일 수 없습니다.');
      return;
    }
    
    endDate = newEndDate;
  }
  
  // 달력 선택 상태 업데이트
  updateCalendarSelection();
  
  // 선택 정보 업데이트
  updateSelectionInfo();
}

// 달력의 선택 상태 업데이트
function updateCalendarSelection() {
  // 모든 날짜 요소 선택
  const allDays = datePickerComponent.querySelectorAll('.day');
  
  // 기존 선택 및 범위 클래스 제거
  allDays.forEach(day => {
    day.classList.remove('selected', 'in-range', 'disabled');
  });
  
  // 시작일 이전 날짜를 종료일 달력에서 비활성화
  updateEndCalendarDisabledDates();
  
  // 선택된 날짜와 범위 표시
  allDays.forEach(day => {
    const dateStr = day.dataset.date;
    if (!dateStr) return;
    
    // 정확한 날짜 비교를 위해 새로운 Date 객체 생성
    const dayDate = new Date(dateStr);
    const dayWithoutTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    const startWithoutTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endWithoutTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    // 시작일 또는 종료일인 경우 selected 클래스 추가
    if (datePickerComponent.isSameDate(dayWithoutTime, startWithoutTime) || 
        datePickerComponent.isSameDate(dayWithoutTime, endWithoutTime)) {
      day.classList.add('selected');
    }
    // 범위 내 날짜인 경우 in-range 클래스 추가
    else if (dayWithoutTime > startWithoutTime && dayWithoutTime < endWithoutTime) {
      day.classList.add('in-range');
    }
  });
}

// 종료일 달력에서 시작일 이전 날짜 비활성화하는 함수
function updateEndCalendarDisabledDates() {
  // 시작일 이전 날짜 비활성화
  const endCalendarDays = datePickerComponent.querySelectorAll('#endCalendarGrid .day');
  endCalendarDays.forEach(day => {
    const dateStr = day.dataset.date;
    if (!dateStr) return;
    
    // 정확한 날짜 비교를 위해 새로운 Date 객체 생성
    const dayDate = new Date(dateStr);
    const dayWithoutTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
    const startWithoutTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    
    // 시작일보다 이전 날짜인 경우 비활성화
    if (dayWithoutTime < startWithoutTime) {
      day.classList.add('disabled');
    }
  });
}

// 선택 정보 업데이트
function updateSelectionInfo() {
  // 컴포넌트 메서드 활용
  datePickerComponent.updateSelectionInfo(startDate, endDate);
  
  // 입력 필드 업데이트
  dateRangePicker.value = `${datePickerComponent.formatDateForDisplay(startDate)} - ${datePickerComponent.formatDateForDisplay(endDate)}`;
}

// 날짜 차이 계산
function calculateDateDifference() {
  // 유효성 검사
  if (!startDate || !endDate) {
    alert("날짜를 선택해주세요.");
    return;
  }
  
  // 총 일수 차이 계산 (밀리초 → 일)
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // 년, 월, 일 차이 계산ㅇㄴ
  let years = 0;
  let months = 0;
  let days = 0;
  
  // 임시 날짜 객체를 생성하여 계산
  const tempDate = new Date(startDate);
  
  // 년 계산
  while (true) {
    tempDate.setFullYear(tempDate.getFullYear() + 1);
    if (tempDate > endDate) {
      tempDate.setFullYear(tempDate.getFullYear() - 1);
      break;
    }
    years++;
  }
  
  // 월 계산
  while (true) {
    tempDate.setMonth(tempDate.getMonth() + 1);
    if (tempDate > endDate) {
      tempDate.setMonth(tempDate.getMonth() - 1);
      break;
    }
    months++;
  }
  
  // 일 계산
  while (true) {
    tempDate.setDate(tempDate.getDate() + 1);
    if (tempDate > endDate) {
      break;
    }
    days++;
  }
  
  // 결과 출력
  let resultText = "";
  
  if (years > 0) {
    resultText += `${years}년 `;
  }
  
  if (months > 0 || years > 0) {
    resultText += `${months}개월 `;
  }
  
  resultText += `${days}일 / 총 ${diffDays}일`;
  
  dateResult.innerHTML = resultText;
}

// 날짜 초기화
function clearDateSelection() {
  // 오늘 날짜로 초기화 (시간 정보 제거)
  const today = new Date();
  startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // 달력 초기화 (항상 월의 1일로 설정)
  currentStartMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  currentEndMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // 선택 상태 초기화
  isSelecting = false;
  tempStartDate = null;
  
  // UI 업데이트
  updateSelectionInfo();
  
  // 달력이 열려 있는 경우에만 달력 업데이트
  if (datePickerModal.classList.contains('active')) {
    // 연도 옵션은 컴포넌트에서 자동 생성
    populateMonthOptions();
    renderCalendars();
  }
  
  // 결과 초기화
  dateResult.innerHTML = "";
}

// Web Component 이벤트 처리
function setupComponentEventListeners() {
  // 닫기 버튼 이벤트
  datePickerComponent.addEventListener('close-picker', closeDatePicker);
  
  // 확인 버튼 이벤트
  datePickerComponent.addEventListener('confirm-dates', () => {
    updateSelectionInfo();
    closeDatePicker();
  });
  
  // 월 이동 버튼 이벤트
  datePickerComponent.addEventListener('navigate-month', (e) => {
    const { direction, calendarIndex } = e.detail;
    
    if (calendarIndex === 0) {
      // 시작 달력 이동
      if (direction === 'prev') {
        currentStartMonth.setMonth(currentStartMonth.getMonth() - 1);
      } else {
        currentStartMonth.setMonth(currentStartMonth.getMonth() + 1);
      }
      startYearSelect.value = currentStartMonth.getFullYear();
      startMonthSelect.value = currentStartMonth.getMonth();
      renderCalendar(startCalendarGrid, currentStartMonth, 'start');
    } else {
      // 종료 달력 이동
      if (direction === 'prev') {
        currentEndMonth.setMonth(currentEndMonth.getMonth() - 1);
      } else {
        currentEndMonth.setMonth(currentEndMonth.getMonth() + 1);
      }
      endYearSelect.value = currentEndMonth.getFullYear();
      endMonthSelect.value = currentEndMonth.getMonth();
      renderCalendar(endCalendarGrid, currentEndMonth, 'end');
    }
  });
  
  // 년도 선택 변경 이벤트
  datePickerComponent.addEventListener('year-changed', (e) => {
    const { calendarType, value } = e.detail;
    
    if (calendarType === 'start') {
      currentStartMonth.setFullYear(parseInt(value));
      renderCalendar(startCalendarGrid, currentStartMonth, 'start');
    } else {
      currentEndMonth.setFullYear(parseInt(value));
      renderCalendar(endCalendarGrid, currentEndMonth, 'end');
    }
  });
  
  // 월 선택 변경 이벤트
  datePickerComponent.addEventListener('month-changed', (e) => {
    const { calendarType, value } = e.detail;
    
    if (calendarType === 'start') {
      currentStartMonth.setMonth(parseInt(value));
      renderCalendar(startCalendarGrid, currentStartMonth, 'start');
    } else {
      currentEndMonth.setMonth(parseInt(value));
      renderCalendar(endCalendarGrid, currentEndMonth, 'end');
    }
  });
  
  // 선택 정보 업데이트 이벤트 (컴포넌트에서 발생)
  datePickerComponent.addEventListener('selection-updated', (e) => {
    const { formattedText } = e.detail;
    // 입력 필드 추가 업데이트
    dateRangePicker.value = formattedText.replace('~', '-');
  });
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
  // 초기화
  const today = new Date();
  // 시간 정보를 제거하여 정확한 날짜만 저장
  startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  currentStartMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  currentEndMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // 데이터피커 입력 필드 클릭 시 모달 열기
  dateRangePicker.addEventListener('click', () => {
    // 예: 모바일에서는 더 넓게, 데스크톱에서는 더 좁게 설정
    const isMobile = window.innerWidth < 768;
    const options = isMobile 
      ? { width: '95%', maxWidth: '600px' }
      : { width: '80%', maxWidth: '900px' };
      
    console.log('입력 필드 클릭: 모달 열기', options);
    openDatePicker(options);
  });
  
  // Web Component 이벤트 리스너 설정
  setupComponentEventListeners();
  
  // 모달 외부 클릭 시 닫기
  datePickerModal.addEventListener('click', (e) => {
    if (e.target === datePickerModal) {
      closeDatePicker();
    }
  });
  
  // 계산 버튼
  calculateDateBtn.addEventListener('click', calculateDateDifference);
  
  // 초기화 버튼
  clearDateBtn.addEventListener('click', clearDateSelection);
  
  // 달력 아이콘 클릭
  document.querySelector('.calendar-icon').addEventListener('click', () => {
    // 달력 아이콘 클릭 시 다른 크기로 테스트
    console.log('달력 아이콘 클릭: 다른 크기로 모달 열기');
    openDatePicker({ width: '70%', maxWidth: '700px' });
  });
  
  // 초기 선택 정보 업데이트
  dateRangePicker.value = `${datePickerComponent.formatDateForDisplay(startDate)} - ${datePickerComponent.formatDateForDisplay(endDate)}`;
}); 