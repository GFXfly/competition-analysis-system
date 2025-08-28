/**
 * 测试AI审查响应和结果显示
 */
const DeepSeekService = require('./services/deepseekService');
require('dotenv').config();

console.log('=== 测试AI审查响应 ===');

async function testAIResponse() {
    try {
        const deepSeekService = new DeepSeekService();
        
        // 测试文本 - 明确包含公平竞争问题的内容
        const problemText = `
        关于促进本地企业发展的实施方案

        第一条 为支持本地经济发展，对本地注册企业给予以下优惠政策：
        1. 本地企业在政府采购中享有10%的价格优惠
        2. 外地企业不得参与本地重点项目招标
        3. 要求供应商必须在本地设立分支机构方可参与投标
        4. 限定使用本地生产的产品和服务

        第二条 税收优惠措施：
        1. 对本地企业减免营业税30%
        2. 外地企业需缴纳额外的市场准入费
        3. 本地企业可享受土地使用费减免

        第三条 市场准入限制：
        1. 特定行业只允许本地企业经营
        2. 外地企业进入需要额外的行政审批
        3. 设置歧视性的资质要求
        `;
        
        console.log('📝 测试文本：');
        console.log(problemText.trim());
        console.log('\n=== 开始详细审查测试 ===');
        
        // 测试详细审查API（非流式）
        console.log('🔍 测试详细审查API（非流式版本）...');
        const result = await deepSeekService.callDetailedReviewAPI(problemText);
        
        console.log('\n=== 审查结果分析 ===');
        console.log('✅ API调用成功');
        console.log('问题总数:', result.totalIssues);
        console.log('问题列表长度:', result.issues ? result.issues.length : 0);
        
        if (result.issues && result.issues.length > 0) {
            console.log('\n📋 发现的问题详情：');
            result.issues.forEach((issue, index) => {
                console.log(`\n问题 ${index + 1}:`);
                console.log(`  标题: ${issue.title || '未提供'}`);
                console.log(`  描述: ${issue.description || '未提供'}`);
                console.log(`  原文引用: ${issue.quote || '未提供'}`);
                console.log(`  违反条款: ${issue.violation || '未提供'}`);
                console.log(`  修改建议: ${issue.suggestion || '未提供'}`);
            });
        } else {
            console.log('\n⚠️ 未发现问题或问题格式不正确');
            console.log('原始响应（前1000字符）:');
            console.log(result.rawResponse ? result.rawResponse.substring(0, 1000) : '无原始响应');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误详情:', error.stack);
    }
}

// 运行测试
testAIResponse();