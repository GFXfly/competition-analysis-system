/**
 * 🎛️ 优化的AI模型参数配置器 v1.0
 * 专门针对DeepSeek V3.1推理能力优化
 * 支持任务导向的动态参数调整和A/B测试
 */

const { APP_CONFIG } = require('./constants');

/**
 * 🎯 任务特定的参数配置
 */
const TASK_SPECIFIC_CONFIGS = {
    // 语义理解层 - 需要创造性和灵活性
    semantic_understanding: {
        temperature: 0.35,           // 提高创造性分析能力
        top_p: 0.9,                 // 保持多样性
        max_tokens: 3500,           // 足够空间进行深度分析
        reasoning_effort: 'maximum', // 最大推理努力
        seed: null,                 // 不固定seed，增加分析多样性
        timeout: 90000,             // 90秒，给推理充足时间
        repetition_penalty: 1.1,    // 避免重复表述
        description: '语义理解层：需要创造性推理和深度分析'
    },

    // 法律匹配层 - 需要精确性和一致性
    legal_matching: {
        temperature: 0.15,          // 较低温度，保证精确性
        top_p: 0.8,                 // 稍微限制选择范围
        max_tokens: 2500,           // 专注于法条匹配
        reasoning_effort: 'high',    // 高推理努力但不是最大
        seed: 42,                   // 固定seed保证一致性
        timeout: 60000,             // 60秒足够
        repetition_penalty: 1.0,    // 法律条文可能需要重复
        description: '法律匹配层：需要精确匹配和逻辑一致性'
    },

    // 风险评估层 - 平衡创造性和准确性
    risk_assessment: {
        temperature: 0.25,          // 平衡的温度设置
        top_p: 0.85,               // 适中的选择范围
        max_tokens: 2000,          // 聚焦于风险评估
        reasoning_effort: 'high',   // 高推理努力
        seed: 2024,                // 固定但不同的seed
        timeout: 75000,            // 75秒
        repetition_penalty: 1.05,   // 轻微避免重复
        description: '风险评估层：平衡准确性和创新性思考'
    },

    // 详细审查 - 传统模式兼容
    detailed_review: {
        temperature: 0.20,          // 稍微提高灵活性
        top_p: 0.82,               // 适度的选择空间
        max_tokens: 4500,          // 需要详细输出
        reasoning_effort: 'maximum', // 最大推理努力
        seed: 2025,                // 年份作为seed
        timeout: 120000,           // 2分钟
        repetition_penalty: 1.08,   // 避免冗余
        description: '详细审查：全面分析和详细输出'
    },

    // 预判断 - 快速和高效
    precheck: {
        temperature: 0.10,          // 最低温度，追求一致性
        top_p: 0.75,               // 相对保守的选择
        max_tokens: 800,           // 简短输出
        reasoning_effort: 'medium', // 中等推理努力，追求速度
        seed: 1024,                // 固定seed
        timeout: 20000,            // 20秒快速响应
        repetition_penalty: 1.0,    // 预判断不需要避免重复
        description: '预判断：快速响应和一致性判断'
    }
};

/**
 * 🧪 A/B测试配置
 * 用于对比不同参数设置的效果
 */
const AB_TEST_CONFIGS = {
    // 保守配置 - 更注重准确性
    conservative: {
        temperature_multiplier: 0.7,     // 降低温度
        reasoning_effort_boost: false,   // 不提升推理努力
        token_buffer: 0.8,              // 减少token使用
        timeout_multiplier: 0.9,        // 稍微缩短超时
        description: '保守配置：优先准确性和一致性'
    },

    // 激进配置 - 更注重创造性
    aggressive: {
        temperature_multiplier: 1.3,     // 提高温度
        reasoning_effort_boost: true,    // 总是使用最大推理努力
        token_buffer: 1.2,              // 增加token预算
        timeout_multiplier: 1.5,        // 延长超时时间
        description: '激进配置：优先深度分析和创造性'
    },

    // 平衡配置 - 默认基准
    balanced: {
        temperature_multiplier: 1.0,     // 标准温度
        reasoning_effort_boost: null,    // 保持原设置
        token_buffer: 1.0,              // 标准token
        timeout_multiplier: 1.0,        // 标准超时
        description: '平衡配置：标准基准设置'
    }
};

/**
 * 🎛️ 动态参数优化器
 */
class DynamicParameterOptimizer {
    constructor() {
        this.performanceHistory = new Map();
        this.currentExperiment = null;
        this.adaptiveSettings = {
            enabled: true,
            learningRate: 0.1,
            minimumSamples: 5
        };
    }

    /**
     * 🎯 获取任务优化参数
     */
    getOptimizedParams(taskType, documentAnalysis = null, abTestGroup = 'balanced') {
        console.log(`🎛️ 为任务 "${taskType}" 获取优化参数...`);

        // 获取基础配置
        const baseConfig = TASK_SPECIFIC_CONFIGS[taskType] || TASK_SPECIFIC_CONFIGS.detailed_review;
        
        // 应用A/B测试配置
        const abConfig = AB_TEST_CONFIGS[abTestGroup] || AB_TEST_CONFIGS.balanced;
        let optimizedConfig = this.applyABTestSettings(baseConfig, abConfig);

        // 基于文档分析进行自适应调整
        if (documentAnalysis && this.adaptiveSettings.enabled) {
            optimizedConfig = this.applyAdaptiveAdjustments(optimizedConfig, documentAnalysis, taskType);
        }

        // 记录使用的配置
        this.recordConfigUsage(taskType, optimizedConfig, abTestGroup);

        console.log(`✅ ${taskType} 参数优化完成:`, {
            temperature: optimizedConfig.temperature,
            reasoning_effort: optimizedConfig.reasoning_effort,
            max_tokens: optimizedConfig.max_tokens
        });

        return optimizedConfig;
    }

    /**
     * 🧪 应用A/B测试设置
     */
    applyABTestSettings(baseConfig, abConfig) {
        const config = { ...baseConfig };

        // 温度调整
        config.temperature = Math.max(0.01, Math.min(1.0, 
            config.temperature * abConfig.temperature_multiplier
        ));

        // token调整
        config.max_tokens = Math.round(config.max_tokens * abConfig.token_buffer);

        // 超时调整
        config.timeout = Math.round(config.timeout * abConfig.timeout_multiplier);

        // 推理努力调整
        if (abConfig.reasoning_effort_boost === true) {
            config.reasoning_effort = 'maximum';
        } else if (abConfig.reasoning_effort_boost === false && config.reasoning_effort === 'maximum') {
            config.reasoning_effort = 'high';
        }

        return config;
    }

    /**
     * 🔄 基于文档特征进行自适应调整
     */
    applyAdaptiveAdjustments(config, documentAnalysis, taskType) {
        const adaptedConfig = { ...config };

        // 文档复杂度调整
        const complexity = this.assessDocumentComplexity(documentAnalysis);
        
        if (complexity > 0.8) {
            // 高复杂度文档：增加推理资源
            adaptedConfig.temperature = Math.min(adaptedConfig.temperature + 0.05, 0.5);
            adaptedConfig.max_tokens = Math.round(adaptedConfig.max_tokens * 1.2);
            adaptedConfig.timeout = Math.round(adaptedConfig.timeout * 1.3);
            
            if (adaptedConfig.reasoning_effort !== 'maximum') {
                adaptedConfig.reasoning_effort = 'maximum';
            }
            
            console.log('📈 检测到高复杂度文档，增强推理参数');
        } else if (complexity < 0.3) {
            // 低复杂度文档：优化效率
            adaptedConfig.temperature = Math.max(adaptedConfig.temperature - 0.05, 0.05);
            adaptedConfig.max_tokens = Math.round(adaptedConfig.max_tokens * 0.8);
            adaptedConfig.timeout = Math.round(adaptedConfig.timeout * 0.7);
            
            console.log('📉 检测到低复杂度文档，优化效率参数');
        }

        // 基于历史性能调整
        const historicalPerformance = this.getHistoricalPerformance(taskType);
        if (historicalPerformance && historicalPerformance.samples >= this.adaptiveSettings.minimumSamples) {
            adaptedConfig = this.applyHistoricalOptimizations(adaptedConfig, historicalPerformance);
        }

        return adaptedConfig;
    }

    /**
     * 📊 评估文档复杂度
     */
    assessDocumentComplexity(analysis) {
        let complexity = 0.5; // 基础复杂度

        // 文档长度因子
        if (analysis.textLength) {
            if (analysis.textLength > 8000) complexity += 0.2;
            else if (analysis.textLength < 2000) complexity -= 0.2;
        }

        // 法律条文密度
        if (analysis.legalDensity) {
            complexity += analysis.legalDensity * 0.3;
        }

        // 语义风险数量
        if (analysis.semanticRisks) {
            complexity += Math.min(analysis.semanticRisks * 0.1, 0.3);
        }

        // 异常表述数量
        if (analysis.anomalousExpressions) {
            complexity += Math.min(analysis.anomalousExpressions * 0.05, 0.2);
        }

        return Math.max(0, Math.min(1, complexity));
    }

    /**
     * 📈 获取历史性能数据
     */
    getHistoricalPerformance(taskType) {
        return this.performanceHistory.get(taskType);
    }

    /**
     * 🎯 应用历史优化
     */
    applyHistoricalOptimizations(config, performance) {
        const adaptedConfig = { ...config };

        // 基于成功率调整温度
        if (performance.successRate < 0.8) {
            adaptedConfig.temperature = Math.max(0.05, adaptedConfig.temperature - 0.05);
            console.log('📉 基于历史成功率降低温度');
        } else if (performance.successRate > 0.95 && performance.averageQuality < 0.8) {
            adaptedConfig.temperature = Math.min(0.4, adaptedConfig.temperature + 0.03);
            console.log('📈 基于历史质量提升温度');
        }

        // 基于平均响应时间调整token
        if (performance.averageResponseTime > config.timeout * 0.8) {
            adaptedConfig.max_tokens = Math.round(adaptedConfig.max_tokens * 0.9);
            console.log('⏱️ 基于响应时间减少token限制');
        }

        return adaptedConfig;
    }

    /**
     * 📝 记录配置使用情况
     */
    recordConfigUsage(taskType, config, abTestGroup) {
        const usage = {
            timestamp: new Date(),
            taskType,
            config: { ...config },
            abTestGroup,
            sessionId: this.generateSessionId()
        };

        // 这里可以扩展记录到数据库或日志
        console.log(`📝 记录配置使用: ${taskType} (${abTestGroup})`);
    }

    /**
     * 📊 记录性能结果
     */
    recordPerformance(taskType, result) {
        if (!this.performanceHistory.has(taskType)) {
            this.performanceHistory.set(taskType, {
                samples: 0,
                successRate: 0,
                averageQuality: 0,
                averageResponseTime: 0,
                recentResults: []
            });
        }

        const performance = this.performanceHistory.get(taskType);
        
        // 更新统计
        performance.samples++;
        performance.recentResults.push(result);
        
        // 保留最近20个结果
        if (performance.recentResults.length > 20) {
            performance.recentResults.shift();
        }

        // 重新计算平均值
        const recent = performance.recentResults;
        performance.successRate = recent.filter(r => r.success).length / recent.length;
        performance.averageQuality = recent.reduce((sum, r) => sum + (r.quality || 0), 0) / recent.length;
        performance.averageResponseTime = recent.reduce((sum, r) => sum + (r.responseTime || 0), 0) / recent.length;

        console.log(`📈 ${taskType} 性能更新: 成功率 ${Math.round(performance.successRate * 100)}%`);
    }

    /**
     * 🎰 选择A/B测试组
     */
    selectABTestGroup(userId = null) {
        // 简单的轮询分配策略
        const groups = Object.keys(AB_TEST_CONFIGS);
        const hash = userId ? this.simpleHash(userId) : Date.now();
        return groups[hash % groups.length];
    }

    /**
     * 📋 获取参数配置报告
     */
    getConfigurationReport() {
        const report = {
            timestamp: new Date(),
            availableTasks: Object.keys(TASK_SPECIFIC_CONFIGS),
            abTestGroups: Object.keys(AB_TEST_CONFIGS),
            performanceHistory: Object.fromEntries(this.performanceHistory),
            adaptiveSettings: this.adaptiveSettings,
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * 💡 生成优化建议
     */
    generateRecommendations() {
        const recommendations = [];

        this.performanceHistory.forEach((performance, taskType) => {
            if (performance.samples >= this.adaptiveSettings.minimumSamples) {
                if (performance.successRate < 0.8) {
                    recommendations.push({
                        taskType,
                        type: 'success_rate_improvement',
                        message: `${taskType} 成功率较低 (${Math.round(performance.successRate * 100)}%)，建议降低温度或增加推理努力`,
                        priority: 'high'
                    });
                }

                if (performance.averageResponseTime > 60000 && taskType !== 'detailed_review') {
                    recommendations.push({
                        taskType,
                        type: 'response_time_optimization',
                        message: `${taskType} 平均响应时间过长，建议减少max_tokens或降低reasoning_effort`,
                        priority: 'medium'
                    });
                }
            }
        });

        return recommendations;
    }

    /**
     * 🔧 更新自适应设置
     */
    updateAdaptiveSettings(settings) {
        this.adaptiveSettings = { ...this.adaptiveSettings, ...settings };
        console.log('🔧 自适应设置已更新:', this.adaptiveSettings);
    }

    /**
     * 🧹 清理历史数据
     */
    clearPerformanceHistory(taskType = null) {
        if (taskType) {
            this.performanceHistory.delete(taskType);
            console.log(`🧹 已清理 ${taskType} 的性能历史`);
        } else {
            this.performanceHistory.clear();
            console.log('🧹 已清理所有性能历史');
        }
    }

    /**
     * 🔑 生成会话ID
     */
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * #️⃣ 简单哈希函数
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
    }
}

/**
 * 🎯 任务特定的参数预设
 */
const TASK_PRESETS = {
    // 快速分析预设
    quick_analysis: {
        temperature: 0.15,
        max_tokens: 1500,
        reasoning_effort: 'medium',
        timeout: 30000,
        description: '快速分析：效率优先'
    },

    // 深度分析预设
    deep_analysis: {
        temperature: 0.30,
        max_tokens: 5000,
        reasoning_effort: 'maximum',
        timeout: 150000,
        description: '深度分析：质量优先'
    },

    // 生产环境预设
    production: {
        temperature: 0.18,
        max_tokens: 3000,
        reasoning_effort: 'high',
        timeout: 90000,
        description: '生产环境：平衡效率和质量'
    },

    // 测试环境预设
    testing: {
        temperature: 0.25,
        max_tokens: 2500,
        reasoning_effort: 'high',
        timeout: 60000,
        description: '测试环境：稳定测试配置'
    }
};

// 创建全局优化器实例
const globalOptimizer = new DynamicParameterOptimizer();

/**
 * 🚀 便捷接口函数
 */

/**
 * 获取优化的AI参数
 */
function getOptimizedAIParams(taskType, options = {}) {
    const {
        documentAnalysis = null,
        abTestGroup = 'balanced',
        preset = null,
        userId = null
    } = options;

    // 如果指定了预设，直接返回
    if (preset && TASK_PRESETS[preset]) {
        console.log(`🎯 使用预设配置: ${preset}`);
        return TASK_PRESETS[preset];
    }

    // 自动选择A/B测试组
    const finalAbGroup = abTestGroup === 'auto' ? 
        globalOptimizer.selectABTestGroup(userId) : abTestGroup;

    return globalOptimizer.getOptimizedParams(taskType, documentAnalysis, finalAbGroup);
}

/**
 * 记录AI性能结果
 */
function recordAIPerformance(taskType, result) {
    globalOptimizer.recordPerformance(taskType, result);
}

/**
 * 获取参数优化报告
 */
function getParameterOptimizationReport() {
    return globalOptimizer.getConfigurationReport();
}

/**
 * 更新自适应学习设置
 */
function updateAdaptiveLearning(settings) {
    globalOptimizer.updateAdaptiveSettings(settings);
}

module.exports = {
    DynamicParameterOptimizer,
    TASK_SPECIFIC_CONFIGS,
    AB_TEST_CONFIGS,
    TASK_PRESETS,
    getOptimizedAIParams,
    recordAIPerformance,
    getParameterOptimizationReport,
    updateAdaptiveLearning,
    // 导出全局实例
    globalOptimizer
};