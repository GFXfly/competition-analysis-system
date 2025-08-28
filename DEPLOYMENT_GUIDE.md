# 🚀 增强AI分析公平竞争审查系统 - 部署指南

## 概述

本指南将帮助您将增强AI分析公平竞争审查系统部署到阿里云服务器（cursor2.com），并设置便捷的更新机制。

## 📋 部署前准备

### 1. 服务器要求
- **操作系统**: Ubuntu 18.04+ / CentOS 7+
- **内存**: 最少 2GB RAM (推荐 4GB+)
- **存储**: 最少 20GB 可用空间
- **网络**: 公网IP，域名已解析到服务器

### 2. 本地环境要求
- Git
- SSH客户端
- 服务器SSH访问权限

### 3. 环境变量配置
部署前需要准备以下API密钥：
- `DEEPSEEK_API_KEY`: DeepSeek API密钥
- `SILICONFLOW_API_KEY`: Silicon Flow API密钥（可选）
- `OPENAI_API_KEY`: OpenAI API密钥（可选）

## 🛠️ 一键部署流程

### 第一步：初始部署

1. **在本地执行部署脚本**
   ```bash
   # 进入项目目录
   cd /path/to/competition
   
   # 执行部署脚本
   ./deploy_to_server.sh
   ```

2. **登录服务器配置环境变量**
   ```bash
   # SSH登录服务器
   ssh root@cursor2.com
   
   # 编辑环境变量文件
   cd /var/www/competition-analysis
   nano .env
   
   # 设置你的API密钥
   DEEPSEEK_API_KEY=your_actual_deepseek_key_here
   SILICONFLOW_API_KEY=your_actual_siliconflow_key_here
   OPENAI_API_KEY=your_actual_openai_key_here
   ```

3. **配置Nginx反向代理**
   ```bash
   # 在服务器上执行
   ./setup_nginx.sh
   ```

4. **启动应用**
   ```bash
   # 在服务器上执行
   ./start_app.sh
   ```

### 第二步：SSL证书配置（推荐）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取Let's Encrypt证书
sudo certbot --nginx -d cursor2.com -d www.cursor2.com
```

## 🔄 日常更新流程

### 一键更新
```bash
# 在本地项目目录执行
./update_app.sh
```

此脚本会自动：
- 检查本地代码更改
- 创建更新包
- 上传到服务器
- 备份现有版本
- 更新应用代码
- 重启服务

### 手动更新步骤
如果需要手动更新：

```bash
# 1. 本地提交代码
git add .
git commit -m "更新说明"

# 2. SSH到服务器
ssh root@cursor2.com

# 3. 停止应用
pm2 stop competition-analysis

# 4. 备份当前版本
cp -r /var/www/competition-analysis /var/backups/competition-analysis/backup_$(date +%Y%m%d_%H%M%S)

# 5. 更新代码（如果使用Git）
cd /var/www/competition-analysis
git pull origin main

# 6. 更新依赖
npm ci --only=production

# 7. 重启应用
pm2 start ecosystem.config.js --env production
```

## 📂 文件结构说明

```
competition-analysis/
├── config/                     # 配置文件
│   ├── legalFramework.js       # 法律框架配置
│   ├── optimizedAiParameters.js # AI参数优化
│   └── strictAuditConfig.js    # 严格审查配置
├── services/                   # 服务层
│   ├── enhancedSemanticAnalysis.js    # 增强语义分析
│   ├── deepSemanticAnalyzer.js        # 深度语义分析
│   ├── dynamicLegalLoader.js          # 动态法条加载
│   └── enhancedCompetitionAnalysisService.js # 综合分析服务
├── data/                       # 数据文件
│   └── realCaseDatabase.js     # 真实案例数据库
├── ecosystem.config.js         # PM2配置文件
├── deploy_to_server.sh         # 部署脚本
├── setup_nginx.sh              # Nginx配置脚本
├── start_app.sh                # 应用启动脚本
├── update_app.sh               # 一键更新脚本
└── .env                        # 环境变量文件
```

## 🔧 管理命令

### PM2进程管理
```bash
# 查看应用状态
pm2 status

# 查看实时日志
pm2 logs competition-analysis

# 重启应用
pm2 restart competition-analysis

# 停止应用
pm2 stop competition-analysis

# 监控面板
pm2 monit
```

### Nginx管理
```bash
# 测试配置
nginx -t

# 重新加载配置
systemctl reload nginx

# 重启Nginx
systemctl restart nginx

# 查看状态
systemctl status nginx
```

### 日志查看
```bash
# 应用日志
tail -f /var/log/competition-analysis/combined.log

# Nginx访问日志
tail -f /var/log/nginx/competition-analysis.access.log

# Nginx错误日志
tail -f /var/log/nginx/competition-analysis.error.log
```

## 🔒 安全配置

### 1. 防火墙配置
```bash
# 启用UFW防火墙
ufw enable

# 允许SSH
ufw allow ssh

# 允许HTTP和HTTPS
ufw allow 'Nginx Full'

# 查看状态
ufw status
```

### 2. SSL证书自动续期
```bash
# 测试自动续期
certbot renew --dry-run

# 设置自动续期cron任务
crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. 环境变量保护
确保 `.env` 文件权限设置为 600：
```bash
chmod 600 /var/www/competition-analysis/.env
```

## 🐛 故障排除

### 应用无法启动
1. 检查日志：`pm2 logs competition-analysis`
2. 检查环境变量：`cat .env`
3. 检查端口占用：`netstat -tlnp | grep :3000`
4. 检查依赖：`npm ls`

### Nginx配置错误
1. 测试配置：`nginx -t`
2. 查看错误日志：`tail -f /var/log/nginx/error.log`
3. 检查域名解析：`nslookup cursor2.com`

### SSL证书问题
1. 检查证书状态：`certbot certificates`
2. 手动续期：`certbot renew`
3. 检查证书文件权限

### 性能问题
1. 查看系统资源：`top`, `htop`
2. 查看内存使用：`free -h`
3. 查看磁盘空间：`df -h`
4. 检查PM2监控：`pm2 monit`

## 📞 技术支持

### 日志文件位置
- **应用日志**: `/var/log/competition-analysis/`
- **Nginx日志**: `/var/log/nginx/`
- **PM2日志**: `~/.pm2/logs/`

### 配置文件位置
- **Nginx配置**: `/etc/nginx/sites-available/competition-analysis`
- **PM2配置**: `/var/www/competition-analysis/ecosystem.config.js`
- **应用配置**: `/var/www/competition-analysis/.env`

### 常用目录
- **项目目录**: `/var/www/competition-analysis`
- **备份目录**: `/var/backups/competition-analysis`
- **SSL证书**: `/etc/ssl/certs/`

## 🎯 性能优化建议

1. **启用Gzip压缩**: 已在Nginx配置中启用
2. **静态文件缓存**: 已配置1年缓存期
3. **PM2集群模式**: 默认启用2个实例
4. **内存监控**: 设置1GB内存限制自动重启
5. **定期备份**: 建议设置定时任务备份数据

## 📈 监控和维护

### 定期维护任务
1. **每日检查**：应用状态、错误日志
2. **每周检查**：磁盘空间、内存使用
3. **每月检查**：SSL证书有效期、安全更新
4. **备份策略**：代码备份、数据备份、配置备份

### 监控指标
- 应用响应时间
- 错误率
- CPU/内存使用率
- 磁盘I/O
- 网络流量

---

## ✅ 部署检查清单

- [ ] 服务器环境准备完成
- [ ] 域名解析配置正确
- [ ] SSH密钥配置完成
- [ ] API密钥准备完成
- [ ] 执行初始部署脚本
- [ ] 配置环境变量
- [ ] 配置Nginx代理
- [ ] 启动应用服务
- [ ] 配置SSL证书
- [ ] 测试应用访问
- [ ] 设置监控和备份

🎉 **恭喜！您的增强AI分析公平竞争审查系统已成功部署到 cursor2.com**