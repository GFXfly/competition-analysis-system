/**
 * 🚀 优化的提示词模板 v2.0
 * 专门针对DeepSeek V3.1推理能力优化
 * 核心理念：简洁精准，突出推理要求，分层引导
 */

/**
 * 🧠 DeepSeek V3.1推理优化配置
 */
const DEEPSEEK_REASONING_CONFIG = {
    // 推理引导词
    reasoningTriggers: [
        "让我逐步分析",
        "需要深入思考",
        "从多个角度考虑",
        "进行系统性推理"
    ],
    
    // 思考框架
    thinkingFramework: [
        "表面现象 vs 深层意图",
        "直接影响 vs 间接效果", 
        "明确表述 vs 隐含含义",
        "短期影响 vs 长期后果"
    ],

    // 关键推理词汇
    criticalReasoningWords: [
        "假设", "推断", "可能导致", "实际效果",
        "换个角度", "深层原因", "潜在风险", "间接影响"
    ]
};

/**
 * 🎯 语义理解层提示词模板（简洁版）
 */
function createSemanticPrompt(text, focusAreas = []) {
    const focusGuidance = focusAreas.length > 0 ? 
        `\n🎯 **重点关注**: ${focusAreas.join('、')}` : '';

    return `🧠 **深度语义分析任务**

你是资深政策分析专家。请运用逐步推理，深入分析以下政策的真实意图和潜在影响。

**📋 核心推理框架:**
1. **表面 vs 实质**: 政策表面说什么？实际可能产生什么效果？
2. **受益者分析**: 谁会从这项政策中受益？谁可能受损？
3. **竞争效应**: 如果你是外地企业，这项政策对你意味着什么？
4. **隐蔽程度**: 是否使用技巧性语言来掩盖倾向性？

**🔍 特别敏感的表述模式:**
- "优先"、"重点"、"倾斜" → 可能存在选择性倾向
- "就近"、"属地"、"本地" → 可能存在地域限制
- "根据贡献"、"按照规模" → 可能存在差别对待
- "符合条件"、"名单内" → 可能存在准入限制${focusGuidance}

**🎯 请逐步推理分析，最后返回JSON:**
{
  "keyInsights": ["核心发现1", "核心发现2", "核心发现3"],
  "competitiveImpact": "对竞争的具体影响",
  "hiddenIntentions": ["隐含意图1", "隐含意图2"], 
  "riskIndicators": ["风险信号1", "风险信号2"],
  "confidenceLevel": 0.85
}

**📄 分析文档:**
${text}`;
}

/**
 * ⚖️ 法律匹配层提示词模板（动态法条版）
 */
function createLegalMatchingPrompt(semanticResults, relevantArticles, text) {
    const articleSummary = relevantArticles.map(art => 
        `• ${art.number}: ${art.title}`
    ).join('\n');

    return `⚖️ **精准法条匹配任务**

基于语义分析结果，请进行精准的法条匹配推理：

**📊 语义分析输入:**
- 核心发现: ${semanticResults.keyInsights?.join('、')}
- 竞争影响: ${semanticResults.competitiveImpact}
- 风险信号: ${semanticResults.riskIndicators?.join('、')}

**📚 相关法条（已筛选）:**
${articleSummary}

**🧠 推理要求:**
让我逐步分析每个风险信号与法条的对应关系：

1. **直接匹配**: 哪些风险明确违反了具体法条？
2. **间接关联**: 哪些情况可能在实施中产生违规效果？
3. **组合风险**: 多个条款是否存在组合违规？
4. **程度评估**: 违规的严重程度如何？

**🎯 深度思考**: 
从监管者角度：这些问题如果被举报，胜诉概率如何？
从企业角度：这些限制会如何影响实际经营？
从竞争角度：市场格局会发生什么变化？

**返回JSON格式:**
{
  "directMatches": [{"article": "第X条", "severity": "high/medium/low", "reasoning": "推理过程"}],
  "indirectRisks": [{"article": "第X条", "riskLevel": "high/medium/low", "scenario": "可能场景"}],
  "overallAssessment": "综合法律风险评估"
}`;
}

/**
 * 🎯 风险评估层提示词模板（决策导向版）
 */
function createRiskAssessmentPrompt(semanticResults, legalResults, similarCases) {
    const caseContext = similarCases.map(c => 
        `• ${c.type}: ${c.outcome}`
    ).join('\n');

    return `🎯 **综合风险评估决策**

作为风险评估专家，请基于多层分析结果，做出最终风险判断：

**📈 分析输入汇总:**
- 语义置信度: ${semanticResults.confidenceLevel}
- 直接违规: ${legalResults.directMatches?.length || 0}项
- 间接风险: ${legalResults.indirectRisks?.length || 0}项

**📚 相似案例参考:**
${caseContext}

**🧠 系统性推理要求:**

让我从多个维度进行深度评估：

**风险维度分析:**
1. **确定性**: 基于现有证据，违规的概率是多少？
2. **严重性**: 如果违规成立，影响程度如何？
3. **可检测性**: 监管部门发现这些问题的难易程度？
4. **整改性**: 如果需要整改，难度和成本如何？

**情景推演:**
- 最好情况: 如果所有疑似问题都被合理解释...
- 最坏情况: 如果所有风险点都被认定为违规...
- 最可能情况: 基于经验和案例，实际结果可能是...

**🎯 决策建议思路:**
从政策制定者角度: 是否值得承担这些法律风险？
从监管者角度: 这份政策是否需要重点审查？
从市场角度: 这些措施对竞争环境的长期影响？

**最终返回JSON:**
{
  "riskLevel": "A/B/C/D/F",
  "riskScore": 85,
  "certainty": 0.78,
  "keyRiskFactors": ["因素1", "因素2"],
  "recommendedAction": "immediate_revision/careful_review/minor_adjustment/acceptable",
  "executiveSummary": "给决策者的核心建议"
}`;
}

/**
 * 🔄 传统详细审查提示词（简化优化版）
 * 用于向后兼容现有系统
 */
function createOptimizedDetailedReviewPrompt(text) {
    return `🔍 **公平竞争审查专家分析**

请运用深度推理，系统分析以下政策是否存在排除、限制竞争的问题。

**🧠 推理方法:**
1. **换位思考**: 如果我是外地企业/小企业/新入企业，这个政策对我意味着什么？
2. **效果导向**: 不只看条文写了什么，更要看实际执行会产生什么结果
3. **隐蔽识别**: 注意"技术中性"表述下的实质倾向性

**⚡ 重点审查领域:**
- 市场准入: 是否设置不必要的门槛？
- 地域限制: 是否偏向本地企业？  
- 财政措施: 奖励标准是否公平？
- 政府采购: 评分是否一视同仁？

**🎯 推理过程要求:**
让我逐步分析每个可疑表述 → 评估实际影响 → 匹配相关法条 → 判断违规程度

**返回标准JSON:**
{
  "totalIssues": 数字,
  "issues": [{
    "id": 1,
    "title": "问题标题", 
    "description": "详细分析",
    "quote": "原文引用",
    "violation": "违反《公平竞争审查条例实施办法》第X条",
    "suggestion": "具体修改建议"
  }],
  "overallAssessment": "整体评估和建议"
}

**📄 待分析政策:**
${text.substring(0, 6000)}`;
}

/**
 * 💡 智能提示词选择器
 * 根据文档特征和分析需求选择最优提示词
 */
function selectOptimalPrompt(text, analysisType = 'enhanced', focusAreas = []) {
    const textLength = text.length;
    const hasComplexStructure = text.includes('条款') && text.includes('第') && text.includes('款');
    const hasFinancialTerms = /奖励|补贴|资金|财政/.test(text);
    const hasGeographicTerms = /本地|当地|区域|就近/.test(text);

    // 动态优化参数
    const optimizedParams = {
        maxTokens: textLength > 5000 ? 4000 : 3000,
        temperature: hasComplexStructure ? 0.25 : 0.35,  // 复杂文档更保守
        reasoning_effort: hasFinancialTerms || hasGeographicTerms ? 'maximum' : 'high'
    };

    // 智能焦点识别
    const autoFocusAreas = [];
    if (hasFinancialTerms) autoFocusAreas.push('财政措施分析');
    if (hasGeographicTerms) autoFocusAreas.push('地域限制检查');
    if (text.includes('采购') || text.includes('招标')) autoFocusAreas.push('政府采购审查');

    const finalFocusAreas = focusAreas.length > 0 ? focusAreas : autoFocusAreas;

    return {
        prompt: analysisType === 'semantic' ? 
                createSemanticPrompt(text, finalFocusAreas) :
                createOptimizedDetailedReviewPrompt(text),
        params: optimizedParams,
        focusAreas: finalFocusAreas
    };
}

/**
 * 🎨 提示词质量评估器
 * 评估生成的提示词的有效性
 */
function evaluatePromptQuality(prompt, expectedElements = []) {
    const quality = {
        score: 0,
        feedback: []
    };

    // 长度评估
    if (prompt.length > 2000 && prompt.length < 4000) {
        quality.score += 20;
    } else {
        quality.feedback.push('提示词长度可能需要调整');
    }

    // 推理引导词检查
    const hasReasoningTriggers = DEEPSEEK_REASONING_CONFIG.reasoningTriggers
        .some(trigger => prompt.includes(trigger));
    if (hasReasoningTriggers) {
        quality.score += 25;
    } else {
        quality.feedback.push('缺少推理引导词');
    }

    // 结构化输出检查
    if (prompt.includes('JSON') && prompt.includes('{')) {
        quality.score += 20;
    } else {
        quality.feedback.push('缺少结构化输出要求');
    }

    // 具体性检查
    const specificTerms = ['具体', '详细', '准确', '明确'];
    const specificityScore = specificTerms.filter(term => prompt.includes(term)).length * 5;
    quality.score += Math.min(specificityScore, 20);

    // 覆盖度检查
    const coverageScore = expectedElements.filter(element => 
        prompt.toLowerCase().includes(element.toLowerCase())
    ).length * 3;
    quality.score += Math.min(coverageScore, 15);

    quality.score = Math.min(quality.score, 100);
    quality.level = quality.score >= 80 ? 'excellent' : 
                   quality.score >= 60 ? 'good' : 
                   quality.score >= 40 ? 'acceptable' : 'needs_improvement';

    return quality;
}

module.exports = {
    createSemanticPrompt,
    createLegalMatchingPrompt,
    createRiskAssessmentPrompt,
    createOptimizedDetailedReviewPrompt,
    selectOptimalPrompt,
    evaluatePromptQuality,
    DEEPSEEK_REASONING_CONFIG
};