#!/bin/bash
# 项目打包脚本 - 为部署到阿里云服务器准备文件

set -e

echo "🗂️ 开始打包项目文件..."

# 创建部署包目录
DEPLOY_DIR="competition_deploy_$(date +%Y%m%d_%H%M%S)"
mkdir -p $DEPLOY_DIR

echo "📦 复制必要文件到 $DEPLOY_DIR"

# 复制核心文件
cp package.json $DEPLOY_DIR/
cp server_new.js $DEPLOY_DIR/
cp -r config $DEPLOY_DIR/
cp -r middleware $DEPLOY_DIR/
cp -r routes $DEPLOY_DIR/
cp -r services $DEPLOY_DIR/
cp -r utils $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/

# 复制部署配置
cp -r deploy $DEPLOY_DIR/

# 创建生产环境配置（使用更新后的版本）
cp deploy/production_updated.env $DEPLOY_DIR/.env

# 创建README文件
cat > $DEPLOY_DIR/DEPLOY_README.md << 'EOF'
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

EOF

# 创建部署检查清单
cat > $DEPLOY_DIR/DEPLOY_CHECKLIST.md << 'EOF'
# 部署检查清单 ✅

## 部署前检查
- [ ] 确认API密钥有效
- [ ] 确认域名解析正确
- [ ] 确认服务器可访问互联网
- [ ] 备份现有数据（如有）

## 部署过程检查  
- [ ] 文件上传成功
- [ ] 部署脚本运行无错误
- [ ] Node.js 服务启动成功
- [ ] Nginx 配置生效
- [ ] PM2 进程管理配置正确

## 部署后验证
- [ ] 访问 http://cursor2.com 正常
- [ ] 文件上传功能正常
- [ ] AI审查功能正常（测试简单文档）
- [ ] 报告导出功能正常
- [ ] 流式响应正常
- [ ] 日志记录正常

## 性能检查
- [ ] 响应速度合理（<10秒完成审查）
- [ ] 内存使用正常
- [ ] CPU使用正常
- [ ] 错误日志无异常

## 常见问题排查

### 1. AI调用超时
✅ **已修复** - 系统会自动回退到Chat模型

### 2. 文件上传失败
- 检查文件大小限制（默认50MB）
- 检查文件格式支持
- 查看nginx错误日志

### 3. 域名无法访问
- 检查DNS解析
- 检查防火墙设置
- 检查Nginx配置

### 4. SSL证书问题
- 确认证书文件存在
- 检查证书有效期
- 运行 `nginx -t` 测试配置

EOF

# 显示部署包信息
echo ""
echo "✅ 打包完成！"
echo ""
echo "📦 部署包: $DEPLOY_DIR"
echo "📄 包含文件:"
ls -la $DEPLOY_DIR
echo ""
echo "🚀 下一步操作:"
echo "1. 将 $DEPLOY_DIR 文件夹上传到服务器"
echo "2. 在服务器上运行: ./deploy/deploy.sh"
echo "3. 按照 DEPLOY_README.md 中的说明进行部署"
echo ""
echo "🔍 重要修复:"
echo "✅ AI超时问题已修复（智能回退机制）"
echo "✅ 配置文件已优化"
echo "✅ 部署脚本已完善"