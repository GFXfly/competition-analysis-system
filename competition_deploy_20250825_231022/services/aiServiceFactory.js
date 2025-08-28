const axios = require('axios');
const { APP_CONFIG, ERROR_MESSAGES } = require('../config/constants');

/**
 * 统一AI服务抽象层
 * 支持多个AI服务商，符合公平竞争要求
 */
class UnifiedAIService {
    constructor(providerConfig) {
        this.config = providerConfig;
        this.apiKey = process.env[providerConfig.keyEnvVar];
        this.providerName = providerConfig.name;
    }

    /**
     * 验证API密钥是否存在
     */
    validateApiKey() {
        if (!this.apiKey) {
            throw new Error(`${ERROR_MESSAGES.API_KEY_MISSING} - ${this.providerName} API密钥未配置`);
        }
    }

    /**
     * 创建通用的API请求配置
     */
    createRequestConfig(timeout = APP_CONFIG.AI_TIMEOUT) {
        this.validateApiKey();
        
        return {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: timeout,
            validateStatus: function (status) {
                return status < 500;
            }
        };
    }

    /**
     * 处理API响应错误
     */
    handleApiError(error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error(ERROR_MESSAGES.API_TIMEOUT);
        } else if (error.response) {
            throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${error.response.status} - ${error.response.data?.error?.message || '未知错误'}`);
        } else if (error.request) {
            throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
        } else {
            throw new Error(`${this.providerName} API调用失败: ${error.message}`);
        }
    }

    /**
     * 统一的聊天接口
     */
    async chat(messages, options = {}) {
        try {
            const modelName = options.useReasoner ? this.config.models.reasoner : this.config.models.chat;
            
            console.log(`📡 正在调用 ${this.providerName} ${modelName} API...`);
            
            const requestData = {
                model: modelName,
                messages: messages,
                max_tokens: options.maxTokens || 2000,
                temperature: options.temperature || 0.1,
                seed: options.seed || 42
            };

            // 添加流式处理支持
            if (options.stream) {
                requestData.stream = true;
            }

            const response = await axios.post(
                this.config.baseURL,
                requestData,
                this.createRequestConfig(options.timeout)
            );

            if (response.status >= 400) {
                throw new Error(`API请求失败: HTTP ${response.status} - ${response.data?.error?.message || response.statusText}`);
            }

            console.log(`✅ ${this.providerName} API响应成功`);
            
            const content = response.data.choices[0].message.content;
            return {
                content: content,
                provider: this.providerName,
                model: modelName,
                usage: response.data.usage || {}
            };

        } catch (error) {
            console.error(`❌ ${this.providerName} API调用失败:`, error.message);
            this.handleApiError(error);
        }
    }

    /**
     * 流式聊天接口
     */
    async streamChat(messages, options = {}, responseStream) {
        try {
            const modelName = options.useReasoner ? this.config.models.reasoner : this.config.models.chat;
            
            console.log(`📡 正在调用 ${this.providerName} ${modelName} 流式API...`);
            
            const requestData = {
                model: modelName,
                messages: messages,
                max_tokens: options.maxTokens || 4000,
                temperature: options.temperature || 0.1,
                seed: options.seed || 42,
                stream: true
            };

            const response = await axios.post(
                this.config.baseURL,
                requestData,
                {
                    ...this.createRequestConfig(options.timeout),
                    responseType: 'stream'
                }
            );

            let fullContent = '';
            let currentThought = '';

            // 发送开始分析信号
            if (responseStream) {
                responseStream.write(`data: ${JSON.stringify({
                    type: 'ai_thinking',
                    message: `🧠 ${this.providerName} ${modelName} 开始深度分析...`
                })}\n\n`);
            }

            return new Promise((resolve, reject) => {
                let isResolved = false;
                
                response.data.on('data', (chunk) => {
                    const lines = chunk.toString().split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6).trim();
                                if (jsonStr === '[DONE]') {
                                    if (!isResolved) {
                                        console.log('=== 收到[DONE]信号，流式传输结束 ===');
                                        const result = {
                                            content: fullContent,
                                            provider: this.providerName,
                                            model: modelName
                                        };
                                        isResolved = true;
                                        resolve(result);
                                    }
                                    return;
                                }
                                
                                const data = JSON.parse(jsonStr);
                                if (data.choices && data.choices[0] && data.choices[0].delta) {
                                    const delta = data.choices[0].delta;
                                    if (delta.content) {
                                        fullContent += delta.content;
                                        currentThought += delta.content;
                                        
                                        // 检测到完整的思考片段时发送
                                        if (responseStream && (currentThought.includes('。') || currentThought.includes('\n') || currentThought.length > 100)) {
                                            const thoughtMessage = this.extractThought(currentThought);
                                            if (thoughtMessage) {
                                                responseStream.write(`data: ${JSON.stringify({
                                                    type: 'ai_thinking',
                                                    message: `💭 ${thoughtMessage}`
                                                })}\n\n`);
                                            }
                                            currentThought = '';
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log('流式数据解析错误:', e.message);
                            }
                        }
                    }
                });

                response.data.on('end', () => {
                    if (!isResolved) {
                        console.log('=== 流数据接收结束（未收到DONE信号）===');
                        const result = {
                            content: fullContent,
                            provider: this.providerName,
                            model: modelName
                        };
                        isResolved = true;
                        resolve(result);
                    }
                });

                response.data.on('error', (error) => {
                    console.error('流数据接收错误:', error);
                    if (!isResolved) {
                        isResolved = true;
                        reject(error);
                    }
                });
                
                // 添加超时保护
                setTimeout(() => {
                    if (!isResolved) {
                        console.log('=== 流式处理超时，强制结束 ===');
                        if (fullContent.length > 0) {
                            const result = {
                                content: fullContent,
                                provider: this.providerName,
                                model: modelName
                            };
                            isResolved = true;
                            resolve(result);
                        } else {
                            isResolved = true;
                            reject(new Error('流式处理超时且无内容'));
                        }
                    }
                }, 120000); // 2分钟超时
            });
            
        } catch (error) {
            console.error(`❌ ${this.providerName} 流式API调用失败:`, error.message);
            this.handleApiError(error);
        }
    }

    /**
     * 提取有意义的思考片段
     */
    extractThought(text) {
        const cleaned = text.trim().replace(/\\n+/g, ' ').replace(/\\s+/g, ' ');
        
        if (cleaned.length < 10) return null;
        
        const keywords = ['分析', '检查', '发现', '问题', '建议', '审查', '评估', '考虑', '认为', '判断'];
        const hasKeyword = keywords.some(keyword => cleaned.includes(keyword));
        
        if (hasKeyword || cleaned.includes('。')) {
            return cleaned.length > 100 ? cleaned.substring(0, 97) + '...' : cleaned;
        }
        
        return null;
    }

    /**
     * 测试API连接
     */
    async testConnection(testText = "测试AI服务连接") {
        try {
            console.log(`🧪 开始测试 ${this.providerName} API连接...`);
            
            const startTime = Date.now();
            const result = await this.chat([{
                role: 'user',
                content: testText
            }], { maxTokens: 50 });
            
            const responseTime = Date.now() - startTime;
            
            console.log(`✅ ${this.providerName} API测试成功`);
            
            return {
                success: true,
                message: `${this.providerName} API连接正常`,
                responseTime: `${responseTime}ms`,
                testResult: result,
                timestamp: new Date().toISOString(),
                provider: this.providerName
            };
            
        } catch (error) {
            console.error(`❌ ${this.providerName} API测试失败:`, error);
            throw error;
        }
    }
}

/**
 * AI服务工厂类
 */
class AIServiceFactory {
    /**
     * 创建AI服务实例
     */
    static create(providerName = APP_CONFIG.DEFAULT_PROVIDER) {
        const providerConfig = APP_CONFIG.AI_PROVIDERS[providerName];
        if (!providerConfig) {
            throw new Error(`不支持的AI服务商: ${providerName}. 可用服务商: ${Object.keys(APP_CONFIG.AI_PROVIDERS).join(', ')}`);
        }
        
        return new UnifiedAIService(providerConfig);
    }

    /**
     * 创建带回退机制的AI服务
     */
    static async createWithFallback(primaryProvider = APP_CONFIG.DEFAULT_PROVIDER, fallbackProviders = APP_CONFIG.FALLBACK_PROVIDERS) {
        try {
            const primaryService = this.create(primaryProvider);
            // 测试主要服务商的连接
            await primaryService.testConnection();
            return primaryService;
        } catch (error) {
            console.warn(`❌ 主要AI服务商 ${primaryProvider} 不可用:`, error.message);
            
            // 尝试回退服务商
            for (const fallbackProvider of fallbackProviders) {
                try {
                    console.log(`🔄 尝试回退到 ${fallbackProvider} 服务商...`);
                    const fallbackService = this.create(fallbackProvider);
                    await fallbackService.testConnection();
                    console.log(`✅ 成功回退到 ${fallbackProvider} 服务商`);
                    return fallbackService;
                } catch (fallbackError) {
                    console.warn(`❌ 回退服务商 ${fallbackProvider} 也不可用:`, fallbackError.message);
                }
            }
            
            throw new Error(`所有AI服务商都不可用。主要服务商: ${primaryProvider}, 回退服务商: ${fallbackProviders.join(', ')}`);
        }
    }

    /**
     * 获取所有可用的服务商列表
     */
    static getAvailableProviders() {
        return Object.keys(APP_CONFIG.AI_PROVIDERS).map(key => ({
            key,
            name: APP_CONFIG.AI_PROVIDERS[key].name,
            hasApiKey: !!process.env[APP_CONFIG.AI_PROVIDERS[key].keyEnvVar]
        }));
    }
}

module.exports = {
    AIServiceFactory,
    UnifiedAIService
};