/**
 * 获取客户端真实IP地址
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip ||
           'unknown';
}

/**
 * 验证IP地址格式
 */
function isValidIP(ip) {
    if (!ip || ip === 'unknown') return false;
    
    // IPv4 验证
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
        const parts = ip.split('.');
        return parts.every(part => {
            const num = parseInt(part);
            return num >= 0 && num <= 255;
        });
    }
    
    // IPv6 验证 (简化版)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
}

/**
 * 清理IP地址（移除端口号等）
 */
function cleanIP(ip) {
    if (!ip) return 'unknown';
    
    // 移除端口号
    if (ip.includes(':') && !ip.includes('::')) {
        const parts = ip.split(':');
        if (parts.length === 2 && !isNaN(parts[1])) {
            return parts[0];
        }
    }
    
    // 移除IPv6的 [] 包装
    if (ip.startsWith('[') && ip.endsWith(']')) {
        return ip.slice(1, -1);
    }
    
    return ip;
}

/**
 * 检查是否为内网IP
 */
function isPrivateIP(ip) {
    if (!ip || ip === 'unknown') return false;
    
    const cleanedIP = cleanIP(ip);
    
    // 内网IP范围
    const privateRanges = [
        /^127\./, // 127.x.x.x
        /^192\.168\./, // 192.168.x.x
        /^10\./, // 10.x.x.x
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.x.x - 172.31.x.x
        /^::1$/, // IPv6 localhost
        /^fc00:/, // IPv6 unique local
        /^fe80:/ // IPv6 link local
    ];
    
    return privateRanges.some(range => range.test(cleanedIP));
}

module.exports = {
    getClientIP,
    isValidIP,
    cleanIP,
    isPrivateIP
};