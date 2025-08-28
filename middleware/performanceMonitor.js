/**
 * 性能监控中间件
 * 监控内存使用、响应时间、请求统计等关键指标
 */

const { LOG_LEVELS } = require('../config/constants');

class PerformanceMonitor {
    constructor() {
        this.stats = {
            requests: {
                total: 0,
                success: 0,
                errors: 0,
                averageResponseTime: 0,
                slowRequests: 0 // >5秒的请求
            },
            memory: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                rss: 0
            },
            uptime: process.uptime(),
            startTime: Date.now()
        };
        
        this.responseTimes = [];
        this.maxResponseTimeHistory = 100; // 保存最近100个响应时间
        
        // 每30秒更新一次内存统计
        this.memoryUpdateInterval = setInterval(() => {
            this.updateMemoryStats();
        }, 30000);
        
        // 每5分钟清理响应时间历史
        this.cleanupInterval = setInterval(() => {
            this.cleanupResponseTimes();
        }, 300000);
    }
    
    /**
     * 更新内存使用统计
     */
    updateMemoryStats() {
        const memUsage = process.memoryUsage();
        this.stats.memory = {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
            external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
            rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100
        };
        this.stats.uptime = process.uptime();
    }
    
    /**
     * 清理响应时间历史数据
     */
    cleanupResponseTimes() {
        if (this.responseTimes.length > this.maxResponseTimeHistory) {
            this.responseTimes = this.responseTimes.slice(-this.maxResponseTimeHistory);
        }
    }
    
    /**
     * 计算平均响应时间
     */
    calculateAverageResponseTime() {
        if (this.responseTimes.length === 0) return 0;
        const sum = this.responseTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.responseTimes.length);
    }
    
    /**
     * 记录请求统计
     */
    recordRequest(responseTime, success = true) {
        this.stats.requests.total++;
        
        if (success) {
            this.stats.requests.success++;
        } else {
            this.stats.requests.errors++;
        }
        
        // 记录响应时间
        this.responseTimes.push(responseTime);
        this.stats.requests.averageResponseTime = this.calculateAverageResponseTime();
        
        // 慢请求统计
        if (responseTime > 5000) {
            this.stats.requests.slowRequests++;
        }
        
        // 性能警告
        if (responseTime > 10000) {
            console.warn(`⚠️  慢请求警告: 响应时间 ${responseTime}ms`);
        }
        
        // 内存使用警告
        if (this.stats.memory.heapUsed > 512) { // > 512MB
            console.warn(`⚠️  内存使用警告: 堆内存使用 ${this.stats.memory.heapUsed}MB`);
        }
    }
    
    /**
     * 获取性能统计数据
     */
    getStats() {
        this.updateMemoryStats();
        
        return {
            ...this.stats,
            healthStatus: this.getHealthStatus(),
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 获取系统健康状态
     */
    getHealthStatus() {
        const memoryUsage = this.stats.memory.heapUsed;
        const errorRate = this.stats.requests.total > 0 
            ? this.stats.requests.errors / this.stats.requests.total 
            : 0;
        const avgResponseTime = this.stats.requests.averageResponseTime;
        
        let status = 'healthy';
        const issues = [];
        
        // 内存检查
        if (memoryUsage > 1024) { // > 1GB
            status = 'critical';
            issues.push('内存使用过高');
        } else if (memoryUsage > 512) { // > 512MB
            status = 'warning';
            issues.push('内存使用较高');
        }
        
        // 错误率检查
        if (errorRate > 0.1) { // > 10%
            status = 'critical';
            issues.push('错误率过高');
        } else if (errorRate > 0.05) { // > 5%
            status = status === 'healthy' ? 'warning' : status;
            issues.push('错误率较高');
        }
        
        // 响应时间检查
        if (avgResponseTime > 10000) { // > 10s
            status = 'critical';
            issues.push('平均响应时间过长');
        } else if (avgResponseTime > 5000) { // > 5s
            status = status === 'healthy' ? 'warning' : status;
            issues.push('平均响应时间较长');
        }
        
        return {
            status,
            issues,
            score: this.calculateHealthScore(memoryUsage, errorRate, avgResponseTime)
        };
    }
    
    /**
     * 计算健康评分 (0-100)
     */
    calculateHealthScore(memoryUsage, errorRate, avgResponseTime) {
        let score = 100;
        
        // 内存使用影响 (最多扣30分)
        if (memoryUsage > 1024) score -= 30;
        else if (memoryUsage > 512) score -= 15;
        else if (memoryUsage > 256) score -= 5;
        
        // 错误率影响 (最多扣40分)
        if (errorRate > 0.1) score -= 40;
        else if (errorRate > 0.05) score -= 20;
        else if (errorRate > 0.01) score -= 10;
        
        // 响应时间影响 (最多扣30分)
        if (avgResponseTime > 10000) score -= 30;
        else if (avgResponseTime > 5000) score -= 15;
        else if (avgResponseTime > 2000) score -= 5;
        
        return Math.max(0, score);
    }
    
    /**
     * 创建Express中间件
     */
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // 重写res.end来记录响应时间
            const originalEnd = res.end;
            res.end = (...args) => {
                const responseTime = Date.now() - startTime;
                const success = res.statusCode < 400;
                
                this.recordRequest(responseTime, success);
                
                originalEnd.apply(res, args);
            };
            
            next();
        };
    }
    
    /**
     * 清理定时器
     */
    cleanup() {
        if (this.memoryUpdateInterval) {
            clearInterval(this.memoryUpdateInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// 单例模式
const performanceMonitor = new PerformanceMonitor();

module.exports = {
    performanceMonitor,
    PerformanceMonitor
};