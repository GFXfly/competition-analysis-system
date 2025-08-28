/**
 * 流式文件处理器
 * 优化大文件处理，减少内存占用并提高处理效率
 */

const { Transform, pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const mammoth = require('mammoth');

/**
 * 文件内容流式提取器
 */
class FileContentExtractor extends Transform {
    constructor(options = {}) {
        super({
            objectMode: true,
            highWaterMark: options.highWaterMark || 16
        });
        
        this.fileType = options.fileType;
        this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB
        this.chunks = [];
        this.totalSize = 0;
        this.textQualityThreshold = options.textQualityThreshold || 30;
    }

    _transform(chunk, encoding, callback) {
        try {
            this.chunks.push(chunk);
            this.totalSize += chunk.length;

            // 检查文件大小限制
            if (this.totalSize > this.maxSize) {
                return callback(new Error(`文件过大，超过${Math.round(this.maxSize / 1024 / 1024)}MB限制`));
            }

            callback();
        } catch (error) {
            callback(error);
        }
    }

    _flush(callback) {
        try {
            const buffer = Buffer.concat(this.chunks);
            this.processBuffer(buffer)
                .then(result => {
                    this.push(result);
                    callback();
                })
                .catch(error => callback(error));
        } catch (error) {
            callback(error);
        }
    }

    /**
     * 处理文件缓冲区
     */
    async processBuffer(buffer) {
        const startTime = Date.now();
        
        try {
            let extractedText = '';
            let extractionMethod = 'unknown';
            let quality = 0;

            if (this.fileType === 'docx' || this.fileType === 'doc') {
                const result = await this.extractWordDocument(buffer);
                extractedText = result.text;
                extractionMethod = result.method;
                quality = this.evaluateTextQuality(extractedText);
            } else if (this.fileType === 'txt') {
                extractedText = this.extractTextFile(buffer);
                extractionMethod = 'utf8';
                quality = this.evaluateTextQuality(extractedText);
            } else {
                throw new Error(`不支持的文件类型: ${this.fileType}`);
            }

            const processingTime = Date.now() - startTime;

            return {
                text: extractedText,
                size: buffer.length,
                quality: quality,
                extractionMethod: extractionMethod,
                processingTime: processingTime,
                success: quality >= this.textQualityThreshold
            };
        } catch (error) {
            const processingTime = Date.now() - startTime;
            return {
                text: '',
                size: buffer.length,
                quality: 0,
                extractionMethod: 'failed',
                processingTime: processingTime,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 提取Word文档内容
     */
    async extractWordDocument(buffer) {
        const methods = [
            { name: 'mammoth', func: () => this.extractWithMammoth(buffer) },
            { name: 'utf8-fallback', func: () => this.extractWithUTF8Fallback(buffer) },
            { name: 'binary-scan', func: () => this.extractWithBinaryScan(buffer) }
        ];

        let bestResult = { text: '', method: 'failed', quality: 0 };

        for (const method of methods) {
            try {
                console.log(`🔄 尝试方法: ${method.name}`);
                const text = await method.func();
                const quality = this.evaluateTextQuality(text);
                
                console.log(`📊 ${method.name} 质量评分: ${quality}, 长度: ${text.length}`);
                
                if (quality > bestResult.quality) {
                    bestResult = { text, method: method.name, quality };
                }

                // 如果质量足够好，直接返回
                if (quality >= 80) {
                    console.log(`✅ ${method.name} 质量优秀，直接使用`);
                    break;
                }
            } catch (error) {
                console.log(`❌ ${method.name} 失败: ${error.message}`);
            }
        }

        if (bestResult.quality < this.textQualityThreshold) {
            throw new Error(`所有提取方法质量不达标，最高质量: ${bestResult.quality}`);
        }

        return bestResult;
    }

    /**
     * 使用Mammoth提取
     */
    async extractWithMammoth(buffer) {
        const result = await mammoth.extractRawText({ buffer });
        if (!result.value || result.value.trim().length === 0) {
            throw new Error('Mammoth提取结果为空');
        }
        return result.value;
    }

    /**
     * UTF8回退提取
     */
    extractWithUTF8Fallback(buffer) {
        const text = buffer.toString('utf8');
        const cleanText = this.cleanExtractedText(text);
        if (cleanText.length < 100) {
            throw new Error('UTF8提取文本过短');
        }
        return cleanText;
    }

    /**
     * 二进制扫描提取
     */
    extractWithBinaryScan(buffer) {
        // 查找可能的中文字符模式
        const chineseChars = [];
        const rawText = buffer.toString('binary');
        
        for (let i = 0; i < rawText.length - 2; i++) {
            const char1 = rawText.charCodeAt(i);
            const char2 = rawText.charCodeAt(i + 1);
            const char3 = rawText.charCodeAt(i + 2);
            
            // 检查UTF-8中文字符模式 (0xE4-0xE9, 0x80-0xBF, 0x80-0xBF)
            if (char1 >= 0xE4 && char1 <= 0xE9 && 
                char2 >= 0x80 && char2 <= 0xBF && 
                char3 >= 0x80 && char3 <= 0xBF) {
                try {
                    const bytes = Buffer.from([char1, char2, char3]);
                    const decoded = bytes.toString('utf8');
                    if (decoded.length === 1 && /[\u4e00-\u9fff]/.test(decoded)) {
                        chineseChars.push(decoded);
                    }
                } catch (e) {
                    // 忽略解码错误
                }
            }
        }

        if (chineseChars.length < 10) {
            throw new Error('二进制扫描找到的中文字符过少');
        }

        return chineseChars.join('');
    }

    /**
     * 提取文本文件
     */
    extractTextFile(buffer) {
        // 尝试不同编码
        const encodings = ['utf8', 'gbk', 'gb2312'];
        let bestText = '';
        let bestQuality = 0;

        for (const encoding of encodings) {
            try {
                let text;
                if (encoding === 'utf8') {
                    text = buffer.toString('utf8');
                } else {
                    // 对于其他编码，尝试使用iconv-lite
                    try {
                        const iconv = require('iconv-lite');
                        text = iconv.decode(buffer, encoding);
                    } catch (e) {
                        continue;
                    }
                }

                const cleanText = this.cleanExtractedText(text);
                const quality = this.evaluateTextQuality(cleanText);

                if (quality > bestQuality) {
                    bestText = cleanText;
                    bestQuality = quality;
                }
            } catch (e) {
                continue;
            }
        }

        if (bestQuality < this.textQualityThreshold) {
            throw new Error(`文本文件质量不达标: ${bestQuality}`);
        }

        return bestText;
    }

    /**
     * 清理提取的文本
     */
    cleanExtractedText(text) {
        return text
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ' ') // 移除控制字符但保留换行和制表符
            .replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ' ') // 保留ASCII、中文、中文标点和全角字符
            .replace(/\s+/g, ' ') // 合并多个空格
            .trim();
    }

    /**
     * 评估文本质量 (0-100)
     */
    evaluateTextQuality(text) {
        if (!text || text.length < 10) return 0;
        
        let score = 0;
        
        // 长度分数 (0-25)
        const lengthScore = Math.min(text.length / 1000 * 25, 25);
        score += lengthScore;
        
        // 中文字符比例 (0-35)
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const chineseRatio = chineseChars / text.length;
        const chineseScore = chineseRatio * 35;
        score += chineseScore;
        
        // 可读性分数 (0-25)
        const readableChars = (text.match(/[\u4e00-\u9fff\w\s]/g) || []).length;
        const readableRatio = readableChars / text.length;
        const readableScore = readableRatio * 25;
        score += readableScore;
        
        // 连续有效字符 (0-15)
        const validSequences = text.match(/[\u4e00-\u9fff\w]{3,}/g) || [];
        const sequenceScore = Math.min(validSequences.length / 20 * 15, 15);
        score += sequenceScore;
        
        return Math.round(score);
    }
}

/**
 * 文本分块处理器
 * 将大文本分块处理，避免内存溢出
 */
class TextChunker extends Transform {
    constructor(options = {}) {
        super({ objectMode: true });
        
        this.chunkSize = options.chunkSize || 4000; // 4KB chunks
        this.overlap = options.overlap || 200; // 200字符重叠
        this.buffer = '';
    }

    _transform(data, encoding, callback) {
        try {
            if (data && data.text) {
                this.buffer += data.text;
                this.processChunks();
                callback();
            } else {
                callback();
            }
        } catch (error) {
            callback(error);
        }
    }

    _flush(callback) {
        // 处理剩余的文本
        if (this.buffer.length > 0) {
            this.push({
                chunk: this.buffer,
                isLast: true,
                totalLength: this.buffer.length
            });
        }
        callback();
    }

    processChunks() {
        while (this.buffer.length > this.chunkSize) {
            const chunk = this.buffer.substring(0, this.chunkSize);
            this.buffer = this.buffer.substring(this.chunkSize - this.overlap);
            
            this.push({
                chunk: chunk,
                isLast: false,
                totalLength: this.buffer.length + chunk.length
            });
        }
    }
}

/**
 * 流式文件处理管理器
 */
class StreamProcessor {
    constructor() {
        this.activeStreams = new Map();
        this.processingStats = {
            totalFiles: 0,
            successfulFiles: 0,
            failedFiles: 0,
            totalProcessingTime: 0,
            avgProcessingTime: 0
        };

        console.log('🌊 流式处理器初始化完成');
    }

    /**
     * 流式提取文件内容
     */
    async extractFileContent(fileBuffer, options = {}) {
        const startTime = Date.now();
        const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            this.processingStats.totalFiles++;
            
            // 检测文件类型
            const fileType = this.detectFileType(fileBuffer, options.fileName);
            
            console.log(`🚀 开始流式处理: ${options.fileName || 'unknown'} (${fileType})`);
            
            // 创建提取器
            const extractor = new FileContentExtractor({
                fileType: fileType,
                maxSize: options.maxSize || 50 * 1024 * 1024,
                textQualityThreshold: options.textQualityThreshold || 30
            });
            
            // 记录活跃流
            this.activeStreams.set(streamId, {
                startTime,
                fileName: options.fileName,
                fileType,
                size: fileBuffer.length
            });

            // 处理结果
            const results = [];
            extractor.on('data', (result) => {
                results.push(result);
            });

            extractor.on('error', (error) => {
                console.error(`❌ 流处理错误: ${error.message}`);
            });

            // 写入数据并结束流
            extractor.write(fileBuffer);
            extractor.end();

            // 等待处理完成
            await new Promise((resolve, reject) => {
                extractor.on('end', resolve);
                extractor.on('error', reject);
            });

            const processingTime = Date.now() - startTime;
            const result = results[0];

            if (result && result.success) {
                this.processingStats.successfulFiles++;
                console.log(`✅ 流处理成功: ${options.fileName} (${processingTime}ms, 质量: ${result.quality})`);
            } else {
                this.processingStats.failedFiles++;
                console.log(`❌ 流处理失败: ${options.fileName} (${processingTime}ms)`);
            }

            // 更新统计
            this.processingStats.totalProcessingTime += processingTime;
            this.processingStats.avgProcessingTime = 
                Math.round(this.processingStats.totalProcessingTime / this.processingStats.totalFiles);

            // 清理
            this.activeStreams.delete(streamId);

            return {
                success: result ? result.success : false,
                text: result ? result.text : '',
                processingTime: processingTime,
                quality: result ? result.quality : 0,
                extractionMethod: result ? result.extractionMethod : 'failed',
                fileSize: fileBuffer.length,
                error: result ? result.error : null
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.processingStats.failedFiles++;
            this.activeStreams.delete(streamId);
            
            console.error(`❌ 流处理异常: ${error.message} (${processingTime}ms)`);
            
            return {
                success: false,
                text: '',
                processingTime: processingTime,
                quality: 0,
                extractionMethod: 'failed',
                fileSize: fileBuffer.length,
                error: error.message
            };
        }
    }

    /**
     * 流式分块文本处理
     */
    async processTextInChunks(text, options = {}) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const chunker = new TextChunker({
                chunkSize: options.chunkSize || 4000,
                overlap: options.overlap || 200
            });

            chunker.on('data', (chunkData) => {
                chunks.push(chunkData);
            });

            chunker.on('end', () => {
                resolve(chunks);
            });

            chunker.on('error', reject);

            // 输入数据
            chunker.write({ text });
            chunker.end();
        });
    }

    /**
     * 检测文件类型
     */
    detectFileType(buffer, fileName) {
        if (fileName) {
            const ext = fileName.split('.').pop().toLowerCase();
            if (['docx', 'doc', 'txt'].includes(ext)) {
                return ext;
            }
        }

        // 基于文件头检测
        const header = buffer.slice(0, 8);
        const headerHex = header.toString('hex');

        // DOCX文件 (ZIP格式)
        if (headerHex.startsWith('504b0304') || headerHex.startsWith('504b0506')) {
            return 'docx';
        }

        // DOC文件
        if (headerHex.startsWith('d0cf11e0') || headerHex.startsWith('0d444f43')) {
            return 'doc';
        }

        // 默认作为文本文件处理
        return 'txt';
    }

    /**
     * 获取处理统计
     */
    getProcessingStats() {
        return {
            ...this.processingStats,
            activeStreams: this.activeStreams.size,
            successRate: this.processingStats.totalFiles > 0 
                ? Math.round((this.processingStats.successfulFiles / this.processingStats.totalFiles) * 100) 
                : 0
        };
    }

    /**
     * 获取活跃流信息
     */
    getActiveStreams() {
        return Array.from(this.activeStreams.entries()).map(([id, info]) => ({
            id,
            ...info,
            duration: Date.now() - info.startTime
        }));
    }

    /**
     * 清理超时的流
     */
    cleanupTimeoutStreams(timeout = 5 * 60 * 1000) { // 5分钟超时
        const now = Date.now();
        let cleanedCount = 0;

        for (const [id, info] of this.activeStreams) {
            if (now - info.startTime > timeout) {
                this.activeStreams.delete(id);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 清理${cleanedCount}个超时流`);
        }

        return cleanedCount;
    }
}

// 创建全局流处理器
const globalStreamProcessor = new StreamProcessor();

module.exports = {
    StreamProcessor,
    FileContentExtractor,
    TextChunker,
    streamProcessor: globalStreamProcessor,
    extractFileContent: (buffer, options) => globalStreamProcessor.extractFileContent(buffer, options),
    processTextInChunks: (text, options) => globalStreamProcessor.processTextInChunks(text, options),
    getProcessingStats: () => globalStreamProcessor.getProcessingStats()
};