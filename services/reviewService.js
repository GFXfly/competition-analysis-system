const axios = require('axios');
const { extractTextFromFile } = require('../utils/fileUtils');
const { AIServiceFactory } = require('./aiServiceFactory');
const { APP_CONFIG } = require('../config/constants');

// 竞争关键词配置
const COMPETITION_KEYWORDS = [
    '市场准入', '负面清单', '特许经营', '招标投标', '政府采购',
    '税收优惠', '财政补贴', '专项资金', '产业引导基金',
    '歧视性措施', '区域封锁', '地方保护', '行政垄断',
    '本地企业', '当地供应商', '限定', '指定', '排除'
];

/**
 * API请求缓存
 */
const apiCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟

/**
 * 预判断函数
 */
async function performPreCheck(text) {
    console.log('🔍 开始预判断分析，基于《公平竞争审查条例》第三条审查范围...');
    
    // 第一步：基本内容长度检查
    if (text.length < 100) {
        return {
            needsReview: false,
            confidence: 0.95,
            reason: '文档内容过少，不构成政策措施',
            documentType: '无效文档',
            processingMethod: 'length_filter',
            apiCalled: false
        };
    }
    
    // 第二步：检查是否涉及经营者经济活动
    const economicActivityKeywords = [
        '经营', '企业', '公司', '市场', '竞争', '招标', '采购', 
        '补贴', '奖励', '扶持', '优惠', '减免', '收费', '费用',
        '资质', '许可', '审批', '备案', '准入', '投资'
    ];
    
    const matchedKeywords = economicActivityKeywords.filter(keyword => 
        text.includes(keyword)
    );
    
    // 第三步：政策制定相关检查
    const policyIndicators = ['政策', '措施', '办法', '规定', '通知', '意见', '方案', '实施'];
    const hasPolicyContent = policyIndicators.some(indicator => text.includes(indicator));
    
    if (!hasPolicyContent || matchedKeywords.length === 0) {
        return {
            needsReview: false,
            confidence: 0.8,
            reason: '文档不涉及经营者经济活动的政策措施，不属于公平竞争审查范围',
            matchedKeywords: matchedKeywords,
            documentType: '非政策文档或不涉及经营活动',
            processingMethod: 'smart_filter',
            apiCalled: false
        };
    }
    
    // 第四步：如果包含经济活动相关内容，尝试AI分析，失败时使用增强的本地分析
    try {
        console.log('📡 检测到经营活动相关内容，尝试AI进行精确预判断...');
        const aiResult = await callPreCheckAPI(text);
        
        return {
            needsReview: aiResult.needsReview,
            confidence: aiResult.confidence,
            reason: aiResult.reason,
            matchedKeywords: matchedKeywords,
            documentType: aiResult.needsReview ? '涉及经营者经济活动的政策' : '不涉及经营者经济活动',
            processingMethod: 'ai_precheck',
            apiCalled: true,
            provider: aiResult.provider
        };
    } catch (error) {
        console.warn('⚠️ AI预判断失败，使用增强的本地智能分析:', error.message);
        
        // 增强的本地预判断逻辑
        return performEnhancedLocalPreCheck(text, matchedKeywords, error.message);
    }
}

/**
 * 增强的本地预判断逻辑（当AI不可用时）
 */
function performEnhancedLocalPreCheck(text, matchedKeywords, errorReason) {
    console.log('🧠 执行增强的本地智能分析...');
    
    // 高风险关键词（强烈提示需要审查）
    const highRiskKeywords = [
        '本地企业', '当地企业', '本地供应商', '当地供应商',
        '限定', '指定', '排除', '禁止',
        '仅限', '只能', '必须为',
        '地方保护', '行政垄断', '歧视性',
        '经济贡献', '纳税额', '产值贡献'
    ];
    
    // 审查范围关键词
    const reviewScopeKeywords = {
        marketAccess: ['市场准入', '准入门槛', '资质要求', '许可', '审批', '备案'],
        flowBarriers: ['跨区域', '省际', '地区间', '流动', '运输', '销售限制'],
        costImpact: ['收费', '费用', '价格', '成本', '负担', '减免', '优惠'],
        behaviorImpact: ['投资', '生产', '经营', '销售', '采购', '服务']
    };
    
    // 计算风险评分
    let riskScore = 0;
    let riskReasons = [];
    
    // 高风险关键词匹配
    const highRiskMatches = highRiskKeywords.filter(keyword => text.includes(keyword));
    if (highRiskMatches.length > 0) {
        riskScore += highRiskMatches.length * 20;
        riskReasons.push(`检测到高风险关键词: ${highRiskMatches.slice(0, 3).join('、')}${highRiskMatches.length > 3 ? '等' : ''}`);
    }
    
    // 审查范围匹配
    let scopeMatches = 0;
    Object.entries(reviewScopeKeywords).forEach(([category, keywords]) => {
        const matches = keywords.filter(keyword => text.includes(keyword));
        if (matches.length > 0) {
            scopeMatches++;
            riskScore += matches.length * 10;
        }
    });
    
    if (scopeMatches >= 2) {
        riskReasons.push(`涉及${scopeMatches}个审查范围类别`);
    }
    
    // 基础经济活动关键词数量
    riskScore += matchedKeywords.length * 5;
    
    // 文档类型判断
    const policyTypes = ['政策', '办法', '规定', '通知', '意见', '方案', '实施', '管理'];
    const policyTypeCount = policyTypes.filter(type => text.includes(type)).length;
    if (policyTypeCount >= 2) {
        riskScore += 15;
        riskReasons.push('符合政策文件特征');
    }
    
    // 决策逻辑
    let needsReview = false;
    let confidence = 0;
    let documentType = '';
    
    if (riskScore >= 60) {
        needsReview = true;
        confidence = 0.85;
        documentType = '高风险政策文件';
        riskReasons.unshift('高风险评分，强烈建议审查');
    } else if (riskScore >= 30) {
        needsReview = true;
        confidence = 0.7;
        documentType = '中风险政策文件';
        riskReasons.unshift('中等风险评分，建议审查');
    } else if (matchedKeywords.length >= 3) {
        needsReview = true;
        confidence = 0.6;
        documentType = '潜在风险文件';
        riskReasons.unshift('经济活动关键词较多，谨慎起见建议审查');
    } else {
        needsReview = false;
        confidence = 0.75;
        documentType = '低风险文件';
        riskReasons.push('风险评分较低，可能不需要审查');
    }
    
    console.log(`📊 本地智能分析结果: 风险评分=${riskScore}, 需要审查=${needsReview}`);
    
    return {
        needsReview: needsReview,
        confidence: confidence,
        reason: riskReasons.join('；'),
        matchedKeywords: matchedKeywords,
        highRiskMatches: highRiskMatches,
        riskScore: riskScore,
        documentType: documentType,
        processingMethod: 'enhanced_local_analysis',
        apiCalled: false,
        errorReason: errorReason
    };
}

/**
 * 调用API进行预判断（带缓存）
 */
async function callPreCheckAPI(text) {
    // 生成缓存键
    const cacheKey = `precheck_${Buffer.from(text.substring(0, 500)).toString('base64')}`;
    
    // 检查缓存
    if (apiCache.has(cacheKey)) {
        const cached = apiCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('✅ 使用缓存的预判断结果');
            return cached.data;
        } else {
            apiCache.delete(cacheKey);
        }
    }

    const prompt = `请判断以下文档是否需要进行公平竞争审查。

公平竞争审查的范围包括：
1. 市场准入和退出
2. 商品和要素自由流动
3. 影响生产经营成本
4. 影响生产经营行为

请分析文档内容，判断是否涉及上述范围，并给出判断理由。

文档内容（前2000字符）：
${text.substring(0, APP_CONFIG.PRECHECK_TEXT_LENGTH)}

请以JSON格式回复：
{
  "needsReview": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}`;

    try {
        console.log('📡 正在调用AI预判断API (使用 AIServiceFactory)...');
        
        // 使用统一的AI服务工厂，支持自动回退
        const aiService = await AIServiceFactory.createWithFallback();
        
        const response = await aiService.chat([{
            role: 'user',
            content: prompt
        }], {
            maxTokens: 300,
            temperature: 0.0,
            seed: 42,
            timeout: APP_CONFIG.PRECHECK_TIMEOUT,
            useReasoner: false // 预判断使用快速模型
        });

        console.log('✅ AI预判断API响应成功');
        
        const content = response.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        let result;
        if (jsonMatch) {
            try {
                result = JSON.parse(jsonMatch[0]);
                result = {
                    needsReview: result.needsReview !== undefined ? result.needsReview : true,
                    confidence: result.confidence || 0.8,
                    reason: result.reason || `基于${response.provider}分析的判断`,
                    provider: response.provider
                };
            } catch (parseError) {
                console.error('❌ JSON解析失败:', parseError.message);
                throw new Error('AI响应JSON格式错误');
            }
        } else {
            console.warn('⚠️ AI响应未包含有效JSON格式');
            result = {
                needsReview: true,
                confidence: 0.6,
                reason: `${response.provider}分析结果格式异常，建议人工审查`,
                provider: response.provider
            };
        }

        // 缓存结果
        apiCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;

    } catch (error) {
        console.error('❌ 预判断API调用失败:', error.message);
        throw new Error(`预判断处理失败: ${error.message}`);
    }
}

/**
 * 执行完整审查
 */
async function performReview(req) {
    const text = await extractTextFromFile(req.file);
    
    try {
        console.log('🔧 检查AI服务工厂可用性...');
        
        // 检查文本长度
        let processedText = text;
        if (text.length > APP_CONFIG.MAX_TEXT_LENGTH) {
            console.log(`⚠️ 文档过长(${text.length}字符)，截取前${APP_CONFIG.MAX_TEXT_LENGTH}字符进行审查`);
            processedText = text.substring(0, APP_CONFIG.MAX_TEXT_LENGTH);
        }
        
        // 调用AI进行详细审查
        const aiResult = await callDetailedReviewAPI(processedText);
        
        return {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            totalIssues: aiResult.totalIssues,
            issues: aiResult.issues,
            rawResponse: aiResult.rawResponse,
            processingMethod: 'ai_detailed_review',
            apiCalled: true,
            provider: aiResult.provider
        };
        
    } catch (error) {
        console.error('❌ AI审查失败，使用模拟审查:', error.message);
        const mockResult = performMockReview(req, text);
        mockResult.processingMethod = 'mock_fallback';
        mockResult.apiCalled = false;
        mockResult.errorReason = error.message;
        return mockResult;
    }
}

/**
 * 调用详细审查API
 */
async function callDetailedReviewAPI(text) {
    const prompt = `你是一位公平竞争审查专家。请对以下政策文件进行详细的公平竞争审查，重点关注是否存在排除、限制竞争的内容。

审查范围包括：
1. 市场准入和退出限制
2. 商品和要素流动障碍  
3. 影响生产经营成本的不当措施
4. 影响生产经营行为的不当干预
5. 以经济贡献度作为奖励依据的不当措施

请按以下JSON格式返回审查结果：
{
  "totalIssues": 问题总数(数字),
  "issues": [
    {
      "id": 问题编号,
      "title": "问题标题",
      "description": "问题描述",
      "quote": "原文引用",
      "violation": "违反的具体条款",
      "suggestion": "修改建议（如有多条建议，请用1. 2. 3.格式分条列出）"
    }
  ],
  "rawResponse": "整体评价和建议"
}

文档内容：
${text.substring(0, APP_CONFIG.DETAILED_REVIEW_TEXT_LENGTH)}`;

    try {
        console.log('📡 正在调用详细审查API (使用 AIServiceFactory)...');
        
        // 使用统一的AI服务工厂，支持自动回退
        const aiService = await AIServiceFactory.createWithFallback();
        
        // 优先使用reasoner模型进行详细分析
        const response = await aiService.chat([{
            role: 'user',
            content: prompt
        }], {
            maxTokens: 4000,
            temperature: 0.0,
            seed: 42,
            timeout: APP_CONFIG.AI_TIMEOUT,
            useReasoner: true // 详细审查使用推理模型
        });

        console.log('✅ 详细审查API响应成功');
        
        const result = parseAIResponse(response.content);
        result.provider = response.provider;
        result.model = response.model;
        
        return result;
        
    } catch (error) {
        console.error('❌ 详细审查API调用失败:', error.message);
        throw error;
    }
}

/**
 * 解析AI响应
 */
function parseAIResponse(content) {
    console.log('=== AI响应解析开始 ===');
    const cleanContent = content.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 尝试解析JSON格式
    let jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const result = JSON.parse(jsonMatch[0]);
            if (result.totalIssues !== undefined || result.issues) {
                return {
                    totalIssues: result.totalIssues || 0,
                    issues: result.issues || [],
                    rawResponse: result.rawResponse || content
                };
            }
        } catch (parseError) {
            console.error('JSON解析失败:', parseError.message);
        }
    }
    
    // 检查无问题响应
    const noIssueKeywords = ['未发现', '无问题', '不存在', '符合要求', '没有发现', 'totalIssues": 0'];
    const hasNoIssue = noIssueKeywords.some(keyword => cleanContent.includes(keyword));
    
    if (hasNoIssue) {
        return {
            totalIssues: 0,
            issues: [],
            rawResponse: content
        };
    }
    
    // fallback处理
    return {
        totalIssues: 1,
        issues: [{
            id: 1,
            title: 'AI审查结果',
            description: cleanContent.length > 1000 ? cleanContent.substring(0, 1000) + '...' : cleanContent,
            quote: '',
            violation: '',
            suggestion: ''
        }],
        rawResponse: content
    };
}

/**
 * 增强的模拟审查（当AI不可用时使用）
 */
function performMockReview(req, text) {
    console.log('🧠 执行增强的本地智能审查...');
    
    const issues = [];
    let totalIssues = 0;

    const enhancedChecks = [
        {
            keywords: ['本地企业', '当地企业', '本地供应商', '当地供应商', '本区域', '本市', '本省'],
            title: '检测到地方保护主义风险',
            description: '文档中包含可能构成地方保护的表述，可能限制外地企业公平参与',
            violation: '《公平竞争审查实施细则》第11条 - 不得限定经营、购买、使用特定经营者提供的商品和服务',
            suggestion: '1. 删除地域限制性表述\n2. 改为"符合条件的经营者"等中性表达\n3. 确保各地区企业享有同等参与机会',
            severity: 'high',
            category: 'local_protection'
        },
        {
            keywords: ['限定', '指定', '排除', '仅限', '只能', '必须为', '禁止'],
            title: '发现市场准入限制性条款',
            description: '检测到可能限制市场准入或设置不合理门槛的条款',
            violation: '《公平竞争审查实施细则》第9条 - 市场准入和退出',
            suggestion: '1. 审查准入条件的合理性和必要性\n2. 确保准入标准公开透明\n3. 避免设置歧视性或过高门槛',
            severity: 'high',
            category: 'market_access'
        },
        {
            keywords: ['经济贡献', '纳税额', '产值', '营收', '税收贡献', '贡献度', '经济规模'],
            title: '疑似以经济贡献为奖励依据',
            description: '检测到可能以企业经济贡献度作为政策优惠依据的表述',
            violation: '公平竞争审查制度 - 不得以区域内经济贡献度作为奖励依据',
            suggestion: '1. 删除以经济贡献为标准的奖励条款\n2. 改为基于企业合规经营、创新能力、社会责任等公平标准\n3. 确保政策普惠性，避免"垒大户"现象',
            severity: 'high',
            category: 'economic_contribution'
        },
        {
            keywords: ['收费', '费用标准', '价格', '定价', '减免', '优惠价格'],
            title: '涉及生产经营成本影响',
            description: '文档涉及可能影响企业生产经营成本的收费或价格措施',
            violation: '《公平竞争审查实施细则》第12条 - 影响生产经营成本',
            suggestion: '1. 确保收费标准公平合理\n2. 避免对不同企业实施差别化收费\n3. 提高收费依据和标准的透明度',
            severity: 'medium',
            category: 'cost_impact'
        },
        {
            keywords: ['招标', '采购', '政府采购', '公开招标', '邀请招标'],
            title: '政府采购相关条款',
            description: '涉及政府采购活动，需要确保公平竞争',
            violation: '《政府采购法》及公平竞争审查相关规定',
            suggestion: '1. 确保采购程序公开透明\n2. 避免设置歧视性资格条件\n3. 保障各类企业平等参与机会',
            severity: 'medium',
            category: 'procurement'
        }
    ];

    // 执行检查
    enhancedChecks.forEach((check) => {
        const foundKeywords = check.keywords.filter(keyword => text.includes(keyword));
        if (foundKeywords.length > 0) {
            // 尝试找到具体的文本引用
            let quote = '';
            for (const keyword of foundKeywords) {
                const regex = new RegExp(`.{0,30}${keyword}.{0,30}`, 'g');
                const match = text.match(regex);
                if (match && match[0]) {
                    quote = match[0].trim();
                    break;
                }
            }
            
            if (!quote) {
                quote = `包含关键词: ${foundKeywords.slice(0, 3).join('、')}`;
            }
            
            issues.push({
                id: totalIssues + 1,
                title: check.title,
                description: check.description,
                quote: quote,
                violation: check.violation,
                suggestion: check.suggestion,
                severity: check.severity,
                category: check.category,
                detectedKeywords: foundKeywords
            });
            totalIssues++;
        }
    });

    // 生成详细的分析报告
    const highRiskIssues = issues.filter(issue => issue.severity === 'high').length;
    const mediumRiskIssues = issues.filter(issue => issue.severity === 'medium').length;
    
    let analysisQuality = '本地智能分析';
    let rawResponse = '';
    
    if (totalIssues === 0) {
        rawResponse = `经过本地智能分析，未发现明显的公平竞争问题。
        
分析范围包括：
- 地方保护主义风险检测
- 市场准入限制性条款
- 经济贡献导向政策
- 生产经营成本影响
- 政府采购公平性

建议：虽然未发现明显问题，但仍建议结合具体实施情况进行人工复核。`;
    } else {
        rawResponse = `本地智能分析发现 ${totalIssues} 个潜在的公平竞争问题：
        
风险等级分布：
- 高风险问题：${highRiskIssues} 个
- 中等风险问题：${mediumRiskIssues} 个

主要问题类型：${Array.from(new Set(issues.map(issue => issue.category))).join('、')}

建议：
1. 优先处理高风险问题
2. 结合政策实施背景进行综合判断
3. 必要时咨询公平竞争审查专家意见

注意：此为本地智能分析结果，准确性可能不及AI深度分析，建议条件允许时使用AI审查功能。`;
    }

    return {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        totalIssues,
        issues,
        rawResponse,
        analysisQuality,
        processingMethod: 'enhanced_local_review',
        riskDistribution: {
            high: highRiskIssues,
            medium: mediumRiskIssues,
            low: 0
        }
    };
}

/**
 * 清理缓存
 */
function clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of apiCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            apiCache.delete(key);
        }
    }
}

// 定期清理缓存
setInterval(clearExpiredCache, 10 * 60 * 1000); // 每10分钟清理一次

module.exports = {
    performPreCheck,
    performReview,
    callPreCheckAPI,
    callDetailedReviewAPI,
    parseAIResponse,
    performMockReview,
    COMPETITION_KEYWORDS
};