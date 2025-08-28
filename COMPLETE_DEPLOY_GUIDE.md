# 🔰 小白专用：cursor2.com 完整部署指南

## 📋 前言
这是一个超详细的部署指南，每一步都会告诉您：
- 要输入什么命令
- 会看到什么反应
- 如何判断是否成功
- 遇到问题怎么办

---

## 🗂️ 第一步：准备工作

### 1.1 检查您的电脑上是否有部署包
在命令行中输入：
```bash
ls -la | grep competition_deploy
```

**预期反应**：
```
drwxr-xr-x  14 user  staff   448 Aug 25 23:10 competition_deploy_20250825_231022
```

**如果没看到**：说明部署包不在当前目录，请先cd到正确目录或重新生成。

### 1.2 准备您的服务器信息
请确认您有：
- ✅ 服务器IP地址或域名（如：cursor2.com）
- ✅ root用户密码
- ✅ SSH可以连接到服务器

---

## 🧹 第二步：清理旧版本（重要！）

### 2.1 先连接到您的服务器
```bash
ssh root@cursor2.com
```

**输入后会看到**：
```
The authenticity of host 'cursor2.com' can't be established.
ECDSA key fingerprint is SHA256:xxxxxxxxxx
Are you sure you want to continue connecting (yes/no)?
```

**您需要输入**：`yes`

**然后会提示输入密码**：
```
root@cursor2.com's password:
```
输入您的服务器密码（密码不会显示，正常输入即可）

**成功连接后会看到**：
```
Last login: Sun Aug 25 15:30:42 2025 from xxx.xxx.xxx.xxx
[root@iZ2ze8... ~]# 
```

### 2.2 停止旧的应用程序
```bash
pm2 list
```

**如果看到类似这样的输出**：
```
┌────┬─────────────────┬─────────┬─────────┬───────────┬──────────┐
│ id │ name            │ mode    │ ↺      │ status    │ cpu      │
│ 0  │ fair-competition│ cluster │ 0       │ online    │ 0%       │
└────┴─────────────────┴─────────┴─────────┴───────────┴──────────┘
```

**停止旧应用**：
```bash
pm2 delete all
```

**预期反应**：
```
[PM2] Applying action deleteProcessId on app [all](ids: [ 0 ])
[PM2] [fair-competition-review](0) ✓
```

**如果看到 "No process found"**：说明没有运行的程序，直接跳到下一步。

### 2.3 清理旧文件
```bash
# 备份旧版本（以防万一）
if [ -d "/var/www/competition" ]; then
    mv /var/www/competition /var/www/competition_backup_$(date +%Y%m%d_%H%M%S)
    echo "旧版本已备份"
else
    echo "没有发现旧版本文件"
fi
```

**会看到其中一种反应**：
- `旧版本已备份` - 说明清理成功
- `没有发现旧版本文件` - 说明这是首次部署

### 2.4 清理临时文件
```bash
rm -rf /tmp/competition_deploy*
ls /tmp/ | grep competition
```

**如果最后一个命令没有输出**：说明清理干净了

### 2.5 退出服务器连接
```bash
exit
```

**会回到您的本地电脑命令行**

---

## 📦 第三步：打包和上传新版本

### 3.1 在本地电脑上，进入项目目录
```bash
cd /Users/gaofeixiang/Desktop/competition
```

### 3.2 压缩部署包（方便上传）
```bash
tar -czf competition_deploy_new.tar.gz competition_deploy_20250825_231022/
```

**预期反应**：没有任何输出，但会创建一个压缩文件

**验证压缩文件**：
```bash
ls -lh competition_deploy_new.tar.gz
```

**应该看到**：
```
-rw-r--r--  1 user  staff   1.2M Aug 25 23:15 competition_deploy_new.tar.gz
```

### 3.3 上传到服务器
```bash
scp competition_deploy_new.tar.gz root@cursor2.com:/tmp/
```

**会显示上传进度**：
```
competition_deploy_new.tar.gz    100% 1234KB  123.4KB/s   00:10
```

**如果提示输入密码**：输入您的服务器密码

---

## 🚀 第四步：在服务器上部署

### 4.1 重新连接服务器
```bash
ssh root@cursor2.com
```

### 4.2 解压部署包
```bash
cd /tmp
tar -xzf competition_deploy_new.tar.gz
ls -la competition_deploy_20250825_231022/
```

**应该看到**：
```
total 48
drwxr-xr-x  14 root root  448 Aug 25 23:10 .
drwxr-xr-x   3 root root   96 Aug 25 23:20 ..
-rw-r--r--   1 root root 1059 Aug 25 23:10 .env
drwxr-xr-x   8 root root  256 Aug 25 23:10 config
drwxr-xr-x  10 root root  320 Aug 25 23:10 deploy
-rw-r--r--   1 root root 1143 Aug 25 23:10 DEPLOY_CHECKLIST.md
-rw-r--r--   1 root root 1317 Aug 25 23:10 DEPLOY_README.md
（...更多文件...）
```

### 4.3 进入部署目录
```bash
cd competition_deploy_20250825_231022
```

### 4.4 运行部署验证（可选但推荐）
```bash
./verify_deployment.sh
```

**应该看到全部 ✅**：
```
🔍 开始验证部署配置...
✅ server_new.js 存在
✅ .env 存在
✅ package.json 存在
（...所有检查都应该是 ✅...）
🚀 准备部署！
```

### 4.5 运行自动部署脚本
```bash
./deploy/deploy.sh
```

**部署过程中您会看到很多信息，关键步骤如下：**

1. **API密钥输入**：
```
请输入您的DeepSeek API密钥:
```
**输入**：`sk-e49568e47ba74f439e0004358166dbe1`

2. **SiliconFlow API密钥（可选）**：
```
请输入您的SiliconFlow API密钥 (可选，直接回车跳过):
```
**输入**：`sk-ndqddvkvqsfrvirhauqtrjejiwfawokxzakscpieqelbuhik` 或直接回车跳过

3. **系统更新过程**：
```
🚀 开始部署 cursor2.com 公平竞争审查系统...
▶ 更新系统和安装依赖
Loaded plugins: fastestmirror
Loading mirror speeds from cached hostfile
（...很多安装信息...）
```

4. **安装Node.js**：
```
▶ 安装 Node.js 18+
Node.js版本: v18.17.0
NPM版本: 9.6.7
```

5. **安装依赖**：
```
▶ 安装项目依赖
npm WARN deprecated ...
added 234 packages in 45s
```

6. **配置服务**：
```
▶ 配置 PM2 进程管理
▶ 配置 Nginx 反向代理
▶ 测试 Nginx 配置
✅ Nginx 配置测试通过
```

7. **启动应用**：
```
▶ 启动应用程序
[PM2] Starting ecosystem.config.js
[PM2] Process successfully started
```

8. **最终成功信息**：
```
▶ 部署完成！

🎉 cursor2.com 公平竞争审查系统部署成功！

📋 重要信息：
  • 应用端口: 3000
  • Nginx 配置: /etc/nginx/conf.d/cursor2.conf
  • 应用目录: /var/www/competition
  • 日志目录: /var/log/pm2/

🌐 访问地址：
  • HTTP: http://cursor2.com
```

---

## ✅ 第五步：验证部署成功

### 5.1 检查应用状态
```bash
pm2 status
```

**成功的话会看到**：
```
┌────┬─────────────────────┬─────────┬─────────┬───────────┬──────────┬──────────┐
│ id │ name                │ mode    │ ↺      │ status    │ cpu      │ memory   │
├────┼─────────────────────┼─────────┼─────────┼───────────┼──────────┼──────────┤
│ 0  │ fair-competition... │ cluster │ 0       │ online    │ 0%       │ 45.6mb   │
│ 1  │ fair-competition... │ cluster │ 0       │ online    │ 0%       │ 42.1mb   │
└────┴─────────────────────┴─────────┴─────────┴───────────┴──────────┴──────────┘
```

**重点看status列，应该都是 `online`**

### 5.2 检查服务器本地访问
```bash
curl -I http://localhost:3000
```

**成功的话会看到**：
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 14440
```

### 5.3 检查Nginx状态
```bash
systemctl status nginx
```

**成功的话会看到**：
```
● nginx.service - The nginx HTTP and reverse proxy server
   Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled)
   Active: active (running) since Sun 2025-08-25 23:30:15 CST; 2min ago
```

**重点看 `Active: active (running)`**

---

## 🌐 第六步：外网访问测试

### 6.1 在您的电脑浏览器中访问
打开浏览器，访问：`http://cursor2.com`

**成功的话您应该看到**：
- 页面标题：公平竞争审查在线工具
- 可以看到文件上传区域
- 页面加载正常，没有错误

### 6.2 测试API功能
访问：`http://cursor2.com/test-api`

**成功的话会看到类似**：
```json
{
  "success": true,
  "message": "API连接正常",
  "responseTime": "3247ms",
  "testResult": {
    "needsReview": true,
    "confidence": 0.9,
    "reason": "文档明确提及'市场准入和税收优惠措施'..."
  }
}
```

### 6.3 测试文件上传和审查
1. 在主页上传一个简单的txt文件（内容：`本地企业享有税收优惠`）
2. 点击"开始审查"
3. 应该看到：
   - 进度条和AI分析过程
   - 10-60秒内完成（智能回退机制）
   - 显示检测到的问题列表

---

## 🆘 常见问题排查

### ❌ 问题1：部署脚本权限错误
**错误信息**：`Permission denied: ./deploy/deploy.sh`

**解决方法**：
```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### ❌ 问题2：PM2显示 "errored" 状态
**检查日志**：
```bash
pm2 logs fair-competition-review
```

**常见原因和解决**：
- 端口被占用：`lsof -i:3000` 查看，`kill -9 进程号` 清理
- 环境变量错误：检查 `/var/www/competition/.env` 文件
- 依赖缺失：`cd /var/www/competition && npm install`

### ❌ 问题3：网页无法访问
**检查网络**：
```bash
# 服务器上运行
curl -I http://localhost:3000
curl -I http://cursor2.com
```

**检查防火墙**：
```bash
firewall-cmd --list-all
```

**重启服务**：
```bash
systemctl restart nginx
pm2 restart all
```

### ❌ 问题4：AI审查超时
**这个问题已修复**，但如果还遇到：
```bash
# 查看应用日志
pm2 logs fair-competition-review --lines 50
```
应该能看到智能回退信息：
```
⚠️ Reasoner模型调用失败: Reasoner模型超时, 回退到Chat模型...
✅ AI服务 详细审查API (Chat模型) 响应成功
```

---

## 🎉 部署完成！

如果您看到：
- ✅ PM2显示应用 "online"
- ✅ 可以访问 http://cursor2.com
- ✅ API测试正常
- ✅ 文件上传审查功能正常

**恭喜！您的公平竞争审查系统已成功部署！**

## 📞 维护命令备忘

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart fair-competition-review

# 查看系统资源使用
htop

# 查看Nginx访问日志
tail -f /var/log/nginx/cursor2.access.log
```

**记住：AI超时问题已彻底解决，系统将稳定运行！** 🚀