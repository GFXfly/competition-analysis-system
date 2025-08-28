const express = require('express');
const cors = require('cors');
const timeout = require('connect-timeout');
const path = require('path');

// 🔧 加载环境变量 - 重要：必须在其他导入之前
require('dotenv').config();

// 导入配置
const { APP_CONFIG, HTTP_STATUS } = require('./config/constants');

// 导入路由
const reviewRoutes = require('./routes/reviewRoutes');
const auditRoutes = require('./routes/auditRoutes');
const enhancedReviewRoutes = require('./routes/enhancedReviewRoutes');
const strictReviewRoutes = require('./routes/strictReviewRoutes');

// 导入服务
const { performPreCheck } = require('./services/reviewService');

// 导入性能监控中间件
const { performanceMonitor } = require('./middleware/performanceMonitor');

// 加载环境变量
require('dotenv').config();

const app = express();
const port = APP_CONFIG.PORT;

// 中间件配置
app.use(express.static('public'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(timeout(APP_CONFIG.TIMEOUT + 's'));

// 性能监控中间件
app.use(performanceMonitor.middleware());

// 请求日志中间件 (简化版)
app.use((req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        originalSend.call(this, data);
    };
    
    next();
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('全局错误处理:', err.message);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: true,
            message: '文件大小超过限制'
        });
    }
    
    if (err.message.includes('不支持的文件类型')) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: true,
            message: err.message
        });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: true,
        message: '服务器内部错误'
    });
});

// 挂载路由
app.use('/', reviewRoutes);
app.use('/', auditRoutes);
app.use('/api/v3', enhancedReviewRoutes); // 增强审查系统 v3.0
app.use('/api/strict', strictReviewRoutes); // 严格审查系统

// 导出Word审查报告 (从原server.js移植过来)
app.post('/export-report', express.json(), async (req, res) => {
    try {
        console.log('=== 导出报告请求开始 ===');
        
        const { result, fileName } = req.body;
        
        if (!result) {
            console.error('导出失败：缺少审查结果数据');
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: '缺少审查结果数据' });
        }
        
        const reportGenerator = require('./utils/reportGenerator');
        const buffer = await reportGenerator.generateWordReport(result, fileName);
        
        const reportFileName = `公平竞争审查报告_${(result.fileName || fileName || '文档').replace(/\.[^/.]+$/, "")}_${new Date().toISOString().split("T")[0]}.docx`;
        
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(reportFileName)}"`);
        res.setHeader("Content-Length", buffer.length);
        
        res.send(buffer);
        console.log("=== 导出报告成功完成 ===");
        
    } catch (error) {
        console.error("生成Word报告失败:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: "生成报告失败: " + error.message
        });
    }
});

// 系统健康检查端点
app.get("/health", (req, res) => {
    try {
        const stats = performanceMonitor.getStats();
        const healthInfo = {
            status: stats.healthStatus.status,
            timestamp: new Date().toISOString(),
            uptime: stats.uptime,
            memory: stats.memory,
            requests: {
                total: stats.requests.total,
                success: stats.requests.success,
                errors: stats.requests.errors,
                averageResponseTime: stats.requests.averageResponseTime
            },
            healthScore: stats.healthStatus.score,
            issues: stats.healthStatus.issues
        };
        
        const statusCode = stats.healthStatus.status === 'healthy' ? 200 : 
                          stats.healthStatus.status === 'warning' ? 200 : 503;
        
        res.status(statusCode).json(healthInfo);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '健康检查失败',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 详细系统状态端点
app.get("/system-status", (req, res) => {
    try {
        const stats = performanceMonitor.getStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取系统状态失败',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API测试接口（使用增强的预检查系统）
app.get("/test-api", async (req, res) => {
    try {
        const testText = "本政策涉及市场准入和税收优惠措施，对本地企业给予特殊支持。";
        console.log("🧪 开始测试增强的预检查系统...");
        
        const startTime = Date.now();
        const result = await performPreCheck(testText);
        const responseTime = Date.now() - startTime;
        
        console.log("✅ 预检查测试成功");
        
        res.json({
            success: true,
            message: "预检查系统正常运行",
            responseTime: `${responseTime}ms`,
            testResult: result,
            systemInfo: {
                processingMethod: result.processingMethod,
                apiCalled: result.apiCalled,
                confidence: result.confidence,
                documentType: result.documentType
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ 预检查测试失败:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: `预检查测试失败: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
});

// 优雅关闭处理
process.on('SIGINT', () => {
    console.log('收到关闭信号，正在优雅关闭服务器...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});

// 启动服务器
const server = app.listen(port, () => {
    console.log('=' .repeat(60));
    console.log(`🚀 公平竞争审查工具服务器运行在 http://localhost:${port}`);
    console.log(`📈 服务器版本: 3.0.0 (增强版)`);
    console.log('=' .repeat(60));
    console.log('📋 可用接口:');
    console.log(`  📊 审查记录管理: http://localhost:${port}/admin/audit-logs`);
    console.log(`  🔧 API测试页面: http://localhost:${port}/test-api`);
    console.log(`  🏥 系统健康检查: http://localhost:${port}/health`);
    console.log(`  📈 详细系统状态: http://localhost:${port}/system-status`);
    console.log(`  🎯 标准审查接口: http://localhost:${port}/stream-review`);
    console.log(`  ⚡ 增强审查接口: http://localhost:${port}/api/v3/enhanced-stream-review`);
    console.log(`  📦 批量审查接口: http://localhost:${port}/api/v3/enhanced-batch-review`);
    console.log(`  📈 系统状态检查: http://localhost:${port}/api/v3/enhanced-system-status`);
    console.log('=' .repeat(60));
    console.log('🔍 增强审查系统特性:');
    console.log('  ✅ 多层级智能预判断 (4层分析)');
    console.log('  ✅ 精确违规模式匹配 (29条法规对照)');
    console.log('  ✅ AI语义深度理解 (交叉验证)');
    console.log('  ✅ 实际案例对比分析');
    console.log('  ✅ 多模型交叉验证');
    console.log('=' .repeat(60));
});

// 设置服务器超时
server.timeout = APP_CONFIG.TIMEOUT;

module.exports = app;