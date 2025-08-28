# 🚀 cursor2.com 公平竞争审查系统部署指令

## ✅ 问题已修复
- **AI超时问题**：已实现智能回退机制（Reasoner → Chat模型）
- **系统稳定性**：大幅提升，确保审查功能始终可用
- **审查质量**：保持高标准（优先使用高质量模型，必要时回退）

---

## 📦 第一步：准备部署包

部署包动态生成: `competition-deploy-YYYYMMDD_HHMMSS/`

包含的关键修复：
- ✅ 修复后的 `services/deepseekService.js`（智能回退机制）
- ✅ 优化的环境变量配置
- ✅ 完整的部署脚本
- ✅ 详细的检查清单

---

## 🔧 第二步：上传到阿里云服务器

### 方法1：SCP上传（推荐）
```bash
# 压缩部署包
tar -czf competition_deploy.tar.gz competition-deploy-YYYYMMDD_HHMMSS/

# 上传到服务器
scp competition_deploy.tar.gz root@cursor2.com:/tmp/

# SSH到服务器并解压
ssh root@cursor2.com
cd /tmp
tar -xzf competition_deploy.tar.gz
cd competition-deploy-YYYYMMDD_HHMMSS
```

### 方法2：Git部署（如果代码在仓库中）
```bash
# 在服务器上
git clone [your-repository-url] /tmp/competition_deploy
cd /tmp/competition_deploy
```

---

## 🚀 第三步：执行自动部署

```bash
# 在服务器上，进入部署目录
cd /tmp/competition-deploy-YYYYMMDD_HHMMSS

# 给部署脚本执行权限
chmod +x deploy/deploy.sh

# 运行自动部署脚本
./deploy/deploy.sh
```

**部署脚本会自动：**
1. ✅ 安装 Node.js 18+
2. ✅ 安装 PM2 进程管理器
3. ✅ 配置 Nginx 反向代理
4. ✅ 设置防火墙规则
5. ✅ 创建环境变量文件
6. ✅ 启动应用程序
7. ✅ 配置自动启动

---

## 🎯 第四步：验证部署

### 1. 检查服务状态
```bash
# 查看PM2进程状态
pm2 status

# 查看应用日志
pm2 logs fair-competition-review

# 检查Nginx状态
systemctl status nginx
```

### 2. 测试功能
1. **访问主页**：http://cursor2.com
2. **测试API**：http://cursor2.com/test-api
3. **上传测试文档**：验证AI审查功能
4. **检查响应速度**：确保在合理时间内完成

### 3. 性能验证
```bash
# 检查资源使用
htop
free -h
df -h

# 测试并发性能（可选）
ab -n 100 -c 10 http://cursor2.com/
```

---

## 🔧 第五步：SSL证书配置（可选但推荐）

### 申请阿里云免费SSL证书
1. 登录阿里云控制台
2. 进入SSL证书服务
3. 申请免费证书（cursor2.com）
4. 下载证书文件

### 配置HTTPS
```bash
# 在服务器上创建证书目录
mkdir -p /etc/nginx/ssl

# 上传证书文件（替换为实际文件）
scp cursor2.com.pem root@cursor2.com:/etc/nginx/ssl/
scp cursor2.com.key root@cursor2.com:/etc/nginx/ssl/

# 运行SSL配置脚本
./deploy/configure-ssl.sh
```

---

## 📋 关键配置说明

### 智能回退机制
系统现在具备智能回退功能：
1. **优先使用DeepSeek-Reasoner**（高质量分析，45秒超时）
2. **自动回退到DeepSeek-Chat**（快速稳定，3-10秒）
3. **无缝用户体验**（用户不会感知到回退过程）

### 环境变量配置
```bash
# 位置：/var/www/competition/.env
DEEPSEEK_API_KEY=sk-e49568e47ba74f439e0004358166dbe1
SILICONFLOW_API_KEY=sk-ndqddvkvqsfrvirhauqtrjejiwfawokxzakscpieqelbuhik
AI_PROVIDER=DEEPSEEK
AI_TIMEOUT=120000
NODE_ENV=production
```

---

## 🆘 常见问题排查

### 1. AI调用超时（已修复）
**现象**：上传文件后卡在"AI分析中"
**解决**：✅ 已通过智能回退机制解决

### 2. 文件上传失败
**检查**：
```bash
# 检查上传目录权限
ls -la /var/www/competition/uploads
# 检查Nginx配置
nginx -t
# 查看错误日志
tail -f /var/log/nginx/cursor2.error.log
```

### 3. 应用无法启动
**检查**：
```bash
# 查看PM2日志
pm2 logs fair-competition-review --lines 50
# 检查端口占用
netstat -tulnp | grep :3000
# 重启应用
pm2 restart fair-competition-review
```

### 4. 域名无法访问
**检查**：
```bash
# DNS解析
nslookup cursor2.com
# 防火墙状态
firewall-cmd --list-all
# Nginx配置
nginx -t && systemctl status nginx
```

---

## 📊 监控和维护

### 日常维护命令
```bash
# 查看系统状态
pm2 monit

# 重启应用
pm2 restart fair-competition-review

# 更新应用（有新版本时）
cd /var/www/competition
git pull  # 如果使用Git
pm2 reload fair-competition-review

# 查看访问日志
tail -f /var/log/nginx/cursor2.access.log

# 备份数据
cp -r /var/www/competition /backup/competition_$(date +%Y%m%d)
```

### 性能监控
- **内存使用**：应保持在1GB以下
- **CPU使用**：正常情况下<30%
- **响应时间**：文件审查应在10-60秒内完成
- **错误率**：应<1%

---

## 🎉 部署完成检查清单

- [ ] ✅ 服务器基础环境安装完成
- [ ] ✅ 应用程序启动成功（PM2状态正常）
- [ ] ✅ Nginx配置生效（反向代理正常）
- [ ] ✅ 防火墙规则配置正确
- [ ] ✅ 域名解析正确
- [ ] ✅ 主页可以正常访问
- [ ] ✅ 文件上传功能正常
- [ ] ✅ AI审查功能正常（智能回退机制工作）
- [ ] ✅ 报告导出功能正常
- [ ] ✅ 系统性能稳定
- [ ] 🔄 SSL证书配置（可选）
- [ ] 🔄 监控和告警配置（可选）

---

## 📞 技术支持

如果在部署过程中遇到问题：

1. **检查日志**：
   ```bash
   pm2 logs --lines 100
   tail -f /var/log/nginx/cursor2.error.log
   ```

2. **重启服务**：
   ```bash
   pm2 restart fair-competition-review
   systemctl restart nginx
   ```

3. **回滚操作**：
   ```bash
   # 如果需要回滚到之前版本
   pm2 stop fair-competition-review
   # 恢复备份文件
   systemctl restart nginx
   ```

**🎯 关键成果：AI超时问题已完全解决，系统稳定性大幅提升！**