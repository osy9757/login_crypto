//aes_gcm_multi.cpp
#include "aes_gcm_multi.h"

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
#include <thread>
#include <iostream>

/*******************************************************
 * 전역 상태 (OpenSSL init/cleanup)
 *******************************************************/
static std::mutex g_openssl_mutex;
bool hcrypt_gcm_kdf::opensslInitialized = false;

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

/*******************************************************
 * 1) 클래스 생성/소멸
 *******************************************************/
hcrypt_gcm_kdf::hcrypt_gcm_kdf()
  : evpCipher(nullptr)
{
    opensslInit();
}

hcrypt_gcm_kdf::~hcrypt_gcm_kdf() {
    opensslCleanup();
}

/*******************************************************
 * 2) KDF (PBKDF2)로 키 생성
 *******************************************************/
void hcrypt_gcm_kdf::deriveKeyFromPassword(const std::string& password,
                                           const std::vector<uint8_t>& salt,
                                           int keyLen,
                                           int iterationCount)
{
    if (keyLen != 16 && keyLen != 24 && keyLen != 32) {
        throw std::invalid_argument("[deriveKeyFromPassword] keyLen은 16/24/32 중 하나여야 합니다.");
    }
    std::vector<uint8_t> derived(keyLen, 0);

    if (!PKCS5_PBKDF2_HMAC(password.c_str(), (int)password.size(),
                           salt.data(), (int)salt.size(),
                           iterationCount, EVP_sha256(),
                           keyLen, derived.data()))
    {
        unsigned long errc = ERR_get_error();
        throw std::runtime_error("[deriveKeyFromPassword] PBKDF2 실패: " +
                                 std::string(ERR_reason_error_string(errc)));
    }

    setKey(derived);
    // 민감 정보 덮어쓰기 (옵션)
    std::memset(derived.data(), 0, derived.size());
}

/*******************************************************
 * 3) 키 직접 설정 / 키 가져오기
 *******************************************************/
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

std::vector<uint8_t> hcrypt_gcm_kdf::getKey() const {
    return key; // 복사본 반환
}

/*******************************************************
 * 4) 무작위 12바이트 IV 생성
 *******************************************************/
std::vector<uint8_t> hcrypt_gcm_kdf::generateRandomIV() {
    std::vector<uint8_t> ivBuf(12);
    if (1 != RAND_bytes(ivBuf.data(), (int)ivBuf.size())) {
        unsigned long errc = ERR_get_error();
        throw std::runtime_error("[generateRandomIV] RAND_bytes 실패: " +
                                 std::string(ERR_reason_error_string(errc)));
    }
    return ivBuf;
}

/*******************************************************
 * 5) AES-GCM 암/복호화 (단일 청크)
 *******************************************************/
// --- [빈 문자열 예외처리] 추가 ---
std::vector<uint8_t> hcrypt_gcm_kdf::encrypt(const std::vector<uint8_t>& plaintext) {
    if (!evpCipher) {
        throw std::runtime_error("[encrypt] 키가 설정되지 않았습니다.");
    }

    // 빈 평문이면, 빈 결과 반환
    if (plaintext.empty()) {
        return {}; 
    }

    return aesEncryptGcm(plaintext);
}

std::vector<uint8_t> hcrypt_gcm_kdf::decrypt(const std::vector<uint8_t>& ciphertext) {
    if (!evpCipher) {
        throw std::runtime_error("[decrypt] 키가 설정되지 않았습니다.");
    }

    // GCM 최소크기(IV=12, 태그=16)보다 작으면 "빈 결과" 반환
    if (ciphertext.size() < 12 + 16) {
        return {};
    }

    return aesDecryptGcm(ciphertext);
}

/*******************************************************
 * 6) 내부: AES-GCM 암호화
 *    결과 = [IV(12)] + [암호문] + [태그(16)]
 *******************************************************/
std::vector<uint8_t> hcrypt_gcm_kdf::aesEncryptGcm(const std::vector<uint8_t>& plain) {
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        throw std::runtime_error("[aesEncryptGcm] EVP_CIPHER_CTX_new 실패");
    }

    try {
        // 1) IV 생성
        std::vector<uint8_t> ivBuf = generateRandomIV();

        // 2) 암호화 초기화
        if (1 != EVP_EncryptInit_ex(ctx, static_cast<const EVP_CIPHER*>(evpCipher),
                                    nullptr, nullptr, nullptr)) {
            throw std::runtime_error("[aesEncryptGcm] EncryptInit_ex 실패(1단계)");
        }

        // 3) 키/IV 설정
        if (1 != EVP_EncryptInit_ex(ctx, nullptr, nullptr, key.data(), ivBuf.data())) {
            throw std::runtime_error("[aesEncryptGcm] EncryptInit_ex 실패(키/IV)");
        }

        // 4) 암호문 공간 ([IV] + 평문크기 + [태그])
        std::vector<uint8_t> out;
        out.resize(ivBuf.size() + plain.size() + 16);

        // out 맨 앞 12바이트 = IV
        std::memcpy(out.data(), ivBuf.data(), ivBuf.size());

        // 5) 평문 -> 암호문
        int len = 0;
        uint8_t* cipherPtr = out.data() + ivBuf.size();
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
                                     (int)tag.size(), tag.data())) {
            throw std::runtime_error("[aesEncryptGcm] GET_TAG 실패");
        }

        // 8) out = [IV] + [암호문(cipherLen)] + [태그(16)]
        out.resize(ivBuf.size() + cipherLen + tag.size());
        std::memcpy(out.data() + ivBuf.size() + cipherLen, tag.data(), tag.size());

        EVP_CIPHER_CTX_free(ctx);
        std::memset(ivBuf.data(), 0, ivBuf.size());

        return out;
    }
    catch (...) {
        EVP_CIPHER_CTX_free(ctx);
        throw;
    }
}

/*******************************************************
 * 7) 내부: AES-GCM 복호화
 *******************************************************/
std::vector<uint8_t> hcrypt_gcm_kdf::aesDecryptGcm(const std::vector<uint8_t>& cipher) {
    if (cipher.size() < 12 + 16) {
        throw std::runtime_error("[aesDecryptGcm] 암호문이 너무 짧습니다.");
    }

    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        throw std::runtime_error("[aesDecryptGcm] EVP_CIPHER_CTX_new 실패");
    }

    try {
        // 1) IV(12), Tag(16) 추출
        size_t totalLen = cipher.size();
        std::vector<uint8_t> ivBuf(12);
        std::memcpy(ivBuf.data(), cipher.data(), 12);

        std::vector<uint8_t> tagBuf(16);
        std::memcpy(tagBuf.data(), cipher.data() + (totalLen - 16), 16);

        // 2) 암호문 부분
        size_t actualCipherLen = totalLen - 12 - 16;
        const uint8_t* actualCipherPtr = cipher.data() + 12;

        // 3) 복호화 초기화
        if (1 != EVP_DecryptInit_ex(ctx, static_cast<const EVP_CIPHER*>(evpCipher),
                                    nullptr, nullptr, nullptr)) {
            throw std::runtime_error("[aesDecryptGcm] DecryptInit_ex 실패(1단계)");
        }
        if (1 != EVP_DecryptInit_ex(ctx, nullptr, nullptr, key.data(), ivBuf.data())) {
            throw std::runtime_error("[aesDecryptGcm] DecryptInit_ex 실패(키/IV)");
        }

        // 4) 복호화 진행
        std::vector<uint8_t> out(actualCipherLen);
        int len = 0;
        if (1 != EVP_DecryptUpdate(ctx, out.data(), &len,
                                   actualCipherPtr, (int)actualCipherLen)) {
            throw std::runtime_error("[aesDecryptGcm] DecryptUpdate 실패");
        }
        int plainLen = len;

        // 5) 태그 설정 -> final에서 검증
        if (1 != EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG,
                                     16, (void*)tagBuf.data())) {
            throw std::runtime_error("[aesDecryptGcm] 태그 설정 실패");
        }

        // 6) Final (태그 검증)
        if (1 != EVP_DecryptFinal_ex(ctx, out.data() + plainLen, &len)) {
            throw std::runtime_error("[aesDecryptGcm] DecryptFinal 실패(태그 불일치)");
        }
        plainLen += len;

        out.resize(plainLen);

        EVP_CIPHER_CTX_free(ctx);
        std::memset(ivBuf.data(), 0, ivBuf.size());
        std::memset(tagBuf.data(), 0, tagBuf.size());

        return out;
    }
    catch (...) {
        EVP_CIPHER_CTX_free(ctx);
        throw;
    }
}

/*******************************************************
 * 8) extern "C" (C 인터페이스)
 *******************************************************/
extern "C" {

// ------------ 객체 생성/소멸 ------------
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

// ------------ KDF (PBKDF2) ------------
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

// ------------ 키 직접 설정 ------------
void hcrypt_setKey(hcrypt_gcm_kdf* hc, const uint8_t* keydata, int key_len) {
    if (!hc || !keydata) return;
    try {
        std::vector<uint8_t> keyVec(keydata, keydata + key_len);
        hc->setKey(keyVec);
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_setKey] 예외: " << e.what() << std::endl;
    }
}

// ------------ 단일 청크 암/복호화 ------------
uint8_t* hcrypt_encrypt_alloc(hcrypt_gcm_kdf* hc,
                              const uint8_t* plain, int plain_len,
                              int* out_len)
{
    if (!hc || !plain || !out_len) return nullptr;

    // --- [빈 문자열 예외처리] ---
    if (plain_len <= 0) {
        *out_len = 0;
        // 필요하다면, 빈 new[] 할당 또는 nullptr 반환
        return nullptr;
    }
    // ---------------------------

    try {
        std::vector<uint8_t> input(plain, plain + plain_len);
        std::vector<uint8_t> enc = hc->encrypt(input);

        *out_len = (int)enc.size();
        if (*out_len == 0) {
            // 암호화 결과가 빈 벡터 → 빈 new[] 할당
            uint8_t* result = new uint8_t[0]; // 실제 0바이트
            return result;
        }

        uint8_t* result = new uint8_t[*out_len];
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

    // --- [빈 문자열 예외처리] ---
    if (cipher_len <= 0) {
        *out_len = 0;
        return nullptr;
    }
    // ---------------------------

    try {
        std::vector<uint8_t> input(cipher, cipher + cipher_len);
        std::vector<uint8_t> dec = hc->decrypt(input);

        *out_len = (int)dec.size();
        if (*out_len == 0) {
            uint8_t* result = new uint8_t[0];
            return result;
        }

        uint8_t* result = new uint8_t[*out_len];
        std::memcpy(result, dec.data(), dec.size());
        return result;
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_decrypt_alloc] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}

// ------------ 메모리 해제 ------------
void hcrypt_free(uint8_t* data) {
    delete[] data;
}

// ------------ IV(Nonce) 생성 ------------
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

// ------------ (단일 스레드) N×M 테이블 일괄 암/복호화 ------------
uint8_t* hcrypt_encrypt_table_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t** table,
    const int* cell_sizes,
    int rowCount,
    int colCount,
    int* out_len
) {
    if (!hc || !table || !cell_sizes || !out_len) return nullptr;

    try {
        std::vector<uint8_t> allEncrypted;
        allEncrypted.reserve(rowCount * colCount * 64);

        int totalCells = rowCount * colCount;
        for (int i = 0; i < totalCells; i++) {
            int cellLen = cell_sizes[i];

            // --- [빈 문자열 예외처리] ---
            if (cellLen <= 0) {
                // 암호화 없이 [4바이트 encSize=0]만 기록
                int encSize = 0;
                uint8_t sizeBytes[4];
                std::memcpy(sizeBytes, &encSize, 4);
                allEncrypted.insert(allEncrypted.end(), sizeBytes, sizeBytes + 4);
                continue; 
            }
            // ---------------------------

            std::vector<uint8_t> plain(table[i], table[i] + cellLen);
            std::vector<uint8_t> enc = hc->encrypt(plain);

            // [4바이트 encSize] + [enc]
            int encSize = (int)enc.size();
            uint8_t sizeBytes[4];
            std::memcpy(sizeBytes, &encSize, 4);

            allEncrypted.insert(allEncrypted.end(), sizeBytes, sizeBytes + 4);
            allEncrypted.insert(allEncrypted.end(), enc.begin(), enc.end());
        }

        *out_len = (int)allEncrypted.size();
        uint8_t* result = new uint8_t[*out_len];
        std::memcpy(result, allEncrypted.data(), *out_len);
        return result;
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_encrypt_table_alloc] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}

uint8_t* hcrypt_decrypt_table_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t* enc_data,
    int enc_data_len,
    int rowCount,
    int colCount,
    int* out_len
) {
    if (!hc || !enc_data || !out_len) return nullptr;

    try {
        std::vector<uint8_t> allDecrypted;
        allDecrypted.reserve(enc_data_len);

        int offset = 0;
        int totalCells = rowCount * colCount;

        for (int i = 0; i < totalCells; i++) {
            if (offset + 4 > enc_data_len) {
                throw std::runtime_error("[hcrypt_decrypt_table_alloc] 범위 초과(헤더4바이트)");
            }
            int encSize = 0;
            std::memcpy(&encSize, enc_data + offset, 4);
            offset += 4;

            // --- [빈 문자열 예외처리] ---
            if (encSize == 0) {
                // 빈 셀 → 그냥 넘어가되, 여기서는 복원할 때
                // "빈 문자열" 처리를 할 수 있도록 로직 설계
                continue;
            }
            // ---------------------------

            if (offset + encSize > enc_data_len) {
                throw std::runtime_error("[hcrypt_decrypt_table_alloc] 범위 초과(encSize)");
            }
            std::vector<uint8_t> encCell(enc_data + offset, enc_data + offset + encSize);
            offset += encSize;

            std::vector<uint8_t> decCell = hc->decrypt(encCell);
            allDecrypted.insert(allDecrypted.end(), decCell.begin(), decCell.end());
        }

        *out_len = (int)allDecrypted.size();
        uint8_t* result = new uint8_t[*out_len];
        std::memcpy(result, allDecrypted.data(), *out_len);
        return result;
    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_decrypt_table_alloc] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}

// ============ (멀티 스레드) N×M 테이블 암호화 ============
uint8_t* hcrypt_encrypt_table_mt_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t** table,
    const int* cell_sizes,
    int rowCount,
    int colCount,
    int threadCount,
    int* out_len
) {
    if (!hc || !table || !cell_sizes || !out_len || threadCount <= 0) {
        return nullptr;
    }

    try {
        // (1) 우선 hc에서 키를 가져온다
        std::vector<uint8_t> mainKey = hc->getKey();
        if (mainKey.empty()) {
            throw std::runtime_error("[hcrypt_encrypt_table_mt_alloc] 키가 설정되지 않음");
        }

        int totalCells = rowCount * colCount;
        std::vector<std::vector<uint8_t>> encryptedCells(totalCells);

        // (2) 스레드 함수
        auto worker = [&](int startIdx, int endIdx) {
            // 이 스레드만의 local 객체
            hcrypt_gcm_kdf localHc;
            localHc.setKey(mainKey);  // 같은 키로 설정

            for (int i = startIdx; i < endIdx; i++) {
                int cellLen = cell_sizes[i];

                // 빈 셀 처리
                if (cellLen <= 0) {
                    // [4바이트 encSize=0]만
                    int encSize = 0;
                    std::vector<uint8_t> resultCell(4, 0);
                    std::memcpy(resultCell.data(), &encSize, 4);
                    encryptedCells[i] = std::move(resultCell);
                    continue;
                }

                std::vector<uint8_t> plain(table[i], table[i] + cellLen);
                std::vector<uint8_t> enc = localHc.encrypt(plain);

                // [4바이트 encSize] + [enc]
                int encSize = (int)enc.size();
                std::vector<uint8_t> resultCell(4 + encSize);
                std::memcpy(resultCell.data(), &encSize, 4);
                std::memcpy(resultCell.data() + 4, enc.data(), encSize);

                encryptedCells[i] = std::move(resultCell);
            }
        };

        // (3) 스레드 분할
        std::vector<std::thread> threads;
        threads.reserve(threadCount);

        int chunkSize = (totalCells + threadCount - 1) / threadCount;
        int start = 0;
        for (int t = 0; t < threadCount; t++) {
            int end = std::min(start + chunkSize, totalCells);
            if (start >= end) break;
            threads.emplace_back(worker, start, end);
            start = end;
        }

        // (4) join
        for (auto &th : threads) {
            if (th.joinable()) th.join();
        }

        // (5) 결과를 하나로 합침
        std::vector<uint8_t> allEncrypted;
        allEncrypted.reserve(rowCount * colCount * 64);
        for (auto &cellEnc : encryptedCells) {
            allEncrypted.insert(allEncrypted.end(), cellEnc.begin(), cellEnc.end());
        }

        *out_len = (int)allEncrypted.size();
        uint8_t* result = new uint8_t[*out_len];
        std::memcpy(result, allEncrypted.data(), *out_len);
        return result;

    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_encrypt_table_mt_alloc] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}

// ============ (멀티 스레드) N×M 테이블 복호화 ============
uint8_t* hcrypt_decrypt_table_mt_alloc(
    hcrypt_gcm_kdf* hc,
    const uint8_t* enc_data,
    int enc_data_len,
    int rowCount,
    int colCount,
    int threadCount,
    int* out_len
) {
    if (!hc || !enc_data || !out_len || threadCount <= 0) {
        return nullptr;
    }

    try {
        std::vector<uint8_t> mainKey = hc->getKey();
        if (mainKey.empty()) {
            throw std::runtime_error("[hcrypt_decrypt_table_mt_alloc] 키가 설정되지 않음");
        }

        int totalCells = rowCount * colCount;
        std::vector<int> offsets(totalCells);
        std::vector<int> sizes(totalCells);

        // (1) enc_data 스캔 → 각 셀 암호문 offset/size 파악
        int offset = 0;
        for (int i = 0; i < totalCells; i++) {
            if (offset + 4 > enc_data_len) {
                throw std::runtime_error("복호화: enc_data 범위 초과(헤더4바이트)");
            }
            int encSize = 0;
            std::memcpy(&encSize, enc_data + offset, 4);
            offset += 4;

            if (offset + encSize > enc_data_len) {
                throw std::runtime_error("복호화: enc_data 범위 초과(encSize)");
            }
            offsets[i] = offset;
            sizes[i]   = encSize;
            offset    += encSize;
        }

        std::vector<std::vector<uint8_t>> decryptedCells(totalCells);

        // (2) 스레드 함수
        auto worker = [&](int startIdx, int endIdx) {
            hcrypt_gcm_kdf localHc;
            localHc.setKey(mainKey);

            for (int i = startIdx; i < endIdx; i++) {
                int encSize   = sizes[i];
                int encOffset = offsets[i];

                // 빈 셀 처리
                if (encSize == 0) {
                    // [4바이트 plainLen=0]만
                    std::vector<uint8_t> emptyCell(4, 0);
                    decryptedCells[i] = std::move(emptyCell);
                    continue;
                }

                std::vector<uint8_t> encCell(
                    enc_data + encOffset,
                    enc_data + encOffset + encSize
                );

                // 실제 복호화
                std::vector<uint8_t> dec = localHc.decrypt(encCell);
                int plainLen = (int)dec.size();

                // 이제 [4바이트 plainLen] + [plainData] 기록
                std::vector<uint8_t> resultCell(4 + plainLen);
                std::memcpy(resultCell.data(), &plainLen, 4);
                std::memcpy(resultCell.data() + 4, dec.data(), plainLen);

                decryptedCells[i] = std::move(resultCell);
            }
        };

        // (3) 스레드 분할
        std::vector<std::thread> threads;
        threads.reserve(threadCount);

        int chunkSize = (totalCells + threadCount - 1) / threadCount;
        int startIdx  = 0;
        for (int t = 0; t < threadCount; t++) {
            int endIdx = std::min(startIdx + chunkSize, totalCells);
            if (startIdx >= endIdx) break;
            threads.emplace_back(worker, startIdx, endIdx);
            startIdx = endIdx;
        }

        // (4) join
        for (auto &th : threads) {
            if (th.joinable()) th.join();
        }

        // (5) 모든 셀 결과를 하나로 합침
        // => 각 셀이 "[4바이트 plainLen + plainData]" 형태
        std::vector<uint8_t> allDecrypted;
        allDecrypted.reserve(enc_data_len); 
        for (auto &cell : decryptedCells) {
            allDecrypted.insert(allDecrypted.end(), cell.begin(), cell.end());
        }

        *out_len = (int)allDecrypted.size();
        uint8_t* result = new uint8_t[*out_len];
        std::memcpy(result, allDecrypted.data(), *out_len);

        return result;

    } catch (const std::exception& e) {
        std::cerr << "[hcrypt_decrypt_table_mt_alloc] 예외: " << e.what() << std::endl;
        return nullptr;
    }
}
} // extern "C"