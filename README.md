# 프로젝트: login_crypto

AES-GCM 암호화를 이용해 안전하게 **엑셀 데이터를 저장/불러오고**, 회원가입/로그인을 제공하는 **웹 애플리케이션** 예제입니다.

<br>

## 목차

1. [프로젝트 개요](#프로젝트-개요)  
2. [기술 스택 및 주요 기능](#기술-스택-및-주요-기능)  
3. [디렉터리 구조](#디렉터리-구조)  
   - [frontend/pages/](#frontendpages)  
   - [frontend/scripts/](#frontendscripts)  
   - [hcrypt/](#hcrypt)  
   - [php/src/ (주요 PHP 파일들)](#phpsrc-주요-php-파일들)  
4. [설치 및 실행 방법](#설치-및-실행-방법)  
   - [1) 도커 컴포즈 실행](#1-도커-컴포즈-실행)  
   - [2) 환경 변수(.env) 설정](#2-환경-변수env-설정)  
   - [3) Composer 설치](#3-composer-설치)  
   - [4) 웹 접속](#4-웹-접속)  
5. [기능 상세](#기능-상세)  
   - [회원가입 & 로그인](#회원가입--로그인)  
   - [엑셀 파일 업로드/내보내기](#엑셀-파일-업로드내보내기)  
   - [부분 업데이트(수정하기)](#부분-업데이트수정하기)  
   - [임시저장 & 되돌리기](#임시저장--되돌리기)  
   - [DB 삭제, 초기화 등](#db-삭제-초기화-등)  
6. [AES-GCM 암호화 구조](#aes-gcm-암호화-구조)  
7. [보안 고려 사항](#보안-고려-사항)  
8. [라이선스](#라이선스)  

<br>

---

## 프로젝트 개요

이 프로젝트는 **데이터베이스에 저장되는 엑셀 데이터**를 **AES-GCM** 모드로 안전하게 암호화/복호화하고,  
**DataTables**를 활용해 웹 브라우저에서 엑셀을 업로드/수정/다운로드할 수 있게 만든 예시입니다.

또한 **회원가입**과 **로그인**(세션) 기능이 포함되어,  
비밀번호 해싱/CSRF 방어 등 보안적인 부분을 고려한 구조를 갖추고 있습니다.

<br>

---

## 기술 스택 및 주요 기능

- **언어/런타임**  
  - PHP 7+ / JavaScript / PostgreSQL / Docker Compose

- **DB**  
  - PostgreSQL (AES-GCM 암호화된 테이블 컬럼)

- **라이브러리/도구**  
  - [PhpSpreadsheet](https://github.com/PHPOffice/PhpSpreadsheet) : 서버측 엑셀 파일 생성/다운로드  
  - [DataTables](https://datatables.net/) : 클라이언트측 테이블 렌더링/페이징  
  - [XLSX.js (SheetJS)](https://github.com/SheetJS/sheetjs) : 클라이언트 Web Worker에서 엑셀 파싱  
  - [FFI](https://www.php.net/manual/en/book.ffi.php) : PHP에서 C++ 라이브러리(`aes_gcm_multi.so`)를 불러와 AES-GCM 암복호화  
  - [dotenv](https://github.com/vlucas/phpdotenv) : `.env` 기반 환경 변수 관리  
  - 그 외 Bootstrap, jQuery 등

- **주요 기능**  
  - 엑셀 파일 업로드 시, Web Worker로 파싱 후 DataTables 표시  
  - DB → 엑셀 다운로드 (복호화 혹은 암호문)  
  - 부분 업데이트(“수정하기”): 변경된 셀만 다시 AES-GCM 암호화하여 Update  
  - 임시저장(SessionStorage) & 되돌리기 버튼  
  - 회원가입 & 로그인 (Argon2id 해시, CSRF 토큰)

<br>

---

## 디렉터리 구조

```bash
project_root/
├── docker-compose.yml
├── frontend
│   ├── pages
│   │   ├── client_table.html
│   │   ├── index.php
│   │   └── signup.html
│   ├── scripts
│   │   ├── app.js
│   │   ├── excel_worker.js
│   │   ├── signup.js
│   │   ├── table_handler.js
│   │   └── upload_excel.js
│   └── styles
│       ├── client_style.css
│       ├── signup.css
│       └── styles.css
├── hcrypt
│   ├── aes_gcm_multi.cpp
│   ├── aes_gcm_multi.h
│   ├── hcrypt_gcm_kdf.cpp
│   ├── hcrypt_gcm_kdf.h
│   ├── test.cpp
│   └── ...
├── php
│   ├── Dockerfile
│   └── src
│       ├── aes_gcm_multi.so
│       ├── clearTable.php
│       ├── export_data.php
│       ├── load_decrypted_data.php
│       ├── load_encrypted_data.php
│       ├── login_process.php
│       ├── save_data.php
│       ├── signup_process.php
│       ├── vendor/
│       └── ...
└── postgres
    └── data  ...

```


## 📂 프로젝트 디렉토리 구조  

### **Frontend**  
- **pages/**  
  - `client_table.html`  
    - 엑셀 파일을 업로드하고, DataTables로 데이터를 표시/편집하는 핵심 페이지  
    - 주요 버튼 기능: 불러오기, 내보내기, 임시저장, 수정하기, 삭제하기 등  
  - `index.php`  
    - 로그인 페이지 (PHP 세션 + CSRF 토큰 사용)  
    - 로그인 성공 시 `client_table.html`로 리다이렉트  
  - `signup.html`  
    - 회원가입 페이지  
    - 비밀번호 강도 체크, Captcha, 비밀번호 재확인 기능 포함  

- **scripts/**  
  - `upload_excel.js`  
    - 브라우저에서 파일을 읽고 Web Worker(`excel_worker.js`)를 통해 엑셀 파싱  
    - 파싱 결과를 `appState.originalExcelData`에 저장 후 `renderTableData()` 호출  
  - `excel_worker.js`  
    - 별도의 스레드에서 `xlsx.full.min.js` 라이브러리로 대용량 엑셀 파일 파싱  
    - 메인 스레드와 `postMessage()`를 통해 통신  
  - `table_handler.js`  
    - DataTables 초기화 및 셀 수정(blur) 시 `appState.modifiedData`에 반영  
    - “임시저장” → `sessionStorage`, “되돌리기” → 저장된 백업 복원  
    - “저장하기” 버튼 → `plainSave`/`encryptSave`(전체 저장) 또는 `partialUpdate`(변경된 셀만 업데이트)  
  - `signup.js`  
    - 회원가입 폼과 연동 (비밀번호 강도 체크, Captcha, 비밀번호 확인 로직)  

### **C++ (hcrypt - 암호화 모듈)**  
- `aes_gcm_multi.cpp/.h`, `hcrypt_gcm_kdf.cpp/.h`  
  - **AES-GCM (256) + PBKDF2(sha256)** 기반 암복호화  
  - 멀티스레드 암복호화(`hcrypt_encrypt_table_mt_alloc`)로 대량 데이터 처리 속도 향상  
- `test.cpp` 등  
  - 단위 테스트 예시 포함  

### **PHP (Backend, API)**  
- **src/**  
  - `save_data.php`  
    - 클라이언트 JSON → `mode` 분기  
    - `plainSave` / `encryptSave` (엑셀 전체 `INSERT`)  
    - `partialUpdate` (변경된 셀만 암호화하여 `UPDATE`)  
  - `load_encrypted_data.php`  
    - DataTables 서버사이드 처리  
    - 암호화된 `col1..col120`을 그대로 조회 후 JSON 응답 (복호화 없음)  
  - `load_decrypted_data.php`  
    - DataTables 서버사이드 처리  
    - DB 조회 후 AES-GCM 복호화하여 JSON 응답  
  - `export_data.php`  
    - 평문/암호문(복호화 X) 엑셀 다운로드  
    - `POST` 요청 시 `currentMode=loadDecrypted` + `modifiedData`를 받아 엑셀 생성 및 다운로드  
  - `clearTable.php`  
    - `big_table` 테이블 초기화 (`TRUNCATE`)  
  - `login_process.php`  
    - 로그인 처리 (Argon2id 해시 검증)  
  - `signup_process.php`  
    - 회원가입 처리 (Argon2id 해시 저장)  

---  

## 🛠 **설치 및 실행 방법**  

### 1️⃣ 도커 실행  
```bash  
docker-compose build  
docker-compose up -d  
```  
- `nginx`, `php`, `postgres` 컨테이너 실행  
- PHP 컨테이너 `/var/www/html` → `php/src` 폴더에 마운트  

### 2️⃣ 환경 변수 설정 (`.env`)  
`php/src/.env` 파일 생성 후 DB 연결 정보 설정:  
```ini  
```  
*필요 시 `docker-compose.yml` 및 PostgreSQL 설정 수정*  

### 3️⃣ Composer 라이브러리 설치  
```bash  
cd php/src  
composer install  
```  
- `vendor/` 폴더 생성 및 라이브러리 (`dotenv`, `PhpSpreadsheet` 등) 다운로드  

### 4️⃣ 웹 접속  
---  

## 🔑 **기능 상세**  

### ✅ 회원가입 & 로그인  
#### 📌 **회원가입 (`signup.html` → `signup_process.php`)**  
1. 이메일(ID), 비밀번호 입력  
2. JS로 **비밀번호 강도 체크, Captcha, 비밀번호 확인**  
3. 서버에서 `password_hash()` (Argon2id/BCRYPT)로 안전하게 해시 후 DB 저장  

#### 📌 **로그인 (`index.php` → `login_process.php`)**  
1. AJAX 요청으로 이메일 + 비밀번호 전송  
2. 서버에서 Argon2id 해시 검증  
3. 성공 시 **세션 생성** 후 `client_table.html`로 리다이렉트  

### ✅ 엑셀 파일 업로드 / 내보내기  
#### 📌 **업로드 (client_table.html)**  
1. **“파일 첨부”** → `upload_excel.js` → `excel_worker.js`로 파싱 위임  
2. `XLSX` 라이브러리가 **2D 배열(JSON)** 변환 후 메시지 전달  
3. `storeExcelAsObjectArray()` → `appState.originalExcelData`로 저장  
4. `renderTableData()` 호출 → DataTables 렌더링 후 편집 가능  

#### 📌 **내보내기 (export_data.php)**  
1. 내보내기 모달에서 **평문(`plainExport`) / 암호문(`encryptExport`)** 선택  
2. 서버에서 평문 또는 암호문 상태로 엑셀 생성 및 다운로드  

### ✅ 부분 업데이트 (수정하기)  
1. “수정하기” 클릭 → `appState.currentMode = "partialUpdate"`  
2. `performSave()` 실행 시 변경된 셀만 `{ rowId: { colName: newVal }, ... }` 형태로 서버 전송  
3. `save_data.php`에서 해당 셀만 **AES-GCM 암호화하여 DB 업데이트**  

### ✅ 임시저장 & 되돌리기  
#### 📌 **임시저장**  
- `sessionStorage`에 `modifiedData` JSON 형태로 백업  
- 페이지 새로고침 후 `restoreFromSessionStorage()`로 수정 사항 복원  

#### 📌 **되돌리기**  
- "되돌리기" 버튼 클릭 → `sessionStorage` 백업 데이터를 `appState.modifiedData`로 로드  
- `upload` 모드: `renderTableData()` 재호출  
- `loadDecrypted` 모드: `switchToDecryptedMode()` 호출  

### ✅ DB 삭제 및 초기화  
- “삭제하기” 버튼 → 모달  
- 초기화: `performInitialize()`로 클라이언트 테이블 및 `sessionStorage` 비움  
- DB 삭제: `/clearTable.php` 호출 → `TRUNCATE big_table`  

---  

## 🔐 **AES-GCM 암호화 구조**  

### 🔄 **암호화 과정**  
1. `PBKDF2_HMAC_SHA256(password + salt)` → AES 키 파생  
2. 각 셀을 **AES-GCM(256)으로 암호화**  
   - `[IV(12바이트)] + [암호문] + [태그(16바이트)]`  
3. `Base64` 인코딩 후 DB 저장  

### 🔄 **복호화 과정**  
1. DB에서 Base64 디코딩  
2. AES-GCM 복호화  
3. 변경된 셀만 다시 암호화 (부분 업데이트 시)  

### ⚡ **멀티스레드 성능 최적화**  
- **C++ STL thread** 활용  
- **수천~수만 행** 암호화 시 속도 향상  

---  

## 🔒 **보안 고려 사항**  
- **비밀번호 해싱**: `password_hash()` (Argon2id/BCRYPT) 사용  
- **CSRF 방어**: 세션 기반 토큰 (`csrf_token`) + `<input type="hidden">`  
- **XSS 방어**: DataTables 출력 시 HTML 이스케이프 처리 권장  
- **SQL 인젝션 방어**: `PDO prepare()` + `bindValue()`  
- **HTTPS 권장**: 실제 운영 시 SSL/TLS 설정 필수  

---  

## 📜 **라이선스**  
- 프로젝트 자체: MIT 또는 자유 라이선스  
- 내장 라이브러리 (`PhpSpreadsheet`, `dotenv` 등): 별도 라이선스 확인 필요  
- OpenSSL: Apache License v2  

---  

## 📮 **문의 / 이슈**  
- **GitHub Issue** 또는 **Pull Request** 제출  
+++
