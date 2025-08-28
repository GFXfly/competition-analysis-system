/**
 * 用户反馈增强工具
 * 提供用户友好的错误消息、进度提示和操作指导
 */

const { APP_CONFIG, ERROR_MESSAGES } = require('../config/constants');

class UserFeedbackEnhancer {
    constructor() {
        this.feedbackHistory = new Map(); // 记录用户反馈历史，用于个性化
    }
    
    /**
     * 生成用户友好的错误消息
     */
    generateFriendlyErrorMessage(error, context = {}) {
        const { type, originalError, provider, filename, field } = error;
        const userAgent = context.userAgent || '';
        const isChineseUser = this.detectChineseUser(userAgent, context);
        
        let message = {
            title: '',
            description: '',
            suggestion: '',
            action: '',
            severity: 'error',
            errorCode: error.errorCode || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
        };
        
        switch (error.errorCode || error.constructor.name) {
            case 'AI_SERVICE_ERROR':
                message = this.handleAIServiceError(error, isChineseUser);
                break;
                
            case 'FILE_PROCESSING_ERROR':
                message = this.handleFileProcessingError(error, isChineseUser);
                break;
                
            case 'VALIDATION_ERROR':
                message = this.handleValidationError(error, isChineseUser);
                break;
                
            case 'NETWORK_ERROR':
                message = this.handleNetworkError(error, isChineseUser);
                break;
                
            case 'RATE_LIMITED':
                message = this.handleRateLimitError(error, isChineseUser);
                break;
                
            default:
                message = this.handleGenericError(error, isChineseUser);
        }
        
        // 添加技术支持信息
        message.support = {
            contact: 'support@faircompetition.gov.cn',
            helpUrl: '/help',
            ticketUrl: '/support/create-ticket',
            knowledgeBase: '/help/troubleshooting'
        };
        
        return message;
    }
    
    /**
     * 处理AI服务错误
     */
    handleAIServiceError(error, isChineseUser) {
        const { provider } = error;
        
        if (error.message.includes('401') || error.message.includes('authentication')) {
            return {
                title: isChineseUser ? 'AI服务认证失败' : 'AI Service Authentication Failed',
                description: isChineseUser 
                    ? `${provider} API密钥无效或已过期。系统将自动尝试备用服务。`
                    : `${provider} API key is invalid or expired. System will try backup service.`,
                suggestion: isChineseUser
                    ? '请联系系统管理员检查API密钥配置，或稍后重试。'
                    : 'Please contact system administrator to check API key configuration, or retry later.',
                action: 'RETRY_WITH_BACKUP',
                severity: 'warning'
            };
        }
        
        if (error.message.includes('quota') || error.message.includes('limit')) {
            return {
                title: isChineseUser ? 'AI服务配额不足' : 'AI Service Quota Exceeded',
                description: isChineseUser
                    ? `${provider} 服务配额已达上限。系统正在尝试备用服务。`
                    : `${provider} service quota has been exceeded. System is trying backup service.`,
                suggestion: isChineseUser
                    ? '请稍后重试，或联系管理员增加服务配额。'
                    : 'Please retry later, or contact administrator to increase service quota.',
                action: 'WAIT_AND_RETRY',
                severity: 'warning'
            };
        }
        
        return {
            title: isChineseUser ? 'AI服务暂时不可用' : 'AI Service Temporarily Unavailable',
            description: isChineseUser
                ? `${provider} 服务出现技术问题。系统已启用本地智能分析作为备用方案。`
                : `${provider} service is experiencing technical issues. Local intelligent analysis has been activated as backup.`,
            suggestion: isChineseUser
                ? '您可以继续使用，系统会提供基础的合规性分析。完整的AI分析功能稍后会恢复。'
                : 'You can continue to use the service. Basic compliance analysis will be provided. Full AI analysis will be restored later.',
            action: 'CONTINUE_WITH_BACKUP',
            severity: 'info'
        };
    }
    
    /**
     * 处理文件处理错误
     */
    handleFileProcessingError(error, isChineseUser) {
        const { filename } = error;
        
        if (error.message.includes('size') || error.message.includes('大小')) {
            return {
                title: isChineseUser ? '文件大小超出限制' : 'File Size Exceeds Limit',
                description: isChineseUser
                    ? `文件 "${filename}" 大小超过 ${APP_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB 限制。`
                    : `File "${filename}" exceeds ${APP_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit.`,
                suggestion: isChineseUser
                    ? '请压缩文件或分割为多个较小的文档后重新上传。'
                    : 'Please compress the file or split it into smaller documents before uploading.',
                action: 'COMPRESS_AND_RETRY',
                severity: 'error'
            };
        }
        
        if (error.message.includes('type') || error.message.includes('格式')) {
            return {
                title: isChineseUser ? '不支持的文件格式' : 'Unsupported File Format',
                description: isChineseUser
                    ? `文件 "${filename}" 格式不受支持。支持的格式：${APP_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`
                    : `File "${filename}" format is not supported. Supported formats: ${APP_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`,
                suggestion: isChineseUser
                    ? '请将文件转换为支持的格式后重新上传。'
                    : 'Please convert the file to a supported format and upload again.',
                action: 'CONVERT_FORMAT',
                severity: 'error'
            };
        }
        
        return {
            title: isChineseUser ? '文件处理失败' : 'File Processing Failed',
            description: isChineseUser
                ? `无法处理文件 "${filename}"。可能是文件损坏或格式异常。`
                : `Failed to process file "${filename}". The file may be corrupted or have formatting issues.`,
            suggestion: isChineseUser
                ? '请检查文件完整性，或尝试重新生成文档后上传。'
                : 'Please check file integrity, or try regenerating the document before uploading.',
            action: 'CHECK_FILE_INTEGRITY',
            severity: 'error'
        };
    }
    
    /**
     * 处理验证错误
     */
    handleValidationError(error, isChineseUser) {
        const { field, value } = error;
        
        return {
            title: isChineseUser ? '输入数据验证失败' : 'Input Data Validation Failed',
            description: isChineseUser
                ? `字段 "${field}" 的值不符合要求。`
                : `Value for field "${field}" does not meet requirements.`,
            suggestion: isChineseUser
                ? '请检查输入格式并确保所有必填字段都已正确填写。'
                : 'Please check input format and ensure all required fields are filled correctly.',
            action: 'CORRECT_INPUT',
            severity: 'error',
            fieldInfo: {
                field,
                value: typeof value === 'string' ? value.substring(0, 50) : value
            }
        };
    }
    
    /**
     * 处理网络错误
     */
    handleNetworkError(error, isChineseUser) {
        return {
            title: isChineseUser ? '网络连接问题' : 'Network Connection Issue',
            description: isChineseUser
                ? '无法连接到服务器或网络不稳定。'
                : 'Unable to connect to server or network is unstable.',
            suggestion: isChineseUser
                ? '请检查网络连接，稍后重试。如果问题持续存在，请联系技术支持。'
                : 'Please check your network connection and retry later. If the problem persists, contact technical support.',
            action: 'CHECK_NETWORK',
            severity: 'warning'
        };
    }
    
    /**
     * 处理限流错误
     */
    handleRateLimitError(error, isChineseUser) {
        const retryAfter = error.retryAfter || 60;
        
        return {
            title: isChineseUser ? '请求过于频繁' : 'Too Many Requests',
            description: isChineseUser
                ? `请求频率过高，请等待 ${retryAfter} 秒后重试。`
                : `Request rate too high, please wait ${retryAfter} seconds before retrying.`,
            suggestion: isChineseUser
                ? '为了确保服务质量，系统对请求频率有限制。请耐心等待。'
                : 'To ensure service quality, the system limits request frequency. Please be patient.',
            action: 'WAIT_AND_RETRY',
            severity: 'info',
            retryAfter
        };
    }
    
    /**
     * 处理通用错误
     */
    handleGenericError(error, isChineseUser) {
        return {
            title: isChineseUser ? '系统内部错误' : 'Internal System Error',
            description: isChineseUser
                ? '系统遇到了预期之外的问题，我们正在努力解决。'
                : 'The system encountered an unexpected problem. We are working to resolve it.',
            suggestion: isChineseUser
                ? '请稍后重试。如果问题持续存在，请联系技术支持并提供错误代码。'
                : 'Please retry later. If the problem persists, contact technical support with the error code.',
            action: 'RETRY_OR_CONTACT_SUPPORT',
            severity: 'error'
        };
    }
    
    /**
     * 检测是否为中文用户
     */
    detectChineseUser(userAgent, context) {
        const { acceptLanguage, ip } = context;
        
        // 检查Accept-Language头
        if (acceptLanguage && (acceptLanguage.includes('zh') || acceptLanguage.includes('cn'))) {
            return true;
        }
        
        // 默认使用中文（因为这是中文系统）
        return true;
    }
    
    /**
     * 生成进度反馈消息
     */
    generateProgressMessage(stage, progress, isChineseUser = true) {
        const stages = {
            'file_upload': {
                zh: '正在上传文件...',
                en: 'Uploading file...'
            },
            'file_processing': {
                zh: '正在处理文档内容...',
                en: 'Processing document content...'
            },
            'ai_analysis': {
                zh: '正在进行AI智能分析...',
                en: 'Performing AI intelligent analysis...'
            },
            'compliance_check': {
                zh: '正在检查合规性...',
                en: 'Checking compliance...'
            },
            'generating_report': {
                zh: '正在生成审查报告...',
                en: 'Generating review report...'
            },
            'completed': {
                zh: '分析完成！',
                en: 'Analysis completed!'
            }
        };
        
        const stageInfo = stages[stage] || stages['ai_analysis'];
        const message = isChineseUser ? stageInfo.zh : stageInfo.en;
        
        return {
            stage,
            message,
            progress: Math.min(Math.max(progress, 0), 100),
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 生成成功反馈消息
     */
    generateSuccessMessage(type, data, isChineseUser = true) {
        const messages = {
            'review_completed': {
                zh: `审查完成！发现 ${data.issueCount || 0} 个潜在问题，用时 ${data.duration || '未知'}。`,
                en: `Review completed! Found ${data.issueCount || 0} potential issues in ${data.duration || 'unknown'} time.`
            },
            'file_uploaded': {
                zh: `文件 "${data.filename}" 上传成功！`,
                en: `File "${data.filename}" uploaded successfully!`
            },
            'report_exported': {
                zh: '审查报告导出成功！',
                en: 'Review report exported successfully!'
            }
        };
        
        const messageInfo = messages[type] || messages['review_completed'];
        
        return {
            type: 'success',
            title: isChineseUser ? '操作成功' : 'Operation Successful',
            message: isChineseUser ? messageInfo.zh : messageInfo.en,
            data,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 记录用户反馈历史
     */
    recordFeedback(userId, feedback) {
        if (!this.feedbackHistory.has(userId)) {
            this.feedbackHistory.set(userId, []);
        }
        
        const userHistory = this.feedbackHistory.get(userId);
        userHistory.push({
            ...feedback,
            timestamp: new Date().toISOString()
        });
        
        // 保持最近50条记录
        if (userHistory.length > 50) {
            userHistory.splice(0, userHistory.length - 50);
        }
    }
    
    /**
     * 获取用户反馈统计
     */
    getFeedbackStats() {
        const stats = {
            totalUsers: this.feedbackHistory.size,
            totalFeedbacks: 0,
            errorTypes: {},
            recentErrors: []
        };
        
        for (const [userId, history] of this.feedbackHistory.entries()) {
            stats.totalFeedbacks += history.length;
            
            for (const feedback of history) {
                if (feedback.errorCode) {
                    stats.errorTypes[feedback.errorCode] = 
                        (stats.errorTypes[feedback.errorCode] || 0) + 1;
                }
            }
            
            // 收集最近的错误
            const recentErrors = history
                .filter(f => f.severity === 'error')
                .slice(-5);
            stats.recentErrors.push(...recentErrors);
        }
        
        return stats;
    }
}

// 单例模式
const userFeedbackEnhancer = new UserFeedbackEnhancer();

module.exports = {
    userFeedbackEnhancer,
    UserFeedbackEnhancer
};