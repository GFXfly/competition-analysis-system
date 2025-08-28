#!/usr/bin/env node

/**
 * 精准审查功能测试脚本
 * 测试基于《公平竞争审查条例实施办法》的精准审查功能
 */

const { performPrecisePreCheck, PRECISE_KEYWORDS, REGULATION_ARTICLES } = require('./services/preciseReviewService');

class PreciseReviewTester {
    constructor() {
        this.testCases = [
            {
                name: '无需审查案例 - 一般政策',
                text: '为促进经济发展，政府将加大对创新企业的支持力度，优化营商环境，提升服务质量。',
                expected: false
            },
            {
                name: '需要审查案例 - 限定特定经营者',
                text: '为支持本地经济发展，政府采购项目优先选择本地供应商，限定使用当地企业提供的产品和服务。',
                expected: true
            },
            {
                name: '需要审查案例 - 歧视性准入条件',
                text: '申请企业必须在本地注册满3年，并在本地设立分支机构，外地企业需提供额外的资质证明。',
                expected: true
            },
            {
                name: '边缘案例 - 少量关键词',
                text: '政策支持企业发展，对符合条件的企业给予税收优惠政策。',
                expected: false
            },
            {
                name: '高风险案例 - 多类别违规',
                text: '招标项目要求投标企业必须为本地注册企业，具有本地纳税记录，并限定使用指定供应商的产品，对本地企业给予财政补贴。',
                expected: true
            }
        ];
    }

    /**
     * 运行所有测试
     */
    async runTests() {
        console.log('🧪 开始精准审查功能测试...\n');
        
        // 显示法规信息
        this.showRegulationInfo();
        
        // 运行测试案例
        await this.runTestCases();
        
        // 测试关键词分类
        this.testKeywordClassification();
        
        console.log('\n✅ 精准审查功能测试完成！');
    }

    /**
     * 显示法规信息
     */
    showRegulationInfo() {
        console.log('📋 法规依据：《公平竞争审查条例实施办法》');
        console.log('📅 发布时间：国家市场监督管理总局2025年2月28日公布');
        console.log('🎯 审查范围：第9-25条，共4大类22项具体标准\n');
        
        console.log('📊 关键词分类统计：');
        for (const [category, data] of Object.entries(PRECISE_KEYWORDS)) {
            console.log(`  - ${data.category}: ${data.keywords.length}个关键词`);
        }
        console.log();
    }

    /**
     * 运行测试案例
     */
    async runTestCases() {
        console.log('🔍 开始测试案例分析...\n');
        
        let passedTests = 0;
        let totalTests = this.testCases.length;
        
        for (let i = 0; i < this.testCases.length; i++) {
            const testCase = this.testCases[i];
            console.log(`测试 ${i + 1}/${totalTests}: ${testCase.name}`);
            console.log(`文本: "${testCase.text}"`);
            
            try {
                const result = await performPrecisePreCheck(testCase.text);
                
                const passed = result.needsReview === testCase.expected;
                const status = passed ? '✅ 通过' : '❌ 失败';
                
                console.log(`预期: ${testCase.expected ? '需要审查' : '无需审查'}`);
                console.log(`实际: ${result.needsReview ? '需要审查' : '无需审查'}`);
                console.log(`置信度: ${(result.confidence * 100).toFixed(1)}%`);
                console.log(`判断理由: ${result.reason}`);
                
                if (result.matchedCategories && result.matchedCategories.length > 0) {
                    console.log('匹配类别:');
                    result.matchedCategories.forEach(cat => {
                        console.log(`  - ${cat.category}: ${cat.keywords.join(', ')}`);
                    });
                }
                
                console.log(`结果: ${status}\n`);
                
                if (passed) passedTests++;
                
            } catch (error) {
                console.log(`❌ 测试失败: ${error.message}\n`);
            }
        }
        
        console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过 (${(passedTests/totalTests*100).toFixed(1)}%)`);
    }

    /**
     * 测试关键词分类
     */
    testKeywordClassification() {
        console.log('\n🏷️  关键词分类测试：');
        
        const testKeywords = ['限定经营', '本地企业', '财政补贴', '歧视性标准', '经济贡献'];
        
        testKeywords.forEach(keyword => {
            let found = false;
            for (const [categoryKey, categoryData] of Object.entries(PRECISE_KEYWORDS)) {
                if (categoryData.keywords.includes(keyword)) {
                    console.log(`  "${keyword}" → ${categoryData.category} (${categoryData.severity}风险)`);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(`  "${keyword}" → 未分类`);
            }
        });
    }
}

/**
 * 主函数
 */
async function main() {
    const tester = new PreciseReviewTester();
    await tester.runTests();
}

// 运行测试
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 测试运行失败:', error);
        process.exit(1);
    });
}

module.exports = PreciseReviewTester;