// 测试真实文件上传
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testRealFileUpload() {
    console.log('=== 真实文件上传测试 ===');
    
    // 创建一个简单的测试文档
    const testContent = `
政府采购优惠政策

第一条：本地企业在政府采购中享有10%的价格优惠。
第二条：外地企业不得参与本地重点项目招标。
第三条：要求供应商必须在本地设立分支机构。

税收优惠政策：
1. 对本地注册企业减免所得税30%
2. 外地企业需要缴纳额外的市场准入费用5万元
3. 本地企业享受更低的土地使用费
    `.trim();
    
    const testFile = 'test_policy.txt';
    fs.writeFileSync(testFile, testContent, 'utf8');
    
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(testFile), {
            filename: '测试政策文档.txt',
            contentType: 'text/plain'
        });

        console.log('🚀 发送POST请求到 /stream-review...');
        const response = await axios.post('http://localhost:3000/stream-review', form, {
            headers: form.getHeaders(),
            timeout: 120000,
            responseType: 'stream'
        });

        console.log('📨 响应状态:', response.status);
        console.log('📨 响应头:', response.headers['content-type']);

        let completeData = '';
        let messageCount = 0;

        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                const chunkStr = chunk.toString();
                completeData += chunkStr;
                
                const lines = chunkStr.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.substring(6).trim();
                            if (jsonStr) {
                                const data = JSON.parse(jsonStr);
                                messageCount++;
                                
                                console.log(`📨 [${messageCount}] ${data.type}: ${data.message || '结构化数据'}`);
                                
                                if (data.type === 'complete') {
                                    console.log('🎯 收到最终结果!');
                                    console.log('问题总数:', data.result.totalIssues);
                                    console.log('使用的模型:', data.result.modelUsed);
                                    console.log('分析质量:', data.result.analysisQuality);
                                    console.log('是否使用回退:', data.result.fallbackUsed);
                                    
                                    if (data.result.issues && data.result.issues.length > 0) {
                                        console.log('\\n📋 检测到的问题:');
                                        data.result.issues.forEach((issue, index) => {
                                            console.log(`${index + 1}. ${issue.title || issue.violationType}`);
                                            if (issue.description || issue.problemDescription) {
                                                console.log(`   描述: ${(issue.description || issue.problemDescription).substring(0, 100)}...`);
                                            }
                                        });
                                    }
                                    
                                    console.log('\\n✅ 审查完成 - API调用正常！');
                                    resolve();
                                    return;
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误，继续处理
                        }
                    }
                }
            });

            response.data.on('end', () => {
                console.log('\\n📊 流结束统计:');
                console.log(`- 总消息数: ${messageCount}`);
                console.log(`- 总数据长度: ${completeData.length}`);
                resolve();
            });

            response.data.on('error', (error) => {
                console.error('❌ 流数据错误:', error.message);
                reject(error);
            });
        });

    } catch (error) {
        console.error('❌ 请求失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    } finally {
        // 清理测试文件
        try {
            fs.unlinkSync(testFile);
            console.log('🗑️ 清理完成');
        } catch (e) {
            // 忽略清理错误
        }
    }
}

testRealFileUpload().catch(console.error);