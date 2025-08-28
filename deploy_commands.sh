#!/bin/bash

# 阿里云服务器部署脚本
# 请在服务器上执行以下命令

echo "=== 开始部署 Competition Analysis System ==="

# 1. 备份旧版本（如果存在）
if [ -d "/var/www/competition" ]; then
    echo "备份旧版本..."
    sudo cp -r /var/www/competition /var/www/competition_backup_$(date +%Y%m%d_%H%M%S)
    echo "旧版本已备份"
fi

# 2. 进入部署目录
cd /var/www

# 3. 删除旧版本（如果存在）
if [ -d "competition" ]; then
    echo "删除旧版本..."
    sudo rm -rf competition
fi

# 4. 从GitHub克隆最新代码
echo "从GitHub克隆最新代码..."
sudo git clone https://github.com/GFXfly/competition-analysis-system.git competition

# 5. 进入项目目录
cd competition

# 6. 安装依赖
echo "安装Node.js依赖..."
sudo npm install

# 7. 设置权限
echo "设置目录权限..."
sudo chown -R www-data:www-data /var/www/competition
sudo chmod -R 755 /var/www/competition

# 8. 创建logs目录
sudo mkdir -p logs
sudo mkdir -p /var/log/competition
sudo chown www-data:www-data logs
sudo chown www-data:www-data /var/log/competition
sudo chmod 755 logs
sudo chmod 755 /var/log/competition

# 9. 复制生产环境配置
if [ -f "deploy/production.env" ]; then
    echo "复制生产环境配置..."
    sudo cp deploy/production.env .env
fi

# 10. 停止旧的PM2进程（如果存在）
echo "停止旧的PM2进程..."
sudo pm2 stop all 2>/dev/null || true
sudo pm2 delete all 2>/dev/null || true

# 11. 启动新的应用
echo "启动应用..."
sudo pm2 start ecosystem.config.js --env production

# 12. 保存PM2配置
sudo pm2 save
sudo pm2 startup

# 13. 重启Nginx
echo "重启Nginx..."
sudo systemctl restart nginx

echo "=== 部署完成 ==="
echo "请检查应用状态: sudo pm2 status"
echo "查看应用日志: sudo pm2 logs"
echo "访问: http://120.26.237.13"