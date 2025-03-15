FROM httpd:2.4

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    libpq-dev \
    curl \
    apt-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Apache 모듈 활성화 - 필요한 모듈 추가
RUN sed -i 's/#LoadModule proxy_module/LoadModule proxy_module/' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule proxy_fcgi_module/LoadModule proxy_fcgi_module/' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule rewrite_module/LoadModule rewrite_module/' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule headers_module/LoadModule headers_module/' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/#LoadModule expires_module/LoadModule expires_module/' /usr/local/apache2/conf/httpd.conf

# 환경 변수 설정
ENV APACHE_DOCUMENT_ROOT /var/www/html

# httpd.conf 파일을 수정하여 외부 설정 포함
RUN echo "Include /etc/apache2-config/apache.conf" >> /usr/local/apache2/conf/httpd.conf

# 권한 설정
RUN chown -R www-data:www-data /usr/local/apache2/logs