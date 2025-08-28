const axios = require('axios');
const { APP_CONFIG, ERROR_MESSAGES } = require('../config/constants');
const { AIServiceFactory } = require('./aiServiceFactory');
const { generateDetailedReviewPrompt, generateStreamReviewPrompt } = require('../config/enhancedPromptTemplate');
const { deduplicateIssues } = require('../utils/issueDedupe');

/**
 * 多AI服务商支持的审查API服务
 * 重构自 DeepSeekService 以支持公平竞争要求
 */
class DeepSeekService {
    constructor(providerName = null) {
        // 使用统一的AI服务工厂
        const actualProvider = providerName || APP_CONFIG.DEFAULT_PROVIDER;
        this.aiService = AIServiceFactory.create(actualProvider);
        this.providerName = actualProvider;
    }

    /**
     * 获取当前使用的AI服务商信息
     */
    getProviderInfo() {
        return {
            name: this.providerName,
            service: this.aiService.providerName
        };
    }

    /**
     * 调用预判断API (使用 deepseek-chat 模型，速度更快)
     */
    async callPreCheckAPI(text) {
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
            console.log(`📡 正在调用 AI服务 预判断API...`);
            
            const response = await this.aiService.chat([{
                role: 'user',
                content: prompt
            }], {
                maxTokens: 500,
                temperature: 0.05,
                top_p: 0.85,
                seed: 42,
                timeout: APP_CONFIG.PRECHECK_TIMEOUT,
                useReasoner: false // 预判断使用快速模型
            });

            console.log(`✅ AI服务 预判断API响应成功`);
            
            const content = response.content;
            console.log('AI响应内容长度:', content.length);
            
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                try {
                    const result = JSON.parse(jsonMatch[0]);
                    console.log('✅ JSON解析成功:', result);
                    return {
                        needsReview: result.needsReview !== undefined ? result.needsReview : true,
                        confidence: result.confidence || 0.8,
                        reason: result.reason || `基于AI服务分析的判断`
                    };
                } catch (parseError) {
                    console.error('❌ JSON解析失败:', parseError.message);
                    throw new Error('AI响应JSON格式错误');
                }
            }

            console.warn('⚠️ AI响应未包含有效JSON格式');
            return {
                needsReview: true,
                confidence: 0.6,
                reason: `AI服务分析结果格式异常，建议人工审查`
            };

        } catch (error) {
            console.error('❌ 预判断API调用失败:', error.message);
            throw error; // 直接抛出错误，因为aiService已经处理了错误格式化
        }
    }

    /**
     * 调用详细审查API (智能回退：优先使用 reasoner，超时后使用 chat)
     */
    async callDetailedReviewAPI(text) {
        const prompt = generateDetailedReviewPrompt(text.substring(0, APP_CONFIG.DETAILED_REVIEW_TEXT_LENGTH));

        // 方案1：优先尝试 reasoner 模型（高质量）
        try {
            console.log(`📡 正在调用 AI服务 详细审查API (Reasoner模型)...`);
            
            const response = await Promise.race([
                this.aiService.chat([{
                    role: 'user',
                    content: prompt
                }], {
                    maxTokens: 6000,
                    temperature: 0.05,
                    top_p: 0.85,
                    seed: 42,
                    useReasoner: true, // 首选推理模型
                    reasoning_effort: 'maximum' // 启用最大推理努力
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Reasoner模型超时')), 60000) // 延长到60秒适应深度推理
                )
            ]);

            console.log(`✅ AI服务 详细审查API (Reasoner模型) 响应成功`);
            
            const content = response.content;
            const result = this.parseAIResponse(content);
            result.modelUsed = 'deepseek-reasoner';
            result.analysisQuality = 'high';
            return result;

        } catch (reasonerError) {
            console.warn(`⚠️ Reasoner模型调用失败: ${reasonerError.message}, 回退到Chat模型...`);
            
            // 方案2：回退到 chat 模型（快速但质量稍低）
            try {
                console.log(`📡 正在调用 AI服务 详细审查API (Chat模型-回退)...`);
                
                const response = await this.aiService.chat([{
                    role: 'user',
                    content: prompt + '\n\n注意：请进行深度分析，确保审查结果的专业性和准确性。'
                }], {
                    maxTokens: 6000,
                    temperature: 0.05,
                    top_p: 0.85,
                    seed: 42,
                    useReasoner: false, // 回退模型
                    reasoning_effort: 'high' // 回退模型也启用高推理努力
                });

                console.log(`✅ AI服务 详细审查API (Chat模型) 响应成功`);
                
                const content = response.content;
                const result = this.parseAIResponse(content);
                result.modelUsed = 'deepseek-chat';
                result.analysisQuality = 'standard';
                result.fallbackUsed = true;
                return result;

            } catch (chatError) {
                console.error(`❌ 所有AI模型调用失败:`, chatError.message);
                throw chatError;
            }
        }
    }

    /**
     * 调用流式详细审查API
     */
    async callDetailedReviewAPIStream(text, res) {
        const prompt = generateStreamReviewPrompt(text.substring(0, APP_CONFIG.DETAILED_REVIEW_TEXT_LENGTH));

        try {
            console.log(`📡 正在调用 AI服务 流式详细审查API...`);
            
            const response = await this.aiService.streamChat([{
                role: 'user',
                content: prompt
            }], {
                maxTokens: 6000,
                temperature: 0.05,
                top_p: 0.85,
                seed: 42,
                useReasoner: true, // 恢复使用推理模型，已优化参数
                reasoning_effort: 'maximum' // 流式也启用最大推理努力
            }, res);

            // 解析流式响应结果
            const result = this.parseAIResponse(response.content);
            return result;
            
        } catch (error) {
            console.error(`❌ AI服务 流式API调用失败:`, error.message);
            throw error; // aiService已经处理了错误格式化
        }
    }

    /**
     * 解析AI响应
     */
    parseAIResponse(content) {
        console.log(`=== AI服务 响应解析开始 ===`);
        console.log('原始响应长度:', content.length);
        console.log('原始响应内容（前500字符）:', content.substring(0, 500));
        
        // 清理内容
        const cleanContent = content.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 首先尝试解析标准JSON格式
        let jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            console.log('找到JSON格式，开始解析...');
            
            // 尝试修复可能被截断的JSON
            let jsonStr = jsonMatch[0];
            
            // 如果JSON看起来被截断了，尝试修复
            if (!jsonStr.endsWith('}') && !jsonStr.endsWith(']}')) {
                console.log('检测到JSON可能被截断，尝试修复...');
                
                // 寻找最后一个完整的对象
                let braceCount = 0;
                let lastValidEnd = -1;
                
                for (let i = 0; i < jsonStr.length; i++) {
                    if (jsonStr[i] === '{') braceCount++;
                    else if (jsonStr[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            lastValidEnd = i;
                        }
                    }
                }
                
                if (lastValidEnd > 0) {
                    jsonStr = jsonStr.substring(0, lastValidEnd + 1);
                    console.log('JSON修复完成，新长度:', jsonStr.length);
                }
            }
            
            try {
                const result = JSON.parse(jsonStr);
                console.log('JSON解析成功！');
                console.log('totalIssues:', result.totalIssues);
                console.log('issues数量:', result.issues ? result.issues.length : 0);
                
                if (result.totalIssues !== undefined || result.issues) {
                    const parsedResult = {
                        totalIssues: result.totalIssues || 0,
                        issues: result.issues || [],
                        rawResponse: result.rawResponse || content
                    };
                    
                    // 去除重复问题
                    if (parsedResult.issues && parsedResult.issues.length > 1) {
                        parsedResult.issues = deduplicateIssues(parsedResult.issues);
                        parsedResult.totalIssues = parsedResult.issues.length;
                        console.log(`📊 问题去重完成: 最终输出 ${parsedResult.totalIssues} 个问题`);
                    }
                    
                    console.log('=== AI服务 响应解析结束 (成功) ===');
                    return parsedResult;
                }
            } catch (parseError) {
                console.error('JSON解析失败:', parseError.message);
                console.log('尝试进一步修复JSON...');
                
                // 更强大的JSON修复逻辑
                console.log('尝试使用改进的解析策略...');
                
                // 1. 尝试提取完整的issues数组
                let issuesArray = [];
                const issuesMatch = content.match(/"issues":\s*\[([\s\S]*?)(?:\]|$)/);
                
                if (issuesMatch) {
                    console.log('找到issues数组部分...');
                    let issuesContent = issuesMatch[1];
                    
                    // 2. 按照对象分割，处理每个问题
                    let currentIssue = '';
                    let braceLevel = 0;
                    let inString = false;
                    let escapeNext = false;
                    
                    for (let i = 0; i < issuesContent.length; i++) {
                        const char = issuesContent[i];
                        
                        if (escapeNext) {
                            escapeNext = false;
                            currentIssue += char;
                            continue;
                        }
                        
                        if (char === '\\') {
                            escapeNext = true;
                            currentIssue += char;
                            continue;
                        }
                        
                        if (char === '"' && !escapeNext) {
                            inString = !inString;
                        }
                        
                        if (!inString) {
                            if (char === '{') {
                                braceLevel++;
                            } else if (char === '}') {
                                braceLevel--;
                            }
                        }
                        
                        currentIssue += char;
                        
                        // 当找到完整的对象时
                        if (braceLevel === 0 && currentIssue.trim().startsWith('{') && currentIssue.trim().endsWith('}')) {
                            try {
                                const issue = JSON.parse(currentIssue.trim());
                                issuesArray.push(issue);
                                console.log(`成功解析问题 ${issuesArray.length}: ${issue.title}`);
                                currentIssue = '';
                            } catch (e) {
                                console.log('单个问题解析失败，跳过...');
                                currentIssue = '';
                            }
                        }
                        
                        // 如果遇到逗号且不在字符串中，重置
                        if (char === ',' && !inString && braceLevel === 0) {
                            currentIssue = '';
                        }
                    }
                    
                    if (issuesArray.length > 0) {
                        console.log(`成功解析 ${issuesArray.length} 个问题！`);
                        
                        // 去除重复问题
                        const dedupedIssues = issuesArray.length > 1 ? deduplicateIssues(issuesArray) : issuesArray;
                        
                        return {
                            totalIssues: dedupedIssues.length,
                            issues: dedupedIssues,
                            rawResponse: content
                        };
                    }
                }
                
                // 3. 如果以上都失败，尝试简单的文本分析
                console.log('使用文本分析作为最后手段...');
                const problemSections = content.split(/问题\s*\d+[:：]/);
                if (problemSections.length > 1) {
                    const extractedIssues = [];
                    
                    for (let i = 1; i < problemSections.length; i++) {
                        const section = problemSections[i];
                        
                        // 提取各个字段
                        const titleMatch = section.match(/^([^\n\r]*)/);
                        const descMatch = section.match(/(?:问题描述|描述)[:：]\s*([^\n\r]*)/);
                        const quoteMatch = section.match(/(?:原文引用|引用)[:：]\s*([^\n\r]*)/);
                        const violationMatch = section.match(/(?:违反条款|条款)[:：]\s*([\s\S]*?)(?:建议|修改|$)/);
                        const suggestionMatch = section.match(/(?:修改建议|建议)[:：]\s*([\s\S]*?)(?:问题|$)/);
                        
                        extractedIssues.push({
                            id: i,
                            title: titleMatch ? titleMatch[1].trim() : `问题${i}`,
                            description: descMatch ? descMatch[1].trim() : '检测到潜在的公平竞争问题',
                            quote: quoteMatch ? quoteMatch[1].trim() : '',
                            violation: violationMatch ? violationMatch[1].trim() : '',
                            suggestion: suggestionMatch ? suggestionMatch[1].trim() : ''
                        });
                    }
                    
                    if (extractedIssues.length > 0) {
                        console.log(`通过文本分析提取了 ${extractedIssues.length} 个问题`);
                        
                        // 去除重复问题
                        const dedupedIssues = extractedIssues.length > 1 ? deduplicateIssues(extractedIssues) : extractedIssues;
                        
                        return {
                            totalIssues: dedupedIssues.length,
                            issues: dedupedIssues,
                            rawResponse: content
                        };
                    }
                }
            }
        }
        
        // 检查是否是明确的无问题响应
        const noIssueKeywords = ['未发现', '无问题', '不存在', '符合要求', '没有发现', 'totalIssues": 0'];
        const hasNoIssue = noIssueKeywords.some(keyword => cleanContent.includes(keyword));
        
        if (hasNoIssue) {
            console.log('检测到"无问题"关键词，返回空结果');
            return {
                totalIssues: 0,
                issues: [],
                rawResponse: content
            };
        }
        
        // fallback - 返回人工解读格式
        console.log('使用fallback策略，返回人工解读');
        return {
            totalIssues: 1,
            issues: [{
                id: 1,
                title: `AI服务 审查结果`,
                description: cleanContent.length > 1000 ? cleanContent.substring(0, 1000) + '...' : cleanContent,
                quote: '',
                violation: '',
                suggestion: ''
            }],
            rawResponse: content
        };
    }

    /**
     * 提取有意义的思考片段
     */
    extractThought(text) {
        const cleaned = text.trim().replace(/\\n+/g, ' ').replace(/\\s+/g, ' ');
        
        if (cleaned.length < 10) return null;
        
        const keywords = ['分析', '检查', '发现', '问题', '建议', '审查', '评估', '考虑', '认为', '判断'];
        const hasKeyword = keywords.some(keyword => cleaned.includes(keyword));
        
        if (hasKeyword || cleaned.includes('。')) {
            return cleaned.length > 100 ? cleaned.substring(0, 97) + '...' : cleaned;
        }
        
        return null;
    }

    /**
     * 测试API连接
     */
    async testConnection(testText = "本政策涉及市场准入和税收优惠措施。") {
        try {
            console.log(`🧪 开始测试 AI服务 API连接...`);
            
            const startTime = Date.now();
            const result = await this.callPreCheckAPI(testText);
            const responseTime = Date.now() - startTime;
            
            console.log(`✅ AI服务 API测试成功`);
            
            return {
                success: true,
                message: `AI服务 API连接正常`,
                responseTime: `${responseTime}ms`,
                testResult: result,
                timestamp: new Date().toISOString(),
                provider: this.aiService.providerName
            };
            
        } catch (error) {
            console.error(`❌ AI服务 API测试失败:`, error);
            throw error;
        }
    }
}

module.exports = DeepSeekService;