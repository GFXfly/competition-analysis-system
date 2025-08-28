#!/bin/bash
# 一键部署脚本 - cursor2.com 公平竞争审查系统
# 使用方法: ./deploy.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 cursor2.com 公平竞争审查系统..."

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

# 检查必要参数
read -p "请输入您的DeepSeek API密钥: " DEEPSEEK_KEY
read -p "请输入您的SiliconFlow API密钥 (可选，直接回车跳过): " SILICONFLOW_KEY

if [[ -z "$DEEPSEEK_KEY" ]]; then
    print_error "DeepSeek API密钥不能为空"
    exit 1
fi

# 1. 更新系统并安装依赖
print_step "更新系统和安装依赖"
yum update -y
yum groupinstall -y "Development Tools"
yum install -y git curl wget vim firewalld

# 2. 安装 Node.js 18+
print_step "安装 Node.js 18+"
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs
print_info "Node.js版本: $(node --version)"
print_info "NPM版本: $(npm --version)"

# 3. 安装 PM2
print_step "安装 PM2 进程管理器"
npm install -g pm2

# 4. 安装和配置 Nginx
print_step "安装和配置 Nginx"
yum install -y nginx
systemctl start nginx
systemctl enable nginx

# 5. 配置防火墙
print_step "配置防火墙"
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload

# 6. 创建项目目录
print_step "创建项目目录"
mkdir -p /var/www/competition
mkdir -p /var/log/pm2
chown -R root:root /var/www/competition

# 7. 复制项目文件 (假设当前目录是项目根目录)
print_step "复制项目文件"
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_DIR=$(dirname "$SCRIPT_DIR")

print_info "从 $PROJECT_DIR 复制文件到 /var/www/competition"

# 复制主要文件
cp -r "$PROJECT_DIR"/* /var/www/competition/
# 确保不复制部署文件夹到生产环境
rm -rf /var/www/competition/deploy

# 8. 安装项目依赖
print_step "安装项目依赖"
cd /var/www/competition
npm install --production

# 9. 创建环境变量文件
print_step "配置环境变量"
cat > /var/www/competition/.env << EOF
# 生产环境配置文件
NODE_ENV=production
PORT=3000

# DeepSeek API配置
DEEPSEEK_API_KEY=$DEEPSEEK_KEY

# 硅基流动API配置（备用）
SILICONFLOW_API_KEY=${SILICONFLOW_KEY:-}

# 默认AI服务商
AI_PROVIDER=DEEPSEEK

# 日志级别
LOG_LEVEL=info

# 安全设置
SESSION_SECRET=$(openssl rand -hex 32)

# 文件上传配置
MAX_FILE_SIZE=50MB
UPLOAD_PATH=/var/www/competition/uploads

# 监控和统计
ENABLE_METRICS=true
METRICS_PORT=9090
EOF

print_info "✅ 环境配置文件已创建"

# 10. 创建上传目录
print_step "创建上传目录"
mkdir -p /var/www/competition/uploads
chown -R root:root /var/www/competition/uploads
chmod 755 /var/www/competition/uploads

# 11. 配置 PM2
print_step "配置 PM2 进程管理"
cat > /var/www/competition/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'fair-competition-review',
    script: 'server_new.js',
    cwd: '/var/www/competition',
    instances: 2,
    exec_mode: 'cluster',
    
    // 环境变量 - 从 .env 文件加载
    env_file: '/var/www/competition/.env',
    
    // 日志配置
    log_file: '/var/log/pm2/competition-combined.log',
    out_file: '/var/log/pm2/competition-out.log',
    error_file: '/var/log/pm2/competition-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // 自动重启配置
    watch: false,
    ignore_watch: ['node_modules', 'logs', '*.log'],
    max_memory_restart: '1G',
    
    // 重启策略
    min_uptime: '10s',
    max_restarts: 10,
    
    // 其他配置
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
EOF

# 12. 配置 Nginx
print_step "配置 Nginx 反向代理"
cat > /etc/nginx/conf.d/cursor2.conf << EOF
# 临时 HTTP 配置 - cursor2.com
server {
    listen 80;
    server_name cursor2.com www.cursor2.com;
    
    # 文件上传大小限制
    client_max_body_size 50M;
    
    # 静态文件
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
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
    
    # 日志配置
    access_log /var/log/nginx/cursor2.access.log;
    error_log /var/log/nginx/cursor2.error.log;
}
EOF

# 13. 测试 Nginx 配置
print_step "测试 Nginx 配置"
nginx -t
if [[ $? -eq 0 ]]; then
    print_info "✅ Nginx 配置测试通过"
    systemctl reload nginx
else
    print_error "❌ Nginx 配置测试失败"
    exit 1
fi

# 14. 启动应用
print_step "启动应用程序"
cd /var/www/competition
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 15. 测试应用
print_step "测试应用程序"
sleep 5
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_info "✅ 应用程序启动成功"
else
    print_warning "⚠ 应用程序可能未正常启动，请检查日志"
    pm2 logs --lines 20
fi

# 完成部署
print_step "部署完成！"
echo ""
print_info "🎉 cursor2.com 公平竞争审查系统部署成功！"
echo ""
echo "📋 重要信息："
echo "  • 应用端口: 3000"
echo "  • Nginx 配置: /etc/nginx/conf.d/cursor2.conf"
echo "  • 应用目录: /var/www/competition" 
echo "  • 日志目录: /var/log/pm2/"
echo "  • 环境配置: /var/www/competition/.env"
echo ""
echo "🔧 常用命令："
echo "  • 查看应用状态: pm2 status"
echo "  • 查看日志: pm2 logs"
echo "  • 重启应用: pm2 restart fair-competition-review"
echo "  • 重新加载应用: pm2 reload fair-competition-review"
echo ""
echo "🌐 访问地址："
echo "  • HTTP: http://cursor2.com"
echo ""
print_warning "⚠ SSL 证书配置："
echo "  目前只配置了 HTTP 访问"
echo "  要启用 HTTPS，请："
echo "  1. 申请阿里云免费 SSL 证书"
echo "  2. 运行: ./configure-ssl.sh"
echo ""
print_info "✅ 部署完成！应用已在后台运行"