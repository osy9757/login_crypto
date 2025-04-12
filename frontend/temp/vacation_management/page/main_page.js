// DOM 요소 참조
const periodDateRangePicker = document.getElementById('periodDateRangePicker');
const vacationDateRangePicker = document.getElementById('vacationDateRangePicker');
const periodModalOverlay = document.getElementById('periodModalOverlay');
const vacationModalOverlay = document.getElementById('vacationModalOverlay');
const periodDateSelector = document.getElementById('periodDateSelector');
const vacationDateSelector = document.getElementById('vacationDateSelector');

// 기간 범위 모달 열기
document.querySelector('[for="periodDateRangePicker"]').addEventListener('click', () => {
  const selectedMode = document.querySelector('input[name="periodSelectType"]:checked').value;
  periodDateSelector.setAttribute('select-mode', selectedMode);
  periodModalOverlay.style.display = 'flex';
});

// 휴가 등록 모달 열기
document.querySelector('[for="vacationDateRangePicker"]').addEventListener('click', () => {
  if (!periodDateRangePicker.value) {
    alert('먼저 사용기간 범위를 설정해주세요.');
    return;
  }
  
  const selectedMode = document.querySelector('input[name="vacationSelectType"]:checked').value;
  vacationDateSelector.setAttribute('select-mode', selectedMode);
  vacationModalOverlay.style.display = 'flex';
});
