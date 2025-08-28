const fs = require('fs');
const path = require('path');
const { APP_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES, PROCESSING_METHODS, HTTP_STATUS, LOG_LEVELS } = require('./constants');

/**
 * 配置管理器
 * 提供集中的配置管理和验证功能
 */
class ConfigManager {
    constructor() {
        this.config = {};
        this.validators = new Map();
        this.watchers = new Map();
        this.environment = process.env.NODE_ENV || 'development';
        
        // 初始化配置
        this.loadConfiguration();
        
        // 注册默认验证器
        this.registerDefaultValidators();
        
        console.log(`📋 配置管理器初始化完成 - 环境: ${this.environment}`);
    }

    /**
     * 加载配置
     */
    loadConfiguration() {
        // 基础配置
        this.config = {
            app: { ...APP_CONFIG },
            messages: {
                error: { ...ERROR_MESSAGES },
                success: { ...SUCCESS_MESSAGES }
            },
            processing: { ...PROCESSING_METHODS },
            http: { ...HTTP_STATUS },
            logging: { ...LOG_LEVELS },
            environment: this.environment
        };

        // 从环境变量覆盖配置
        this.loadEnvironmentOverrides();
        
        // 加载环境特定的配置文件
        this.loadEnvironmentConfig();
        
        // 验证配置
        this.validateConfiguration();
    }

    /**
     * 从环境变量加载配置覆盖
     */
    loadEnvironmentOverrides() {
        const envMappings = {
            // 服务器配置
            'PORT': 'app.PORT',
            'NODE_ENV': 'environment',
            
            // AI服务配置
            'AI_PROVIDER': 'app.DEFAULT_PROVIDER',
            'AI_TIMEOUT': 'app.AI_TIMEOUT',
            'PRECHECK_TIMEOUT': 'app.PRECHECK_TIMEOUT',
            
            // API密钥
            'DEEPSEEK_API_KEY': 'app.AI_PROVIDERS.DEEPSEEK.apiKey',
            'SILICONFLOW_API_KEY': 'app.AI_PROVIDERS.SILICONFLOW.apiKey',
            'OPENAI_API_KEY': 'app.AI_PROVIDERS.OPENAI.apiKey',
            
            // 文件配置
            'MAX_FILE_SIZE': 'app.MAX_FILE_SIZE',
            'MAX_TEXT_LENGTH': 'app.MAX_TEXT_LENGTH',
            
            // 缓存配置
            'CACHE_DURATION': 'app.CACHE_DURATION',
            
            // 安全配置
            'ALLOWED_ORIGINS': 'security.allowedOrigins',
            'RATE_LIMIT_WINDOW': 'security.rateLimitWindow',
            'RATE_LIMIT_MAX': 'security.rateLimitMax',
            
            // 日志配置
            'LOG_LEVEL': 'logging.level',
            'LOG_DIR': 'logging.directory',
            'MAX_LOG_SIZE': 'logging.maxSize',
            'MAX_LOG_FILES': 'logging.maxFiles'
        };

        for (const [envVar, configPath] of Object.entries(envMappings)) {
            if (process.env[envVar]) {
                this.setConfigValue(configPath, this.parseEnvValue(process.env[envVar]));
                console.log(`🔧 环境变量覆盖: ${configPath} = ${process.env[envVar]}`);
            }
        }
    }

    /**
     * 解析环境变量值
     */
    parseEnvValue(value) {
        // 尝试解析为数字
        if (/^\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        
        // 尝试解析为布尔值
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        // 尝试解析为JSON
        if (value.startsWith('{') || value.startsWith('[')) {
            try {
                return JSON.parse(value);
            } catch (e) {
                // 如果解析失败，返回原字符串
            }
        }
        
        return value;
    }

    /**
     * 加载环境特定的配置文件
     */
    loadEnvironmentConfig() {
        const configDir = path.dirname(__filename);
        const envConfigFile = path.join(configDir, `config.${this.environment}.js`);
        
        if (fs.existsSync(envConfigFile)) {
            try {
                const envConfig = require(envConfigFile);
                this.mergeConfig(this.config, envConfig);
                console.log(`📁 加载环境配置文件: config.${this.environment}.js`);
            } catch (error) {
                console.warn(`⚠️ 加载环境配置文件失败: ${error.message}`);
            }
        }
    }

    /**
     * 深度合并配置对象
     */
    mergeConfig(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                this.mergeConfig(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    /**
     * 设置配置值（支持点分路径）
     */
    setConfigValue(path, value) {
        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    /**
     * 获取配置值（支持点分路径和默认值）
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    }

    /**
     * 获取整个配置对象
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.config)); // 深拷贝
    }

    /**
     * 检查配置项是否存在
     */
    has(path) {
        return this.get(path) !== undefined;
    }

    /**
     * 注册配置验证器
     */
    registerValidator(path, validator) {
        this.validators.set(path, validator);
    }

    /**
     * 注册默认验证器
     */
    registerDefaultValidators() {
        // 端口验证
        this.registerValidator('app.PORT', (value) => {
            return typeof value === 'number' && value > 0 && value <= 65535;
        });

        // 超时验证
        this.registerValidator('app.AI_TIMEOUT', (value) => {
            return typeof value === 'number' && value > 0 && value <= 600000; // 最大10分钟
        });

        // 文件大小验证
        this.registerValidator('app.MAX_FILE_SIZE', (value) => {
            return typeof value === 'number' && value > 0 && value <= 100 * 1024 * 1024; // 最大100MB
        });

        // AI服务商验证
        this.registerValidator('app.DEFAULT_PROVIDER', (value) => {
            return typeof value === 'string' && this.get('app.AI_PROVIDERS')[value];
        });

        // 日志级别验证
        this.registerValidator('logging.level', (value) => {
            return Object.values(LOG_LEVELS).includes(value);
        });
    }

    /**
     * 验证配置
     */
    validateConfiguration() {
        const errors = [];
        
        for (const [path, validator] of this.validators) {
            const value = this.get(path);
            try {
                if (!validator(value)) {
                    errors.push(`配置项 ${path} 验证失败: ${value}`);
                }
            } catch (error) {
                errors.push(`配置项 ${path} 验证器执行失败: ${error.message}`);
            }
        }

        // 验证API密钥
        this.validateAPIKeys(errors);

        if (errors.length > 0) {
            console.error('❌ 配置验证失败:');
            errors.forEach(error => console.error(`   - ${error}`));
            if (this.environment === 'production') {
                throw new Error('生产环境配置验证失败');
            }
        } else {
            console.log('✅ 配置验证通过');
        }
    }

    /**
     * 验证API密钥
     */
    validateAPIKeys(errors) {
        const providers = this.get('app.AI_PROVIDERS', {});
        const defaultProvider = this.get('app.DEFAULT_PROVIDER');
        
        let hasValidKey = false;
        
        for (const [providerKey, provider] of Object.entries(providers)) {
            const keyEnvVar = provider.keyEnvVar;
            const apiKey = process.env[keyEnvVar];
            
            if (apiKey && apiKey.length > 10) {
                hasValidKey = true;
                console.log(`✅ ${provider.name} API密钥已配置`);
            } else {
                console.warn(`⚠️ ${provider.name} API密钥未配置或无效`);
                
                if (providerKey === defaultProvider) {
                    errors.push(`默认AI服务商 ${provider.name} 的API密钥未配置`);
                }
            }
        }

        if (!hasValidKey) {
            errors.push('至少需要配置一个AI服务商的API密钥');
        }
    }

    /**
     * 获取可用的AI服务商
     */
    getAvailableProviders() {
        const providers = this.get('app.AI_PROVIDERS', {});
        const available = [];
        
        for (const [key, provider] of Object.entries(providers)) {
            const hasApiKey = !!process.env[provider.keyEnvVar];
            available.push({
                key,
                name: provider.name,
                hasApiKey,
                isDefault: key === this.get('app.DEFAULT_PROVIDER')
            });
        }
        
        return available;
    }

    /**
     * 监听配置变化
     */
    watch(path, callback) {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, new Set());
        }
        this.watchers.get(path).add(callback);
    }

    /**
     * 更新配置并通知监听者
     */
    set(path, value) {
        const oldValue = this.get(path);
        this.setConfigValue(path, value);
        
        // 触发验证
        const validator = this.validators.get(path);
        if (validator && !validator(value)) {
            console.warn(`⚠️ 配置项 ${path} 新值验证失败: ${value}`);
        }
        
        // 通知监听者
        if (this.watchers.has(path)) {
            for (const callback of this.watchers.get(path)) {
                try {
                    callback(value, oldValue, path);
                } catch (error) {
                    console.error(`配置监听回调执行失败: ${error.message}`);
                }
            }
        }
        
        console.log(`📝 配置更新: ${path} = ${value}`);
    }

    /**
     * 重新加载配置
     */
    reload() {
        console.log('🔄 重新加载配置...');
        this.loadConfiguration();
        
        // 通知所有监听者
        for (const [path, callbacks] of this.watchers) {
            const value = this.get(path);
            for (const callback of callbacks) {
                try {
                    callback(value, undefined, path);
                } catch (error) {
                    console.error(`配置重载回调执行失败: ${error.message}`);
                }
            }
        }
    }

    /**
     * 导出配置到文件
     */
    exportConfig(filePath) {
        try {
            const configData = {
                exportTime: new Date().toISOString(),
                environment: this.environment,
                config: this.getAll()
            };
            
            fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
            console.log(`📤 配置导出到: ${filePath}`);
        } catch (error) {
            console.error(`配置导出失败: ${error.message}`);
        }
    }

    /**
     * 获取配置摘要
     */
    getSummary() {
        const providers = this.getAvailableProviders();
        const availableCount = providers.filter(p => p.hasApiKey).length;
        
        return {
            environment: this.environment,
            port: this.get('app.PORT'),
            defaultProvider: this.get('app.DEFAULT_PROVIDER'),
            availableProviders: `${availableCount}/${providers.length}`,
            maxFileSize: `${Math.round(this.get('app.MAX_FILE_SIZE') / 1024 / 1024)}MB`,
            aiTimeout: `${this.get('app.AI_TIMEOUT') / 1000}s`,
            logLevel: this.get('logging.level', LOG_LEVELS.INFO)
        };
    }

    /**
     * 检查配置健康状态
     */
    healthCheck() {
        const issues = [];
        const warnings = [];
        
        // 检查API密钥
        const providers = this.getAvailableProviders();
        const availableProviders = providers.filter(p => p.hasApiKey);
        
        if (availableProviders.length === 0) {
            issues.push('没有可用的AI服务商API密钥');
        } else if (availableProviders.length === 1) {
            warnings.push('只配置了一个AI服务商，建议配置多个以提供备用');
        }
        
        // 检查默认服务商
        const defaultProvider = providers.find(p => p.isDefault);
        if (!defaultProvider || !defaultProvider.hasApiKey) {
            issues.push('默认AI服务商未配置或无效');
        }
        
        // 检查文件大小限制
        const maxFileSize = this.get('app.MAX_FILE_SIZE');
        if (maxFileSize > 50 * 1024 * 1024) {
            warnings.push('文件大小限制较大，可能影响性能');
        }
        
        // 检查超时设置
        const aiTimeout = this.get('app.AI_TIMEOUT');
        if (aiTimeout > 180000) {
            warnings.push('AI超时设置较长，可能影响用户体验');
        }
        
        return {
            status: issues.length === 0 ? 'healthy' : 'unhealthy',
            issues,
            warnings,
            summary: this.getSummary()
        };
    }
}

// 创建单例配置管理器实例
const configManager = new ConfigManager();

// 监听进程信号以重新加载配置
process.on('SIGUSR2', () => {
    console.log('📡 收到SIGUSR2信号，重新加载配置...');
    configManager.reload();
});

module.exports = {
    ConfigManager,
    configManager
};