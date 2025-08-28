/**
 * 🚀 增强公平竞争分析服务 v2.0
 * 整合所有优化组件的统一分析接口
 * 核心特性：分层推理 + 语义理解 + 案例参考 + 动态优化
 */

const { EnhancedSemanticAnalyzer } = require('./enhancedSemanticAnalysis');
const { 
    createSemanticPrompt, 
    createLegalMatchingPrompt, 
    createRiskAssessmentPrompt,
    selectOptimalPrompt 
} = require('../config/optimizedPromptTemplates');
const { selectRelevantArticles } = require('./dynamicLegalLoader');
const { DeepSemanticAnalyzer } = require('./deepSemanticAnalyzer');
const { getOptimizedAIParams, recordAIPerformance } = require('../config/optimizedAiParameters');
const { findSimilarCases, getCasesByArticle } = require('../data/realCaseDatabase');
const { AIServiceFactory } = require('./aiServiceFactory');
const { deduplicateIssues } = require('../utils/issueDedupe');

/**
 * 🧠 增强公平竞争分析引擎
 */
class EnhancedCompetitionAnalysisEngine {
    constructor() {
        this.aiService = null;
        this.deepAnalyzer = new DeepSemanticAnalyzer();
        this.analysisCache = new Map();
        this.performanceMetrics = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            averageProcessingTime: 0,
            qualityScores: []
        };
    }

    /**
     * 🚀 主分析入口：全面增强分析
     */
    async performEnhancedAnalysis(text, options = {}) {
        const startTime = Date.now();
        console.log('🚀 启动增强公平竞争分析引擎...');
        
        const {
            analysisMode = 'comprehensive', // comprehensive | fast | deep
            enableCaseReference = true,
            enableDeepSemantics = true,
            maxCases = 3,
            userId = null
        } = options;

        try {
            // 初始化AI服务
            this.aiService = await AIServiceFactory.createWithFallback();
            
            // 生成缓存键
            const cacheKey = this.generateCacheKey(text, options);
            if (this.analysisCache.has(cacheKey)) {
                console.log('✅ 使用缓存的分析结果');
                return this.analysisCache.get(cacheKey);
            }

            // 阶段1：预分析和准备
            const preparationResult = await this.performPreparationPhase(text, analysisMode);
            
            // 阶段2：核心分析
            const coreAnalysis = await this.performCoreAnalysis(
                text, 
                preparationResult, 
                analysisMode,
                enableDeepSemantics
            );
            
            // 阶段3：案例增强
            const caseEnhancement = enableCaseReference ? 
                await this.performCaseEnhancement(text, coreAnalysis, maxCases) : null;
            
            // 阶段4：综合评估
            const finalAssessment = await this.performFinalAssessment(
                coreAnalysis, 
                caseEnhancement, 
                preparationResult
            );
            
            // 记录性能指标
            const processingTime = Date.now() - startTime;
            this.recordPerformanceMetrics(finalAssessment, processingTime);
            
            // 缓存结果
            this.analysisCache.set(cacheKey, finalAssessment);
            
            console.log(`✅ 增强分析完成，耗时 ${processingTime}ms`);
            return finalAssessment;
            
        } catch (error) {
            console.error('❌ 增强分析失败:', error.message);
            
            // 优雅降级到传统分析
            return await this.performFallbackAnalysis(text, options);
        }
    }

    /**
     * 🎯 阶段1：预分析和准备
     */
    async performPreparationPhase(text, analysisMode) {
        console.log('🎯 阶段1：预分析准备...');
        
        const preparation = {
            documentAnalysis: this.analyzeDocumentCharacteristics(text),
            riskIndicators: this.identifyInitialRisks(text),
            complexity: this.assessComplexity(text),
            analysisStrategy: this.selectAnalysisStrategy(text, analysisMode)
        };
        
        console.log(`📊 文档复杂度: ${preparation.complexity.level}, 风险指标: ${preparation.riskIndicators.length}个`);
        return preparation;
    }

    /**
     * 🧠 阶段2：核心分析
     */
    async performCoreAnalysis(text, preparation, analysisMode, enableDeepSemantics) {
        console.log('🧠 阶段2：核心分析...');
        
        let coreResults = {};
        
        if (analysisMode === 'comprehensive') {
            // 全面分析：三层架构
            coreResults = await this.performComprehensiveAnalysis(text, preparation);
        } else if (analysisMode === 'deep') {
            // 深度分析：专注语义理解
            coreResults = await this.performDeepAnalysisMode(text, preparation);
        } else {
            // 快速分析：优化效率
            coreResults = await this.performFastAnalysisMode(text, preparation);
        }

        // 深度语义分析增强
        if (enableDeepSemantics && (analysisMode === 'comprehensive' || analysisMode === 'deep')) {
            console.log('🕵️ 执行深度语义分析增强...');
            const deepSemantics = await this.deepAnalyzer.performDeepAnalysis(text);
            coreResults.deepSemantics = deepSemantics;
        }

        return coreResults;
    }

    /**
     * 🎯 全面分析模式
     */
    async performComprehensiveAnalysis(text, preparation) {
        console.log('🔍 执行全面三层分析...');
        
        // 第一层：语义理解
        const semanticParams = getOptimizedAIParams('semantic_understanding', preparation.documentAnalysis);
        const semanticPrompt = createSemanticPrompt(text, preparation.riskIndicators.map(r => r.type));
        
        const semanticResponse = await this.aiService.chat([{
            role: 'user',
            content: semanticPrompt
        }], semanticParams);
        
        const semanticAnalysis = this.parseAIResponse(semanticResponse.content, 'semantic');
        
        // 第二层：动态法条匹配
        const relevantArticles = await selectRelevantArticles(text, semanticAnalysis, { maxArticles: 6 });
        const legalParams = getOptimizedAIParams('legal_matching', preparation.documentAnalysis);
        const legalPrompt = createLegalMatchingPrompt(semanticAnalysis, relevantArticles, text);
        
        const legalResponse = await this.aiService.chat([{
            role: 'user',
            content: legalPrompt
        }], legalParams);
        
        const legalMatching = this.parseAIResponse(legalResponse.content, 'legal');
        
        // 第三层：风险评估
        const similarCases = await findSimilarCases(text, { maxResults: 3 });
        const riskParams = getOptimizedAIParams('risk_assessment', preparation.documentAnalysis);
        const riskPrompt = createRiskAssessmentPrompt(semanticAnalysis, legalMatching, similarCases);
        
        const riskResponse = await this.aiService.chat([{
            role: 'user',
            content: riskPrompt
        }], riskParams);
        
        const riskAssessment = this.parseAIResponse(riskResponse.content, 'risk');

        return {
            semanticAnalysis,
            legalMatching,
            riskAssessment,
            relevantArticles,
            analysisMode: 'comprehensive'
        };
    }

    /**
     * 🔬 深度分析模式
     */
    async performDeepAnalysisMode(text, preparation) {
        console.log('🔬 执行深度分析模式...');
        
        // 专注于复杂语义理解和隐含意图识别
        const deepParams = getOptimizedAIParams('semantic_understanding', preparation.documentAnalysis);
        deepParams.temperature = Math.min(deepParams.temperature + 0.1, 0.5); // 提高创造性
        deepParams.max_tokens = Math.round(deepParams.max_tokens * 1.5); // 增加输出空间
        
        const deepPrompt = `🧠 **超深度公平竞争分析**

作为顶级政策分析专家，请对以下政策进行最深层次的分析，重点关注：

**🎯 深度推理任务：**
1. **隐藏动机挖掘**: 政策制定者的真实意图是什么？
2. **执行效果预测**: 这项政策实际执行后会产生什么结果？
3. **利益相关者影响**: 不同类型的企业会如何受到影响？
4. **规避风险识别**: 是否存在技巧性表达来规避监管？

**🔍 深度分析维度：**
- 从监管者视角：这个政策如果被举报，败诉风险有多大？
- 从企业视角：外地企业面临的实际障碍和额外成本是什么？
- 从市场视角：竞争格局会发生什么根本性变化？
- 从执行视角：政策条款在实际操作中容易产生哪些偏差？

**💡 请进行逐步深度推理，最后返回详细的JSON分析结果。**

政策内容：
${text.substring(0, 8000)}`;

        const response = await this.aiService.chat([{
            role: 'user',
            content: deepPrompt
        }], deepParams);

        const deepAnalysis = this.parseAIResponse(response.content, 'deep');
        
        // 补充法条匹配
        const relevantArticles = await selectRelevantArticles(text, deepAnalysis, { maxArticles: 4 });
        
        return {
            deepAnalysis,
            relevantArticles,
            analysisMode: 'deep'
        };
    }

    /**
     * ⚡ 快速分析模式
     */
    async performFastAnalysisMode(text, preparation) {
        console.log('⚡ 执行快速分析模式...');
        
        const fastParams = getOptimizedAIParams('detailed_review', preparation.documentAnalysis);
        fastParams.max_tokens = Math.min(fastParams.max_tokens, 2500); // 限制输出长度
        fastParams.temperature = Math.max(fastParams.temperature - 0.05, 0.1); // 降低温度提高一致性
        
        const optimalPrompt = selectOptimalPrompt(text, 'enhanced', preparation.riskIndicators.map(r => r.type));
        
        const response = await this.aiService.chat([{
            role: 'user',
            content: optimalPrompt.prompt
        }], fastParams);

        const fastAnalysis = this.parseAIResponse(response.content, 'fast');
        
        return {
            fastAnalysis,
            analysisMode: 'fast'
        };
    }

    /**
     * 📚 阶段3：案例增强
     */
    async performCaseEnhancement(text, coreAnalysis, maxCases) {
        console.log('📚 阶段3：案例增强分析...');
        
        // 查找相似案例
        const similarCases = await findSimilarCases(text, { 
            maxResults: maxCases,
            minRelevance: 0.4 
        });
        
        if (similarCases.length === 0) {
            return { similarCases: [], caseInsights: '未找到相似案例' };
        }

        // 生成案例驱动的洞察
        const caseInsights = this.generateCaseInsights(similarCases, coreAnalysis);
        
        // 基于案例调整风险评估
        const adjustedRisk = this.adjustRiskBasedOnCases(coreAnalysis, similarCases);
        
        return {
            similarCases: similarCases.map(c => ({
                id: c.case.id,
                title: c.case.title,
                relevanceScore: c.relevanceScore,
                category: c.case.category,
                outcome: c.case.outcome?.decision,
                lessonLearned: c.case.lessonLearned
            })),
            caseInsights,
            adjustedRisk
        };
    }

    /**
     * 🎯 阶段4：综合评估
     */
    async performFinalAssessment(coreAnalysis, caseEnhancement, preparation) {
        console.log('🎯 阶段4：综合最终评估...');
        
        // 合成所有分析结果
        const issues = this.synthesizeIssues(coreAnalysis, caseEnhancement);
        
        // 去重和优化问题列表
        const deduplicatedIssues = deduplicateIssues(issues);
        
        // 计算综合风险评级
        const overallRisk = this.calculateOverallRisk(coreAnalysis, caseEnhancement, preparation);
        
        // 生成执行建议
        const recommendations = this.generateExecutiveRecommendations(coreAnalysis, caseEnhancement);
        
        // 计算分析质量分数
        const qualityScore = this.calculateAnalysisQuality(coreAnalysis, caseEnhancement);
        
        return {
            // 兼容传统接口的字段
            totalIssues: deduplicatedIssues.length,
            issues: deduplicatedIssues,
            overallAssessment: recommendations.executiveSummary,
            complianceRating: overallRisk.rating,
            
            // 增强分析的新字段
            enhancedAnalysis: {
                coreAnalysis,
                caseEnhancement,
                preparation,
                qualityScore,
                overallRisk,
                recommendations,
                analysisMetadata: {
                    version: '2.0',
                    timestamp: new Date(),
                    processingMode: preparation.analysisStrategy.mode,
                    aiProvider: this.aiService?.providerName,
                    confidenceLevel: this.calculateConfidenceLevel(coreAnalysis, caseEnhancement)
                }
            }
        };
    }

    /**
     * 📊 文档特征分析
     */
    analyzeDocumentCharacteristics(text) {
        return {
            textLength: text.length,
            wordCount: text.split(/\s+/).length,
            sentenceCount: text.split(/[。！？]/).length,
            legalDensity: (text.match(/第.*?条|条例|办法|规定/g) || []).length / 100,
            policyIndicators: ['政策', '措施', '办法', '规定'].filter(indicator => text.includes(indicator)).length,
            financialTerms: ['奖励', '补贴', '资金', '财政'].filter(term => text.includes(term)).length,
            geographicTerms: ['本地', '当地', '区域', '就近'].filter(term => text.includes(term)).length
        };
    }

    /**
     * 🚨 初始风险指标识别
     */
    identifyInitialRisks(text) {
        const risks = [];
        
        const riskPatterns = {
            high_risk: [
                { pattern: /本地.*?企业.*?优先/g, type: '本地企业优先' },
                { pattern: /按.*?纳税.*?奖励/g, type: '按纳税额奖励' },
                { pattern: /指定.*?供应商/g, type: '指定供应商' }
            ],
            medium_risk: [
                { pattern: /同等条件.*?优先/g, type: '同等条件优先' },
                { pattern: /就近.*?选择/g, type: '就近选择原则' },
                { pattern: /重点.*?支持/g, type: '重点支持政策' }
            ]
        };
        
        Object.entries(riskPatterns).forEach(([level, patterns]) => {
            patterns.forEach(({ pattern, type }) => {
                if (pattern.test(text)) {
                    risks.push({ type, level, pattern: pattern.source });
                }
            });
        });
        
        return risks;
    }

    /**
     * 📏 评估文档复杂度
     */
    assessComplexity(text) {
        const characteristics = this.analyzeDocumentCharacteristics(text);
        
        let complexityScore = 0;
        
        // 长度复杂度
        if (characteristics.textLength > 8000) complexityScore += 0.3;
        else if (characteristics.textLength > 4000) complexityScore += 0.2;
        else if (characteristics.textLength > 2000) complexityScore += 0.1;
        
        // 法律密度复杂度
        complexityScore += Math.min(characteristics.legalDensity * 0.5, 0.3);
        
        // 政策指标复杂度
        complexityScore += Math.min(characteristics.policyIndicators * 0.1, 0.2);
        
        // 特殊术语复杂度
        complexityScore += Math.min((characteristics.financialTerms + characteristics.geographicTerms) * 0.05, 0.2);
        
        const level = complexityScore >= 0.8 ? 'very_high' :
                     complexityScore >= 0.6 ? 'high' :
                     complexityScore >= 0.4 ? 'medium' :
                     complexityScore >= 0.2 ? 'low' : 'very_low';
        
        return { score: complexityScore, level, factors: characteristics };
    }

    /**
     * 🎯 选择分析策略
     */
    selectAnalysisStrategy(text, analysisMode) {
        const complexity = this.assessComplexity(text);
        
        let strategy = {
            mode: analysisMode,
            layers: analysisMode === 'comprehensive' ? 3 : analysisMode === 'deep' ? 2 : 1,
            focusAreas: [],
            timeoutMultiplier: 1.0
        };
        
        // 根据复杂度调整策略
        if (complexity.level === 'very_high' || complexity.level === 'high') {
            strategy.timeoutMultiplier = 1.5;
            strategy.focusAreas.push('complex_document_handling');
        }
        
        // 根据风险指标调整策略
        const risks = this.identifyInitialRisks(text);
        if (risks.some(r => r.level === 'high_risk')) {
            strategy.focusAreas.push('high_risk_pattern_analysis');
        }
        
        return strategy;
    }

    /**
     * 💡 生成案例洞察
     */
    generateCaseInsights(similarCases, coreAnalysis) {
        if (similarCases.length === 0) return '无相似案例参考';
        
        const insights = [];
        
        // 分析案例结果趋势
        const outcomes = similarCases.map(c => c.case.outcome?.decision).filter(Boolean);
        const violationRate = outcomes.filter(o => o.includes('违规') || o.includes('停止')).length / outcomes.length;
        
        insights.push(`相似案例违规认定率: ${Math.round(violationRate * 100)}%`);
        
        // 分析常见问题
        const commonIssues = similarCases.map(c => c.case.category);
        const mostCommonCategory = this.findMostFrequent(commonIssues);
        insights.push(`最常见问题类型: ${mostCommonCategory}`);
        
        // 生成预测性洞察
        if (violationRate > 0.7) {
            insights.push('⚠️ 高风险：相似案例多数被认定违规，建议重点审查');
        } else if (violationRate < 0.3) {
            insights.push('✅ 相对安全：相似案例违规率较低，但仍需谨慎');
        }
        
        return insights.join('\n');
    }

    /**
     * 📊 基于案例调整风险
     */
    adjustRiskBasedOnCases(coreAnalysis, similarCases) {
        let adjustedRisk = 'medium';
        
        if (similarCases.length > 0) {
            const highRiskCases = similarCases.filter(c => c.case.severity === 'high').length;
            const riskRatio = highRiskCases / similarCases.length;
            
            if (riskRatio > 0.6) {
                adjustedRisk = 'high';
            } else if (riskRatio < 0.3) {
                adjustedRisk = 'low';
            }
        }
        
        return {
            level: adjustedRisk,
            reasoning: `基于${similarCases.length}个相似案例的风险调整`,
            caseInfluence: similarCases.length > 0 ? 'significant' : 'none'
        };
    }

    /**
     * 🔗 合成问题列表
     */
    synthesizeIssues(coreAnalysis, caseEnhancement) {
        const issues = [];
        let issueId = 1;
        
        // 从核心分析中提取问题
        if (coreAnalysis.legalMatching?.directMatches) {
            coreAnalysis.legalMatching.directMatches.forEach(match => {
                issues.push({
                    id: issueId++,
                    severity: match.severity,
                    title: `法条直接违规：${match.article}`,
                    description: match.reasoning,
                    quote: this.extractRelevantQuote(match.reasoning, coreAnalysis.semanticAnalysis),
                    violation: `违反《公平竞争审查条例实施办法》${match.article}`,
                    competitiveImpact: coreAnalysis.semanticAnalysis?.competitiveImpact || '影响市场公平竞争',
                    suggestion: `立即修改相关条款，${this.getSuggestionByArticle(match.article)}`
                });
            });
        }
        
        // 从深度语义分析中提取问题
        if (coreAnalysis.deepSemantics?.implicitIntents) {
            coreAnalysis.deepSemantics.implicitIntents.pseudoFairness.forEach(pf => {
                issues.push({
                    id: issueId++,
                    severity: pf.riskLevel,
                    title: `隐含倾向：${pf.pattern}`,
                    description: pf.hiddenIntent,
                    quote: pf.evidence,
                    violation: '存在隐性违规倾向',
                    competitiveImpact: '可能造成实际竞争不公平',
                    suggestion: '建议澄清表述，避免执行中产生偏向性效果'
                });
            });
        }
        
        // 添加案例支持的问题
        if (caseEnhancement?.similarCases) {
            caseEnhancement.similarCases.forEach(similarCase => {
                if (similarCase.relevanceScore > 0.7) {
                    issues.push({
                        id: issueId++,
                        severity: 'medium',
                        title: `案例警示：${similarCase.title}`,
                        description: `发现与已知违规案例的相似性`,
                        quote: '整体政策导向',
                        violation: `参考案例违规认定`,
                        competitiveImpact: '基于案例经验的风险提示',
                        suggestion: `参考案例整改经验：${similarCase.lessonLearned}`
                    });
                }
            });
        }
        
        return issues;
    }

    /**
     * 🎯 计算综合风险
     */
    calculateOverallRisk(coreAnalysis, caseEnhancement, preparation) {
        let riskScore = 50; // 基础风险分数
        
        // 基于核心分析调整
        if (coreAnalysis.riskAssessment?.riskScore) {
            riskScore = coreAnalysis.riskAssessment.riskScore;
        } else if (coreAnalysis.legalMatching?.directMatches) {
            riskScore += coreAnalysis.legalMatching.directMatches.length * 15;
        }
        
        // 基于案例调整
        if (caseEnhancement?.adjustedRisk) {
            const caseAdjustment = {
                'high': 20,
                'medium': 0,
                'low': -15
            }[caseEnhancement.adjustedRisk.level] || 0;
            
            riskScore += caseAdjustment;
        }
        
        // 基于复杂度调整
        if (preparation.complexity.level === 'very_high') {
            riskScore += 10;
        }
        
        // 转换为等级
        const rating = riskScore >= 80 ? 'F' :
                      riskScore >= 65 ? 'D' :
                      riskScore >= 50 ? 'C' :
                      riskScore >= 35 ? 'B' : 'A';
        
        return {
            score: Math.min(Math.max(riskScore, 0), 100),
            rating,
            level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
            factors: [
                `核心分析得分: ${Math.round(riskScore)}`,
                caseEnhancement ? `案例调整: ${caseEnhancement.adjustedRisk.level}` : null,
                `文档复杂度: ${preparation.complexity.level}`
            ].filter(Boolean)
        };
    }

    /**
     * 💼 生成执行建议
     */
    generateExecutiveRecommendations(coreAnalysis, caseEnhancement) {
        const recommendations = {
            immediateActions: [],
            mediumTermActions: [],
            longTermActions: [],
            executiveSummary: ''
        };
        
        // 基于核心分析的建议
        if (coreAnalysis.legalMatching?.directMatches?.length > 0) {
            recommendations.immediateActions.push('立即停止执行可能违规的政策条款');
            recommendations.immediateActions.push('组织法律专家团队进行全面审查');
        }
        
        // 基于案例的建议
        if (caseEnhancement?.similarCases?.length > 0) {
            recommendations.mediumTermActions.push('参考相似案例的整改经验');
            recommendations.mediumTermActions.push('建立案例库防范相似问题');
        }
        
        // 长期建议
        recommendations.longTermActions.push('建立公平竞争审查制度');
        recommendations.longTermActions.push('定期开展合规性评估');
        
        // 生成执行摘要
        const riskLevel = this.calculateOverallRisk(coreAnalysis, caseEnhancement, {}).level;
        const issueCount = coreAnalysis.legalMatching?.directMatches?.length || 0;
        
        recommendations.executiveSummary = `经增强AI分析，该政策存在${riskLevel}风险，发现${issueCount}项直接违规问题。` +
            (caseEnhancement?.similarCases?.length > 0 ? `参考${caseEnhancement.similarCases.length}个相似案例，` : '') +
            `建议${recommendations.immediateActions.length > 0 ? '立即整改' : '谨慎评估'}。`;
        
        return recommendations;
    }

    /**
     * 📊 计算分析质量分数
     */
    calculateAnalysisQuality(coreAnalysis, caseEnhancement) {
        let qualityScore = 70; // 基础质量分数
        
        // 分析深度评分
        if (coreAnalysis.semanticAnalysis?.confidenceLevel) {
            qualityScore += coreAnalysis.semanticAnalysis.confidenceLevel * 15;
        }
        
        // 法条匹配质量
        if (coreAnalysis.legalMatching?.overallAssessment) {
            qualityScore += 10;
        }
        
        // 案例支持质量
        if (caseEnhancement?.similarCases?.length > 0) {
            qualityScore += Math.min(caseEnhancement.similarCases.length * 3, 10);
        }
        
        // 深度语义分析加分
        if (coreAnalysis.deepSemantics) {
            qualityScore += 5;
        }
        
        return Math.min(Math.max(qualityScore, 0), 100);
    }

    /**
     * 📈 计算置信度
     */
    calculateConfidenceLevel(coreAnalysis, caseEnhancement) {
        let confidence = 0.7; // 基础置信度
        
        // 语义分析置信度
        if (coreAnalysis.semanticAnalysis?.confidenceLevel) {
            confidence = Math.max(confidence, coreAnalysis.semanticAnalysis.confidenceLevel);
        }
        
        // 法律匹配置信度
        if (coreAnalysis.legalMatching?.legalConfidence) {
            confidence = (confidence + coreAnalysis.legalMatching.legalConfidence) / 2;
        }
        
        // 案例支持提升置信度
        if (caseEnhancement?.similarCases?.length > 0) {
            confidence = Math.min(confidence + 0.1, 0.95);
        }
        
        return confidence;
    }

    /**
     * 🚨 降级分析
     */
    async performFallbackAnalysis(text, options) {
        console.warn('⚠️ 执行降级分析...');
        
        try {
            // 使用传统的优化提示词
            const traditionalParams = getOptimizedAIParams('detailed_review');
            const fallbackPrompt = selectOptimalPrompt(text, 'enhanced');
            
            const response = await this.aiService.chat([{
                role: 'user',
                content: fallbackPrompt.prompt
            }], traditionalParams);
            
            const fallbackResult = this.parseAIResponse(response.content, 'fallback');
            
            return {
                ...fallbackResult,
                fallbackMode: true,
                enhancedAnalysis: {
                    analysisMetadata: {
                        version: '1.5',
                        mode: 'fallback',
                        timestamp: new Date()
                    }
                }
            };
            
        } catch (error) {
            console.error('❌ 降级分析也失败了:', error.message);
            throw error;
        }
    }

    /**
     * 🔧 工具方法集合
     */
    
    parseAIResponse(content, type) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn(`⚠️ ${type}分析JSON解析失败，使用文本分析`);
        }
        
        return this.createFallbackResponse(type, content);
    }
    
    createFallbackResponse(type, content) {
        const responses = {
            'semantic': {
                keyInsights: ['需要进一步分析'],
                competitiveImpact: content.substring(0, 200),
                confidenceLevel: 0.6
            },
            'legal': {
                directMatches: [],
                overallAssessment: content.substring(0, 300)
            },
            'risk': {
                riskScore: 50,
                overallRisk: 'C',
                executiveSummary: content.substring(0, 200)
            },
            'fallback': {
                totalIssues: 1,
                issues: [{
                    id: 1,
                    title: 'AI分析结果',
                    description: content.substring(0, 500),
                    severity: 'medium'
                }]
            }
        };
        
        return responses[type] || { result: content };
    }
    
    extractRelevantQuote(reasoning, semanticAnalysis) {
        if (semanticAnalysis?.hiddenIntentions?.length > 0) {
            return semanticAnalysis.hiddenIntentions[0];
        }
        return '相关政策表述';
    }
    
    getSuggestionByArticle(article) {
        const suggestions = {
            '第八条': '确保所有符合条件的经营者都能公平参与',
            '第九条': '删除地域性限制表述',
            '第二十一条': '建立基于客观标准的奖励机制',
            '第十九条': '确保政府采购对所有经营者一视同仁'
        };
        return suggestions[article] || '确保符合公平竞争要求';
    }
    
    findMostFrequent(array) {
        const frequency = {};
        array.forEach(item => frequency[item] = (frequency[item] || 0) + 1);
        return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
    }
    
    generateCacheKey(text, options) {
        const keyComponents = [
            text.substring(0, 200),
            options.analysisMode || 'comprehensive',
            options.enableCaseReference ? '1' : '0',
            options.enableDeepSemantics ? '1' : '0'
        ];
        return Buffer.from(keyComponents.join('|')).toString('base64').substring(0, 32);
    }
    
    recordPerformanceMetrics(result, processingTime) {
        this.performanceMetrics.totalAnalyses++;
        if (result.totalIssues !== undefined) {
            this.performanceMetrics.successfulAnalyses++;
        }
        
        this.performanceMetrics.averageProcessingTime = 
            (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalAnalyses - 1) + processingTime) / 
            this.performanceMetrics.totalAnalyses;
        
        if (result.enhancedAnalysis?.qualityScore) {
            this.performanceMetrics.qualityScores.push(result.enhancedAnalysis.qualityScore);
        }
        
        // 记录AI性能
        recordAIPerformance('enhanced_analysis', {
            success: result.totalIssues !== undefined,
            responseTime: processingTime,
            quality: result.enhancedAnalysis?.qualityScore || 0
        });
    }
    
    getPerformanceReport() {
        return {
            ...this.performanceMetrics,
            averageQuality: this.performanceMetrics.qualityScores.length > 0 ? 
                this.performanceMetrics.qualityScores.reduce((a, b) => a + b, 0) / this.performanceMetrics.qualityScores.length : 0,
            successRate: this.performanceMetrics.totalAnalyses > 0 ? 
                this.performanceMetrics.successfulAnalyses / this.performanceMetrics.totalAnalyses : 0
        };
    }
}

// 创建全局分析引擎实例
const globalAnalysisEngine = new EnhancedCompetitionAnalysisEngine();

/**
 * 🚀 便捷接口函数
 */

/**
 * 执行增强公平竞争分析
 */
async function performEnhancedCompetitionAnalysis(text, options = {}) {
    return await globalAnalysisEngine.performEnhancedAnalysis(text, options);
}

/**
 * 快速分析接口
 */
async function quickCompetitionAnalysis(text) {
    return await globalAnalysisEngine.performEnhancedAnalysis(text, {
        analysisMode: 'fast',
        enableDeepSemantics: false
    });
}

/**
 * 深度分析接口
 */
async function deepCompetitionAnalysis(text) {
    return await globalAnalysisEngine.performEnhancedAnalysis(text, {
        analysisMode: 'deep',
        enableDeepSemantics: true,
        enableCaseReference: true
    });
}

/**
 * 获取性能报告
 */
function getAnalysisPerformanceReport() {
    return globalAnalysisEngine.getPerformanceReport();
}

module.exports = {
    EnhancedCompetitionAnalysisEngine,
    performEnhancedCompetitionAnalysis,
    quickCompetitionAnalysis,
    deepCompetitionAnalysis,
    getAnalysisPerformanceReport,
    // 导出全局实例
    globalAnalysisEngine
};