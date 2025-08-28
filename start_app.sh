#!/bin/bash

# 🚀 应用启动脚本 - cursor2.com
# 增强AI分析公平竞争审查系统启动管理

set -e

# 配置变量
PROJECT_NAME="competition-analysis"
PROJECT_DIR="/var/www/$PROJECT_NAME"
LOG_DIR="/var/log/$PROJECT_NAME"
NODE_ENV="${NODE_ENV:-production}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印函数
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

echo "🚀 启动增强AI分析系统 - cursor2.com"

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    print_error "请以root权限运行此脚本: sudo $0"
    exit 1
fi

# 切换到项目目录
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "项目目录不存在: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"
print_success "切换到项目目录: $PROJECT_DIR"

# 检查环境变量文件
print_step "检查环境配置..."
if [ ! -f ".env" ]; then
    print_warning "未找到.env文件，尝试使用.env.production"
    if [ -f ".env.production" ]; then
        cp .env.production .env
        print_success "已复制.env.production到.env"
    else
        print_error "未找到环境变量文件，请创建.env文件"
        exit 1
    fi
fi

# 检查必需的环境变量
check_env_var() {
    local var_name="$1"
    if ! grep -q "^${var_name}=" .env; then
        print_warning "环境变量 $var_name 未设置，请检查.env文件"
    fi
}

check_env_var "NODE_ENV"
check_env_var "PORT"
check_env_var "DEEPSEEK_API_KEY"

# 创建日志目录
print_step "准备日志目录..."
mkdir -p "$LOG_DIR"
chown -R www-data:www-data "$LOG_DIR"
print_success "日志目录准备完成: $LOG_DIR"

# 检查Node.js和npm
print_step "检查运行环境..."
if ! command -v node &> /dev/null; then
    print_error "Node.js未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm未安装"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js: $NODE_VERSION, npm: $NPM_VERSION"

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2未安装，正在安装..."
    npm install -g pm2
    print_success "PM2安装完成"
fi

PM2_VERSION=$(pm2 --version)
print_success "PM2版本: $PM2_VERSION"

# 检查依赖
print_step "检查项目依赖..."
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    print_warning "依赖不完整，正在安装..."
    npm ci --only=production
    print_success "依赖安装完成"
else
    print_success "依赖检查通过"
fi

# 停止现有进程（如果存在）
print_step "检查现有进程..."
if pm2 show $PROJECT_NAME > /dev/null 2>&1; then
    print_warning "发现现有进程，正在停止..."
    pm2 stop $PROJECT_NAME
    pm2 delete $PROJECT_NAME
    print_success "现有进程已停止"
else
    print_success "无现有进程"
fi

# 验证主文件存在
if [ ! -f "server.js" ] && [ ! -f "app.js" ] && [ ! -f "index.js" ]; then
    print_error "未找到应用主文件 (server.js, app.js, 或 index.js)"
    exit 1
fi

# 设置文件权限
print_step "设置文件权限..."
chown -R www-data:www-data "$PROJECT_DIR"
chmod -R 755 "$PROJECT_DIR"
chmod 600 "$PROJECT_DIR/.env"
print_success "文件权限设置完成"

# 启动应用
print_step "启动应用..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
    print_success "使用PM2配置文件启动成功"
else
    # fallback到直接启动
    pm2 start server.js --name $PROJECT_NAME --instances 2 --env production
    print_success "使用默认配置启动成功"
fi

# 保存PM2配置
pm2 save
pm2 startup

print_success "PM2配置已保存并设置开机启动"

# 等待应用启动
print_step "等待应用启动..."
sleep 5

# 检查应用状态
print_step "检查应用状态..."
if pm2 show $PROJECT_NAME | grep -q "online"; then
    print_success "应用运行正常"
else
    print_error "应用启动失败，请检查日志"
    pm2 logs $PROJECT_NAME --lines 20
    exit 1
fi

# 显示应用信息
echo
echo "🎉 应用启动成功！"
echo
echo "📋 应用信息："
echo "   项目名称: $PROJECT_NAME"
echo "   运行环境: $NODE_ENV"
echo "   项目目录: $PROJECT_DIR"
echo "   日志目录: $LOG_DIR"
echo
echo "🌐 访问地址："
echo "   HTTPS: https://cursor2.com"
echo "   HTTP: http://cursor2.com (自动重定向到HTTPS)"
echo
echo "📊 管理命令："
echo "   查看状态: pm2 status"
echo "   查看日志: pm2 logs $PROJECT_NAME"
echo "   重启应用: pm2 restart $PROJECT_NAME"
echo "   停止应用: pm2 stop $PROJECT_NAME"
echo "   监控面板: pm2 monit"
echo
echo "📝 日志文件："
echo "   错误日志: $LOG_DIR/error.log"
echo "   输出日志: $LOG_DIR/out.log" 
echo "   综合日志: $LOG_DIR/combined.log"
echo

# 显示实时状态
print_success "当前PM2状态："
pm2 status

print_success "应用启动脚本执行完成！"