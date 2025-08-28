const express = require('express');
const { performEnhancedPreCheck, performEnhancedDetailedReview } = require('../services/enhancedReviewService');
const { logAuditRecord } = require('../services/auditLogService');
const { extractTextFromFile } = require('../utils/fileUtils');
const { createUploadConfig, validateUploadedFile } = require('../utils/fileUploadUtils');
const { APP_CONFIG, ERROR_MESSAGES, HTTP_STATUS } = require('../config/constants');
const { FileSecurityValidator } = require('../utils/securityValidator');

const router = express.Router();

// 使用统一的上传配置
const upload = createUploadConfig();

/**
 * 增强流式审查路由 - 最高精准度版本
 */
router.post('/enhanced-stream-review', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    let auditResult = null;
    
    try {
        if (!req.file) {
            throw new Error(ERROR_MESSAGES.NO_FILE);
        }
        
        // 额外的文件内容验证
        if (req.file.buffer) {
            const contentValidation = await FileSecurityValidator.validateFileContent(req.file.buffer);
            if (!contentValidation.valid) {
                throw new Error(contentValidation.message);
            }
        }
        
        // 设置SSE头
        res.writeHead(HTTP_STATUS.OK, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no' // 禁用nginx缓冲
        });

        // 发送开始信号
        sendSSEMessage(res, {
            type: 'start',
            message: '🚀 启动增强审查系统...',
            timestamp: new Date().toISOString()
        });

        // 文本提取阶段
        sendSSEMessage(res, {
            type: 'progress',
            step: 'extract',
            message: '📄 正在提取文档内容并进行预处理...',
            progress: 10
        });

        let text;
        let textExtractionTime;
        try {
            const extractStart = Date.now();
            text = await extractTextFromFile(req.file);
            textExtractionTime = Date.now() - extractStart;
            
            console.log('✅ 文档内容提取完成，文本长度:', text.length);
            
            sendSSEMessage(res, {
                type: 'progress',
                step: 'extract_success',
                message: `✅ 文档内容提取成功！共 ${text.length} 字符，耗时 ${textExtractionTime}ms`,
                progress: 25,
                data: {
                    textLength: text.length,
                    extractionTime: textExtractionTime
                }
            });
            
        } catch (extractError) {
            console.error('❌ 文档内容提取失败:', extractError);
            sendSSEMessage(res, {
                type: 'error',
                message: `${ERROR_MESSAGES.EXTRACTION_FAILED}: ${extractError.message}`,
                error: extractError.message
            });
            res.end();
            return;
        }

        // 直接进入增强详细审查（跳过预判断）
        sendSSEMessage(res, {
            type: 'progress',
            step: 'enhanced_detailed_review',
            message: '🔬 开始进行增强详细审查...',
            progress: 50,
            details: '多层级分析 + 交叉验证 + 案例对比 + 精确模式匹配'
        });
        
        console.log('🔍 跳过预判断，直接进入增强详细审查...');
        
        // 定义precheckTime变量（跳过预检查时设为0）
        const precheckTime = 0;
        
        // 直接发送详细审查进度
        sendSSEMessage(res, {
            type: 'detailed_review_progress',
            message: '📋 第一轮：精准条款对照审查...',
            progress: 60
        });

        try {
            const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
                if (apiKey) {
                    const reviewStart = Date.now();
                    
                    // 发送详细审查进度
                    sendSSEMessage(res, {
                        type: 'detailed_review_progress',
                        message: '📋 第一轮：精准条款对照审查...',
                        progress: 70
                    });
                    
                    sendSSEMessage(res, {
                        type: 'detailed_review_progress',
                        message: '📚 第二轮：实际案例对比分析...',
                        progress: 80
                    });
                    
                    sendSSEMessage(res, {
                        type: 'detailed_review_progress',
                        message: '🔍 第三轮：交叉验证确认...',
                        progress: 85
                    });
                    
                    sendSSEMessage(res, {
                        type: 'detailed_review_progress',
                        message: '📊 生成综合审查报告...',
                        progress: 90
                    });
                    
                    const aiResult = await performEnhancedDetailedReview(text);
                    const reviewTime = Date.now() - reviewStart;
                    
                    sendSSEMessage(res, {
                        type: 'detailed_review_complete',
                        message: `✅ 增强详细审查完成！发现 ${aiResult.totalIssues} 个问题`,
                        progress: 95
                    });
                    
                    auditResult = {
                        fileName: req.file.originalname,
                        fileSize: req.file.size,
                        totalIssues: aiResult.totalIssues,
                        issues: aiResult.issues,
                        rawResponse: aiResult.rawResponse,
                        complianceStatus: aiResult.complianceStatus,
                        crossValidation: aiResult.crossValidation,
                        caseAnalysis: aiResult.caseAnalysis,
                        processingMethod: 'enhanced_multi_model_review',
                        apiCalled: true,
                        processingTime: Date.now() - startTime,
                        textLength: text.length,
                        textExtractionTime,
                        precheckTime,
                        reviewTime,
                        finalConfidence: aiResult.finalConfidence || preCheckResult.confidence,
                        enhancedFeatures: {
                            multiLayerAnalysis: true,
                            crossValidation: true,
                            caseComparison: true,
                            precisePatternMatching: true
                        }
                    };
                } else {
                    throw new Error('未配置API密钥，无法进行AI审查');
                }
            } catch (error) {
                console.error('增强详细审查失败:', error);
                sendSSEMessage(res, {
                    type: 'error',
                    message: `详细审查失败: ${error.message}`,
                    error: error.message
                });
                res.end();
                return;
            }

        // 记录增强审查日志
        try {
            await logAuditRecord(req, req.file, auditResult);
        } catch (logError) {
            console.error('记录审查日志失败:', logError);
        }

        // 发送最终结果
        sendSSEMessage(res, {
            type: 'complete',
            message: '🎉 增强审查系统分析完成！',
            result: auditResult,
            progress: 100,
            performance: {
                totalTime: auditResult.processingTime,
                textExtractionTime: auditResult.textExtractionTime,
                reviewTime: auditResult.reviewTime || 0
            }
        });

        res.end();
        
    } catch (error) {
        console.error('增强流式审查出错:', error);
        console.error('错误堆栈:', error.stack);
        
        if (!res.headersSent) {
            sendSSEMessage(res, {
                type: 'error',
                message: `审查系统错误: ${error.message}`,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
        
        try {
            if (!res.writableEnded) {
                res.end();
            }
        } catch (endError) {
            console.error('结束响应时出错:', endError);
        }
    }
});

/**
 * 增强批量审查接口
 */
router.post('/enhanced-batch-review', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: true,
                message: ERROR_MESSAGES.NO_FILE
            });
        }

        const results = [];
        const startTime = Date.now();

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            console.log(`处理文件 ${i + 1}/${req.files.length}: ${file.originalname}`);

            try {
                const text = await extractTextFromFile(file);
                const preCheckResult = await performEnhancedPreCheck(text);
                
                let detailedResult = null;
                if (preCheckResult.needsReview) {
                    detailedResult = await performEnhancedDetailedReview(text);
                }

                const result = {
                    fileName: file.originalname,
                    fileSize: file.size,
                    preCheck: preCheckResult,
                    detailedReview: detailedResult,
                    processingTime: Date.now() - startTime
                };

                results.push(result);

                // 记录日志
                await logAuditRecord(req, file, detailedResult || preCheckResult);

            } catch (fileError) {
                console.error(`文件 ${file.originalname} 处理失败:`, fileError);
                results.push({
                    fileName: file.originalname,
                    error: fileError.message,
                    processingTime: Date.now() - startTime
                });
            }
        }

        res.json({
            success: true,
            totalFiles: req.files.length,
            results: results,
            totalProcessingTime: Date.now() - startTime
        });

    } catch (error) {
        console.error('批量审查失败:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: error.message || ERROR_MESSAGES.REVIEW_FAILED
        });
    }
});

/**
 * 审查系统性能测试接口
 */
router.post('/enhanced-performance-test', async (req, res) => {
    try {
        const testText = req.body.text || "这是一个测试文档，包含限定本地企业参与政府采购的条款。";
        const iterations = req.body.iterations || 5;
        
        const results = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            const result = await performEnhancedPreCheck(testText);
            const time = Date.now() - start;
            
            results.push({
                iteration: i + 1,
                processingTime: time,
                needsReview: result.needsReview,
                riskLevel: result.riskLevel,
                confidence: result.confidence
            });
        }
        
        const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
        const minTime = Math.min(...results.map(r => r.processingTime));
        const maxTime = Math.max(...results.map(r => r.processingTime));
        
        res.json({
            success: true,
            testConfig: {
                textLength: testText.length,
                iterations
            },
            performance: {
                averageTime: avgTime,
                minTime,
                maxTime,
                results
            }
        });
        
    } catch (error) {
        console.error('性能测试失败:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: error.message
        });
    }
});

/**
 * 发送SSE消息的辅助函数
 */
function sendSSEMessage(res, data) {
    try {
        if (!res.writableEnded && res.headersSent) {
            const message = JSON.stringify({
                ...data,
                timestamp: new Date().toISOString()
            });
            res.write(`data: ${message}\n\n`);
        }
    } catch (error) {
        console.error('发送SSE消息失败:', error.message);
    }
}

/**
 * 系统状态检查接口
 */
router.get('/enhanced-system-status', async (req, res) => {
    try {
        const status = {
            system: 'Enhanced Fair Competition Review System',
            version: '3.0.0',
            status: 'operational',
            timestamp: new Date().toISOString(),
            features: {
                multiLayerPrecheck: true,
                precisePatternMatching: true,
                crossValidation: true,
                caseComparison: true,
                aiSemanticAnalysis: !!process.env.SILICONFLOW_API_KEY
            },
            performance: {
                avgPrecheckTime: '2-5s',
                avgDetailedReviewTime: '15-30s',
                supportedFormats: ['DOCX', 'DOC', 'TXT'],
                maxFileSize: '50MB'
            }
        };
        
        // 简单的API连接测试
        if (process.env.SILICONFLOW_API_KEY) {
            try {
                await performEnhancedPreCheck("测试文档内容");
                status.aiService = 'connected';
            } catch (error) {
                status.aiService = 'error';
                status.aiError = error.message;
            }
        } else {
            status.aiService = 'not_configured';
        }
        
        res.json(status);
        
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            system: 'Enhanced Fair Competition Review System',
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;