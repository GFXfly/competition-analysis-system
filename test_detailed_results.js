/**
 * 测试详细审查结果解析
 */
const DeepSeekService = require('./services/deepseekService');
require('dotenv').config();

console.log('=== 测试详细审查结果解析 ===');

async function testDetailedResults() {
    try {
        const deepSeekService = new DeepSeekService();
        
        // 创建一个包含明确公平竞争问题的测试文档
        const testDocument = `
        关于支持本地企业发展的若干措施

        第一条 政府采购优惠政策
        本地注册企业在参与政府采购时，可享受投标价格10%的优惠。
        外地企业参与政府采购需额外缴纳3%的管理费。

        第二条 市场准入限制
        特定行业（包括建筑、运输、餐饮）仅限本地企业经营。
        外地企业进入上述行业需经过特殊审批程序。

        第三条 税收优惠
        对本地企业减免所得税30%，营业税减半征收。
        外地企业不享受此类税收优惠政策。
        `;
        
        console.log('📝 测试文档内容：');
        console.log(testDocument.trim());
        
        console.log('\n🔍 开始详细审查...');
        
        // 调用详细审查API
        const result = await deepSeekService.callDetailedReviewAPI(testDocument);
        
        console.log('\n=== 审查结果分析 ===');
        console.log('✅ API调用完成');
        console.log(`📊 问题总数: ${result.totalIssues}`);
        console.log(`📋 问题列表长度: ${result.issues ? result.issues.length : 0}`);
        
        if (result.issues && result.issues.length > 0) {
            console.log('\n📋 详细问题列表：');
            console.log('=' .repeat(80));
            
            result.issues.forEach((issue, index) => {
                console.log(`\n🚨 问题 ${index + 1}:`);
                console.log(`   📌 标题: ${issue.title || '未提供标题'}`);
                console.log(`   📝 描述: ${issue.description || '未提供描述'}`);
                console.log(`   📄 原文引用: ${issue.quote || '未提供原文引用'}`);
                console.log(`   ⚖️ 违反条款: ${issue.violation || '未提供违反条款'}`);
                console.log(`   💡 修改建议: ${issue.suggestion || '未提供修改建议'}`);
                console.log('   ' + '-'.repeat(60));
            });
            
            // 验证每个问题是否包含完整信息
            let completeIssues = 0;
            result.issues.forEach((issue, index) => {
                const hasTitle = issue.title && issue.title.trim() !== '';
                const hasDescription = issue.description && issue.description.trim() !== '';
                const hasQuote = issue.quote && issue.quote.trim() !== '';
                const hasViolation = issue.violation && issue.violation.trim() !== '';
                const hasSuggestion = issue.suggestion && issue.suggestion.trim() !== '';
                
                const completeness = [hasTitle, hasDescription, hasQuote, hasViolation, hasSuggestion].filter(Boolean).length;
                
                if (completeness >= 4) {
                    completeIssues++;
                }
                
                console.log(`\n✅ 问题${index + 1}完整性检查: ${completeness}/5 项完整`);
                if (completeness < 4) {
                    console.log(`   ⚠️ 缺少: ${!hasTitle ? '标题 ' : ''}${!hasDescription ? '描述 ' : ''}${!hasQuote ? '原文引用 ' : ''}${!hasViolation ? '违反条款 ' : ''}${!hasSuggestion ? '修改建议' : ''}`);
                }
            });
            
            console.log('\n📊 质量评估：');
            console.log(`   完整问题数: ${completeIssues}/${result.issues.length}`);
            console.log(`   完整率: ${((completeIssues / result.issues.length) * 100).toFixed(1)}%`);
            
            if (completeIssues === result.issues.length) {
                console.log('   🎉 所有问题都包含完整信息！');
            } else {
                console.log('   ⚠️ 部分问题信息不完整，需要改进AI提示词或解析逻辑');
            }
            
        } else {
            console.log('\n❌ 没有解析到具体问题');
            console.log('原始响应（前1000字符）:');
            console.log(result.rawResponse ? result.rawResponse.substring(0, 1000) : '无原始响应');
        }
        
        console.log('\n=== 测试结论 ===');
        if (result.issues && result.issues.length > 0) {
            const hasDetailedInfo = result.issues.some(issue => 
                issue.quote && issue.violation && issue.suggestion
            );
            
            if (hasDetailedInfo) {
                console.log('✅ 详细审查结果解析成功！');
                console.log('✅ 包含原文引用、违反条款、修改建议等详细信息');
            } else {
                console.log('⚠️ 审查结果解析部分成功，但缺少详细信息');
                console.log('💡 建议优化AI提示词或解析策略');
            }
        } else {
            console.log('❌ 审查结果解析失败');
            console.log('💡 需要检查AI响应格式或解析逻辑');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误详情:', error.stack);
    }
}

// 运行测试
testDetailedResults();