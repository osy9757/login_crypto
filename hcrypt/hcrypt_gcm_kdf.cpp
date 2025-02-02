#include "hcrypt_gcm_kdf.h"

// OpenSSL
#include <openssl/evp.h>
#include <openssl/aes.h>
#include <openssl/rand.h>
#include <openssl/err.h>
#include <openssl/hmac.h> 
#include <openssl/sha.h>

#include <stdexcept>
#include <cstring>
#include <mutex>
#include <iostream>

static std::mutex g_openssl_mutex;
bool hcrypt_gcm_kdf::opensslInitialized = false;

// --------------------
// OpenSSL 전역 init/cleanup
// --------------------
void hcrypt_gcm_kdf::opensslInit() {
    std::lock_guard<std::mutex> lock(g_openssl_mutex);
    if (!opensslInitialized) {
        OpenSSL_add_all_algorithms();
        ERR_load_crypto_strings();
        opensslInitialized = true;
    }
}

void hcrypt_gcm_kdf::opensslCleanup() {
    std::lock_guard<std::mutex> lock(g_openssl_mutex);
    if (opensslInitialized) {
        EVP_cleanup();
        ERR_free_strings();
        opensslInitialized = false;
    }
}

// --------------------
// 생성/소멸자
// --------------------
hcrypt_gcm_kdf::hcrypt_gcm_kdf()
  : evpCipher(nullptr)
{
    opensslInit();
}

hcrypt_gcm_kdf::~hcrypt_gcm_kdf() {
    opensslCleanup();
}

// --------------------
// KDF(PBKDF2)로 키 생성
// --------------------
void hcrypt_gcm_kdf::deriveKeyFromPassword(const std::string& password,
                                           const std::vector<uint8_t>& salt,
                                           int keyLen,
                                           int iterationCount)
{
    if (keyLen != 16 && keyLen != 24 && keyLen != 32) {
        throw std::invalid_argument("[deriveKeyFromPassword] keyLen은 16/24/32 중 하나여야 합니다.");
    }
    std::vector<uint8_t> derived(keyLen, 0);

    // OpenSSL PBKDF2 함수: PKCS5_PBKDF2_HMAC()
    if (!PKCS5_PBKDF2_HMAC(
            password.c_str(), (int)password.size(),
            salt.data(), (int)salt.size(),
            iterationCount, EVP_sha256(),
            keyLen, derived.data()))
    {
        unsigned long errc = ERR_get_error();
        throw std::runtime_error("[deriveKeyFromPassword] PBKDF2 실패: " +
                                 std::string(ERR_reason_error_string(errc)));
    }

    setKey(derived);
    // 민감 정보 덮어쓰기
    std::memset(derived.data(), 0, derived.size());
}

// --------------------
// 이미 만들어둔 키 설정
// --------------------
void hcrypt_gcm_kdf::setKey(const std::vector<uint8_t>& keyData) {
    switch (keyData.size()) {
    case 16:
        evpCipher = EVP_aes_128_gcm();
        break;
    case 24:
        evpCipher = EVP_aes_192_gcm();
        break;
    case 32:
        evpCipher = EVP_aes_256_gcm();
        break;
    default:
        throw std::invalid_argument("[setKey] 지원하지 않는 키 길이 (16/24/32).");
    }
    key = keyData;
}

// --------------------
// 무작위 12바이트 IV 생성
// --------------------
std::vector<uint8_t> hcrypt_gcm_kdf::generateRandomIV() {
    std::vector<uint8_t> ivBuf(12);
    if (1 != RAND_bytes(ivBuf.data(), (int)ivBuf.size())) {
        unsigned long errc = ERR_get_error();
        throw std::runtime_error("[generateRandomIV] RAND_bytes 실패: " +
                                 std::string(ERR_reason_error_string(errc)));
    }
    return ivBuf;
}

// --------------------
// AES-GCM 암호화
// --------------------
std::vector<uint8_t> hcrypt_gcm_kdf::encrypt(const std::vector<uint8_t>& plaintext) {
    if (!evpCipher) {
        throw std::runtime_error("[encrypt] 키가 설정되지 않았습니다.");
    }
    return aesEncryptGcm(plaintext);
}

// --------------------
// AES-GCM 복호화
// --------------------
std::vector<uint8_t> hcrypt_gcm_kdf::decrypt(const std::vector<uint8_t>& ciphertext) {
    if (!evpCipher) {
        throw std::runtime_error("[decrypt] 키가 설정되지 않았습니다.");
    }
    return aesDecryptGcm(ciphertext);
}

// --------------------
// 내부: AES-GCM 암호화
//  ciphertext = [12바이트 IV] + [암호문] + [16바이트 태그]
// --------------------
std::vector<uint8_t> hcrypt_gcm_kdf::aesEncryptGcm(const std::vector<uint8_t>& plain) {
    // 1) Context
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        throw std::runtime_error("[aesEncryptGcm] EVP_CIPHER_CTX_new 실패");
    }

    std::vector<uint8_t> out;
    try {
        // 2) IV 생성 (12바이트)
        std::vector<uint8_t> ivBuf = generateRandomIV();

        // 3) 암호화 초기화
        if (1 != EVP_EncryptInit_ex(ctx, static_cast<const EVP_CIPHER*>(evpCipher),
                                    nullptr, nullptr, nullptr)) {
            throw std::runtime_error("[aesEncryptGcm] EncryptInit_ex 실패(1단계)");
        }

        // 실제 키/IV 설정
        if (1 != EVP_EncryptInit_ex(ctx, nullptr, nullptr, key.data(), ivBuf.data())) {
            throw std::runtime_error("[aesEncryptGcm] EncryptInit_ex 실패(키/IV)");
        }

        // (옵션) AAD 사용시: EVP_EncryptUpdate(ctx, NULL, &len, aad, aad_len)

        // 4) 암호문 공간: IV + 평문 + 태그
        //    평문 길이만큼 우선 잡고, 태그는 16바이트
        out.resize(ivBuf.size() + plain.size() + 16);
        // 맨 앞 12바이트 = IV
        std::memcpy(out.data(), ivBuf.data(), ivBuf.size());

        // 그 다음이 암호문
        uint8_t* cipherPtr = out.data() + ivBuf.size();
        int len = 0;

        // 5) 평문 -> 암호문
        if (1 != EVP_EncryptUpdate(ctx, cipherPtr, &len,
                                   plain.data(), (int)plain.size())) {
            throw std::runtime_error("[aesEncryptGcm] EncryptUpdate 실패");
        }
        int cipherLen = len;

        // 6) Final
        if (1 != EVP_EncryptFinal_ex(ctx, cipherPtr + cipherLen, &len)) {
            throw std::runtime_error("[aesEncryptGcm] EncryptFinal 실패");
        }
        cipherLen += len;

        // 7) 태그(16바이트) 추출
        std::vector<uint8_t> tag(16);
        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG,
                                     (int)tag.size(), tag.data()))
        {
            throw std::runtime_error("[aesEncryptGcm] GET_TAG 실패");
        }

        EVP_CIPHER_CTX_free(ctx);

        // 8) out = [IV(12)] + [암호문(cipherLen)] + [태그(16)]
        //    기존에 잡아둔 공간 중 일단 iv(12)+cipherLen+tag(16)까지만 유효
        out.resize(ivBuf.size() + cipherLen + tag.size());
        // 태그 붙이기
        std::memcpy(out.data() + ivBuf.size() + cipherLen, tag.data(), tag.size());

        // 민감 정보 지우기
        std::memset(ivBuf.data(), 0, ivBuf.size());
        std::memset(key.data(), 0, key.size());

        return out;
    }
    catch (...) {
        EVP_CIPHER_CTX_free(ctx);
        throw;
    }
}

// --------------------
// 내부: AES-GCM 복호화
// --------------------
std::vector<uint8_t> hcrypt_gcm_kdf::aesDecryptGcm(const std::vector<uint8_t>& cipher) {
    if (cipher.size() < (12 + 16)) {
        throw std::runtime_error("[aesDecryptGcm] 암호문이 너무 짧습니다.");
    }

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        throw std::runtime_error("[aesDecryptGcm] EVP_CIPHER_CTX_new 실패");
    }

    std::vector<uint8_t> out;
    try {
        // 1) 앞 12바이트 = IV, 뒤 16바이트 = TAG
        const size_t ivSize = 12;
        const size_t tagSize = 16;
        size_t totalLen = cipher.size();
        if (totalLen < ivSize + tagSize) {
            throw std::runtime_error("[aesDecryptGcm] cipher 길이 에러");
        }

        std::vector<uint8_t> ivBuf(ivSize);
        std::memcpy(ivBuf.data(), cipher.data(), ivSize);

        std::vector<uint8_t> tagBuf(tagSize);
        std::memcpy(tagBuf.data(), cipher.data() + (totalLen - tagSize), tagSize);

        // 2) 실제 암호문 길이
        size_t actualCipherLen = totalLen - ivSize - tagSize;
        const uint8_t* actualCipherPtr = cipher.data() + ivSize;

        // 3) 복호화 초기화
        if (1 != EVP_DecryptInit_ex(ctx, static_cast<const EVP_CIPHER*>(evpCipher),
                                    nullptr, nullptr, nullptr)) {
            throw std::runtime_error("[aesDecryptGcm] DecryptInit_ex 실패(1단계)");
        }

        if (1 != EVP_DecryptInit_ex(ctx, nullptr, nullptr,
                                    key.data(), ivBuf.data())) {
            throw std::runtime_error("[aesDecryptGcm] DecryptInit_ex 실패(키/IV)");
        }

        // (옵션) AAD: EVP_DecryptUpdate(ctx, NULL, &len, aad, aad_len)

        // 4) 복호화 버퍼
        out.resize(actualCipherLen);
        int len = 0, plainLen = 0;

        // 5) 복호화 Update
        if (1 != EVP_DecryptUpdate(ctx, out.data(), &len,
                                   actualCipherPtr, (int)actualCipherLen)) {
            throw std::runtime_error("[aesDecryptGcm] DecryptUpdate 실패");
        }
        plainLen = len;

        // 6) 태그 설정 -> final에서 검증
        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG,
                                     (int)tagBuf.size(), (void*)tagBuf.data()))
        {
            throw std::runtime_error("[aesDecryptGcm] 태그 설정 실패");
        }

        // 7) Final (태그 검증)
        if (1 != EVP_DecryptFinal_ex(ctx, out.data() + plainLen, &len)) {
            throw std::runtime_error("[aesDecryptGcm] DecryptFinal 실패(태그 불일치)");
        }
        plainLen += len;

        out.resize(plainLen);

        EVP_CIPHER_CTX_free(ctx);

        // 민감 정보 지우기
        std::memset(ivBuf.data(), 0, ivBuf.size());
        std::memset(tagBuf.data(), 0, tagBuf.size());
        std::memset(key.data(), 0, key.size());

        return out;
    }
    catch (...) {
        EVP_CIPHER_CTX_free(ctx);
        throw;
    }
}

// --------------------
// extern "C" (DLL용 C 인터페이스)
// --------------------
extern "C" {

hcrypt_gcm_kdf* hcrypt_new() {
    try {
        return new hcrypt_gcm_kdf();
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_new] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}

void hcrypt_delete(hcrypt_gcm_kdf* hc) {
    delete hc;
}

void hcrypt_deriveKeyFromPassword(hcrypt_gcm_kdf* hc,
                                  const char* password,
                                  const uint8_t* salt,
                                  int salt_len,
                                  int key_len,
                                  int iteration)
{
    if (!hc || !password || !salt) return;
    try {
        std::vector<uint8_t> saltVec(salt, salt + salt_len);
        hc->deriveKeyFromPassword(password, saltVec, key_len, iteration);
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_deriveKeyFromPassword] 예외: " << e.what() << std::endl;
    }
}

void hcrypt_setKey(hcrypt_gcm_kdf* hc, const uint8_t* keydata, int key_len) {
    if (!hc || !keydata) return;
    try {
        std::vector<uint8_t> keyVec(keydata, keydata + key_len);
        hc->setKey(keyVec);
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_setKey] 예외: " << e.what() << std::endl;
    }
}

uint8_t* hcrypt_encrypt_alloc(hcrypt_gcm_kdf* hc,
                              const uint8_t* plain, int plain_len,
                              int* out_len)
{
    if (!hc || !plain || !out_len) return nullptr;
    try {
        std::vector<uint8_t> input(plain, plain + plain_len);
        std::vector<uint8_t> enc = hc->encrypt(input);

        // 결과를 동적 할당해서 반환
        *out_len = (int)enc.size();
        uint8_t* result = new uint8_t[enc.size()];
        std::memcpy(result, enc.data(), enc.size());
        return result;
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_encrypt_alloc] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}

uint8_t* hcrypt_decrypt_alloc(hcrypt_gcm_kdf* hc,
                              const uint8_t* cipher, int cipher_len,
                              int* out_len)
{
    if (!hc || !cipher || !out_len) return nullptr;
    try {
        std::vector<uint8_t> input(cipher, cipher + cipher_len);
        std::vector<uint8_t> dec = hc->decrypt(input);

        *out_len = (int)dec.size();
        uint8_t* result = new uint8_t[dec.size()];
        std::memcpy(result, dec.data(), dec.size());
        return result;
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_decrypt_alloc] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}

void hcrypt_free(uint8_t* data) {
    delete[] data;
}

uint8_t* hcrypt_generate_iv(int* out_len) {
    if (!out_len) return nullptr;
    try {
        auto iv = hcrypt_gcm_kdf::generateRandomIV();
        *out_len = (int)iv.size();
        uint8_t* result = new uint8_t[iv.size()];
        std::memcpy(result, iv.data(), iv.size());
        return result;
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_generate_iv] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}

} // extern "C"
