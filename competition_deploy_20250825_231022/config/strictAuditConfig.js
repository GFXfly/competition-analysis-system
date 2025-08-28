/**
 * 严格审查模式配置
 * 大幅提高检测敏感性，发现所有可疑问题
 */

// 扩展的隐性违规检测关键词库
const EXTENDED_VIOLATION_KEYWORDS = {
    // 地方保护类 - 增加隐性表达
    local_protection: {
        direct: ['本地', '当地', '本区域', '本市', '本县', '本省', '区内', '市内', '省内'],
        implicit: [
            '注册地在', '工商登记地', '税务登记地', '法人住所地',
            '就近选择', '就地选择', '优先选择', '推荐选择',
            '符合条件的本地', '本地符合条件', '当地有能力',
            '本地化率', '本土化', '属地管理',
            '设立分支机构', '派驻办事处', '建立合作关系',
            '与当地企业合作', '本地合作伙伴', '当地代理商'
        ],
        financial: [
            '本地纳税', '当地纳税', '在本地缴税', '税收留成',
            '本地就业', '当地就业', '解决本地就业', '吸纳当地人员',
            '本地采购', '当地采购', '使用本地材料', '本地供应商'
        ]
    },

    // 市场准入限制类 - 更细致的表达
    market_access: {
        qualification: [
            '资质要求', '资格条件', '准入门槛', '准入标准',
            '必须具备', '应当具备', '需要具备', '要求具有',
            '不少于', '不低于', '达到', '满足', '符合',
            '注册资本', '净资产', '年营业额', '从业年限',
            '类似项目经验', '同类业绩', '以往业绩', '成功案例',
            '技术力量', '专业人员', '管理人员', '技术装备'
        ],
        restriction: [
            '限定', '限制', '禁止', '不得', '排除', '拒绝',
            '指定', '特定', '专门', '仅限', '只能', '必须',
            '独家', '专营', '垄断', '排他', '唯一',
            '名单制', '目录管理', '清单管理', '白名单', '黑名单'
        ]
    },

    // 财政优惠措施类 - 隐蔽的表达方式
    financial_incentives: {
        direct: [
            '奖励', '补贴', '扶持', '支持', '优惠', '减免',
            '返还', '退还', '给予', '发放', '拨付', '安排'
        ],
        indirect: [
            '政策支持', '资金支持', '金融支持', '信贷支持',
            '优先考虑', '重点支持', '倾斜支持', '特别支持',
            '享受政策', '适用政策', '执行标准', '参照执行',
            '可申请', '可享受', '有权获得', '符合条件的',
            '纳入范围', '列入计划', '优先安排', '重点保障'
        ],
        criteria: [
            '根据贡献', '按照规模', '依据业绩', '以贡献为准',
            '纳税额', '税收贡献', '财政贡献', '经济贡献',
            '产值规模', '营业收入', '销售额', '利税总额',
            '就业人数', '吸纳就业', '带动就业', '稳定就业',
            '投资规模', '投资强度', '固定资产投资', '新增投资'
        ]
    },

    // 政府采购偏向类 - 细微的倾向性表达
    procurement_bias: {
        preference: [
            '优先采购', '优先选用', '优先考虑', '重点采购',
            '推荐采购', '建议采购', '鼓励采购', '支持采购',
            '同等条件下', '同等质量下', '同等价格下',
            '价格相近时', '技术相当时', '条件相同时'
        ],
        scoring: [
            '加分', '额外得分', '奖励分', '附加分',
            '评分优势', '分数倾斜', '权重倾斜', '系数调整',
            '本地化得分', '属地化得分', '就近服务得分'
        ]
    },

    // 要素获取限制类 - 资源分配不公
    resource_allocation: {
        land: [
            '土地供应', '用地指标', '土地出让', '划拨用地',
            '优先供地', '优先安排', '重点保障', '优先考虑',
            '土地价格', '地价优惠', '出让底价', '分期付款'
        ],
        finance: [
            '融资便利', '贷款优惠', '利率优惠', '担保支持',
            '风险补偿', '贴息支持', '信用增级', '授信额度',
            '绿色通道', '快速审批', '简化程序', '优先办理'
        ]
    }
};

// 疑似违规表达模式 - 正则匹配
const SUSPICIOUS_PATTERNS = [
    // 地域倾向性表达
    /[本当地这该此][地区市县省州].*?(企业|公司|机构|组织|单位).*?(优先|倾斜|支持|扶持)/g,
    /优先.*?(本地|当地|本区域|区内|市内).*?(企业|供应商|服务商)/g,
    /(本地|当地|本区域).*?(企业|供应商).*?(优先|优势|便利|支持)/g,
    
    // 隐性准入限制
    /要求.*?(在.*?注册|设立.*?机构|建立.*?关系)/g,
    /需要.*?(本地|当地).*?(合作|参股|控股|代理)/g,
    /必须.*?(与.*?合作|聘用.*?人员|采购.*?产品)/g,
    
    // 财政优惠的条件性表达
    /根据.*?(纳税|贡献|规模|业绩).*?给予.*?(奖励|补贴|优惠)/g,
    /按.*?(产值|营收|税收|就业).*?标准.*?(补助|扶持|支持)/g,
    /以.*?(经济贡献|税收贡献|财政贡献).*?为.*?(依据|标准|条件)/g,
    
    // 政府采购倾向
    /同等条件.*?(优先|倾斜).*?(本地|当地)/g,
    /本地.*?(产品|服务|企业).*?加分.*?\d+/g,
    /当地.*?(供应商|承包商).*?(优势|优惠|便利)/g,
    
    // 排他性安排
    /(独家|专营|垄断|排他).*?(经营|代理|供应|服务)/g,
    /授予.*?(专门|特定|指定).*?(企业|机构).*?(权利|资格)/g,
    /委托.*?(特定|指定).*?(企业|机构).*?(独家|专门)/g,
    
    // 歧视性收费
    /外地.*?(企业|商品|服务).*?(收费|费用).*?(高于|超过|额外)/g,
    /非本地.*?(需要|应当|必须).*?(缴纳|支付).*?(费用|保证金)/g,
];

// 更严格的预判断阈值
const STRICT_THRESHOLDS = {
    // 关键词匹配阈值 - 降低到1个即触发
    keyword_match_threshold: 1,
    
    // 文本长度要求 - 降低最小长度
    min_text_length: 50,
    
    // 置信度阈值 - 降低审查门槛
    confidence_threshold: 0.3,
    
    // 正则匹配权重
    pattern_match_weight: 2.0,
    
    // 关键词匹配权重
    keyword_match_weight: 1.5,
    
    // AI判断权重
    ai_analysis_weight: 3.0
};

// 增强的风险评估算法
function calculateRiskScore(text) {
    let riskScore = 0;
    let reasons = [];
    
    // 1. 关键词匹配检查
    Object.entries(EXTENDED_VIOLATION_KEYWORDS).forEach(([category, keywords]) => {
        Object.entries(keywords).forEach(([type, wordList]) => {
            const matches = wordList.filter(keyword => text.includes(keyword));
            if (matches.length > 0) {
                const categoryScore = matches.length * STRICT_THRESHOLDS.keyword_match_weight;
                riskScore += categoryScore;
                reasons.push(`${category}类风险: 发现${matches.length}个相关关键词`);
            }
        });
    });
    
    // 2. 正则模式匹配检查
    let patternMatches = 0;
    SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
        const matches = text.match(pattern);
        if (matches) {
            patternMatches += matches.length;
            reasons.push(`疑似违规模式${index + 1}: 匹配${matches.length}次`);
        }
    });
    
    riskScore += patternMatches * STRICT_THRESHOLDS.pattern_match_weight;
    
    // 3. 文本敏感度分析
    const sensitiveTerms = ['优先', '倾斜', '限定', '指定', '排除', '专营', '独家'];
    const sensitiveCount = sensitiveTerms.filter(term => text.includes(term)).length;
    if (sensitiveCount > 0) {
        riskScore += sensitiveCount * 0.5;
        reasons.push(`敏感词汇分析: 发现${sensitiveCount}个敏感词汇`);
    }
    
    return {
        score: riskScore,
        reasons: reasons,
        needsReview: riskScore >= STRICT_THRESHOLDS.confidence_threshold,
        confidence: Math.min(riskScore / 10, 1.0)
    };
}

// 严格审查建议模板
const STRICT_SUGGESTIONS = {
    local_protection: [
        '立即删除所有地域性表述，确保全国市场统一开放',
        '建立统一的市场准入标准，禁止任何形式的地方保护',
        '对现有政策进行合规性重新评估，清除歧视性条款',
        '建立跨区域监督机制，防止地方保护主义回潮'
    ],
    
    market_access: [
        '全面审查准入条件的必要性和合理性，删除过度要求',
        '确保资质要求与经营能力直接相关，禁设无关门槛',
        '建立准入条件定期评估机制，防止标准异化',
        '公开透明所有准入程序，接受市场主体监督'
    ],
    
    financial_incentives: [
        '立即停止以经济贡献为标准的奖励政策',
        '建立基于创新能力、环保表现的客观评价体系',
        '确保财政政策对所有符合条件企业一视同仁',
        '建立财政政策公平竞争审查的前置程序'
    ]
};

module.exports = {
    EXTENDED_VIOLATION_KEYWORDS,
    SUSPICIOUS_PATTERNS,
    STRICT_THRESHOLDS,
    calculateRiskScore,
    STRICT_SUGGESTIONS
};