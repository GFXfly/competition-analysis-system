const { Readable, Transform, Writable } = require('stream');
const { pipeline } = require('stream/promises');
const { APP_CONFIG } = require('../config/constants');

/**
 * 大文本流式处理器
 * 用于处理大型文档，避免内存溢出
 */
class TextProcessor extends Transform {
    constructor(options = {}) {
        super({
            objectMode: false,
            ...options
        });
        
        this.maxLength = options.maxLength || APP_CONFIG.MAX_TEXT_LENGTH;
        this.chunkSize = options.chunkSize || 4096;
        this.processedLength = 0;
        this.buffer = '';
        this.encoding = options.encoding || 'utf8';
        this.preserveStructure = options.preserveStructure !== false;
        
        console.log(`📄 文本处理器初始化 - 最大长度: ${this.maxLength}, 块大小: ${this.chunkSize}`);
    }

    _transform(chunk, encoding, callback) {
        try {
            // 将缓冲区数据转换为字符串
            const chunkStr = chunk.toString(this.encoding);
            this.buffer += chunkStr;

            // 检查是否超过最大长度
            if (this.processedLength + this.buffer.length > this.maxLength) {
                const remainingLength = this.maxLength - this.processedLength;
                if (remainingLength > 0) {
                    this.buffer = this.buffer.substring(0, remainingLength);
                } else {
                    this.buffer = '';
                }
            }

            // 处理完整的行或段落
            if (this.preserveStructure) {
                this._processStructuredText();
            } else {
                this._processPlainText();
            }

            callback();
        } catch (error) {
            callback(error);
        }
    }

    _processStructuredText() {
        const lines = this.buffer.split('\n');
        
        // 保留最后一行（可能不完整）
        if (lines.length > 1) {
            const lastLine = lines.pop();
            const processedText = lines.join('\n') + '\n';
            
            if (this.processedLength + processedText.length <= this.maxLength) {
                this.push(processedText);
                this.processedLength += processedText.length;
            }
            
            this.buffer = lastLine;
        }
    }

    _processPlainText() {
        if (this.buffer.length >= this.chunkSize) {
            const processChunk = this.buffer.substring(0, this.chunkSize);
            this.push(processChunk);
            this.processedLength += processChunk.length;
            this.buffer = this.buffer.substring(this.chunkSize);
        }
    }

    _flush(callback) {
        // 处理剩余的缓冲区内容
        if (this.buffer.length > 0 && this.processedLength < this.maxLength) {
            const remainingLength = this.maxLength - this.processedLength;
            const finalChunk = this.buffer.substring(0, remainingLength);
            this.push(finalChunk);
            this.processedLength += finalChunk.length;
        }
        
        console.log(`✅ 文本处理完成 - 处理长度: ${this.processedLength} 字符`);
        callback();
    }

    getProcessedLength() {
        return this.processedLength;
    }
}

/**
 * 文本清理转换器
 */
class TextCleaner extends Transform {
    constructor(options = {}) {
        super({
            objectMode: false,
            ...options
        });
        
        this.removeControlChars = options.removeControlChars !== false;
        this.normalizeWhitespace = options.normalizeWhitespace !== false;
        this.removeDuplicateLines = options.removeDuplicateLines || false;
        this.seenLines = new Set();
    }

    _transform(chunk, encoding, callback) {
        try {
            let text = chunk.toString('utf8');
            
            // 移除控制字符
            if (this.removeControlChars) {
                text = this._removeControlCharacters(text);
            }
            
            // 规范化空白字符
            if (this.normalizeWhitespace) {
                text = this._normalizeWhitespace(text);
            }
            
            // 移除重复行
            if (this.removeDuplicateLines) {
                text = this._removeDuplicateLines(text);
            }
            
            this.push(text);
            callback();
        } catch (error) {
            callback(error);
        }
    }

    _removeControlCharacters(text) {
        // 移除控制字符，但保留换行符、制表符和回车符
        return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    _normalizeWhitespace(text) {
        return text
            .replace(/\r\n/g, '\n')  // 统一换行符
            .replace(/\r/g, '\n')    // Mac格式换行符
            .replace(/\t/g, '    ')  // 制表符转换为4个空格
            .replace(/ +/g, ' ')     // 多个空格合并为一个
            .replace(/\n +/g, '\n'); // 移除行首空格
    }

    _removeDuplicateLines(text) {
        const lines = text.split('\n');
        const uniqueLines = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!this.seenLines.has(trimmedLine)) {
                this.seenLines.add(trimmedLine);
                uniqueLines.push(line);
            }
        }
        
        return uniqueLines.join('\n');
    }
}

/**
 * 文本统计收集器
 */
class TextStatistics extends Writable {
    constructor(options = {}) {
        super({
            objectMode: false,
            ...options
        });
        
        this.stats = {
            totalChars: 0,
            totalLines: 0,
            totalWords: 0,
            totalParagraphs: 0,
            averageLineLength: 0,
            averageWordsPerLine: 0,
            charFrequency: {},
            encoding: 'utf8'
        };
    }

    _write(chunk, encoding, callback) {
        try {
            const text = chunk.toString('utf8');
            
            // 字符统计
            this.stats.totalChars += text.length;
            
            // 行统计
            const lines = text.split('\n');
            this.stats.totalLines += lines.length - 1; // 最后一行可能不完整
            
            // 词统计
            const words = text.match(/\b\w+\b/g) || [];
            this.stats.totalWords += words.length;
            
            // 段落统计
            const paragraphs = text.split(/\n\s*\n/);
            this.stats.totalParagraphs += paragraphs.length - 1;
            
            // 字符频率统计
            for (const char of text) {
                this.stats.charFrequency[char] = (this.stats.charFrequency[char] || 0) + 1;
            }
            
            callback();
        } catch (error) {
            callback(error);
        }
    }

    _final(callback) {
        // 计算平均值
        if (this.stats.totalLines > 0) {
            this.stats.averageLineLength = Math.round(this.stats.totalChars / this.stats.totalLines);
            this.stats.averageWordsPerLine = Math.round(this.stats.totalWords / this.stats.totalLines * 100) / 100;
        }
        
        console.log('📊 文本统计完成:', {
            chars: this.stats.totalChars,
            lines: this.stats.totalLines,
            words: this.stats.totalWords,
            paragraphs: this.stats.totalParagraphs
        });
        
        callback();
    }

    getStatistics() {
        return { ...this.stats };
    }
}

/**
 * 文本处理工具类
 */
class TextProcessingUtils {
    /**
     * 处理大型文本文件
     */
    static async processLargeText(text, options = {}) {
        const maxLength = options.maxLength || APP_CONFIG.MAX_TEXT_LENGTH;
        const chunkSize = options.chunkSize || 4096;
        const collectStats = options.collectStats || false;
        const cleanText = options.cleanText || false;

        try {
            console.log(`🔄 开始处理大型文本 - 原始长度: ${text.length} 字符`);

            // 创建输入流
            const inputStream = Readable.from([text]);
            
            // 创建处理管道
            const transforms = [];
            
            // 添加文本清理器
            if (cleanText) {
                transforms.push(new TextCleaner(options.cleanOptions));
            }
            
            // 添加文本处理器
            const processor = new TextProcessor({
                maxLength,
                chunkSize,
                preserveStructure: options.preserveStructure
            });
            transforms.push(processor);
            
            // 创建输出收集器
            const chunks = [];
            const outputStream = new Writable({
                write(chunk, encoding, callback) {
                    chunks.push(chunk);
                    callback();
                }
            });

            // 可选的统计收集器
            let statsCollector = null;
            if (collectStats) {
                statsCollector = new TextStatistics();
                transforms.push(statsCollector);
            }

            transforms.push(outputStream);

            // 执行管道处理
            await pipeline(inputStream, ...transforms);

            // 合并结果
            const processedText = Buffer.concat(chunks).toString('utf8');
            
            const result = {
                text: processedText,
                originalLength: text.length,
                processedLength: processedText.length,
                truncated: processedText.length < text.length
            };

            // 添加统计信息
            if (collectStats && statsCollector) {
                result.statistics = statsCollector.getStatistics();
            }

            console.log(`✅ 文本处理完成 - 输出长度: ${result.processedLength} 字符`);
            
            return result;

        } catch (error) {
            console.error('❌ 文本处理失败:', error.message);
            throw error;
        }
    }

    /**
     * 智能文本截断
     */
    static smartTruncate(text, maxLength, options = {}) {
        if (text.length <= maxLength) {
            return text;
        }

        const preserveSentences = options.preserveSentences !== false;
        const preserveWords = options.preserveWords !== false;
        const suffix = options.suffix || '...';

        let truncated = text.substring(0, maxLength - suffix.length);

        if (preserveSentences) {
            // 在句子边界截断
            const sentenceEnds = /[.!?。！？]\s/g;
            let lastMatch;
            let match;
            
            while ((match = sentenceEnds.exec(truncated)) !== null) {
                lastMatch = match;
            }
            
            if (lastMatch) {
                truncated = truncated.substring(0, lastMatch.index + 1);
            }
        } else if (preserveWords) {
            // 在单词边界截断
            const lastSpaceIndex = truncated.lastIndexOf(' ');
            if (lastSpaceIndex > 0) {
                truncated = truncated.substring(0, lastSpaceIndex);
            }
        }

        return truncated + suffix;
    }

    /**
     * 检测文本编码
     */
    static detectEncoding(buffer) {
        // 检测BOM
        if (buffer.length >= 3) {
            const bom = buffer.subarray(0, 3);
            if (bom[0] === 0xEF && bom[1] === 0xBB && bom[2] === 0xBF) {
                return 'utf8';
            }
        }
        
        if (buffer.length >= 2) {
            const bom2 = buffer.subarray(0, 2);
            if (bom2[0] === 0xFF && bom2[1] === 0xFE) {
                return 'utf16le';
            }
            if (bom2[0] === 0xFE && bom2[1] === 0xFF) {
                return 'utf16be';
            }
        }

        // 简单的UTF-8检测
        try {
            const text = buffer.toString('utf8');
            // 检查是否包含无效的UTF-8序列
            if (text.includes('\uFFFD')) {
                return 'latin1'; // 可能是其他编码
            }
            return 'utf8';
        } catch (error) {
            return 'binary';
        }
    }

    /**
     * 安全地转换为字符串
     */
    static safeToString(buffer, encoding = 'utf8') {
        try {
            const detectedEncoding = this.detectEncoding(buffer);
            const actualEncoding = encoding === 'auto' ? detectedEncoding : encoding;
            
            let text = buffer.toString(actualEncoding);
            
            // 移除BOM
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.substring(1);
            }
            
            return text;
        } catch (error) {
            console.warn('⚠️ 字符串转换失败，使用UTF-8重试:', error.message);
            return buffer.toString('utf8');
        }
    }

    /**
     * 文本预处理
     */
    static preprocess(text, options = {}) {
        let processed = text;
        
        // 移除多余的空白字符
        if (options.normalizeWhitespace) {
            processed = processed
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/ {2,}/g, ' ')
                .trim();
        }
        
        // 移除特殊字符
        if (options.removeSpecialChars) {
            processed = processed.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\.\,\!\?\;\:\(\)\[\]\-]/g, '');
        }
        
        // 统一标点符号
        if (options.normalizePunctuation) {
            processed = processed
                .replace(/[""]/g, '"')
                .replace(/['']/g, "'")
                .replace(/[—–]/g, '-')
                .replace(/[…]/g, '...');
        }
        
        return processed;
    }
}

/**
 * 流式文件读取器
 */
class StreamingFileReader {
    constructor(filePath, options = {}) {
        this.filePath = filePath;
        this.encoding = options.encoding || 'utf8';
        this.chunkSize = options.chunkSize || 64 * 1024; // 64KB
        this.maxSize = options.maxSize || APP_CONFIG.MAX_FILE_SIZE;
    }

    async *readChunks() {
        const fs = require('fs');
        const stream = fs.createReadStream(this.filePath, {
            encoding: this.encoding,
            highWaterMark: this.chunkSize
        });

        let totalSize = 0;

        try {
            for await (const chunk of stream) {
                totalSize += Buffer.byteLength(chunk, this.encoding);
                
                if (totalSize > this.maxSize) {
                    throw new Error(`文件大小超过限制: ${totalSize} > ${this.maxSize}`);
                }
                
                yield chunk;
            }
        } finally {
            stream.destroy();
        }
    }

    async readAll() {
        const chunks = [];
        for await (const chunk of this.readChunks()) {
            chunks.push(chunk);
        }
        return chunks.join('');
    }
}

module.exports = {
    TextProcessor,
    TextCleaner,
    TextStatistics,
    TextProcessingUtils,
    StreamingFileReader
};