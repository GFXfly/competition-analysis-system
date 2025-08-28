const axios = require('axios');
const { APP_CONFIG, ERROR_MESSAGES } = require('../config/constants');
const { quickValidateApiKey, getValidProviders } = require('../utils/apiKeyValidator');

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
     * 验证API密钥是否存在且有效
     */
    validateApiKey() {
        const validation = quickValidateApiKey(this.apiKey, this.providerName);
        if (!validation.valid) {
            throw new Error(`${ERROR_MESSAGES.API_KEY_MISSING} - ${this.providerName} ${validation.reason}`);
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
                'Content-Type': 'application/json',
                'User-Agent': 'Fair-Competition-Review-Tool/3.0'
            },
            timeout: timeout,
            validateStatus: function (status) {
                return status < 500;
            },
            // 代理环境优化配置
            httpAgent: false, // 禁用HTTP代理池
            httpsAgent: false, // 禁用HTTPS代理池
            proxy: false, // 禁用axios内置代理
            maxRedirects: 3,
            decompress: true,
            // 连接优化
            maxContentLength: 10 * 1024 * 1024, // 10MB
            maxBodyLength: 10 * 1024 * 1024
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
     * 创建带回退机制的AI服务（快速失败版本）
     */
    static async createWithFallback(primaryProvider = APP_CONFIG.DEFAULT_PROVIDER, fallbackProviders = APP_CONFIG.FALLBACK_PROVIDERS) {
        console.log('🔍 开始快速AI服务商检查...');
        
        // 使用智能预过滤，避免尝试已知无效的API
        const allProviders = [primaryProvider, ...fallbackProviders];
        const validProviders = getValidProviders(allProviders);
        
        console.log('📊 AI服务商快速验证结果:');
        validProviders.forEach(({ provider, reason }) => {
            console.log(`  ✅ ${provider}: ${reason}`);
        });
        
        if (validProviders.length === 0) {
            console.log('❌ 没有可用的AI服务商，直接启用本地分析模式');
            throw new Error('没有可用的AI服务商API密钥，将使用增强本地分析');
        }
        
        // 尝试有效的服务商（超短超时，快速失败）
        for (const { provider } of validProviders) {
            try {
                console.log(`⚡ 快速测试 ${provider} 服务商...`);
                const service = this.create(provider);
                
                // 极短的超时时间 - 3秒快速失败
                await Promise.race([
                    service.testConnection("超快速连接测试"),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("快速连接测试超时")), 3000) // 3秒超时
                    )
                ]);
                
                console.log(`✅ ${provider} 服务商快速连接成功`);
                return service;
                
            } catch (error) {
                console.log(`⏭️ ${provider} 快速测试失败: ${error.message}`);
                continue;
            }
        }
        
        // 所有服务商都快速失败
        console.log('⚠️ 所有AI服务商快速测试失败，启用本地分析模式');
        throw new Error('AI服务暂时不可用，将使用增强本地分析');
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