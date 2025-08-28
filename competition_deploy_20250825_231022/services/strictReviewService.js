/**
 * 严格审查服务
 * 采用超高敏感度检测，发现所有可疑的公平竞争问题
 */

const { 
    EXTENDED_VIOLATION_KEYWORDS, 
    SUSPICIOUS_PATTERNS, 
    calculateRiskScore,
    STRICT_SUGGESTIONS 
} = require('../config/strictAuditConfig');
const { FAIR_COMPETITION_ARTICLES, generateViolationDescription } = require('../config/legalFramework');

/**
 * 超严格AI提示词 - 零容忍检测模式
 */
function createStrictReviewPrompt(text) {
    return `你是最严格的公平竞争审查专家，采用"疑罪从有"原则，对任何可疑表述都要深入挖掘和质疑。

【审查态度】ZERO TOLERANCE - 零容忍模式
- 对任何可能影响公平竞争的措辞都要严格质疑
- 对任何倾向性、偏向性表述都要深入分析
- 对任何模糊表达都要从最严重的角度解读
- 宁可错杀一千，绝不放过一个潜在违规

【超敏感检测要点】
请用放大镜思维，从以下角度逐字逐句分析：

1. 🔍 地域歧视显微分析：
   - "本地"、"当地"、"区域内" - 任何地域限定都是违规信号
   - "就近"、"属地"、"本土化" - 隐性地域倾向必须揭露
   - "与当地合作"、"本地伙伴" - 变相地域要求必须指出
   - 即使是"鼓励"、"推荐"本地，也是违规倾向

2. 🔍 市场准入超严审查：
   - 任何"特定"、"指定"、"限定"表述 - 直接违规
   - 任何资质要求 - 详细分析是否与经营能力直接相关
   - 任何门槛条件 - 从排除竞争角度严格评估
   - "优先考虑"、"重点支持" - 隐性准入偏向

3. 🔍 财政措施放大镜检视：
   - 任何"奖励"、"补贴"、"优惠" - 严查受益对象范围
   - "根据贡献"、"按照规模" - 经济贡献标准绝对违规
   - "政策倾斜"、"重点扶持" - 选择性支持必须质疑
   - 隐性财政优惠表述 - "可享受"、"纳入范围"

4. 🔍 采购偏向零容忍：
   - "同等条件下优先"、"价格相近时" - 明显采购偏向
   - 任何评分加分、权重倾斜 - 直接违规
   - "推荐采购"、"建议选用" - 软性偏向也要指出

5. 🔍 要素配置严查：
   - 土地、资金、资源分配中的任何偏向性
   - "优先安排"、"重点保障" - 资源分配不公
   - "绿色通道"、"快速审批" - 程序性偏向

【分析方法】
对每个句子进行三重分析：
1. 字面意思分析 - 表面是否违规
2. 隐含意图分析 - 深层是否存在倾向
3. 实际效果分析 - 执行后是否影响竞争

【⚠️ 严格法律依据要求 - 必须遵守！】
🚫 绝对禁止引用以下法规：
   - 《中华人民共和国反垄断法》任何条款（包括第三十七条、第四十六条等）
   - 《反垄断法》任何条款
   - 其他任何法规除《公平竞争审查条例实施办法》外

✅ 唯一允许引用：《公平竞争审查条例实施办法》

【⚠️ 错误示例 - 绝对禁止】
❌ "违反《反垄断法》第三十七条"
❌ "违反《中华人民共和国反垄断法》第三十七条"  
❌ "根据《反垄断法》相关规定"
❌ "行政机关和法律、法规授权的具有管理公共事务职能的组织不得滥用行政权力"（这是反垄断法条文）

【✅ 正确格式 - 必须使用】
✅ "违反《公平竞争审查条例实施办法》第八条"
✅ "违反《公平竞争审查条例实施办法》第二十一条"

【条款强制替换映射表】
- 任何涉及"行政机关滥用行政权力" → 第八条（限定特定经营者）
- 地域限制/本地优先 → 第八条（限定特定经营者）
- 区域注册要求 → 第九条（限定特定区域注册登记）
- 专营权/排他权 → 第十条（授予专营权利）
- 准入歧视条件 → 第十四条（歧视性准入退出条件）
- 财政奖励补贴 → 第二十一条（违法给予财政奖励）
- 税收优惠减免 → 第二十二条（违法减免税收）
- 政府采购偏向 → 第十九条（限制政府采购参与）

【输出要求】
对于发现的每个问题，必须：
1. 明确指出违反《公平竞争审查条例实施办法》具体条款
2. 详细说明违规原因
3. 分析对竞争的具体影响
4. 提供严格的整改建议

即使是最轻微的倾向性表述，也要作为违规问题指出！

🚨 最终检查要求：
在输出前，必须检查每个violation字段：
1. 是否包含"《公平竞争审查条例实施办法》"？如果没有，立即修正！
2. 是否包含"反垄断法"？如果包含，立即删除并替换！
3. 是否使用了"行政机关滥用行政权力"等反垄断法条文？如果有，立即替换为实施办法条款！

⚠️ 如果你在回答中使用了任何《反垄断法》相关内容，这将被视为严重错误！

请严格按照以下JSON格式返回：
{
  "totalIssues": 问题总数,
  "strictMode": true,
  "issues": [
    {
      "id": 问题编号,
      "severity": "high/medium/low",
      "title": "问题标题",
      "description": "详细问题描述",
      "quote": "原文准确引用",
      "violation": "违反《公平竞争审查条例实施办法》具体条款",
      "competitiveImpact": "对竞争的具体影响分析",
      "suggestion": "严格整改建议"
    }
  ],
  "overallAssessment": "整体评估",
  "complianceRating": "A/B/C/D/F"
}

文档内容：
${text}`;
}

/**
 * 预判断增强 - 超低门槛检测
 */
function performStrictPreCheck(text) {
    const riskAnalysis = calculateRiskScore(text);
    
    // 超低门槛 - 任何风险都进入详细审查
    if (riskAnalysis.score > 0.1 || text.length > 50) {
        return {
            needsReview: true,
            confidence: Math.max(0.8, riskAnalysis.confidence), // 提高置信度
            reason: `严格模式检测: ${riskAnalysis.reasons.join('; ')}`,
            riskScore: riskAnalysis.score,
            strictMode: true,
            processingMethod: 'strict_precheck'
        };
    }
    
    return {
        needsReview: false,
        confidence: 0.3,
        reason: '文档过短或无明显风险指标',
        strictMode: true,
        processingMethod: 'strict_precheck'
    };
}

/**
 * 关键词暴力检测 - 不放过任何可疑词汇
 */
function performBruteForceKeywordScan(text) {
    const issues = [];
    let totalIssues = 0;
    
    // 遍历所有扩展关键词
    Object.entries(EXTENDED_VIOLATION_KEYWORDS).forEach(([category, keywordTypes]) => {
        Object.entries(keywordTypes).forEach(([type, keywords]) => {
            keywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    totalIssues++;
                    issues.push({
                        id: totalIssues,
                        severity: 'medium',
                        title: `发现敏感词汇: ${keyword}`,
                        description: `文档中包含可能影响公平竞争的敏感词汇"${keyword}"`,
                        quote: extractQuoteWithKeyword(text, keyword),
                        violation: getViolationByCategory(category),
                        competitiveImpact: `可能造成市场准入障碍或竞争优势倾斜`,
                        suggestion: getSuggestionByCategory(category)
                    });
                }
            });
        });
    });
    
    // 正则模式检测
    SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => {
                totalIssues++;
                issues.push({
                    id: totalIssues,
                    severity: 'high',
                    title: `疑似违规模式 ${index + 1}`,
                    description: `检测到疑似违规表达模式`,
                    quote: match,
                    violation: '违反《公平竞争审查条例实施办法》相关条款',
                    competitiveImpact: '可能构成对特定经营者的不当优惠或限制',
                    suggestion: '建议修改表述，确保对所有经营者公平适用'
                });
            });
        }
    });
    
    return {
        totalIssues,
        issues,
        scanMethod: 'brute_force_keyword',
        strictMode: true
    };
}

/**
 * 提取包含关键词的上下文
 */
function extractQuoteWithKeyword(text, keyword) {
    const index = text.indexOf(keyword);
    if (index === -1) return keyword;
    
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + keyword.length + 20);
    
    return text.substring(start, end);
}

/**
 * 根据类别获取违规条款
 */
function getViolationByCategory(category) {
    const categoryMap = {
        local_protection: generateViolationDescription('article_8'),
        market_access: generateViolationDescription('article_14'),
        financial_incentives: generateViolationDescription('article_21'),
        procurement_bias: generateViolationDescription('article_19'),
        resource_allocation: generateViolationDescription('article_20')
    };
    
    return categoryMap[category] || '违反《公平竞争审查条例实施办法》相关条款';
}

/**
 * 根据类别获取建议
 */
function getSuggestionByCategory(category) {
    const suggestions = STRICT_SUGGESTIONS[category];
    return suggestions ? suggestions.join('\n') : '建议删除或修改相关表述，确保符合公平竞争要求';
}

/**
 * 综合严格审查
 */
async function performStrictComprehensiveReview(text) {
    // 1. 预判断
    const preCheck = performStrictPreCheck(text);
    
    // 2. 暴力关键词扫描
    const keywordScan = performBruteForceKeywordScan(text);
    
    // 3. 如果发现问题，直接返回
    if (keywordScan.totalIssues > 0) {
        return {
            ...keywordScan,
            preCheck: preCheck,
            complianceRating: keywordScan.totalIssues > 10 ? 'F' : 
                             keywordScan.totalIssues > 5 ? 'D' : 
                             keywordScan.totalIssues > 2 ? 'C' : 'B',
            overallAssessment: `严格模式检测发现${keywordScan.totalIssues}个潜在违规问题，建议全面整改`,
            strictMode: true
        };
    }
    
    // 4. 如果关键词扫描未发现问题，但预判断认为需要审查，调用AI
    if (preCheck.needsReview) {
        return {
            totalIssues: 1,
            issues: [{
                id: 1,
                severity: 'low',
                title: '需要进一步审查',
                description: '文档需要专业人员进一步审查确认',
                quote: '全文',
                violation: '待确认',
                competitiveImpact: '待评估',
                suggestion: '建议进行人工详细审查'
            }],
            preCheck: preCheck,
            complianceRating: 'C',
            overallAssessment: '文档包含需要进一步确认的内容',
            strictMode: true
        };
    }
    
    return {
        totalIssues: 0,
        issues: [],
        preCheck: preCheck,
        complianceRating: 'A',
        overallAssessment: '严格模式审查未发现明显违规问题',
        strictMode: true
    };
}

module.exports = {
    createStrictReviewPrompt,
    performStrictPreCheck,
    performBruteForceKeywordScan,
    performStrictComprehensiveReview
};