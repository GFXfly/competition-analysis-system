#!/bin/bash
# 阿里云服务器环境初始化脚本

echo "🚀 开始初始化阿里云服务器环境..."

# 更新系统
sudo yum update -y

# 安装必要软件
sudo yum groupinstall -y "Development Tools"
sudo yum install -y git curl wget vim

# 安装 Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
echo "Node.js版本: $(node --version)"
echo "NPM版本: $(npm --version)"

# 安装 PM2 进程管理器
sudo npm install -g pm2

# 安装 Nginx
sudo yum install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx

# 配置防火墙
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

echo "✅ 服务器环境初始化完成！"