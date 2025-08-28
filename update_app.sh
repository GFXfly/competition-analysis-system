#!/bin/bash

# 🔄 一键更新脚本 - cursor2.com
# 用于快速更新增强AI分析公平竞争审查系统

set -e

# 配置变量
PROJECT_NAME="competition-analysis"
LOCAL_DIR=$(pwd)
SERVER_USER="root"
SERVER_HOST="cursor2.com"
REMOTE_DIR="/var/www/$PROJECT_NAME"
BACKUP_DIR="/var/backups/$PROJECT_NAME"

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

echo "🔄 开始一键更新系统到 cursor2.com..."

# 检查本地Git状态
print_step "检查本地更改..."

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
        if [ -z "$commit_message" ]; then
            commit_message="Quick update - $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        git commit -m "$commit_message"
        print_success "更改已提交"
    else
        read -p "是否继续更新？未提交的更改将被包含在更新中 (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "更新已取消"
            exit 1
        fi
    fi
fi

# 获取当前提交信息
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)

print_success "当前分支: $CURRENT_BRANCH"
print_success "当前提交: ${CURRENT_COMMIT:0:8}"

# 创建更新包
print_step "创建更新包..."

TEMP_DIR=$(mktemp -d)
UPDATE_PACKAGE="update-$(date +%Y%m%d_%H%M%S).tar.gz"

# 复制文件（排除不必要的文件）
rsync -av --progress \
    --exclude 'node_modules/' \
    --exclude '.git/' \
    --exclude '*.log' \
    --exclude '*.tar.gz' \
    --exclude 'logs/' \
    --exclude '.env' \
    --exclude '.DS_Store' \
    --exclude 'test_*.js' \
    --exclude 'debug_*.js' \
    ./ "$TEMP_DIR/"

# 创建更新信息文件
cat > "$TEMP_DIR/UPDATE_INFO.txt" << EOF
更新信息
========
更新时间: $(date '+%Y-%m-%d %H:%M:%S')
分支: $CURRENT_BRANCH
提交ID: $CURRENT_COMMIT
提交信息: $COMMIT_MESSAGE
更新包: $UPDATE_PACKAGE
EOF

# 打包
cd "$TEMP_DIR"
tar -czf "$UPDATE_PACKAGE" .
mv "$UPDATE_PACKAGE" "/tmp/$UPDATE_PACKAGE"
cd - > /dev/null

print_success "更新包创建完成: $UPDATE_PACKAGE"

# 上传更新包
print_step "上传更新包到服务器..."

scp "/tmp/$UPDATE_PACKAGE" "$SERVER_USER@$SERVER_HOST:/tmp/"

print_success "更新包上传完成"

# 在服务器上执行更新
print_step "在服务器上执行更新..."

ssh "$SERVER_USER@$SERVER_HOST" << EOF
set -e

echo "🔄 开始服务器端更新..."

# 服务器端函数定义
update_step() {
    echo "📝 \$1"
}

update_success() {
    echo "✅ \$1"
}

update_error() {
    echo "❌ \$1"
    exit 1
}

# 检查应用是否在运行
update_step "检查应用状态..."
if pm2 show $PROJECT_NAME > /dev/null 2>&1; then
    APP_RUNNING=true
    update_success "应用当前正在运行"
else
    APP_RUNNING=false
    update_success "应用未运行"
fi

# 创建备份
update_step "创建当前版本备份..."
if [ -d "$REMOTE_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup_\$(date +%Y%m%d_%H%M%S)"
    cp -r "$REMOTE_DIR" "$BACKUP_DIR/\$BACKUP_NAME"
    update_success "备份完成: \$BACKUP_NAME"
fi

# 解压新版本到临时目录
update_step "解压更新包..."
TEMP_UPDATE_DIR="\$(mktemp -d)"
cd "\$TEMP_UPDATE_DIR"
tar -xzf "/tmp/$UPDATE_PACKAGE"
update_success "更新包解压完成"

# 保留现有的环境变量文件
if [ -f "$REMOTE_DIR/.env" ]; then
    cp "$REMOTE_DIR/.env" "\$TEMP_UPDATE_DIR/.env"
    update_success "环境变量文件已保留"
fi

# 停止应用（如果正在运行）
if [ "\$APP_RUNNING" = true ]; then
    update_step "停止应用..."
    pm2 stop $PROJECT_NAME || true
    update_success "应用已停止"
fi

# 更新文件
update_step "更新应用文件..."
mkdir -p "$REMOTE_DIR"
rsync -av --delete "\$TEMP_UPDATE_DIR/" "$REMOTE_DIR/"
update_success "文件更新完成"

# 安装/更新依赖
update_step "更新项目依赖..."
cd "$REMOTE_DIR"
npm ci --only=production
update_success "依赖更新完成"

# 设置权限
chown -R www-data:www-data "$REMOTE_DIR"
chmod -R 755 "$REMOTE_DIR"
chmod 600 "$REMOTE_DIR/.env" 2>/dev/null || true

# 重启应用
if [ "\$APP_RUNNING" = true ]; then
    update_step "重启应用..."
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start $PROJECT_NAME
    fi
    
    # 等待应用启动
    sleep 5
    
    # 检查应用状态
    if pm2 show $PROJECT_NAME | grep -q "online"; then
        update_success "应用重启成功"
    else
        update_error "应用重启失败"
    fi
else
    update_success "应用已更新，使用 ./start_app.sh 启动"
fi

# 清理临时文件
rm -rf "\$TEMP_UPDATE_DIR"
rm -f "/tmp/$UPDATE_PACKAGE"

echo "🎉 服务器端更新完成！"

# 显示更新信息
if [ -f "$REMOTE_DIR/UPDATE_INFO.txt" ]; then
    echo
    echo "📋 更新信息："
    cat "$REMOTE_DIR/UPDATE_INFO.txt"
fi

echo
echo "📊 当前应用状态："
pm2 status
EOF

# 清理本地临时文件
rm -rf "$TEMP_DIR"
rm -f "/tmp/$UPDATE_PACKAGE"

print_success "本地临时文件清理完成"

echo
echo "🎉 更新完成！"
echo
echo "📋 更新摘要："
echo "   提交ID: ${CURRENT_COMMIT:0:8}"
echo "   提交信息: $COMMIT_MESSAGE"
echo "   服务器: $SERVER_HOST"
echo "   项目路径: $REMOTE_DIR"
echo
echo "🌐 访问地址："
echo "   https://cursor2.com"
echo
echo "📊 管理命令："
echo "   查看状态: ssh $SERVER_USER@$SERVER_HOST 'pm2 status'"
echo "   查看日志: ssh $SERVER_USER@$SERVER_HOST 'pm2 logs $PROJECT_NAME'"
echo "   服务器监控: ssh $SERVER_USER@$SERVER_HOST 'pm2 monit'"
echo

print_success "一键更新脚本执行完成！"