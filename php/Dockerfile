FROM php:8.1-fpm

RUN apt-get update && apt-get install -y \
    libpq-dev \
    git \
    unzip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libffi-dev \
    libonig-dev \  
    libxml2-dev \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install pdo pdo_pgsql gd zip ffi mbstring xml \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY ./src/php.ini /usr/local/etc/php/conf.d/

# Composer (multi-stage) 예시
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
# COPY composer.json & composer.lock ...
# RUN composer install ...

COPY src/ /var/www/html/

RUN chown -R www-data:www-data /var/www/html
