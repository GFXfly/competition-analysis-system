/**
 * 公平竞争审查法律框架配置
 * 基于《公平竞争审查条例实施办法》（国家市场监督管理总局2025年2月28日公布）
 */

// 核心法规条款
const FAIR_COMPETITION_ARTICLES = {
    // 第二章 审查标准和重点 第二节 具体审查标准
    
    // 市场准入和退出限制类 (第8-14条)
    article_8: {
        number: "第八条",
        title: "限定特定经营者",
        content: "不得限定经营、购买、使用特定经营者提供的商品和服务",
        details: "政策措施不得通过设置歧视性资质要求、评审标准或者不依法发布信息等方式，限定或者变相限定特定经营者参与市场活动"
    },
    
    article_9: {
        number: "第九条", 
        title: "限定特定区域注册登记",
        content: "不得限定经营者应当在特定区域注册登记",
        details: "包括但不限于限定在本地注册、设立分支机构、缴纳税收等条件"
    },
    
    article_10: {
        number: "第十条",
        title: "授予专营权利",
        content: "不得授予特定经营者专营权利或者排他性权利", 
        details: "除法律、行政法规明确规定外，不得授予特定经营者在特定区域、特定行业的专营权、独占权等排他性权利"
    },
    
    article_11: {
        number: "第十一条",
        title: "限定特定区域投资",
        content: "不得限定经营者应当在特定区域投资",
        details: "不得通过政策措施限制或排除其他区域经营者的投资行为"
    },
    
    article_12: {
        number: "第十二条", 
        title: "设立分支机构限制",
        content: "不得限定经营者在特定区域设立分支机构",
        details: "不得对外地经营者设立分支机构设置歧视性条件"
    },
    
    article_13: {
        number: "第十三条",
        title: "生产经营场所限制", 
        content: "不得限定经营者应当在特定区域生产经营",
        details: "不得通过政策措施限制经营者自主选择生产经营场所"
    },
    
    article_14: {
        number: "第十四条",
        title: "歧视性准入退出条件",
        content: "不得设置其他不合理或者歧视性的准入和退出条件",
        details: "包括设置明显超出实际需要的资质资格要求、与经营能力无关的条件、对外地经营者的歧视性要求等"
    },

    // 商品和要素流动障碍类 (第15-20条) 
    article_15: {
        number: "第十五条",
        title: "商品流动限制",
        content: "不得对外地商品设定歧视性收费项目、收费标准",
        details: "不得通过增加检验、检疫、检测、认证、审批等环节，提高收费标准等方式设置贸易壁垒"
    },
    
    article_16: {
        number: "第十六条", 
        title: "运输限制",
        content: "不得限定外地商品、服务的运输方式",
        details: "不得指定运输企业或者运输路线，不得对运输设置歧视性条件"
    },
    
    article_17: {
        number: "第十七条",
        title: "销售限制", 
        content: "不得设置专门针对外地商品、服务的专项检查",
        details: "不得通过专项检查等方式限制外地商品和服务的销售"
    },
    
    article_18: {
        number: "第十八条",
        title: "要素流动限制",
        content: "不得限制外地经营者参与本地招标投标活动",
        details: "不得通过设置注册地、纳税地等条件限制外地经营者参与招标投标"
    },
    
    article_19: {
        number: "第十九条",
        title: "政府采购歧视",
        content: "不得限制外地经营者参与本地政府采购活动", 
        details: "不得在政府采购中对外地经营者设置歧视性条件"
    },
    
    article_20: {
        number: "第二十条",
        title: "其他流动障碍",
        content: "不得设置其他阻碍商品和要素自由流动的措施",
        details: "包括但不限于设置地方标准、技术要求等形成的贸易壁垒"
    },

    // 影响生产经营成本类 (第21-23条)
    article_21: {
        number: "第二十一条", 
        title: "歧视性收费",
        content: "不得违法给予特定经营者财政奖励和补贴",
        details: "不得通过财政资金给予特定经营者优惠，造成不公平竞争"
    },
    
    article_22: {
        number: "第二十二条",
        title: "违法减免税收", 
        content: "不得违法减免特定经营者税收",
        details: "不得超越法定权限给予特定经营者税收优惠"
    },
    
    article_23: {
        number: "第二十三条",
        title: "违法提供土地",
        content: "不得违法以划拨方式提供土地，或者违法确定土地出让底价",
        details: "不得通过土地政策给予特定经营者不当优势"
    },

    // 影响生产经营行为类 (第24-25条)
    article_24: {
        number: "第二十四条",
        title: "强制交易行为", 
        content: "不得强制或者变相强制经营者从事特定的经营、投资、建设行为",
        details: "不得通过行政手段干预经营者的正常经营决策"
    },
    
    article_25: {
        number: "第二十五条",
        title: "违法给予贷款贴息",
        content: "不得违法给予特定经营者贷款贴息等金融优惠",
        details: "不得通过金融政策给予特定经营者不当竞争优势"
    }
};

// 违规行为类型映射
const VIOLATION_TYPES = {
    MARKET_ACCESS: {
        category: "市场准入和退出限制",
        articles: ["article_8", "article_9", "article_10", "article_11", "article_12", "article_13", "article_14"],
        description: "限制或排除经营者进入或退出相关市场"
    },
    
    GOODS_FLOW: {
        category: "商品和要素流动障碍", 
        articles: ["article_15", "article_16", "article_17", "article_18", "article_19", "article_20"],
        description: "阻碍商品和生产要素自由流动"
    },
    
    COST_IMPACT: {
        category: "影响生产经营成本",
        articles: ["article_21", "article_22", "article_23"],
        description: "违法给予特定经营者成本优势"
    },
    
    BEHAVIOR_CONTROL: {
        category: "影响生产经营行为",
        articles: ["article_24", "article_25"], 
        description: "不当干预经营者生产经营行为"
    }
};

// 生成标准化违规描述
function generateViolationDescription(articleKey, specificIssue = "") {
    const article = FAIR_COMPETITION_ARTICLES[articleKey];
    if (!article) return "违反《公平竞争审查条例实施办法》相关条款";
    
    return `违反《公平竞争审查条例实施办法》${article.number}：
【具体条款】${article.content}
【条款详情】${article.details}
【法律依据】《公平竞争审查条例实施办法》${article.number}${specificIssue ? '\n【具体问题】' + specificIssue : ''}`;
}

// 根据违规类型获取对应建议
function getSuggestionsByType(violationType) {
    return SUGGESTION_TEMPLATES[violationType] || [];
}

// 获取所有可用的条款列表
function getAllArticles() {
    return Object.keys(FAIR_COMPETITION_ARTICLES).map(key => ({
        key,
        ...FAIR_COMPETITION_ARTICLES[key]
    }));
}

// 根据关键词搜索相关条款
function searchArticlesByKeyword(keyword) {
    const results = [];
    Object.entries(FAIR_COMPETITION_ARTICLES).forEach(([key, article]) => {
        if (article.content.includes(keyword) || 
            article.title.includes(keyword) || 
            article.details.includes(keyword)) {
            results.push({ key, ...article });
        }
    });
    return results;
}

// 获取相关建议模板
const SUGGESTION_TEMPLATES = {
    market_access: [
        "删除地域性限制表述，确保所有符合条件的经营者都能公平参与",
        "建立统一的资质标准，不得设置歧视性门槛",
        "公开准入程序和标准，接受社会监督",
        "定期评估准入条件的必要性和合理性"
    ],
    
    goods_flow: [
        "取消针对外地商品和服务的歧视性收费",
        "简化跨区域商品流通手续，降低流通成本",
        "统一检验检测标准，避免重复检验",
        "建立商品和要素自由流动的监督机制"
    ],
    
    cost_impact: [
        "审查财政奖励和补贴政策的公平性",
        "确保税收优惠政策符合法律法规要求",
        "建立公平透明的土地使用政策",
        "避免通过成本优势扭曲市场竞争"
    ],
    
    behavior_control: [
        "尊重经营者的经营自主权",
        "减少对正常经营活动的行政干预",
        "建立公平的金融支持政策",
        "完善政策实施的监督制约机制"
    ]
};

module.exports = {
    FAIR_COMPETITION_ARTICLES,
    VIOLATION_TYPES, 
    generateViolationDescription,
    SUGGESTION_TEMPLATES,
    getSuggestionsByType,
    getAllArticles,
    searchArticlesByKeyword
};