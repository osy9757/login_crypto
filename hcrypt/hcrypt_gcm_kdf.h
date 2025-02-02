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
// ===================================================
class hcrypt_gcm_kdf {
public:
    // 생성자 / 소멸자
    hcrypt_gcm_kdf();
    ~hcrypt_gcm_kdf();

    // 1) 패스워드/솔트를 통해 안전한 키를 생성 (PBKDF2)
    //    - keyLen: 16, 24, 32 중 하나
    //    - iterationCount: 기본 10000 (커질수록 안전하지만 느림)
    void deriveKeyFromPassword(const std::string& password,
                               const std::vector<uint8_t>& salt,
                               int keyLen = 32,
                               int iterationCount = 10000);

    // (원한다면, 이미 만들어둔 키를 직접 설정 가능)
    //  - 길이가 16,24,32가 아니면 예외
    void setKey(const std::vector<uint8_t>& keyData);

    // 2) 무작위 IV(Nonce) 생성 (12바이트 권장)
    static std::vector<uint8_t> generateRandomIV();

    // 3) AES-GCM 암/복호화
    //  - 결과: [12바이트 IV] + [암호문] + [16바이트 태그]
    std::vector<uint8_t> encrypt(const std::vector<uint8_t>& plaintext);
    std::vector<uint8_t> decrypt(const std::vector<uint8_t>& ciphertext);

private:
    // 내부에서 AES-128/192/256-GCM 중 하나 선택
    const void* evpCipher; // 실제론 const EVP_CIPHER*
    std::vector<uint8_t> key;

    // AES-GCM 내부 로직
    std::vector<uint8_t> aesEncryptGcm(const std::vector<uint8_t>& plain);
    std::vector<uint8_t> aesDecryptGcm(const std::vector<uint8_t>& cipher);

    // OpenSSL 초기화/정리 (static)
    static void opensslInit();
    static void opensslCleanup();
    static bool opensslInitialized;
};

// ==================== C 인터페이스 (DLL 내보내기용) ====================
//
//  - extern "C"로 감싸서 함수명을 C 스타일로 노출
//  - Windows라면 __declspec(dllexport) 등을 붙이거나
//    .def 파일 사용, 다른 플랫폼이면 -fPIC -shared 등 빌드옵션 사용
//
extern "C" {

#ifdef _WIN32
 #define HCRYPT_DLL __declspec(dllexport)
#else
 #define HCRYPT_DLL
#endif

// 객체 생성/소멸
HCRYPT_DLL hcrypt_gcm_kdf* hcrypt_new();
HCRYPT_DLL void hcrypt_delete(hcrypt_gcm_kdf* hc);

// KDF를 통해 키 생성
//  - password: 패스워드 (char*)
//  - salt: salt 바이트 배열
//  - salt_len: salt 길이
//  - key_len: 16,24,32 중 하나
//  - iteration: PBKDF2 반복 횟수
HCRYPT_DLL void hcrypt_deriveKeyFromPassword(
    hcrypt_gcm_kdf* hc,
    const char* password,
    const uint8_t* salt,
    int salt_len,
    int key_len,
    int iteration
);

// 이미 만들어둔 키 설정
HCRYPT_DLL void hcrypt_setKey(hcrypt_gcm_kdf* hc, const uint8_t* keydata, int key_len);

// 암호화/복호화 (결과 동적 할당 후 반환)
HCRYPT_DLL uint8_t* hcrypt_encrypt_alloc(hcrypt_gcm_kdf* hc, const uint8_t* plain, int plain_len, int* out_len);
HCRYPT_DLL uint8_t* hcrypt_decrypt_alloc(hcrypt_gcm_kdf* hc, const uint8_t* cipher, int cipher_len, int* out_len);

// 결과 메모리 해제
HCRYPT_DLL void hcrypt_free(uint8_t* data);

// IV(Nonce) 생성
HCRYPT_DLL uint8_t* hcrypt_generate_iv(int* out_len);

} // extern "C"


// g++ -std=c++11 -fPIC -shared hcrypt_gcm_kdf.cpp -o libhcrypt_gcm_kdf.so -lssl -lcrypto -pthread