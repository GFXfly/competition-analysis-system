const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType, Header, Footer, PageNumber } = require('docx');

/**
 * 生成Word审查报告
 */
async function generateWordReport(result, fileName) {
    console.log('开始创建Word文档...');
    
    // 确保数据结构完整性
    const safeResult = {
        totalIssues: result.totalIssues || 0,
        issues: Array.isArray(result.issues) ? result.issues : [],
        fileName: result.fileName || fileName || '未知文件',
        fileSize: result.fileSize || 0,
        rawResponse: result.rawResponse || '无详细响应',
        processingMethod: result.processingMethod || 'unknown'
    };
    
    // 处理文件名
    let cleanFileName = safeResult.fileName.replace(/\.[^/.]+$/, ""); // 移除扩展名
    
    // 处理文件名编码问题
    try {
        if (cleanFileName.includes('\ufffd') || /[\x00-\x1F\x7F-\x9F]/.test(cleanFileName)) {
            console.log('检测到文件名编码问题，尝试修复...');
            cleanFileName = fileName ? fileName.replace(/\.[^/.]+$/, "") : '关于推动经济高质量发展若干政策';
        }
    } catch (e) {
        console.log('文件名修复失败，使用默认值');
        cleanFileName = '关于推动经济高质量发展若干政策';
    }
    
    console.log('最终使用的文件名:', cleanFileName);
    
    const paragraphs = [];
    
    // 创建标题
    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `《${cleanFileName}》公平竞争审查报告`,
                    bold: true,
                    size: 32,
                    color: "000000"
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        })
    );
    
    // 问题数量统计
    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `发现 `,
                    size: 28,
                    color: "000000"
                }),
                new TextRun({
                    text: `${safeResult.totalIssues}`,
                    size: 28,
                    color: "FF0000",
                    bold: true
                }),
                new TextRun({
                    text: ` 个问题`,
                    size: 28,
                    color: "000000"
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        })
    );
    
    // 审查依据
    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "审查依据：《公平竞争审查条例实施办法》（国家市场监督管理总局 2025 年 2 月 28 日公布）",
                    size: 24
                })
            ],
            spacing: { after: 400 }
        })
    );
    
    // 添加问题详情
    if (safeResult.issues && safeResult.issues.length > 0) {
        console.log(`处理 ${safeResult.issues.length} 个问题详情...`);
        
        safeResult.issues.forEach((issue, index) => {
            // 问题标题
            paragraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `问题 ${index + 1}：${issue.title || '未命名问题'}`,
                            bold: true,
                            size: 24,
                            color: "000000"
                        })
                    ],
                    spacing: { before: 400, after: 200 },
                    indent: { left: 200, right: 200 }
                })
            );
            
            // 问题描述
            if (issue.description) {
                paragraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "问题描述：",
                                bold: true,
                                size: 20
                            }),
                            new TextRun({
                                text: cleanText(issue.description),
                                size: 20
                            })
                        ],
                        spacing: { after: 200 },
                        indent: { left: 400 }
                    })
                );
            }
            
            // 原文引用
            if (issue.quote) {
                paragraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: cleanText(issue.quote),
                                size: 20,
                                italics: true,
                                color: "666666"
                            })
                        ],
                        spacing: { after: 200 },
                        indent: { left: 400 }
                    })
                );
            }
            
            // 违反条款
            if (issue.violation) {
                paragraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "违反条款：",
                                bold: true,
                                size: 20
                            }),
                            new TextRun({
                                text: cleanText(issue.violation),
                                size: 20
                            })
                        ],
                        spacing: { after: 200 },
                        indent: { left: 400 }
                    })
                );
            }
            
            // 修改建议
            if (issue.suggestion) {
                paragraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "修改建议：",
                                bold: true,
                                size: 20
                            })
                        ],
                        spacing: { after: 100 },
                        indent: { left: 400 }
                    })
                );
                
                // 处理建议内容
                const suggestions = String(issue.suggestion || '').split(/\d+\.\s/).filter(s => s.trim());
                suggestions.forEach((suggestion, suggestionIndex) => {
                    if (suggestion.trim()) {
                        paragraphs.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${suggestionIndex + 1}. ${suggestion.trim()}`,
                                        size: 20
                                    })
                                ],
                                spacing: { after: 100 },
                                indent: { left: 500 }
                            })
                        );
                    }
                });
            }
        });
    }
    
    // 添加页脚信息
    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "本报告由 AI 自动生成，仅供参考。内容如有疑问，请以相关法律法规为准。",
                    size: 20,
                    color: "666666"
                })
            ],
            spacing: { before: 600, after: 200 },
            alignment: AlignmentType.CENTER
        })
    );
    
    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `生成时间：${new Date().toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    }).replace(/\//g, '/')}`,
                    size: 20,
                    color: "666666"
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        })
    );
    
    // 创建Word文档
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440,    // 1 inch = 1440 twips
                        right: 1440,
                        bottom: 1440,
                        left: 1440,
                    },
                },
            },
            headers: {
                default: new Header({
                    children: [],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    children: ["第 ", PageNumber.CURRENT, " 页"],
                                    size: 18,
                                    color: "666666"
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                    ],
                }),
            },
            children: paragraphs
        }]
    });
    
    console.log("开始生成Word文档buffer...");
    
    // 生成Word文档
    const buffer = await Packer.toBuffer(doc);
    
    console.log("Word文档生成成功，大小:", buffer.length);
    
    return buffer;
}

/**
 * 清理文本内容
 */
function cleanText(text) {
    if (!text) return '';
    return String(text).replace(/[\x00-\x1F\x7F]/g, '');
}

module.exports = {
    generateWordReport
};