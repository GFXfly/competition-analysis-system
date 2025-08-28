/**
 * 智能限流中间件
 * 为不同API端点提供差异化限流策略，防止API滥用并提高系统稳定性
 */

const { LRUCache } = require('../utils/lruCache');

class RateLimiter {
    constructor() {
        // 使用LRU缓存存储客户端请求计数
        this.requestCache = new LRUCache({
            capacity: 10000,
            defaultTTL: 15 * 60 * 1000, // 15分钟
            maxSize: 5 * 1024 * 1024 // 5MB
        });

        // 限流配置
        this.limits = {
            'stream-review': { 
                maxRequests: 3, 
                windowMs: 5 * 60 * 1000, // 5分钟
                skipSuccessfulRequests: false 
            },
            'review': { 
                maxRequests: 10, 
                windowMs: 15 * 60 * 1000, // 15分钟
                skipSuccessfulRequests: false 
            },
            'export-report': { 
                maxRequests: 20, 
                windowMs: 10 * 60 * 1000, // 10分钟
                skipSuccessfulRequests: true 
            },
            'audit-logs': { 
                maxRequests: 100, 
                windowMs: 15 * 60 * 1000, // 15分钟
                skipSuccessfulRequests: true 
            },
            'default': { 
                maxRequests: 50, 
                windowMs: 15 * 60 * 1000, // 15分钟
                skipSuccessfulRequests: true 
            }
        };

        console.log('🚦 智能限流器初始化完成');
    }

    /**
     * 获取客户端真实IP
     */
    getClientIP(req) {
        return req.headers['x-forwarded-for'] ||
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.ip ||
               'unknown';
    }

    /**
     * 获取API端点类型
     */
    getEndpointType(req) {
        const path = req.path.toLowerCase();
        
        if (path.includes('stream-review')) return 'stream-review';
        if (path.includes('/review') && req.method === 'POST') return 'review';
        if (path.includes('export-report')) return 'export-report';
        if (path.includes('audit-logs')) return 'audit-logs';
        
        return 'default';
    }

    /**
     * 生成缓存键
     */
    generateKey(ip, endpoint) {
        return `ratelimit:${ip}:${endpoint}`;
    }

    /**
     * 检查限流状态
     */
    checkRateLimit(req, res, next) {
        const clientIP = this.getClientIP(req);
        const endpoint = this.getEndpointType(req);
        const limit = this.limits[endpoint];
        const key = this.generateKey(clientIP, endpoint);

        // 获取当前请求计数
        let requestData = this.requestCache.get(key);
        const now = Date.now();

        if (!requestData) {
            // 首次请求
            requestData = {
                count: 1,
                resetTime: now + limit.windowMs,
                firstRequestTime: now
            };
        } else {
            // 检查时间窗口是否已重置
            if (now >= requestData.resetTime) {
                requestData = {
                    count: 1,
                    resetTime: now + limit.windowMs,
                    firstRequestTime: now
                };
            } else {
                requestData.count++;
            }
        }

        // 更新缓存
        this.requestCache.set(key, requestData);

        // 设置响应头
        const remaining = Math.max(0, limit.maxRequests - requestData.count);
        const resetTime = Math.ceil(requestData.resetTime / 1000);

        res.setHeader('X-RateLimit-Limit', limit.maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetTime);
        res.setHeader('X-RateLimit-Window', Math.ceil(limit.windowMs / 1000));

        // 检查是否超过限制
        if (requestData.count > limit.maxRequests) {
            const retryAfter = Math.ceil((requestData.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);

            console.log(`🚫 限流触发 - IP: ${clientIP}, 端点: ${endpoint}, 计数: ${requestData.count}/${limit.maxRequests}`);

            return res.status(429).json({
                error: true,
                code: 'RATE_LIMIT_EXCEEDED',
                message: `请求过于频繁，请在 ${retryAfter} 秒后重试`,
                details: {
                    limit: limit.maxRequests,
                    remaining: 0,
                    resetTime: resetTime,
                    retryAfter: retryAfter
                }
            });
        }

        console.log(`✅ 限流检查通过 - IP: ${clientIP}, 端点: ${endpoint}, 计数: ${requestData.count}/${limit.maxRequests}`);
        next();
    }

    /**
     * 跳过成功请求的计数（用于某些端点）
     */
    skipSuccessfulRequest(req, res, next) {
        const originalSend = res.send;
        const clientIP = this.getClientIP(req);
        const endpoint = this.getEndpointType(req);
        const limit = this.limits[endpoint];
        
        if (limit.skipSuccessfulRequests) {
            res.send = function(body) {
                // 如果请求成功，从计数中减去1
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    const key = this.generateKey(clientIP, endpoint);
                    const requestData = this.requestCache.get(key);
                    if (requestData && requestData.count > 0) {
                        requestData.count--;
                        this.requestCache.set(key, requestData);
                        console.log(`↩️ 成功请求跳过计数 - IP: ${clientIP}, 端点: ${endpoint}`);
                    }
                }
                originalSend.call(this, body);
            }.bind(this);
        }

        next();
    }

    /**
     * 获取限流统计信息
     */
    getStats() {
        const cacheStats = this.requestCache.getStats();
        const activeClients = this.requestCache.size();

        return {
            activeClients,
            cacheStats,
            limits: this.limits,
            uptime: process.uptime()
        };
    }

    /**
     * 清除特定IP的限流记录（管理员功能）
     */
    clearClientLimits(ip) {
        let clearedCount = 0;
        const keys = this.requestCache.keys();
        
        keys.forEach(key => {
            if (key.includes(ip)) {
                this.requestCache.delete(key);
                clearedCount++;
            }
        });

        console.log(`🧹 已清除IP ${ip} 的 ${clearedCount} 条限流记录`);
        return clearedCount;
    }

    /**
     * 创建中间件函数
     */
    middleware() {
        return (req, res, next) => {
            this.checkRateLimit(req, res, next);
        };
    }

    /**
     * 创建跳过成功请求的中间件
     */
    skipSuccessfulMiddleware() {
        return (req, res, next) => {
            this.skipSuccessfulRequest(req, res, next);
        };
    }
}

// 创建全局限流器实例
const globalRateLimiter = new RateLimiter();

module.exports = {
    RateLimiter,
    rateLimiter: globalRateLimiter.middleware(),
    skipSuccessfulRateLimit: globalRateLimiter.skipSuccessfulMiddleware(),
    getRateLimitStats: () => globalRateLimiter.getStats(),
    clearClientLimits: (ip) => globalRateLimiter.clearClientLimits(ip)
};