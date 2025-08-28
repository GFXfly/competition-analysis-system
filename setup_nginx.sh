#!/bin/bash

# 🌐 Nginx配置脚本 - cursor2.com
# 为增强AI分析公平竞争审查系统配置Nginx反向代理

set -e

# 配置变量
DOMAIN="cursor2.com"
PROJECT_NAME="competition-analysis"
APP_PORT="3000"
NGINX_CONFIG_FILE="/etc/nginx/sites-available/$PROJECT_NAME"
NGINX_ENABLED_FILE="/etc/nginx/sites-enabled/$PROJECT_NAME"
SSL_DIR="/etc/ssl/certs"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📝 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🌐 开始配置Nginx for $DOMAIN..."

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    print_error "请以root权限运行此脚本: sudo $0"
    exit 1
fi

# 备份现有配置
print_step "备份现有Nginx配置..."
if [ -f "$NGINX_CONFIG_FILE" ]; then
    cp "$NGINX_CONFIG_FILE" "$NGINX_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    print_success "已备份现有配置"
fi

# 创建Nginx配置文件
print_step "创建Nginx配置文件..."

cat > "$NGINX_CONFIG_FILE" << EOF
# Nginx配置 - 增强AI分析公平竞争审查系统
# Domain: $DOMAIN

# HTTP -> HTTPS 重定向
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # 其他所有请求重定向到HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL配置
    ssl_certificate $SSL_DIR/$DOMAIN.crt;
    ssl_certificate_key $SSL_DIR/$DOMAIN.key;
    
    # 现代SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:ECDHE-RSA-DES-CBC3-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:DES-CBC3-SHA:!aNULL:!eNULL:!EXPORT:!DES:!MD5:!PSK:!RC4;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 5m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 其他安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # 日志配置
    access_log /var/log/nginx/$PROJECT_NAME.access.log;
    error_log /var/log/nginx/$PROJECT_NAME.error.log;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # 主应用代理
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s; # AI分析可能需要较长时间

        # 文件上传大小限制
        client_max_body_size 10M;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://127.0.0.1:$APP_PORT/health;
        access_log off;
    }

    # 管理员接口（可选，根据需要开启）
    location /admin {
        proxy_pass http://127.0.0.1:$APP_PORT/admin;
        
        # 可以添加IP白名单或HTTP基本认证
        # allow 192.168.1.0/24;
        # deny all;
        
        # auth_basic "Admin Area";
        # auth_basic_user_file /etc/nginx/.htpasswd;
    }

    # 安全配置：隐藏敏感路径
    location ~ /\.(ht|git|env) {
        deny all;
        return 404;
    }

    location /node_modules {
        deny all;
        return 404;
    }
}
EOF

print_success "Nginx配置文件已创建: $NGINX_CONFIG_FILE"

# 启用站点配置
print_step "启用站点配置..."
if [ ! -L "$NGINX_ENABLED_FILE" ]; then
    ln -sf "$NGINX_CONFIG_FILE" "$NGINX_ENABLED_FILE"
    print_success "站点配置已启用"
else
    print_success "站点配置已经启用"
fi

# 删除默认配置（如果存在）
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm -f "/etc/nginx/sites-enabled/default"
    print_success "默认站点配置已删除"
fi

# 测试Nginx配置
print_step "测试Nginx配置..."
if nginx -t; then
    print_success "Nginx配置测试通过"
else
    print_error "Nginx配置测试失败，请检查配置文件"
    exit 1
fi

# 创建SSL证书目录
print_step "准备SSL证书目录..."
mkdir -p "$SSL_DIR"

# 检查SSL证书
if [ ! -f "$SSL_DIR/$DOMAIN.crt" ] || [ ! -f "$SSL_DIR/$DOMAIN.key" ]; then
    print_warning "SSL证书不存在，创建自签名证书用于测试..."
    
    # 生成自签名证书
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/$DOMAIN.key" \
        -out "$SSL_DIR/$DOMAIN.crt" \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=Competition Analysis/OU=IT/CN=$DOMAIN"
    
    chmod 600 "$SSL_DIR/$DOMAIN.key"
    chmod 644 "$SSL_DIR/$DOMAIN.crt"
    
    print_warning "已创建自签名证书，生产环境请使用Let's Encrypt或购买正式证书"
    print_warning "Let's Encrypt证书获取命令："
    print_warning "certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# 重启Nginx
print_step "重启Nginx服务..."
systemctl reload nginx

if systemctl is-active --quiet nginx; then
    print_success "Nginx已成功重启"
else
    print_error "Nginx重启失败，请检查配置"
    systemctl status nginx
    exit 1
fi

# 设置开机自启
systemctl enable nginx

print_success "Nginx已设置为开机自启"

echo
echo "🎉 Nginx配置完成！"
echo
echo "📋 配置信息："
echo "   域名: $DOMAIN"
echo "   配置文件: $NGINX_CONFIG_FILE"
echo "   应用端口: $APP_PORT"
echo "   SSL证书: $SSL_DIR/$DOMAIN.crt"
echo
echo "🔒 SSL证书建议："
echo "   生产环境请安装Let's Encrypt证书:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo
echo "🌐 访问地址："
echo "   HTTP: http://$DOMAIN (自动重定向到HTTPS)"
echo "   HTTPS: https://$DOMAIN"
echo
print_success "Nginx配置脚本执行完成！"