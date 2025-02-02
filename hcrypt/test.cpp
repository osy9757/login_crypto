#include <mutex>
#include <thread>
#include <iostream>

int main() {
    std::mutex mtx;
    std::lock_guard<std::mutex> lock(mtx);
    std::thread t([](){ std::cout << "Hello from thread\n"; });
    t.join();
    return 0;
}
