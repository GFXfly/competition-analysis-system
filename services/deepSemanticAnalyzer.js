/**
 * 🧠 深度语义分析器 v1.0
 * 专门识别隐含意图、异常表述和规避性语言
 * 核心功能：透过表象看本质，识别"技术中性"下的倾向性
 */

/**
 * 🕵️ 隐含意图识别器
 * 识别政策表面公平但实际倾向的隐蔽手段
 */
class ImplicitIntentDetector {
    constructor() {
        this.intentPatterns = this.buildIntentPatterns();
        this.contradictionDetectors = this.buildContradictionDetectors();
        this.contextAnalyzers = this.buildContextAnalyzers();
    }

    /**
     * 🧩 构建意图识别模式
     */
    buildIntentPatterns() {
        return {
            // 表面公平，实际偏向的模式
            pseudoFairness: {
                patterns: [
                    {
                        surface: '所有符合条件的企业',
                        hidden: '设置苛刻条件实际排除外地企业',
                        indicators: ['符合条件', '达到要求', '满足标准'],
                        riskLevel: 'high'
                    },
                    {
                        surface: '同等条件下优先',
                        hidden: '通过"同等条件"判断标准倾向本地',
                        indicators: ['同等条件', '同等质量', '同等价格'],
                        riskLevel: 'high'
                    },
                    {
                        surface: '统一标准',
                        hidden: '制定有利于本地企业的"统一"标准',
                        indicators: ['统一标准', '一致要求', '相同条件'],
                        riskLevel: 'medium'
                    }
                ]
            },

            // 软性倾向表述
            softBias: {
                patterns: [
                    {
                        surface: '鼓励支持',
                        hidden: '软性引导实现倾向性效果',
                        indicators: ['鼓励', '支持', '推荐', '建议', '倡导'],
                        riskLevel: 'medium'
                    },
                    {
                        surface: '重点关注',
                        hidden: '通过资源倾斜实现差别对待',
                        indicators: ['重点', '优先', '着重', '突出', '强化'],
                        riskLevel: 'medium'
                    }
                ]
            },

            // 程序性偏向
            proceduralBias: {
                patterns: [
                    {
                        surface: '简化程序',
                        hidden: '对特定对象简化，形成差别待遇',
                        indicators: ['简化程序', '快速办理', '绿色通道', '一站式'],
                        riskLevel: 'high'
                    },
                    {
                        surface: '分类管理',
                        hidden: '通过分类标准实现区别对待',
                        indicators: ['分类管理', '分级处理', '差别化', '个性化'],
                        riskLevel: 'high'
                    }
                ]
            }
        };
    }

    /**
     * ⚡ 构建矛盾检测器
     * 检测政策内部的逻辑矛盾
     */
    buildContradictionDetectors() {
        return {
            // 公平声明 vs 实际措施
            fairnessContradictions: [
                {
                    claim: ['公平竞争', '一视同仁', '平等对待'],
                    reality: ['本地优先', '当地企业', '就近选择'],
                    description: '声称公平但实际倾向本地'
                },
                {
                    claim: ['开放市场', '自由选择', '市场配置'],
                    reality: ['指定供应商', '限定品牌', '名单管理'],
                    description: '声称开放但实际限制选择'
                }
            ],

            // 程序公正 vs 结果导向
            processContradictions: [
                {
                    process: ['公开招标', '透明程序', '规范操作'],
                    outcome: ['根据贡献', '按照规模', '经济效益'],
                    description: '程序公正但结果导向经济贡献'
                }
            ]
        };
    }

    /**
     * 📊 构建上下文分析器
     * 分析政策实施的具体环境和可能效果
     */
    buildContextAnalyzers() {
        return {
            // 实施环境分析
            implementationContext: {
                localAdvantages: [
                    '本地企业更熟悉情况',
                    '就近服务更便利',
                    '本地资源整合更高效',
                    '属地管理更规范'
                ],
                outsiderBarriers: [
                    '外地企业信息不对称',
                    '跨区域经营成本高',
                    '本地关系网络缺失',
                    '政策理解存在偏差'
                ]
            },

            // 效果预测模式
            effectPrediction: {
                tendencyEffects: [
                    '看似中性的要求实际偏向本地',
                    '程序复杂度提高外地企业成本',
                    '信息获取渠道限制外地参与',
                    '评价标准暗含本地优势'
                ]
            }
        };
    }

    /**
     * 🔍 主分析方法：检测隐含意图
     */
    async detectImplicitIntents(text) {
        console.log('🕵️ 开始隐含意图检测...');

        const results = {
            pseudoFairness: this.detectPseudoFairness(text),
            softBias: this.detectSoftBias(text), 
            proceduralBias: this.detectProceduralBias(text),
            contradictions: this.detectContradictions(text),
            contextualRisks: this.analyzeContextualRisks(text),
            overallIntentScore: 0
        };

        // 计算综合隐含意图分数
        results.overallIntentScore = this.calculateIntentScore(results);

        return results;
    }

    /**
     * 😶‍🌫️ 检测伪公平模式
     */
    detectPseudoFairness(text) {
        const detections = [];
        
        this.intentPatterns.pseudoFairness.patterns.forEach(pattern => {
            pattern.indicators.forEach(indicator => {
                if (text.includes(indicator)) {
                    detections.push({
                        pattern: pattern.surface,
                        hiddenIntent: pattern.hidden,
                        evidence: this.extractContext(text, indicator),
                        riskLevel: pattern.riskLevel,
                        confidence: this.calculatePatternConfidence(text, pattern.indicators)
                    });
                }
            });
        });

        return detections;
    }

    /**
     * 🎭 检测软性偏向
     */
    detectSoftBias(text) {
        const detections = [];
        
        this.intentPatterns.softBias.patterns.forEach(pattern => {
            const matches = pattern.indicators.filter(indicator => text.includes(indicator));
            if (matches.length > 0) {
                detections.push({
                    type: '软性倾向',
                    surface: pattern.surface,
                    hiddenIntent: pattern.hidden,
                    matches: matches,
                    context: matches.map(match => this.extractContext(text, match)),
                    riskLevel: pattern.riskLevel
                });
            }
        });

        return detections;
    }

    /**
     * 🔄 检测程序性偏向
     */
    detectProceduralBias(text) {
        const detections = [];
        
        this.intentPatterns.proceduralBias.patterns.forEach(pattern => {
            const matches = pattern.indicators.filter(indicator => text.includes(indicator));
            if (matches.length > 0) {
                detections.push({
                    type: '程序性偏向',
                    surface: pattern.surface,
                    hiddenIntent: pattern.hidden,
                    procedualAdvantages: '可能为特定对象创造程序优势',
                    matches: matches,
                    riskLevel: pattern.riskLevel
                });
            }
        });

        return detections;
    }

    /**
     * ⚡ 检测内在矛盾
     */
    detectContradictions(text) {
        const contradictions = [];
        
        this.contradictionDetectors.fairnessContradictions.forEach(detector => {
            const claimExists = detector.claim.some(claim => text.includes(claim));
            const realityExists = detector.reality.some(reality => text.includes(reality));
            
            if (claimExists && realityExists) {
                contradictions.push({
                    type: 'fairness_contradiction',
                    description: detector.description,
                    claimEvidence: detector.claim.filter(claim => text.includes(claim)),
                    realityEvidence: detector.reality.filter(reality => text.includes(reality)),
                    severity: 'high'
                });
            }
        });

        return contradictions;
    }

    /**
     * 🌐 分析上下文风险
     */
    analyzeContextualRisks(text) {
        const risks = [];
        
        // 检查本地优势暗示
        this.contextAnalyzers.implementationContext.localAdvantages.forEach(advantage => {
            if (text.includes(advantage) || this.semanticSimilarity(text, advantage) > 0.7) {
                risks.push({
                    type: 'local_advantage_hint',
                    description: '暗示本地企业具有天然优势',
                    evidence: advantage,
                    implication: '可能导致实际竞争不公平'
                });
            }
        });

        return risks;
    }

    /**
     * 📏 提取上下文
     */
    extractContext(text, keyword) {
        const index = text.indexOf(keyword);
        if (index === -1) return '';
        
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + keyword.length + 50);
        
        return text.substring(start, end);
    }

    /**
     * 🎯 计算模式置信度
     */
    calculatePatternConfidence(text, indicators) {
        const matchCount = indicators.filter(indicator => text.includes(indicator)).length;
        const baseConfidence = matchCount / indicators.length;
        
        // 根据文档复杂度调整置信度
        const complexity = this.assessDocumentComplexity(text);
        return Math.min(baseConfidence * complexity, 1.0);
    }

    /**
     * 📊 评估文档复杂度
     */
    assessDocumentComplexity(text) {
        let complexity = 1.0;
        
        // 法律条文复杂度
        if (text.includes('第') && text.includes('条') && text.includes('款')) {
            complexity += 0.2;
        }
        
        // 程序描述复杂度
        if (text.includes('程序') && text.includes('流程')) {
            complexity += 0.15;
        }
        
        // 标准描述复杂度
        if (text.includes('标准') && text.includes('要求')) {
            complexity += 0.1;
        }
        
        return Math.min(complexity, 1.5);
    }

    /**
     * 📈 计算综合意图分数
     */
    calculateIntentScore(results) {
        let score = 0;
        
        // 伪公平模式权重最高
        score += results.pseudoFairness.length * 3;
        
        // 矛盾检测权重高
        score += results.contradictions.length * 2.5;
        
        // 程序性偏向权重中等
        score += results.proceduralBias.length * 2;
        
        // 软性偏向权重较低  
        score += results.softBias.length * 1.5;
        
        // 上下文风险权重最低
        score += results.contextualRisks.length * 1;
        
        return Math.min(score / 10, 1.0); // 标准化到0-1
    }

    /**
     * 🔤 简单语义相似度计算
     */
    semanticSimilarity(text1, text2) {
        const words1 = text1.toLowerCase().split(/\W+/);
        const words2 = text2.toLowerCase().split(/\W+/);
        
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        
        return intersection.length / union.length;
    }
}

/**
 * 🚨 异常表述识别器
 * 识别规避性语言和技巧性表达
 */
class AnomalousExpressionDetector {
    constructor() {
        this.evasivePatterns = this.buildEvasivePatterns();
        this.technicalNeutralityMasks = this.buildTechnicalMasks();
        this.unusualPhraseDetectors = this.buildUnusualDetectors();
    }

    /**
     * 🌫️ 构建规避性表达模式
     */
    buildEvasivePatterns() {
        return {
            // 模糊限定词
            vagueQualifiers: {
                patterns: ['适当', '合理', '必要时', '条件允许', '情况下', '原则上'],
                purpose: '通过模糊表述避免明确承诺',
                riskLevel: 'medium'
            },
            
            // 委婉排斥表述
            euphemisticExclusion: {
                patterns: ['不太适合', '暂不考虑', '条件不成熟', '时机不当', '另行考虑'],
                purpose: '委婉地排除特定对象',
                riskLevel: 'high'
            },
            
            // 技术性门槛
            technicalBarriers: {
                patterns: ['技术要求', '专业资质', '特殊认证', '行业经验', '专门资格'],
                purpose: '通过技术门槛实现选择性限制',
                riskLevel: 'high'
            },
            
            // 时间性规避
            temporalEvasion: {
                patterns: ['分阶段', '先试点', '逐步推进', '条件成熟时', '适时推出'],
                purpose: '通过时间安排实现差别对待',
                riskLevel: 'medium'
            }
        };
    }

    /**
     * 🎭 构建技术中性掩饰模式
     */
    buildTechnicalMasks() {
        return {
            // 客观标准掩饰
            objectiveStandardMasks: [
                {
                    mask: '根据实际情况',
                    reality: '主观判断标准',
                    indicators: ['实际情况', '具体条件', '现实需要']
                },
                {
                    mask: '基于客观评估',
                    reality: '预设的评估标准',
                    indicators: ['客观评估', '综合考虑', '全面分析']
                }
            ],
            
            // 效率优先掩饰  
            efficiencyMasks: [
                {
                    mask: '提高效率',
                    reality: '限制参与主体数量',
                    indicators: ['效率', '便民', '快捷', '高效']
                },
                {
                    mask: '优化配置',
                    reality: '按照预设偏好配置',
                    indicators: ['优化配置', '合理布局', '统筹安排']
                }
            ]
        };
    }

    /**
     * 🔍 构建异常措辞检测器
     */
    buildUnusualDetectors() {
        return {
            // 不常见的限定表述
            unusualLimitations: [
                '在不影响...的前提下',
                '充分考虑...因素',
                '结合...实际情况',
                '兼顾...需要',
                '统筹...安排'
            ],
            
            // 回避责任的表述
            responsibilityEvasion: [
                '相关部门负责',
                '按照有关规定',
                '依据相关标准',
                '参照相关办法',
                '遵循相关原则'
            ]
        };
    }

    /**
     * 🚨 主检测方法
     */
    async detectAnomalousExpressions(text) {
        console.log('🚨 开始异常表述检测...');

        const results = {
            evasiveLanguage: this.detectEvasiveLanguage(text),
            technicalMasks: this.detectTechnicalMasks(text),
            unusualPhrases: this.detectUnusualPhrases(text),
            complexityAnalysis: this.analyzeLanguageComplexity(text),
            anomalyScore: 0
        };

        results.anomalyScore = this.calculateAnomalyScore(results);
        
        return results;
    }

    /**
     * 🌫️ 检测规避性语言
     */
    detectEvasiveLanguage(text) {
        const detections = [];
        
        Object.entries(this.evasivePatterns).forEach(([category, data]) => {
            const matches = data.patterns.filter(pattern => text.includes(pattern));
            if (matches.length > 0) {
                detections.push({
                    category,
                    purpose: data.purpose,
                    matches,
                    riskLevel: data.riskLevel,
                    evidence: matches.map(match => this.extractContext(text, match))
                });
            }
        });
        
        return detections;
    }

    /**
     * 🎭 检测技术中性掩饰
     */
    detectTechnicalMasks(text) {
        const masks = [];
        
        [...this.technicalNeutralityMasks.objectiveStandardMasks, 
         ...this.technicalNeutralityMasks.efficiencyMasks].forEach(mask => {
            const hasIndicators = mask.indicators.some(indicator => text.includes(indicator));
            if (hasIndicators) {
                masks.push({
                    type: 'technical_neutrality_mask',
                    mask: mask.mask,
                    suspectedReality: mask.reality,
                    evidence: mask.indicators.filter(indicator => text.includes(indicator)),
                    context: this.extractContext(text, mask.indicators[0])
                });
            }
        });
        
        return masks;
    }

    /**
     * 🔍 检测异常措辞
     */
    detectUnusualPhrases(text) {
        const unusual = [];
        
        // 检测异常限定表述
        this.unusualPhraseDetectors.unusualLimitations.forEach(phrase => {
            if (text.includes(phrase)) {
                unusual.push({
                    type: 'unusual_limitation',
                    phrase,
                    suspicion: '可能用于规避明确承诺',
                    context: this.extractContext(text, phrase)
                });
            }
        });
        
        // 检测责任回避表述
        this.unusualPhraseDetectors.responsibilityEvasion.forEach(phrase => {
            if (text.includes(phrase)) {
                unusual.push({
                    type: 'responsibility_evasion',
                    phrase,
                    suspicion: '可能用于回避具体责任',
                    context: this.extractContext(text, phrase)
                });
            }
        });
        
        return unusual;
    }

    /**
     * 📊 分析语言复杂度
     */
    analyzeLanguageComplexity(text) {
        return {
            avgSentenceLength: this.calculateAvgSentenceLength(text),
            conditionalClauses: this.countConditionalClauses(text),
            passiveVoice: this.countPassiveVoice(text),
            vagueness: this.measureVagueness(text),
            overallComplexity: 'medium' // 简化版本
        };
    }

    /**
     * 📏 计算平均句长
     */
    calculateAvgSentenceLength(text) {
        const sentences = text.split(/[。！？]/);
        const totalLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
        return sentences.length > 0 ? Math.round(totalLength / sentences.length) : 0;
    }

    /**
     * 🔢 统计条件从句
     */
    countConditionalClauses(text) {
        const conditionalWords = ['如果', '假如', '倘若', '若', '只要', '除非', '万一'];
        return conditionalWords.reduce((count, word) => {
            return count + (text.split(word).length - 1);
        }, 0);
    }

    /**
     * 🗣️ 统计被动语态
     */
    countPassiveVoice(text) {
        const passiveIndicators = ['被', '受到', '得到', '由...', '经过'];
        return passiveIndicators.reduce((count, indicator) => {
            return count + (text.split(indicator).length - 1);
        }, 0);
    }

    /**
     * 🌫️ 测量模糊度
     */
    measureVagueness(text) {
        const vagueWords = ['大概', '可能', '也许', '似乎', '一般', '通常', '基本上'];
        const vagueCount = vagueWords.reduce((count, word) => {
            return count + (text.split(word).length - 1);
        }, 0);
        
        return Math.min(vagueCount / 10, 1.0); // 标准化到0-1
    }

    /**
     * 🎯 计算异常分数
     */
    calculateAnomalyScore(results) {
        let score = 0;
        
        score += results.evasiveLanguage.length * 2;
        score += results.technicalMasks.length * 2.5;
        score += results.unusualPhrases.length * 1.5;
        score += results.complexityAnalysis.vagueness * 10;
        
        return Math.min(score / 20, 1.0);
    }

    /**
     * 📏 提取上下文 (重复方法，保持接口一致)
     */
    extractContext(text, keyword) {
        const index = text.indexOf(keyword);
        if (index === -1) return '';
        
        const start = Math.max(0, index - 30);
        const end = Math.min(text.length, index + keyword.length + 30);
        
        return text.substring(start, end);
    }
}

/**
 * 🧠 深度语义分析主控制器
 */
class DeepSemanticAnalyzer {
    constructor() {
        this.intentDetector = new ImplicitIntentDetector();
        this.expressionDetector = new AnomalousExpressionDetector();
    }

    /**
     * 🚀 执行完整的深度语义分析
     */
    async performDeepAnalysis(text) {
        console.log('🧠 启动深度语义分析...');
        
        try {
            // 并行执行两种分析
            const [implicitIntents, anomalousExpressions] = await Promise.all([
                this.intentDetector.detectImplicitIntents(text),
                this.expressionDetector.detectAnomalousExpressions(text)
            ]);

            // 综合分析结果
            const synthesis = this.synthesizeResults(implicitIntents, anomalousExpressions);
            
            return {
                implicitIntents,
                anomalousExpressions,
                synthesis,
                overallRisk: this.calculateOverallRisk(implicitIntents, anomalousExpressions),
                recommendations: this.generateRecommendations(implicitIntents, anomalousExpressions)
            };
            
        } catch (error) {
            console.error('❌ 深度语义分析失败:', error.message);
            throw error;
        }
    }

    /**
     * 🔗 综合分析结果
     */
    synthesizeResults(implicitIntents, anomalousExpressions) {
        return {
            hiddenRisks: [
                ...implicitIntents.pseudoFairness.map(pf => ({
                    type: 'pseudo_fairness',
                    description: pf.hiddenIntent,
                    severity: 'high'
                })),
                ...anomalousExpressions.technicalMasks.map(tm => ({
                    type: 'technical_mask',
                    description: tm.suspectedReality,
                    severity: 'medium'
                }))
            ],
            
            patternSummary: {
                contradictions: implicitIntents.contradictions.length,
                evasiveLanguage: anomalousExpressions.evasiveLanguage.length,
                technicalMasks: anomalousExpressions.technicalMasks.length,
                softBias: implicitIntents.softBias.length
            },
            
            confidenceLevel: Math.min(
                implicitIntents.overallIntentScore,
                anomalousExpressions.anomalyScore
            )
        };
    }

    /**
     * 🎯 计算总体风险等级
     */
    calculateOverallRisk(implicitIntents, anomalousExpressions) {
        const intentScore = implicitIntents.overallIntentScore;
        const anomalyScore = anomalousExpressions.anomalyScore;
        const combinedScore = (intentScore + anomalyScore) / 2;
        
        if (combinedScore >= 0.8) return 'very_high';
        if (combinedScore >= 0.6) return 'high';
        if (combinedScore >= 0.4) return 'medium';
        if (combinedScore >= 0.2) return 'low';
        return 'very_low';
    }

    /**
     * 💡 生成改进建议
     */
    generateRecommendations(implicitIntents, anomalousExpressions) {
        const recommendations = [];
        
        // 基于隐含意图的建议
        if (implicitIntents.contradictions.length > 0) {
            recommendations.push({
                category: 'contradiction_resolution',
                priority: 'high',
                suggestion: '消除政策内部逻辑矛盾，确保公平声明与实际措施一致'
            });
        }
        
        if (implicitIntents.pseudoFairness.length > 0) {
            recommendations.push({
                category: 'genuine_fairness',
                priority: 'high', 
                suggestion: '审查"符合条件"等限定表述，确保标准客观公正'
            });
        }

        // 基于异常表述的建议
        if (anomalousExpressions.evasiveLanguage.length > 0) {
            recommendations.push({
                category: 'language_clarity',
                priority: 'medium',
                suggestion: '使用明确具体的表述，避免模糊限定词和委婉表达'
            });
        }
        
        if (anomalousExpressions.technicalMasks.length > 0) {
            recommendations.push({
                category: 'transparency',
                priority: 'medium',
                suggestion: '明确技术标准和客观评估的具体内容，提高透明度'
            });
        }
        
        return recommendations;
    }
}

/**
 * 🚀 便捷调用接口
 */
async function analyzeDeepSemantics(text) {
    const analyzer = new DeepSemanticAnalyzer();
    return await analyzer.performDeepAnalysis(text);
}

/**
 * 🔍 快速隐含意图检测
 */
async function quickIntentDetection(text) {
    const detector = new ImplicitIntentDetector();
    return await detector.detectImplicitIntents(text);
}

/**
 * 🚨 快速异常表述检测
 */
async function quickAnomalyDetection(text) {
    const detector = new AnomalousExpressionDetector();
    return await detector.detectAnomalousExpressions(text);
}

module.exports = {
    DeepSemanticAnalyzer,
    ImplicitIntentDetector,
    AnomalousExpressionDetector,
    analyzeDeepSemantics,
    quickIntentDetection,
    quickAnomalyDetection
};