/**
 * 🧪 增强AI分析能力测试套件
 * 全面测试优化后的分析系统性能和准确性
 */

const { 
    performEnhancedCompetitionAnalysis,
    quickCompetitionAnalysis,
    deepCompetitionAnalysis,
    getAnalysisPerformanceReport
} = require('./services/enhancedCompetitionAnalysisService');

const { findSimilarCases, getCaseStatistics } = require('./data/realCaseDatabase');
const { analyzeDeepSemantics } = require('./services/deepSemanticAnalyzer');
const { selectRelevantArticles } = require('./services/dynamicLegalLoader');
const { getOptimizedAIParams } = require('./config/optimizedAiParameters');

/**
 * 📋 测试案例数据集
 */
const TEST_CASES = {
    // 高风险案例 - 明显违规
    high_risk: {
        title: '本地企业优先政策',
        text: `为支持本地经济发展，制定以下政策措施：
        1. 在政府采购中，同等条件下优先选择本地注册企业
        2. 对年纳税额超过1000万元的本地企业，给予纳税额10%的财政奖励
        3. 外地企业参与本地项目投标，需在本市设立分公司并运营满一年
        4. 鼓励各部门优先采购本地产品，本地产品在评分中可加5分`,
        expectedViolations: ['第八条', '第十九条', '第二十一条', '第十四条'],
        expectedRiskLevel: 'high'
    },

    // 中等风险案例 - 隐性违规
    medium_risk: {
        title: '产业扶持政策',
        text: `为促进产业升级，出台产业扶持政策：
        1. 重点支持符合条件的优质企业发展
        2. 根据企业对地方经济贡献度，给予相应政策支持
        3. 优先考虑技术先进、管理规范的企业
        4. 建立企业分类管理制度，对不同类型企业实施差异化政策`,
        expectedViolations: ['第二十一条'],
        expectedRiskLevel: 'medium'
    },

    // 低风险案例 - 相对合规
    low_risk: {
        title: '环保标准制定',
        text: `为加强环境保护，制定行业环保标准：
        1. 所有企业必须达到国家环保标准
        2. 鼓励企业采用先进环保技术
        3. 建立环保监督检查制度
        4. 对环保违法行为依法处罚`,
        expectedViolations: [],
        expectedRiskLevel: 'low'
    }
};

/**
 * 🧪 测试控制器
 */
class EnhancedAnalysisTestSuite {
    constructor() {
        this.testResults = {
            performanceTests: [],
            accuracyTests: [],
            comparisonTests: [],
            featureTests: []
        };
        this.startTime = null;
        this.totalTests = 0;
        this.passedTests = 0;
    }

    /**
     * 🚀 执行完整测试套件
     */
    async runCompleteTestSuite() {
        console.log('🧪=== 启动增强AI分析能力测试套件 ===');
        this.startTime = Date.now();

        try {
            // 1. 基础功能测试
            console.log('\n📋 1. 基础功能测试...');
            await this.testBasicFunctionality();

            // 2. 性能基准测试
            console.log('\n⚡ 2. 性能基准测试...');
            await this.testPerformanceBenchmarks();

            // 3. 准确性验证测试
            console.log('\n🎯 3. 准确性验证测试...');
            await this.testAccuracyValidation();

            // 4. 分析模式对比测试
            console.log('\n🔄 4. 分析模式对比测试...');
            await this.testAnalysisModeComparison();

            // 5. 特殊功能测试
            console.log('\n🌟 5. 特殊功能测试...');
            await this.testSpecialFeatures();

            // 6. 压力测试
            console.log('\n💪 6. 压力测试...');
            await this.testSystemStress();

            // 生成测试报告
            this.generateTestReport();

        } catch (error) {
            console.error('❌ 测试套件执行失败:', error.message);
            this.generateErrorReport(error);
        }
    }

    /**
     * 📋 基础功能测试
     */
    async testBasicFunctionality() {
        const tests = [
            {
                name: '快速分析功能',
                test: () => quickCompetitionAnalysis(TEST_CASES.medium_risk.text)
            },
            {
                name: '深度分析功能', 
                test: () => deepCompetitionAnalysis(TEST_CASES.high_risk.text)
            },
            {
                name: '全面分析功能',
                test: () => performEnhancedCompetitionAnalysis(TEST_CASES.high_risk.text, {
                    analysisMode: 'comprehensive'
                })
            },
            {
                name: '案例匹配功能',
                test: () => findSimilarCases(TEST_CASES.high_risk.text, { maxResults: 3 })
            },
            {
                name: '深度语义分析',
                test: () => analyzeDeepSemantics(TEST_CASES.medium_risk.text)
            },
            {
                name: '动态法条选择',
                test: () => selectRelevantArticles(TEST_CASES.high_risk.text)
            }
        ];

        for (const testCase of tests) {
            await this.runSingleTest(testCase, 'basic');
        }
    }

    /**
     * ⚡ 性能基准测试
     */
    async testPerformanceBenchmarks() {
        const benchmarks = [
            {
                name: '快速分析响应时间',
                target: 30000, // 30秒
                test: async () => {
                    const start = Date.now();
                    await quickCompetitionAnalysis(TEST_CASES.medium_risk.text);
                    return Date.now() - start;
                }
            },
            {
                name: '全面分析响应时间',
                target: 120000, // 2分钟
                test: async () => {
                    const start = Date.now();
                    await performEnhancedCompetitionAnalysis(TEST_CASES.high_risk.text, {
                        analysisMode: 'comprehensive'
                    });
                    return Date.now() - start;
                }
            },
            {
                name: '深度分析响应时间',
                target: 180000, // 3分钟
                test: async () => {
                    const start = Date.now();
                    await deepCompetitionAnalysis(TEST_CASES.high_risk.text);
                    return Date.now() - start;
                }
            }
        ];

        for (const benchmark of benchmarks) {
            const result = await this.runPerformanceTest(benchmark);
            this.testResults.performanceTests.push(result);
        }
    }

    /**
     * 🎯 准确性验证测试
     */
    async testAccuracyValidation() {
        for (const [riskLevel, testCase] of Object.entries(TEST_CASES)) {
            console.log(`  测试案例: ${testCase.title} (${riskLevel})`);
            
            try {
                const result = await performEnhancedCompetitionAnalysis(testCase.text, {
                    analysisMode: 'comprehensive',
                    enableCaseReference: true,
                    enableDeepSemantics: true
                });

                const accuracy = this.evaluateAccuracy(result, testCase);
                
                this.testResults.accuracyTests.push({
                    testCase: testCase.title,
                    expectedRisk: testCase.expectedRiskLevel,
                    actualRisk: result.enhancedAnalysis?.overallRisk?.level,
                    expectedViolations: testCase.expectedViolations.length,
                    actualViolations: result.totalIssues,
                    accuracyScore: accuracy.score,
                    details: accuracy.details,
                    passed: accuracy.score >= 0.7
                });

                this.updateTestCounts(accuracy.score >= 0.7);

            } catch (error) {
                console.error(`  ❌ 测试失败: ${error.message}`);
                this.testResults.accuracyTests.push({
                    testCase: testCase.title,
                    error: error.message,
                    passed: false
                });
                this.updateTestCounts(false);
            }
        }
    }

    /**
     * 🔄 分析模式对比测试
     */
    async testAnalysisModeComparison() {
        const testText = TEST_CASES.high_risk.text;
        const modes = ['fast', 'comprehensive', 'deep'];
        const results = {};

        for (const mode of modes) {
            console.log(`  测试${mode}模式...`);
            
            try {
                const start = Date.now();
                const result = mode === 'fast' ? 
                    await quickCompetitionAnalysis(testText) :
                    mode === 'deep' ?
                    await deepCompetitionAnalysis(testText) :
                    await performEnhancedCompetitionAnalysis(testText, { analysisMode: mode });
                
                const processingTime = Date.now() - start;
                
                results[mode] = {
                    processingTime,
                    totalIssues: result.totalIssues,
                    riskLevel: result.enhancedAnalysis?.overallRisk?.level || 'unknown',
                    qualityScore: result.enhancedAnalysis?.qualityScore || 0,
                    confidenceLevel: result.enhancedAnalysis?.analysisMetadata?.confidenceLevel || 0
                };

                this.updateTestCounts(true);
                
            } catch (error) {
                console.error(`  ❌ ${mode}模式测试失败: ${error.message}`);
                results[mode] = { error: error.message };
                this.updateTestCounts(false);
            }
        }

        this.testResults.comparisonTests.push({
            type: 'mode_comparison',
            results,
            analysis: this.analyzeComparison(results)
        });
    }

    /**
     * 🌟 特殊功能测试
     */
    async testSpecialFeatures() {
        const specialTests = [
            {
                name: '隐含意图识别',
                test: async () => {
                    const result = await analyzeDeepSemantics('同等条件下优先选择本地供应商');
                    return result.implicitIntents?.pseudoFairness?.length > 0;
                }
            },
            {
                name: '案例相似度匹配',
                test: async () => {
                    const cases = await findSimilarCases('本地企业优先政策', { maxResults: 3 });
                    return cases.length > 0 && cases[0].relevanceScore > 0.5;
                }
            },
            {
                name: '动态参数优化',
                test: async () => {
                    const params = getOptimizedAIParams('semantic_understanding', {
                        textLength: 5000,
                        legalDensity: 0.8
                    });
                    return params.temperature !== undefined && params.max_tokens > 0;
                }
            },
            {
                name: '法条相关度计算',
                test: async () => {
                    const articles = await selectRelevantArticles('本地企业加分政策');
                    return articles.length > 0 && articles[0].score > 0;
                }
            }
        ];

        for (const test of specialTests) {
            try {
                const result = await test.test();
                this.testResults.featureTests.push({
                    name: test.name,
                    passed: result === true,
                    result
                });
                this.updateTestCounts(result === true);
            } catch (error) {
                console.error(`  ❌ ${test.name}测试失败: ${error.message}`);
                this.testResults.featureTests.push({
                    name: test.name,
                    passed: false,
                    error: error.message
                });
                this.updateTestCounts(false);
            }
        }
    }

    /**
     * 💪 压力测试
     */
    async testSystemStress() {
        console.log('  执行并发分析测试...');
        
        const concurrentTests = Array(3).fill(null).map(async (_, index) => {
            try {
                const testCase = Object.values(TEST_CASES)[index % 3];
                const result = await performEnhancedCompetitionAnalysis(testCase.text, {
                    analysisMode: 'fast'
                });
                return { success: true, issues: result.totalIssues };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        const results = await Promise.all(concurrentTests);
        const successCount = results.filter(r => r.success).length;
        
        this.testResults.performanceTests.push({
            name: '并发处理能力',
            totalTests: results.length,
            successCount,
            successRate: successCount / results.length,
            passed: successCount === results.length
        });

        this.updateTestCounts(successCount === results.length);
    }

    /**
     * 🧪 执行单个测试
     */
    async runSingleTest(testCase, category) {
        console.log(`  测试: ${testCase.name}...`);
        
        try {
            const start = Date.now();
            const result = await testCase.test();
            const duration = Date.now() - start;
            
            const success = result !== null && result !== undefined;
            
            this.testResults[`${category}Tests`] = this.testResults[`${category}Tests`] || [];
            this.testResults[`${category}Tests`].push({
                name: testCase.name,
                duration,
                success,
                result: success ? '通过' : '失败'
            });

            this.updateTestCounts(success);
            
            if (success) {
                console.log(`    ✅ ${testCase.name} - 通过 (${duration}ms)`);
            } else {
                console.log(`    ❌ ${testCase.name} - 失败`);
            }
            
        } catch (error) {
            console.error(`    ❌ ${testCase.name} - 错误: ${error.message}`);
            this.updateTestCounts(false);
        }
    }

    /**
     * ⚡ 执行性能测试
     */
    async runPerformanceTest(benchmark) {
        console.log(`  性能测试: ${benchmark.name}...`);
        
        try {
            const actualTime = await benchmark.test();
            const passed = actualTime <= benchmark.target;
            
            console.log(`    ${passed ? '✅' : '❌'} ${benchmark.name}: ${actualTime}ms (目标: ${benchmark.target}ms)`);
            
            this.updateTestCounts(passed);
            
            return {
                name: benchmark.name,
                targetTime: benchmark.target,
                actualTime,
                passed,
                performance: actualTime <= benchmark.target ? 'excellent' : 
                           actualTime <= benchmark.target * 1.5 ? 'acceptable' : 'poor'
            };
            
        } catch (error) {
            console.error(`    ❌ ${benchmark.name} - 错误: ${error.message}`);
            this.updateTestCounts(false);
            
            return {
                name: benchmark.name,
                error: error.message,
                passed: false
            };
        }
    }

    /**
     * 📊 评估准确性
     */
    evaluateAccuracy(result, expectedTestCase) {
        let score = 0;
        const details = [];

        // 风险级别准确性 (40分)
        const actualRisk = result.enhancedAnalysis?.overallRisk?.level;
        if (actualRisk === expectedTestCase.expectedRiskLevel) {
            score += 40;
            details.push(`风险级别准确: ${actualRisk}`);
        } else {
            details.push(`风险级别偏差: 期望${expectedTestCase.expectedRiskLevel}, 实际${actualRisk}`);
        }

        // 违规数量准确性 (30分)
        const expectedCount = expectedTestCase.expectedViolations.length;
        const actualCount = result.totalIssues;
        const countAccuracy = Math.max(0, 1 - Math.abs(expectedCount - actualCount) / Math.max(expectedCount, actualCount, 1));
        score += countAccuracy * 30;
        details.push(`违规数量匹配度: ${Math.round(countAccuracy * 100)}% (期望${expectedCount}, 实际${actualCount})`);

        // 分析质量 (30分)
        const qualityScore = result.enhancedAnalysis?.qualityScore || 0;
        score += (qualityScore / 100) * 30;
        details.push(`分析质量分数: ${qualityScore}`);

        return {
            score: score / 100,
            details
        };
    }

    /**
     * 📈 对比分析
     */
    analyzeComparison(results) {
        const analysis = {
            fastestMode: null,
            mostAccurateMode: null,
            bestBalanceMode: null,
            recommendations: []
        };

        // 找出最快模式
        let minTime = Infinity;
        Object.entries(results).forEach(([mode, data]) => {
            if (data.processingTime && data.processingTime < minTime) {
                minTime = data.processingTime;
                analysis.fastestMode = mode;
            }
        });

        // 找出最准确模式
        let maxQuality = 0;
        Object.entries(results).forEach(([mode, data]) => {
            if (data.qualityScore && data.qualityScore > maxQuality) {
                maxQuality = data.qualityScore;
                analysis.mostAccurateMode = mode;
            }
        });

        // 推荐最佳平衡模式
        let bestBalance = 0;
        Object.entries(results).forEach(([mode, data]) => {
            if (data.qualityScore && data.processingTime) {
                const balanceScore = data.qualityScore / (data.processingTime / 1000); // 质量/秒
                if (balanceScore > bestBalance) {
                    bestBalance = balanceScore;
                    analysis.bestBalanceMode = mode;
                }
            }
        });

        // 生成建议
        analysis.recommendations = [
            `性能优先选择: ${analysis.fastestMode}`,
            `质量优先选择: ${analysis.mostAccurateMode}`,
            `平衡选择: ${analysis.bestBalanceMode}`
        ];

        return analysis;
    }

    /**
     * 📊 更新测试计数
     */
    updateTestCounts(passed) {
        this.totalTests++;
        if (passed) this.passedTests++;
    }

    /**
     * 📋 生成测试报告
     */
    generateTestReport() {
        const totalTime = Date.now() - this.startTime;
        const successRate = this.totalTests > 0 ? (this.passedTests / this.totalTests) * 100 : 0;

        console.log('\n🏆=== 测试报告 ===');
        console.log(`📊 总体统计:`);
        console.log(`   总测试数: ${this.totalTests}`);
        console.log(`   通过测试: ${this.passedTests}`);
        console.log(`   成功率: ${Math.round(successRate)}%`);
        console.log(`   总耗时: ${Math.round(totalTime / 1000)}秒`);

        // 性能测试报告
        if (this.testResults.performanceTests.length > 0) {
            console.log(`\n⚡ 性能测试结果:`);
            this.testResults.performanceTests.forEach(test => {
                const status = test.passed ? '✅' : '❌';
                if (test.actualTime) {
                    console.log(`   ${status} ${test.name}: ${test.actualTime}ms (${test.performance})`);
                } else {
                    console.log(`   ${status} ${test.name}: ${test.successRate ? `成功率${Math.round(test.successRate * 100)}%` : '失败'}`);
                }
            });
        }

        // 准确性测试报告
        if (this.testResults.accuracyTests.length > 0) {
            console.log(`\n🎯 准确性测试结果:`);
            this.testResults.accuracyTests.forEach(test => {
                const status = test.passed ? '✅' : '❌';
                console.log(`   ${status} ${test.testCase}: 准确度${Math.round((test.accuracyScore || 0) * 100)}%`);
            });
        }

        // 特殊功能测试报告
        if (this.testResults.featureTests.length > 0) {
            console.log(`\n🌟 特殊功能测试结果:`);
            this.testResults.featureTests.forEach(test => {
                const status = test.passed ? '✅' : '❌';
                console.log(`   ${status} ${test.name}`);
            });
        }

        // 分析模式对比报告
        if (this.testResults.comparisonTests.length > 0) {
            console.log(`\n🔄 分析模式对比:`);
            const comparison = this.testResults.comparisonTests[0];
            if (comparison.analysis) {
                console.log(`   最快模式: ${comparison.analysis.fastestMode}`);
                console.log(`   最准确模式: ${comparison.analysis.mostAccurateMode}`);
                console.log(`   最佳平衡: ${comparison.analysis.bestBalanceMode}`);
            }
        }

        // 性能报告
        try {
            const performanceReport = getAnalysisPerformanceReport();
            console.log(`\n📈 系统性能指标:`);
            console.log(`   总分析次数: ${performanceReport.totalAnalyses}`);
            console.log(`   成功率: ${Math.round(performanceReport.successRate * 100)}%`);
            console.log(`   平均处理时间: ${Math.round(performanceReport.averageProcessingTime)}ms`);
            console.log(`   平均质量分数: ${Math.round(performanceReport.averageQuality)}`);
        } catch (error) {
            console.log(`   性能指标获取失败: ${error.message}`);
        }

        // 总结建议
        console.log(`\n💡 建议:`);
        if (successRate >= 90) {
            console.log(`   🎉 系统表现优秀！所有核心功能运行正常。`);
        } else if (successRate >= 70) {
            console.log(`   👍 系统表现良好，但仍有改进空间。`);
        } else {
            console.log(`   ⚠️ 系统需要进一步优化，存在较多问题。`);
        }

        // 保存详细报告到文件
        this.saveDetailedReport();
    }

    /**
     * ❌ 生成错误报告
     */
    generateErrorReport(error) {
        console.log('\n❌=== 测试失败报告 ===');
        console.log(`错误信息: ${error.message}`);
        console.log(`堆栈跟踪: ${error.stack}`);
        console.log(`已完成测试: ${this.passedTests}/${this.totalTests}`);
    }

    /**
     * 💾 保存详细报告
     */
    saveDetailedReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: this.totalTests,
                passedTests: this.passedTests,
                successRate: this.totalTests > 0 ? this.passedTests / this.totalTests : 0,
                totalTime: Date.now() - this.startTime
            },
            results: this.testResults,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage()
            }
        };

        require('fs').writeFileSync(
            'enhanced_ai_test_report.json',
            JSON.stringify(report, null, 2),
            'utf8'
        );

        console.log(`\n💾 详细测试报告已保存至: enhanced_ai_test_report.json`);
    }
}

/**
 * 🚀 执行测试
 */
async function runTests() {
    const testSuite = new EnhancedAnalysisTestSuite();
    await testSuite.runCompleteTestSuite();
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    runTests().catch(error => {
        console.error('💥 测试执行失败:', error);
        process.exit(1);
    });
}

module.exports = {
    EnhancedAnalysisTestSuite,
    TEST_CASES,
    runTests
};