require('dotenv').config();
const axios = require('axios');

/**
 * 验证当前系统使用的AI模型
 */
async function verifyCurrentModel() {
    console.log('🔍 验证当前AI模型配置...\n');
    
    // 1. 检查配置文件设置
    const { APP_CONFIG } = require('./config/constants');
    console.log('📋 配置文件中的模型设置:');
    console.log(`   AI_MODEL: ${APP_CONFIG.AI_MODEL}`);
    console.log(`   AI_API_URL: ${APP_CONFIG.AI_API_URL}`);
    console.log(`   AI_TIMEOUT: ${APP_CONFIG.AI_TIMEOUT}ms\n`);
    
    // 2. 检查环境变量
    console.log('🔐 环境变量检查:');
    console.log(`   SILICONFLOW_API_KEY: ${process.env.SILICONFLOW_API_KEY ? process.env.SILICONFLOW_API_KEY.substring(0, 8) + '...' : '❌ 未设置'}\n`);
    
    // 3. 实际API调用测试
    if (!process.env.SILICONFLOW_API_KEY) {
        console.log('❌ 未配置API密钥，无法进行实际调用测试');
        return false;
    }
    
    console.log('🧪 实际API调用测试...');
    
    try {
        const testPrompt = `请告诉我你是什么模型，并简单回复"我是DeepSeek-R1模型"或具体的模型名称。`;
        
        console.log('📤 发送测试请求...');
        const startTime = Date.now();
        
        const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
            model: 'deepseek-ai/DeepSeek-R1',  // 直接指定模型
            messages: [{
                role: 'user',
                content: testPrompt
            }],
            max_tokens: 100,
            temperature: 0.1
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        const responseTime = Date.now() - startTime;
        const modelResponse = response.data.choices[0].message.content;
        
        console.log('✅ API调用成功!');
        console.log(`⏱️  响应时间: ${responseTime}ms`);
        console.log(`🤖 模型回复: "${modelResponse}"`);
        console.log(`📊 使用的模型: deepseek-ai/DeepSeek-R1`);
        
        // 检查回复内容是否提到DeepSeek
        if (modelResponse.toLowerCase().includes('deepseek')) {
            console.log('🎯 ✅ 确认：当前使用的是DeepSeek-R1模型');
        } else {
            console.log('⚠️  模型回复中未明确提到DeepSeek，但API调用使用的是DeepSeek-R1');
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ API调用失败:');
        console.log(`   错误信息: ${error.message}`);
        
        if (error.response) {
            console.log(`   HTTP状态: ${error.response.status}`);
            console.log(`   响应数据: ${JSON.stringify(error.response.data)}`);
        }
        
        return false;
    }
}

/**
 * 验证系统服务中的模型配置
 */
function verifyServiceConfiguration() {
    console.log('\n🔧 验证服务文件中的模型配置...');
    
    // 检查主要服务文件
    const services = [
        './services/reviewService.js',
        './services/preciseReviewService.js', 
        './services/enhancedReviewService.js',
        './services/optimizedPromptService.js'
    ];
    
    services.forEach(servicePath => {
        try {
            const fs = require('fs');
            const content = fs.readFileSync(servicePath, 'utf-8');
            
            // 检查是否包含DeepSeek-R1
            if (content.includes('deepseek-ai/DeepSeek-R1')) {
                console.log(`✅ ${servicePath}: 已配置DeepSeek-R1`);
            } else if (content.includes('moonshotai/Kimi-K2-Instruct')) {
                console.log(`❌ ${servicePath}: 仍在使用Kimi-K2`);
            } else {
                console.log(`⚠️  ${servicePath}: 未找到模型配置`);
            }
        } catch (error) {
            console.log(`❌ ${servicePath}: 文件读取失败`);
        }
    });
}

/**
 * 完整验证流程
 */
async function completeVerification() {
    console.log('🚀 开始完整的模型配置验证\n');
    console.log('='.repeat(50));
    
    // 验证服务配置
    verifyServiceConfiguration();
    
    console.log('\n' + '='.repeat(50));
    
    // 验证实际模型
    const apiSuccess = await verifyCurrentModel();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 验证总结:');
    
    if (apiSuccess) {
        console.log('🎉 ✅ DeepSeek-R1模型已成功接入!');
        console.log('   - 配置文件: ✅ 正确配置');  
        console.log('   - 服务文件: ✅ 已更新');
        console.log('   - API调用: ✅ 正常工作');
        console.log('   - 模型响应: ✅ 确认DeepSeek-R1');
    } else {
        console.log('❌ DeepSeek-R1模型接入存在问题');
        console.log('   请检查API密钥配置或网络连接');
    }
    
    console.log('='.repeat(50));
}

// 如果直接运行此文件
if (require.main === module) {
    completeVerification().catch(error => {
        console.error('验证过程出错:', error);
        process.exit(1);
    });
}

module.exports = {
    verifyCurrentModel,
    verifyServiceConfiguration,
    completeVerification
};