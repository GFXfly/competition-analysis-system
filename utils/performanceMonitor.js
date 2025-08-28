/**
 * 性能监控工具
 * 监控系统性能、内存使用、API响应时间等关键指标
 */

const os = require('os');
const { performance } = require('perf_hooks');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                totalResponseTime: 0,
                avgResponseTime: 0,
                minResponseTime: Infinity,
                maxResponseTime: 0,
                requestsPerSecond: 0
            },
            memory: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                rss: 0,
                freeMemory: 0,
                totalMemory: 0
            },
            cpu: {
                usage: 0,
                loadAvg: [0, 0, 0]
            },
            ai: {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                totalTime: 0,
                avgTime: 0,
                minTime: Infinity,
                maxTime: 0,
                timeouts: 0,
                cacheHits: 0,
                cacheMisses: 0
            },
            fileProcessing: {
                totalFiles: 0,
                totalSize: 0,
                avgProcessingTime: 0,
                totalProcessingTime: 0,
                failedFiles: 0
            }
        };

        this.startTime = Date.now();
        this.lastUpdate = Date.now();
        this.requestStartTimes = new Map();
        this.requestCounter = 0;
        this.updateInterval = null;

        // 启动定期更新
        this.startMonitoring();

        console.log('📊 性能监控器初始化完成');
    }

    /**
     * 开始监控
     */
    startMonitoring() {
        // 每30秒更新一次系统指标
        this.updateInterval = setInterval(() => {
            this.updateSystemMetrics();
        }, 30000);

        // 立即更新一次
        this.updateSystemMetrics();
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * 更新系统指标
     */
    updateSystemMetrics() {
        // 内存使用情况
        const memUsage = process.memoryUsage();
        this.metrics.memory = {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
            external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
            rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100, // MB
            freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
            totalMemory: Math.round(os.totalmem() / 1024 / 1024) // MB
        };

        // CPU使用情况
        this.metrics.cpu = {
            usage: this.getCPUUsage(),
            loadAvg: os.loadavg().map(load => Math.round(load * 100) / 100)
        };

        // 计算请求速率
        const now = Date.now();
        const timeDiff = (now - this.lastUpdate) / 1000;
        if (timeDiff > 0) {
            this.metrics.requests.requestsPerSecond = Math.round(
                (this.metrics.requests.total - (this.lastRequestTotal || 0)) / timeDiff * 100
            ) / 100;
        }
        this.lastRequestTotal = this.metrics.requests.total;
        this.lastUpdate = now;
    }

    /**
     * 获取CPU使用率
     */
    getCPUUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });

        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 100 - Math.round(100 * idle / total);
        
        return usage;
    }

    /**
     * 记录请求开始
     */
    recordRequestStart(req, res, next) {
        const requestId = `req_${++this.requestCounter}`;
        const startTime = performance.now();
        
        this.requestStartTimes.set(requestId, {
            startTime,
            method: req.method,
            path: req.path,
            ip: req.ip
        });

        req.performanceRequestId = requestId;
        
        // 监听请求结束
        res.on('finish', () => {
            this.recordRequestEnd(requestId, res.statusCode);
        });

        next();
    }

    /**
     * 记录请求结束
     */
    recordRequestEnd(requestId, statusCode) {
        const requestInfo = this.requestStartTimes.get(requestId);
        if (!requestInfo) return;

        const endTime = performance.now();
        const responseTime = endTime - requestInfo.startTime;

        // 更新请求指标
        this.metrics.requests.total++;
        this.metrics.requests.totalResponseTime += responseTime;
        this.metrics.requests.avgResponseTime = 
            Math.round(this.metrics.requests.totalResponseTime / this.metrics.requests.total * 100) / 100;

        if (responseTime < this.metrics.requests.minResponseTime) {
            this.metrics.requests.minResponseTime = Math.round(responseTime * 100) / 100;
        }
        if (responseTime > this.metrics.requests.maxResponseTime) {
            this.metrics.requests.maxResponseTime = Math.round(responseTime * 100) / 100;
        }

        if (statusCode >= 200 && statusCode < 400) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }

        // 清理
        this.requestStartTimes.delete(requestId);

        // 如果响应时间过长，记录警告
        if (responseTime > 5000) {
            console.warn(`⚠️ 慢请求检测: ${requestInfo.method} ${requestInfo.path} - ${Math.round(responseTime)}ms`);
        }
    }

    /**
     * 记录AI调用开始
     */
    recordAICallStart() {
        return {
            startTime: performance.now(),
            id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }

    /**
     * 记录AI调用结束
     */
    recordAICallEnd(callInfo, success = true, fromCache = false) {
        const endTime = performance.now();
        const duration = endTime - callInfo.startTime;

        this.metrics.ai.totalCalls++;
        this.metrics.ai.totalTime += duration;
        this.metrics.ai.avgTime = Math.round(this.metrics.ai.totalTime / this.metrics.ai.totalCalls * 100) / 100;

        if (duration < this.metrics.ai.minTime) {
            this.metrics.ai.minTime = Math.round(duration * 100) / 100;
        }
        if (duration > this.metrics.ai.maxTime) {
            this.metrics.ai.maxTime = Math.round(duration * 100) / 100;
        }

        if (success) {
            this.metrics.ai.successfulCalls++;
        } else {
            this.metrics.ai.failedCalls++;
        }

        if (fromCache) {
            this.metrics.ai.cacheHits++;
        } else {
            this.metrics.ai.cacheMisses++;
        }

        // 记录超长AI调用
        if (duration > 60000) {
            console.warn(`⚠️ AI调用耗时过长: ${Math.round(duration / 1000)}秒`);
        }
    }

    /**
     * 记录AI调用超时
     */
    recordAITimeout() {
        this.metrics.ai.timeouts++;
    }

    /**
     * 记录文件处理
     */
    recordFileProcessing(fileSize, processingTime, success = true) {
        this.metrics.fileProcessing.totalFiles++;
        this.metrics.fileProcessing.totalSize += fileSize;
        
        if (success) {
            this.metrics.fileProcessing.totalProcessingTime += processingTime;
            this.metrics.fileProcessing.avgProcessingTime = 
                Math.round(this.metrics.fileProcessing.totalProcessingTime / this.metrics.fileProcessing.totalFiles * 100) / 100;
        } else {
            this.metrics.fileProcessing.failedFiles++;
        }
    }

    /**
     * 获取完整性能报告
     */
    getPerformanceReport() {
        const uptime = Math.round((Date.now() - this.startTime) / 1000);
        const uptimeFormatted = this.formatUptime(uptime);

        return {
            timestamp: new Date().toISOString(),
            uptime: uptime,
            uptimeFormatted: uptimeFormatted,
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                cpuCount: os.cpus().length
            },
            performance: {
                ...this.metrics,
                health: this.getHealthScore()
            }
        };
    }

    /**
     * 获取系统健康评分 (0-100)
     */
    getHealthScore() {
        let score = 100;

        // 内存使用率
        const memoryUsage = (this.metrics.memory.heapUsed / this.metrics.memory.heapTotal) * 100;
        if (memoryUsage > 90) score -= 20;
        else if (memoryUsage > 80) score -= 10;
        else if (memoryUsage > 70) score -= 5;

        // CPU使用率
        if (this.metrics.cpu.usage > 90) score -= 15;
        else if (this.metrics.cpu.usage > 80) score -= 10;
        else if (this.metrics.cpu.usage > 70) score -= 5;

        // 请求失败率
        if (this.metrics.requests.total > 0) {
            const failureRate = (this.metrics.requests.failed / this.metrics.requests.total) * 100;
            if (failureRate > 10) score -= 20;
            else if (failureRate > 5) score -= 10;
            else if (failureRate > 2) score -= 5;
        }

        // AI调用失败率
        if (this.metrics.ai.totalCalls > 0) {
            const aiFailureRate = (this.metrics.ai.failedCalls / this.metrics.ai.totalCalls) * 100;
            if (aiFailureRate > 20) score -= 15;
            else if (aiFailureRate > 10) score -= 10;
            else if (aiFailureRate > 5) score -= 5;
        }

        // 平均响应时间
        if (this.metrics.requests.avgResponseTime > 10000) score -= 15;
        else if (this.metrics.requests.avgResponseTime > 5000) score -= 10;
        else if (this.metrics.requests.avgResponseTime > 3000) score -= 5;

        return Math.max(0, Math.round(score));
    }

    /**
     * 格式化运行时间
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (days > 0) {
            return `${days}天 ${hours}小时 ${minutes}分钟`;
        } else if (hours > 0) {
            return `${hours}小时 ${minutes}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟 ${secs}秒`;
        } else {
            return `${secs}秒`;
        }
    }

    /**
     * 创建性能监控中间件
     */
    middleware() {
        return (req, res, next) => {
            this.recordRequestStart(req, res, next);
        };
    }

    /**
     * 获取简要状态
     */
    getStatus() {
        return {
            healthy: this.getHealthScore() > 70,
            memory: this.metrics.memory.heapUsed,
            cpu: this.metrics.cpu.usage,
            requests: this.metrics.requests.total,
            uptime: Math.round((Date.now() - this.startTime) / 1000)
        };
    }

    /**
     * 销毁监控器
     */
    destroy() {
        this.stopMonitoring();
        this.requestStartTimes.clear();
        console.log('📊 性能监控器已销毁');
    }
}

// 创建全局性能监控器
const globalPerformanceMonitor = new PerformanceMonitor();

module.exports = {
    PerformanceMonitor,
    performanceMonitor: globalPerformanceMonitor,
    performanceMiddleware: globalPerformanceMonitor.middleware(),
    getPerformanceReport: () => globalPerformanceMonitor.getPerformanceReport(),
    getPerformanceStatus: () => globalPerformanceMonitor.getStatus(),
    recordAICall: (callInfo, success, fromCache) => globalPerformanceMonitor.recordAICallEnd(callInfo, success, fromCache),
    startAICall: () => globalPerformanceMonitor.recordAICallStart(),
    recordAITimeout: () => globalPerformanceMonitor.recordAITimeout(),
    recordFileProcessing: (fileSize, processingTime, success) => globalPerformanceMonitor.recordFileProcessing(fileSize, processingTime, success)
};