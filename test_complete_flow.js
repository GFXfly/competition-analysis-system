/**
 * 测试完整的审查流程
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

console.log('=== 测试完整审查流程 ===');

// 创建一个测试文档
const testContent = `
关于促进本地企业发展的政策措施

第一条 为支持本地经济发展，制定以下措施：
1. 本地企业在政府采购中享有10%的价格优惠
2. 外地企业不得参与本地重点项目招标
3. 要求供应商必须在本地设立分支机构

第二条 税收优惠政策：
1. 对本地企业减免所得税30%
2. 外地企业需缴纳额外的市场准入费用
`;

async function testCompleteFlow() {
    try {
        // 启动服务器
        console.log('🚀 启动服务器...');
        const serverProcess = require('child_process').spawn('npm', ['start'], {
            detached: true,
            stdio: 'pipe'
        });
        
        // 等待服务器启动
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 创建测试文件
        const testFilePath = '/tmp/test_document.txt';
        fs.writeFileSync(testFilePath, testContent);
        
        console.log('📄 创建测试文档完成');
        
        // 测试流式审查接口
        console.log('🔍 开始流式审查测试...');
        
        const form = new FormData();
        form.append('file', fs.createReadStream(testFilePath));
        
        try {
            const response = await axios.post('http://localhost:3000/stream-review', form, {
                headers: form.getHeaders(),
                responseType: 'stream',
                timeout: 120000
            });
            
            let fullResponse = '';
            let lastMessage = null;
            
            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            console.log(`📨 收到消息: ${data.type} - ${data.message || 'N/A'}`);
                            
                            if (data.type === 'complete') {
                                lastMessage = data;
                                console.log('\n=== 审查完成 ===');
                                console.log('问题总数:', data.result.totalIssues);
                                console.log('问题列表:');
                                if (data.result.issues && data.result.issues.length > 0) {
                                    data.result.issues.forEach((issue, index) => {
                                        console.log(`\n问题 ${index + 1}:`);
                                        console.log(`  标题: ${issue.title || '未知'}`);
                                        console.log(`  描述: ${issue.description || '未知'}`);
                                        console.log(`  原文: ${issue.quote || '未知'}`);
                                        console.log(`  建议: ${issue.suggestion || '未知'}`);
                                    });
                                } else {
                                    console.log('  无具体问题详情');
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            });
            
            response.data.on('end', () => {
                console.log('\n✅ 流式响应结束');
                if (lastMessage) {
                    console.log('✅ 成功接收到完整审查结果');
                } else {
                    console.log('❌ 未收到完整审查结果');
                }
                
                // 清理并退出
                serverProcess.kill();
                fs.unlinkSync(testFilePath);
                process.exit(0);
            });
            
        } catch (error) {
            console.error('❌ 流式审查请求失败:', error.message);
            serverProcess.kill();
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

// 运行测试
testCompleteFlow();