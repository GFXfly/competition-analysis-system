const axios = require('axios');
const { extractTextFromFile } = require('../utils/fileUtils');
const { 
    performOptimizedSemanticAnalysis,
    performOptimizedDetailedReview,
    performOptimizedCaseComparison
} = require('./optimizedPromptService');

/**
 * 增强的公平竞争审查服务
 * 多层级、高精准度的审查系统
 */

// 精确违规模式库 - 基于实际案例和法条细化
const PRECISE_VIOLATION_PATTERNS = {
    // 第8条：限定经营、购买、使用特定经营者提供的商品和服务
    article_8: {
        patterns: [
            // 直接限定模式
            /限定.*?经营.*?[的地].*?(企业|公司|供应商|服务商)/g,
            /指定.*?(企业|公司|供应商|服务商).*?(提供|经营|销售)/g,
            /必须.*?(从|向|购买|使用).*?(特定|指定|某.*?企业)/g,
            /只能.*?(购买|使用|选择).*?(企业|公司|品牌)/g,
            
            // 变相限定模式
            /推荐.*?(企业|供应商).*?名单/g,
            /优先.*?(选择|采购|使用).*?[本当地].*?(企业|供应商)/g,
            /建议.*?(采购|使用).*?(名单|目录).*?内.*?(企业|产品)/g,
            
            // 排斥性表述
            /不得.*?(选择|采购).*?(名单|目录).*?外.*?(企业|产品)/g,
            /禁止.*?(购买|使用).*?外[地省市县].*?(产品|服务)/g,
        ],
        keywords: ['限定经营', '指定供应商', '特定经营者', '必须购买', '只能选择', '推荐名单'],
        severity: 'high',
        category: '限定特定经营者'
    },

    // 第9-12条：地域限制模式
    geographical_restrictions: {
        patterns: [
            /限定.*?[在于].*?[本当地].*?[市县区].*?(注册|登记|投资|生产|经营)/g,
            /要求.*?[在于].*?(特定|本地|当地).*?(区域|地区).*?(设立|注册)/g,
            /必须.*?[在于].*?[本当地].*?(投资|建厂|设点|办公)/g,
            
            // 隐性地域要求
            /.*?[具有拥].*?[本当地].*?(户籍|住址|营业执照)/g,
            /.*?[本当地].*?(企业|法人).*?方可.*?(参与|申请)/g,
            /优先.*?(支持|扶持).*?[本当地].*?(企业|投资)/g,
        ],
        keywords: ['本地注册', '当地投资', '特定区域', '地域限制', '本地企业优先'],
        severity: 'high',
        category: '地域限制'
    },

    // 第13-14条：歧视性政策
    discriminatory_policies: {
        patterns: [
            /对.*?外[地省市县].*?(企业|经营者).*?(设定|实行).*?(歧视性|不同|更高).*?(标准|政策|要求)/g,
            /外[地省市县].*?(企业|经营者).*?(需要|应当|必须).*?(额外|特殊|更多).*?(条件|材料|程序)/g,
            /[本当地].*?(企业|经营者).*?享受.*?(优惠|减免|便利)/g,
            
            // 行政许可歧视
            /专门.*?针对.*?外[地省市县].*?(企业|经营者).*?(行政许可|备案|审批)/g,
            /外[地省市县].*?(企业|经营者).*?(行政许可|备案).*?(程序|时间|材料).*?(复杂|较长|更多)/g,
        ],
        keywords: ['歧视性标准', '歧视性政策', '外地企业', '额外条件', '专门针对'],
        severity: 'high',
        category: '歧视性政策措施'
    },

    // 第15-17条：商品服务流动限制
    trade_barriers: {
        patterns: [
            /对.*?外[地省市县].*?(商品|服务).*?实行.*?(歧视性|不同|更高).*?(价格|收费)/g,
            /限制.*?外[地省市县].*?(商品|服务).*?(进入|销售|提供)/g,
            /限制.*?[本当地].*?(商品|服务).*?(运出|输出|销售)/g,
            /禁止.*?外[地省市县].*?(商品|产品).*?(进入|销售)/g,
            
            // 变相贸易壁垒
            /外[地省市县].*?(商品|服务).*?(需要|应当|必须).*?(特殊|额外).*?(检验|认证|手续)/g,
            /[本当地].*?(商品|产品).*?实行.*?(保护|优先|扶持).*?政策/g,
        ],
        keywords: ['歧视性价格', '限制进入', '限制运出', '贸易壁垒', '地方保护'],
        severity: 'high',
        category: '商品和服务流动障碍'
    },

    // 第18-20条：要素获取限制
    resource_access_restrictions: {
        patterns: [
            /限制.*?(外[地省市县]|非[本当地]).*?(企业|经营者).*?取得.*?(土地|用地).*?供应/g,
            /限制.*?(外[地省市县]|非[本当地]).*?(企业|经营者).*?参与.*?(招标|投标|采购)/g,
            /限制.*?(外[地省市县]|非[本当地]).*?(企业|经营者).*?获得.*?(政府|财政).*?(资金|支持)/g,
            
            // 隐性限制
            /[本当地].*?(企业|经营者).*?在.*?(土地|招标|资金).*?方面.*?(优先|优惠)/g,
            /要求.*?(本地|当地).*?(合作|参股|控股)/g,
        ],
        keywords: ['限制土地供应', '限制招标参与', '限制资金获得', '本地优先', '要求合作'],
        severity: 'high',
        category: '要素获取限制'
    },

    // 第21-25条：不当财政措施
    improper_fiscal_measures: {
        patterns: [
            /给予.*?(特定|指定|某些).*?(企业|经营者).*?(财政|税收).*?(奖励|补贴|优惠)/g,
            /免除.*?(特定|指定|某些).*?(企业|经营者).*?(社会保险费|税收|收费)/g,
            /减免.*?(特定|指定|某些).*?(企业|经营者).*?(税收|行政事业性收费|政府性基金)/g,
            /给予.*?(特定|指定|某些).*?(企业|经营者).*?贷款贴息/g,
            
            // 以经济贡献为依据的措施
            /根据.*?(纳税额|产值|营收|经济贡献|贡献度).*?(给予|享受|获得).*?(奖励|补贴|优惠)/g,
            /按.*?(经济效益|税收贡献|产值规模).*?给予.*?(政策|资金).*?支持/g,
        ],
        keywords: ['财政奖励', '税收优惠', '免除费用', '贷款贴息', '经济贡献', '纳税额'],
        severity: 'medium',
        category: '不当财政措施'
    },

    // 第26-29条：不合理准入和经营行为干预
    improper_entry_intervention: {
        patterns: [
            /设置.*?(不合理|歧视性).*?(准入|退出).*?条件/g,
            /设定.*?与.*?(企业能力|业务能力).*?不.*?(相适应|相符|匹配).*?(资质|资格).*?要求/g,
            /在.*?(资质|资格|招标|投标).*?方面.*?设置.*?与.*?业务能力.*?无关.*?条件/g,
            /强制.*?(企业|经营者).*?(垄断|限制竞争).*?行为/g,
            
            // 过度监管
            /要求.*?(企业|经营者).*?(必须|应当).*?(使用|采购).*?特定.*?(技术|设备|材料)/g,
            /限制.*?(企业|经营者).*?(自主|独立).*?(经营|定价|采购)/g,
        ],
        keywords: ['不合理准入条件', '歧视性条件', '资质要求过高', '强制垄断', '限制自主经营'],
        severity: 'high',
        category: '不当准入和行为干预'
    }
};

// 敏感词汇权重系统
const KEYWORD_WEIGHTS = {
    // 高权重违规词汇
    high_risk: {
        weight: 3,
        terms: ['限定', '指定', '必须', '只能', '不得', '禁止', '排除', '本地企业', '当地供应商', '特定经营者']
    },
    // 中权重疑似词汇
    medium_risk: {
        weight: 2,
        terms: ['优先', '推荐', '建议', '鼓励', '支持', '扶持', '倾斜', '照顾', '便利']
    },
    // 低权重相关词汇
    low_risk: {
        weight: 1,
        terms: ['企业', '供应商', '经营者', '投资', '采购', '招标', '补贴', '奖励', '优惠']
    }
};

/**
 * 增强的预判断 - 多层级分析
 */
async function performEnhancedPreCheck(text) {
    console.log('🔍 开始增强预判断分析...');
    
    // 第一层：快速过滤
    const quickFilter = performQuickFilter(text);
    if (!quickFilter.needsReview) {
        return quickFilter;
    }
    
    // 第二层：模式匹配分析
    const patternAnalysis = performPatternAnalysis(text);
    
    // 第三层：语义权重分析
    const weightAnalysis = performWeightAnalysis(text);
    
    // 第四层：AI语义理解
    let aiAnalysis = null;
    try {
        aiAnalysis = await performAISemanticAnalysis(text);
    } catch (error) {
        console.error('AI语义分析失败:', error.message);
    }
    
    // 综合评估
    const finalAssessment = calculateFinalScore(patternAnalysis, weightAnalysis, aiAnalysis);
    
    return {
        needsReview: finalAssessment.needsReview,
        confidence: finalAssessment.confidence,
        reason: finalAssessment.reason,
        riskLevel: finalAssessment.riskLevel,
        detectedPatterns: patternAnalysis.detectedPatterns,
        keywordScore: weightAnalysis.totalScore,
        aiInsights: aiAnalysis ? aiAnalysis.insights : '未进行AI分析',
        processingMethod: 'enhanced_multi_layer_analysis',
        apiCalled: !!aiAnalysis,
        analysis: finalAssessment.detailedAnalysis
    };
}

/**
 * 快速过滤 - 第一层筛选
 */
function performQuickFilter(text) {
    if (text.length < 100) {
        return {
            needsReview: false,
            confidence: 0.95,
            reason: '文档内容过少，不构成政策措施',
            riskLevel: 'none'
        };
    }
    
    // 检查是否包含政策制定相关内容
    const policyIndicators = ['政策', '措施', '办法', '规定', '通知', '意见', '方案', '实施'];
    const hasPolicyContent = policyIndicators.some(indicator => text.includes(indicator));
    
    if (!hasPolicyContent) {
        return {
            needsReview: false,
            confidence: 0.85,
            reason: '文档不涉及政策措施制定',
            riskLevel: 'none'
        };
    }
    
    return { needsReview: true };
}

/**
 * 模式匹配分析 - 第二层检测
 */
function performPatternAnalysis(text) {
    const detectedPatterns = [];
    let totalMatches = 0;
    
    for (const [category, config] of Object.entries(PRECISE_VIOLATION_PATTERNS)) {
        const matches = [];
        
        // 正则表达式匹配
        for (const pattern of config.patterns) {
            const patternMatches = Array.from(text.matchAll(pattern));
            matches.push(...patternMatches.map(match => ({
                text: match[0],
                index: match.index,
                category: config.category,
                severity: config.severity
            })));
        }
        
        // 关键词匹配
        for (const keyword of config.keywords) {
            if (text.includes(keyword)) {
                matches.push({
                    text: keyword,
                    index: text.indexOf(keyword),
                    category: config.category,
                    severity: config.severity,
                    type: 'keyword'
                });
            }
        }
        
        if (matches.length > 0) {
            detectedPatterns.push({
                category: config.category,
                severity: config.severity,
                matches: matches,
                count: matches.length
            });
            totalMatches += matches.length;
        }
    }
    
    return {
        detectedPatterns,
        totalMatches,
        riskCategories: detectedPatterns.map(p => p.category)
    };
}

/**
 * 权重分析 - 第三层评估
 */
function performWeightAnalysis(text) {
    let totalScore = 0;
    const detectedTerms = [];
    
    for (const [riskLevel, config] of Object.entries(KEYWORD_WEIGHTS)) {
        for (const term of config.terms) {
            const count = (text.match(new RegExp(term, 'g')) || []).length;
            if (count > 0) {
                const score = count * config.weight;
                totalScore += score;
                detectedTerms.push({
                    term,
                    count,
                    weight: config.weight,
                    score,
                    riskLevel
                });
            }
        }
    }
    
    return {
        totalScore,
        detectedTerms,
        avgWeight: detectedTerms.length > 0 ? totalScore / detectedTerms.length : 0
    };
}

/**
 * AI语义理解 - 第四层深度分析（DeepSeek-R1优化版）
 */
async function performAISemanticAnalysis(text) {
    console.log('🧠 使用DeepSeek-R1优化提示词进行语义分析...');
    
    try {
        // 使用优化的语义分析
        const result = await performOptimizedSemanticAnalysis(text);
        
        console.log('✅ DeepSeek-R1优化语义分析完成');
        console.log(`📊 发现违规: ${result.hasViolation}, 置信度: ${(result.confidence * 100).toFixed(1)}%`);
        
        return {
            hasViolation: result.hasViolation,
            confidence: result.confidence,
            riskLevel: result.riskLevel,
            mainConcerns: result.mainConcerns,
            insights: result.reasoning ? 
                `基于DeepSeek-R1推理链分析: ${JSON.stringify(result.reasoning).substring(0, 200)}...` : 
                '基于DeepSeek-R1优化分析',
            recommendReview: result.recommendReview,
            reasoning: result.reasoning || '详细推理过程见原始响应',
            totalIssues: result.totalIssues || 0,
            rawResponse: result.rawResponse
        };
    } catch (error) {
        console.error('❌ DeepSeek-R1优化语义分析失败:', error.message);
        
        // Fallback到简化分析
        console.log('🔄 使用简化分析作为备选...');
        return {
            hasViolation: false,
            confidence: 0.3,
            riskLevel: 'none',
            mainConcerns: ['分析失败，需要人工确认'],
            insights: `分析失败: ${error.message}`,
            recommendReview: true,
            reasoning: '系统分析失败，建议人工审查'
        };
    }
}

/**
 * 综合评分算法
 */
function calculateFinalScore(patternAnalysis, weightAnalysis, aiAnalysis) {
    let finalScore = 0;
    let confidence = 0;
    let riskLevel = 'none';
    let needsReview = false;
    
    // 模式匹配得分 (0-40分)
    const patternScore = Math.min(patternAnalysis.totalMatches * 5, 40);
    finalScore += patternScore;
    
    // 权重分析得分 (0-30分)
    const weightScore = Math.min(weightAnalysis.totalScore * 2, 30);
    finalScore += weightScore;
    
    // AI分析得分 (0-30分)
    let aiScore = 0;
    if (aiAnalysis) {
        if (aiAnalysis.hasViolation) {
            aiScore = aiAnalysis.confidence * 30;
        }
        finalScore += aiScore;
    }
    
    // 计算最终风险等级和是否需要审查
    if (finalScore >= 70) {
        riskLevel = 'high';
        needsReview = true;
        confidence = 0.9;
    } else if (finalScore >= 40) {
        riskLevel = 'medium';
        needsReview = true;
        confidence = 0.7;
    } else if (finalScore >= 20) {
        riskLevel = 'low';
        needsReview = true;
        confidence = 0.5;
    } else {
        riskLevel = 'none';
        needsReview = false;
        confidence = 0.8;
    }
    
    // AI强烈建议的情况
    if (aiAnalysis && aiAnalysis.recommendReview && aiAnalysis.confidence > 0.8) {
        needsReview = true;
        confidence = Math.max(confidence, aiAnalysis.confidence);
    }
    
    const reason = generateReason(finalScore, patternAnalysis, weightAnalysis, aiAnalysis, needsReview);
    const detailedAnalysis = generateDetailedAnalysis(patternAnalysis, weightAnalysis, aiAnalysis, finalScore);
    
    return {
        needsReview,
        confidence,
        reason,
        riskLevel,
        finalScore,
        detailedAnalysis
    };
}

/**
 * 生成判断理由
 */
function generateReason(score, patternAnalysis, weightAnalysis, aiAnalysis, needsReview) {
    if (!needsReview) {
        return `综合分析得分${score.toFixed(1)}分，未发现明显的公平竞争问题，文档符合相关要求。`;
    }
    
    const reasons = [];
    
    if (patternAnalysis.totalMatches > 0) {
        reasons.push(`检测到${patternAnalysis.totalMatches}处疑似违规模式`);
    }
    
    if (weightAnalysis.totalScore > 10) {
        reasons.push(`关键词分析显示较高风险（${weightAnalysis.totalScore.toFixed(1)}分）`);
    }
    
    if (aiAnalysis && aiAnalysis.hasViolation) {
        reasons.push(`AI语义分析发现潜在问题（置信度${(aiAnalysis.confidence*100).toFixed(1)}%）`);
    }
    
    return `综合分析得分${score.toFixed(1)}分，${reasons.join('，')}，建议进行详细审查。`;
}

/**
 * 生成详细分析报告
 */
function generateDetailedAnalysis(patternAnalysis, weightAnalysis, aiAnalysis, finalScore) {
    const analysis = {
        overallScore: finalScore,
        patternAnalysis: {
            totalMatches: patternAnalysis.totalMatches,
            riskCategories: patternAnalysis.riskCategories,
            details: patternAnalysis.detectedPatterns.map(p => ({
                category: p.category,
                severity: p.severity,
                matchCount: p.count
            }))
        },
        weightAnalysis: {
            totalScore: weightAnalysis.totalScore,
            termCount: weightAnalysis.detectedTerms.length,
            avgWeight: weightAnalysis.avgWeight,
            topTerms: weightAnalysis.detectedTerms
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
        },
        aiAnalysis: aiAnalysis ? {
            hasViolation: aiAnalysis.hasViolation,
            confidence: aiAnalysis.confidence,
            riskLevel: aiAnalysis.riskLevel,
            mainConcerns: aiAnalysis.mainConcerns,
            insights: aiAnalysis.insights
        } : null
    };
    
    return analysis;
}

/**
 * 增强的详细审查 - 多模型交叉验证
 */
async function performEnhancedDetailedReview(text) {
    console.log('🔍 开始增强详细审查...');
    
    try {
        // 第一轮：精准条款对照审查
        const preciseReview = await performPreciseArticleReview(text);
        
        // 第二轮：实际案例对比审查
        const caseBasedReview = await performCaseBasedReview(text);
        
        // 第三轮：交叉验证
        const crossValidation = performCrossValidation(preciseReview, caseBasedReview);
        
        // 生成最终报告
        const finalResult = generateFinalReport(preciseReview, caseBasedReview, crossValidation);
        
        return finalResult;
    } catch (error) {
        console.error('增强详细审查失败:', error);
        throw error;
    }
}

/**
 * 精准条款对照审查（DeepSeek-R1优化版）
 */
async function performPreciseArticleReview(text) {
    console.log('📋 使用DeepSeek-R1优化提示词进行精准条款对照审查...');
    
    try {
        // 使用优化的详细审查
        const result = await performOptimizedDetailedReview(text);
        
        console.log('✅ DeepSeek-R1优化条款审查完成');
        console.log(`📊 发现问题: ${result.totalIssues}个, 合规状态: ${result.complianceStatus}`);
        
        return {
            totalIssues: result.totalIssues,
            issues: result.issues,
            overallAssessment: result.overallAssessment || 
                (result.totalIssues > 0 ? '发现公平竞争问题需要修改' : '经审查符合公平竞争要求'),
            complianceStatus: result.complianceStatus,
            reasoningProcess: result.reasoningProcess,
            processingMethod: result.processingMethod || 'deepseek_optimized_review',
            rawResponse: result.rawResponse
        };
    } catch (error) {
        console.error('❌ DeepSeek-R1优化条款审查失败:', error.message);
        
        // Fallback到原始方式
        console.log('🔄 使用简化审查作为备选...');
        return {
            totalIssues: 0,
            issues: [],
            overallAssessment: `审查失败: ${error.message}，需要人工审查`,
            complianceStatus: 'needs-clarification',
            processingMethod: 'fallback_failed'
        };
    }
}

/**
 * 基于实际案例的对比审查（DeepSeek-R1优化版）
 */
async function performCaseBasedReview(text) {
    console.log('📚 使用DeepSeek-R1优化提示词进行案例对比审查...');
    
    try {
        // 使用优化的案例对比分析
        const result = await performOptimizedCaseComparison(text);
        
        console.log('✅ DeepSeek-R1优化案例对比完成');
        console.log(`📊 发现违规模式: ${result.hasViolationPattern}, 置信度: ${(result.confidenceLevel * 100).toFixed(1)}%`);
        
        return {
            hasViolationPattern: result.hasViolationPattern,
            similarCases: result.caseComparison?.similarViolationCases || [],
            impactAssessment: {
                affectedParties: '基于案例对比分析的受影响群体',
                competitionImpact: result.mainRisks?.length > 0 ? '存在竞争限制风险' : '无明显竞争影响',
                marketEffect: result.hasViolationPattern ? '可能形成市场准入壁垒' : '符合公平竞争要求'
            },
            detectedIssues: result.mainRisks?.map((risk, index) => ({
                issueType: '案例对比发现的风险',
                description: risk,
                evidenceText: '详见案例对比分析',
                caseComparison: result.caseComparison?.similarViolationCases?.[index] || '典型违规模式'
            })) || [],
            recommendations: result.recommendations || [],
            caseComparison: result.caseComparison,
            confidenceLevel: result.confidenceLevel,
            processingMethod: result.processingMethod || 'deepseek_case_comparison',
            rawResponse: result.rawResponse
        };
    } catch (error) {
        console.error('❌ DeepSeek-R1优化案例对比失败:', error.message);
        
        // Fallback到简化分析
        console.log('🔄 使用简化案例对比作为备选...');
        return {
            hasViolationPattern: false,
            similarCases: [],
            impactAssessment: {
                affectedParties: '分析失败',
                competitionImpact: '无法确定',
                marketEffect: '需要人工确认'
            },
            detectedIssues: [{
                issueType: '分析失败',
                description: error.message,
                evidenceText: '系统分析异常',
                caseComparison: '无法对比'
            }],
            recommendations: ['建议人工审查'],
            processingMethod: 'fallback_failed'
        };
    }
}

/**
 * 交叉验证
 */
function performCrossValidation(preciseReview, caseBasedReview) {
    // 比较两次审查的结果
    const validation = {
        consistency: 0,
        agreedIssues: [],
        conflictingResults: [],
        confidence: 0
    };
    
    // 计算一致性
    if (preciseReview.totalIssues > 0 && caseBasedReview.hasViolationPattern) {
        validation.consistency = 0.9;
        validation.confidence = 0.95;
    } else if (preciseReview.totalIssues === 0 && !caseBasedReview.hasViolationPattern) {
        validation.consistency = 0.95;
        validation.confidence = 0.9;
    } else {
        validation.consistency = 0.3;
        validation.confidence = 0.6;
    }
    
    return validation;
}

/**
 * 生成最终审查报告
 */
function generateFinalReport(preciseReview, caseBasedReview, crossValidation) {
    const totalIssues = preciseReview.totalIssues || 0;
    const issues = preciseReview.issues || [];
    
    // 增强问题信息
    const enhancedIssues = issues.map((issue, index) => ({
        ...issue,
        crossValidation: crossValidation.consistency > 0.7,
        practicalImpact: caseBasedReview.impactAssessment,
        confidence: crossValidation.confidence
    }));
    
    return {
        totalIssues,
        issues: enhancedIssues,
        rawResponse: `精准审查发现${totalIssues}个问题，交叉验证一致性${(crossValidation.consistency*100).toFixed(1)}%`,
        complianceStatus: preciseReview.complianceStatus || (totalIssues > 0 ? 'non-compliant' : 'compliant'),
        crossValidation,
        caseAnalysis: caseBasedReview,
        processingMethod: 'enhanced_multi_model_review',
        finalConfidence: crossValidation.confidence
    };
}

/**
 * AI API调用统一接口
 */
async function callAIAPI(prompt) {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
        throw new Error('未配置API密钥');
    }

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
        timeout: 90000
    });

    return response.data.choices[0].message.content;
}

/**
 * AI响应解析
 */
function parseAIResponse(content, type) {
    const cleanContent = content.trim();
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        try {
            const result = JSON.parse(jsonMatch[0]);
            
            if (type === 'precise_article_review') {
                return {
                    totalIssues: result.totalIssues || 0,
                    issues: result.issues || [],
                    overallAssessment: result.overallAssessment || '',
                    complianceStatus: result.complianceStatus || 'compliant'
                };
            } else if (type === 'case_based_review') {
                return {
                    hasViolationPattern: result.hasViolationPattern || false,
                    similarCases: result.similarCases || [],
                    impactAssessment: result.impactAssessment || {},
                    detectedIssues: result.detectedIssues || [],
                    recommendations: result.recommendations || []
                };
            }
            
            return result;
        } catch (parseError) {
            console.error('JSON解析失败:', parseError.message);
        }
    }
    
    // 检查是否明确表示无问题
    const noIssueKeywords = ['未发现违反', '符合', '无问题', '合规', 'compliant', 'totalIssues": 0'];
    const hasNoIssue = noIssueKeywords.some(keyword => cleanContent.includes(keyword));
    
    if (hasNoIssue || type === 'precise_article_review') {
        return {
            totalIssues: 0,
            issues: [],
            overallAssessment: hasNoIssue ? '经审查未发现违规问题' : '需要进一步人工确认',
            complianceStatus: hasNoIssue ? 'compliant' : 'needs-clarification'
        };
    }
    
    return {
        hasViolationPattern: false,
        detectedIssues: [],
        recommendations: []
    };
}

module.exports = {
    performEnhancedPreCheck,
    performEnhancedDetailedReview,
    PRECISE_VIOLATION_PATTERNS,
    KEYWORD_WEIGHTS
};