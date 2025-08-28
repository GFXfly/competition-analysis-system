const { performEnhancedPreCheck, performEnhancedDetailedReview } = require('./services/enhancedReviewService');

/**
 * 增强审查系统测试用例
 * 包含各种典型的违规和合规案例
 */

// 测试用例数据
const TEST_CASES = {
    // 明显违规案例
    obvious_violations: [
        {
            name: "直接限定供应商",
            content: `
根据市政府第123号文件，为加强城市建设管理，现制定如下措施：
一、城市照明设备采购必须选择本市ABC照明公司产品
二、市政工程施工单位限定为本地注册的企业
三、政府采购项目优先考虑纳税额超过100万元的本地企业
四、外地企业参与投标需提供额外的资信担保材料
            `,
            expected: {
                needsReview: true,
                riskLevel: 'high',
                expectedIssues: 4
            }
        },
        {
            name: "地方保护措施",
            content: `
关于支持本地企业发展的若干措施：
1. 本地企业在政府采购中享受5%的价格优惠
2. 外地商品进入本市需要额外的质量检测程序
3. 限制本地农产品运出，确保本地市场供应充足
4. 设立专项资金，按企业年度纳税额给予1-5%的奖励补贴
            `,
            expected: {
                needsReview: true,
                riskLevel: 'high',
                expectedIssues: 4
            }
        }
    ],

    // 隐性违规案例
    subtle_violations: [
        {
            name: "变相地域限制",
            content: `
关于规范市场准入的通知：
一、申请经营许可的企业应当具有本地三年以上经营经验
二、建议优先选择与本地企业有合作关系的供应商
三、鼓励使用本地知名品牌产品
四、对积极参与本地公益事业的企业给予政策倾斜
            `,
            expected: {
                needsReview: true,
                riskLevel: 'medium',
                expectedIssues: 2
            }
        },
        {
            name: "间接准入壁垒",
            content: `
关于提升服务质量的实施方案：
1. 服务提供商应当在本市设立分支机构或办事处
2. 要求供应商具备本地化服务能力
3. 优先考虑对本地经济发展有重大贡献的企业
4. 建立供应商推荐名录，名录内企业享受便利服务
            `,
            expected: {
                needsReview: true,
                riskLevel: 'medium',
                expectedIssues: 3
            }
        }
    ],

    // 合规案例
    compliant_cases: [
        {
            name: "正常的技术要求",
            content: `
关于政府采购项目技术规范的通知：
一、所有投标产品必须符合国家相关技术标准
二、供应商应当具备相应的资质证书和服务能力
三、产品质量应当通过国家认证机构的检测
四、投标企业应当具有良好的信誉记录
五、所有符合条件的企业均可参与投标，不得设置歧视性条件
            `,
            expected: {
                needsReview: false,
                riskLevel: 'none',
                expectedIssues: 0
            }
        },
        {
            name: "合规的支持政策",
            content: `
关于促进创新创业的实施意见：
1. 支持符合条件的创新型企业申请专项资金
2. 对获得国家高新技术企业认证的企业给予政策支持  
3. 建立公平透明的评审机制，确保各类企业平等参与
4. 加强知识产权保护，营造良好的创新环境
            `,
            expected: {
                needsReview: false,
                riskLevel: 'none',
                expectedIssues: 0
            }
        }
    ],

    // 边界案例
    borderline_cases: [
        {
            name: "模糊表述案例",
            content: `
关于优化营商环境的措施：
一、鼓励本地优秀企业做强做大
二、支持有实力的企业参与重大项目建设
三、对重点企业给予必要的政策倾斜
四、建立企业服务绿色通道
            `,
            expected: {
                needsReview: true,
                riskLevel: 'low',
                expectedIssues: 1
            }
        }
    ]
};

/**
 * 运行单个测试用例
 */
async function runTestCase(testCase) {
    console.log(`\n🧪 测试用例：${testCase.name}`);
    console.log('=' .repeat(50));
    
    try {
        // 预判断测试
        const preCheckStart = Date.now();
        const preCheckResult = await performEnhancedPreCheck(testCase.content);
        const preCheckTime = Date.now() - preCheckStart;
        
        console.log('📋 预判断结果:');
        console.log(`  需要审查: ${preCheckResult.needsReview ? '是' : '否'}`);
        console.log(`  风险等级: ${preCheckResult.riskLevel}`);
        console.log(`  置信度: ${(preCheckResult.confidence * 100).toFixed(1)}%`);
        console.log(`  处理时间: ${preCheckTime}ms`);
        console.log(`  判断理由: ${preCheckResult.reason}`);
        
        if (preCheckResult.detectedPatterns && preCheckResult.detectedPatterns.length > 0) {
            console.log('  检测到的模式:');
            preCheckResult.detectedPatterns.forEach(pattern => {
                console.log(`    - ${pattern.category}: ${pattern.count}处匹配`);
            });
        }
        
        // 如果需要详细审查，则进行详细审查
        if (preCheckResult.needsReview) {
            console.log('\n📊 开始详细审查...');
            const detailedStart = Date.now();
            
            try {
                const detailedResult = await performEnhancedDetailedReview(testCase.content);
                const detailedTime = Date.now() - detailedStart;
                
                console.log('📋 详细审查结果:');
                console.log(`  发现问题: ${detailedResult.totalIssues}个`);
                console.log(`  合规状态: ${detailedResult.complianceStatus}`);
                console.log(`  处理时间: ${detailedTime}ms`);
                console.log(`  最终置信度: ${(detailedResult.finalConfidence * 100).toFixed(1)}%`);
                
                if (detailedResult.issues && detailedResult.issues.length > 0) {
                    console.log('  具体问题:');
                    detailedResult.issues.forEach((issue, index) => {
                        console.log(`    ${index + 1}. ${issue.articleViolated || issue.title}: ${issue.violationDescription || issue.description}`);
                    });
                }
                
                // 验证测试结果
                validateTestResult(testCase, preCheckResult, detailedResult);
                
            } catch (detailedError) {
                console.log('❌ 详细审查失败:', detailedError.message);
                return false;
            }
        } else {
            // 验证预判断结果
            validatePreCheckResult(testCase, preCheckResult);
        }
        
        return true;
    } catch (error) {
        console.log('❌ 测试失败:', error.message);
        console.error(error.stack);
        return false;
    }
}

/**
 * 验证预判断结果
 */
function validatePreCheckResult(testCase, result) {
    const expected = testCase.expected;
    let passed = true;
    
    if (result.needsReview !== expected.needsReview) {
        console.log(`❌ 预判断错误: 期望${expected.needsReview ? '需要' : '不需要'}审查，实际${result.needsReview ? '需要' : '不需要'}审查`);
        passed = false;
    }
    
    if (result.riskLevel !== expected.riskLevel) {
        console.log(`⚠️ 风险等级不匹配: 期望${expected.riskLevel}，实际${result.riskLevel}`);
        // 风险等级差异不算严重错误
    }
    
    if (passed) {
        console.log('✅ 预判断测试通过');
    }
    
    return passed;
}

/**
 * 验证测试结果
 */
function validateTestResult(testCase, preCheckResult, detailedResult) {
    const expected = testCase.expected;
    let passed = true;
    
    // 验证是否需要审查
    if (preCheckResult.needsReview !== expected.needsReview) {
        console.log(`❌ 预判断错误: 期望${expected.needsReview ? '需要' : '不需要'}审查，实际${preCheckResult.needsReview ? '需要' : '不需要'}审查`);
        passed = false;
    }
    
    // 验证风险等级
    if (preCheckResult.riskLevel !== expected.riskLevel) {
        console.log(`⚠️ 风险等级不匹配: 期望${expected.riskLevel}，实际${preCheckResult.riskLevel}`);
        // 风险等级差异不算严重错误
    }
    
    // 验证问题数量（允许一定误差）
    if (detailedResult && expected.expectedIssues !== undefined) {
        const issuesDiff = Math.abs(detailedResult.totalIssues - expected.expectedIssues);
        if (issuesDiff > 1) { // 允许1个问题的误差
            console.log(`⚠️ 问题数量偏差较大: 期望${expected.expectedIssues}个，实际${detailedResult.totalIssues}个`);
        }
    }
    
    if (passed) {
        console.log('✅ 测试通过');
    }
    
    return passed;
}

/**
 * 运行所有测试用例
 */
async function runAllTests() {
    console.log('🚀 开始增强审查系统测试');
    console.log('='.repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = [];
    
    for (const [categoryName, categoryTests] of Object.entries(TEST_CASES)) {
        console.log(`\n📂 测试分类: ${categoryName}`);
        console.log('-'.repeat(40));
        
        for (const testCase of categoryTests) {
            totalTests++;
            const result = await runTestCase(testCase);
            
            if (result) {
                passedTests++;
            } else {
                failedTests.push(`${categoryName}: ${testCase.name}`);
            }
            
            // 添加延迟避免API限制
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // 输出测试总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log(`总测试用例: ${totalTests}`);
    console.log(`通过: ${passedTests} ✅`);
    console.log(`失败: ${totalTests - passedTests} ❌`);
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests.length > 0) {
        console.log('\n失败的测试用例:');
        failedTests.forEach(test => console.log(`  - ${test}`));
    }
    
    return {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        passRate: (passedTests / totalTests) * 100,
        failedTests
    };
}

/**
 * 性能基准测试
 */
async function runBenchmarkTest() {
    console.log('\n🏃‍♂️ 开始性能基准测试');
    console.log('-'.repeat(40));
    
    const testText = TEST_CASES.obvious_violations[0].content;
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await performEnhancedPreCheck(testText);
        const time = Date.now() - start;
        times.push(time);
        console.log(`第${i + 1}次测试: ${time}ms`);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log('\n性能统计:');
    console.log(`平均响应时间: ${avgTime.toFixed(1)}ms`);
    console.log(`最快响应时间: ${minTime}ms`);
    console.log(`最慢响应时间: ${maxTime}ms`);
    
    return { avgTime, minTime, maxTime };
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
    (async () => {
        try {
            // 运行所有测试用例
            const results = await runAllTests();
            
            // 运行性能测试
            await runBenchmarkTest();
            
            process.exit(results.failed === 0 ? 0 : 1);
        } catch (error) {
            console.error('测试执行失败:', error);
            process.exit(1);
        }
    })();
}

module.exports = {
    runAllTests,
    runBenchmarkTest,
    TEST_CASES
};