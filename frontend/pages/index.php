<?php
// index.php

// 세션 시작
session_start();

// CSRF 토큰 생성
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="en" class="full-height bg-white">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인페이지</title>
    <link rel="stylesheet" href="/frontend/styles/styles.css">
</head>
<body class="full-height">
    <div class="container">
        <div class="form-container">
            <div class="logo-section">
                <h2>로그인 페이지</h2>
            </div>

            <div class="form-section">
                <!-- 메시지 표시를 위한 div 추가 -->
                <div id="message"></div>

                <form id="login-form" action="/login_process.php" method="POST" class="form">
                    <!-- CSRF 토큰 포함 -->
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">

                    <div class="form-group">
                        <label for="email">ID</label>
                        <input type="email" name="email" id="email" autocomplete="email" required pattern="[A-Za-z0-9@\.\(\)\-]+">
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" name="password" id="password" autocomplete="current-password" required pattern="[A-Za-z0-9\(\)\-]+">
                    </div>

                    <div class="form-options">
                        <div class="remember-me">
                            <input type="checkbox" id="remember-me" name="remember-me" class="checkbox">
                            <label for="remember-me">Remember me</label>
                        </div>
                        <div class="forgot-password">
                            <a href="/frontend/pages/signup.html" class="link">회원가입</a>
                        </div>
                    </div>

                    <div class="form-group">
                        <button type="submit" class="btn">로그인</button>
                    </div>
                </form>

                <div class="divider">
                    <span>Or continue with</span>
                </div>

                <div class="social-buttons">
                    <a href="#" class="social-btn google">
                        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                            <!-- Google SVG 아이콘 내용 생략 -->
                        </svg>
                        <span>Google</span>
                    </a>

                    <a href="#" class="social-btn github">
                        <svg class="icon" viewBox="0 0 20 20" aria-hidden="true">
                            <!-- GitHub SVG 아이콘 내용 생략 -->
                        </svg>
                        <span>GitHub</span>
                    </a>
                </div>
            </div>
        </div>
        <div class="image-section">
            <img src="https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80" alt="Background Image">
        </div>
    </div>

    <!-- Optional JavaScript -->
    <script>
        document.getElementById('login-form').addEventListener('submit', async function(event) {
            event.preventDefault(); // 기본 폼 제출 방지
            console.log('Login form submitted'); // 디버깅용 로그

            // 이전 메시지 지우기
            const messageDiv = document.getElementById('message');
            messageDiv.innerHTML = '';

            // 폼 데이터 수집
            const formData = new FormData(this);

            try {
                const response = await fetch('/login_process.php', {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin' // 쿠키 포함
                });

                const result = await response.json();

                if (result.success) {
                    // 로그인 성공 시 리다이렉트
                    window.location.href = '/frontend/pages/client_table.html';
                } else {
                    // 로그인 실패 시 메시지 표시
                    messageDiv.innerHTML = '<p style="color: red;">' + result.message + '</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                messageDiv.innerHTML = '<p style="color: red;">로그인 중 오류가 발생했습니다.</p>';
            }
        });
    </script>
</body>
</html>
