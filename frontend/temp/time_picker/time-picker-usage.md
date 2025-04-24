# `time-picker` 웹 컴포넌트 사용 가이드

`time-picker.js` 파일은 시작 시간과 종료 시간을 선택하는 사용자 인터페이스를 제공하는 웹 컴포넌트입니다. 이 문서는 컴포넌트의 사용 방법과 스타일링에 대해 설명합니다.

## 1. 컴포넌트 추가 (HTML)

HTML 파일에 `<time-picker>` 태그를 사용하여 컴포넌트를 포함시키고, 관련 스크립트를 로드합니다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Time Picker 사용 예시</title>
  <!-- 컴포넌트 스크립트 로드 (경로는 실제 위치에 맞게 수정) -->
  <script type="module" src="./frontend/temp/time_picker/time_picker.js"></script> 
  <style>
    /* 예시: 시간 출력 영역 스타일 */
    .time-output {
      border: 1px solid #ccc;
      padding: 5px 10px;
      margin: 5px;
      display: inline-block;
      min-width: 120px;
      text-align: center;
      font-family: sans-serif;
      background-color: #f0f0f0;
      border-radius: 4px;
    }

    /* 예시: 트리거 버튼 스타일 */
    .trigger-button {
      padding: 10px 15px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1em;
      margin-top: 10px;
    }
    .trigger-button:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>

  <h1>시간 선택</h1>

  <!-- 선택된 시간을 표시할 요소 -->
  <div>
    선택된 시간:
    <span class="start-box time-output">09:00</span> <!-- 시작 시간 출력 클래스 -->
    ~
    <span class="end-box time-output">18:00</span>   <!-- 종료 시간 출력 클래스 -->
  </div>

  <!-- TimePicker 컴포넌트 -->
  <time-picker
    output-classes="start-box,end-box" <!-- 필수: 출력 요소 클래스 지정 -->
    minute-steps="5"                  <!-- 선택: 분 단위 설정 (기본값 1) -->
  >
    <!-- 필수: 모달 트리거 요소 (버튼 등) -->
    <button slot="trigger" class="trigger-button">시작/종료 시간 선택</button>
    <!-- <button slot="trigger">다른 트리거</button> -->
  </time-picker>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const picker = document.querySelector('time-picker');

      // 'confirm' 이벤트 리스너 (시간 확정 시)
      picker.addEventListener('confirm', (e) => {
        console.log('시간 확정:', e.detail.start, '~', e.detail.end);
        // e.detail.start 와 e.detail.end 값을 활용
      });
    });
  </script>

</body>
</html>
```

## 2. 주요 속성 및 슬롯

*   **`<time-picker>` 태그:** 웹 컴포넌트 자체입니다.
*   **`output-classes` (속성, 필수):** 선택된 시작/종료 시간을 표시할 HTML 요소들의 CSS 클래스 이름을 쉼표(`,`)로 구분하여 지정합니다. 첫 번째 클래스가 시작 시간, 두 번째가 종료 시간 요소에 해당합니다. 이 클래스를 가진 요소들이 HTML 내에 존재해야 합니다.
*   **`minute-steps` (속성, 선택):** 분 선택 간격을 설정합니다. 유효한 값은 `1`, `5`, `10`, `15`, `30`, `0` 입니다. 기본값은 `1`입니다. `0`으로 설정 시 분 선택이 비활성화됩니다.
*   **`slot="trigger"`:** `<time-picker>` 태그 내부에 `slot="trigger"` 속성을 가진 요소를 배치합니다. 이 요소(주로 `<button>`)를 클릭하면 시간 선택 모달 창이 열립니다.

## 3. JavaScript 연동

*   **`confirm` 이벤트:** 사용자가 모달 창에서 '확인' 버튼을 클릭하면 컴포넌트에서 `confirm` 이벤트가 발생합니다.
    *   `event.detail.start`: 선택된 시작 시간 문자열 (예: `"당일 09:00"`)
    *   `event.detail.end`: 선택된 종료 시간 문자열 (예: `"익일 15:00"`)
    *   이 이벤트 리스너 내에서 선택된 시간 값을 받아 추가적인 로직(데이터 전송 등)을 처리할 수 있습니다.

## 4. 주요 기능

*   **모달 기반 UI:** 트리거 클릭 시 모달 창 표시.
*   **스크롤 선택:** 직관적인 스크롤 인터페이스로 일/시/분 선택.
*   **시간 범위 제한:** 시작 시간 (당일 08:00 ~ 24:00), 종료 시간 (시작 시간 이후 ~ 익일 15:00) 자동 적용.
*   **자동 유효성 검사:** 유효하지 않은 시간 선택 시 자동으로 범위 내 시간으로 조정.
*   **실시간 표시:** `output-classes`로 지정된 요소에 선택된 시간 즉시 반영.

## 5. 스타일링

`time-picker` 컴포넌트와 관련된 요소들은 다음과 같이 스타일링할 수 있습니다.

*   **트리거 버튼 (`slot="trigger"` 요소):**
    *   이 요소는 웹 컴포넌트의 Shadow DOM 외부에 존재하므로, **일반적인 CSS 규칙**을 사용하여 직접 스타일링할 수 있습니다.
    *   HTML 파일 내 `<style>` 태그나 외부 CSS 파일에서 해당 요소의 클래스나 태그명을 선택하여 스타일을 적용합니다. (위 HTML 예시의 `.trigger-button` 참고)
*   **시간 출력 요소 (`output-classes`로 지정된 요소):**
    *   트리거 버튼과 마찬가지로 Shadow DOM 외부에 있으므로, **일반 CSS 규칙**으로 스타일을 자유롭게 지정할 수 있습니다.
    *   폰트, 배경색, 테두리, 패딩 등을 CSS로 제어합니다. (위 HTML 예시의 `.time-output` 참고)
*   **모달 및 내부 스크롤 피커:**
    *   모달 창 자체와 그 내부의 시간/분 스크롤 선택기 등은 컴포넌트의 **Shadow DOM 내부**에 정의되어 있습니다.
    *   이 부분의 스타일은 `time_picker.js` 파일 내의 `<style>` 태그 안에서 관리됩니다.
    *   만약 내부 스타일을 변경하고 싶다면, `time_picker.js` 파일의 `<style>` 섹션을 직접 수정해야 합니다. (CSS 변수 등을 활용하면 외부에서 일부 제어가 가능하도록 개선할 수도 있습니다.) 