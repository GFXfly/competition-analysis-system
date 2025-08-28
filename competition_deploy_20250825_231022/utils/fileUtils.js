const mammoth = require('mammoth');

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 清理提取的文本
 */
function cleanExtractedText(text) {
    return text
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ' ') // 移除控制字符但保留换行和制表符
        .replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ' ') // 保留ASCII、中文、中文标点和全角字符
        .replace(/\s+/g, ' ') // 合并多个空格
        .trim();
}

/**
 * 评估文本质量（返回0-100的分数）
 */
function evaluateTextQuality(text) {
    if (!text || text.length < 10) return 0;
    
    let score = 0;
    
    // 长度分数 (0-20)
    const lengthScore = Math.min(text.length / 1000 * 20, 20);
    score += lengthScore;
    
    // 中文字符比例 (0-30)
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const chineseRatio = chineseChars / text.length;
    const chineseScore = chineseRatio * 30;
    score += chineseScore;
    
    // 可读性分数 (0-30)
    const readableChars = (text.match(/[\u4e00-\u9fff\w\s]/g) || []).length;
    const readableRatio = readableChars / text.length;
    const readableScore = readableRatio * 30;
    score += readableScore;
    
    // 连续有效字符 (0-20)
    const validSequences = text.match(/[\u4e00-\u9fff\w]{3,}/g) || [];
    const sequenceScore = Math.min(validSequences.length / 10 * 20, 20);
    score += sequenceScore;
    
    console.log(`文本质量评估 - 总长度:${text.length}, 中文字符:${chineseChars}, 可读比例:${(readableRatio*100).toFixed(1)}%, 总分:${score.toFixed(1)}`);
    
    return score;
}

/**
 * 提取文本内容 (优化版本)
 */
async function extractTextFromFile(file) {
    console.log('📄 开始提取文档内容...');
    console.log('文件信息:', {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype
    });
    
    try {
        // 检查文件是否为空
        if (!file.buffer || file.buffer.length === 0) {
            throw new Error('文件为空或损坏');
        }

        // 获取文件扩展名
        const fileExt = file.originalname ? file.originalname.split('.').pop().toLowerCase() : '';
        console.log('文件扩展名:', fileExt);

        // 支持 .docx 文件 (Office Open XML)
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
            fileExt === 'docx') {
            return await extractDocxContent(file);
        } 
        // 支持 .doc 文件 (传统的 Word 文档)
        else if (file.mimetype === 'application/msword' || fileExt === 'doc') {
            return await extractDocContent(file);
        } 
        // 支持文本文件
        else if (file.mimetype === 'text/plain' || fileExt === 'txt') {
            return await extractTextContent(file);
        } else {
            throw new Error(`不支持的文件类型: ${file.mimetype}。当前仅支持 .docx 和 .doc 格式文件。`);
        }
    } catch (error) {
        console.error('❌ 提取文本时出错:', error);
        throw error;
    }
}

/**
 * 提取DOCX文件内容
 */
async function extractDocxContent(file) {
    console.log('🔄 使用mammoth提取DOCX文件内容...');
    
    try {
        const result = await mammoth.extractRawText({ 
            buffer: file.buffer,
            options: {
                includeDefaultStyleMap: true
            }
        });
        
        if (result.value && result.value.trim().length > 0) {
            console.log('✅ DOCX文件内容提取成功，长度:', result.value.length);
            return result.value;
        } else {
            throw new Error('文档内容为空');
        }
    } catch (mammothError) {
        console.warn('⚠️ mammoth提取失败，尝试其他方法:', mammothError.message);
        throw new Error(`无法读取DOCX文件内容: ${mammothError.message}`);
    }
}

/**
 * 提取DOC文件内容
 */
async function extractDocContent(file) {
    console.log('🔄 使用mammoth提取DOC文件内容...');
    
    try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        
        if (result.value && result.value.trim().length > 0) {
            console.log('✅ DOC文件内容提取成功，长度:', result.value.length);
            return result.value;
        } else {
            throw new Error('文档内容为空');
        }
    } catch (mammothError) {
        console.warn('⚠️ mammoth提取DOC失败:', mammothError.message);
        return await extractDocContentWithFallback(file);
    }
}

/**
 * DOC文件内容提取备用方法
 */
async function extractDocContentWithFallback(file) {
    console.log('🔄 尝试高级文本提取方法...');
    
    let bestExtraction = null;
    let bestScore = 0;
    
    // 方法1: UTF-8解码
    try {
        console.log('  - 尝试UTF-8解码...');
        const utf8Text = file.buffer.toString('utf8');
        const cleanedText = cleanExtractedText(utf8Text);
        const score = evaluateTextQuality(cleanedText);
        console.log(`  - UTF-8方法得分: ${score}, 长度: ${cleanedText.length}`);
        
        if (score > bestScore && cleanedText.length > 100) {
            bestScore = score;
            bestExtraction = {
                text: cleanedText,
                method: 'UTF-8'
            };
        }
    } catch (e) {
        console.log('  - UTF-8解码失败');
    }
    
    // 方法2: GBK解码 (如果iconv-lite可用)
    try {
        console.log('  - 尝试GBK解码...');
        const iconv = require('iconv-lite');
        if (iconv.encodingExists('gbk')) {
            const gbkText = iconv.decode(file.buffer, 'gbk');
            const cleanedText = cleanExtractedText(gbkText);
            const score = evaluateTextQuality(cleanedText);
            console.log(`  - GBK方法得分: ${score}, 长度: ${cleanedText.length}`);
            
            if (score > bestScore && cleanedText.length > 100) {
                bestScore = score;
                bestExtraction = {
                    text: cleanedText,
                    method: 'GBK'
                };
            }
        }
    } catch (e) {
        console.log('  - GBK解码失败');
    }
    
    if (bestExtraction && bestScore > 0) {
        console.log(`✅ 最佳提取方法: ${bestExtraction.method}，得分: ${bestScore}`);
        return bestExtraction.text;
    } else {
        throw new Error('无法读取该DOC文件格式，请尝试将文件转换为.docx格式后重新上传。');
    }
}

/**
 * 提取文本文件内容
 */
async function extractTextContent(file) {
    console.log('🔄 提取文本文件内容...');
    const textContent = file.buffer.toString('utf-8');
    console.log('✅ 文本文件提取成功，长度:', textContent.length);
    return textContent;
}

module.exports = {
    formatFileSize,
    cleanExtractedText,
    evaluateTextQuality,
    extractTextFromFile
};