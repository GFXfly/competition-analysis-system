/**
 * 严格审查路由
 * 提供超高敏感度的公平竞争审查服务
 */

const express = require('express');
const { createUploadConfig, validateUploadedFile } = require('../utils/fileUploadUtils');
const { extractTextFromFile } = require('../utils/fileUtils');
const { 
    performStrictComprehensiveReview,
    createStrictReviewPrompt 
} = require('../services/strictReviewService');
const DeepSeekService = require('../services/deepseekService');
const { logAuditRecord } = require('../services/auditLogService');
const { APP_CONFIG, ERROR_MESSAGES, HTTP_STATUS } = require('../config/constants');

const router = express.Router();
const deepSeekService = new DeepSeekService();

// 使用统一的上传配置
const upload = createUploadConfig();

// SSE消息发送函数
function sendSSEMessage(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * 超严格审查路由 - 零容忍模式
 */
router.post('/ultra-strict-review', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    let auditResult = null;
    
    try {
        if (!req.file) {
            throw new Error(ERROR_MESSAGES.NO_FILE);
        }
        
        // 设置SSE头
        res.writeHead(HTTP_STATUS.OK, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        // 发送开始信号
        sendSSEMessage(res, {
            type: 'start',
            message: '🔍 启动超严格审查模式 - 零容忍检测...',
            mode: 'ultra-strict'
        });

        // 文件安全验证
        sendSSEMessage(res, {
            type: 'progress',
            step: 'validation',
            message: '正在验证文件安全性...'
        });

        const validation = await validateUploadedFile(req.file);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        req.file.originalname = validation.sanitizedName;
        sendSSEMessage(res, {
            type: 'progress',
            step: 'validation_success',
            message: '✅ 文件验证通过，开始严格审查'
        });

        // 文本提取
        sendSSEMessage(res, {
            type: 'progress',
            step: 'extract',
            message: '📄 正在提取文档内容...'
        });

        let text;
        try {
            text = await extractTextFromFile(req.file);
            console.log(`✅ 文档内容提取完成，文本长度: ${text.length}`);
            
            sendSSEMessage(res, {
                type: 'progress',
                step: 'extract_success',
                message: `📄 内容提取完成 (${text.length} 字符)`
            });
        } catch (extractError) {
            console.error('文本提取错误:', extractError);
            throw new Error(ERROR_MESSAGES.EXTRACTION_FAILED);
        }

        // 超严格预审查
        sendSSEMessage(res, {
            type: 'progress',
            step: 'strict_precheck',
            message: '🔬 执行超严格预审查分析...'
        });

        const comprehensiveResult = await performStrictComprehensiveReview(text);
        
        sendSSEMessage(res, {
            type: 'progress',
            step: 'precheck_complete',
            message: `🔬 预审查完成 - 发现 ${comprehensiveResult.totalIssues} 个潜在问题`
        });

        let finalResult = comprehensiveResult;

        // 如果预审查发现严重问题，同时调用AI进行深度分析
        if (comprehensiveResult.totalIssues > 3 || 
            comprehensiveResult.issues.some(issue => issue.severity === 'high')) {
            
            sendSSEMessage(res, {
                type: 'progress',
                step: 'ai_deep_analysis',
                message: '🤖 问题较多，启动AI深度分析...'
            });

            try {
                const aiPrompt = createStrictReviewPrompt(text);
                const aiResult = await deepSeekService.callDetailedReviewAPI(aiPrompt);
                
                // 合并AI结果和关键词检测结果
                if (aiResult && aiResult.totalIssues > 0) {
                    const combinedIssues = [
                        ...comprehensiveResult.issues,
                        ...aiResult.issues.map(issue => ({
                            ...issue,
                            id: comprehensiveResult.totalIssues + issue.id,
                            source: 'AI分析'
                        }))
                    ];
                    
                    finalResult = {
                        ...comprehensiveResult,
                        totalIssues: combinedIssues.length,
                        issues: combinedIssues,
                        aiAnalysis: aiResult,
                        complianceRating: 'F', // 强制最严格评级
                        overallAssessment: `超严格模式检测：关键词扫描发现${comprehensiveResult.totalIssues}个问题，AI分析发现${aiResult.totalIssues}个问题，建议全面整改`
                    };
                }
                
                sendSSEMessage(res, {
                    type: 'progress',
                    step: 'ai_complete',
                    message: '🤖 AI深度分析完成'
                });
                
            } catch (aiError) {
                console.error('AI深度分析失败:', aiError);
                sendSSEMessage(res, {
                    type: 'progress',
                    step: 'ai_fallback',
                    message: '⚠️ AI分析失败，使用关键词检测结果'
                });
            }
        }

        // 审查完成
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        sendSSEMessage(res, {
            type: 'progress',
            step: 'complete',
            message: '✅ 超严格审查完成'
        });

        // 记录审计日志
        auditResult = {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            processingTime: processingTime,
            totalIssues: finalResult.totalIssues,
            hasViolation: finalResult.totalIssues > 0,
            strictMode: true,
            processingMethod: 'ultra_strict_review',
            userAgent: req.get('User-Agent') || 'Unknown'
        };

        await logAuditRecord(auditResult);

        // 发送最终结果
        sendSSEMessage(res, {
            type: 'result',
            data: {
                ...finalResult,
                processingTime: processingTime,
                timestamp: new Date().toISOString(),
                strictMode: true,
                auditId: Date.now().toString()
            }
        });

        res.end();

    } catch (error) {
        console.error('严格审查路由错误:', error);
        
        // 记录错误审计日志
        if (auditResult) {
            auditResult.error = error.message;
            auditResult.status = 'error';
            await logAuditRecord(auditResult);
        }

        if (!res.headersSent) {
            res.writeHead(HTTP_STATUS.INTERNAL_SERVER_ERROR, {
                'Content-Type': 'application/json'
            });
        }

        sendSSEMessage(res, {
            type: 'error',
            message: `审查过程出错: ${error.message}`,
            error: error.message
        });

        res.end();
    }
});

/**
 * 批量严格审查路由
 */
router.post('/batch-strict-review', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: '未上传文件'
            });
        }

        const results = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            
            try {
                // 文件验证
                const validation = await validateUploadedFile(file);
                if (!validation.valid) {
                    results.push({
                        fileName: file.originalname,
                        error: validation.message,
                        status: 'validation_failed'
                    });
                    continue;
                }

                // 文本提取
                const text = await extractTextFromFile(file);
                
                // 严格审查
                const reviewResult = await performStrictComprehensiveReview(text);
                
                results.push({
                    fileName: validation.sanitizedName,
                    fileSize: file.size,
                    ...reviewResult,
                    status: 'completed',
                    strictMode: true
                });

            } catch (error) {
                results.push({
                    fileName: file.originalname,
                    error: error.message,
                    status: 'error'
                });
            }
        }

        res.json({
            totalFiles: req.files.length,
            results: results,
            timestamp: new Date().toISOString(),
            strictMode: true
        });

    } catch (error) {
        console.error('批量严格审查错误:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: `批量审查失败: ${error.message}`
        });
    }
});

module.exports = router;