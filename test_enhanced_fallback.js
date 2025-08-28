const { performPreCheck, performMockReview } = require('./services/reviewService');

async function testEnhancedFallback() {
    console.log('=== 增强回退系统测试 ===\n');
    
    const testCases = [
        {
            name: "简单测试文本",
            text: "本政策涉及市场准入。"
        },
        {
            name: "高风险政策文本",
            text: "为促进本地经济发展，本政策对本地企业给予税收优惠和财政补贴。在政府采购活动中，要求供应商必须为本地注册企业，外地企业不得参与。对于符合条件的当地供应商，将给予10%的价格优惠。根据企业经济贡献度和纳税额，对贡献突出的企业给予额外奖励。"
        },
        {
            name: "中等风险文本",
            text: "本办法旨在规范招标投标活动，确保公平竞争。所有符合资质要求的企业均可参与投标，招标单位应当公开透明地进行评标。对投标企业的生产经营成本影响进行评估。"
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📝 测试案例: ${testCase.name}`);
        console.log(`文本长度: ${testCase.text.length} 字符`);
        console.log('文本内容:', testCase.text);
        
        try {
            const startTime = Date.now();
            const result = await performPreCheck(testCase.text);
            const duration = Date.now() - startTime;
            
            console.log('\n📊 预检查结果:');
            console.log(`  需要审查: ${result.needsReview}`);
            console.log(`  置信度: ${result.confidence}`);
            console.log(`  文档类型: ${result.documentType}`);
            console.log(`  处理方式: ${result.processingMethod}`);
            console.log(`  API调用: ${result.apiCalled}`);
            console.log(`  执行时间: ${duration}ms`);
            console.log(`  判断理由: ${result.reason}`);
            
            if (result.highRiskMatches) {
                console.log(`  高风险关键词: ${result.highRiskMatches.join(', ')}`);
            }
            if (result.riskScore) {
                console.log(`  风险评分: ${result.riskScore}`);
            }
            
            // 如果需要审查，测试详细审查
            if (result.needsReview) {
                console.log('\n🔍 执行详细审查测试...');
                
                const mockReq = {
                    file: {
                        originalname: `${testCase.name}.txt`,
                        size: Buffer.byteLength(testCase.text, 'utf8')
                    }
                };
                
                const reviewResult = performMockReview(mockReq, testCase.text);
                
                console.log('📋 详细审查结果:');
                console.log(`  发现问题数: ${reviewResult.totalIssues}`);
                console.log(`  分析质量: ${reviewResult.analysisQuality}`);
                console.log(`  处理方式: ${reviewResult.processingMethod}`);
                
                if (reviewResult.riskDistribution) {
                    console.log(`  风险分布: 高${reviewResult.riskDistribution.high}个, 中${reviewResult.riskDistribution.medium}个`);
                }
                
                reviewResult.issues.forEach((issue, index) => {
                    console.log(`\n  问题${index + 1}: ${issue.title}`);
                    console.log(`    严重程度: ${issue.severity || '未知'}`);
                    console.log(`    类别: ${issue.category || '未分类'}`);
                    console.log(`    描述: ${issue.description}`);
                    console.log(`    引用: ${issue.quote}`);
                });
            }
            
        } catch (error) {
            console.error(`❌ 测试失败:`, error.message);
        }
        
        console.log('\n' + '='.repeat(80));
    }
    
    console.log('\n✅ 增强回退系统测试完成');
}

// 执行测试
testEnhancedFallback().catch(console.error);