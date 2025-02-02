document.getElementById('signupForm').addEventListener('submit', function(event) {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const captchaAnswer = document.getElementById('captchaAnswer').value.trim();

    // 비밀번호 불일치 시 제출 막기
    if (password !== confirmPassword) {
        event.preventDefault();
        alert('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
        return;
    }

    // Captcha 검증
    if (parseInt(captchaAnswer) !== captchaSolution) {
        event.preventDefault();
        document.getElementById('captchaMessage').textContent = '정답이 틀렸습니다. 다시 시도해주세요.';
        return;
    }

    // 정답이면 가입 진행(여기서는 콘솔로만 표시)
    console.log('회원가입 요청 전송!');
});

// 비밀번호 강도 표시
const passwordInput = document.getElementById('password');
const strengthFill = document.querySelector('.strength-fill');
const strengthText = document.querySelector('.strength-text');

passwordInput.addEventListener('input', updatePasswordStrength);

function updatePasswordStrength() {
    const value = passwordInput.value;
    const lengthScore = value.length >= 8 ? 1 : 0;

    const hasUpper = /[A-Z]/.test(value) ? 1 : 0;
    const hasLower = /[a-z]/.test(value) ? 1 : 0;
    const hasNumber = /\d/.test(value) ? 1 : 0;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value) ? 1 : 0;

    const score = lengthScore + hasUpper + hasLower + hasNumber + hasSpecial;

    let strengthPercentage = (score / 5) * 100;
    let color = '#F87171'; // 빨간색
    let text = '약함';

    if (score === 5) {
        color = '#34D399'; // 초록색
        text = '매우 강함';
    } else if (score >= 3) {
        color = '#FBBF24'; // 노란색
        text = '보통';
    } else if (score === 2) {
        color = '#F87171'; 
        text = '약함';
    } else {
        color = '#F87171';
        text = '매우 약함';
    }

    strengthFill.style.width = strengthPercentage + '%';
    strengthFill.style.backgroundColor = color;
    strengthText.textContent = text;
}

// 비밀번호 확인 실시간 체크
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordMatchMessage = document.getElementById('passwordMatchMessage');

confirmPasswordInput.addEventListener('input', checkPasswordMatch);

function checkPasswordMatch() {
    const passwordVal = passwordInput.value;
    const confirmVal = confirmPasswordInput.value;

    if (!confirmVal) {
        passwordMatchMessage.textContent = '';
        passwordMatchMessage.className = '';
        return;
    }

    if (passwordVal === confirmVal) {
        passwordMatchMessage.textContent = '비밀번호가 일치합니다.';
        passwordMatchMessage.className = 'success';
    } else {
        passwordMatchMessage.textContent = '비밀번호가 일치하지 않습니다.';
        passwordMatchMessage.className = 'error';
    }
}

// Captcha 구현
const captchaQuestion = document.getElementById('captchaQuestion');
let captchaSolution = 0;

generateCaptcha();

function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    captchaSolution = num1 + num2;
    captchaQuestion.textContent = `보안문제: ${num1} + ${num2} = ? (Captcha 예시)`;
}
