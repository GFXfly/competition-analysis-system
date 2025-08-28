/**
 * DeepSeek V3.1 集成测试脚本
 */
const DeepSeekService = require('./services/deepseekService');
require('dotenv').config();

console.log('=== DeepSeek V3.1 集成测试开始 ===');

async function testDeepSeekIntegration() {
    try {
        // 检查环境变量
        console.log('📋 检查环境配置...');
        console.log('DEEPSEEK_API_KEY 配置:', process.env.DEEPSEEK_API_KEY ? '✅ 已配置' : '❌ 未配置');
        console.log('SILICONFLOW_API_KEY 配置:', process.env.SILICONFLOW_API_KEY ? '✅ 已配置 (作为备用)' : '❌ 未配置');
        
        if (!process.env.DEEPSEEK_API_KEY && !process.env.SILICONFLOW_API_KEY) {
            console.error('❌ 没有找到任何API密钥配置！');
            return;
        }
        
        // 初始化服务
        const deepSeekService = new DeepSeekService();
        
        // 测试文本
        const testText = `
        本政策旨在促进本地企业发展，对于本地注册的企业给予优先采购政策。
        在政府采购活动中，要求供应商必须为本地企业，外地企业不得参与。
        对于符合条件的当地供应商，将给予10%的价格优惠。
        `;
        
        console.log('\n📝 测试文本:');
        console.log(testText.trim());
        
        // 测试1: API连接测试
        console.log('\n🧪 测试1: API连接测试');
        try {
            const connectionResult = await deepSeekService.testConnection(testText);
            console.log('✅ API连接测试成功');
            console.log(`响应时间: ${connectionResult.responseTime}`);
            console.log(`使用模型: ${connectionResult.model}`);
            console.log('测试结果:', connectionResult.testResult);
        } catch (error) {
            console.error('❌ API连接测试失败:', error.message);
        }
        
        // 测试2: 预判断功能
        console.log('\n🔍 测试2: 预判断功能 (deepseek-chat)');
        try {
            const preCheckResult = await deepSeekService.callPreCheckAPI(testText);
            console.log('✅ 预判断测试成功');
            console.log('结果:', preCheckResult);
        } catch (error) {
            console.error('❌ 预判断测试失败:', error.message);
        }
        
        // 测试3: 详细审查功能
        console.log('\n📊 测试3: 详细审查功能 (deepseek-reasoner)');
        try {
            const detailedResult = await deepSeekService.callDetailedReviewAPI(testText);
            console.log('✅ 详细审查测试成功');
            console.log(`发现问题数量: ${detailedResult.totalIssues}`);
            console.log('问题详情:');
            detailedResult.issues.forEach((issue, index) => {
                console.log(`  问题${index + 1}: ${issue.title}`);
                console.log(`    描述: ${issue.description}`);
                if (issue.suggestion) {
                    console.log(`    建议: ${issue.suggestion.substring(0, 100)}...`);
                }
            });
        } catch (error) {
            console.error('❌ 详细审查测试失败:', error.message);
        }
        
        console.log('\n=== DeepSeek V3.1 集成测试完成 ===');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
testDeepSeekIntegration();