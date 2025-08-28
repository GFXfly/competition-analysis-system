# 公平竞争审查系统部署包

## 🚀 部署步骤

### 1. 上传文件到服务器
```bash
# 将整个文件夹上传到服务器
scp -r competition_deploy_* root@your-server:/tmp/
```

### 2. 在服务器上运行部署脚本
```bash
# SSH连接到服务器
ssh root@your-server

# 进入上传目录
cd /tmp/competition_deploy_*

# 给部署脚本执行权限
chmod +x deploy/deploy.sh

# 运行部署脚本
./deploy/deploy.sh
```

### 3. 验证部署
访问 http://cursor2.com 确认系统正常运行

## 🔧 重要修复

✅ **已修复AI超时问题**
- 实现智能回退机制（Reasoner → Chat模型）
- 优化超时配置
- 提高系统稳定性

## 🎯 系统特性

- ✅ 文件上传审查（支持.docx, .doc, .txt）
- ✅ AI智能分析（DeepSeek API）
- ✅ 流式实时响应（SSE）
- ✅ 专业审查报告生成
- ✅ 审查记录管理
- ✅ 智能回退机制

## 📋 API接口

- `/` - 主页面
- `/stream-review` - 流式审查接口
- `/export-report` - 导出报告接口
- `/admin/audit-logs` - 审查记录管理
- `/test-api` - API测试页面

## ⚙️ 配置说明

系统会自动使用智能回退机制：
1. 优先尝试DeepSeek-Reasoner模型（45秒超时）
2. 超时后自动切换到DeepSeek-Chat模型（快速稳定）
3. 保证审查功能始终可用

