FROM php:7.4-fpm

RUN apt-get update && apt-get install -y \
    libpq-dev \
    git \
    unzip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libzip-dev \
    libxml2-dev \
    libffi-dev \
    default-mysql-client \
    default-libmysqlclient-dev \
    gcc \
    g++ \
    libssl-dev \
    wget \
    make \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_mysql \
    pdo_pgsql \
    zip \
    gd \
    xml \
    ffi \
    pcntl

WORKDIR /var/www/html

COPY ./src/php.ini /usr/local/etc/php/conf.d/

# Composer (multi-stage) 예시
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY src/ /var/www/html/

# TODO: C/C++ 코드를 빌드하여 aes_gcm_multi.so 생성
RUN g++ -std=c++11 -fPIC -shared /var/www/html/aes_gcm_multi.cpp -o /var/www/html/aes_gcm_multi.so -lssl -lcrypto -pthread

RUN chmod -R 755 /var/www/html/

# 필요한 모든 디렉토리 생성 및 권한 설정
RUN mkdir -p /var/www/html/logs /var/www/html/tmp && \
    chmod -R 777 /var/www/html/logs /var/www/html/tmp && \
    chown -R www-data:www-data /var/www/html/logs /var/www/html/tmp

# 파일 생성을 위한 전용 디렉토리 생성 및 권한 설정
RUN mkdir -p /var/www/html/writable_downloads && \
    chown www-data:www-data /var/www/html/writable_downloads && \
    chmod 755 /var/www/html/writable_downloads

RUN chown -R www-data:www-data /var/www/html
