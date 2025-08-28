require('dotenv').config();
const axios = require('axios');

async function testAPI() {
    try {
        console.log('Testing API with key:', process.env.SILICONFLOW_API_KEY ? process.env.SILICONFLOW_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');
        
        const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
            model: 'deepseek-ai/DeepSeek-R1',
            messages: [{
                role: 'user',
                content: '简单测试，请回复"测试成功"'
            }],
            max_tokens: 20,
            temperature: 0.0
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log('✅ API调用成功:', response.data.choices[0].message.content);
        return true;
    } catch (error) {
        console.error('❌ API调用失败:', error.response?.data || error.message);
        return false;
    }
}

testAPI();