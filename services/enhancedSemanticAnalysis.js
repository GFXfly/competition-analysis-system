/**
 * 🧠 增强语义分析服务 v1.0
 * 三层分析架构：语义理解 → 法律匹配 → 风险评估
 * 专门优化DeepSeek V3.1的深度推理能力
 */

const { AIServiceFactory } = require('./aiServiceFactory');
const { FAIR_COMPETITION_ARTICLES } = require('../config/legalFramework');
const { APP_CONFIG } = require('../config/constants');

/**
 * 🎯 核心分层推理架构
 */
class EnhancedSemanticAnalyzer {
    constructor() {
        this.aiService = null;
        this.caseDatabase = this.initializeCaseDatabase();
    }

    /**
     * 🚀 主入口：三层分析流程
     */
    async analyzeDocument(text) {
        try {
            console.log('🧠 启动三层语义分析架构...');
            
            // 初始化AI服务
            this.aiService = await AIServiceFactory.createWithFallback();
            
            // 第一层：语义理解层
            const semanticAnalysis = await this.performSemanticUnderstanding(text);
            
            // 第二层：法律匹配层  
            const legalMatching = await this.performLegalMatching(semanticAnalysis, text);
            
            // 第三层：风险评估层
            const riskAssessment = await this.performRiskAssessment(semanticAnalysis, legalMatching, text);
            
            return {
                semanticAnalysis,
                legalMatching,
                riskAssessment,
                finalResult: this.synthesizeResults(semanticAnalysis, legalMatching, riskAssessment)
            };
            
        } catch (error) {
            console.error('❌ 增强语义分析失败:', error.message);
            throw error;
        }
    }

    /**
     * 🔍 第一层：语义理解层
     * 专注理解文档的真实意图和隐含含义
     */
    async performSemanticUnderstanding(text) {
        console.log('📖 第一层：语义理解分析...');
        
        const prompt = `你是语义理解专家。请深度分析以下政策文档，重点识别：

🎯 **核心任务：语义理解**
1. **表面意图 vs 隐含意图**：政策表面说什么？实际可能产生什么效果？
2. **关键利益相关者**：哪些经营者会受到影响？是否存在偏向？  
3. **潜在竞争影响**：可能如何影响市场竞争格局？
4. **规避性语言识别**：是否使用模糊语言掩盖倾向性？

🧠 **深度思考要求：**
- 用"如果我是外地企业"的视角重新审视政策
- 识别"表面公平，实际倾向"的隐蔽措辞
- 分析政策实施后的实际竞争效果
- 判断是否存在"技术性壁垒"

⚠️ **特别关注：**
- "优先考虑"、"重点支持"等软性倾向
- "同等条件下"、"符合条件的"等限定表述
- "就近选择"、"属地管理"等隐性地域要求
- "根据贡献"、"按照规模"等差别化标准

请按以下格式返回：
{
  "surfaceIntent": "政策表面意图",
  "implicitIntent": "隐含意图分析", 
  "competitiveImpact": "对竞争的影响分析",
  "stakeholderAnalysis": "利益相关者分析",
  "evasiveLanguage": ["识别的规避性语言"],
  "semanticRisks": ["语义层面的风险点"],
  "confidenceLevel": "分析置信度(0-1)"
}

文档内容：
${text.substring(0, 6000)}`;

        const response = await this.aiService.chat([{
            role: 'user',
            content: prompt
        }], {
            maxTokens: 3000,
            temperature: 0.3, // 提高创造性分析能力
            seed: 42,
            useReasoner: true, // 使用推理模型
            reasoning_effort: 'maximum'
        });

        return this.parseJsonResponse(response.content, 'semantic');
    }

    /**
     * ⚖️ 第二层：法律匹配层
     * 基于语义理解结果，精准匹配相关法条
     */
    async performLegalMatching(semanticAnalysis, text) {
        console.log('⚖️ 第二层：法律条款匹配...');
        
        // 动态选择相关法条
        const relevantArticles = this.selectRelevantArticles(semanticAnalysis);
        
        const prompt = `你是法律条款匹配专家。基于语义分析结果，请精准匹配相关法条：

📋 **语义分析结果：**
- 隐含意图：${semanticAnalysis.implicitIntent}
- 竞争影响：${semanticAnalysis.competitiveImpact}  
- 语义风险：${semanticAnalysis.semanticRisks?.join(', ')}

⚖️ **相关法条（动态筛选）：**
${relevantArticles.map(art => `${art.number} ${art.title}: ${art.content}`).join('\n')}

🎯 **匹配任务：**
1. 分析语义风险与法条的对应关系
2. 识别可能违反的具体条款
3. 评估违规严重程度
4. 考虑实际执行效果vs条文规定

🧠 **深度匹配要求：**
- 不仅看字面违规，更要看实际效果违规
- 考虑多个条款的组合违规情况  
- 分析"间接违规"和"潜在违规"
- 评估违规的严重性和影响范围

请返回：
{
  "directViolations": [{"article": "条款", "severity": "high/medium/low", "reason": "违规原因"}],
  "indirectViolations": [{"article": "条款", "potentialRisk": "潜在风险"}],
  "combinedViolations": "多条款组合违规分析",
  "legalConfidence": "法律匹配置信度(0-1)"
}`;

        const response = await this.aiService.chat([{
            role: 'user', 
            content: prompt
        }], {
            maxTokens: 2500,
            temperature: 0.2,
            useReasoner: true,
            reasoning_effort: 'high'
        });

        return this.parseJsonResponse(response.content, 'legal');
    }

    /**
     * 🎯 第三层：风险评估层
     * 综合前两层结果，进行最终风险评估
     */
    async performRiskAssessment(semanticAnalysis, legalMatching, text) {
        console.log('🎯 第三层：综合风险评估...');
        
        // 获取相似案例
        const similarCases = this.findSimilarCases(semanticAnalysis, text);
        
        const prompt = `你是风险评估专家。请基于语义分析和法律匹配结果，进行综合风险评估：

📊 **输入数据：**
语义置信度: ${semanticAnalysis.confidenceLevel}
法律匹配置信度: ${legalMatching.legalConfidence}
直接违规: ${legalMatching.directViolations?.length || 0}项
间接违规: ${legalMatching.indirectViolations?.length || 0}项

📈 **相似案例参考：**
${similarCases.map(c => `- ${c.type}: ${c.outcome}`).join('\n')}

🎯 **风险评估维度：**
1. **违规确定性**：基于证据链的违规概率
2. **影响严重性**：对市场竞争的实际影响程度
3. **隐蔽程度**：规避检查的复杂程度
4. **系统性风险**：是否存在系统性竞争扭曲
5. **监管敏感度**：当前监管环境下的风险级别

🔬 **深度风险分析：**
- 政策实施后的市场结构变化预测
- 对不同类型经营者的差异化影响
- 可能引发的连锁反应和示范效应
- 规避改进的难易程度评估

请返回：
{
  "overallRisk": "综合风险等级(A/B/C/D/F)",
  "riskScore": "风险分数(0-100)",
  "certaintyLevel": "违规确定性(0-1)",
  "impactSeverity": "影响严重性(0-1)", 
  "riskFactors": ["主要风险因素"],
  "mitigationDifficulty": "整改难度评估",
  "monitoringRecommendation": "监管建议",
  "finalAssessment": "最终风险评估结论"
}`;

        const response = await this.aiService.chat([{
            role: 'user',
            content: prompt
        }], {
            maxTokens: 2000,
            temperature: 0.25,
            useReasoner: true,
            reasoning_effort: 'maximum'
        });

        return this.parseJsonResponse(response.content, 'risk');
    }

    /**
     * 🧩 动态选择相关法条
     */
    selectRelevantArticles(semanticAnalysis) {
        const allArticles = Object.entries(FAIR_COMPETITION_ARTICLES).map(([key, article]) => ({
            key,
            ...article
        }));

        // 基于语义风险动态选择相关法条
        const riskKeywords = (semanticAnalysis.semanticRisks || []).join(' ').toLowerCase();
        
        return allArticles.filter(article => {
            // 关键词匹配
            const titleMatch = riskKeywords.includes(article.title.toLowerCase());
            const contentMatch = article.content.toLowerCase().includes('限定') || 
                                article.content.toLowerCase().includes('歧视') ||
                                article.content.toLowerCase().includes('优惠');
            
            return titleMatch || contentMatch;
        }).slice(0, 8); // 限制最多8个相关法条
    }

    /**
     * 🔍 查找相似案例
     */
    findSimilarCases(semanticAnalysis, text) {
        // 简化版案例匹配，基于关键词
        const textLower = text.toLowerCase();
        return this.caseDatabase.filter(case_ => 
            case_.keywords.some(keyword => textLower.includes(keyword))
        ).slice(0, 3);
    }

    /**
     * 📊 初始化案例数据库
     */
    initializeCaseDatabase() {
        return [
            {
                type: "地方保护案例",
                keywords: ["本地", "当地", "优先"],
                outcome: "违反第八条，要求整改",
                description: "限定本地企业参与案例"
            },
            {
                type: "财政奖励案例", 
                keywords: ["奖励", "补贴", "贡献"],
                outcome: "违反第二十一条，停止执行",
                description: "根据经济贡献给予奖励案例"
            },
            {
                type: "政府采购偏向案例",
                keywords: ["采购", "招标", "加分"],
                outcome: "违反第十九条，修改评分标准",
                description: "政府采购中本地企业加分案例"
            }
        ];
    }

    /**
     * 🔗 综合三层结果
     */
    synthesizeResults(semanticAnalysis, legalMatching, riskAssessment) {
        console.log('🔗 综合分析结果...');
        
        const issues = [];
        let issueId = 1;

        // 处理直接违规
        (legalMatching.directViolations || []).forEach(violation => {
            issues.push({
                id: issueId++,
                severity: violation.severity,
                title: `直接违规：${violation.article}`,
                description: violation.reason,
                quote: this.extractRelevantQuote(violation.reason, semanticAnalysis),
                violation: `违反《公平竞争审查条例实施办法》${violation.article}`,
                competitiveImpact: semanticAnalysis.competitiveImpact,
                suggestion: `建议立即修改相关表述，${this.getSuggestionByViolation(violation.article)}`
            });
        });

        // 处理间接违规  
        (legalMatching.indirectViolations || []).forEach(violation => {
            issues.push({
                id: issueId++,
                severity: 'medium',
                title: `潜在风险：${violation.article}`,
                description: violation.potentialRisk,
                quote: this.extractRelevantQuote(violation.potentialRisk, semanticAnalysis),
                violation: `可能违反《公平竞争审查条例实施办法》${violation.article}`,
                competitiveImpact: '存在潜在竞争影响风险',
                suggestion: '建议进一步澄清相关表述，避免实施中产生歧视性效果'
            });
        });

        return {
            totalIssues: issues.length,
            issues: issues,
            overallAssessment: riskAssessment.finalAssessment,
            complianceRating: riskAssessment.overallRisk,
            analysisQuality: 'enhanced_semantic',
            confidenceLevel: Math.min(
                semanticAnalysis.confidenceLevel || 0.8,
                legalMatching.legalConfidence || 0.8,
                riskAssessment.certaintyLevel || 0.8
            )
        };
    }

    /**
     * 📝 解析JSON响应
     */
    parseJsonResponse(content, type) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn(`⚠️ ${type}层JSON解析失败，使用备用方案`);
        }
        
        // 备用解析方案
        return this.createFallbackResponse(type, content);
    }

    /**
     * 🔄 创建备用响应
     */
    createFallbackResponse(type, content) {
        switch (type) {
            case 'semantic':
                return {
                    surfaceIntent: "需要进一步分析",
                    implicitIntent: content.substring(0, 200),
                    competitiveImpact: "存在潜在影响", 
                    confidenceLevel: 0.6
                };
            case 'legal':
                return {
                    directViolations: [],
                    indirectViolations: [],
                    legalConfidence: 0.5
                };
            case 'risk':
                return {
                    overallRisk: 'C',
                    riskScore: 50,
                    finalAssessment: content.substring(0, 300)
                };
        }
    }

    /**
     * 🎯 提取相关引用
     */
    extractRelevantQuote(reason, semanticAnalysis) {
        const riskTerms = (semanticAnalysis.evasiveLanguage || []).concat(
            semanticAnalysis.semanticRisks || []
        );
        
        // 简化版本，返回第一个相关术语
        return riskTerms[0] || '相关政策表述';
    }

    /**
     * 💡 根据违规条款获取建议
     */
    getSuggestionByViolation(article) {
        const suggestions = {
            '第八条': '确保所有符合条件的经营者都能公平参与',
            '第九条': '删除地域性限制表述',
            '第二十一条': '建立基于客观标准的奖励机制',
            '第十九条': '确保政府采购对所有经营者一视同仁'
        };
        
        return suggestions[article] || '确保符合公平竞争要求';
    }
}

module.exports = {
    EnhancedSemanticAnalyzer
};