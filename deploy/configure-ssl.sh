#!/bin/bash
# SSL 证书配置脚本 - cursor2.com
# 使用方法: ./configure-ssl.sh

set -e  # 遇到错误立即退出

echo "🔒 开始配置 cursor2.com SSL 证书..."

# 颜色输出函数
print_step() {
    echo -e "\n\033[1;32m▶ $1\033[0m"
}
print_info() {
    echo -e "\033[1;34mℹ $1\033[0m"
}
print_warning() {
    echo -e "\033[1;33m⚠ $1\033[0m"
}
print_error() {
    echo -e "\033[1;31m❌ $1\033[0m"
}

# 检查是否为root用户
if [[ $EUID -ne 0 ]]; then
   print_error "请使用root用户运行此脚本"
   exit 1
fi

print_step "SSL 证书配置准备"

print_info "请确保您已经："
echo "  1. 在阿里云控制台申请了 cursor2.com 的免费SSL证书"
echo "  2. 下载了证书文件 (包含 .pem 和 .key 文件)"
echo "  3. 将证书文件上传到服务器"
echo ""

read -p "请输入SSL证书 .pem 文件的完整路径: " SSL_CERT_PATH
read -p "请输入SSL私钥 .key 文件的完整路径: " SSL_KEY_PATH

# 验证证书文件是否存在
if [[ ! -f "$SSL_CERT_PATH" ]]; then
    print_error "SSL证书文件不存在: $SSL_CERT_PATH"
    exit 1
fi

if [[ ! -f "$SSL_KEY_PATH" ]]; then
    print_error "SSL私钥文件不存在: $SSL_KEY_PATH"
    exit 1
fi

# 创建SSL目录
print_step "创建SSL证书目录"
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl

# 复制证书文件
print_step "复制SSL证书文件"
cp "$SSL_CERT_PATH" /etc/nginx/ssl/cursor2.com.pem
cp "$SSL_KEY_PATH" /etc/nginx/ssl/cursor2.com.key
chmod 600 /etc/nginx/ssl/*
chown root:root /etc/nginx/ssl/*

print_info "✅ SSL证书文件已复制到 /etc/nginx/ssl/"

# 更新Nginx配置以支持HTTPS
print_step "更新Nginx配置以支持HTTPS"

cat > /etc/nginx/conf.d/cursor2.conf << 'EOF'
# cursor2.com - 完整HTTPS配置
server {
    listen 80;
    server_name cursor2.com www.cursor2.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cursor2.com www.cursor2.com;
    
    # SSL 证书配置
    ssl_certificate /etc/nginx/ssl/cursor2.com.pem;
    ssl_certificate_key /etc/nginx/ssl/cursor2.com.key;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    
    # SSL会话缓存
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 文件上传大小限制
    client_max_body_size 50M;
    
    # 静态文件缓存
    location /css/ {
        alias /var/www/competition/public/css/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    location /js/ {
        alias /var/www/competition/public/js/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # API 代理到 Node.js 应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SSE 支持
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # 安全头设置
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 日志配置
    access_log /var/log/nginx/cursor2.access.log;
    error_log /var/log/nginx/cursor2.error.log;
}
EOF

print_info "✅ Nginx HTTPS配置已更新"

# 测试Nginx配置
print_step "测试Nginx配置"
nginx -t
if [[ $? -eq 0 ]]; then
    print_info "✅ Nginx配置测试通过"
else
    print_error "❌ Nginx配置测试失败"
    exit 1
fi

# 重新加载Nginx
print_step "重新加载Nginx"
systemctl reload nginx

# 测试SSL证书
print_step "测试SSL证书"
print_info "等待5秒后测试HTTPS连接..."
sleep 5

if curl -k -s https://cursor2.com > /dev/null 2>&1; then
    print_info "✅ HTTPS连接测试成功"
else
    print_warning "⚠ HTTPS连接测试失败，请检查："
    echo "  1. 域名DNS是否正确解析到此服务器"
    echo "  2. 防火墙443端口是否开放"
    echo "  3. SSL证书是否与域名匹配"
fi

# 完成SSL配置
print_step "SSL配置完成！"
echo ""
print_info "🎉 cursor2.com SSL证书配置成功！"
echo ""
echo "📋 配置信息："
echo "  • SSL证书: /etc/nginx/ssl/cursor2.com.pem"
echo "  • SSL私钥: /etc/nginx/ssl/cursor2.com.key"
echo "  • Nginx配置: /etc/nginx/conf.d/cursor2.conf"
echo ""
echo "🌐 访问地址："
echo "  • HTTP: http://cursor2.com (自动跳转到HTTPS)"
echo "  • HTTPS: https://cursor2.com"
echo ""
echo "🔧 测试命令："
echo "  • 测试HTTP重定向: curl -I http://cursor2.com"
echo "  • 测试HTTPS访问: curl -I https://cursor2.com"
echo "  • 检查SSL证书: openssl s_client -connect cursor2.com:443 -servername cursor2.com"
echo ""
print_info "✅ SSL配置完成！网站现已支持HTTPS访问"