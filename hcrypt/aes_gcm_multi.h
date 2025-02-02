//aes_gcm.multi.h
#pragma once

#include <vector>
#include <cstdint>
#include <string>

// =============  hcrypt_gcm_kdf 클래스  =============
//
// AES-GCM + KDF(PBKDF2) 적용
//  - AES 키 길이: 16(128비트), 24(192비트), 32(256비트) 중 선택
//  - GCM 모드 (IV: 12바이트, Tag: 16바이트)
//  - KDF: PBKDF2_HMAC_SHA256(반복 횟수 기본 10000회)
//
//  - encrypt()/decrypt() 결과 구조:
//      [IV(12바이트)] + [암호문] + [16바이트 태그]
//
// ===================================================
class hcrypt_gcm_kdf {
public:
    // 생성자 / 소멸자
    hcrypt_gcm_kdf();
    ~hcrypt_gcm_kdf();

    // 1) PBKDF2로 키 생성
    //    - keyLen: 16, 24, 32
    //    - iterationCount: 기본 10000
    void deriveKeyFromPassword(const std::string& password,
                               const std::vector<uint8_t>& salt,
                               int keyLen = 32,
                               int iterationCount = 10000);

    // 2) 이미 만들어둔 키 설정
    //    - 길이가 16,24,32가 아니면 예외
    void setKey(const std::vector<uint8_t>& keyData);

    // 3) 현재 키 읽기 (스레드마다 새 객체를 만들 때 사용)
    std::vector<uint8_t> getKey() const;

    // 4) 무작위 IV(Nonce) 생성 (12바이트 권장)
    static std::vector<uint8_t> generateRandomIV();

    // 5) AES-GCM 암/복호화 (단일 청크)
    //    결과 = [IV(12)] + [암호문] + [태그(16)]
    std::vector<uint8_t> encrypt(const std::vector<uint8_t>& plaintext);
    std::vector<uint8_t> decrypt(const std::vector<uint8_t>& ciphertext);

private:
    // 내부에서 AES-128/192/256-GCM 중 하나를 선택
    const void* evpCipher; // (실제로는 const EVP_CIPHER*)
    std::vector<uint8_t> key;  // 현재 세팅된 키 (16/24/32 바이트)

    // AES-GCM 내부 로직
    std::vector<uint8_t> aesEncryptGcm(const std::vector<uint8_t>& plain);
    std::vector<uint8_t> aesDecryptGcm(const std::vector<uint8_t>& cipher);

    // OpenSSL 초기화/정리 (static)
    static void opensslInit();
    static void opensslCleanup();
    static bool opensslInitialized;
};

// ===================== C 인터페이스 (extern "C") =====================
//
//  - .so 또는 DLL로 내보내기 위함
//  - Windows라면 __declspec(dllexport) 등을, 다른 OS라면 -fPIC -shared 로 빌드
//
extern "C" {

#ifdef _WIN32
 #define HCRYPT_DLL __declspec(dllexport)
#else
 #define HCRYPT_DLL
#endif

// ------------ 객체 생성/소멸 ------------
HCRYPT_DLL hcrypt_gcm_kdf* hcrypt_new();
HCRYPT_DLL void hcrypt_delete(hcrypt_gcm_kdf* hc);

// ------------ KDF (PBKDF2) ------------
HCRYPT_DLL void hcrypt_deriveKeyFromPassword(
    hcrypt_gcm_kdf* hc,
    const char* password,
    const uint8_t* salt,
    int salt_len,
    int key_len,
    int iteration
);

// ------------ 키 직접 설정 ------------
HCRYPT_DLL void hcrypt_setKey(hcrypt_gcm_kdf* hc, const uint8_t* keydata, int key_len);

// ------------ 단일 청크 암/복호화 ------------
HCRYPT_DLL uint8_t* hcrypt_encrypt_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t* plain, int plain_len,
    int* out_len
);

HCRYPT_DLL uint8_t* hcrypt_decrypt_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t* cipher, int cipher_len,
    int* out_len
);

// ------------ 메모리 해제 ------------
HCRYPT_DLL void hcrypt_free(uint8_t* data);

// ------------ IV(Nonce) 생성 ------------
HCRYPT_DLL uint8_t* hcrypt_generate_iv(int* out_len);

// ------------ (단일 스레드) N×M 테이블 일괄 암/복호화 ------------
HCRYPT_DLL uint8_t* hcrypt_encrypt_table_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t** table,    // (rowCount*colCount)개의 셀 데이터 시작주소
    const int* cell_sizes,    // 각 셀의 길이 (바이트)
    int rowCount,
    int colCount,
    int* out_len
);

HCRYPT_DLL uint8_t* hcrypt_decrypt_table_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t* enc_data,
    int enc_data_len,
    int rowCount,
    int colCount,
    int* out_len
);

// ------------ (멀티 스레드) N×M 테이블 일괄 암/복호화 ------------
HCRYPT_DLL uint8_t* hcrypt_encrypt_table_mt_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t** table,
    const int* cell_sizes,
    int rowCount,
    int colCount,
    int threadCount,
    int* out_len
);

HCRYPT_DLL uint8_t* hcrypt_decrypt_table_mt_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t* enc_data,
    int enc_data_len,
    int rowCount,
    int colCount,
    int threadCount,
    int* out_len
);

} // extern "C"

//g++ -std=c++11 -fPIC -shared aes_gcm_multi.cpp -o aes_gcm_multi.so -lssl -lcrypto -pthread
//psql -h localhost -U osy -d login_crypto_db
