/**
 * 问题合并工具
 * 用于合并同一问题点的多个违法条款，避免重复列举
 */

// 问题相似度判断规则
const SIMILARITY_RULES = {
    // 本地注册/投资相关问题
    LOCAL_REGISTRATION: {
        keywords: ['本地', '注册', '设立', '分支机构', '投资', '当地'],
        articles: ['article_12', 'article_14', 'article_15'],
        mergeTitle: '本地注册和投资限制问题'
    },
    
    // 政府采购/招标相关问题
    PROCUREMENT: {
        keywords: ['政府采购', '招标', '投标', '优先', '采购'],
        articles: ['article_15'],
        mergeTitle: '政府采购招标限制问题'
    },
    
    // 财政奖励/补贴相关问题
    FISCAL_INCENTIVES: {
        keywords: ['奖励', '补贴', '财政', '资金', '专项', '支持'],
        articles: ['article_19', 'article_20'],
        mergeTitle: '财政奖励补贴问题'
    },
    
    // 商品流动相关问题
    GOODS_FLOW: {
        keywords: ['外地', '商品', '收费', '价格', '歧视', '流动'],
        articles: ['article_13', 'article_16', 'article_17'],
        mergeTitle: '商品要素流动限制问题'
    },
    
    // 税收优惠相关问题
    TAX_BENEFITS: {
        keywords: ['税收', '减免', '优惠', '税款'],
        articles: ['article_18'],
        mergeTitle: '税收优惠问题'
    }
};

/**
 * 检查两个问题是否相似（属于同一问题点）
 */
function areIssuesSimilar(issue1, issue2) {
    // 1. 检查引用的原文是否重叠
    const quote1 = issue1.quote || '';
    const quote2 = issue2.quote || '';
    
    if (quote1 && quote2) {
        // 如果两个问题引用的原文有30%以上重叠，认为是同一问题点
        const overlap = calculateTextOverlap(quote1, quote2);
        if (overlap > 0.3) {
            console.log(`📍 发现引用重叠: ${overlap.toFixed(2)} - "${quote1}" vs "${quote2}"`);
            return true;
        }
    }
    
    // 2. 检查是否属于同一类型问题
    for (const [type, rule] of Object.entries(SIMILARITY_RULES)) {
        const issue1MatchesRule = rule.keywords.some(keyword => 
            (issue1.title || '').includes(keyword) || 
            (issue1.description || '').includes(keyword) ||
            (issue1.quote || '').includes(keyword)
        );
        
        const issue2MatchesRule = rule.keywords.some(keyword => 
            (issue2.title || '').includes(keyword) || 
            (issue2.description || '').includes(keyword) ||
            (issue2.quote || '').includes(keyword)
        );
        
        if (issue1MatchesRule && issue2MatchesRule) {
            console.log(`📍 发现同类问题 (${type}): "${issue1.title}" vs "${issue2.title}"`);
            return true;
        }
    }
    
    // 3. 检查是否都与"注册"相关（特殊处理）
    const registrationKeywords = ['注册', '设立', '本地', '当地', '股份', '村集体'];
    const issue1HasRegistration = registrationKeywords.some(keyword => 
        (issue1.title + issue1.description + issue1.quote).includes(keyword)
    );
    const issue2HasRegistration = registrationKeywords.some(keyword => 
        (issue2.title + issue2.description + issue2.quote).includes(keyword)
    );
    
    if (issue1HasRegistration && issue2HasRegistration) {
        console.log(`📍 发现注册相关问题: "${issue1.title}" vs "${issue2.title}"`);
        return true;
    }
    
    return false;
}

/**
 * 计算两个文本的重叠度
 */
function calculateTextOverlap(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const shorter = text1.length < text2.length ? text1 : text2;
    const longer = text1.length >= text2.length ? text1 : text2;
    
    let maxOverlap = 0;
    const minLength = Math.min(10, shorter.length); // 至少10个字符才算重叠
    
    for (let i = 0; i <= shorter.length - minLength; i++) {
        const substring = shorter.substring(i, i + minLength);
        if (longer.includes(substring)) {
            maxOverlap = Math.max(maxOverlap, minLength);
        }
    }
    
    return maxOverlap / shorter.length;
}

/**
 * 合并两个相似的问题
 */
function mergeIssues(issue1, issue2) {
    // 确定合并后的标题
    let mergedTitle = issue1.title;
    for (const [type, rule] of Object.entries(SIMILARITY_RULES)) {
        if (rule.keywords.some(keyword => 
            issue1.title.includes(keyword) || issue2.title.includes(keyword)
        )) {
            mergedTitle = rule.mergeTitle;
            break;
        }
    }
    
    // 合并描述
    const mergedDescription = `${issue1.description} 同时，${issue2.description}`;
    
    // 合并原文引用（去重）
    const quotes = [issue1.quote, issue2.quote].filter(q => q && q.trim());
    const uniqueQuotes = [...new Set(quotes)];
    const mergedQuote = uniqueQuotes.join('；');
    
    // 合并违法条款（提取主要条款）
    const mergedViolation = mergeViolations(issue1.violation, issue2.violation);
    
    // 合并建议
    const suggestions1 = (issue1.suggestion || '').split(/\d+\./).filter(s => s.trim());
    const suggestions2 = (issue2.suggestion || '').split(/\d+\./).filter(s => s.trim());
    const allSuggestions = [...suggestions1, ...suggestions2].filter(s => s.trim());
    const uniqueSuggestions = [...new Set(allSuggestions.map(s => s.trim()))];
    const mergedSuggestion = uniqueSuggestions.map((s, i) => `${i + 1}. ${s}`).join(' ');
    
    return {
        id: issue1.id,
        title: mergedTitle,
        description: mergedDescription,
        quote: mergedQuote,
        violation: mergedViolation,
        suggestion: mergedSuggestion
    };
}

/**
 * 合并违法条款描述，提取最重要的1-2个条款
 */
function mergeViolations(violation1, violation2) {
    if (!violation1) return violation2;
    if (!violation2) return violation1;
    
    // 提取条款编号
    const articles1 = extractArticleNumbers(violation1);
    const articles2 = extractArticleNumbers(violation2);
    
    // 合并去重
    const allArticles = [...new Set([...articles1, ...articles2])];
    
    // 选择最重要的1-2个条款
    const mainArticles = allArticles.slice(0, 2);
    
    if (mainArticles.length === 1) {
        // 只有一个主要条款，返回较完整的描述
        return violation1.length > violation2.length ? violation1 : violation2;
    } else {
        // 多个条款，创建合并描述
        const articleList = mainArticles.join('条和第');
        return `违反《公平竞争审查条例实施办法》第${articleList}条：这些条款共同禁止通过设置歧视性条件排斥或限制经营者公平参与市场竞争。`;
    }
}

/**
 * 从违法条款描述中提取条款编号
 */
function extractArticleNumbers(violation) {
    const matches = violation.match(/第([一二三四五六七八九十\d]+)条/g);
    if (!matches) return [];
    
    return matches.map(match => {
        const numberStr = match.replace(/第|条/g, '');
        return convertChineseNumber(numberStr);
    }).filter(num => num);
}

/**
 * 转换中文数字为阿拉伯数字
 */
function convertChineseNumber(chinese) {
    const chineseNumbers = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
        '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
        '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
        '二十一': 21, '二十二': 22, '二十三': 23, '二十四': 24, '二十五': 25
    };
    
    return chineseNumbers[chinese] || parseInt(chinese) || null;
}

/**
 * 主要的问题合并处理函数
 */
function mergeRelatedIssues(issues) {
    if (!issues || issues.length <= 1) return issues;
    
    const merged = [];
    const processed = new Set();
    
    for (let i = 0; i < issues.length; i++) {
        if (processed.has(i)) continue;
        
        let currentIssue = issues[i];
        processed.add(i);
        
        // 查找与当前问题相似的其他问题
        for (let j = i + 1; j < issues.length; j++) {
            if (processed.has(j)) continue;
            
            if (areIssuesSimilar(currentIssue, issues[j])) {
                // 合并问题
                currentIssue = mergeIssues(currentIssue, issues[j]);
                processed.add(j);
                console.log(`🔗 合并相似问题: ${issues[i].title} + ${issues[j].title}`);
            }
        }
        
        merged.push(currentIssue);
    }
    
    // 重新分配ID
    merged.forEach((issue, index) => {
        issue.id = index + 1;
    });
    
    console.log(`📊 问题合并结果: ${issues.length} 个原始问题 -> ${merged.length} 个合并后问题`);
    
    return merged;
}

module.exports = {
    mergeRelatedIssues,
    areIssuesSimilar,
    mergeIssues
};