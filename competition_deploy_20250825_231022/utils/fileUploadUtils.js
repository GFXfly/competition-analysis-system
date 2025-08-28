/**
 * 统一的文件上传工具函数
 * 解决文件名编码、安全验证等问题
 */

const iconv = require('iconv-lite');

/**
 * 简化的文件名清理函数
 * 替换复杂的多方案编码修复
 */
function sanitizeFileName(originalName) {
    if (!originalName) return 'unknown_file';
    
    console.log('清理文件名:', originalName);
    
    try {
        // 尝试修复常见的编码问题
        let fixedName = originalName;
        
        // 检查是否包含被错误编码的中文字符
        if (/[àáâãäåæçèéêëìíîïðñòóôõö÷øùúûüý]/.test(originalName)) {
            try {
                // 尝试从Latin-1转换为UTF-8
                const buffer = Buffer.from(originalName, 'latin1');
                const utf8Fixed = buffer.toString('utf8');
                if (/[\u4e00-\u9fa5]/.test(utf8Fixed) && !utf8Fixed.includes('�')) {
                    fixedName = utf8Fixed;
                    console.log('编码修复成功:', fixedName);
                }
            } catch (e) {
                console.log('编码修复失败，使用原名称');
            }
        }
        
        // 基本清理，保留中文、英文、数字和常用符号
        const cleaned = fixedName
            .replace(/[^\w\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\-_.()[\]]/g, '_')
            .replace(/_{2,}/g, '_') // 合并多个下划线
            .replace(/^_+|_+$/g, '') // 去除首尾下划线
            .trim();
        
        // 如果清理后为空或太短，使用默认名称
        if (!cleaned || cleaned.length < 2) {
            return 'document';
        }
        
        console.log('清理后文件名:', cleaned);
        return cleaned;
        
    } catch (error) {
        console.error('文件名清理错误:', error);
        // 如果出错，返回安全的默认名称
        const timestamp = Date.now().toString().slice(-6);
        return `document_${timestamp}`;
    }
}

/**
 * 验证文件头部魔数
 */
function validateFileSignature(buffer, expectedType) {
    if (!buffer || buffer.length < 4) return false;
    
    const fileSignatures = {
        'docx': [0x50, 0x4B, 0x03, 0x04], // ZIP signature
        'doc': [0xD0, 0xCF, 0x11, 0xE0],  // OLE signature
        'txt': null // 文本文件无固定签名
    };
    
    const signature = fileSignatures[expectedType];
    if (!signature) return true; // 如果没有定义签名，跳过检查
    
    for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
            return false;
        }
    }
    
    return true;
}

/**
 * 扫描文件内容中的潜在恶意内容
 */
function scanForMaliciousContent(buffer) {
    const suspiciousPatterns = [
        /javascript:/gi,
        /<script[^>]*>/gi,
        /eval\s*\(/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /onclick\s*=/gi,
        /document\.write/gi,
        /window\./gi
    ];
    
    // 只检查文件的前8KB内容，避免性能问题
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 8192));
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
            console.warn('检测到可疑内容模式:', pattern);
            return true;
        }
    }
    
    return false;
}

/**
 * 统一的文件验证函数
 */
async function validateUploadedFile(file) {
    const result = {
        valid: true,
        message: '',
        sanitizedName: ''
    };
    
    try {
        // 1. 基础检查
        if (!file || !file.buffer) {
            result.valid = false;
            result.message = '文件为空或损坏';
            return result;
        }
        
        // 2. 文件大小检查
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            result.valid = false;
            result.message = `文件大小超过限制 (${(MAX_SIZE / 1024 / 1024).toFixed(0)}MB)`;
            return result;
        }
        
        // 3. MIME类型检查
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain'
        ];
        
        if (!allowedTypes.includes(file.mimetype)) {
            result.valid = false;
            result.message = '不支持的文件类型，仅支持 .docx, .doc, .txt 格式';
            return result;
        }
        
        // 4. 文件扩展名检查
        const ext = file.originalname.split('.').pop().toLowerCase();
        const validExts = ['docx', 'doc', 'txt'];
        if (!validExts.includes(ext)) {
            result.valid = false;
            result.message = '文件扩展名与MIME类型不匹配';
            return result;
        }
        
        // 5. 文件头部签名验证
        if (!validateFileSignature(file.buffer, ext)) {
            result.valid = false;
            result.message = '文件头部签名验证失败，文件可能已损坏';
            return result;
        }
        
        // 6. 恶意内容扫描
        if (scanForMaliciousContent(file.buffer)) {
            result.valid = false;
            result.message = '文件包含可疑内容，上传被拒绝';
            return result;
        }
        
        // 7. 文件名清理
        result.sanitizedName = sanitizeFileName(file.originalname);
        
        console.log(`✅ 文件验证通过: ${result.sanitizedName}`);
        return result;
        
    } catch (error) {
        console.error('文件验证错误:', error);
        result.valid = false;
        result.message = `文件验证失败: ${error.message}`;
        return result;
    }
}

/**
 * 创建统一的multer配置
 */
function createUploadConfig() {
    const multer = require('multer');
    
    const storage = multer.memoryStorage();
    
    return multer({
        storage: storage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB，与express配置保持一致
            files: 1 // 只允许单文件上传
        },
        fileFilter: async (req, file, cb) => {
            try {
                console.log('=== 文件上传验证开始 ===');
                console.log('文件名:', file.originalname);
                console.log('MIME类型:', file.mimetype);
                console.log('编码:', file.encoding);
                
                // 预处理文件名
                const sanitizedName = sanitizeFileName(file.originalname);
                file.originalname = sanitizedName;
                
                console.log('处理后文件名:', file.originalname);
                console.log('=========================');
                
                // 接受文件，实际验证在后续处理中进行
                cb(null, true);
                
            } catch (error) {
                console.error('文件过滤器错误:', error);
                cb(new Error('文件上传预处理失败'));
            }
        }
    });
}

module.exports = {
    sanitizeFileName,
    validateFileSignature,
    scanForMaliciousContent,
    validateUploadedFile,
    createUploadConfig
};