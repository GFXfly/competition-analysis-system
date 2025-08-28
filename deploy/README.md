# cursor2.com 公平竞争审查系统 - 部署指南

## 🚀 一键部署步骤

### 1. 准备工作

**在本地机器上：**
1. 确保您有阿里云服务器的 root 访问权限
2. 准备您的 API 密钥：
   - DeepSeek API 密钥（必需）
   - SiliconFlow API 密钥（可选）

**在阿里云控制台：**
1. 确保域名 `cursor2.com` 已解析到您的服务器 IP
2. 服务器安全组已开放端口：80 (HTTP)、443 (HTTPS)、22 (SSH)

### 2. 上传项目文件到服务器

```bash
# 方法1: 使用 scp 上传整个项目
scp -r /Users/gaofeixiang/Desktop/competition root@your-server-ip:/tmp/

# 方法2: 使用 rsync (推荐)
rsync -avz --progress /Users/gaofeixiang/Desktop/competition/ root@your-server-ip:/tmp/competition/
```

### 3. 连接服务器并运行部署脚本

```bash
# SSH 连接到服务器
ssh root@your-server-ip

# 进入项目目录
cd /tmp/competition/deploy

# 运行一键部署脚本
./deploy.sh
```

部署脚本会提示您输入：
- DeepSeek API 密钥
- SiliconFlow API 密钥（可选）

### 4. 配置 SSL 证书 (推荐)

**步骤 A: 申请阿里云免费 SSL 证书**
1. 登录阿里云控制台
2. 进入 "SSL证书服务"
3. 选择 "免费证书" → "立即购买"
4. 为 `cursor2.com` 申请证书
5. 完成域名验证
6. 下载证书文件（包含 .pem 和 .key 文件）

**步骤 B: 上传并配置证书**
```bash
# 上传证书文件到服务器
scp cursor2.com.pem root@your-server-ip:/tmp/
scp cursor2.com.key root@your-server-ip:/tmp/

# 在服务器上运行SSL配置脚本
cd /tmp/competition/deploy
./configure-ssl.sh
```

### 5. 验证部署

**检查服务状态：**
```bash
# 检查 PM2 应用状态
pm2 status

# 检查应用日志
pm2 logs fair-competition-review

# 检查 Nginx 状态
systemctl status nginx

# 测试应用响应
curl http://localhost:3000
```

**浏览器访问：**
- HTTP: http://cursor2.com
- HTTPS: https://cursor2.com (如已配置SSL)

## 🔧 管理命令

### PM2 进程管理
```bash
# 查看所有应用状态
pm2 status

# 重启应用
pm2 restart fair-competition-review

# 重新加载应用 (零停机时间)
pm2 reload fair-competition-review

# 查看实时日志
pm2 logs fair-competition-review

# 查看监控面板
pm2 monit
```

### Nginx 管理
```bash
# 测试配置文件
nginx -t

# 重新加载配置
systemctl reload nginx

# 重启 Nginx
systemctl restart nginx

# 查看访问日志
tail -f /var/log/nginx/cursor2.access.log

# 查看错误日志
tail -f /var/log/nginx/cursor2.error.log
```

### 应用管理
```bash
# 查看应用目录
ls -la /var/www/competition

# 编辑环境配置
vi /var/www/competition/.env

# 查看应用日志
tail -f /var/log/pm2/competition-combined.log
```

## 📋 重要文件位置

| 文件/目录 | 路径 | 说明 |
|----------|------|------|
| 应用根目录 | `/var/www/competition` | 主应用文件 |
| 环境配置 | `/var/www/competition/.env` | 环境变量配置 |
| PM2 配置 | `/var/www/competition/ecosystem.config.js` | PM2 进程配置 |
| Nginx 配置 | `/etc/nginx/conf.d/cursor2.conf` | Nginx 虚拟主机配置 |
| SSL 证书 | `/etc/nginx/ssl/` | SSL 证书目录 |
| 应用日志 | `/var/log/pm2/` | PM2 日志目录 |
| Nginx 日志 | `/var/log/nginx/` | Nginx 日志目录 |
| 上传文件 | `/var/www/competition/uploads` | 用户上传文件目录 |

## 🐛 故障排除

### 常见问题

**1. 应用无法启动**
```bash
# 检查错误日志
pm2 logs fair-competition-review --err

# 检查环境变量
cat /var/www/competition/.env

# 手动启动应用测试
cd /var/www/competition
node server_new.js
```

**2. Nginx 502 错误**
```bash
# 检查应用是否在运行
pm2 status

# 检查端口占用
netstat -tlnp | grep :3000

# 检查 Nginx 错误日志
tail -f /var/log/nginx/cursor2.error.log
```

**3. SSL 证书问题**
```bash
# 检查证书文件
ls -la /etc/nginx/ssl/

# 测试证书有效性
openssl x509 -in /etc/nginx/ssl/cursor2.com.pem -text -noout

# 测试SSL连接
openssl s_client -connect cursor2.com:443 -servername cursor2.com
```

**4. 文件上传失败**
```bash
# 检查上传目录权限
ls -la /var/www/competition/uploads

# 修正权限
chown -R root:root /var/www/competition/uploads
chmod 755 /var/www/competition/uploads
```

### 性能优化

**1. 增加PM2实例数**
```bash
# 编辑 ecosystem.config.js
vi /var/www/competition/ecosystem.config.js

# 将 instances 改为 CPU 核心数
# instances: 4,  // 4核服务器

# 重新加载配置
pm2 reload ecosystem.config.js
```

**2. 优化 Nginx 配置**
```bash
# 编辑主配置文件
vi /etc/nginx/nginx.conf

# 在 http 块中添加：
# gzip on;
# gzip_types text/plain application/javascript text/css application/json;
# keepalive_timeout 65;
```

## 📞 技术支持

如遇到问题，请检查：
1. **系统日志**: `journalctl -u nginx -f`
2. **应用日志**: `pm2 logs fair-competition-review`
3. **防火墙状态**: `firewall-cmd --list-all`
4. **端口监听**: `netstat -tlnp`

---

🎉 **部署完成后，您的公平竞争审查系统将在 cursor2.com 上正常运行！**