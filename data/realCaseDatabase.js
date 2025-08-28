/**
 * 📚 实际案例数据库 v1.0
 * 基于真实公平竞争审查案例和监管实践
 * 为AI分析提供经验参考和推理基础
 */

/**
 * 🏛️ 政府采购类违规案例
 */
const GOVERNMENT_PROCUREMENT_CASES = [
    {
        id: 'GP001',
        title: '某市政府采购中本地企业加分案',
        category: 'government_procurement',
        violationArticle: '第十九条',
        
        originalText: '在政府采购评分标准中规定：本地注册企业在技术标准评分基础上加5分，本地纳税企业再加3分。',
        
        keyFeatures: [
            '本地注册企业加分',
            '本地纳税额外加分',
            '政府采购评分标准',
            '明确的分数倾斜'
        ],
        
        violationReason: '直接对本地企业给予评分优势，构成政府采购中的地域歧视',
        
        legalBasis: '违反《公平竞争审查条例实施办法》第十九条：不得限制外地经营者参与本地政府采购活动',
        
        outcome: {
            decision: '要求立即停止执行',
            correctiveAction: '修改评分标准，删除地域性加分条款',
            implementationTime: '30天内完成整改'
        },
        
        lessonLearned: '政府采购中任何基于地域的评分优势都构成违规，即使是"同等条件下优先"也不被允许',
        
        relatedKeywords: ['政府采购', '本地企业', '加分', '评分标准', '地域歧视'],
        severity: 'high',
        frequency: 'common',
        
        similarPatterns: [
            '本地供应商优先',
            '当地企业加分',
            '区域内企业优惠',
            '就近采购原则'
        ]
    },

    {
        id: 'GP002', 
        title: '"同等条件下优先本地"政策案',
        category: 'government_procurement',
        violationArticle: '第十九条',
        
        originalText: '在政府采购中，同等条件下优先选择本地企业；价格相差5%以内视为同等条件。',
        
        keyFeatures: [
            '同等条件下优先',
            '价格差异标准',
            '本地企业倾向',
            '软性表述但实质违规'
        ],
        
        violationReason: '"同等条件"的判断标准主观性强，实际执行中必然偏向本地企业',
        
        legalBasis: '违反公平竞争原则，构成变相限制外地企业参与',
        
        outcome: {
            decision: '认定违规，要求整改',
            correctiveAction: '删除"优先本地"表述，建立纯客观评价标准',
            implementationTime: '立即整改'
        },
        
        lessonLearned: '"同等条件下优先"是典型的伪公平表述，实际执行中无法做到真正公平',
        
        relatedKeywords: ['同等条件', '优先', '价格相近', '本地企业'],
        severity: 'high',
        frequency: 'very_common'
    }
];

/**
 * 💰 财政奖励补贴类违规案例
 */
const FISCAL_INCENTIVE_CASES = [
    {
        id: 'FI001',
        title: '按企业纳税额给予财政奖励案',
        category: 'fiscal_incentive',
        violationArticle: '第二十一条',
        
        originalText: '对年纳税额超过1000万元的企业，按纳税额的10%给予财政奖励；对年纳税额超过5000万元的企业，奖励比例提升至15%。',
        
        keyFeatures: [
            '按纳税额奖励',
            '分档奖励标准',
            '经济贡献导向',
            '差别化奖励比例'
        ],
        
        violationReason: '以经济贡献（纳税额）作为奖励标准，构成对特定经营者的选择性优惠',
        
        legalBasis: '违反第二十一条关于不得给予特定经营者选择性财政奖励的规定',
        
        outcome: {
            decision: '认定违规，立即停止',
            correctiveAction: '建立基于创新能力、环保表现等客观标准的奖励机制',
            implementationTime: '60天内建立新标准'
        },
        
        lessonLearned: '任何以经济贡献为直接标准的财政奖励都构成违规，必须建立客观、公平的评价体系',
        
        relatedKeywords: ['纳税额', '财政奖励', '经济贡献', '按比例奖励'],
        severity: 'high',
        frequency: 'very_common',
        
        commonVariations: [
            '按产值奖励',
            '按营业收入奖励',
            '按就业贡献奖励',
            '按投资规模奖励'
        ]
    },

    {
        id: 'FI002',
        title: '企业迁入地方财政奖励案',
        category: 'fiscal_incentive',
        violationArticle: '第二十一条',
        
        originalText: '对从外地迁入本市并将注册地变更至本市的企业，给予一次性迁入奖励100万元，分三年发放。',
        
        keyFeatures: [
            '迁入奖励',
            '注册地变更奖励',
            '一次性补贴',
            '分期发放'
        ],
        
        violationReason: '以企业注册地迁移为条件给予财政奖励，扭曲企业正常经营决策',
        
        legalBasis: '违反第二十一条第三款关于不得以迁移注册地为条件给予奖励的规定',
        
        outcome: {
            decision: '立即停止该政策',
            correctiveAction: '对所有符合条件企业一视同仁，不得以注册地为标准',
            implementationTime: '立即执行'
        },
        
        lessonLearned: '迁入奖励是典型的地方保护主义做法，严重扭曲市场竞争',
        
        relatedKeywords: ['迁入奖励', '注册地', '变更奖励', '一次性补贴'],
        severity: 'high',
        frequency: 'common'
    }
];

/**
 * 🏭 市场准入类违规案例
 */
const MARKET_ACCESS_CASES = [
    {
        id: 'MA001',
        title: '要求投标企业在本地设立分公司案',
        category: 'market_access',
        violationArticle: '第十四条',
        
        originalText: '参与本项目投标的企业必须在本市设立分公司或办事处，并提供相关工商注册证明。',
        
        keyFeatures: [
            '强制设立分支机构',
            '投标准入条件',
            '工商注册要求',
            '地域性限制'
        ],
        
        violationReason: '将设立本地分支机构作为参与招标的必要条件，构成市场准入歧视',
        
        legalBasis: '违反第十四条关于不得强制外地企业在本地设立分支机构的规定',
        
        outcome: {
            decision: '认定违规并重新招标',
            correctiveAction: '删除分支机构设立要求，允许所有合格企业参与',
            implementationTime: '重新发布招标公告'
        },
        
        lessonLearned: '任何将本地设立机构作为参与市场活动前提的要求都构成违规',
        
        relatedKeywords: ['分公司', '办事处', '工商注册', '投标条件'],
        severity: 'high',
        frequency: 'common'
    },

    {
        id: 'MA002',
        title: '限定使用本地产品的技术标准案',
        category: 'market_access', 
        violationArticle: '第八条',
        
        originalText: '采购设备必须符合本市地方标准DB32/XXX-2023，该标准目前只有本地两家企业能够满足。',
        
        keyFeatures: [
            '地方技术标准',
            '事实上的限定',
            '技术壁垒',
            '变相排除外地企业'
        ],
        
        violationReason: '通过设置只有本地企业才能满足的技术标准，变相限定特定经营者',
        
        legalBasis: '违反第八条关于不得限定特定经营者提供商品服务的规定',
        
        outcome: {
            decision: '要求修改技术标准',
            correctiveAction: '采用国家标准或行业通用标准，确保公平竞争',
            implementationTime: '30天内修改标准'
        },
        
        lessonLearned: '技术标准不能成为地方保护的工具，应采用通用性、开放性标准',
        
        relatedKeywords: ['地方标准', '技术要求', '变相限定', '技术壁垒'],
        severity: 'high',
        frequency: 'common'
    }
];

/**
 * 🚚 商品流动类违规案例  
 */
const GOODS_FLOW_CASES = [
    {
        id: 'GF001',
        title: '对外地商品设置额外检验要求案',
        category: 'goods_flow',
        violationArticle: '第十五条',
        
        originalText: '外省生产的同类产品进入本市销售，除国家规定的质检外，还需通过本市质监部门的补充检验。',
        
        keyFeatures: [
            '额外检验要求',
            '外省产品歧视',
            '重复检验',
            '地方质检部门'
        ],
        
        violationReason: '对外地商品设置超出国家标准的额外检验要求，构成贸易壁垒',
        
        legalBasis: '违反第十五条关于不得对外地商品设定歧视性检验标准的规定',
        
        outcome: {
            decision: '立即取消额外检验',
            correctiveAction: '承认外省合格检验结果，不得重复检验',
            implementationTime: '立即执行'
        },
        
        lessonLearned: '商品检验应遵循"一次检验，全国通行"原则，不得设置地方性障碍',
        
        relatedKeywords: ['额外检验', '外省产品', '重复检验', '质量监督'],
        severity: 'high',
        frequency: 'common'
    }
];

/**
 * 📋 综合案例数据库
 */
const COMPREHENSIVE_CASE_DATABASE = [
    ...GOVERNMENT_PROCUREMENT_CASES,
    ...FISCAL_INCENTIVE_CASES, 
    ...MARKET_ACCESS_CASES,
    ...GOODS_FLOW_CASES
];

/**
 * 🧠 案例匹配算法
 */
class CaseMatchingEngine {
    constructor() {
        this.database = COMPREHENSIVE_CASE_DATABASE;
        this.keywordIndex = this.buildKeywordIndex();
        this.patternIndex = this.buildPatternIndex();
    }

    /**
     * 🔍 构建关键词索引
     */
    buildKeywordIndex() {
        const index = new Map();
        
        this.database.forEach(case_ => {
            case_.relatedKeywords.forEach(keyword => {
                if (!index.has(keyword)) {
                    index.set(keyword, []);
                }
                index.get(keyword).push({
                    caseId: case_.id,
                    relevance: 1.0
                });
            });

            // 处理相似模式
            if (case_.similarPatterns) {
                case_.similarPatterns.forEach(pattern => {
                    if (!index.has(pattern)) {
                        index.set(pattern, []);
                    }
                    index.get(pattern).push({
                        caseId: case_.id,
                        relevance: 0.8
                    });
                });
            }
        });
        
        return index;
    }

    /**
     * 🧩 构建模式索引
     */
    buildPatternIndex() {
        const index = new Map();
        
        this.database.forEach(case_ => {
            // 按违规条款索引
            if (!index.has(case_.violationArticle)) {
                index.set(case_.violationArticle, []);
            }
            index.get(case_.violationArticle).push(case_.id);

            // 按类别索引
            if (!index.has(case_.category)) {
                index.set(case_.category, []);
            }
            index.get(case_.category).push(case_.id);

            // 按严重程度索引
            const severityKey = `severity_${case_.severity}`;
            if (!index.has(severityKey)) {
                index.set(severityKey, []);
            }
            index.get(severityKey).push(case_.id);
        });

        return index;
    }

    /**
     * 🎯 查找相似案例
     */
    findSimilarCases(query, options = {}) {
        const {
            maxResults = 5,
            minRelevance = 0.3,
            categoryFilter = null,
            severityFilter = null
        } = options;

        console.log('🔍 开始案例匹配查询...');

        // 多维度匹配
        const matches = new Map();

        // 1. 关键词匹配
        this.performKeywordMatching(query, matches);

        // 2. 语义匹配
        this.performSemanticMatching(query, matches);

        // 3. 模式匹配  
        this.performPatternMatching(query, matches);

        // 过滤和排序
        let results = Array.from(matches.entries())
            .map(([caseId, score]) => ({
                case: this.getCaseById(caseId),
                relevanceScore: score
            }))
            .filter(result => result.relevanceScore >= minRelevance)
            .sort((a, b) => b.relevanceScore - a.relevanceScore);

        // 应用过滤器
        if (categoryFilter) {
            results = results.filter(r => r.case.category === categoryFilter);
        }
        if (severityFilter) {
            results = results.filter(r => r.case.severity === severityFilter);
        }

        // 限制结果数量
        results = results.slice(0, maxResults);

        console.log(`✅ 找到 ${results.length} 个相似案例`);
        return results;
    }

    /**
     * 🔤 关键词匹配
     */
    performKeywordMatching(query, matches) {
        const queryLower = query.toLowerCase();
        
        this.keywordIndex.forEach((cases, keyword) => {
            if (queryLower.includes(keyword.toLowerCase())) {
                cases.forEach(({ caseId, relevance }) => {
                    const currentScore = matches.get(caseId) || 0;
                    matches.set(caseId, currentScore + relevance * 0.4);
                });
            }
        });
    }

    /**
     * 🧠 语义匹配
     */
    performSemanticMatching(query, matches) {
        // 简化版语义匹配 - 基于关键概念
        const concepts = this.extractConcepts(query);
        
        this.database.forEach(case_ => {
            let semanticScore = 0;
            
            case_.keyFeatures.forEach(feature => {
                concepts.forEach(concept => {
                    if (this.semanticSimilarity(feature, concept) > 0.7) {
                        semanticScore += 0.3;
                    }
                });
            });

            if (semanticScore > 0) {
                const currentScore = matches.get(case_.id) || 0;
                matches.set(case_.id, currentScore + semanticScore);
            }
        });
    }

    /**
     * 🎨 模式匹配
     */
    performPatternMatching(query, matches) {
        // 检测查询中的典型违规模式
        const patterns = [
            { pattern: /本地.*?企业.*?优先/g, weight: 0.8 },
            { pattern: /按.*?纳税.*?奖励/g, weight: 0.9 },
            { pattern: /同等条件.*?优先/g, weight: 0.7 },
            { pattern: /迁入.*?奖励/g, weight: 0.8 },
            { pattern: /设立.*?分.*?公司/g, weight: 0.7 }
        ];

        patterns.forEach(({ pattern, weight }) => {
            if (pattern.test(query)) {
                // 找到使用相似模式的案例
                this.database.forEach(case_ => {
                    if (case_.originalText && pattern.test(case_.originalText)) {
                        const currentScore = matches.get(case_.id) || 0;
                        matches.set(case_.id, currentScore + weight);
                    }
                });
            }
        });
    }

    /**
     * 🔍 根据ID获取案例
     */
    getCaseById(caseId) {
        return this.database.find(case_ => case_.id === caseId);
    }

    /**
     * 💡 提取概念
     */
    extractConcepts(text) {
        const concepts = [];
        
        // 简化的概念提取
        const conceptPatterns = {
            '政府采购': /政府.*?采购|采购.*?政府/g,
            '财政奖励': /财政.*?奖励|奖励.*?财政|补贴/g,
            '本地企业': /本地.*?企业|当地.*?企业/g,
            '市场准入': /市场.*?准入|准入.*?市场/g,
            '地方保护': /地方.*?保护|保护.*?本地/g
        };

        Object.entries(conceptPatterns).forEach(([concept, pattern]) => {
            if (pattern.test(text)) {
                concepts.push(concept);
            }
        });

        return concepts;
    }

    /**
     * 📊 计算语义相似度
     */
    semanticSimilarity(text1, text2) {
        // 简化的相似度计算
        const words1 = text1.toLowerCase().split(/\W+/);
        const words2 = text2.toLowerCase().split(/\W+/);
        
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        
        return intersection.length / union.length;
    }

    /**
     * 📈 获取案例统计信息
     */
    getCaseStatistics() {
        const stats = {
            totalCases: this.database.length,
            categories: {},
            severityLevels: {},
            violationArticles: {},
            frequency: {}
        };

        this.database.forEach(case_ => {
            // 统计类别
            stats.categories[case_.category] = (stats.categories[case_.category] || 0) + 1;
            
            // 统计严重程度
            stats.severityLevels[case_.severity] = (stats.severityLevels[case_.severity] || 0) + 1;
            
            // 统计违规条款
            stats.violationArticles[case_.violationArticle] = (stats.violationArticles[case_.violationArticle] || 0) + 1;
            
            // 统计频率
            stats.frequency[case_.frequency] = (stats.frequency[case_.frequency] || 0) + 1;
        });

        return stats;
    }

    /**
     * 🎯 根据条款查找案例
     */
    findCasesByArticle(articleNumber, maxResults = 3) {
        return this.database
            .filter(case_ => case_.violationArticle === articleNumber)
            .slice(0, maxResults);
    }

    /**
     * 🔍 高级搜索
     */
    advancedSearch(criteria) {
        const {
            keywords = [],
            category = null,
            severity = null,
            violationArticle = null,
            frequency = null
        } = criteria;

        let results = [...this.database];

        // 应用过滤条件
        if (category) {
            results = results.filter(case_ => case_.category === category);
        }
        
        if (severity) {
            results = results.filter(case_ => case_.severity === severity);
        }
        
        if (violationArticle) {
            results = results.filter(case_ => case_.violationArticle === violationArticle);
        }
        
        if (frequency) {
            results = results.filter(case_ => case_.frequency === frequency);
        }

        // 关键词匹配
        if (keywords.length > 0) {
            results = results.filter(case_ => 
                keywords.some(keyword => 
                    case_.relatedKeywords.some(caseKeyword => 
                        caseKeyword.toLowerCase().includes(keyword.toLowerCase())
                    )
                )
            );
        }

        return results;
    }
}

// 创建全局案例匹配引擎
const globalCaseEngine = new CaseMatchingEngine();

/**
 * 🚀 便捷接口函数
 */

/**
 * 查找相似案例
 */
function findSimilarCases(query, options = {}) {
    return globalCaseEngine.findSimilarCases(query, options);
}

/**
 * 根据条款查找案例
 */
function getCasesByArticle(articleNumber, maxResults = 3) {
    return globalCaseEngine.findCasesByArticle(articleNumber, maxResults);
}

/**
 * 获取案例统计
 */
function getCaseStatistics() {
    return globalCaseEngine.getCaseStatistics();
}

/**
 * 高级案例搜索
 */
function searchCases(criteria) {
    return globalCaseEngine.advancedSearch(criteria);
}

/**
 * 获取所有案例
 */
function getAllCases() {
    return COMPREHENSIVE_CASE_DATABASE;
}

/**
 * 根据ID获取案例详情
 */
function getCaseById(caseId) {
    return globalCaseEngine.getCaseById(caseId);
}

module.exports = {
    // 案例数据
    COMPREHENSIVE_CASE_DATABASE,
    GOVERNMENT_PROCUREMENT_CASES,
    FISCAL_INCENTIVE_CASES,
    MARKET_ACCESS_CASES,
    GOODS_FLOW_CASES,
    
    // 匹配引擎
    CaseMatchingEngine,
    globalCaseEngine,
    
    // 便捷接口
    findSimilarCases,
    getCasesByArticle,
    getCaseStatistics,
    searchCases,
    getAllCases,
    getCaseById
};