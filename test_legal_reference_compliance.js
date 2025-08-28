/**
 * 测试法律引用合规性
 * 验证所有提示词都正确使用《公平竞争审查条例实施办法》
 */

const { createStrictReviewPrompt } = require('./services/strictReviewService');
const { createDetailedReviewPrompt } = require('./services/optimizedPromptService');

console.log('🏛️  法律引用合规性测试');
console.log('=' .repeat(60));

// 测试文本
const testText = "对本地企业给予税收优惠，外地企业需额外缴费";

console.log('\n📋 测试各服务的提示词法律引用...\n');

// 测试1: 严格审查服务
console.log('1️⃣ 严格审查服务提示词检查:');
const strictPrompt = createStrictReviewPrompt(testText);
const hasProhibition1 = strictPrompt.includes('禁止引用《反垄断法》');
const hasFairCompetition1 = strictPrompt.includes('公平竞争审查条例实施办法');
const hasProperFormat1 = strictPrompt.includes('违反《公平竞争审查条例实施办法》第X条');

console.log(`  ✅ 包含实施办法引用: ${hasFairCompetition1}`);
console.log(`  ✅ 包含禁止反垄断法引用: ${hasProhibition1}`);
console.log(`  ✅ 包含正确格式要求: ${hasProperFormat1}`);
console.log(`  📊 合规性: ${hasProhibition1 && hasFairCompetition1 && hasProperFormat1 ? '✅ 通过' : '❌ 不通过'}\n`);

// 测试2: 优化提示服务
console.log('2️⃣ 优化提示服务提示词检查:');
const detailedPrompt = createDetailedReviewPrompt(testText);
const hasProhibition2 = detailedPrompt.includes('严禁引用《反垄断法》');
const hasFairCompetition2 = detailedPrompt.includes('公平竞争审查条例实施办法');
const hasProperFormat2 = detailedPrompt.includes('违反《公平竞争审查条例实施办法》第八条');

console.log(`  ✅ 包含实施办法引用: ${hasFairCompetition2}`);
console.log(`  ✅ 包含禁止反垄断法引用: ${hasProhibition2}`);
console.log(`  ✅ 包含正确格式示例: ${hasProperFormat2}`);
console.log(`  📊 合规性: ${hasProhibition2 && hasFairCompetition2 ? '✅ 通过' : '❌ 不通过'}\n`);

// 综合评估
const strictCompliant = hasProhibition1 && hasFairCompetition1 && hasProperFormat1;
const detailedCompliant = hasProhibition2 && hasFairCompetition2;
const allServicesCompliant = strictCompliant && detailedCompliant;

console.log('🎯 综合合规性评估:');
console.log('=' .repeat(30));
console.log(`总体状态: ${allServicesCompliant ? '✅ 全部合规' : '❌ 存在问题'}`);
console.log(`严格审查: ${strictCompliant ? '✅' : '❌'}`);
console.log(`优化提示: ${detailedCompliant ? '✅' : '❌'}`);

if (allServicesCompliant) {
    console.log('\n🎉 所有服务的提示词都已正确配置使用《公平竞争审查条例实施办法》！');
} else {
    console.log('\n⚠️ 发现问题，需要进一步修正提示词中的法律引用。');
}

console.log('\n📝 测试完成 - ' + new Date().toISOString());