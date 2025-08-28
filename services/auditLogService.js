const fs = require('fs').promises;
const path = require('path');
const { getClientIP } = require('../utils/networkUtils');
const { formatFileSize } = require('../utils/fileUtils');

// 审查记录存储路径
const AUDIT_LOG_PATH = path.join(__dirname, '..', 'audit_logs.json');

/**
 * 记录审查日志
 */
async function logAuditRecord(req, fileInfo, result) {
    try {
        const clientIP = getClientIP(req);
        const now = new Date();
        const timestamp = now.toISOString();
        
        // 确保文件名编码正确
        let cleanFileName = '未知文件';
        if (fileInfo && fileInfo.originalname) {
            try {
                // 处理可能的编码问题
                cleanFileName = Buffer.from(fileInfo.originalname, 'latin1').toString('utf8');
            } catch (e) {
                cleanFileName = fileInfo.originalname;
            }
            // 如果还是乱码，尝试直接使用
            if (cleanFileName.includes('�') || /[^\x00-\x7F\u4e00-\u9fff]/.test(cleanFileName)) {
                cleanFileName = fileInfo.originalname;
            }
        }
        
        const auditRecord = {
            id: Date.now().toString(),
            timestamp: timestamp,
            date: now.toLocaleDateString('zh-CN'),
            time: now.toLocaleTimeString('zh-CN'),
            clientIP: clientIP,
            fileName: cleanFileName,
            fileSize: fileInfo ? (fileInfo.size || 0) : 0,
            fileSizeFormatted: formatFileSize(fileInfo ? (fileInfo.size || 0) : 0),
            mimeType: fileInfo ? (fileInfo.mimetype || 'unknown') : 'unknown',
            totalIssues: result.totalIssues || 0,
            needsReview: result.needsReview !== undefined ? result.needsReview : true,
            confidence: result.confidence || null,
            reason: result.reason || null,
            userAgent: req.headers['user-agent'] || 'unknown',
            status: result.status || 'completed',
            processingMethod: result.processingMethod || 'unknown',
            apiCalled: result.apiCalled || false,
            // 性能指标
            processingTime: result.processingTime || null,
            textLength: result.textLength || null
        };

        // 读取现有日志
        let logs = [];
        try {
            const existingLogs = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
            logs = JSON.parse(existingLogs);
        } catch (error) {
            console.log('创建新的审查日志文件');
        }

        // 添加新记录
        logs.push(auditRecord);

        // 保持最近1000条记录
        if (logs.length > 1000) {
            logs = logs.slice(-1000);
        }

        // 写入文件
        await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
        console.log(`✅ 记录审查日志: ${clientIP} - ${cleanFileName}`);

    } catch (error) {
        console.error('❌ 记录审查日志失败:', error);
    }
}

/**
 * 获取审查日志
 */
async function getAuditLogs(page = 1, limit = 50) {
    try {
        const logs = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
        const auditLogs = JSON.parse(logs);
        
        // 分页参数
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        // 按时间倒序排列
        auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const paginatedLogs = auditLogs.slice(startIndex, endIndex);
        
        return {
            total: auditLogs.length,
            page: page,
            limit: limit,
            totalPages: Math.ceil(auditLogs.length / limit),
            logs: paginatedLogs
        };
    } catch (error) {
        console.error('获取审查记录失败:', error);
        throw new Error('获取审查记录失败');
    }
}

/**
 * 获取审查统计信息
 */
async function getAuditStatistics() {
    try {
        const logs = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
        const auditLogs = JSON.parse(logs);
        
        const now = new Date();
        const today = now.toLocaleDateString('zh-CN');
        const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        
        const stats = {
            total: auditLogs.length,
            today: auditLogs.filter(log => log.date === today).length,
            thisMonth: auditLogs.filter(log => log.timestamp.startsWith(thisMonth)).length,
            withIssues: auditLogs.filter(log => log.totalIssues > 0).length,
            aiProcessed: auditLogs.filter(log => log.apiCalled).length,
            avgProcessingTime: calculateAverageProcessingTime(auditLogs),
            topFileTypes: getTopFileTypes(auditLogs),
            recentActivity: auditLogs
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10)
        };
        
        return stats;
    } catch (error) {
        console.error('获取统计信息失败:', error);
        return {
            total: 0,
            today: 0,
            thisMonth: 0,
            withIssues: 0,
            aiProcessed: 0,
            avgProcessingTime: null,
            topFileTypes: [],
            recentActivity: []
        };
    }
}

/**
 * 计算平均处理时间
 */
function calculateAverageProcessingTime(logs) {
    const validTimes = logs
        .filter(log => log.processingTime && log.processingTime > 0)
        .map(log => log.processingTime);
    
    if (validTimes.length === 0) return null;
    
    const avg = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
    return Math.round(avg);
}

/**
 * 获取文件类型统计
 */
function getTopFileTypes(logs) {
    const fileTypes = {};
    
    logs.forEach(log => {
        const type = log.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            ? 'DOCX' 
            : log.mimeType === 'application/msword' 
            ? 'DOC' 
            : '其他';
        
        fileTypes[type] = (fileTypes[type] || 0) + 1;
    });
    
    return Object.entries(fileTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
}

/**
 * 导出审查记录为Excel格式数据
 */
async function exportAuditLogsData() {
    try {
        const logs = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
        const auditLogs = JSON.parse(logs);
        
        // 按时间倒序排列
        auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return auditLogs.map(log => ({
            '记录ID': log.id,
            '审查时间': log.timestamp,
            '审查日期': log.date,
            '审查时刻': log.time,
            '客户端IP': log.clientIP,
            '文件名': log.fileName,
            '文件大小': log.fileSizeFormatted,
            '文件类型': log.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Word文档' : 
                       log.mimeType === 'text/plain' ? '文本文件' : '其他',
            '问题数量': log.totalIssues,
            '是否需要审查': log.needsReview ? '是' : '否',
            '置信度': log.confidence ? (log.confidence * 100).toFixed(1) + '%' : 'N/A',
            '处理方式': getProcessingMethodName(log.processingMethod),
            'API调用': log.apiCalled ? '是' : '否',
            '审查状态': log.status === 'completed' ? '已完成' : '处理中',
            '处理时间(ms)': log.processingTime || 'N/A',
            '用户代理': log.userAgent
        }));
    } catch (error) {
        console.error('导出审查记录失败:', error);
        throw new Error('导出审查记录失败');
    }
}

/**
 * 获取处理方式的中文名称
 */
function getProcessingMethodName(method) {
    const methodMap = {
        'ai_detailed_review': 'AI详细审查',
        'ai_precheck': 'AI预判断',
        'keyword_filter': '关键词过滤',
        'keyword_fallback': '关键词回退',
        'mock_fallback': '模拟回退'
    };
    return methodMap[method] || method || '未知';
}

/**
 * 清理旧的审查记录
 */
async function cleanupOldLogs(daysToKeep = 90) {
    try {
        const logs = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
        const auditLogs = JSON.parse(logs);
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const filteredLogs = auditLogs.filter(log => 
            new Date(log.timestamp) > cutoffDate
        );
        
        if (filteredLogs.length < auditLogs.length) {
            await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(filteredLogs, null, 2), 'utf8');
            console.log(`✅ 清理了 ${auditLogs.length - filteredLogs.length} 条过期记录`);
        }
        
        return filteredLogs.length;
    } catch (error) {
        console.error('清理审查记录失败:', error);
        throw error;
    }
}

module.exports = {
    logAuditRecord,
    getAuditLogs,
    getAuditStatistics,
    exportAuditLogsData,
    cleanupOldLogs,
    AUDIT_LOG_PATH
};