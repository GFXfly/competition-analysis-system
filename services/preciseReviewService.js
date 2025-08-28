const axios = require('axios');
const { extractTextFromFile } = require('../utils/fileUtils');

/**
 * 精准公平竞争审查服务
 * 基于《公平竞争审查条例实施办法》（国家市场监督管理总局2025年2月28日公布）
 */

// 《公平竞争审查条例实施办法》具体条款映射
const REGULATION_ARTICLES = {
    // 第一章 总则
    article_3: "政策制定机关制定涉及经营者经济活动的政策措施，应当进行公平竞争审查",
    article_4: "政策制定机关应当按照规定的审查标准，对政策措施进行审查",
    
    // 第二章 审查标准
    article_8: "不得限定经营、购买、使用特定经营者提供的商品和服务",
    article_9: "不得限定经营者应当在特定区域注册登记",
    article_10: "不得限定经营者应当在特定区域投资",
    article_11: "不得限定经营者应当设立分支机构",
    article_12: "不得限定经营者应当在特定区域生产经营",
    article_13: "不得对外地经营者设定歧视性标准、实行歧视性政策",
    article_14: "不得采取专门针对外地经营者的行政许可、备案",
    article_15: "不得对外地商品、服务实行歧视性价格和收费政策",
    article_16: "不得限制外地商品、服务进入本地市场",
    article_17: "不得限制本地商品运出、服务输出",
    article_18: "不得限制经营者取得土地供应",
    article_19: "不得限制经营者参与本地招标投标活动",
    article_20: "不得限制经营者获得本地政府资金支持",
    article_21: "不得违法给予特定经营者财政奖励和补贴",
    article_22: "不得违法免除特定经营者需要缴纳的社会保险费用",
    article_23: "不得违法减免特定经营者税收",
    article_24: "不得违法免除特定经营者行政事业性收费或政府性基金",
    article_25: "不得违法给予特定经营者贷款贴息",
    article_26: "不得设置不合理或者歧视性的准入条件",
    article_27: "不得设定与企业能力和要求不相适应的资质资格等要求",
    article_28: "不得在资质资格获取、招标投标等方面设置与业务能力无关的条件",
    article_29: "不得强制经营者从事垄断行为或限制、排除竞争的行为"
};

// 精准关键词分类 - 按条款归类
const PRECISE_KEYWORDS = {
    // 市场准入和退出限制 (第8-14条)
    market_access: {
        keywords: ['限定经营', '限定购买', '限定使用', '特定经营者', '特定区域注册', '特定区域投资', '设立分支机构', '特定区域生产经营', '歧视性标准', '歧视性政策', '专门针对外地', '行政许可', '备案'],
        articles: ['第8条', '第9条', '第10条', '第11条', '第12条', '第13条', '第14条'],
        severity: 'high',
        category: '市场准入和退出限制'
    },
    
    // 商品和要素流动障碍 (第15-20条)
    goods_flow: {
        keywords: ['歧视性价格', '歧视性收费', '限制进入本地市场', '限制运出', '限制输出', '限制取得土地', '限制参与招标', '限制获得政府资金', '本地企业', '当地供应商', '本地供应商', '本地优先', '当地优先', '区域限制', '地域限制', '外地限制', '非本地'],
        articles: ['第15条', '第16条', '第17条', '第18条', '第19条', '第20条'],
        severity: 'high',
        category: '商品和要素流动障碍'
    },
    
    // 影响生产经营成本 (第21-25条)
    cost_impact: {
        keywords: ['财政奖励', '财政补贴', '免除社会保险费', '减免税收', '免除收费', '免除政府性基金', '贷款贴息', '税收优惠', '专项资金', '产业引导基金', '资金扶持', '政策扶持', '优惠政策', '奖励政策', '补助政策', '减免政策'],
        articles: ['第21条', '第22条', '第23条', '第24条', '第25条'],
        severity: 'medium',
        category: '影响生产经营成本的不当措施'
    },
    
    // 影响生产经营行为 (第26-29条)
    behavior_impact: {
        keywords: ['不合理准入条件', '歧视性准入条件', '资质资格要求', '能力要求不适应', '业务能力无关', '强制垄断行为', '指定供应商', '排除竞争'],
        articles: ['第26条', '第27条', '第28条', '第29条'],
        severity: 'high',
        category: '影响生产经营行为的不当干预'
    },
    
    // 其他违法行为
    other_violations: {
        keywords: ['经济贡献', '纳税额', '产值', '营收', '税收贡献', '贡献度', '经济效益', '社会贡献'],
        articles: ['实施办法相关条款'],
        severity: 'high',
        category: '以经济贡献为依据的不当措施'
    }
};

/**
 * 精准预判断
 */
async function performPrecisePreCheck(text) {
    console.log('🔍 开始基于经济影响的预判断分析...');
    
    // 简单的内容长度检查
    if (text.length < 50) {
        return {
            needsReview: false,
            confidence: 0.9,
            reason: '文档内容过少，无法构成政策措施',
            documentType: '无效文档',
            processingMethod: 'length_filter',
            apiCalled: false
        };
    }
    
    // 直接使用AI分析经济影响
    try {
        console.log('🤖 调用AI分析政策经济影响...');
        const aiResult = await callEconomicImpactAnalysis(text);
        
        return {
            needsReview: aiResult.needsReview,
            confidence: aiResult.confidence,
            reason: aiResult.reason,
            economicImpact: aiResult.economicImpact,
            affectedParties: aiResult.affectedParties,
            documentType: aiResult.needsReview ? '涉及经营者经济活动的政策' : '不涉及经营者经济活动',
            processingMethod: 'economic_impact_analysis',
            apiCalled: true,
            analysis: aiResult.analysis
        };
    } catch (error) {
        console.error('❌ AI经济影响分析失败:', error.message);
        
        // fallback：涉及金钱、经营、补贴等经济相关词汇时，保守地选择审查
        const economicKeywords = ['补贴', '奖励', '扶持', '优惠', '费用', '收费', '税收', '资金', '经营', '企业', '公司', '市场', '竞争', '招标', '采购'];
        const hasEconomicTerms = economicKeywords.some(keyword => text.includes(keyword));
        
        return {
            needsReview: hasEconomicTerms,
            confidence: 0.6,
            reason: hasEconomicTerms 
                ? 'AI分析失败，但文档包含经济相关内容，建议审查'
                : 'AI分析失败，且文档无明显经济相关内容',
            documentType: '待确认文档',
            processingMethod: 'fallback_economic_keywords',
            apiCalled: false,
            errorReason: error.message
        };
    }
}

/**
 * 基于经济影响的AI分析
 */
async function callEconomicImpactAnalysis(text) {
    const prompt = `你是公平竞争审查专家。根据《公平竞争审查条例》，判断标准是：政策是否涉及经营者经济活动。

【核心判断标准】
政策实施后，是否会影响经营者赚钱？包括：
- 让某些经营者多赚钱（获得额外收益）
- 让某些经营者少赚钱（增加成本或减少机会）  
- 改变市场竞争格局（影响竞争公平性）
- 影响经营成本或收益结构

【具体分析维度】
1. 资金影响：补贴、奖励、收费、税收等
2. 市场机会：准入、参与资格、优先权等
3. 经营成本：合规要求、设备、人员等
4. 竞争环境：市场结构、参与者、规则等

【待分析政策内容】
${text.substring(0, 2000)}

【分析要求】
1. 重点分析：这个政策会让谁多赚钱？会让谁少赚钱？
2. 识别受影响的经营者群体
3. 评估对市场竞争的影响程度
4. 区分政策目标和具体措施

【判断原则】
- 只要涉及经营者的经济利益，就需要审查
- 宁可过度审查，不可遗漏
- 关注实质影响，不拘泥于条款用词

请以JSON格式回复：
{
  "needsReview": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由，说明是否影响经营者赚钱",
  "economicImpact": "具体的经济影响描述",
  "affectedParties": "受影响的经营者群体",
  "analysis": "详细分析过程"
}`;

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
        throw new Error('未配置API密钥');
    }

    console.log('📡 调用AI经济影响分析API...');
    
    const response = await axios.post(process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/chat/completions' : 'https://api.siliconflow.cn/v1/chat/completions', {
        model: process.env.DEEPSEEK_API_KEY ? 'deepseek-reasoner' : 'deepseek-ai/DeepSeek-R1',
        messages: [{
            role: 'user',
            content: prompt
        }],
        max_tokens: 600,
        temperature: 0.1,
        seed: 42
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 75000, // 75秒超时，适应代理延迟
        proxy: false // 禁用代理，直连API
    });

    const content = response.data.choices[0].message.content;
    console.log('🔍 AI经济影响分析响应:', content.substring(0, 200) + '...');
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const result = JSON.parse(jsonMatch[0]);
            return {
                needsReview: result.needsReview !== undefined ? result.needsReview : true,
                confidence: result.confidence || 0.8,
                reason: result.reason || '基于经济影响分析的判断',
                economicImpact: result.economicImpact || '经济影响待确认',
                affectedParties: result.affectedParties || '受影响方待确认',
                analysis: result.analysis || '分析过程待补充'
            };
        } catch (parseError) {
            throw new Error('AI响应JSON格式错误');
        }
    }
    
    throw new Error('AI响应格式异常');
}

/**
 * 精准详细审查
 */
async function performPreciseDetailedReview(text) {
    const prompt = `你是资深公平竞争审查专家。请严格按照原文内容进行审查，绝对不得编造、推测或添加原文中不存在的内容。

【核心原则：严格基于原文】
- 只能审查原文中实际存在的具体内容
- 所有引用必须是原文的准确摘录，不得有任何改动
- 如果原文中没有违规内容，必须明确说明"未发现问题"
- 绝对禁止编造、推测或基于"可能"的理解添加问题

【法规依据】
《公平竞争审查条例实施办法》第9-25条禁止性规定：
第8条：不得限定经营、购买、使用特定经营者提供的商品和服务
第9条：不得限定经营者应当在特定区域注册登记
第13条：不得对外地经营者设定歧视性标准、实行歧视性政策
第16条：不得限制外地商品、服务进入本地市场
第19条：不得限制经营者参与本地招标投标活动
第21条：不得违法给予特定经营者财政奖励和补贴
第26条：不得设置不合理或者歧视性的准入条件
（完整条款见实施办法第二章）

【🚨 绝对强制法律依据要求 - 必须严格遵守！】
🚫 绝对禁止引用以下法规：
   - 《中华人民共和国反垄断法》任何条款
   - 《反垄断法》任何条款
   - 《公平竞争审查制度实施细则》任何条款
   - 任何其他法规除《公平竞争审查条例实施办法》外

✅ 唯一允许引用：《公平竞争审查条例实施办法》

【⚠️ 错误示例 - 绝对禁止】
❌ "违反《反垄断法》第三十七条"
❌ "违反《中华人民共和国反垄断法》第三十七条"  
❌ "根据《反垄断法》相关规定"
❌ "违反相关规定"
❌ "违反条款"

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

🚨 最终检查要求：
在输出前，必须检查每个violation字段：
1. 是否包含"《公平竞争审查条例实施办法》"？如果没有，立即修正！
2. 是否包含"反垄断法"或"制度实施细则"？如果包含，立即删除并替换！
3. 是否使用了通用的"违反条款"表述？如果有，立即替换为具体的实施办法条款！

⚠️ 如果你在回答中使用了任何非《公平竞争审查条例实施办法》的法规引用，这将被视为严重错误！

【严格审查步骤】
1. 逐句阅读原文，寻找具体的政策措施
2. 对每个具体措施，判断是否违反《公平竞争审查条例实施办法》禁止性规定
3. 只有在原文中明确存在违规表述时，才列为问题
4. 引用时必须是原文的准确摘录，逐字核对

【待审查原文】
${text.substring(0, 4000)}

【审查输出要求】
如果原文中存在违规内容，按以下JSON格式返回：
{
  "totalIssues": 实际发现的问题数量,
  "issues": [
    {
      "id": 1,
      "title": "基于原文的问题标题",
      "description": "基于原文内容的问题描述",
      "quote": "原文的准确摘录（必须逐字相符，不得有任何改动）",
      "violation": "违反《公平竞争审查条例实施办法》的具体条款（如违反《公平竞争审查条例实施办法》第八条）",
      "violationContent": "该条款的禁止性规定内容",
      "suggestion": "具体修改建议"
    }
  ],
  "summary": "基于实际发现问题的总结"
}

如果原文中没有发现违规内容，返回：
{
  "totalIssues": 0,
  "issues": [],
  "summary": "经审查，该政策文件未发现违反公平竞争审查条例实施办法的问题"
}

【严格要求】
1. quote字段必须是原文的精确摘录，一个字都不能改
2. 不得基于推测、理解或"可能"添加任何问题
3. 只有在原文明确存在违规表述时才列为问题
4. 如果没有问题就诚实地说没有问题
5. 绝对禁止编造原文中不存在的内容`;

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
    
    const response = await axios.post(process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/chat/completions' : 'https://api.siliconflow.cn/v1/chat/completions', {
        model: process.env.DEEPSEEK_API_KEY ? 'deepseek-reasoner' : 'deepseek-ai/DeepSeek-R1', 
        messages: [{
            role: 'user',
            content: prompt
        }],
        max_tokens: 3000,
        temperature: 0.1,
        seed: 42
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 90000, // 90秒超时，适应代理延迟
        proxy: false // 禁用代理，直连API
    });

    const content = response.data.choices[0].message.content;
    return parsePreciseAIResponse(content, text);
}

/**
 * 解析精准AI响应
 */
function parsePreciseAIResponse(content, originalText) {
    console.log('🔍 解析精准AI审查响应并验证原文引用...');
    
    const cleanContent = content.trim();
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        try {
            const result = JSON.parse(jsonMatch[0]);
            
            // 验证数据结构
            if (result.totalIssues !== undefined && Array.isArray(result.issues)) {
                // 验证引用内容是否在原文中存在
                const validatedIssues = result.issues.filter((issue, index) => {
                    if (!issue.quote || issue.quote.trim() === '') {
                        console.warn(`⚠️ 问题${index + 1}没有引用原文，已过滤`);
                        return false;
                    }
                    
                    // 检查引用是否在原文中存在
                    if (!originalText.includes(issue.quote.trim())) {
                        console.warn(`⚠️ 问题${index + 1}的引用"${issue.quote}"在原文中不存在，已过滤`);
                        return false;
                    }
                    
                    return true;
                });
                
                // 重新计算问题数量
                const actualIssuesCount = validatedIssues.length;
                
                if (actualIssuesCount === 0) {
                    console.log('✅ 验证后未发现有效问题');
                    return {
                        totalIssues: 0,
                        issues: [],
                        rawResponse: '经严格审查和验证，该政策文件未发现违反公平竞争审查条例实施办法的问题',
                        processingMethod: 'precise_ai_review_validated'
                    };
                }
                
                // 增强验证通过的问题数据
                const enhancedIssues = validatedIssues.map((issue, index) => ({
                    id: issue.id || index + 1,
                    title: issue.title || '公平竞争问题',
                    description: issue.description || '',
                    quote: issue.quote || '',
                    violation: issue.violation || '',
                    violationContent: issue.violationContent || '',
                    suggestion: issue.suggestion || '',
                    category: categorizeIssue(issue.violation),
                    verified: true // 标记为已验证
                }));
                
                console.log(`✅ 验证通过的问题数量: ${actualIssuesCount}`);
                
                return {
                    totalIssues: actualIssuesCount,
                    issues: enhancedIssues,
                    rawResponse: result.summary || content,
                    processingMethod: 'precise_ai_review_validated'
                };
            }
        } catch (parseError) {
            console.error('❌ 精准JSON解析失败:', parseError.message);
        }
    }
    
    // 检查无问题关键词
    const noIssueKeywords = ['未发现违反', '符合', '无问题', '合规', 'totalIssues": 0', '"totalIssues":0'];
    const hasNoIssue = noIssueKeywords.some(keyword => cleanContent.includes(keyword));
    
    if (hasNoIssue) {
        return {
            totalIssues: 0,
            issues: [],
            rawResponse: '经精准审查，文档符合《公平竞争审查条例实施办法》要求，未发现违反公平竞争的问题。',
            compliance: '文档合规',
            processingMethod: 'precise_ai_review'
        };
    }
    
    // Fallback处理
    return {
        totalIssues: 1,
        issues: [{
            id: 1,
            title: '需要人工复核',
            description: '系统识别出潜在的公平竞争问题，建议专业人员进行详细审查',
            quote: '请参考完整AI分析',
            violation: '待确认',
            legalBasis: '《公平竞争审查条例实施办法》相关条款',
            riskLevel: 'medium',
            suggestion: '建议专业人员根据具体情况进行详细分析',
            category: '其他'
        }],
        rawResponse: cleanContent.length > 1000 ? cleanContent.substring(0, 1000) + '...' : cleanContent,
        compliance: '需要进一步审查',
        processingMethod: 'precise_ai_review'
    };
}

/**
 * 问题分类
 */
function categorizeIssue(violation) {
    if (!violation) return '其他';
    
    const categoryMap = {
        '第8条|第9条|第10条|第11条|第12条|第13条|第14条': '市场准入和退出限制',
        '第15条|第16条|第17条|第18条|第19条|第20条': '商品和要素流动障碍',
        '第21条|第22条|第23条|第24条|第25条': '影响生产经营成本',
        '第26条|第27条|第28条|第29条': '影响生产经营行为'
    };
    
    for (const [pattern, category] of Object.entries(categoryMap)) {
        if (new RegExp(pattern).test(violation)) {
            return category;
        }
    }
    
    return '其他';
}

module.exports = {
    performPrecisePreCheck,
    performPreciseDetailedReview,
    REGULATION_ARTICLES,
    PRECISE_KEYWORDS,
    parsePreciseAIResponse,
    categorizeIssue
};