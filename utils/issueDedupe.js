/**
 * 问题去重工具
 * 针对同一处内容的多个违法条款，只保留最典型的一个，删除其他重复的
 */

// 条款重要性级别（数字越小越重要）
const ARTICLE_PRIORITY = {
    'article_11': 1, // 限定特定经营者 - 最直接
    'article_14': 1, // 强制本地投资/设立分支机构 - 最直接
    'article_15': 1, // 政府采购限制 - 最直接
    'article_19': 1, // 财政奖励补贴 - 最直接
    'article_13': 2, // 商品要素流动限制
    'article_16': 2, // 歧视性收费价格
    'article_18': 2, // 税收优惠
    'article_12': 3, // 歧视性准入退出条件 - 相对宽泛
    'article_17': 3, // 资质标准歧视
    'article_20': 3, // 其他成本优惠
    'article_21': 4, // 垄断行为
    'article_22': 4, // 政府定价
    'article_23': 4, // 价格干预
    'article_24': 5  // 其他限制竞争 - 最宽泛
};

/**
 * 检查两个问题是否属于同一处内容的重复问题
 */
function areIssuesDuplicate(issue1, issue2) {
    const quote1 = (issue1.quote || '').trim();
    const quote2 = (issue2.quote || '').trim();
    
    if (!quote1 || !quote2) return false;
    
    // 1. 引用的原文完全相同或高度重叠
    if (quote1 === quote2) {
        console.log(`🔍 发现完全重复的引用: "${quote1}"`);
        return true;
    }
    
    // 2. 引用内容有70%以上重叠
    const overlap = calculateTextOverlap(quote1, quote2);
    if (overlap > 0.7) {
        console.log(`🔍 发现高度重叠的引用 (${(overlap * 100).toFixed(1)}%): "${quote1}" vs "${quote2}"`);
        return true;
    }
    
    // 3. 检查是否都针对同一具体内容（如都包含相同的核心词汇）
    const coreTerms1 = extractCoreTerms(quote1);
    const coreTerms2 = extractCoreTerms(quote2);
    const commonTerms = coreTerms1.filter(term => coreTerms2.includes(term));
    
    if (commonTerms.length >= 2) {
        console.log(`🔍 发现相同核心内容: [${commonTerms.join(', ')}]`);
        return true;
    }
    
    return false;
}

/**
 * 计算两个文本的重叠度
 */
function calculateTextOverlap(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const chars1 = text1.split('');
    const chars2 = text2.split('');
    const shorter = chars1.length < chars2.length ? chars1 : chars2;
    const longer = chars1.length >= chars2.length ? chars1 : chars2;
    
    let matchCount = 0;
    for (const char of shorter) {
        if (longer.includes(char)) {
            matchCount++;
        }
    }
    
    return matchCount / shorter.length;
}

/**
 * 提取文本的核心词汇
 */
function extractCoreTerms(text) {
    // 提取关键词汇
    const keywords = [
        '注册', '设立', '分支机构', '本地', '当地', '村集体', '股份',
        '政府采购', '招标', '投标', '优先', '奖励', '补贴', '财政',
        '税收', '减免', '优惠', '歧视', '限制', '排除', '强制'
    ];
    
    return keywords.filter(keyword => text.includes(keyword));
}

/**
 * 获取条款的重要性优先级
 */
function getArticlePriority(violation) {
    if (!violation) return 999;
    
    // 从violation文本中提取条款编号
    for (const [articleKey, priority] of Object.entries(ARTICLE_PRIORITY)) {
        const articleNumber = articleKey.replace('article_', '');
        const patterns = [
            `第${articleNumber}条`,
            `第十${articleNumber}条`,
            `第二十${articleNumber}条`,
        ];
        
        // 处理中文数字
        const chineseNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
        if (articleNumber <= 10) {
            patterns.push(`第${chineseNumbers[articleNumber]}条`);
        } else if (articleNumber <= 25) {
            const tens = Math.floor(articleNumber / 10);
            const ones = articleNumber % 10;
            if (tens === 1) {
                patterns.push(`第十${ones > 0 ? chineseNumbers[ones] : ''}条`);
            } else if (tens === 2) {
                patterns.push(`第二十${ones > 0 ? chineseNumbers[ones] : ''}条`);
            }
        }
        
        if (patterns.some(pattern => violation.includes(pattern))) {
            return priority;
        }
    }
    
    return 999; // 未知条款，优先级最低
}

/**
 * 选择最重要的问题（优先级最高的）
 */
function selectMostImportantIssue(issues) {
    if (issues.length <= 1) return issues[0];
    
    let mostImportant = issues[0];
    let highestPriority = getArticlePriority(mostImportant.violation);
    
    for (let i = 1; i < issues.length; i++) {
        const currentPriority = getArticlePriority(issues[i].violation);
        if (currentPriority < highestPriority) {
            highestPriority = currentPriority;
            mostImportant = issues[i];
        }
    }
    
    console.log(`📌 选择最重要的条款: ${mostImportant.title} (优先级: ${highestPriority})`);
    return mostImportant;
}

/**
 * 主要的问题去重处理函数
 */
function deduplicateIssues(issues) {
    if (!issues || issues.length <= 1) return issues;
    
    console.log(`🔍 开始问题去重，原始问题数: ${issues.length}`);
    
    const groups = [];
    const processed = new Set();
    
    // 将相似问题分组
    for (let i = 0; i < issues.length; i++) {
        if (processed.has(i)) continue;
        
        const currentGroup = [issues[i]];
        processed.add(i);
        
        // 查找与当前问题重复的其他问题
        for (let j = i + 1; j < issues.length; j++) {
            if (processed.has(j)) continue;
            
            if (areIssuesDuplicate(issues[i], issues[j])) {
                currentGroup.push(issues[j]);
                processed.add(j);
                console.log(`❌ 删除重复问题: ${issues[j].title}`);
            }
        }
        
        groups.push(currentGroup);
    }
    
    // 从每组中选择最重要的问题
    const deduped = groups.map(group => selectMostImportantIssue(group));
    
    // 重新分配ID
    deduped.forEach((issue, index) => {
        issue.id = index + 1;
    });
    
    console.log(`✅ 问题去重完成: ${issues.length} 个原始问题 -> ${deduped.length} 个最终问题`);
    
    return deduped;
}

module.exports = {
    deduplicateIssues,
    areIssuesDuplicate,
    selectMostImportantIssue
};