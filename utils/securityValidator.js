const path = require('path');
const { APP_CONFIG, ERROR_MESSAGES } = require('../config/constants');

/**
 * 文件安全验证器
 */
class FileSecurityValidator {
    /**
     * 验证文件基本信息
     */
    static validateFileBasics(file) {
        if (!file) {
            return { valid: false, message: ERROR_MESSAGES.NO_FILE };
        }

        // 文件大小检查
        if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
            return { valid: false, message: ERROR_MESSAGES.FILE_TOO_LARGE };
        }

        // 文件名安全检查
        const fileNameValidation = this.validateFileName(file.originalname);
        if (!fileNameValidation.valid) {
            return fileNameValidation;
        }

        // MIME类型验证
        const mimeValidation = this.validateMimeType(file.mimetype, file.originalname);
        if (!mimeValidation.valid) {
            return mimeValidation;
        }

        return { valid: true };
    }

    /**
     * 验证文件名安全性
     */
    static validateFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return { valid: false, message: '文件名无效' };
        }

        // 长度检查
        if (fileName.length > 255) {
            return { valid: false, message: '文件名过长' };
        }

        // 危险字符检查
        const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (dangerousChars.test(fileName)) {
            return { valid: false, message: '文件名包含非法字符' };
        }

        // 危险扩展名检查
        const extension = path.extname(fileName).toLowerCase();
        const dangerousExtensions = [
            '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
            '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1', '.py', '.rb'
        ];
        
        if (dangerousExtensions.includes(extension)) {
            return { valid: false, message: '不支持的文件类型' };
        }

        // 隐藏文件检查
        if (fileName.startsWith('.')) {
            return { valid: false, message: '不支持隐藏文件' };
        }

        // 保留名称检查 (Windows)
        const reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
            'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4',
            'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];
        
        const baseName = path.basename(fileName, path.extname(fileName)).toUpperCase();
        if (reservedNames.includes(baseName)) {
            return { valid: false, message: '文件名为系统保留名称' };
        }

        return { valid: true };
    }

    /**
     * 验证MIME类型
     */
    static validateMimeType(mimetype, fileName) {
        // 允许的MIME类型
        const allowedTypes = APP_CONFIG.ALLOWED_MIME_TYPES;
        
        // 从文件名获取扩展名
        const extension = path.extname(fileName).toLowerCase().slice(1);
        const allowedExtensions = APP_CONFIG.ALLOWED_EXTENSIONS;

        // MIME类型检查
        const isMimeValid = allowedTypes.includes(mimetype);
        
        // 扩展名检查
        const isExtensionValid = allowedExtensions.includes(extension);

        // 至少满足一个条件
        if (!isMimeValid && !isExtensionValid) {
            return { 
                valid: false, 
                message: `不支持的文件类型。支持的格式: ${allowedExtensions.join(', ')}` 
            };
        }

        // MIME类型与扩展名不匹配检查（防止伪造）
        const mimeExtensionMap = {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/msword': 'doc',
            'text/plain': 'txt'
        };

        const expectedExtension = mimeExtensionMap[mimetype];
        if (expectedExtension && expectedExtension !== extension && isMimeValid) {
            console.warn(`MIME类型与扩展名不匹配: MIME=${mimetype}, 扩展名=${extension}`);
            // 不阻止，但记录警告
        }

        return { valid: true };
    }

    /**
     * 验证文件内容头部（防止文件伪造）
     */
    static validateFileHeader(buffer, fileName) {
        if (!buffer || buffer.length < 4) {
            return { valid: false, message: '文件内容无效' };
        }

        const extension = path.extname(fileName).toLowerCase();
        const header = buffer.slice(0, 8);

        // 文件头部签名检查
        const signatures = {
            '.docx': [0x50, 0x4B], // ZIP文件头部（DOCX是ZIP格式）
            '.doc': [0xD0, 0xCF, 0x11, 0xE0], // OLE文档头部
            '.txt': null // 文本文件没有固定头部
        };

        const expectedSignature = signatures[extension];
        if (expectedSignature) {
            for (let i = 0; i < expectedSignature.length; i++) {
                if (header[i] !== expectedSignature[i]) {
                    return { 
                        valid: false, 
                        message: '文件格式与扩展名不匹配，可能是伪造文件' 
                    };
                }
            }
        }

        return { valid: true };
    }

    /**
     * 检查文件内容安全性
     */
    static validateFileContent(buffer) {
        if (!buffer || buffer.length === 0) {
            return { valid: false, message: '文件内容为空' };
        }

        // 检查文件大小是否合理
        if (buffer.length < 100) {
            return { valid: false, message: '文件内容过小，可能已损坏' };
        }

        // 检查是否包含可疑的二进制模式
        const suspiciousPatterns = [
            // 常见的恶意代码模式
            Buffer.from('eval('), 
            Buffer.from('<script'),
            Buffer.from('javascript:'),
            Buffer.from('vbscript:'),
            Buffer.from('file://'),
            Buffer.from('data:'),
        ];

        for (const pattern of suspiciousPatterns) {
            if (buffer.includes(pattern)) {
                console.warn('检测到可疑内容模式');
                // 不直接拒绝，但记录警告
            }
        }

        return { valid: true };
    }

    /**
     * 综合文件验证
     */
    static async validateFile(file) {
        // 基础验证
        const basicValidation = this.validateFileBasics(file);
        if (!basicValidation.valid) {
            return basicValidation;
        }

        // 文件头部验证
        if (file.buffer) {
            const headerValidation = this.validateFileHeader(file.buffer, file.originalname);
            if (!headerValidation.valid) {
                return headerValidation;
            }

            // 内容验证
            const contentValidation = this.validateFileContent(file.buffer);
            if (!contentValidation.valid) {
                return contentValidation;
            }
        }

        return { valid: true };
    }
}

/**
 * 输入安全验证器
 */
class InputSecurityValidator {
    /**
     * 验证文本输入
     */
    static validateTextInput(text, maxLength = 100000) {
        if (typeof text !== 'string') {
            return { valid: false, message: '输入必须是字符串' };
        }

        if (text.length > maxLength) {
            return { valid: false, message: `输入长度超过限制(${maxLength}字符)` };
        }

        // 检查危险字符
        const dangerousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /on\w+\s*=/gi,
            /<[^>]*>/g // HTML标签
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(text)) {
                return { valid: false, message: '输入包含不安全内容' };
            }
        }

        return { valid: true };
    }

    /**
     * 清理和转义文本
     */
    static sanitizeText(text) {
        if (typeof text !== 'string') {
            return '';
        }

        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }

    /**
     * 验证JSON输入
     */
    static validateJSONInput(jsonString, maxSize = 1024 * 1024) { // 1MB
        if (typeof jsonString !== 'string') {
            return { valid: false, message: 'JSON输入必须是字符串' };
        }

        if (jsonString.length > maxSize) {
            return { valid: false, message: 'JSON数据过大' };
        }

        try {
            const parsed = JSON.parse(jsonString);
            
            // 检查嵌套深度
            const maxDepth = 10;
            if (this.getObjectDepth(parsed) > maxDepth) {
                return { valid: false, message: 'JSON嵌套层次过深' };
            }

            return { valid: true, data: parsed };
        } catch (error) {
            return { valid: false, message: 'JSON格式无效' };
        }
    }

    /**
     * 获取对象嵌套深度
     */
    static getObjectDepth(obj, depth = 0) {
        if (depth > 20) return depth; // 防止无限递归
        
        if (obj === null || typeof obj !== 'object') {
            return depth;
        }

        if (Array.isArray(obj)) {
            return Math.max(...obj.map(item => this.getObjectDepth(item, depth + 1)));
        }

        const depths = Object.values(obj).map(value => this.getObjectDepth(value, depth + 1));
        return depths.length > 0 ? Math.max(...depths) : depth;
    }
}

/**
 * 速率限制器（简单实现）
 */
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // 每分钟清理一次
    }

    /**
     * 检查速率限制
     */
    checkRateLimit(clientIP, windowMs = 60000, maxRequests = 10) {
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!this.requests.has(clientIP)) {
            this.requests.set(clientIP, []);
        }

        const clientRequests = this.requests.get(clientIP);
        
        // 移除过期请求
        const validRequests = clientRequests.filter(timestamp => timestamp > windowStart);
        
        if (validRequests.length >= maxRequests) {
            return { 
                allowed: false, 
                message: '请求过于频繁，请稍后再试',
                retryAfter: Math.ceil((validRequests[0] - windowStart) / 1000)
            };
        }

        // 添加当前请求
        validRequests.push(now);
        this.requests.set(clientIP, validRequests);

        return { allowed: true };
    }

    /**
     * 清理过期数据
     */
    cleanup() {
        const now = Date.now();
        const oneHourAgo = now - 3600000; // 1小时前

        for (const [clientIP, requests] of this.requests.entries()) {
            const validRequests = requests.filter(timestamp => timestamp > oneHourAgo);
            if (validRequests.length === 0) {
                this.requests.delete(clientIP);
            } else {
                this.requests.set(clientIP, validRequests);
            }
        }
    }

    /**
     * 销毁实例
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.requests.clear();
    }
}

// 创建全局速率限制器实例
const globalRateLimiter = new RateLimiter();

module.exports = {
    FileSecurityValidator,
    InputSecurityValidator,
    RateLimiter,
    globalRateLimiter
};