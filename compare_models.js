const { performEnhancedPreCheck } = require('./services/enhancedReviewService');

/**
 * DeepSeek-R1 vs Kimi-K2 模型对比测试
 */

// 测试用例 - 不同复杂度的违规和合规案例
const TEST_CASES = [
    {
        name: "明显违规案例",
        content: `根据市政府第123号文件，为加强城市建设管理，现制定如下措施：
一、城市照明设备采购必须选择本市ABC照明公司产品
二、市政工程施工单位限定为本地注册的企业  
三、政府采购项目优先考虑纳税额超过100万元的本地企业`,
        expected: { needsReview: true, riskLevel: 'high', expectedIssues: 3 }
    },
    {
        name: "隐性违规案例", 
        content: `关于规范市场准入的通知：
一、申请经营许可的企业应当具有本地三年以上经营经验
二、建议优先选择与本地企业有合作关系的供应商
三、鼓励使用本地知名品牌产品
四、对积极参与本地公益事业的企业给予政策倾斜`,
        expected: { needsReview: true, riskLevel: 'medium', expectedIssues: 2 }
    },
    {
        name: "边界案例",
        content: `关于优化营商环境的措施：
一、鼓励本地优秀企业做强做大
二、支持有实力的企业参与重大项目建设  
三、对重点企业给予必要的政策倾斜
四、建立企业服务绿色通道`,
        expected: { needsReview: true, riskLevel: 'low', expectedIssues: 1 }
    },
    {
        name: "合规案例",
        content: `关于政府采购项目技术规范的通知：
一、所有投标产品必须符合国家相关技术标准
二、供应商应当具备相应的资质证书和服务能力
三、产品质量应当通过国家认证机构的检测
四、投标企业应当具有良好的信誉记录
五、所有符合条件的企业均可参与投标，不得设置歧视性条件`,
        expected: { needsReview: false, riskLevel: 'none', expectedIssues: 0 }
    }
];

/**
 * 运行单个测试用例
 */
async function runTestCase(testCase) {
    console.log(`\n🧪 测试用例: ${testCase.name}`);
    console.log('-'.repeat(50));
    
    try {
        const startTime = Date.now();
        const result = await performEnhancedPreCheck(testCase.content);
        const processingTime = Date.now() - startTime;
        
        console.log(`⏱️  处理时间: ${processingTime}ms`);
        console.log(`🎯 需要审查: ${result.needsReview ? '是' : '否'}`);
        console.log(`📊 风险等级: ${result.riskLevel}`);
        console.log(`🔍 置信度: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`💭 判断理由: ${result.reason}`);
        
        if (result.detectedPatterns && result.detectedPatterns.length > 0) {
            console.log(`📋 检测到模式:`);
            result.detectedPatterns.forEach((pattern, index) => {
                console.log(`   ${index + 1}. ${pattern.category} (${pattern.severity}风险, ${pattern.count}处匹配)`);
            });
        }
        
        if (result.keywordScore) {
            console.log(`🏷️  关键词得分: ${result.keywordScore}`);
        }
        
        if (result.aiInsights) {
            console.log(`🤖 AI洞察: ${result.aiInsights.substring(0, 100)}...`);
        }
        
        // 性能和质量评估
        const assessment = evaluateResult(testCase, result, processingTime);
        console.log(`\n📊 评估结果:`);
        console.log(`   准确性: ${assessment.accuracy}`);
        console.log(`   性能: ${assessment.performance}`);
        console.log(`   整体: ${assessment.overall}`);
        
        return {
            testCase: testCase.name,
            result,
            processingTime,
            assessment
        };
        
    } catch (error) {
        console.log(`❌ 测试失败: ${error.message}`);
        return {
            testCase: testCase.name,
            error: error.message,
            processingTime: 0,
            assessment: { accuracy: '错误', performance: '失败', overall: '失败' }
        };
    }
}

/**
 * 评估测试结果
 */
function evaluateResult(testCase, result, processingTime) {
    let accuracy = '优秀';
    let performance = '优秀';
    let overall = '优秀';
    
    // 准确性评估
    const expected = testCase.expected;
    if (result.needsReview !== expected.needsReview) {
        accuracy = '不准确';
    } else if (result.riskLevel !== expected.riskLevel) {
        accuracy = '基本准确';  
    } else {
        accuracy = '准确';
    }
    
    // 性能评估
    if (processingTime > 10000) {
        performance = '较慢';
    } else if (processingTime > 5000) {
        performance = '一般';
    } else {
        performance = '快速';
    }
    
    // 综合评估
    if (accuracy === '不准确' || performance === '较慢') {
        overall = '需改进';
    } else if (accuracy === '基本准确' && performance === '一般') {
        overall = '良好';
    } else {
        overall = '优秀';
    }
    
    return { accuracy, performance, overall };
}

/**
 * 运行完整对比测试
 */
async function runComparisonTest() {
    console.log('🚀 DeepSeek-R1 模型对比测试开始');
    console.log('='.repeat(60));
    console.log(`🤖 当前模型: deepseek-ai/DeepSeek-R1`);
    console.log(`📅 测试时间: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    const results = [];
    let totalTime = 0;
    let successCount = 0;
    
    for (const testCase of TEST_CASES) {
        const result = await runTestCase(testCase);
        results.push(result);
        
        if (!result.error) {
            totalTime += result.processingTime;
            successCount++;
        }
        
        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 输出总结报告
    console.log('\n' + '='.repeat(60));
    console.log('📊 DeepSeek-R1 测试总结报告');
    console.log('='.repeat(60));
    console.log(`✅ 成功测试: ${successCount}/${TEST_CASES.length}`);
    console.log(`⏱️  平均处理时间: ${totalTime > 0 ? (totalTime / successCount).toFixed(0) : 0}ms`);
    console.log(`🎯 成功率: ${((successCount / TEST_CASES.length) * 100).toFixed(1)}%`);
    
    // 详细结果统计
    const accuracyStats = {};
    const performanceStats = {};
    const overallStats = {};
    
    results.forEach(result => {
        if (!result.error) {
            const acc = result.assessment.accuracy;
            const perf = result.assessment.performance;  
            const overall = result.assessment.overall;
            
            accuracyStats[acc] = (accuracyStats[acc] || 0) + 1;
            performanceStats[perf] = (performanceStats[perf] || 0) + 1;
            overallStats[overall] = (overallStats[overall] || 0) + 1;
        }
    });
    
    console.log('\n📈 详细统计:');
    console.log(`准确性分布: ${JSON.stringify(accuracyStats)}`);
    console.log(`性能分布: ${JSON.stringify(performanceStats)}`);
    console.log(`整体评价分布: ${JSON.stringify(overallStats)}`);
    
    // 具体问题分析
    console.log('\n🔍 具体测试结果:');
    results.forEach((result, index) => {
        if (!result.error) {
            const tc = TEST_CASES[index];
            const match = result.result.needsReview === tc.expected.needsReview;
            console.log(`   ${index + 1}. ${result.testCase}: ${match ? '✅' : '❌'} (${result.processingTime}ms)`);
        } else {
            console.log(`   ${index + 1}. ${result.testCase}: ❌ ${result.error}`);
        }
    });
    
    // 性能建议
    console.log('\n💡 优化建议:');
    if (totalTime / successCount > 5000) {
        console.log('   - 考虑调整API超时参数以提升响应速度');
        console.log('   - 可以尝试降低max_tokens减少处理时间');
    }
    
    const accurateCount = (accuracyStats['准确'] || 0) + (accuracyStats['优秀'] || 0);
    if (accurateCount < successCount * 0.8) {
        console.log('   - 考虑优化提示词以提升准确率');  
        console.log('   - 可能需要调整模型参数如temperature');
    }
    
    if (successCount === TEST_CASES.length && accurateCount >= successCount * 0.8) {
        console.log('   ✅ DeepSeek-R1模型表现优秀，建议继续使用');
    }
    
    console.log('\n🎉 测试完成！');
    
    return {
        totalTests: TEST_CASES.length,
        successCount,
        averageTime: totalTime / successCount,
        accuracy: accurateCount / successCount,
        results
    };
}

/**
 * 快速API连接测试
 */
async function quickAPITest() {
    console.log('🔧 快速API连接测试...');
    
    try {
        const testText = "这是一个简单的测试文档，包含限定本地企业参与政府采购的条款。";
        const startTime = Date.now();
        const result = await performEnhancedPreCheck(testText);
        const time = Date.now() - startTime;
        
        console.log('✅ API连接正常');
        console.log(`⏱️  响应时间: ${time}ms`);
        console.log(`🎯 检测结果: ${result.needsReview ? '需要审查' : '无需审查'}`);
        console.log(`📊 置信度: ${(result.confidence * 100).toFixed(1)}%`);
        
        return true;
    } catch (error) {
        console.log('❌ API连接失败:', error.message);
        return false;
    }
}

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        try {
            // 先进行快速连接测试
            const apiOk = await quickAPITest();
            
            if (!apiOk) {
                console.log('❌ API连接失败，请检查配置后再试');
                process.exit(1);
            }
            
            console.log('\n⏳ 等待3秒后开始完整测试...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 运行完整对比测试
            const results = await runComparisonTest();
            
            // 根据测试结果决定退出码
            const successRate = results.accuracy;
            process.exit(successRate >= 0.8 ? 0 : 1);
            
        } catch (error) {
            console.error('测试执行失败:', error);
            process.exit(1);
        }
    })();
}

module.exports = {
    runComparisonTest,
    quickAPITest,
    runTestCase,
    TEST_CASES
};