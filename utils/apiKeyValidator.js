/**
 * API密钥快速验证工具
 * 避免浪费时间尝试无效的API密钥
 */

const KNOWN_INVALID_KEYS = [
    // 可以在这里添加已知无效的API密钥
];

const API_KEY_PATTERNS = {
    DEEPSEEK: /^sk-[a-zA-Z0-9]{32}$/,
    SILICONFLOW: /^sk-[a-zA-Z0-9]{40,50}$/,
    OPENAI: /^sk-[a-zA-Z0-9]{20,}$/
};

/**
 * 快速验证API密钥格式和已知状态
 */
function quickValidateApiKey(apiKey, provider) {
    if (!apiKey) {
        return { valid: false, reason: 'API密钥未配置' };
    }
    
    // 检查是否是已知的无效密钥
    if (KNOWN_INVALID_KEYS.includes(apiKey)) {
        return { valid: false, reason: '已知无效的API密钥，跳过尝试' };
    }
    
    // 简单的格式验证
    const pattern = API_KEY_PATTERNS[provider];
    if (pattern && !pattern.test(apiKey)) {
        return { valid: false, reason: 'API密钥格式不正确' };
    }
    
    return { valid: true, reason: 'API密钥格式检查通过' };
}

/**
 * 获取可用的API服务商（跳过已知无效的）
 */
function getValidProviders(providers) {
    const validProviders = [];
    
    for (const provider of providers) {
        const keyEnvVar = {
            DEEPSEEK: 'DEEPSEEK_API_KEY',
            SILICONFLOW: 'SILICONFLOW_API_KEY', 
            OPENAI: 'OPENAI_API_KEY'
        }[provider];
        
        if (keyEnvVar) {
            const apiKey = process.env[keyEnvVar];
            const validation = quickValidateApiKey(apiKey, provider);
            
            if (validation.valid) {
                validProviders.push({ provider, reason: validation.reason });
            } else {
                console.log(`⏭️ 跳过${provider}: ${validation.reason}`);
            }
        }
    }
    
    return validProviders;
}

module.exports = {
    quickValidateApiKey,
    getValidProviders,
    KNOWN_INVALID_KEYS
};