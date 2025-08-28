const { LOG_LEVELS } = require('../config/constants');

/**
 * 统一的应用错误类
 */
class AppError extends Error {
    constructor(message, statusCode, isOperational = true, errorCode = null) {
        super(message);
        
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errorCode = errorCode;
        this.timestamp = new Date().toISOString();
        
        // 设置错误名称
        this.name = this.constructor.name;
        
        // 捕获堆栈跟踪（不包括构造函数调用）
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * AI服务错误类
 */
class AIServiceError extends AppError {
    constructor(message, provider, statusCode = 503, originalError = null) {
        super(message, statusCode, true, 'AI_SERVICE_ERROR');
        this.provider = provider;
        this.originalError = originalError;
    }
}

/**
 * 文件处理错误类
 */
class FileProcessingError extends AppError {
    constructor(message, filename, statusCode = 400) {
        super(message, statusCode, true, 'FILE_PROCESSING_ERROR');
        this.filename = filename;
    }
}

/**
 * 审查业务错误类
 */
class ReviewError extends AppError {
    constructor(message, reviewId, statusCode = 422) {
        super(message, statusCode, true, 'REVIEW_ERROR');
        this.reviewId = reviewId;
    }
}

/**
 * 验证错误类
 */
class ValidationError extends AppError {
    constructor(message, field, value, statusCode = 400) {
        super(message, statusCode, true, 'VALIDATION_ERROR');
        this.field = field;
        this.value = value;
    }
}

/**
 * 统一错误处理器类
 */
class ErrorHandler {
    /**
     * Express中间件错误处理函数
     */
    static handle(err, req, res, next) {
        let error = { ...err };
        error.message = err.message;
        
        // 记录错误日志（不包含敏感信息）
        ErrorHandler.logError(error, req);
        
        // 处理不同类型的错误
        error = ErrorHandler.categorizeError(error, req);
        
        // 发送客户端友好的错误响应
        ErrorHandler.sendErrorResponse(error, res);
    }

    /**
     * 记录错误日志
     */
    static logError(error, req = null) {
        const logData = {
            timestamp: new Date().toISOString(),
            error: {
                name: error.name,
                message: error.message,
                code: error.errorCode,
                statusCode: error.statusCode,
                isOperational: error.isOperational
            }
        };

        // 添加请求信息（不包含敏感数据）
        if (req) {
            logData.request = {
                method: req.method,
                url: req.originalUrl,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                // 不记录完整请求体，防止泄露敏感信息
                hasFile: !!req.file,
                fileSize: req.file ? req.file.size : null
            };
        }

        // 添加提供商信息（如果是AI服务错误）
        if (error instanceof AIServiceError) {
            logData.aiProvider = error.provider;
        }

        // 根据错误级别记录日志
        if (error.statusCode >= 500) {
            console.error('🚨 服务器错误:', JSON.stringify(logData, null, 2));
        } else if (error.statusCode >= 400) {
            console.warn('⚠️ 客户端错误:', JSON.stringify(logData, null, 2));
        } else {
            console.info('ℹ️ 信息错误:', JSON.stringify(logData, null, 2));
        }

        // 在生产环境中，可以将错误发送到外部日志服务
        if (process.env.NODE_ENV === 'production') {
            // ErrorHandler.sendToLoggingService(logData);
        }
    }

    /**
     * 错误分类和标准化处理
     */
    static categorizeError(error, req) {
        // API超时错误
        if (error.code === 'ECONNABORTED') {
            return new AppError('服务暂时不可用，请稍后重试', 503, true, 'SERVICE_TIMEOUT');
        }

        // 网络连接错误
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new AppError('无法连接到外部服务', 503, true, 'NETWORK_ERROR');
        }

        // 文件大小超限错误
        if (error.code === 'LIMIT_FILE_SIZE') {
            return new FileProcessingError('上传文件大小超过限制', req?.file?.originalname || 'unknown');
        }

        // JSON解析错误
        if (error.type === 'entity.parse.failed') {
            return new ValidationError('请求数据格式错误', 'body', null);
        }

        // MongoDB错误处理
        if (error.name === 'MongoError') {
            return new AppError('数据库操作失败', 500, true, 'DATABASE_ERROR');
        }

        // 验证错误
        if (error.name === 'ValidationError') {
            return new ValidationError('输入数据验证失败', error.path, error.value);
        }

        // JWT错误
        if (error.name === 'JsonWebTokenError') {
            return new AppError('认证令牌无效', 401, true, 'INVALID_TOKEN');
        }

        if (error.name === 'TokenExpiredError') {
            return new AppError('认证令牌已过期', 401, true, 'EXPIRED_TOKEN');
        }

        // 如果已经是我们的自定义错误类型，直接返回
        if (error instanceof AppError) {
            return error;
        }

        // 未分类的错误
        return new AppError(
            error.isOperational ? error.message : '服务器内部错误',
            error.statusCode || 500,
            error.isOperational || false,
            'UNCLASSIFIED_ERROR'
        );
    }

    /**
     * 发送错误响应给客户端
     */
    static sendErrorResponse(error, res) {
        const response = {
            error: true,
            message: error.message,
            code: error.errorCode,
            timestamp: error.timestamp || new Date().toISOString()
        };

        // 在开发环境中添加更多调试信息
        if (process.env.NODE_ENV === 'development') {
            response.stack = error.stack;
            response.statusCode = error.statusCode;
            
            // 添加特定错误类型的额外信息
            if (error instanceof AIServiceError) {
                response.provider = error.provider;
            }
            
            if (error instanceof FileProcessingError) {
                response.filename = error.filename;
            }
            
            if (error instanceof ValidationError) {
                response.field = error.field;
                response.value = error.value;
            }
        }

        res.status(error.statusCode || 500).json(response);
    }

    /**
     * 异步错误处理包装器
     * 用于包装async/await函数，自动捕获错误
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * 未捕获的异常处理
     */
    static setupUncaughtExceptionHandlers() {
        // 处理未捕获的Promise拒绝
        process.on('unhandledRejection', (reason, promise) => {
            console.error('🚨 未处理的Promise拒绝:', reason);
            
            // 记录到日志
            ErrorHandler.logError({
                name: 'UnhandledRejection',
                message: reason.message || reason,
                stack: reason.stack,
                promise: promise,
                isOperational: false
            });
            
            // 优雅关闭服务器
            process.exit(1);
        });

        // 处理未捕获的异常
        process.on('uncaughtException', (error) => {
            console.error('🚨 未捕获的异常:', error);
            
            // 记录到日志
            ErrorHandler.logError({
                name: 'UncaughtException',
                message: error.message,
                stack: error.stack,
                isOperational: false
            });
            
            // 立即退出进程
            process.exit(1);
        });

        // SIGTERM信号处理
        process.on('SIGTERM', () => {
            console.log('👋 收到SIGTERM信号，正在优雅关闭...');
            process.exit(0);
        });

        // SIGINT信号处理 (Ctrl+C)
        process.on('SIGINT', () => {
            console.log('👋 收到SIGINT信号，正在优雅关闭...');
            process.exit(0);
        });
    }

    /**
     * 创建特定类型的错误
     */
    static createAIError(message, provider, originalError = null) {
        return new AIServiceError(message, provider, 503, originalError);
    }

    static createFileError(message, filename) {
        return new FileProcessingError(message, filename);
    }

    static createValidationError(message, field, value) {
        return new ValidationError(message, field, value);
    }

    static createReviewError(message, reviewId) {
        return new ReviewError(message, reviewId);
    }

    /**
     * 检查错误是否为操作性错误
     */
    static isOperationalError(error) {
        if (error instanceof AppError) {
            return error.isOperational;
        }
        return false;
    }
}

// 设置全局异常处理
ErrorHandler.setupUncaughtExceptionHandlers();

module.exports = {
    ErrorHandler,
    AppError,
    AIServiceError,
    FileProcessingError,
    ReviewError,
    ValidationError
};