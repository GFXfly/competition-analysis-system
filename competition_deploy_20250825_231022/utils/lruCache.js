/**
 * LRU (最近最少使用) 缓存实现
 * 用于缓存AI响应和其他频繁访问的数据，提高系统性能
 */

/**
 * 缓存节点类
 */
class CacheNode {
    constructor(key, value, ttl = null) {
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
        this.createdAt = Date.now();
        this.ttl = ttl; // 生存时间（毫秒）
        this.accessCount = 1;
        this.lastAccessed = Date.now();
    }

    /**
     * 检查节点是否已过期
     */
    isExpired() {
        if (!this.ttl) return false;
        return (Date.now() - this.createdAt) > this.ttl;
    }

    /**
     * 更新访问信息
     */
    accessed() {
        this.accessCount++;
        this.lastAccessed = Date.now();
    }

    /**
     * 获取节点统计信息
     */
    getStats() {
        return {
            key: this.key,
            size: this.getSize(),
            createdAt: this.createdAt,
            lastAccessed: this.lastAccessed,
            accessCount: this.accessCount,
            age: Date.now() - this.createdAt,
            ttl: this.ttl,
            isExpired: this.isExpired()
        };
    }

    /**
     * 估算节点占用的内存大小（字节）
     */
    getSize() {
        const keySize = new TextEncoder().encode(this.key).length;
        const valueSize = this.estimateObjectSize(this.value);
        return keySize + valueSize + 64; // 64字节用于对象开销
    }

    /**
     * 估算对象大小
     */
    estimateObjectSize(obj) {
        if (typeof obj === 'string') {
            return new TextEncoder().encode(obj).length;
        } else if (typeof obj === 'number') {
            return 8;
        } else if (typeof obj === 'boolean') {
            return 4;
        } else if (obj === null || obj === undefined) {
            return 0;
        } else if (Array.isArray(obj)) {
            return obj.reduce((size, item) => size + this.estimateObjectSize(item), 0);
        } else if (typeof obj === 'object') {
            return Object.entries(obj).reduce((size, [key, value]) => {
                return size + new TextEncoder().encode(key).length + this.estimateObjectSize(value);
            }, 0);
        }
        return 0;
    }
}

/**
 * LRU缓存类
 */
class LRUCache {
    constructor(options = {}) {
        this.capacity = options.capacity || 100; // 最大容量
        this.defaultTTL = options.defaultTTL || null; // 默认TTL（毫秒）
        this.maxSize = options.maxSize || 50 * 1024 * 1024; // 最大内存占用（50MB）
        this.autoCleanup = options.autoCleanup !== false; // 是否自动清理
        this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 清理间隔（5分钟）
        
        // 双向链表
        this.head = new CacheNode('__head__', null);
        this.tail = new CacheNode('__tail__', null);
        this.head.next = this.tail;
        this.tail.prev = this.head;
        
        // 哈希表用于O(1)访问
        this.cache = new Map();
        
        // 统计信息
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            cleanups: 0,
            totalSize: 0
        };

        // 启动自动清理
        if (this.autoCleanup) {
            this.startAutoCleanup();
        }

        console.log(`📦 LRU缓存初始化完成 - 容量: ${this.capacity}, TTL: ${this.defaultTTL}ms, 最大内存: ${Math.round(this.maxSize / 1024 / 1024)}MB`);
    }

    /**
     * 获取缓存值
     */
    get(key) {
        const node = this.cache.get(key);
        
        if (!node) {
            this.stats.misses++;
            console.log(`🔍 缓存未命中: ${key}`);
            return null;
        }

        // 检查是否过期
        if (node.isExpired()) {
            console.log(`⏰ 缓存已过期: ${key}`);
            this.delete(key);
            this.stats.misses++;
            return null;
        }

        // 更新访问信息
        node.accessed();
        
        // 移动到链表头部（最近使用）
        this.moveToHead(node);
        
        this.stats.hits++;
        console.log(`✅ 缓存命中: ${key} (访问次数: ${node.accessCount})`);
        return node.value;
    }

    /**
     * 设置缓存值
     */
    set(key, value, ttl = null) {
        // 使用默认TTL如果未指定
        ttl = ttl || this.defaultTTL;
        
        // 检查是否已存在
        if (this.cache.has(key)) {
            const node = this.cache.get(key);
            node.value = value;
            node.createdAt = Date.now();
            node.ttl = ttl;
            node.accessed();
            this.moveToHead(node);
            console.log(`🔄 更新缓存: ${key}`);
            return;
        }

        // 创建新节点
        const newNode = new CacheNode(key, value, ttl);
        
        // 检查容量限制
        if (this.cache.size >= this.capacity) {
            this.evictLRU();
        }
        
        // 检查内存限制
        const nodeSize = newNode.getSize();
        if (this.stats.totalSize + nodeSize > this.maxSize) {
            console.log(`⚠️ 内存限制，清理缓存: ${Math.round(this.stats.totalSize / 1024 / 1024)}MB`);
            this.evictBySize(nodeSize);
        }

        // 添加到缓存
        this.cache.set(key, newNode);
        this.addToHead(newNode);
        this.stats.totalSize += nodeSize;
        
        console.log(`📝 添加缓存: ${key} (大小: ${Math.round(nodeSize / 1024)}KB, 总计: ${this.cache.size}/${this.capacity})`);
    }

    /**
     * 删除缓存项
     */
    delete(key) {
        const node = this.cache.get(key);
        if (node) {
            this.cache.delete(key);
            this.removeNode(node);
            this.stats.totalSize -= node.getSize();
            console.log(`🗑️ 删除缓存: ${key}`);
            return true;
        }
        return false;
    }

    /**
     * 检查缓存是否存在且未过期
     */
    has(key) {
        const node = this.cache.get(key);
        return node && !node.isExpired();
    }

    /**
     * 清空所有缓存
     */
    clear() {
        this.cache.clear();
        this.head.next = this.tail;
        this.tail.prev = this.head;
        this.stats.totalSize = 0;
        console.log('🧹 清空所有缓存');
    }

    /**
     * 获取缓存大小
     */
    size() {
        return this.cache.size;
    }

    /**
     * 获取所有缓存键
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * 移动节点到链表头部
     */
    moveToHead(node) {
        this.removeNode(node);
        this.addToHead(node);
    }

    /**
     * 添加节点到链表头部
     */
    addToHead(node) {
        node.prev = this.head;
        node.next = this.head.next;
        this.head.next.prev = node;
        this.head.next = node;
    }

    /**
     * 从链表中移除节点
     */
    removeNode(node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    /**
     * 移除并返回链表尾部节点
     */
    removeTail() {
        const lastNode = this.tail.prev;
        this.removeNode(lastNode);
        return lastNode;
    }

    /**
     * 淘汰最近最少使用的项
     */
    evictLRU() {
        const tail = this.removeTail();
        if (tail && tail.key !== '__head__' && tail.key !== '__tail__') {
            this.cache.delete(tail.key);
            this.stats.totalSize -= tail.getSize();
            this.stats.evictions++;
            console.log(`📤 LRU淘汰: ${tail.key} (访问次数: ${tail.accessCount})`);
        }
    }

    /**
     * 按内存大小淘汰项目
     */
    evictBySize(requiredSize) {
        let freedSize = 0;
        const evicted = [];

        while (freedSize < requiredSize && this.cache.size > 0) {
            const tail = this.removeTail();
            if (tail && tail.key !== '__head__' && tail.key !== '__tail__') {
                this.cache.delete(tail.key);
                freedSize += tail.getSize();
                this.stats.totalSize -= tail.getSize();
                this.stats.evictions++;
                evicted.push(tail.key);
            } else {
                break;
            }
        }

        if (evicted.length > 0) {
            console.log(`💾 内存淘汰: ${evicted.length}项 (释放: ${Math.round(freedSize / 1024)}KB)`);
        }
    }

    /**
     * 清理过期项
     */
    cleanup() {
        const expiredKeys = [];
        
        // 遍历所有节点查找过期项
        for (const [key, node] of this.cache) {
            if (node.isExpired()) {
                expiredKeys.push(key);
            }
        }

        // 删除过期项
        expiredKeys.forEach(key => this.delete(key));
        
        if (expiredKeys.length > 0) {
            this.stats.cleanups++;
            console.log(`🧹 清理过期缓存: ${expiredKeys.length}项`);
        }

        return expiredKeys.length;
    }

    /**
     * 启动自动清理
     */
    startAutoCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
        
        console.log(`⏰ 启动自动清理 - 间隔: ${this.cleanupInterval / 1000}秒`);
    }

    /**
     * 停止自动清理
     */
    stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            console.log('⏸️ 停止自动清理');
        }
    }

    /**
     * 获取缓存统计信息
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
            : '0%';

        return {
            capacity: this.capacity,
            size: this.cache.size,
            hitRate: hitRate,
            totalSize: Math.round(this.stats.totalSize / 1024) + 'KB',
            maxSize: Math.round(this.maxSize / 1024 / 1024) + 'MB',
            ...this.stats
        };
    }

    /**
     * 获取详细的缓存信息
     */
    getDetailedInfo() {
        const items = [];
        
        // 按访问时间排序
        const sortedEntries = Array.from(this.cache.entries()).sort((a, b) => {
            return b[1].lastAccessed - a[1].lastAccessed;
        });

        for (const [key, node] of sortedEntries) {
            items.push(node.getStats());
        }

        return {
            stats: this.getStats(),
            items: items
        };
    }

    /**
     * 销毁缓存
     */
    destroy() {
        this.stopAutoCleanup();
        this.clear();
        console.log('🔚 LRU缓存已销毁');
    }
}

/**
 * 创建专用的AI响应缓存
 */
class AIResponseCache extends LRUCache {
    constructor(options = {}) {
        super({
            capacity: 50,
            defaultTTL: 30 * 60 * 1000, // 30分钟
            maxSize: 20 * 1024 * 1024, // 20MB
            ...options
        });
        console.log('🤖 AI响应缓存初始化完成');
    }

    /**
     * 生成缓存键
     */
    generateKey(text, options = {}) {
        const textHash = this.simpleHash(text.substring(0, 1000)); // 使用前1000字符生成哈希
        const optionsHash = this.simpleHash(JSON.stringify(options));
        return `ai_${textHash}_${optionsHash}`;
    }

    /**
     * 简单哈希函数
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 缓存AI响应
     */
    cacheResponse(text, options, response) {
        const key = this.generateKey(text, options);
        this.set(key, response);
        return key;
    }

    /**
     * 获取缓存的AI响应
     */
    getCachedResponse(text, options) {
        const key = this.generateKey(text, options);
        return this.get(key);
    }
}

module.exports = {
    LRUCache,
    AIResponseCache,
    CacheNode
};