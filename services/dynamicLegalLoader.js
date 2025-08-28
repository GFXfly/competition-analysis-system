/**
 * 🎯 动态法条加载器 v1.0  
 * 智能选择最相关的法条，避免提示词过载
 * 支持多级匹配：关键词→语义→相关度
 */

const { FAIR_COMPETITION_ARTICLES, VIOLATION_TYPES } = require('../config/legalFramework');

/**
 * 📚 增强的法条索引数据库
 */
class LegalArticleIndex {
    constructor() {
        this.articleIndex = this.buildArticleIndex();
        this.semanticGroups = this.buildSemanticGroups();
        this.keywordMappings = this.buildKeywordMappings();
    }

    /**
     * 🔍 构建法条索引
     */
    buildArticleIndex() {
        const index = new Map();
        
        Object.entries(FAIR_COMPETITION_ARTICLES).forEach(([key, article]) => {
            const indexData = {
                key,
                ...article,
                // 提取关键概念
                concepts: this.extractConcepts(article),
                // 相关场景
                scenarios: this.identifyScenarios(article),
                // 违规严重程度  
                severity: this.assessSeverity(article),
                // 适用频率权重
                frequency: this.calculateFrequency(article)
            };
            
            index.set(key, indexData);
        });
        
        return index;
    }

    /**
     * 🧩 构建语义分组
     */
    buildSemanticGroups() {
        return {
            // 市场准入相关
            marketAccess: {
                primary: ['article_8', 'article_9', 'article_10', 'article_11', 'article_12', 'article_13', 'article_14'],
                keywords: ['准入', '门槛', '资质', '限定', '指定', '排除', '禁止'],
                concepts: ['市场进入', '经营资格', '业务许可', '投资限制']
            },
            
            // 流动障碍相关  
            flowBarriers: {
                primary: ['article_15', 'article_16', 'article_17', 'article_18', 'article_19', 'article_20'],
                keywords: ['流动', '跨区域', '运输', '销售', '采购', '招标', '投标'],
                concepts: ['商品流通', '要素流动', '政府采购', '跨区经营']
            },
            
            // 成本影响相关
            costImpact: {
                primary: ['article_21', 'article_22', 'article_23'],  
                keywords: ['奖励', '补贴', '税收', '减免', '优惠', '扶持', '资金'],
                concepts: ['财政支持', '税收政策', '资源配置', '成本优势']
            },
            
            // 行为影响相关
            behaviorImpact: {
                primary: ['article_24', 'article_25'],
                keywords: ['强制', '要求', '必须', '应当', '投资', '建设', '经营'],
                concepts: ['经营干预', '投资引导', '行为限制', '强制措施']
            }
        };
    }

    /**
     * 🗝️ 构建关键词映射表
     */
    buildKeywordMappings() {
        return {
            // 高频违规词汇 → 法条映射
            directMappings: {
                '本地企业': ['article_8', 'article_14'],
                '当地供应商': ['article_8', 'article_19'], 
                '指定供应商': ['article_8'],
                '限定品牌': ['article_8'],
                '专营权': ['article_10'],
                '独家代理': ['article_10'],
                '本地注册': ['article_9', 'article_12'],
                '投资要求': ['article_11', 'article_14'],
                '分支机构': ['article_12', 'article_14'],
                '歧视性收费': ['article_15', 'article_16'],
                '外地商品': ['article_15', 'article_17'],
                '政府采购': ['article_18', 'article_19'],
                '招标限制': ['article_18'],
                '财政奖励': ['article_21'],
                '税收减免': ['article_22'],
                '土地优惠': ['article_23'],
                '强制投资': ['article_24'],
                '贷款贴息': ['article_25']
            },
            
            // 隐性词汇 → 法条映射
            implicitMappings: {
                '优先考虑': ['article_8', 'article_19', 'article_21'],
                '重点支持': ['article_21', 'article_23'],
                '就近选择': ['article_8', 'article_14'],
                '属地管理': ['article_9', 'article_12'],  
                '同等条件下': ['article_19'],
                '符合条件的': ['article_8', 'article_14'],
                '根据贡献': ['article_21'],
                '按照规模': ['article_21'],
                '经济贡献': ['article_21'],
                '纳税额': ['article_21', 'article_22'],
                '产值贡献': ['article_21'],
                '绿色通道': ['article_20', 'article_25'],
                '快速审批': ['article_20']
            }
        };
    }

    /**
     * 🔬 提取法条核心概念
     */
    extractConcepts(article) {
        const concepts = [];
        const text = article.content + ' ' + article.details;
        
        // 概念提取规则
        if (text.includes('限定') || text.includes('指定')) concepts.push('选择性限制');
        if (text.includes('歧视') || text.includes('区别')) concepts.push('差别对待');
        if (text.includes('区域') || text.includes('地区')) concepts.push('地域限制');
        if (text.includes('奖励') || text.includes('补贴')) concepts.push('财政优惠');
        if (text.includes('准入') || text.includes('退出')) concepts.push('市场准入');
        if (text.includes('流动') || text.includes('运输')) concepts.push('商品流动');
        if (text.includes('采购') || text.includes('招标')) concepts.push('政府采购');
        if (text.includes('强制') || text.includes('要求')) concepts.push('行为干预');
        
        return concepts;
    }

    /**
     * 🎬 识别适用场景
     */
    identifyScenarios(article) {
        const scenarios = [];
        const key = Object.keys(FAIR_COMPETITION_ARTICLES)
            .find(k => FAIR_COMPETITION_ARTICLES[k] === article);
        
        // 基于法条编号识别场景
        if (['article_8', 'article_9', 'article_10'].includes(key)) {
            scenarios.push('政策制定阶段', '市场准入审查');
        }
        if (['article_15', 'article_16', 'article_17'].includes(key)) {
            scenarios.push('跨区域经营', '商品流通');
        }
        if (['article_18', 'article_19'].includes(key)) {
            scenarios.push('政府采购', '招标投标');
        }
        if (['article_21', 'article_22', 'article_23'].includes(key)) {
            scenarios.push('财政政策', '税收政策', '资源配置');
        }
        
        return scenarios;
    }

    /**
     * ⚡ 评估违规严重程度
     */
    assessSeverity(article) {
        const content = article.content.toLowerCase();
        
        if (content.includes('不得') && (content.includes('限定') || content.includes('指定'))) {
            return 'high';
        }
        if (content.includes('歧视') || content.includes('排除')) {
            return 'high'; 
        }
        if (content.includes('优惠') || content.includes('奖励')) {
            return 'medium';
        }
        
        return 'medium';
    }

    /**
     * 📊 计算适用频率权重
     */
    calculateFrequency(article) {
        const key = Object.keys(FAIR_COMPETITION_ARTICLES)
            .find(k => FAIR_COMPETITION_ARTICLES[k] === article);
            
        // 基于经验的频率权重
        const frequencyMap = {
            'article_8': 0.95,  // 限定特定经营者 - 最常见
            'article_21': 0.90, // 财政奖励补贴 - 很常见
            'article_19': 0.85, // 政府采购歧视 - 常见
            'article_14': 0.80, // 歧视性准入条件 - 常见
            'article_9': 0.75,  // 区域注册要求 - 较常见
            'article_15': 0.70, // 歧视性收费 - 较常见
            'article_22': 0.65, // 税收减免 - 中等
            'article_10': 0.60, // 专营权利 - 中等
            // 其他条款默认0.5
        };
        
        return frequencyMap[key] || 0.5;
    }
}

/**
 * 🎯 动态法条选择器
 */
class DynamicLegalSelector {
    constructor() {
        this.index = new LegalArticleIndex();
        this.selectionCache = new Map();
    }

    /**
     * 🚀 主选择方法：智能选择最相关法条
     */
    async selectRelevantArticles(documentText, semanticResults = null, maxArticles = 6) {
        console.log('🔍 开始动态法条选择...');
        
        // 生成缓存键
        const cacheKey = this.generateCacheKey(documentText, semanticResults, maxArticles);
        if (this.selectionCache.has(cacheKey)) {
            console.log('✅ 使用缓存的法条选择结果');
            return this.selectionCache.get(cacheKey);
        }

        // 多级匹配策略
        const candidates = new Map();

        // 第一级：直接关键词匹配 (权重: 3.0)
        this.performDirectKeywordMatching(documentText, candidates, 3.0);

        // 第二级：隐性关键词匹配 (权重: 2.0)  
        this.performImplicitKeywordMatching(documentText, candidates, 2.0);

        // 第三级：语义匹配 (权重: 1.5)
        if (semanticResults) {
            this.performSemanticMatching(semanticResults, candidates, 1.5);
        }

        // 第四级：概念匹配 (权重: 1.0)
        this.performConceptMatching(documentText, candidates, 1.0);

        // 第五级：频率权重调整
        this.applyFrequencyWeights(candidates);

        // 选择得分最高的法条
        const selectedArticles = this.selectTopArticles(candidates, maxArticles);
        
        // 缓存结果
        this.selectionCache.set(cacheKey, selectedArticles);
        
        console.log(`✅ 动态选择了 ${selectedArticles.length} 个相关法条`);
        return selectedArticles;
    }

    /**
     * 🎯 第一级：直接关键词匹配
     */
    performDirectKeywordMatching(text, candidates, weight) {
        console.log('📍 执行直接关键词匹配...');
        
        Object.entries(this.index.keywordMappings.directMappings).forEach(([keyword, articles]) => {
            if (text.includes(keyword)) {
                articles.forEach(articleKey => {
                    const currentScore = candidates.get(articleKey) || 0;
                    candidates.set(articleKey, currentScore + weight);
                });
                
                console.log(`  🎯 发现关键词 "${keyword}" → 匹配法条: ${articles.join(', ')}`);
            }
        });
    }

    /**
     * 🔍 第二级：隐性关键词匹配
     */
    performImplicitKeywordMatching(text, candidates, weight) {
        console.log('🔍 执行隐性关键词匹配...');
        
        Object.entries(this.index.keywordMappings.implicitMappings).forEach(([keyword, articles]) => {
            if (text.includes(keyword)) {
                articles.forEach(articleKey => {
                    const currentScore = candidates.get(articleKey) || 0;
                    candidates.set(articleKey, currentScore + weight);
                });
                
                console.log(`  💭 发现隐性词汇 "${keyword}" → 匹配法条: ${articles.join(', ')}`);
            }
        });
    }

    /**
     * 🧠 第三级：语义匹配
     */
    performSemanticMatching(semanticResults, candidates, weight) {
        console.log('🧠 执行语义匹配...');
        
        const riskIndicators = semanticResults.riskIndicators || [];
        const keyInsights = semanticResults.keyInsights || [];
        const allSemanticTerms = [...riskIndicators, ...keyInsights].join(' ').toLowerCase();

        Object.entries(this.index.semanticGroups).forEach(([groupName, group]) => {
            // 检查语义相关性
            const relevanceScore = group.keywords.filter(keyword => 
                allSemanticTerms.includes(keyword.toLowerCase())
            ).length;

            if (relevanceScore > 0) {
                group.primary.forEach(articleKey => {
                    const currentScore = candidates.get(articleKey) || 0;
                    candidates.set(articleKey, currentScore + weight * (relevanceScore / group.keywords.length));
                });
                
                console.log(`  🎨 语义组 "${groupName}" 相关度: ${relevanceScore}/${group.keywords.length}`);
            }
        });
    }

    /**
     * 💡 第四级：概念匹配
     */
    performConceptMatching(text, candidates, weight) {
        console.log('💡 执行概念匹配...');
        
        this.index.articleIndex.forEach((articleData, articleKey) => {
            let conceptMatches = 0;
            
            articleData.concepts.forEach(concept => {
                if (text.toLowerCase().includes(concept.toLowerCase())) {
                    conceptMatches++;
                }
            });
            
            if (conceptMatches > 0) {
                const currentScore = candidates.get(articleKey) || 0;
                candidates.set(articleKey, currentScore + weight * conceptMatches);
                
                console.log(`  💡 ${articleKey} 概念匹配: ${conceptMatches}个`);
            }
        });
    }

    /**
     * ⚡ 应用频率权重
     */
    applyFrequencyWeights(candidates) {
        console.log('⚡ 应用频率权重调整...');
        
        candidates.forEach((score, articleKey) => {
            const articleData = this.index.articleIndex.get(articleKey);
            if (articleData) {
                const adjustedScore = score * articleData.frequency;
                candidates.set(articleKey, adjustedScore);
            }
        });
    }

    /**
     * 🏆 选择得分最高的法条
     */
    selectTopArticles(candidates, maxArticles) {
        // 转换为数组并排序
        const sortedCandidates = Array.from(candidates.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxArticles);

        // 获取完整法条信息
        return sortedCandidates.map(([articleKey, score]) => {
            const articleData = this.index.articleIndex.get(articleKey);
            return {
                key: articleKey,
                score: Math.round(score * 100) / 100,
                ...articleData,
                // 移除内部数据
                concepts: undefined,
                scenarios: undefined,
                frequency: undefined
            };
        });
    }

    /**
     * 🔑 生成缓存键
     */
    generateCacheKey(text, semanticResults, maxArticles) {
        const textHash = text.substring(0, 500);
        const semanticHash = semanticResults ? 
            (semanticResults.keyInsights || []).join(',').substring(0, 100) : '';
        
        return `${Buffer.from(textHash + semanticHash).toString('base64')}_${maxArticles}`;
    }

    /**
     * 📊 获取法条选择统计
     */
    getSelectionStats() {
        const stats = {
            cacheSize: this.selectionCache.size,
            totalArticles: this.index.articleIndex.size,
            semanticGroups: Object.keys(this.index.semanticGroups).length,
            directMappings: Object.keys(this.index.keywordMappings.directMappings).length,
            implicitMappings: Object.keys(this.index.keywordMappings.implicitMappings).length
        };
        
        return stats;
    }

    /**
     * 🧹 清理缓存
     */
    clearCache() {
        this.selectionCache.clear();
        console.log('🧹 动态法条选择缓存已清理');
    }

    /**
     * 🔧 手动选择特定类型的法条
     */
    selectByCategory(category, maxArticles = 5) {
        const group = this.index.semanticGroups[category];
        if (!group) {
            throw new Error(`未知的法条类别: ${category}`);
        }

        return group.primary.slice(0, maxArticles).map(articleKey => {
            const articleData = this.index.articleIndex.get(articleKey);
            return {
                key: articleKey,
                score: 1.0,
                ...articleData
            };
        });
    }
}

// 创建全局实例
const dynamicSelector = new DynamicLegalSelector();

/**
 * 🚀 便捷调用接口
 */
async function selectRelevantArticles(documentText, semanticResults = null, options = {}) {
    const {
        maxArticles = 6,
        category = null,
        forceRefresh = false
    } = options;

    if (forceRefresh) {
        dynamicSelector.clearCache();
    }

    if (category) {
        return dynamicSelector.selectByCategory(category, maxArticles);
    }

    return await dynamicSelector.selectRelevantArticles(documentText, semanticResults, maxArticles);
}

/**
 * 📈 获取法条相关度分析
 */
function analyzeArticleRelevance(documentText, semanticResults = null) {
    const selector = new DynamicLegalSelector();
    const candidates = new Map();
    
    // 执行所有匹配层级
    selector.performDirectKeywordMatching(documentText, candidates, 3.0);
    selector.performImplicitKeywordMatching(documentText, candidates, 2.0);
    if (semanticResults) {
        selector.performSemanticMatching(semanticResults, candidates, 1.5);
    }
    selector.performConceptMatching(documentText, candidates, 1.0);
    selector.applyFrequencyWeights(candidates);

    // 返回详细分析
    const analysis = Array.from(candidates.entries())
        .map(([articleKey, score]) => {
            const articleData = selector.index.articleIndex.get(articleKey);
            return {
                article: articleKey,
                title: articleData.title,
                relevanceScore: Math.round(score * 100) / 100,
                severity: articleData.severity,
                frequency: articleData.frequency,
                concepts: articleData.concepts
            };
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return analysis;
}

module.exports = {
    DynamicLegalSelector,
    LegalArticleIndex,
    selectRelevantArticles,
    analyzeArticleRelevance,
    // 导出全局实例用于高级操作
    dynamicSelector
};