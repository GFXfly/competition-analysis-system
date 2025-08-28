const { performOptimizedSemanticAnalysis, performOptimizedDetailedReview, performOptimizedCaseComparison } = require('./services/optimizedPromptService');

/**
 * DeepSeek-R1 优化提示词测试
 * 专门测试能否检测出之前漏掉的违规问题
 */

// 测试用例：这些都是明显违规但可能被忽略的案例
const CRITICAL_TEST_CASES = [
    {
        name: "明显地方保护 - 本地企业优先",
        content: `关于政府采购项目的通知：
为支持本地经济发展，政府采购项目优先选择本地企业。
外地企业参与投标需要提供额外的信用担保和本地合作伙伴证明。
本地企业在同等条件下享有优先中标权。`,
        expectedViolations: ['第13条 - 歧视性政策', '第19条 - 限制招标投标'],
        expectedDetected: true,
        testDescription: "典型的地方保护措施，应该100%被检出"
    },
    
    {
        name: "限定特定经营者 - 指定品牌",
        content: `关于设备采购规范：
一、城市照明设备必须使用XX牌LED灯具
二、指定ABC公司为唯一合格供应商
三、其他品牌产品不符合本市技术要求
四、采购部门应严格执行上述规定`,
        expectedViolations: ['第8条 - 限定特定经营者'],
        expectedDetected: true,
        testDescription: "直接限定供应商，最明显的违规"
    },
    
    {
        name: "以经济贡献为依据的奖励",
        content: `企业奖励政策：
根据企业年度纳税额给予以下奖励：
- 纳税1000万以上：奖励50万元
- 纳税500万以上：奖励20万元  
- 纳税100万以上：奖励5万元
对经济贡献突出的企业优先提供政策支持。`,
        expectedViolations: ['第21条 - 不当财政奖励'],
        expectedDetected: true,
        testDescription: "以经济贡献为依据，典型违规"
    },
    
    {
        name: "变相地域限制 - 本地经验要求",
        content: `市场准入管理办法：
申请经营许可的企业应当具备以下条件：
1. 在本市有三年以上经营经验
2. 熟悉本地市场情况和政策环境
3. 具有本地服务团队和技术支持
4. 与本地企业建立合作关系`,
        expectedViolations: ['第9条 - 特定区域要求', '第26条 - 不合理准入条件'],
        expectedDetected: true,
        testDescription: "变相的地域限制，较隐蔽但应该被检出"
    },
    
    {
        name: "合规政策 - 技术标准要求",
        content: `产品质量标准：
1. 所有产品必须符合国家相关技术标准
2. 供应商应具备相应的资质证书
3. 产品质量应通过国家认证机构检测
4. 投标企业应具有良好信誉记录
5. 欢迎所有符合条件的企业公平参与`,
        expectedViolations: [],
        expectedDetected: false,
        testDescription: "合规政策，不应该被误判为违规"
    }
];

/**
 * 运行单个测试用例
 */
async function runSingleTest(testCase) {
    console.log(`\n🧪 测试用例: ${testCase.name}`);
    console.log(`📝 描述: ${testCase.testDescription}`);
    console.log(`🎯 预期检出: ${testCase.expectedDetected ? '是' : '否'}`);
    console.log('-'.repeat(60));
    
    let passed = true;
    const results = {};
    
    try {
        // 第一层：语义分析测试
        console.log('🧠 第一层：语义分析测试...');
        const semanticStart = Date.now();
        const semanticResult = await performOptimizedSemanticAnalysis(testCase.content);
        const semanticTime = Date.now() - semanticStart;
        
        results.semantic = {
            hasViolation: semanticResult.hasViolation,
            confidence: semanticResult.confidence,
            time: semanticTime,
            reasoning: semanticResult.reasoning
        };
        
        console.log(`   结果: ${semanticResult.hasViolation ? '检出违规' : '未检出'}`);
        console.log(`   置信度: ${(semanticResult.confidence * 100).toFixed(1)}%`);
        console.log(`   耗时: ${semanticTime}ms`);
        
        // 检查语义分析结果是否正确
        if (semanticResult.hasViolation !== testCase.expectedDetected) {
            console.log(`   ❌ 语义分析错误: 预期${testCase.expectedDetected ? '检出' : '未检出'}，实际${semanticResult.hasViolation ? '检出' : '未检出'}`);
            passed = false;
        } else {
            console.log(`   ✅ 语义分析正确`);
        }
        
        // 第二层：详细审查测试（只对预期违规的进行）
        if (testCase.expectedDetected) {
            console.log('\n📋 第二层：详细审查测试...');
            const detailedStart = Date.now();
            const detailedResult = await performOptimizedDetailedReview(testCase.content);
            const detailedTime = Date.now() - detailedStart;
            
            results.detailed = {
                totalIssues: detailedResult.totalIssues,
                issues: detailedResult.issues,
                complianceStatus: detailedResult.complianceStatus,
                time: detailedTime,
                reasoning: detailedResult.reasoningProcess
            };
            
            console.log(`   发现问题: ${detailedResult.totalIssues}个`);
            console.log(`   合规状态: ${detailedResult.complianceStatus}`);
            console.log(`   耗时: ${detailedTime}ms`);
            
            // 显示具体发现的问题
            if (detailedResult.issues && detailedResult.issues.length > 0) {
                console.log('   具体问题:');
                detailedResult.issues.forEach((issue, index) => {
                    console.log(`     ${index + 1}. ${issue.articleViolated}: ${issue.analysis || issue.violationDescription}`);
                });
            }
            
            // 检查是否发现了问题
            if (detailedResult.totalIssues === 0 && testCase.expectedDetected) {
                console.log(`   ❌ 详细审查未能发现预期的违规问题`);
                passed = false;
            } else if (detailedResult.totalIssues > 0) {
                console.log(`   ✅ 详细审查成功发现违规问题`);
            }
        }
        
        // 第三层：案例对比测试
        console.log('\n📚 第三层：案例对比测试...');
        const caseStart = Date.now();
        const caseResult = await performOptimizedCaseComparison(testCase.content);
        const caseTime = Date.now() - caseStart;
        
        results.caseComparison = {
            hasViolationPattern: caseResult.hasViolationPattern,
            confidenceLevel: caseResult.confidenceLevel,
            mainRisks: caseResult.mainRisks,
            time: caseTime
        };
        
        console.log(`   违规模式: ${caseResult.hasViolationPattern ? '发现' : '未发现'}`);
        console.log(`   置信度: ${(caseResult.confidenceLevel * 100).toFixed(1)}%`);
        console.log(`   风险数量: ${caseResult.mainRisks?.length || 0}个`);
        console.log(`   耗时: ${caseTime}ms`);
        
        // 检查案例对比结果
        if (caseResult.hasViolationPattern !== testCase.expectedDetected) {
            console.log(`   ❌ 案例对比错误: 预期${testCase.expectedDetected ? '发现' : '未发现'}模式，实际${caseResult.hasViolationPattern ? '发现' : '未发现'}`);
            passed = false;
        } else {
            console.log(`   ✅ 案例对比正确`);
        }
        
        // 综合评估
        console.log(`\n📊 测试结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
        
        return {
            testCase: testCase.name,
            passed,
            results,
            totalTime: (results.semantic?.time || 0) + (results.detailed?.time || 0) + (results.caseComparison?.time || 0)
        };
        
    } catch (error) {
        console.log(`❌ 测试执行失败: ${error.message}`);
        console.error(error.stack);
        
        return {
            testCase: testCase.name,
            passed: false,
            error: error.message,
            totalTime: 0
        };
    }
}

/**
 * 运行所有关键测试用例
 */
async function runCriticalTests() {
    console.log('🚀 开始DeepSeek-R1优化提示词关键测试');
    console.log('='  .repeat(60));
    console.log(`📅 测试时间: ${new Date().toISOString()}`);
    console.log(`🎯 测试目标: 验证是否能检出之前遗漏的违规问题`);
    console.log('='  .repeat(60));
    
    const testResults = [];
    let totalTime = 0;
    let passedCount = 0;
    
    for (let i = 0; i < CRITICAL_TEST_CASES.length; i++) {
        const testCase = CRITICAL_TEST_CASES[i];
        console.log(`\n[${i + 1}/${CRITICAL_TEST_CASES.length}] 执行测试...`);
        
        const result = await runSingleTest(testCase);
        testResults.push(result);
        
        if (result.passed) {
            passedCount++;
        }
        
        totalTime += result.totalTime;
        
        // 添加延迟避免API限制
        if (i < CRITICAL_TEST_CASES.length - 1) {
            console.log('⏳ 等待3秒避免API限制...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    // 输出测试总结
    console.log('\n' + '='  .repeat(60));
    console.log('📊 DeepSeek-R1优化提示词测试总结');
    console.log('='  .repeat(60));
    console.log(`✅ 通过测试: ${passedCount}/${CRITICAL_TEST_CASES.length}`);
    console.log(`📈 通过率: ${((passedCount / CRITICAL_TEST_CASES.length) * 100).toFixed(1)}%`);
    console.log(`⏱️  总耗时: ${(totalTime / 1000).toFixed(1)}秒`);
    console.log(`⏱️  平均耗时: ${(totalTime / CRITICAL_TEST_CASES.length / 1000).toFixed(1)}秒/案例`);
    
    // 详细结果分析
    console.log('\n📋 详细测试结果:');
    testResults.forEach((result, index) => {
        const status = result.passed ? '✅' : '❌';
        const time = result.totalTime ? `(${(result.totalTime / 1000).toFixed(1)}s)` : '(失败)';
        console.log(`   ${index + 1}. ${result.testCase}: ${status} ${time}`);
        
        if (!result.passed && result.error) {
            console.log(`      错误: ${result.error}`);
        }
    });
    
    // 违规检出能力分析
    const violationTests = CRITICAL_TEST_CASES.filter(tc => tc.expectedDetected);
    const violationPassed = testResults.filter((result, index) => 
        CRITICAL_TEST_CASES[index].expectedDetected && result.passed
    ).length;
    
    console.log('\n🎯 违规检出能力分析:');
    console.log(`   违规案例总数: ${violationTests.length}`);
    console.log(`   成功检出: ${violationPassed}/${violationTests.length}`);
    console.log(`   检出率: ${((violationPassed / violationTests.length) * 100).toFixed(1)}%`);
    
    // 误报分析
    const complianceTests = CRITICAL_TEST_CASES.filter(tc => !tc.expectedDetected);
    const noFalsePositives = testResults.filter((result, index) => 
        !CRITICAL_TEST_CASES[index].expectedDetected && result.passed
    ).length;
    
    console.log('\n🛡️  误报控制分析:');
    console.log(`   合规案例总数: ${complianceTests.length}`);
    console.log(`   正确识别: ${noFalsePositives}/${complianceTests.length}`);
    console.log(`   准确率: ${complianceTests.length > 0 ? ((noFalsePositives / complianceTests.length) * 100).toFixed(1) : 'N/A'}%`);
    
    // 性能分析
    console.log('\n⚡ 性能分析:');
    const avgSemanticTime = testResults.reduce((sum, r) => sum + (r.results?.semantic?.time || 0), 0) / testResults.length;
    const avgDetailedTime = testResults.reduce((sum, r) => sum + (r.results?.detailed?.time || 0), 0) / testResults.filter(r => r.results?.detailed).length;
    const avgCaseTime = testResults.reduce((sum, r) => sum + (r.results?.caseComparison?.time || 0), 0) / testResults.length;
    
    console.log(`   语义分析平均时间: ${avgSemanticTime.toFixed(0)}ms`);
    console.log(`   详细审查平均时间: ${avgDetailedTime.toFixed(0)}ms`);
    console.log(`   案例对比平均时间: ${avgCaseTime.toFixed(0)}ms`);
    
    // 改进建议
    console.log('\n💡 改进建议:');
    if (passedCount === CRITICAL_TEST_CASES.length) {
        console.log('   🎉 所有测试通过！DeepSeek-R1优化提示词效果优秀');
        console.log('   ✅ 系统现在应该能够准确检出违规问题');
    } else {
        const failedTests = testResults.filter(r => !r.passed);
        console.log(`   ⚠️  有${failedTests.length}个测试失败，需要进一步优化`);
        
        if (violationPassed < violationTests.length) {
            console.log('   📋 建议加强违规检出提示词');
        }
        
        if (noFalsePositives < complianceTests.length) {
            console.log('   🛡️  建议减少误报的提示词优化');
        }
        
        if (avgSemanticTime > 10000) {
            console.log('   ⚡ 建议优化响应速度');
        }
    }
    
    console.log('\n🎉 测试完成！');
    
    return {
        totalTests: CRITICAL_TEST_CASES.length,
        passed: passedCount,
        passRate: (passedCount / CRITICAL_TEST_CASES.length) * 100,
        violationDetectionRate: violationTests.length > 0 ? (violationPassed / violationTests.length) * 100 : 100,
        averageTime: totalTime / CRITICAL_TEST_CASES.length,
        testResults
    };
}

/**
 * 快速验证特定违规文本
 */
async function quickViolationTest(text, description = "快速测试") {
    console.log(`\n🔍 ${description}`);
    console.log('-'.repeat(40));
    console.log(`📝 测试文本: ${text.substring(0, 100)}...`);
    
    try {
        const result = await performOptimizedSemanticAnalysis(text);
        
        console.log(`✅ 分析完成`);
        console.log(`🎯 检出违规: ${result.hasViolation ? '是' : '否'}`);
        console.log(`📊 置信度: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`🔍 主要关注点: ${result.mainConcerns?.join(', ') || '无'}`);
        
        if (result.reasoning) {
            console.log(`🧠 推理过程: ${JSON.stringify(result.reasoning).substring(0, 200)}...`);
        }
        
        return result.hasViolation;
        
    } catch (error) {
        console.log(`❌ 测试失败: ${error.message}`);
        return false;
    }
}

// 如果直接运行此文件
if (require.main === module) {
    (async () => {
        try {
            // 先进行快速测试
            console.log('🔧 快速测试DeepSeek-R1优化提示词...');
            await quickViolationTest(
                "政府采购项目优先选择本地企业，支持本地经济发展", 
                "地方保护测试"
            );
            
            console.log('\n⏳ 等待5秒后开始完整测试...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 运行完整测试
            const results = await runCriticalTests();
            
            // 根据测试结果决定退出码
            process.exit(results.passRate >= 80 ? 0 : 1);
            
        } catch (error) {
            console.error('测试执行失败:', error);
            process.exit(1);
        }
    })();
}

module.exports = {
    runCriticalTests,
    quickViolationTest,
    runSingleTest,
    CRITICAL_TEST_CASES
};