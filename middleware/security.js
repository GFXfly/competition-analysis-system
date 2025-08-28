const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const { APP_CONFIG, ERROR_MESSAGES } = require('../config/constants');
const { ErrorHandler } = require('../utils/errorHandler');

/**
 * 安全中间件模块
 * 提供全面的应用安全保护
 */

/**
 * 基础安全头设置
 */
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false, // 避免影响文件上传
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * CORS 配置
 */
const corsOptions = {
    origin: function (origin, callback) {
        // 允许同源请求和开发环境
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            callback(null, true);
        } else if (process.env.NODE_ENV === 'production') {
            // 生产环境需要配置允许的域名
            const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('CORS政策不允许此源'), false);
            }
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

/**
 * API速率限制配置
 */
const createRateLimiter = (options = {}) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // 15分钟
        max: options.max || 100, // 最大请求数
        message: {
            error: true,
            message: '请求过于频繁，请稍后再试',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next, options) => {
            console.warn(`⚠️ 速率限制触发 - IP: ${req.ip}, Path: ${req.path}`);
            ErrorHandler.logError({
                name: 'RateLimitError',
                message: `Rate limit exceeded for IP: ${req.ip}`,
                statusCode: 429,
                isOperational: true
            }, req);
            res.status(429).json(options.message);
        },
        skip: (req, res) => {
            // 跳过健康检查和静态资源
            return req.path === '/health' || req.path.startsWith('/css/') || req.path.startsWith('/js/');
        }
    });
};

/**
 * 不同端点的速率限制策略
 */
const rateLimiters = {
    // 严格限制：文件上传和AI审查
    strict: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 10 // 最多10次请求
    }),
    
    // 中等限制：一般API
    moderate: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 50 // 最多50次请求
    }),
    
    // 宽松限制：静态资源和非敏感操作
    lenient: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 200 // 最多200次请求
    })
};

/**
 * 输入验证中间件
 */
const validateInput = {
    // 文件上传验证
    fileUpload: [
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('描述不能超过500字符')
            .trim()
            .escape(),
        
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: '输入验证失败',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }
            next();
        }
    ],

    // 文本输入验证
    textInput: [
        body('text')
            .notEmpty()
            .withMessage('文本内容不能为空')
            .isLength({ min: 10, max: APP_CONFIG.MAX_TEXT_LENGTH })
            .withMessage(`文本长度必须在10到${APP_CONFIG.MAX_TEXT_LENGTH}字符之间`)
            .trim(),
            
        body('options')
            .optional()
            .isObject()
            .withMessage('选项必须是对象格式'),
            
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: '输入验证失败',
                    code: 'VALIDATION_ERROR',
                    details: errors.array()
                });
            }
            next();
        }
    ]
};

/**
 * 安全检查中间件
 */
const securityChecks = {
    // 检查可疑文件内容
    suspiciousContent: (req, res, next) => {
        if (req.file) {
            const filename = req.file.originalname.toLowerCase();
            const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.js', '.vbs', '.jar'];
            
            if (suspiciousExtensions.some(ext => filename.endsWith(ext))) {
                console.warn(`⚠️ 可疑文件上传尝试: ${filename} from IP: ${req.ip}`);
                return res.status(400).json({
                    error: true,
                    message: '检测到可疑文件类型',
                    code: 'SUSPICIOUS_FILE_TYPE'
                });
            }
        }
        next();
    },

    // 检查请求大小
    requestSize: (req, res, next) => {
        const contentLength = req.get('content-length');
        if (contentLength && parseInt(contentLength) > APP_CONFIG.MAX_FILE_SIZE) {
            console.warn(`⚠️ 请求大小超限: ${contentLength} bytes from IP: ${req.ip}`);
            return res.status(413).json({
                error: true,
                message: '请求内容过大',
                code: 'PAYLOAD_TOO_LARGE'
            });
        }
        next();
    },

    // 检查用户代理
    userAgent: (req, res, next) => {
        const userAgent = req.get('User-Agent');
        if (!userAgent || userAgent.length < 10) {
            console.warn(`⚠️ 可疑用户代理: "${userAgent}" from IP: ${req.ip}`);
            // 不阻止，但记录日志
        }
        next();
    }
};

/**
 * 日志记录中间件
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // 记录请求开始
    console.log(`📝 ${req.method} ${req.path} - IP: ${req.ip} - UA: ${req.get('User-Agent')?.substring(0, 50) || 'Unknown'}`);
    
    // 拦截响应结束事件
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        console.log(`📝 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        
        // 记录错误响应
        if (res.statusCode >= 400) {
            ErrorHandler.logError({
                name: 'HTTPError',
                message: `HTTP ${res.statusCode} - ${req.method} ${req.path}`,
                statusCode: res.statusCode,
                isOperational: true
            }, req);
        }
        
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

/**
 * 错误处理中间件（应该在所有路由之后）
 */
const errorMiddleware = (err, req, res, next) => {
    // 委托给统一错误处理器
    ErrorHandler.handle(err, req, res, next);
};

/**
 * 健康检查端点
 */
const healthCheck = (req, res) => {
    const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(healthData);
};

/**
 * 安全中间件套件
 */
const securitySuite = {
    // 基础安全设置
    basic: [
        securityHeaders,
        cors(corsOptions),
        requestLogger,
        securityChecks.requestSize,
        securityChecks.userAgent
    ],
    
    // 文件上传安全
    fileUpload: [
        rateLimiters.strict,
        securityChecks.suspiciousContent,
        ...validateInput.fileUpload
    ],
    
    // API调用安全
    apiCall: [
        rateLimiters.moderate,
        ...validateInput.textInput
    ],
    
    // 一般请求安全
    general: [
        rateLimiters.lenient
    ]
};

module.exports = {
    // 中间件套件
    securitySuite,
    
    // 单个中间件
    securityHeaders,
    corsOptions,
    rateLimiters,
    validateInput,
    securityChecks,
    requestLogger,
    errorMiddleware,
    healthCheck,
    
    // 工具函数
    createRateLimiter
};