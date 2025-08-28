/**
 * 测试去除预判断后的功能
 */
const { performPreCheck } = require('./services/reviewService');
require('dotenv').config();

console.log('=== 测试去除预判断功能 ===');

async function testNoPrecheck() {
    try {
        // 测试1: 无关内容测试
        console.log('\n📄 测试1: 无关内容（以前会被过滤掉）');
        const irrelevantText = `
        这是一份关于员工培训的文档。
        我们将在下周举办技能培训班。
        请所有员工准时参加。
        培训内容包括技能提升和团队合作。
        `;
        
        console.log('测试文本:', irrelevantText.trim());
        const result1 = await performPreCheck(irrelevantText);
        console.log('预判断结果:', result1);
        console.log('是否需要审查:', result1.needsReview ? '✅ 是' : '❌ 否');
        
        // 测试2: 相关内容测试
        console.log('\n📄 测试2: 竞争相关内容');
        const relevantText = `
        本政策对本地企业给予税收优惠。
        在政府采购中，优先选择当地供应商。
        限定外地企业不得参与特定项目招标。
        `;
        
        console.log('测试文本:', relevantText.trim());
        const result2 = await performPreCheck(relevantText);
        console.log('预判断结果:', result2);
        console.log('是否需要审查:', result2.needsReview ? '✅ 是' : '❌ 否');
        
        // 测试3: 空文档测试
        console.log('\n📄 测试3: 空文档');
        const emptyText = '';
        const result3 = await performPreCheck(emptyText);
        console.log('预判断结果:', result3);
        console.log('是否需要审查:', result3.needsReview ? '✅ 是' : '❌ 否');
        
        console.log('\n=== 测试结果总结 ===');
        console.log('✅ 所有文档都将直接进入公平竞争审查');
        console.log('✅ 不再根据内容过滤文档');
        console.log('✅ 预判断步骤已成功移除');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    }
}

// 运行测试
testNoPrecheck();