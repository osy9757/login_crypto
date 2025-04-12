/**
 * 전체 자바스크립트 코드 설명
 * 이 스크립트는 사용자가 선택한 시작 시간과 종료 시간 사이의 차이를 계산하고,
 * 여러 가지 형식으로 결과를 표시합니다. 또한 누적 시간을 추적하고, 사용자가
 * 유효한 시간 범위만 선택할 수 있도록 인터페이스를 동적으로 제어합니다.
 */

// 누적 시간 차이를 분 단위로 저장하는 전역 변수
let cumulativeMinutes = 0;

/**
 * select 요소에 옵션을 채우는 함수
 * @param {string} id - 옵션을 채울 select 요소의 ID
 * @param {number} range - 생성할 옵션의 개수 (0부터 range-1까지)
 */
function populateSelect(id, range) {
  const select = document.getElementById(id);
  select.innerHTML = ""; // 기존 옵션 삭제
  for (let i = 0; i < range; i++) {
    const option = document.createElement("option"); // 새 옵션 요소 생성
    option.value = i; // 옵션 값 설정
    option.text = i < 10 ? "0" + i : i; // 10 미만이면 앞에 0 추가 (예: 00, 01, 02...)
    select.appendChild(option); // select 요소에 옵션 추가
  }
}

/**
 * 페이지 초기화 함수: 모든 select 요소에 옵션을 채우고 기본값 설정
 */
function initialize() {
  // 시간과 분 select 요소에 옵션 채우기
  populateSelect("startHour", 24); // 시작 시간(시): 0-23
  populateSelect("startMinute", 60); // 시작 시간(분): 0-59
  populateSelect("endHour", 25); // 종료 시간(시): 0-23
  populateSelect("endMinute", 60); // 종료 시간(분): 0-59

  // 기본값 설정: 모두 0으로 초기화
  document.getElementById("startHour").value = "0";
  document.getElementById("startMinute").value = "0";
  document.getElementById("endHour").value = "0";
  document.getElementById("endMinute").value = "0";

  // 종료 시간 옵션 초기화 (시작 시간보다 이전 시간은 비활성화)
  updateEndHourOptions();
  updateEndMinuteOptions();
}

/**
 * 종료 시간(시)의 옵션을 업데이트하는 함수
 * 시작 시간보다 이전 시간은 목록에서 제거
 */
function updateEndHourOptions() {
  const startHour = parseInt(document.getElementById("startHour").value); // 시작 시간(시)
  const startMinute = parseInt(document.getElementById("startMinute").value); // 시작 시간(분)
  const endHourSelect = document.getElementById("endHour"); // 종료 시간(시) select 요소
  const endMinuteSelect = document.getElementById("endMinute"); // 종료 시간(분) select 요소
  const currentEndHour = parseInt(endHourSelect.value); // 현재 선택된 종료 시간(시)
  const currentEndMinute = parseInt(endMinuteSelect.value); // 현재 선택된 종료 시간(분)

  // 종료 시간 옵션을 다시 생성
  endHourSelect.innerHTML = "";
  
  // 시작 시간 이상의 시간만 옵션으로 추가 (0-24)
  for (let i = 0; i <= 24; i++) {
    if (i >= startHour) {
      const option = document.createElement("option");
      option.value = i;
      option.text = i < 10 ? "0" + i : i;
      endHourSelect.appendChild(option);
    }
  }

  // 시작 시간과 종료 시간 비교 (분 단위로 변환)
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = currentEndHour * 60 + currentEndMinute;

  // 시작 시간이 종료 시간보다 큰 경우
  if (startTotalMinutes >= endTotalMinutes) {
    // 시작 시간 + 1분으로 종료 시간 설정
    if (startMinute === 59) {
      endHourSelect.value = (startHour + 1).toString();
      endMinuteSelect.value = "0";
    } else {
      endHourSelect.value = startHour.toString();
      endMinuteSelect.value = (startMinute + 1).toString();
    }
  } else {
    // 시작 시간이 종료 시간보다 작은 경우, 종료 시간 유지
    if (endHourSelect.querySelector(`option[value="${currentEndHour}"]`)) {
      endHourSelect.value = currentEndHour.toString();
    } else {
      // 현재 종료 시간 옵션이 없는 경우(시작 시간보다 작음), 첫 번째 옵션 선택
      endHourSelect.selectedIndex = 0;
    }
  }

  // 종료 시간(분) 옵션 업데이트
  updateEndMinuteOptions();
}

/**
 * 종료 시간(분)의 옵션을 업데이트하는 함수
 * 조건에 따라 선택 가능한 분 옵션만 표시
 */
function updateEndMinuteOptions() {
  const startHour = parseInt(document.getElementById("startHour").value); // 시작 시간(시)
  const startMinute = parseInt(document.getElementById("startMinute").value); // 시작 시간(분)
  const endHour = parseInt(document.getElementById("endHour").value); // 종료 시간(시)
  const endMinuteSelect = document.getElementById("endMinute"); // 종료 시간(분) select 요소
  const currentEndMinute = parseInt(endMinuteSelect.value); // 현재 선택된 종료 시간(분)
  
  // 이전 선택된 분 값 저장
  const previousEndMinute = currentEndMinute;

  // 종료 시간(분) 옵션 다시 생성
  endMinuteSelect.innerHTML = "";
  
  // 종료 시간이 24시인 경우
  if (endHour === 24) {
    // 00분만 옵션으로 추가
    const option = document.createElement("option");
    option.value = 0;
    option.text = "00";
    endMinuteSelect.appendChild(option);
    endMinuteSelect.value = "0";
    return; // 24시인 경우 여기서 함수 종료
  }

  // 시작 시간과, 종료 시간(시)가 같은 경우
  if (endHour === startHour) {
    // 시작 시간(분) + 1부터 59까지만 옵션으로 추가
    for (let i = 0; i < 60; i++) {
      if (i > startMinute) {
        const option = document.createElement("option");
        option.value = i;
        option.text = i < 10 ? "0" + i : i;
        endMinuteSelect.appendChild(option);
      }
    }
    
    // 유효한 옵션이 없는 경우(시작 분이 59분)
    if (endMinuteSelect.options.length === 0) {
      document.getElementById("endHour").value = startHour + 1;
      updateEndMinuteOptions(); // 시간이 변경되었으므로 재귀적으로 다시 호출
      return;
    }
    
    // 이전에 선택된 분 값이 유효한지 확인
    let validOption = false;
    for (let i = 0; i < endMinuteSelect.options.length; i++) {
      if (parseInt(endMinuteSelect.options[i].value) === previousEndMinute) {
        validOption = true;
        break;
      }
    }
    
    // 이전 분 값이 유효하면 그 값을 유지, 아니면 첫 번째 옵션 선택
    if (validOption) {
      endMinuteSelect.value = previousEndMinute.toString();
    } else {
      endMinuteSelect.selectedIndex = 0;
    }
  } else {
    // 시작 시간과 종료 시간(시)가 다른 경우
    // 모든 분 옵션 추가 (0-59)
    for (let i = 0; i < 60; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.text = i < 10 ? "0" + i : i;
      endMinuteSelect.appendChild(option);
    }
    
    // 이전에 선택된 분 값을 유지
    endMinuteSelect.value = previousEndMinute.toString();
  }
}

/**
 * 시간 차이 계산 및 결과 출력 함수
 * 시작 시간과 종료 시간의 차이를 계산하고 여러 형식으로 출력
 */
function calculateDifference() {
  // 선택된 시간 가져오기
  const startHour = parseInt(document.getElementById("startHour").value);
  const startMinute = parseInt(document.getElementById("startMinute").value);
  const endHour = parseInt(document.getElementById("endHour").value);
  const endMinute = parseInt(document.getElementById("endMinute").value);

  // 시작 시간과 종료 시간을 분 단위로 변환
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  // 유효성 검사
  if (endTotal < startTotal) {
    alert("종료 시간이 시작 시간보다 이전입니다.");
    return;
  }

  // 시간 차이 계산 (분 단위)
  const diffMinutes = endTotal - startTotal;
  cumulativeMinutes += diffMinutes; // 누적 시간에 현재 차이 추가

  // 결과 형식 1: "X시간 Y분" 형식
  const diffHours = Math.floor(diffMinutes / 60);
  const diffRemainingMinutes = diffMinutes % 60;
  const formatTwoDigits = (num) => (num < 10 ? "0" + num : num);
  const format1_1 = formatTwoDigits(diffHours) + "시간 " + formatTwoDigits(diffRemainingMinutes) + "분";
  const format1_2 = diffHours > 8 
    ? formatTwoDigits(diffHours - 8) + "시간 " + formatTwoDigits(diffRemainingMinutes) + "분" 
    : "00시간 00분";
  const format1_3 = endHour > 23
    ? formatTwoDigits(endHour - 23) + "시간 " + formatTwoDigits(endMinute) + "분"
    : endHour == 23 && endMinute > 0
    ? "00시간 " + formatTwoDigits(endMinute) + "분"
    : "00시간 00분";

  // 결과 형식 2: 소수점 형식
  const diffInHoursRaw = diffMinutes / 60;
  const diffInHoursTruncated = Math.floor(diffInHoursRaw * 100) / 100;
  const formatDecimalHours = (num) => {
    const intPart = Math.floor(num);
    const decimalPart = num - intPart;
    return formatTwoDigits(intPart) + (decimalPart > 0 ? (decimalPart.toFixed(2)).substring(1) : ".00");
  };
  const format2_1 = formatDecimalHours(diffInHoursTruncated) + "시간";
  const format2_2 = diffInHoursTruncated > 8 
    ? formatDecimalHours(diffInHoursTruncated - 8) + "시간" 
    : "00.00시간";
  const format2_3 = endHour > 23
    ? formatDecimalHours(endHour - 23 + endMinute / 60) + "시간"
    : endHour == 23 && endMinute > 0
    ? formatDecimalHours(endMinute / 60) + "시간"
    : "00.00시간";

  // 누적 시간 차이 계산
  const cumulativeHours = Math.floor(cumulativeMinutes / 60);
  const cumulativeRemainingMinutes = cumulativeMinutes % 60;
  const cumulativeFormat1 = formatTwoDigits(cumulativeHours) + "시간 " + formatTwoDigits(cumulativeRemainingMinutes) + "분";
  const cumulativeHoursRaw = cumulativeMinutes / 60;
  const cumulativeFormat2 = formatDecimalHours(Math.floor(cumulativeHoursRaw * 100) / 100) + "시간";

  // 결과 화면 출력
  document.getElementById("result1").innerHTML = "<p>시간 차이: " + format1_1 + " / " + format2_1 + "</p>";
  document.getElementById("result2").innerHTML = "<p>8시간 초과: " + format1_2 + " / " + format2_2 + "</p>";
  document.getElementById("result3").innerHTML = "<p>23시 초과시간: " + format1_3 + " / " + format2_3 + "</p>";
  document.getElementById("cumulative").innerHTML = "<p>누적 시간 차이: " + cumulativeFormat1 + " / " + cumulativeFormat2 + "</p>";
}

/**
 * 결과 초기화 함수
 * 결과 표시 영역을 비웁니다
 */
function clear() {
  // 결과 표시 영역 내용 지우기
  document.getElementById("result1").innerHTML = "";
  document.getElementById("result2").innerHTML = "";
  document.getElementById("result3").innerHTML = "";
  document.getElementById("cumulative").innerHTML = "";
  // 누적 시간 초기화
  cumulativeMinutes = 0;
}

// 이벤트 리스너 설정
document.getElementById("startHour").addEventListener("change", updateEndHourOptions);
document.getElementById("startMinute").addEventListener("change", updateEndMinuteOptions);
document.getElementById("endHour").addEventListener("change", updateEndMinuteOptions);
document.getElementById("calculateBtn").addEventListener("click", calculateDifference);
document.getElementById("clearBtn").addEventListener("click", clear);

// 페이지 로드 시 초기화 함수 실행
window.onload = initialize;

/**
 * 날짜 관련 초기화 함수
 * 현재 날짜를 기본값으로 설정하고 이벤트 리스너 추가
 */
function initializeDateCalculator() {
  // 현재 날짜 가져오기
  const today = new Date();
  const formattedDate = formatDateForInput(today);
  
  // 시작일과 종료일의 기본값을 현재 날짜로 설정
  document.getElementById("startDate").value = formattedDate;
  document.getElementById("endDate").value = formattedDate;
  
  // 종료일의 최소 선택 가능 날짜를 시작일로 설정
  document.getElementById("endDate").min = formattedDate;
  
  // 표시용 날짜 업데이트
  updateDisplayDate('start');
  updateDisplayDate('end');
  
  // 시작일이 변경될 때 종료일 업데이트
  document.getElementById("startDate").addEventListener("change", updateEndDate);
  
  // 표시용 입력 필드 클릭 시 실제 날짜 선택기 열기
  document.getElementById("startDateDisplay").addEventListener("click", function() {
    document.getElementById("startDate").showPicker();
  });
  
  document.getElementById("endDateDisplay").addEventListener("click", function() {
    document.getElementById("endDate").showPicker();
  });
  
  // 달력 아이콘 클릭 시 실제 날짜 선택기 열기
  const calendarIcons = document.querySelectorAll(".calendar-icon");
  calendarIcons.forEach(icon => {
    icon.addEventListener("click", function(e) {
      // 라벨의 for 속성을 통해 연결된 입력 필드 찾기
      const inputId = this.getAttribute("for");
      document.getElementById(inputId).showPicker();
      e.preventDefault(); // 기본 동작 방지
    });
  });
}

/**
 * Date 객체를 input[type="date"]에 사용할 수 있는 문자열 형식으로 변환
 * @param {Date} date - 변환할 Date 객체
 * @returns {string} - "YYYY-MM-DD" 형식의 문자열
 */
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Date 객체를 표시용 형식으로 변환
 * @param {Date} date - 변환할 Date 객체
 * @returns {string} - "YYYY.MM.DD" 형식의 문자열
 */
function formatDateForDisplay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * 표시용 날짜 업데이트 함수
 * @param {string} type - 'start' 또는 'end'
 */
function updateDisplayDate(type) {
  const dateInput = document.getElementById(type === 'start' ? 'startDate' : 'endDate');
  const displayInput = document.getElementById(type === 'start' ? 'startDateDisplay' : 'endDateDisplay');
  
  if (dateInput.value) {
    const selectedDate = new Date(dateInput.value);
    displayInput.value = formatDateForDisplay(selectedDate);
  } else {
    displayInput.value = '';
  }
}

/**
 * 종료일 업데이트 함수
 * 시작일이 종료일보다 뒤면 종료일을 시작일로 설정
 */
function updateEndDate() {
  const startDateValue = document.getElementById("startDate").value;
  const startDate = new Date(startDateValue);
  const endDate = new Date(document.getElementById("endDate").value);
  
  // 종료일의 최소 선택 가능 날짜를 시작일로 설정
  document.getElementById("endDate").min = startDateValue;
  
  // 시작일이 종료일보다 뒤면 종료일을 시작일로 설정
  if (startDate > endDate) {
    document.getElementById("endDate").value = startDateValue;
    updateDisplayDate('end');
  }
}

/**
 * 날짜 차이 계산 함수
 * 시작일과 종료일 사이의 차이를 계산하고 결과 출력
 */
function calculateDateDifference() {
  // 시작일과 종료일 가져오기
  const startDate = new Date(document.getElementById("startDate").value);
  const endDate = new Date(document.getElementById("endDate").value);
  
  // 유효성 검사
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    alert("유효한 날짜를 선택해주세요.");
    return;
  }
  
  if (endDate < startDate) {
    alert("종료일이 시작일보다 이전입니다.");
    return;
  }
  
  // 총 일수 차이 계산 (밀리초 → 일)
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // 년, 월, 일 차이 계산
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
  
  document.getElementById("dateResult").innerHTML = resultText;
}

/**
 * 날짜 계산 결과 초기화 함수
 */
function clearDateResult() {
  document.getElementById("dateResult").innerHTML = "";
  
  // 현재 날짜로 초기화
  const today = formatDateForInput(new Date());
  document.getElementById("startDate").value = today;
  document.getElementById("endDate").value = today;
  
  // 종료일의 최소 날짜를 업데이트
  document.getElementById("endDate").min = today;
}

// 날짜 계산 이벤트 리스너 추가
document.getElementById("calculateDateBtn").addEventListener("click", calculateDateDifference);
document.getElementById("clearDateBtn").addEventListener("click", clearDateResult);

// 기존 window.onload 함수를 확장하여 날짜 계산기도 초기화
const originalOnload = window.onload;
window.onload = function() {
  // 기존 초기화 함수 실행
  if (typeof originalOnload === 'function') {
    originalOnload();
  } else {
    initialize();
  }
  // 날짜 계산기 초기화
  initializeDateCalculator();
};
