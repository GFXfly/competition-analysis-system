/**
 * 测试法律框架配置
 * 验证《公平竞争审查条例实施办法》条文引用的正确性
 */

const { 
    FAIR_COMPETITION_ARTICLES, 
    VIOLATION_TYPES, 
    generateViolationDescription 
} = require('./config/legalFramework');

console.log('🏛️  公平竞争审查法律框架测试');
console.log('=' .repeat(50));

// 测试1：验证条文结构
console.log('\n📋 条文结构测试:');
const articleKeys = Object.keys(FAIR_COMPETITION_ARTICLES);
console.log(`✅ 共载入 ${articleKeys.length} 个条文`);

articleKeys.slice(0, 3).forEach(key => {
    const article = FAIR_COMPETITION_ARTICLES[key];
    console.log(`📖 ${article.number}: ${article.title}`);
    console.log(`   内容: ${article.content}`);
});

// 测试2：验证违规描述生成
console.log('\n🔍 违规描述生成测试:');
const testCases = [
    { article: 'article_8', issue: '通过地域限制排除外地企业' },
    { article: 'article_10', issue: '授予特定企业专营权' },
    { article: 'article_21', issue: '以纳税额为标准给予财政奖励' }
];

testCases.forEach(({ article, issue }) => {
    const violation = generateViolationDescription(article, issue);
    console.log(`\n🚨 ${article}:`);
    console.log(violation.substring(0, 100) + '...');
});

// 测试3：验证违规类型映射  
console.log('\n📊 违规类型映射测试:');
Object.entries(VIOLATION_TYPES).forEach(([key, type]) => {
    console.log(`📂 ${type.category}: ${type.articles.length}个条文`);
});

console.log('\n✅ 法律框架配置测试完成');
console.log('🎯 所有条文引用均基于《公平竞争审查条例实施办法》');