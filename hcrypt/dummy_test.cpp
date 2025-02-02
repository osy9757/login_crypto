#include "hcrypt_gcm_kdf.h"
#include <iostream>
#include <vector>
#include <string>
#include <chrono>

// Function to generate dummy phone numbers
std::vector<std::string> generatePhoneNumbers(int count) {
    std::vector<std::string> phoneNumbers;
    phoneNumbers.reserve(count);
    for (int i = 0; i < count; ++i) {
        // Generate phone numbers in the format "010-0000-0000" to "010-9999-9999"
        // For simplicity, we'll cycle through a range
        int part1 = 1000 + (i % 9000); // 1000 to 9999
        int part2 = 1000 + ((i / 9000) % 9000); // 1000 to 9999
        phoneNumbers.emplace_back("010-" + std::to_string(part1) + "-" + std::to_string(part2));
    }
    return phoneNumbers;
}

int main() {
    try {
        // 1) 객체 생성
        hcrypt_gcm_kdf hc;

        // 2) KDF로 키 생성
        std::string password = "MySecretPass!";
        std::vector<uint8_t> salt = {0x01, 0x02, 0x03, 0x04}; // 예시
        // AES-256 = 32바이트
        hc.deriveKeyFromPassword(password, salt, 32, 10000);

        // 3) 전화번호 준비 (200,000개)
        const int phoneCount = 200000;
        std::vector<std::string> phoneNumbers = generatePhoneNumbers(phoneCount);

        // 4) 암호화를 위한 준비
        std::vector<std::vector<uint8_t>> encryptedPhones;
        encryptedPhones.reserve(phoneCount); // Reserve space to avoid reallocations

        // 5) 타이밍 시작
        auto start = std::chrono::high_resolution_clock::now();

        for (const auto& phone : phoneNumbers) {
            std::vector<uint8_t> plainVec(phone.begin(), phone.end());
            std::vector<uint8_t> encrypted = hc.encrypt(plainVec);
            encryptedPhones.emplace_back(std::move(encrypted));
        }

        // 6) 타이밍 종료
        auto end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> elapsed = end - start;

        // 7) 결과 출력
        std::cout << "Encrypted " << phoneCount << " phone numbers in "
                  << elapsed.count() << " seconds." << std::endl;
        std::cout << "Average time per encryption: "
                  << (elapsed.count() / phoneCount) * 1e6 << " microseconds." << std::endl;
    }
    catch (const std::exception& e) {
        std::cerr << "[main] 예외 발생: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}
