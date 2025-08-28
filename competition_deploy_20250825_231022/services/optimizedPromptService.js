const axios = require('axios');
const { FAIR_COMPETITION_ARTICLES } = require('../config/legalFramework');

/**
 * 针对DeepSeek-R1优化的提示词服务
 * 利用R1的推理链特性，大幅提升违规检测精准度
 */

/**
 * 优化的语义分析提示词 - 专门针对DeepSeek-R1
 */
function createSemanticAnalysisPrompt(text) {
    return `你是资深的公平竞争审查专家。请运用逐步推理的方法，深入分析以下政策文本是否违反公平竞争原则。

<思维过程>
请按照以下步骤进行分析，每一步都要详细推理：

步骤1：识别政策类型和适用范围
- 这是什么类型的政策文件？
- 主要涉及哪些经营者或市场主体？
- 政策的实施范围和影响对象是什么？

步骤2：寻找潜在违规表述
仔细寻找以下违规模式（每找到一个都要标出具体原文）：
a) 限定特定经营者：如"限定"、"指定"、"必须选择XX公司"
b) 地域歧视：如"本地企业"、"当地供应商"、"外地企业需要额外..."
c) 不合理准入条件：如"只有XX资质"、"必须具备XX条件"
d) 经济贡献导向：如"按纳税额给予"、"根据产值奖励"
e) 变相限制：如"优先本地"、"推荐名单"、"建议采用"

步骤3：逐句分析可疑内容
对每个可疑句子进行分析：
- 原文是什么？
- 这句话会对市场竞争产生什么影响？
- 是否排除了某些经营者的参与机会？
- 违反了《公平竞争审查条例实施办法》第几条？

步骤4：综合判断
- 总共发现几个违规问题？
- 这些问题的严重程度如何？
- 是否需要进行公平竞争审查？
</思维过程>

【违规案例示例】
违规案例1："政府采购项目优先选择本地企业，外地企业需额外提供担保"
分析：明显的地域歧视，违反第13条

违规案例2："建立推荐供应商名录，建议采购部门优先从名录中选择"
分析：变相限定特定经营者，违反第8条

违规案例3："按企业年度纳税额给予1-10%的奖励补贴"
分析：以经济贡献为依据，违反公平竞争原则

【合规案例示例】
合规案例："所有符合技术标准的企业均可参与投标，不得设置歧视性条件"
分析：公平开放，符合要求

【待分析政策文本】
${text}

【输出要求】
请严格按照以下JSON格式输出，不要添加任何其他内容：

{
  "stepByStepReasoning": {
    "step1_policyType": "政策类型识别结果",
    "step2_suspiciousFindings": ["发现的可疑表述1", "可疑表述2"],
    "step3_detailedAnalysis": [
      {
        "originalQuote": "原文准确引用",
        "analysis": "详细分析",
        "violationType": "违规类型",
        "articleViolated": "违反《公平竞争审查条例实施办法》具体条款"
      }
    ],
    "step4_judgment": "综合判断结果"
  },
  "finalResult": {
    "hasViolation": true/false,
    "confidence": 0.0-1.0,
    "riskLevel": "high/medium/low/none",
    "totalIssues": 数字,
    "mainConcerns": ["具体问题1", "具体问题2"],
    "recommendReview": true/false
  }
}`;
}

/**
 * 优化的详细审查提示词 - 基于推理链
 */
function createDetailedReviewPrompt(text) {
    return `你是权威的公平竞争审查专家，精通《公平竞争审查条例实施办法》。请按照以下步骤对政策文本进行系统化深度审查。

【核心原则】
1. 必须逐字逐句分析，不放过任何可疑表述
2. 所有引用必须准确，不得有丝毫改动
3. 每个判断都必须有明确法条依据
4. 如果没有问题，明确说明"符合公平竞争要求"

【审查步骤】

步骤1：文档类型识别
- 确定文档性质：政府采购？产业政策？市场准入？
- 识别影响对象：哪些市场主体会受到影响？
- 评估影响范围：本地、区域还是全国性政策？

步骤2：敏感词汇扫描
严格查找以下高风险表述：
• 限定类："限定"、"指定"、"必须使用"、"只能选择"、"仅限"
• 歧视类："本地企业"、"当地供应商"、"外地企业需要"、"本市注册"
• 优惠类："优先"、"倾斜"、"照顾"、"扶持本地"
• 壁垒类："门槛"、"资质要求"、"准入条件"、"经营年限"
• 补贴类："按纳税额"、"根据产值"、"贡献大小"

步骤3：逐条法规对照
严格按照《公平竞争审查条例实施办法》进行对照：

【核心条款详细对照】

第8条 - 不得限定经营、购买、使用特定经营者提供的商品和服务
⚠️ 重点查找："限定"、"指定"、"必须使用XX品牌"、"只能选择"、"仅限XX公司"

第9条 - 不得限定经营者应当在特定区域注册登记  
⚠️ 重点查找："必须在本地注册"、"应当在XX市登记"、"注册地限定"

第10条 - 不得限定经营者应当在特定区域投资
⚠️ 重点查找："限定投资地点"、"必须在本地投资"、"投资门槛"

第11条 - 不得限定经营者应当设立分支机构
⚠️ 重点查找："要求设立办事处"、"必须有本地机构"、"分公司要求"

第12条 - 不得限定经营者应当在特定区域生产经营
⚠️ 重点查找："限定生产地点"、"必须本地化生产"、"生产基地要求"

第13条 - 不得对外地经营者设定歧视性标准、实行歧视性政策
⚠️ 重点查找："本地企业优先"、"外地企业需额外"、"本地供应商"

第14条 - 不得采取专门针对外地经营者的行政许可、备案
⚠️ 重点查找："外地企业需特殊审批"、"额外备案"、"双重许可"

第15条 - 不得对外地商品、服务实行歧视性价格和收费政策  
⚠️ 重点查找："本地产品优惠"、"外地产品加收"、"差别收费"

第16条 - 不得限制外地商品、服务进入本地市场
⚠️ 重点查找："禁止外地产品"、"限制市场准入"、"准入壁垒"

第17条 - 不得限制本地商品运出、服务输出  
⚠️ 重点查找："禁止出口"、"限制外销"、"本地消费优先"

第18条 - 不得限制经营者取得土地供应
⚠️ 重点查找："土地优先供应本地企业"、"用地限制"

第19条 - 不得限制经营者参与本地招标投标活动
⚠️ 重点查找："限制投标资格"、"本地企业优先"、"投标门槛"

第20条 - 不得限制经营者获得本地政府资金支持
⚠️ 重点查找："资金扶持仅限本地"、"补贴地域限制"

第21-25条 - 不当财政措施（奖励、补贴、免费等）
⚠️ 重点查找："按纳税额奖励"、"以产值为依据"、"差别化补贴"

第26-29条 - 不当准入和行为干预  
⚠️ 重点查找："不合理准入条件"、"过高资质要求"、"强制交易"

步骤4：问题影响分析
对发现的每个问题分析：
• 排除了哪些经营者参与？
• 对市场竞争造成什么损害？  
• 是否构成不公平竞争？

步骤5：最终验证确认
• 引用原文是否准确无误？
• 法条适用是否正确？
• 判断是否有充分依据？

【🚨 严格法律依据要求 - 绝对遵守！】
🚫 绝对禁止引用：
   - 《中华人民共和国反垄断法》任何条款
   - 《反垄断法》任何条文
   - 《公平竞争审查制度实施细则》任何条款
   - 任何其他法规

✅ 唯一合法引用：《公平竞争审查条例实施办法》第8-25条

【错误示例 - 绝对禁止使用】
❌ "违反《反垄断法》第三十七条"
❌ "违反《中华人民共和国反垄断法》第三十七条"
❌ "违反相关规定"
❌ "违反条款"
❌ 任何包含"反垄断法"或"制度实施细则"的表述

【正确格式 - 必须使用】
✅ "违反《公平竞争审查条例实施办法》第八条"
✅ "违反《公平竞争审查条例实施办法》第二十一条"

【重要提醒】
- 只有明确违反《公平竞争审查条例实施办法》的内容才能认定为问题
- 引用必须逐字准确，不得改动标点符号
- 违规描述必须指向具体的实施办法条款
- 每个问题都必须指明具体违反的条款
- 发现问题要详细说明修改建议

【待审查政策文本】
${text}

【严格输出格式】
请严格按照JSON格式输出，包含详细的推理过程：

{
  "documentAnalysis": {
    "documentType": "文档类型",
    "affectedSubjects": "影响对象",
    "scope": "影响范围"
  },
  "detailedFindings": [
    {
      "issueId": 1,
      "violatedArticle": "第X条",  
      "violationType": "违规类型名称",
      "originalText": "原文准确引用",
      "problemDescription": "问题具体描述", 
      "competitiveImpact": "对竞争的具体影响",
      "legalBasis": "法条依据详细说明",
      "revisionSuggestion": "具体修改建议",
      "severityLevel": "high/medium/low"
    }
  ],
  "complianceConclusion": {
    "totalViolations": 0,
    "complianceStatus": "compliant/non-compliant", 
    "overallRisk": "风险等级",
    "recommendedActions": ["建议措施1", "建议措施2"],
    "finalAssessment": "整体评价"
  },
  "auditTrail": {
    "reviewMethod": "系统化条款对照审查",
    "processingTime": "审查耗时",
    "reviewerConfidence": "审查置信度0.0-1.0"
  }
}`;
}

/**
 * 优化的案例对比提示词
 */
function createCaseComparisonPrompt(text) {
    return `作为公平竞争审查专家，请运用案例对比方法分析文本。

<分析方法>
我将提供典型的违规和合规案例，请将待分析文本与这些案例进行对比。

【典型违规案例库】

案例1：地方保护型违规
违规文本："政府采购优先选择本地企业，支持本地经济发展"
违规原因：地域歧视，违反第13条
关键特征：本地优先、地域限制

案例2：限定供应商型违规  
违规文本："指定使用XX品牌设备，确保质量统一"
违规原因：限定特定经营者，违反第8条
关键特征：指定品牌、限定选择

案例3：经济贡献型违规
违规文本："按企业纳税额给予10-50万元奖励"
违规原因：以经济贡献为依据，不公平竞争
关键特征：纳税额挂钩、差别对待

案例4：准入壁垒型违规
违规文本："申请企业必须在本市有三年以上经营经验"
违规原因：不合理准入条件，违反第26条
关键特征：本地经验要求、排斥外地企业

【典型合规案例】

合规案例1："所有符合国家标准的企业均可参与，不得设置歧视性条件"
合规特征：开放公平、无歧视

合规案例2："按照公开透明原则，建立统一的评审标准"
合规特征：程序公正、标准统一

合规案例3："支持符合条件的创新型企业，不限地域和所有制"
合规特征：条件明确、无地域限制

<对比分析步骤>
1. 识别待分析文本的核心内容
2. 寻找与典型案例相似的表述
3. 判断相似性和违规风险
4. 给出最终结论
</对比分析步骤>

【待分析文本】
${text}

请按以下格式输出：

{
  "caseComparison": {
    "similarViolationCases": ["相似的违规案例"],
    "similarComplianceCases": ["相似的合规案例"],
    "keyFeatures": ["文本关键特征"],
    "riskIndicators": ["风险指标"]
  },
  "conclusion": {
    "hasViolationPattern": true/false,
    "confidenceLevel": 0.0-1.0,
    "mainRisks": ["主要风险点"],
    "recommendations": ["建议措施"]
  }
}`;
}

/**
 * DeepSeek-R1优化的API调用
 */
async function callOptimizedAI(prompt, analysisType = 'semantic') {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
        throw new Error('未配置API密钥');
    }

    // 针对DeepSeek-R1优化的参数
    const optimizedParams = {
        model: process.env.DEEPSEEK_API_KEY ? 'deepseek-reasoner' : 'deepseek-ai/DeepSeek-R1',
        messages: [
            {
                role: "system", 
                content: "你是专业的公平竞争审查专家。请运用逐步推理的方法，进行深度分析。每个步骤都要有明确的推理过程，引用原文时必须准确无误。"
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        max_tokens: analysisType === 'detailed' ? 4000 : 2000,
        temperature: 0.1,  // 保持结果一致性
        top_p: 0.9,        // 适度的创造性
        frequency_penalty: 0.1,  // 减少重复
        presence_penalty: 0.1,   // 鼓励多样性
        seed: 42  // 固定种子确保可重现性
    };

    console.log(`🤖 调用DeepSeek-R1进行${analysisType}分析...`);
    
    const response = await axios.post(process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/chat/completions' : 'https://api.siliconflow.cn/v1/chat/completions', 
        optimizedParams,
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000, // 2分钟超时，R1需要更多推理时间
            validateStatus: status => status < 500
        }
    );

    if (response.status >= 400) {
        throw new Error(`API调用失败: ${response.status} - ${response.data?.error?.message || 'Unknown error'}`);
    }

    const content = response.data.choices[0].message.content;
    console.log(`✅ DeepSeek-R1响应长度: ${content.length} 字符`);
    
    return content;
}

/**
 * 优化的语义分析
 */
async function performOptimizedSemanticAnalysis(text) {
    try {
        const prompt = createSemanticAnalysisPrompt(text);
        const response = await callOptimizedAI(prompt, 'semantic');
        
        // 解析响应
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            
            return {
                hasViolation: result.finalResult?.hasViolation || false,
                confidence: result.finalResult?.confidence || 0.5,
                riskLevel: result.finalResult?.riskLevel || 'none',
                totalIssues: result.finalResult?.totalIssues || 0,
                mainConcerns: result.finalResult?.mainConcerns || [],
                recommendReview: result.finalResult?.recommendReview || false,
                reasoning: result.stepByStepReasoning,
                rawResponse: response
            };
        } else {
            throw new Error('AI响应格式异常，未找到JSON');
        }
    } catch (error) {
        console.error('优化语义分析失败:', error);
        throw error;
    }
}

/**
 * 优化的详细审查
 */
async function performOptimizedDetailedReview(text) {
    try {
        console.log('🔍 开始执行优化详细审查...');
        const prompt = createDetailedReviewPrompt(text);
        const response = await callOptimizedAI(prompt, 'detailed');
        
        console.log('📝 原始AI响应长度:', response.length);
        
        // 智能解析AI响应
        const result = parseAIResponse(response);
        
        // 处理新的JSON格式
        if (result.detailedFindings) {
            console.log('✅ 检测到新格式响应，发现', result.detailedFindings.length, '个问题');
            return {
                totalIssues: result.complianceConclusion?.totalViolations || result.detailedFindings.length,
                issues: result.detailedFindings.map(finding => ({
                    id: finding.issueId,
                    title: finding.violationType,
                    violationType: finding.violationType,
                    violatedArticle: finding.violatedArticle,
                    originalText: finding.originalText,
                    problemDescription: finding.problemDescription,
                    competitiveImpact: finding.competitiveImpact,
                    legalBasis: finding.legalBasis,
                    revisionSuggestion: finding.revisionSuggestion,
                    severityLevel: finding.severityLevel || 'medium'
                })),
                complianceStatus: result.complianceConclusion?.complianceStatus || 'non-compliant',
                overallAssessment: result.complianceConclusion?.finalAssessment || '',
                documentAnalysis: result.documentAnalysis,
                auditTrail: result.auditTrail,
                processingMethod: 'deepseek_optimized_review_v2',
                rawResponse: response
            };
        }
        
        // 处理旧格式（向后兼容）
        if (result.finalResult) {
            console.log('⚠️ 检测到旧格式响应，兼容处理');
            return {
                totalIssues: result.finalResult.totalIssues || 0,
                issues: result.finalResult.issues || [],
                complianceStatus: result.finalResult.complianceStatus || 'compliant',
                overallAssessment: result.finalResult.overallAssessment || '',
                reasoningProcess: result.reasoningProcess,
                processingMethod: 'deepseek_optimized_review',
                rawResponse: response
            };
        }
        
        // 如果没有结构化数据，进行智能解析
        console.log('🤖 进行智能文本解析...');
        return parseUnstructuredResponse(response);
        
    } catch (error) {
        console.error('❌ 优化详细审查失败:', error);
        throw error;
    }
}

/**
 * 智能解析AI响应
 */
function parseAIResponse(response) {
    // 首先尝试提取JSON
    const jsonMatches = response.match(/\{[\s\S]*?\}(?=\s*$|$)/g);
    if (jsonMatches && jsonMatches.length > 0) {
        // 取最大的JSON（通常是完整的结果）
        const largestJson = jsonMatches.reduce((a, b) => a.length > b.length ? a : b);
        try {
            return JSON.parse(largestJson);
        } catch (e) {
            console.warn('⚠️ JSON解析失败，尝试修复:', e.message);
            // 尝试修复常见的JSON错误
            const fixedJson = fixCommonJsonErrors(largestJson);
            try {
                return JSON.parse(fixedJson);
            } catch (e2) {
                console.warn('⚠️ JSON修复失败:', e2.message);
            }
        }
    }
    
    // 如果没有找到JSON，返回原始响应用于后续解析
    return { rawText: response };
}

/**
 * 修复常见的JSON错误
 */
function fixCommonJsonErrors(jsonString) {
    return jsonString
        // 修复末尾缺少引号
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        // 修复多余的逗号
        .replace(/,(\s*[}\]])/g, '$1')
        // 修复未转义的引号
        .replace(/(?<!\\)"/g, '\\"')
        .replace(/\\"/g, '"');
}

/**
 * 解析非结构化响应
 */
function parseUnstructuredResponse(response) {
    const noIssueKeywords = ['未发现违规', '符合要求', '无违规问题', 'compliant', '符合公平竞争要求'];
    const hasNoIssue = noIssueKeywords.some(keyword => response.includes(keyword));
    
    if (hasNoIssue) {
        return {
            totalIssues: 0,
            issues: [],
            complianceStatus: 'compliant',
            overallAssessment: '经AI深度审查，未发现违规问题，符合公平竞争要求',
            processingMethod: 'intelligent_text_parsing',
            rawResponse: response
        };
    }
    
    // 尝试从文本中提取问题
    const extractedIssues = extractIssuesFromText(response);
    
    return {
        totalIssues: extractedIssues.length,
        issues: extractedIssues,
        complianceStatus: extractedIssues.length > 0 ? 'non-compliant' : 'compliant',
        overallAssessment: extractedIssues.length > 0 ? 
            `通过AI深度分析，发现${extractedIssues.length}个潜在的公平竞争问题` : 
            '经AI审查，未发现明显违规问题',
        processingMethod: 'intelligent_text_parsing',
        rawResponse: response
    };
}

/**
 * 从文本中提取问题
 */
function extractIssuesFromText(text) {
    const issues = [];
    const lines = text.split('\n');
    let currentIssue = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // 检测问题开始标志
        if (trimmedLine.match(/问题\s*\d+|违规|问题:/)) {
            if (currentIssue) {
                issues.push(currentIssue);
            }
            currentIssue = {
                id: issues.length + 1,
                violationType: trimmedLine.replace(/问题\s*\d+[:：]\s*/, ''),
                problemDescription: '',
                severityLevel: 'medium'
            };
        }
        // 提取原文引用
        else if (trimmedLine.includes('原文') || trimmedLine.includes('引用')) {
            if (currentIssue) {
                currentIssue.originalText = trimmedLine.replace(/原文[引用]*[:：]\s*/, '');
            }
        }
        // 提取法条信息
        else if (trimmedLine.includes('第') && trimmedLine.includes('条')) {
            if (currentIssue) {
                currentIssue.violatedArticle = trimmedLine.match(/第\d+条/)?.[0] || '';
                currentIssue.legalBasis = trimmedLine;
            }
        }
        // 提取修改建议
        else if (trimmedLine.includes('建议') || trimmedLine.includes('修改')) {
            if (currentIssue) {
                currentIssue.revisionSuggestion = trimmedLine.replace(/[修改]*建议[:：]\s*/, '');
            }
        }
        // 其他描述性内容
        else if (currentIssue && trimmedLine.length > 10) {
            currentIssue.problemDescription += (currentIssue.problemDescription ? ' ' : '') + trimmedLine;
        }
    }
    
    // 添加最后一个问题
    if (currentIssue) {
        issues.push(currentIssue);
    }
    
    return issues;
}

/**
 * 优化的案例对比分析
 */
async function performOptimizedCaseComparison(text) {
    try {
        const prompt = createCaseComparisonPrompt(text);
        const response = await callOptimizedAI(prompt, 'case_comparison');
        
        // 解析响应
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            
            return {
                hasViolationPattern: result.conclusion?.hasViolationPattern || false,
                confidenceLevel: result.conclusion?.confidenceLevel || 0.5,
                mainRisks: result.conclusion?.mainRisks || [],
                recommendations: result.conclusion?.recommendations || [],
                caseComparison: result.caseComparison,
                processingMethod: 'deepseek_case_comparison',
                rawResponse: response
            };
        } else {
            throw new Error('案例对比响应格式异常');
        }
    } catch (error) {
        console.error('优化案例对比失败:', error);
        throw error;
    }
}

module.exports = {
    performOptimizedSemanticAnalysis,
    performOptimizedDetailedReview,
    performOptimizedCaseComparison,
    createSemanticAnalysisPrompt,
    createDetailedReviewPrompt,
    createCaseComparisonPrompt,
    callOptimizedAI
};