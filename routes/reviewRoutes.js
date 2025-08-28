const express = require('express');
const { performPreCheck, performReview } = require('../services/reviewService');
const { performPrecisePreCheck, performPreciseDetailedReview } = require('../services/preciseReviewService');
const DeepSeekService = require('../services/deepseekService');
const { logAuditRecord } = require('../services/auditLogService');
const { extractTextFromFile } = require('../utils/fileUtils');
const { createUploadConfig, validateUploadedFile } = require('../utils/fileUploadUtils');
const { APP_CONFIG, ERROR_MESSAGES, HTTP_STATUS } = require('../config/constants');

const router = express.Router();

// 初始化 DeepSeek 服务
const deepSeekService = new DeepSeekService();

// 使用统一的上传配置
const upload = createUploadConfig();

/**
 * 流式审查路由 - 优化版本
 */
router.post('/stream-review', upload.single('file'), async (req, res) => {
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
            message: '开始处理文件...'
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

        // 更新文件名
        req.file.originalname = validation.sanitizedName;

        sendSSEMessage(res, {
            type: 'progress',
            step: 'validation_success',
            message: '文件验证通过'
        });

        // 文本提取阶段
        sendSSEMessage(res, {
            type: 'progress',
            step: 'extract',
            message: '正在提取文档内容，准备进行分析...'
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
                message: `文档内容提取成功，共 ${text.length} 字符，耗时 ${textExtractionTime}ms`
            });
            
        } catch (extractError) {
            console.error('❌ 文档内容提取失败:', extractError);
            sendSSEMessage(res, {
                type: 'error',
                message: `${ERROR_MESSAGES.EXTRACTION_FAILED}: ${extractError.message}`
            });
            res.end();
            return;
        }

        // 直接进入详细审查阶段（跳过预判断）
        sendSSEMessage(res, {
            type: 'progress',
            step: 'detailed_review',
            message: '开始进行公平竞争审查...',
            progress: 50
        });

        try {
            const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
            if (apiKey) {
                const reviewStart = Date.now();
                
                // 发送AI思考消息
                sendSSEMessage(res, {
                    type: 'ai_thinking',
                    message: '🧠 基于《公平竞争审查条例实施办法》开始精准分析...'
                });
                
                sendSSEMessage(res, {
                    type: 'ai_thinking',
                    message: '📋 逐条检查第9-25条审查标准...'
                });
                
                // 调试：检查传递给AI的文本内容
                console.log('🔍 传递给AI的文本前500字符:', text.substring(0, 500));
                console.log('🔍 文本编码检查 - 包含中文字符数:', (text.match(/[\u4e00-\u9fa5]/g) || []).length);
                console.log('🔍 文本编码检查 - 包含乱码字符数:', (text.match(/[\u0000-\u001f\u007f-\u009f]/g) || []).length);
                
                const aiResult = await deepSeekService.callDetailedReviewAPI(text);
                const reviewTime = Date.now() - reviewStart;
                
                // 调试：检查AI返回的原文引用编码
                if (aiResult.issues && aiResult.issues.length > 0) {
                    console.log('🔍 AI返回的第一个问题的原文引用:', aiResult.issues[0].quote || 'undefined');
                    console.log('🔍 AI返回的第一个问题标题:', aiResult.issues[0].title || 'undefined');
                }
                
                sendSSEMessage(res, {
                    type: 'ai_thinking',
                    message: '✅ 精准审查完成，正在整理专业审查报告...'
                });
                
                auditResult = {
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    totalIssues: aiResult.totalIssues,
                    issues: aiResult.issues,
                    rawResponse: aiResult.rawResponse,
                    processingMethod: 'ai_detailed_review',
                    apiCalled: true,
                    needsReview: true,
                    processingTime: Date.now() - startTime,
                    textLength: text.length,
                    textExtractionTime,
                    reviewTime
                };
            } else {
                auditResult = await performReview(req);
                auditResult.processingTime = Date.now() - startTime;
                auditResult.textLength = text.length;
                auditResult.needsReview = true;
            }
        } catch (error) {
            console.error('AI审查失败，使用备用方法:', error);
            auditResult = await performReview(req);
            auditResult.processingTime = Date.now() - startTime;
            auditResult.textLength = text.length;
            auditResult.needsReview = true;
        }

        // 记录审查日志
        await logAuditRecord(req, req.file, auditResult);

        // 调试：检查发送给前端的数据
        console.log('🔍 发送给前端的auditResult.issues[0]:', auditResult.issues ? auditResult.issues[0] : 'undefined');
        
        sendSSEMessage(res, {
            type: 'complete',
            result: auditResult
        });

        res.end();
    } catch (error) {
        console.error('流式审查出错:', error);
        console.error('错误堆栈:', error.stack);
        
        // 确保响应还没有结束才发送错误消息
        if (!res.headersSent) {
            sendSSEMessage(res, {
                type: 'error',
                message: error.message || ERROR_MESSAGES.REVIEW_FAILED
            });
        }
        
        // 安全地结束响应
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
 * 发送SSE消息的辅助函数
 */
function sendSSEMessage(res, data) {
    try {
        // 检查响应是否还可以写入
        if (!res.writableEnded && res.headersSent) {
            // 确保JSON序列化保持UTF-8编码
            const jsonString = JSON.stringify(data, null, 0);
            
            // 调试：对于complete消息，记录实际发送的数据
            if (data.type === 'complete' && data.result && data.result.issues && data.result.issues[0]) {
                console.log('🔍 SSE发送的第一个问题原文引用:', data.result.issues[0].quote || 'undefined');
                console.log('🔍 JSON字符串前200字符:', jsonString.substring(0, 200));
            }
            
            // 使用Buffer确保编码正确
            const messageBuffer = Buffer.from(`data: ${jsonString}\n\n`, 'utf8');
            res.write(messageBuffer);
        }
    } catch (error) {
        console.error('发送SSE消息失败:', error.message);
        console.error('数据类型:', typeof data);
        console.error('数据内容:', data);
    }
}

/**
 * 流式详细审查API调用 (从reviewService移到这里以便处理流)
 */
async function callDetailedReviewAPIStream(text, res) {
    // 使用精准详细审查
    try {
        // 发送AI思考信号
        sendSSEMessage(res, {
            type: 'ai_thinking',
            message: '🧠 基于《公平竞争审查条例实施办法》开始精准分析...'
        });
        
        sendSSEMessage(res, {
            type: 'ai_thinking',
            message: '📋 逐条检查第9-25条审查标准...'
        });
        
        const result = await performPreciseDetailedReview(text);
        
        sendSSEMessage(res, {
            type: 'ai_thinking',
            message: '✅ 精准审查完成，正在整理专业审查报告...'
        });
        
        return result;
    } catch (error) {
        throw error;
    }
}

/**
 * 传统审查路由 (保留作为备用)
 */
router.post('/review', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    
    try {
        if (!req.file) {
            throw new Error(ERROR_MESSAGES.NO_FILE);
        }

        const result = await performReview(req);
        result.processingTime = Date.now() - startTime;
        
        // 记录审查日志
        await logAuditRecord(req, req.file, result);
        
        res.json(result);
    } catch (error) {
        console.error('审查出错:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: error.message || ERROR_MESSAGES.REVIEW_FAILED
        });
    }
});

/**
 * 健康检查
 */
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: '2.5.0',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;