const fs = require('fs').promises;
const path = require('path');
const { LOG_LEVELS } = require('../config/constants');

/**
 * 结构化日志记录器
 */
class StructuredLogger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || LOG_LEVELS.INFO;
        this.logDir = options.logDir || path.join(__dirname, '..', 'logs');
        this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = options.maxLogFiles || 5;
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile !== false;
        
        // 创建日志目录
        this.ensureLogDirectory();
        
        // 日志级别优先级
        this.levelPriority = {
            [LOG_LEVELS.DEBUG]: 0,
            [LOG_LEVELS.INFO]: 1,
            [LOG_LEVELS.WARN]: 2,
            [LOG_LEVELS.ERROR]: 3
        };
    }

    /**
     * 确保日志目录存在
     */
    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('创建日志目录失败:', error);
        }
    }

    /**
     * 检查是否应该记录该级别的日志
     */
    shouldLog(level) {
        return this.levelPriority[level] >= this.levelPriority[this.logLevel];
    }

    /**
     * 格式化日志消息
     */
    formatLogMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            pid: process.pid,
            ...meta
        };

        return {
            structured: logEntry,
            formatted: `[${timestamp}] [${level.toUpperCase()}] [PID:${process.pid}] ${message}${meta && Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : ''}`
        };
    }

    /**
     * 写入日志到文件
     */
    async writeToFile(level, logEntry) {
        if (!this.enableFile) return;

        try {
            const logFileName = `app-${new Date().toISOString().split('T')[0]}.log`;
            const logFilePath = path.join(this.logDir, logFileName);
            
            // 检查文件大小并轮转
            await this.rotateLogIfNeeded(logFilePath);
            
            const logLine = JSON.stringify(logEntry.structured) + '\n';
            await fs.appendFile(logFilePath, logLine, 'utf8');
        } catch (error) {
            console.error('写入日志文件失败:', error);
        }
    }

    /**
     * 日志轮转
     */
    async rotateLogIfNeeded(logFilePath) {
        try {
            const stats = await fs.stat(logFilePath);
            if (stats.size > this.maxLogSize) {
                // 重命名当前文件
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedPath = logFilePath.replace('.log', `-${timestamp}.log`);
                await fs.rename(logFilePath, rotatedPath);
                
                // 清理旧文件
                await this.cleanupOldLogs();
            }
        } catch (error) {
            // 文件不存在或其他错误，继续执行
        }
    }

    /**
     * 清理旧日志文件
     */
    async cleanupOldLogs() {
        try {
            const files = await fs.readdir(this.logDir);
            const logFiles = files
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logDir, file),
                    stat: null
                }));

            // 获取文件统计信息
            for (const file of logFiles) {
                try {
                    file.stat = await fs.stat(file.path);
                } catch (error) {
                    // 跳过无法访问的文件
                }
            }

            // 按修改时间排序，删除最老的文件
            const validFiles = logFiles
                .filter(file => file.stat)
                .sort((a, b) => b.stat.mtime - a.stat.mtime);

            if (validFiles.length > this.maxLogFiles) {
                const filesToDelete = validFiles.slice(this.maxLogFiles);
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                    console.log(`删除旧日志文件: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('清理旧日志失败:', error);
        }
    }

    /**
     * 记录日志的通用方法
     */
    async log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.formatLogMessage(level, message, meta);

        // 控制台输出
        if (this.enableConsole) {
            this.logToConsole(level, logEntry.formatted);
        }

        // 文件输出
        await this.writeToFile(level, logEntry);
    }

    /**
     * 输出到控制台
     */
    logToConsole(level, formatted) {
        const colors = {
            [LOG_LEVELS.DEBUG]: '\x1b[36m', // 青色
            [LOG_LEVELS.INFO]: '\x1b[32m',  // 绿色
            [LOG_LEVELS.WARN]: '\x1b[33m',  // 黄色
            [LOG_LEVELS.ERROR]: '\x1b[31m'  // 红色
        };
        
        const reset = '\x1b[0m';
        const color = colors[level] || '';
        
        console.log(`${color}${formatted}${reset}`);
    }

    /**
     * 调试日志
     */
    debug(message, meta = {}) {
        return this.log(LOG_LEVELS.DEBUG, message, meta);
    }

    /**
     * 信息日志
     */
    info(message, meta = {}) {
        return this.log(LOG_LEVELS.INFO, message, meta);
    }

    /**
     * 警告日志
     */
    warn(message, meta = {}) {
        return this.log(LOG_LEVELS.WARN, message, meta);
    }

    /**
     * 错误日志
     */
    error(message, meta = {}) {
        return this.log(LOG_LEVELS.ERROR, message, meta);
    }

    /**
     * 记录HTTP请求
     */
    logRequest(req, res, duration) {
        const meta = {
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress,
            contentLength: res.get('Content-Length') || 0
        };

        const level = res.statusCode >= 400 ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;
        this.log(level, `HTTP ${req.method} ${req.originalUrl || req.url}`, meta);
    }

    /**
     * 记录文件处理
     */
    logFileProcessing(fileName, fileSize, duration, status, meta = {}) {
        const logMeta = {
            fileName,
            fileSize,
            duration: `${duration}ms`,
            status,
            ...meta
        };

        const level = status === 'success' ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
        this.log(level, `文件处理: ${fileName}`, logMeta);
    }

    /**
     * 记录API调用
     */
    logAPICall(apiName, duration, status, meta = {}) {
        const logMeta = {
            apiName,
            duration: `${duration}ms`,
            status,
            ...meta
        };

        const level = status === 'success' ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
        this.log(level, `API调用: ${apiName}`, logMeta);
    }

    /**
     * 记录安全事件
     */
    logSecurityEvent(eventType, description, meta = {}) {
        const securityMeta = {
            eventType,
            severity: 'high',
            ...meta
        };

        this.log(LOG_LEVELS.WARN, `安全事件: ${description}`, securityMeta);
    }

    /**
     * 记录性能指标
     */
    logPerformance(operation, metrics) {
        const perfMeta = {
            operation,
            ...metrics
        };

        this.log(LOG_LEVELS.INFO, `性能指标: ${operation}`, perfMeta);
    }
}

/**
 * 创建默认日志记录器实例
 */
const defaultLogger = new StructuredLogger({
    logLevel: process.env.LOG_LEVEL || LOG_LEVELS.INFO,
    enableConsole: process.env.NODE_ENV !== 'production',
    enableFile: true
});

/**
 * 请求日志中间件
 */
function requestLoggerMiddleware() {
    return (req, res, next) => {
        const start = Date.now();
        
        // 监听响应结束
        res.on('finish', () => {
            const duration = Date.now() - start;
            defaultLogger.logRequest(req, res, duration);
        });
        
        next();
    };
}

/**
 * 错误日志中间件
 */
function errorLoggerMiddleware() {
    return (err, req, res, next) => {
        defaultLogger.error('未处理的错误', {
            error: err.message,
            stack: err.stack,
            url: req.originalUrl || req.url,
            method: req.method,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        });
        
        next(err);
    };
}

module.exports = {
    StructuredLogger,
    defaultLogger,
    requestLoggerMiddleware,
    errorLoggerMiddleware,
    LOG_LEVELS
};