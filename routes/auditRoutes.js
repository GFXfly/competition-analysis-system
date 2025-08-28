const express = require('express');
const XLSX = require('xlsx');
const { getAuditLogs, getAuditStatistics, exportAuditLogsData } = require('../services/auditLogService');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../config/constants');

const router = express.Router();

/**
 * 获取审查记录列表
 */
router.get('/audit-logs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        
        const result = await getAuditLogs(page, limit);
        
        // 如果有搜索条件，进行过滤
        if (search) {
            result.logs = result.logs.filter(log => 
                log.fileName.toLowerCase().includes(search.toLowerCase()) ||
                log.clientIP.includes(search) ||
                log.reason?.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        res.json(result);
    } catch (error) {
        console.error('获取审查记录失败:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: ERROR_MESSAGES.REVIEW_FAILED
        });
    }
});

/**
 * 获取审查统计信息
 */
router.get('/audit-stats', async (req, res) => {
    try {
        const stats = await getAuditStatistics();
        res.json(stats);
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: '获取统计信息失败'
        });
    }
});

/**
 * 下载审查记录
 */
router.get('/audit-logs/download', async (req, res) => {
    try {
        const format = req.query.format || 'excel';
        
        if (format === 'excel') {
            const excelData = await exportAuditLogsData();
            
            // 创建工作簿
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            
            // 设置列宽
            const colWidths = [
                {wch: 15}, // 记录ID
                {wch: 20}, // 审查时间
                {wch: 12}, // 审查日期
                {wch: 10}, // 审查时刻
                {wch: 15}, // 客户端IP
                {wch: 30}, // 文件名
                {wch: 10}, // 文件大小
                {wch: 10}, // 文件类型
                {wch: 8},  // 问题数量
                {wch: 12}, // 是否需要审查
                {wch: 8},  // 置信度
                {wch: 12}, // 处理方式
                {wch: 8},  // API调用
                {wch: 8},  // 审查状态
                {wch: 12}, // 处理时间
                {wch: 50}  // 用户代理
            ];
            worksheet['!cols'] = colWidths;
            
            // 添加工作表到工作簿
            XLSX.utils.book_append_sheet(workbook, worksheet, '审查记录');
            
            // 生成Excel文件
            const excelBuffer = XLSX.write(workbook, { 
                type: 'buffer', 
                bookType: 'xlsx',
                compression: true 
            });
            
            const fileName = `公平竞争审查记录_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Length', excelBuffer.length);
            
            res.send(excelBuffer);
            
        } else if (format === 'json') {
            // JSON格式
            const jsonData = await exportAuditLogsData();
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.json"`);
            res.json(jsonData);
        } else {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: true,
                message: '不支持的导出格式'
            });
        }
    } catch (error) {
        console.error('下载审查记录失败:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: true,
            message: ERROR_MESSAGES.EXPORT_FAILED
        });
    }
});

/**
 * 审查记录管理页面
 */
router.get('/admin/audit-logs', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>审查记录管理 - 优化版</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        .table-container { 
            max-height: 600px; 
            overflow-y: auto; 
        }
        .ip-address { 
            font-family: monospace; 
        }
        .file-name { 
            max-width: 200px; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap; 
        }
        .stats-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .processing-time {
            font-size: 0.8em;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container-fluid py-4">
        <div class="row">
            <div class="col-12">
                <div class="text-center mb-4">
                    <h1 class="h3 mb-4">
                        <i class="bi bi-graph-up me-2"></i>审查记录管理中心
                    </h1>
                </div>
                
                <!-- 统计信息卡片 -->
                <div class="row mb-4" id="statsCards">
                    <div class="col-md-3">
                        <div class="card stats-card">
                            <div class="card-body text-center">
                                <i class="bi bi-files fs-1 mb-2"></i>
                                <h4 id="totalCount">-</h4>
                                <p class="mb-0">总审查数</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card">
                            <div class="card-body text-center">
                                <i class="bi bi-calendar-today fs-1 mb-2"></i>
                                <h4 id="todayCount">-</h4>
                                <p class="mb-0">今日审查</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card">
                            <div class="card-body text-center">
                                <i class="bi bi-exclamation-triangle fs-1 mb-2"></i>
                                <h4 id="issuesCount">-</h4>
                                <p class="mb-0">发现问题</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card">
                            <div class="card-body text-center">
                                <i class="bi bi-robot fs-1 mb-2"></i>
                                <h4 id="aiCount">-</h4>
                                <p class="mb-0">AI处理</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 操作按钮 -->
                <div class="text-center mb-4">
                    <div class="btn-group">
                        <a href="/audit-logs/download?format=excel" class="btn btn-success">
                            <i class="bi bi-file-earmark-excel me-2"></i>导出Excel
                        </a>
                        <a href="/audit-logs/download?format=json" class="btn btn-outline-secondary">
                            <i class="bi bi-filetype-json me-2"></i>导出JSON
                        </a>
                        <button class="btn btn-info" onclick="refreshData()">
                            <i class="bi bi-arrow-clockwise me-2"></i>刷新数据
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="row align-items-center">
                            <div class="col-md-6">
                                <div class="input-group">
                                    <input type="text" class="form-control" id="searchInput" placeholder="搜索IP地址、文件名或审查结果...">
                                    <button class="btn btn-outline-secondary" onclick="searchLogs()">
                                        <i class="bi bi-search"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-6 text-end">
                                <span class="text-muted">
                                    当前显示: <span id="currentCount">0</span> / 
                                    总记录数: <span id="totalRecords">0</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-container">
                            <table class="table table-striped table-hover mb-0">
                                <thead class="table-dark sticky-top">
                                    <tr>
                                        <th>时间</th>
                                        <th>客户端IP</th>
                                        <th>文件名</th>
                                        <th>文件大小</th>
                                        <th>问题数量</th>
                                        <th>是否需要审查</th>
                                        <th>置信度</th>
                                        <th>处理方式</th>
                                        <th>API调用</th>
                                        <th>处理时间</th>
                                    </tr>
                                </thead>
                                <tbody id="logsTableBody">
                                    <tr>
                                        <td colspan="10" class="text-center">加载中...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card-footer">
                        <nav>
                            <ul class="pagination pagination-sm justify-content-center mb-0" id="pagination">
                                <!-- 分页将通过JavaScript生成 -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let currentPage = 1;
        let totalPages = 1;
        let currentSearch = '';

        // 加载统计信息
        async function loadStats() {
            try {
                const response = await fetch('/audit-stats');
                const stats = await response.json();
                
                document.getElementById('totalCount').textContent = stats.total || 0;
                document.getElementById('todayCount').textContent = stats.today || 0;
                document.getElementById('issuesCount').textContent = stats.withIssues || 0;
                document.getElementById('aiCount').textContent = stats.aiProcessed || 0;
            } catch (error) {
                console.error('加载统计信息失败:', error);
            }
        }

        // 加载审查记录
        async function loadLogs(page = 1, search = '') {
            try {
                const response = await fetch(\`/audit-logs?page=\${page}&limit=50&search=\${encodeURIComponent(search)}\`);
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.message);
                }

                currentPage = data.page;
                totalPages = data.totalPages;
                currentSearch = search;
                
                document.getElementById('totalRecords').textContent = data.total;
                document.getElementById('currentCount').textContent = data.logs.length;
                
                const tbody = document.getElementById('logsTableBody');
                tbody.innerHTML = '';
                
                if (data.logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">暂无记录</td></tr>';
                    return;
                }
                
                data.logs.forEach(log => {
                    const row = document.createElement('tr');
                    
                    // 处理方式badge
                    let methodBadge = getMethodBadge(log.processingMethod);
                    
                    // 处理时间显示
                    let processingTimeText = 'N/A';
                    if (log.processingTime) {
                        processingTimeText = log.processingTime < 1000 
                            ? \`\${log.processingTime}ms\`
                            : \`\${(log.processingTime / 1000).toFixed(1)}s\`;
                    }
                    
                    row.innerHTML = \`
                        <td>
                            <div class="small">\${log.date}<br>\${log.time}</div>
                        </td>
                        <td><span class="ip-address">\${log.clientIP}</span></td>
                        <td><div class="file-name" title="\${log.fileName}">\${log.fileName}</div></td>
                        <td>\${log.fileSizeFormatted}</td>
                        <td><span class="badge \${log.totalIssues > 0 ? 'bg-warning' : 'bg-success'}">\${log.totalIssues}</span></td>
                        <td>\${log.needsReview ? '<span class="text-warning">需要</span>' : '<span class="text-success">不需要</span>'}</td>
                        <td>\${log.confidence ? (log.confidence * 100).toFixed(1) + '%' : 'N/A'}</td>
                        <td>\${methodBadge}</td>
                        <td><span class="badge \${log.apiCalled ? 'bg-success' : 'bg-secondary'}">\${log.apiCalled ? '是' : '否'}</span></td>
                        <td>
                            <span class="processing-time">\${processingTimeText}</span>
                        </td>
                    \`;
                    tbody.appendChild(row);
                });
                
                updatePagination();
            } catch (error) {
                console.error('加载审查记录失败:', error);
                document.getElementById('logsTableBody').innerHTML = 
                    '<tr><td colspan="10" class="text-center text-danger">加载失败: ' + error.message + '</td></tr>';
            }
        }

        // 获取处理方式badge
        function getMethodBadge(method) {
            const badges = {
                'ai_precheck': '<span class="badge bg-primary">AI预判断</span>',
                'ai_detailed_review': '<span class="badge bg-success">AI详细审查</span>',
                'keyword_filter': '<span class="badge bg-info">关键词过滤</span>',
                'keyword_fallback': '<span class="badge bg-warning">关键词回退</span>',
                'mock_fallback': '<span class="badge bg-danger">模拟回退</span>'
            };
            return badges[method] || \`<span class="badge bg-secondary">\${method || '未知'}</span>\`;
        }

        // 更新分页
        function updatePagination() {
            const pagination = document.getElementById('pagination');
            pagination.innerHTML = '';
            
            // 上一页
            const prevLi = document.createElement('li');
            prevLi.className = \`page-item \${currentPage === 1 ? 'disabled' : ''}\`;
            prevLi.innerHTML = \`<a class="page-link" href="#" onclick="loadLogs(\${currentPage - 1}, '\${currentSearch}')">上一页</a>\`;
            pagination.appendChild(prevLi);
            
            // 页码
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);
            
            for (let i = startPage; i <= endPage; i++) {
                const li = document.createElement('li');
                li.className = \`page-item \${i === currentPage ? 'active' : ''}\`;
                li.innerHTML = \`<a class="page-link" href="#" onclick="loadLogs(\${i}, '\${currentSearch}')">\${i}</a>\`;
                pagination.appendChild(li);
            }
            
            // 下一页
            const nextLi = document.createElement('li');
            nextLi.className = \`page-item \${currentPage === totalPages ? 'disabled' : ''}\`;
            nextLi.innerHTML = \`<a class="page-link" href="#" onclick="loadLogs(\${currentPage + 1}, '\${currentSearch}')">下一页</a>\`;
            pagination.appendChild(nextLi);
        }

        // 搜索功能
        function searchLogs() {
            const searchTerm = document.getElementById('searchInput').value.trim();
            loadLogs(1, searchTerm);
        }

        // 刷新数据
        function refreshData() {
            loadStats();
            loadLogs(currentPage, currentSearch);
        }

        // 页面加载时初始化
        document.addEventListener('DOMContentLoaded', function() {
            loadStats();
            loadLogs();
            
            // 搜索框回车事件
            document.getElementById('searchInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchLogs();
                }
            });
            
            // 每30秒自动刷新
            setInterval(refreshData, 30000);
        });
    </script>
</body>
</html>
    `);
});

module.exports = router;