#!/bin/bash

# 🚀 阿里云服务器部署脚本 - cursor2.com
# 用于部署增强AI分析公平竞争审查系统v2.0

set -e  # 遇到错误立即退出

# 配置变量
SERVER_USER="root"  # 改为你的用户名
SERVER_HOST="cursor2.com"  # 你的域名
PROJECT_NAME="competition-analysis"
REMOTE_DIR="/var/www/$PROJECT_NAME"
BACKUP_DIR="/var/backups/$PROJECT_NAME"
NODE_VERSION="18"  # Node.js版本

echo "🚀 开始部署增强AI分析系统到 cursor2.com..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_step() {
    echo -e "${BLUE}📝 Step: $1${NC}"
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

# 检查本地环境
print_step "检查本地环境..."

# 检查是否在Git仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "当前目录不是Git仓库！"
    exit 1
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    print_warning "检测到未提交的更改："
    git status --porcelain
    read -p "是否要提交这些更改？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "请输入提交信息: " commit_message
        git commit -m "$commit_message"
    else
        print_error "请先提交更改后再部署！"
        exit 1
    fi
fi

print_success "本地环境检查完成"

# 创建部署包
print_step "创建部署包..."

# 创建临时目录
TEMP_DIR=$(mktemp -d)
# 动态生成包名，避免硬编码日期
PACKAGE_NAME="competition-deploy-$(date +%Y%m%d_%H%M%S).tar.gz"
echo "📦 生成部署包名称: $PACKAGE_NAME"

# 复制必要文件（排除开发文件）
rsync -av --progress \
    --exclude 'node_modules/' \
    --exclude '.git/' \
    --exclude '*.log' \
    --exclude 'test_*.js' \
    --exclude 'debug_*.js' \
    --exclude '*.tar.gz' \
    --exclude 'logs/' \
    --exclude '.env' \
    --exclude 'enhanced_ai_test_report.json' \
    ./ "$TEMP_DIR/"

# 创建生产环境配置
cat > "$TEMP_DIR/.env.production" << EOF
# 生产环境配置 - cursor2.com
NODE_ENV=production
PORT=3000

# 替换为你的实际API密钥
DEEPSEEK_API_KEY=your_deepseek_api_key
SILICONFLOW_API_KEY=your_siliconflow_api_key
OPENAI_API_KEY=your_openai_api_key

# AI服务商选择
AI_PROVIDER=DEEPSEEK

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/competition-analysis/app.log

# 安全配置
SESSION_SECRET=your_random_session_secret_here
CORS_ORIGIN=https://cursor2.com
EOF

# 打包
cd "$TEMP_DIR"
tar -czf "$PACKAGE_NAME" .
mv "$PACKAGE_NAME" "/tmp/$PACKAGE_NAME"
cd - > /dev/null

print_success "部署包创建完成: $PACKAGE_NAME"

# 上传到服务器
print_step "上传部署包到服务器..."

scp "/tmp/$PACKAGE_NAME" "$SERVER_USER@$SERVER_HOST:/tmp/"

print_success "部署包上传完成"

# 在服务器上执行部署
print_step "在服务器上执行部署脚本..."

ssh "$SERVER_USER@$SERVER_HOST" << EOF
set -e

# 服务器端部署函数
deploy_step() {
    echo "📝 Step: \$1"
}

deploy_success() {
    echo "✅ \$1"
}

deploy_error() {
    echo "❌ \$1"
    exit 1
}

echo "🚀 服务器端部署开始..."

# 检查并安装必要软件
deploy_step "检查并安装必要软件..."

# 更新系统
apt-get update -y

# 安装Node.js (如果没有安装)
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    apt-get install -y nodejs
    deploy_success "Node.js 已安装"
else
    deploy_success "Node.js 已存在"
fi

# 安装PM2 (如果没有安装)
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    deploy_success "PM2 已安装"
else
    deploy_success "PM2 已存在"
fi

# 安装Nginx (如果没有安装)
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
    deploy_success "Nginx 已安装"
else
    deploy_success "Nginx 已存在"
fi

# 创建项目目录
deploy_step "准备项目目录..."

# 备份现有版本
if [ -d "$REMOTE_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup_\$(date +%Y%m%d_%H%M%S)"
    cp -r "$REMOTE_DIR" "$BACKUP_DIR/\$BACKUP_NAME"
    deploy_success "现有版本已备份: \$BACKUP_NAME"
fi

# 创建目录
mkdir -p "$REMOTE_DIR"
mkdir -p "/var/log/competition-analysis"

# 解压新版本
deploy_step "解压新版本..."
cd "$REMOTE_DIR"
tar -xzf "/tmp/$PACKAGE_NAME" --strip-components=0
rm -f "/tmp/$PACKAGE_NAME"

deploy_success "新版本解压完成"

# 安装依赖
deploy_step "安装项目依赖..."
cd "$REMOTE_DIR"
npm ci --only=production

deploy_success "依赖安装完成"

# 设置环境变量
deploy_step "配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.production .env
    deploy_success "环境变量配置完成，请手动编辑 .env 文件设置API密钥"
else
    deploy_success "环境变量文件已存在，跳过覆盖"
fi

# 设置文件权限
chown -R www-data:www-data "$REMOTE_DIR"
chmod -R 755 "$REMOTE_DIR"
chmod 600 "$REMOTE_DIR/.env"

deploy_success "文件权限设置完成"

echo "🎉 服务器端部署完成！"
EOF

print_success "服务器端部署完成"

# 清理临时文件
rm -rf "$TEMP_DIR"
rm -f "/tmp/$PACKAGE_NAME"

print_success "临时文件清理完成"

echo
echo "🎉 部署完成！接下来需要："
echo "1. 登录服务器配置环境变量: ssh $SERVER_USER@$SERVER_HOST"
echo "2. 编辑 $REMOTE_DIR/.env 文件设置API密钥"
echo "3. 配置Nginx (运行 ./setup_nginx.sh)"
echo "4. 启动应用 (运行 ./start_app.sh)"
echo
echo "部署路径: $REMOTE_DIR"
echo "日志路径: /var/log/competition-analysis/"
echo
print_success "部署脚本执行完成！"