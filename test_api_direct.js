const axios = require('axios');
require('dotenv').config();

async function testAPIConnection() {
    console.log('🔬 正在测试SiliconFlow API连接...');
    console.log('API密钥:', process.env.SILICONFLOW_API_KEY ? '已配置' : '未配置');
    
    const testText = `
测试文档内容：
本政策文件主要规定了市场准入相关事项，涉及本地企业的特殊优惠政策。
为了支持当地经济发展，对于在本地注册的企业，将给予税收优惠和财政补贴。
同时，在政府采购中，优先考虑本地供应商的产品和服务。
`;

    const prompt = `请判断以下文档是否需要进行公平竞争审查。

公平竞争审查的范围包括：
1. 市场准入和退出
2. 商品和要素自由流动
3. 影响生产经营成本
4. 影响生产经营行为

请分析文档内容，判断是否涉及上述范围，并给出判断理由。

文档内容：
${testText}

请以JSON格式回复：
{
  "needsReview": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}`;

    try {
        const apiKey = process.env.SILICONFLOW_API_KEY;
        if (!apiKey) {
            throw new Error('未配置API密钥');
        }

        console.log('📡 正在发送API请求...');
        const startTime = Date.now();
        
        const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
            model: 'deepseek-ai/DeepSeek-R1',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 300,
            temperature: 0.0,
            seed: 42
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000,
            proxy: false, // 禁用代理，直连API
            validateStatus: function (status) {
                return status < 500;
            }
        });

        const responseTime = Date.now() - startTime;
        console.log(`⏱️  API响应时间: ${responseTime}ms`);

        if (response.status >= 400) {
            throw new Error(`API请求失败: HTTP ${response.status} - ${response.data?.error?.message || response.statusText}`);
        }

        console.log('✅ API响应成功!');
        console.log('状态码:', response.status);
        
        const content = response.data.choices[0].message.content;
        console.log('📄 AI响应内容:', content);
        
        // 尝试解析JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const result = JSON.parse(jsonMatch[0]);
                console.log('🎯 解析结果:', result);
            } catch (parseError) {
                console.error('❌ JSON解析失败:', parseError.message);
            }
        } else {
            console.warn('⚠️  未找到有效JSON格式');
        }

        return true;

    } catch (error) {
        console.error('❌ API测试失败:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            console.error('💥 网络连接超时');
        } else if (error.response) {
            console.error('💥 API服务错误:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('💥 无法连接到API服务');
            console.error('请求配置:', {
                url: error.request._currentUrl || error.config?.url,
                timeout: error.config?.timeout,
                proxy: error.config?.proxy
            });
        } else {
            console.error('💥 其他错误:', error.message);
        }
        
        return false;
    }
}

// 运行测试
testAPIConnection()
    .then(success => {
        if (success) {
            console.log('🎉 API连接测试成功！');
        } else {
            console.log('💔 API连接测试失败');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('🚨 测试脚本执行失败:', error);
        process.exit(1);
    });