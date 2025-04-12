/**
 * 휴가 등록 관리 JavaScript 파일
 * vacation_registration.js
 */

// 전역 객체 초기화 (이미 있으면 그대로 사용)
window.vacationRegistration = window.vacationRegistration || {};

// 필요한 속성들을 초기화 (기존 값 유지)
window.vacationRegistration.registeredVacations = window.vacationRegistration.registeredVacations || [];
window.vacationRegistration.disabledPeriods = window.vacationRegistration.disabledPeriods || [];

// 누적 사용 일수 (기존 값이 있으면 유지)
window.vacationRegistration.totalUsedDays = window.vacationRegistration.totalUsedDays || 0;

// 함수 정의 (기존 함수 덮어쓰지 않고 없는 경우만 추가)
if (!window.vacationRegistration.getTotalUsedDays) {
  window.vacationRegistration.getTotalUsedDays = function() {
    return window.vacationRegistration.totalUsedDays;
  };
}

if (!window.vacationRegistration.setTotalUsedDays) {
  window.vacationRegistration.setTotalUsedDays = function(value) {
    if (typeof value === 'number' && value >= 0) {
      window.vacationRegistration.totalUsedDays = value;
    }
    return window.vacationRegistration.totalUsedDays;
  };
}

if (!window.vacationRegistration.addUsedDays) {
  window.vacationRegistration.addUsedDays = function(days) {
    if (typeof days === 'number' && days > 0) {
      window.vacationRegistration.totalUsedDays += days;
    }
    return window.vacationRegistration.totalUsedDays;
  };
}

if (!window.vacationRegistration.addDisabledPeriod) {
  window.vacationRegistration.addDisabledPeriod = function(startDate, endDate) {
    // 배열이 없는 경우를 대비해 한번 더 확인
    if (!Array.isArray(window.vacationRegistration.disabledPeriods)) {
      window.vacationRegistration.disabledPeriods = [];
    }
    
    // 배열에 추가
    window.vacationRegistration.disabledPeriods.push({
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });
  };
}

if (!window.vacationRegistration.getDisabledPeriods) {
  window.vacationRegistration.getDisabledPeriods = function() {
    // 배열이 없는 경우를 대비한 처리
    if (!Array.isArray(window.vacationRegistration.disabledPeriods)) {
      window.vacationRegistration.disabledPeriods = [];
    }
    
    return window.vacationRegistration.disabledPeriods;
  };
}

// DOM이 완전히 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
  // 필요한 DOM 요소 참조
  const registerVacationBtn = document.getElementById('registerVacationBtn');
  const resultContainer = document.querySelector('.result-container');
  const periodDateRangePicker = document.getElementById('periodDateRangePicker');
  const vacationDaysInput = document.getElementById('vacationDaysInput');
  const vacationDateRangePicker = document.getElementById('vacationDateRangePicker');
  const maxRegistrationsInput = document.getElementById('maxRegistrationsInput');
  
  // 등록 카운터 초기화
  let registrationCounter = 0;
  
  // 등록하기 버튼 클릭 이벤트 리스너
  registerVacationBtn.addEventListener('click', () => {
    // 필수 정보 검증
    if (!periodDateRangePicker.value) {
      return;
    }
    
    if (!vacationDateRangePicker.value) {
      return;
    }
    
    // 최대 등록 횟수 확인
    const maxRegistrations = parseInt(maxRegistrationsInput.value) || 0;
    if (maxRegistrations > 0 && registrationCounter >= maxRegistrations) {
      return; // 최대 등록 횟수 초과시 아무 작업도 하지 않음
    }
    
    // 날짜 형식 정보 가져오기
    const isPeriodMonthMode = document.getElementById('periodMonthOption').checked;
    const isVacationMonthMode = document.getElementById('vacationMonthOption').checked;
    
    // 휴가 일수 계산
    const vacationDuration = calculateVacationDuration(vacationDateRangePicker.value, isVacationMonthMode);
    
    // 총 휴가일수와 현재까지 사용한 누적 일수
    const totalVacationDays = parseInt(vacationDaysInput.value) || 0;
    const totalUsedDays = window.vacationRegistration.getTotalUsedDays();
    const remainingDays = totalVacationDays - totalUsedDays;
    
    // 이번 신청으로 초과하는지 확인
    if (vacationDuration > remainingDays) {
      alert(`휴가 신청일수(${vacationDuration}일)가 잔여 휴가일수(${remainingDays}일)를 초과합니다.`);
      return;
    }
    
    // 카운터 증가
    registrationCounter++;
    
    // 결과 항목 생성 (누적 사용 일수 증가 전에 결과 항목 생성)
    const resultItem = createResultItem(
      registrationCounter,
      periodDateRangePicker.value,
      vacationDaysInput.value,
      vacationDateRangePicker.value,
      isPeriodMonthMode,
      isVacationMonthMode,
      vacationDuration
    );
    
    // 누적 사용 일수 증가 (결과 항목 생성 후)
    window.vacationRegistration.addUsedDays(vacationDuration);
    
    // 결과 컨테이너에 추가
    resultContainer.appendChild(resultItem);

    // 휴가 기간 가져오기
    const vacationPeriod = vacationDateRangePicker.value;
    
    // 신규 휴가 정보 객체 생성
    const vacationInfo = {
      id: registrationCounter,
      registrationTime: formatDateTime(new Date()),
      periodRange: periodDateRangePicker.value,
      vacationPeriod: vacationPeriod,
      vacationDuration: vacationDuration,
      availableDays: totalVacationDays - totalUsedDays + vacationDuration, // 등록 전 사용 가능 일수
      totalUsedDays: totalUsedDays + vacationDuration, // 등록 후 총 사용 일수
      remainingDays: totalVacationDays - totalUsedDays - vacationDuration // 등록 후 잔여 일수
    };
    
    // 휴가 정보를 배열에 추가
    window.vacationRegistration.registeredVacations.push(vacationInfo);
    // 휴가 기간 파싱
    const vacationParts = vacationDateRangePicker.value.split(' ~ ');
    if (vacationParts.length === 2) {
      const startParts = vacationParts[0].split('.');
      const endParts = vacationParts[1].split('.');
      
      if (startParts.length === 3 && endParts.length === 3) {
        const startDate = new Date(
          parseInt(startParts[0]), 
          parseInt(startParts[1]) - 1, 
          parseInt(startParts[2])
        );
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(
          parseInt(endParts[0]), 
          parseInt(endParts[1]) - 1, 
          parseInt(endParts[2])
        );
        endDate.setHours(0, 0, 0, 0);

        // 선택 불가능한 기간으로 등록
        console.log('disabledPeriod 추가 직전 검사:', {
          vacationRegistration: window.vacationRegistration,
          hasDisabledPeriods: Array.isArray(window.vacationRegistration?.disabledPeriods)
        });
        window.vacationRegistration.addDisabledPeriod(startDate, endDate);
      }
    }
  
    // 등록 후 C 영역 초기화
    vacationDateRangePicker.value = '';
    vacationManager.vacationRange.startDate = null;
    vacationManager.vacationRange.endDate = null;  
    
    // 등록 횟수 업데이트
    updateRegistrationCounter();
  });

  /**
   * 결과 항목 DOM 요소 생성 함수
   */
  function createResultItem(counter, periodRange, vacationDays, vacationRange, isPeriodMonthMode, isVacationMonthMode, vacationDuration) {
    // 등록 일시
    const now = new Date();
    const registrationTime = formatDateTime(now);
    
    // 총 휴가일수
    const totalVacationDays = parseInt(vacationDays);
    
    // 이 등록 직전의 누적 사용 일수 계산
    const previousUsedDays = window.vacationRegistration.getTotalUsedDays() - vacationDuration;
    
    // 등록 시점의 사용 가능 일수 (등록 직전의 잔여 일수)
    const availableDays = counter === 1 
    ? totalVacationDays 
    : totalVacationDays - (window.vacationRegistration.getTotalUsedDays() - vacationDuration);

    
    // 현재 누적 사용 일수
    const totalUsedDays = window.vacationRegistration.getTotalUsedDays();
    
    // 현재 잔여 일수
    const remainingDays = totalVacationDays - totalUsedDays;
    
    // 결과 항목 컨테이너 생성
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    resultItem.style.marginBottom = '20px';
    resultItem.style.padding = '15px';
    resultItem.style.backgroundColor = counter % 2 === 0 ? '#f0f7ff' : '#f9f9f9';
    resultItem.style.borderRadius = '5px';
    resultItem.style.border = '1px solid #e0e0e0';
    
    // 결과 내용 구성
    resultItem.innerHTML = `
      <div class="result-title" style="font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
        ${counter}번 휴가 등록 (${registrationTime})
      </div>
      
      <div class="result-line" style="margin-bottom: 12px;">
        <strong>휴가기간:</strong> 
        <span class="result-data">${vacationRange}</span>
      </div>
      
      <div class="result-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div class="stat-item">
          <span class="stat-label">사용 가능 일수:</span> 
          <span class="result-data">${availableDays}일</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">신청 일수:</span> 
          <span class="result-data">${vacationDuration}일</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">사용 누적 일수:</span> 
          <span class="result-data">${totalUsedDays}일</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">잔여 일수:</span> 
          <span class="result-data" style="color: ${remainingDays < 0 ? '#e74c3c' : '#2980b9'};">${remainingDays}일</span>
        </div>
      </div>
      
      <div class="result-footer" style="margin-top: 10px; font-size: 12px; color: #777; border-top: 1px dotted #eee; padding-top: 5px;">
        사용기간 범위: ${periodRange} 
      </div>
    `;
    
    return resultItem;
  }

  /**
   * 현재 날짜와 시간을 포맷팅하는 함수
   * @param {Date} date - 날짜 객체
   * @returns {string} 포맷팅된 날짜와 시간 문자열
   */
  function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  }
  
  /**
   * 휴가 기간의 일수를 계산하는 함수
   * @param {string} vacationRange - 휴가 기간 문자열
   * @param {boolean} isMonthMode - 월 모드 여부
   * @returns {number} 휴가 일수
   */
  function calculateVacationDuration(vacationRange, isMonthMode) {
    if (!vacationRange) return 0;
    
    const parts = vacationRange.split(' ~ ');
    if (parts.length !== 2) return 0;
    
    const startParts = parts[0].split('.');
    const endParts = parts[1].split('.');
    
    // 월별 모드 (YYYY.MM)
    if (isMonthMode && startParts.length === 2 && endParts.length === 2) {
      // 각 월의 일수를 합산
      let totalDays = 0;
      const startYear = parseInt(startParts[0]);
      const startMonth = parseInt(startParts[1]) - 1;
      const endYear = parseInt(endParts[0]);
      const endMonth = parseInt(endParts[1]) - 1;
      
      let currentYear = startYear;
      let currentMonth = startMonth;
      
      while (
        currentYear < endYear || 
        (currentYear === endYear && currentMonth <= endMonth)
      ) {
        // 해당 월의 마지막 날짜 (일수)
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        totalDays += lastDay;
        
        // 다음 월로 이동
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }
      
      return totalDays;
    }
    
    // 날짜 모드 (YYYY.MM.DD)
    if (!isMonthMode && startParts.length === 3 && endParts.length === 3) {
      const startDate = new Date(
        parseInt(startParts[0]), 
        parseInt(startParts[1]) - 1, 
        parseInt(startParts[2])
      );
      const endDate = new Date(
        parseInt(endParts[0]), 
        parseInt(endParts[1]) - 1, 
        parseInt(endParts[2])
      );
      
      // 밀리초 차이를 일수로 변환 (하루 = 24 * 60 * 60 * 1000 밀리초)
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 시작일과 종료일 모두 포함
      
      return diffDays;
    }
    
    return 0;
  }
  
  /**
   * 등록 횟수 정보 업데이트 함수
   */
  function updateRegistrationCounter() {
    // 최대 등록 횟수 가져오기
    const maxRegistrations = parseInt(maxRegistrationsInput.value) || 0;
    
    // 등록 버튼 상태 업데이트
    if (maxRegistrations > 0 && registrationCounter >= maxRegistrations) {
      registerVacationBtn.disabled = true;
      registerVacationBtn.style.backgroundColor = '#cccccc';
      registerVacationBtn.style.cursor = 'not-allowed';
    } else {
      registerVacationBtn.disabled = false;
      registerVacationBtn.style.backgroundColor = '';
      registerVacationBtn.style.cursor = '';
    }
  }
  
  // 최대 등록 횟수 변경 이벤트 핸들러
  maxRegistrationsInput.addEventListener('change', () => {
    updateRegistrationCounter();
  });
  
  // 초기 상태 업데이트
  updateRegistrationCounter();
});

// 등록된 휴가 조회 함수 (필요시 사용)
window.getRegisteredVacations = function() {
  return window.vacationRegistration.registeredVacations;
};

// 특정 ID의 휴가 조회 함수 (필요시 사용)
window.getVacationById = function(id) {
  return window.vacationRegistration.registeredVacations.find(vacation => vacation.id === id);
};
