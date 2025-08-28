// 应用配置常量
const APP_CONFIG = {
    // 服务器配置
    PORT: process.env.PORT || 3000,
    TIMEOUT: 300000, // 5分钟超时
    
    // 文件上传限制
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB - 与express配置保持一致
    ALLOWED_MIME_TYPES: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
    ],
    ALLOWED_EXTENSIONS: ['docx', 'doc', 'txt'],
    
    // AI服务商配置 - 支持多服务商，符合公平竞争要求
    AI_PROVIDERS: {
        DEEPSEEK: {
            name: 'DeepSeek',
            baseURL: 'https://api.deepseek.com/chat/completions',
            models: { 
                chat: 'deepseek-chat', 
                reasoner: 'deepseek-reasoner' 
            },
            keyEnvVar: 'DEEPSEEK_API_KEY'
        },
        SILICONFLOW: {
            name: 'SiliconFlow',
            baseURL: 'https://api.siliconflow.cn/v1/chat/completions',
            models: { 
                chat: 'deepseek-ai/DeepSeek-R1', 
                reasoner: 'deepseek-ai/DeepSeek-R1' 
            },
            keyEnvVar: 'SILICONFLOW_API_KEY'
        },
        OPENAI: {
            name: 'OpenAI',
            baseURL: 'https://api.openai.com/v1/chat/completions',
            models: { 
                chat: 'gpt-4', 
                reasoner: 'gpt-4o' 
            },
            keyEnvVar: 'OPENAI_API_KEY'
        }
    },
    DEFAULT_PROVIDER: process.env.AI_PROVIDER || 'SILICONFLOW',
    FALLBACK_PROVIDERS: ['DEEPSEEK', 'OPENAI'],
    AI_TIMEOUT: 120000, // 2分钟
    PRECHECK_TIMEOUT: 15000, // 15秒
    
    // 缓存配置
    CACHE_DURATION: 30 * 60 * 1000, // 30分钟
    
    // 日志配置
    MAX_LOG_RECORDS: 1000,
    LOG_CLEANUP_DAYS: 90,
    
    // 文本处理配置
    MAX_TEXT_LENGTH: 50000,
    PRECHECK_TEXT_LENGTH: 2000,
    DETAILED_REVIEW_TEXT_LENGTH: 4000
};

// 错误消息
const ERROR_MESSAGES = {
    NO_FILE: '未上传文件',
    FILE_TOO_LARGE: '文件大小超过限制',
    INVALID_FILE_TYPE: '不支持的文件类型',
    FILE_EMPTY: '文件为空或损坏',
    API_KEY_MISSING: '未配置API密钥',
    API_TIMEOUT: '网络连接超时，请检查网络连接',
    API_ERROR: 'API服务错误',
    NETWORK_ERROR: '无法连接到AI服务，请检查网络连接',
    EXTRACTION_FAILED: '文档内容提取失败',
    REVIEW_FAILED: '审查过程失败',
    EXPORT_FAILED: '导出报告失败'
};

// 成功消息
const SUCCESS_MESSAGES = {
    FILE_UPLOADED: '文件上传成功',
    EXTRACTION_SUCCESS: '文档内容提取成功',
    PRECHECK_SUCCESS: 'AI预判断成功完成',
    REVIEW_SUCCESS: 'AI审查完成',
    EXPORT_SUCCESS: '报告导出成功',
    LOG_RECORDED: '审查日志记录成功'
};

// 处理方式映射
const PROCESSING_METHODS = {
    AI_DETAILED_REVIEW: 'ai_detailed_review',
    AI_PRECHECK: 'ai_precheck',
    KEYWORD_FILTER: 'keyword_filter',
    KEYWORD_FALLBACK: 'keyword_fallback',
    MOCK_FALLBACK: 'mock_fallback'
};

// HTTP状态码
const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

// 日志级别
const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

module.exports = {
    APP_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    PROCESSING_METHODS,
    HTTP_STATUS,
    LOG_LEVELS
};