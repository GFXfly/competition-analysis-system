const axios = require('axios');
const { extractTextFromFile } = require('../utils/fileUtils');

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
    
    // 第四步：如果包含经济活动相关内容，调用AI进行进一步判断
    try {
        console.log('📡 检测到经营活动相关内容，调用AI进行精确预判断...');
        const aiResult = await callPreCheckAPI(text);
        
        return {
            needsReview: aiResult.needsReview,
            confidence: aiResult.confidence,
            reason: aiResult.reason,
            matchedKeywords: matchedKeywords,
            documentType: aiResult.needsReview ? '涉及经营者经济活动的政策' : '不涉及经营者经济活动',
            processingMethod: 'ai_precheck',
            apiCalled: true
        };
    } catch (error) {
        console.error('❌ AI预判断失败，使用保守策略:', error.message);
        
        // AI失败时的保守策略：如果有较多经济活动关键词，则进入审查
        const needsReview = matchedKeywords.length >= 3;
        
        return {
            needsReview: needsReview,
            confidence: 0.6,
            reason: needsReview 
                ? 'AI预判断失败，但检测到较多经济活动关键词，建议进行审查'
                : 'AI预判断失败，经济活动关键词较少，可能不需要审查',
            matchedKeywords: matchedKeywords,
            documentType: '待确认文档',
            processingMethod: 'fallback_keyword_count',
            apiCalled: false,
            errorReason: error.message
        };
    }
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
${text.substring(0, 2000)}

请以JSON格式回复：
{
  "needsReview": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}`;

    try {
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
        if (!apiKey) {
            throw new Error('未配置DeepSeek API密钥');
        }

        console.log('📡 正在调用DeepSeek V3.1 AI预判断API...');
        
        const apiUrl = process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/chat/completions' : 'https://api.siliconflow.cn/v1/chat/completions';
        const model = process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'deepseek-ai/DeepSeek-R1';
        
        const response = await axios.post(apiUrl, {
            model: model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 300,
            temperature: 0.0,
            seed: 42
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000,
            proxy: false, // 禁用代理，直连API
            validateStatus: function (status) {
                return status < 500;
            }
        });

        if (response.status >= 400) {
            throw new Error(`API请求失败: HTTP ${response.status} - ${response.data?.error?.message || response.statusText}`);
        }

        console.log('✅ AI预判断API响应成功');
        
        const content = response.data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        let result;
        if (jsonMatch) {
            try {
                result = JSON.parse(jsonMatch[0]);
                result = {
                    needsReview: result.needsReview !== undefined ? result.needsReview : true,
                    confidence: result.confidence || 0.8,
                    reason: result.reason || '基于AI分析的判断'
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
                reason: 'AI分析结果格式异常，建议人工审查'
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
        
        if (error.code === 'ECONNABORTED') {
            throw new Error('网络连接超时，请检查网络连接');
        } else if (error.response) {
            throw new Error(`API服务错误: ${error.response.status} - ${error.response.data?.error?.message || '未知错误'}`);
        } else if (error.request) {
            throw new Error('无法连接到AI服务，请检查网络连接');
        } else {
            throw new Error(`预判断处理失败: ${error.message}`);
        }
    }
}

/**
 * 执行完整审查
 */
async function performReview(req) {
    const text = await extractTextFromFile(req.file);
    
    try {
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
        if (!apiKey) {
            console.warn('未配置DeepSeek API密钥，使用模拟审查');
            return performMockReview(req, text);
        }

        // 检查文本长度
        let processedText = text;
        if (text.length > 50000) {
            console.log('⚠️ 文档过长，截取前50000字符进行审查');
            processedText = text.substring(0, 50000);
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
            apiCalled: true
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
${text.substring(0, 4000)}`;

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
    
    const apiUrl = process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/chat/completions' : 'https://api.siliconflow.cn/v1/chat/completions';
    const model = process.env.DEEPSEEK_API_KEY ? 'deepseek-reasoner' : 'deepseek-ai/DeepSeek-R1';
    
    const response = await axios.post(apiUrl, {
        model: model,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        max_tokens: 2000,
        temperature: 0.0,
        seed: 42
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 120000,
        proxy: false // 禁用代理，直连API
    });

    const content = response.data.choices[0].message.content;
    return parseAIResponse(content);
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
 * 模拟审查（当API不可用时使用）
 */
function performMockReview(req, text) {
    const issues = [];
    let totalIssues = 0;

    const checks = [
        {
            keywords: ['本地企业', '当地供应商', '本地供应商'],
            title: '可能存在地方保护问题',
            description: '检测到可能限制外地企业参与的表述',
            violation: '第11条 - 限定经营、购买或者使用特定经营者提供的商品',
            suggestion: '建议修改为对所有符合条件的经营者开放，不得限定地域'
        },
        {
            keywords: ['限定', '指定', '排除'],
            title: '可能存在市场准入限制',  
            description: '检测到可能限制市场准入的表述',
            violation: '第9条 - 市场准入和退出',
            suggestion: '建议取消不合理的准入限制，确保公平竞争'
        },
        {
            keywords: ['经济贡献', '纳税额', '产值', '营收', '税收贡献', '贡献度'],
            title: '可能存在以经济贡献为奖励依据的问题',
            description: '检测到可能以经济贡献度作为奖励依据的表述',
            violation: '公平竞争审查制度 - 不得以经济贡献度作为奖励依据',
            suggestion: '1. 建议删除以经济贡献度为依据的奖励条款\n2. 改为基于企业合规性、创新能力等公平标准\n3. 确保所有符合条件的企业享有同等待遇'
        }
    ];

    checks.forEach((check) => {
        const found = check.keywords.some(keyword => text.includes(keyword));
        if (found) {
            const matchedKeyword = check.keywords.find(keyword => text.includes(keyword));
            issues.push({
                id: totalIssues + 1,
                title: check.title,
                description: check.description,
                quote: `包含关键词"${matchedKeyword}"的相关内容...`,
                violation: check.violation,
                suggestion: check.suggestion
            });
            totalIssues++;
        }
    });

    return {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        totalIssues,
        issues,
        rawResponse: `模拟审查完成，共发现${totalIssues}个潜在问题。建议启用AI审查获得更准确的结果。`
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