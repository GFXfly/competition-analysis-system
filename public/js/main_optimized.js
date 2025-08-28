// 优化版前端主程序 - 2.5.0
document.addEventListener('DOMContentLoaded', function() {
    // DOM元素引用
    const elements = {
        uploadBtn: document.getElementById('upload-btn'),
        fileUpload: document.getElementById('file-upload'),
        reviewBtn: document.getElementById('review-btn'),
        uploadArea: document.getElementById('upload-area'),
        fileInfo: document.getElementById('file-info'),
        fileName: document.getElementById('file-name'),
        fileSize: document.getElementById('file-size'),
        removeFile: document.getElementById('remove-file'),
        loadingElement: document.getElementById('loading'),
        reasoningContent: document.getElementById('reasoning-content'),
        reviewResults: document.getElementById('review-results'),
        issuesContainer: document.getElementById('issues-container'),
        issueCount: document.getElementById('issue-count'),
        newReviewBtn: document.getElementById('new-review-btn'),
        exportResultBtn: document.getElementById('export-result-btn')
    };
    
    // 应用状态
    let appState = {
        currentFile: null,
        currentResult: null,
        isProcessing: false,
        retryCount: 0,
        maxRetries: 3
    };
    
    // 配置常量
    const CONFIG = {
        MAX_FILE_SIZE: 30 * 1024 * 1024, // 30MB
        ALLOWED_TYPES: [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ],
        ALLOWED_EXTENSIONS: ['docx', 'doc'],
        TIMEOUT: 120000, // 2分钟，适应代理延迟
        RETRY_DELAY: 3000 // 3秒
    };

    // 错误消息映射
    const ERROR_MESSAGES = {
        FILE_TOO_LARGE: '文件大小不能超过30MB',
        INVALID_FILE_TYPE: '只支持 DOCX 和 DOC 文件',
        NO_FILE_SELECTED: '请选择要审查的文件',
        NETWORK_ERROR: '网络连接失败，请检查网络设置',
        SERVER_ERROR: '服务器处理错误，请稍后重试',
        TIMEOUT_ERROR: '请求超时，请稍后重试',
        EXPORT_ERROR: '导出失败，请重试'
    };

    // 初始化事件监听器
    initializeEventListeners();
    
    // 检查浏览器兼容性
    checkBrowserCompatibility();

    /**
     * 初始化所有事件监听器
     */
    function initializeEventListeners() {
        // 文件上传相关
        elements.uploadBtn?.addEventListener('click', () => elements.fileUpload?.click());
        elements.fileUpload?.addEventListener('change', handleFileSelection);
        elements.removeFile?.addEventListener('click', resetFileSelection);
        
        // 拖拽功能
        setupDragAndDrop();
        
        // 审查相关
        elements.reviewBtn?.addEventListener('click', startStreamReview);
        elements.newReviewBtn?.addEventListener('click', resetForNewReview);
        elements.exportResultBtn?.addEventListener('click', exportCurrentResult);
        
        // 键盘快捷键
        setupKeyboardShortcuts();
        
        // 页面离开前确认
        setupBeforeUnloadHandler();
    }

    /**
     * 设置拖拽功能
     */
    function setupDragAndDrop() {
        if (!elements.uploadArea) return;
        
        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            elements.uploadArea.addEventListener(eventName, preventDefaults);
        });
        
        elements.uploadArea.addEventListener('dragover', () => {
            elements.uploadArea.classList.add('border-primary');
        });
        
        elements.uploadArea.addEventListener('dragleave', () => {
            elements.uploadArea.classList.remove('border-primary');
        });
        
        elements.uploadArea.addEventListener('drop', handleDrop);
    }

    /**
     * 阻止默认事件
     */
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * 处理文件拖拽
     */
    function handleDrop(e) {
        elements.uploadArea.classList.remove('border-primary');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection({ target: { files } });
        }
    }

    /**
     * 设置键盘快捷键
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+O: 打开文件
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                elements.fileUpload?.click();
            }
            // Enter: 开始审查（如果有文件）
            if (e.key === 'Enter' && appState.currentFile && !appState.isProcessing) {
                e.preventDefault();
                startStreamReview();
            }
            // Escape: 重置
            if (e.key === 'Escape' && !appState.isProcessing) {
                resetFileSelection();
            }
        });
    }

    /**
     * 页面离开前确认
     */
    function setupBeforeUnloadHandler() {
        window.addEventListener('beforeunload', (e) => {
            if (appState.isProcessing) {
                e.preventDefault();
                e.returnValue = '正在处理文件，确定要离开吗？';
                return e.returnValue;
            }
        });
    }

    /**
     * 检查浏览器兼容性
     */
    function checkBrowserCompatibility() {
        const features = {
            fetch: 'fetch' in window,
            fileAPI: 'File' in window && 'FileReader' in window,
            dragDrop: 'draggable' in document.createElement('div')
        };
        
        const missingFeatures = Object.entries(features)
            .filter(([name, supported]) => !supported)
            .map(([name]) => name);
        
        if (missingFeatures.length > 0) {
            showNotification('您的浏览器版本过低，部分功能可能无法正常使用', 'warning');
        }
    }

    /**
     * 处理文件选择（增强版）
     */
    function handleFileSelection(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const file = files[0];
        
        // 验证文件
        const validation = validateFile(file);
        if (!validation.valid) {
            showNotification(validation.message, 'error');
            resetFileInput();
            return;
        }
        
        // 显示涉密文档禁止上传提醒
        showConfidentialDocumentWarning(() => {
            appState.currentFile = file;
            updateFileDisplay(file);
            updateUIState('file_selected');
            
            showNotification('文件选择成功', 'success');
        });
    }

    /**
     * 文件验证（增强版）
     */
    function validateFile(file) {
        if (!file) {
            return { valid: false, message: ERROR_MESSAGES.NO_FILE_SELECTED };
        }
        
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            return { valid: false, message: ERROR_MESSAGES.FILE_TOO_LARGE };
        }
        
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const isValidType = CONFIG.ALLOWED_TYPES.includes(file.type) || 
                           CONFIG.ALLOWED_EXTENSIONS.includes(fileExt);
        
        if (!isValidType) {
            return { valid: false, message: ERROR_MESSAGES.INVALID_FILE_TYPE };
        }
        
        // 检查文件名是否包含特殊字符
        if (/[<>:"/\\|?*]/.test(file.name)) {
            return { valid: false, message: '文件名包含非法字符，请重命名后重试' };
        }
        
        return { valid: true };
    }

    /**
     * 更新文件显示
     */
    function updateFileDisplay(file) {
        if (!elements.fileName || !elements.fileSize) return;
        
        elements.uploadArea?.classList.add('d-none');
        elements.fileInfo?.classList.remove('d-none');
        elements.fileName.textContent = file.name;
        elements.fileSize.textContent = `文件大小: ${formatFileSize(file.size)}`;
        
        // 添加文件类型图标
        const fileIcon = getFileIcon(file.name);
        elements.fileName.innerHTML = `${fileIcon} ${file.name}`;
    }

    /**
     * 获取文件图标
     */
    function getFileIcon(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const icons = {
            'docx': '📄',
            'doc': '📄',
            'txt': '📝'
        };
        return icons[ext] || '📁';
    }

    /**
     * 重置文件选择
     */
    function resetFileSelection() {
        appState.currentFile = null;
        resetFileInput();
        updateUIState('initial');
    }

    /**
     * 重置文件输入
     */
    function resetFileInput() {
        if (elements.fileUpload) {
            elements.fileUpload.value = '';
        }
        elements.fileInfo?.classList.add('d-none');
        elements.uploadArea?.classList.remove('d-none');
    }

    /**
     * 重置进行新审查
     */
    function resetForNewReview() {
        resetFileSelection();
        elements.reviewResults?.classList.add('d-none');
        appState.currentResult = null;
        updateUIState('initial');
    }

    /**
     * 更新UI状态
     */
    function updateUIState(state) {
        switch (state) {
            case 'initial':
                if (elements.reviewBtn) {
                    elements.reviewBtn.disabled = true;
                    elements.reviewBtn.textContent = "选择文件开始审查";
                }
                elements.loadingElement?.classList.add('d-none');
                break;
                
            case 'file_selected':
                if (elements.reviewBtn) {
                    elements.reviewBtn.disabled = false;
                    elements.reviewBtn.textContent = "开始审查";
                }
                break;
                
            case 'processing':
                if (elements.reviewBtn) {
                    elements.reviewBtn.disabled = true;
                    elements.reviewBtn.textContent = "审查中...";
                }
                elements.fileInfo?.classList.add('d-none');
                elements.loadingElement?.classList.remove('d-none');
                appState.isProcessing = true;
                break;
                
            case 'completed':
                if (elements.reviewBtn) {
                    elements.reviewBtn.disabled = false;
                    elements.reviewBtn.textContent = "开始审查";
                }
                elements.loadingElement?.classList.add('d-none');
                appState.isProcessing = false;
                break;
                
            case 'error':
                if (elements.reviewBtn) {
                    elements.reviewBtn.disabled = false;
                    elements.reviewBtn.textContent = "重新审查";
                }
                elements.loadingElement?.classList.add('d-none');
                elements.fileInfo?.classList.remove('d-none');
                appState.isProcessing = false;
                break;
        }
    }

    /**
     * 流式审查（增强版）
     */
    async function startStreamReview() {
        if (!appState.currentFile || appState.isProcessing) return;
        
        appState.retryCount = 0;
        await performReviewWithRetry();
    }

    /**
     * 带重试的审查执行
     */
    async function performReviewWithRetry() {
        while (appState.retryCount <= appState.maxRetries) {
            try {
                updateUIState('processing');
                
                if (appState.retryCount === 0) {
                    clearReasoningLog();
                    addReasoningStep('🚀 开始处理文件，准备进行公平竞争审查...');
                } else {
                    addReasoningStep(`🔄 正在进行第${appState.retryCount + 1}次尝试...`);
                }
                
                await executeStreamReview();
                return; // 成功完成
                
            } catch (error) {
                console.error(`第${appState.retryCount + 1}次尝试失败:`, error);
                appState.retryCount++;
                
                if (appState.retryCount <= appState.maxRetries) {
                    const waitTime = Math.min(CONFIG.RETRY_DELAY * appState.retryCount, 10000); // 指数退避，最大10秒
                    addReasoningStep(`❌ 连接失败，${waitTime/1000}秒后重试... (${appState.retryCount}/${appState.maxRetries})`);
                    await delay(waitTime);
                } else {
                    addReasoningStep('❌ 多次尝试后仍然失败，请检查网络连接或稍后重试', 'result');
                    handleStreamError(new Error('审查请求失败，请稍后重试'));
                    break;
                }
            }
        }
    }

    /**
     * 执行流式审查
     */
    async function executeStreamReview() {
        const formData = new FormData();
        formData.append('file', appState.currentFile);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, CONFIG.TIMEOUT);
        
        try {
            const response = await fetch('/stream-review', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            await processStreamResponse(response);
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * 处理流响应
     */
    async function processStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8'); // 明确指定UTF-8编码
        let buffer = '';
        let hasReceivedData = false;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            hasReceivedData = true;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonData = line.substring(6);
                        console.log('🔍 前端接收到的JSON数据长度:', jsonData.length);
                        
                        const data = JSON.parse(jsonData);
                        
                        // 调试：检查complete消息的编码
                        if (data.type === 'complete' && data.result && data.result.issues && data.result.issues[0]) {
                            console.log('🔍 前端解析到的第一个问题原文引用:', data.result.issues[0].quote || 'undefined');
                            console.log('🔍 前端解析到的第一个问题标题:', data.result.issues[0].title || 'undefined');
                        }
                        
                        handleStreamMessage(data);
                        
                        if (data.type === 'complete' || data.type === 'error') {
                            return;
                        }
                    } catch (e) {
                        console.warn('解析流数据错误:', e, '原始数据长度:', line.length);
                        console.warn('原始数据前200字符:', line.substring(0, 200));
                    }
                }
            }
        }
        
        if (!hasReceivedData) {
            throw new Error('未收到服务器响应数据');
        }
    }

    /**
     * 处理流式消息（增强版）
     */
    function handleStreamMessage(data) {
        switch (data.type) {
            case 'start':
                addReasoningStep('📄 文件上传成功，开始提取文档内容...');
                break;
                
            case 'progress':
                handleProgressMessage(data);
                break;
                
            case 'precheck_result':
                // 预检查已移除，忽略此消息
                break;
                
            case 'complete':
                handleCompleteMessage(data);
                break;
                
            case 'ai_thinking':
                addAIThinkingStep(data.message);
                break;
                
            case 'error':
                addReasoningStep(`❌ 审查过程出错：${data.message}`, 'result');
                handleStreamError(new Error(data.message));
                break;
        }
    }

    /**
     * 处理进度消息
     */
    function handleProgressMessage(data) {
        const progressMessages = {
            'extract': '📝 正在提取文档内容，准备进行文本分析...',
            'extract_success': `📄 ${data.message}`,
            'detailed_review': '🤖 正在进行公平竞争审查，请稍候...'
        };
        
        if (data.step === 'extract_success') {
            removeProcessingStep();
        }
        
        const message = progressMessages[data.step];
        if (message) {
            if (data.step === 'extract_success') {
                addReasoningStep(message);
            } else {
                removeProcessingStep();
                addProcessingStep(message);
            }
        }
    }

    /**
     * 处理预检查结果
     */
    function handlePrecheckResult(data) {
        removeProcessingStep();
        
        if (data.result.needsReview) {
            const confidence = data.result.confidence ? 
                (data.result.confidence * 100).toFixed(1) + '%' : '未知';
            
            // 显示预检查结果信息
            let precheckMessage = `✅ 预检查完成：需要详细审查，置信度 ${confidence}`;
            if (data.result.matchedKeywords && data.result.matchedKeywords.length > 0) {
                precheckMessage += `（匹配关键词：${data.result.matchedKeywords.join('、')}）`;
            }
            
            addReasoningStep(precheckMessage);
            
            // 添加进度提示
            addReasoningStep('🔄 准备启动详细审查流程...');
            
        } else {
            // 不需要审查，显示原因并准备展示结果
            addReasoningStep(`✅ 预检查完成：${data.result.reason}`, 'result');
            
            // 延迟展示最终结果
            setTimeout(() => {
                showPreCheckResult(data.result);
            }, 1000);
        }
    }

    /**
     * 处理完成消息
     */
    function handleCompleteMessage(data) {
        removeProcessingStep();
        const totalIssues = data.result.totalIssues || 0;
        const issueText = totalIssues === 0 ? '未发现问题' : `发现 ${totalIssues} 个潜在问题`;
        
        // 显示性能信息
        if (data.result.processingTime) {
            const timeText = data.result.processingTime < 1000 ? 
                `${data.result.processingTime}ms` : 
                `${(data.result.processingTime / 1000).toFixed(1)}s`;
            addReasoningStep(`🎯 AI审查完成！${issueText}，总耗时：${timeText}`, 'result');
        } else {
            addReasoningStep(`🎯 AI审查完成！${issueText}`, 'result');
        }
        
        setTimeout(() => {
            showFinalResult(data.result);
        }, 800);
    }

    /**
     * 显示预判断结果
     */
    function showPreCheckResult(result) {
        updateUIState('completed');
        
        if (elements.issueCount) {
            elements.issueCount.textContent = '0';
        }
        
        if (elements.issuesContainer) {
            elements.issuesContainer.innerHTML = `
                <div class="alert alert-success">
                    <div class="d-flex align-items-center mb-3">
                        <i class="bi bi-check-circle-fill me-2 text-success" style="font-size: 1.5rem;"></i>
                        <h4 class="mb-0">无需公平竞争审查</h4>
                    </div>
                    <p><strong>判断理由：</strong>${result.reason}</p>
                    <p><strong>置信度：</strong>${(result.confidence * 100).toFixed(1)}%</p>
                    <p><strong>文档类型：</strong>${result.documentType}</p>
                    <p class="mb-0 text-muted">该文档不涉及公平竞争审查范围，可直接发布实施。</p>
                </div>
            `;
        }
        
        elements.reviewResults?.classList.remove('d-none');
        showNotification('预判断完成，文档无需审查', 'success');
    }

    /**
     * 显示最终结果
     */
    function showFinalResult(result) {
        updateUIState('completed');
        
        console.log('🎯 显示最终结果:', result);
        
        // 智能解析结果数据
        const processedResult = processResultData(result);
        console.log('处理后的结果数据:', processedResult);
        
        appState.currentResult = processedResult;
        
        if (elements.issueCount) {
            elements.issueCount.textContent = processedResult.totalIssues || 0;
        }
        
        displayIssues(processedResult.issues || []);
        elements.reviewResults?.classList.remove('d-none');
        
        const message = processedResult.totalIssues > 0 ? 
            `审查完成，发现 ${processedResult.totalIssues} 个问题` : 
            '审查完成，未发现问题';
        showNotification(message, processedResult.totalIssues > 0 ? 'warning' : 'success');
    }

    /**
     * 智能处理结果数据（增强版）
     */
    function processResultData(result) {
        if (!result) return { totalIssues: 0, issues: [] };
        
        console.log('🔍 开始处理结果数据，原始类型:', typeof result);
        console.log('🔍 原始结果数据:', result);
        
        // 如果整个结果是字符串，尝试解析JSON
        if (typeof result === 'string') {
            console.log('📝 结果为字符串，尝试JSON解析...');
            const parsed = tryParseAIJSON(result);
            if (parsed) {
                console.log('✅ JSON解析成功:', parsed);
                return processResultData(parsed);
            } else {
                console.log('❌ JSON解析失败，作为单个问题处理');
                return {
                    totalIssues: 1,
                    issues: [{
                        id: 1,
                        title: 'AI审查结果',
                        description: result.substring(0, 500) + (result.length > 500 ? '...' : ''),
                        quote: '',
                        violation: '',
                        suggestion: ''
                    }]
                };
            }
        }
        
        // 检查是否包含rawResponse字段中的JSON数据
        if (result.rawResponse && typeof result.rawResponse === 'string') {
            console.log('🔍 检查rawResponse字段中的JSON数据...');
            const parsedFromRaw = tryParseAIJSON(result.rawResponse);
            if (parsedFromRaw && parsedFromRaw.issues) {
                console.log('✅ 从rawResponse解析出结构化数据');
                return {
                    ...result,
                    totalIssues: parsedFromRaw.totalIssues || parsedFromRaw.issues.length,
                    issues: parsedFromRaw.issues
                };
            }
        }
        
        // 标准化字段名称（处理不同的命名变体）
        const totalIssues = result.totalIssues || result.totalissues || result.total || 0;
        let issues = result.issues || result.Issues || [];
        
        // 确保issues是数组
        if (!Array.isArray(issues)) {
            console.log('📝 issues不是数组，尝试解析...', typeof issues);
            if (typeof issues === 'string') {
                const parsedIssues = tryParseAIJSON(issues);
                if (Array.isArray(parsedIssues)) {
                    issues = parsedIssues;
                } else {
                    // 如果无法解析为数组，创建单个问题
                    issues = [{
                        id: 1,
                        title: 'AI审查结果',
                        description: issues.substring(0, 500) + (issues.length > 500 ? '...' : ''),
                        quote: '',
                        violation: '',
                        suggestion: ''
                    }];
                }
            } else {
                issues = [];
            }
        }
        
        console.log(`✅ 最终解析出 ${totalIssues} 个问题，issues数组长度: ${issues.length}`);
        
        return {
            ...result,
            totalIssues: Math.max(totalIssues, issues.length),
            issues: issues
        };
    }

    /**
     * 显示问题列表（增强版）
     */
    function displayIssues(issues) {
        if (!elements.issuesContainer) return;
        
        console.log('🎯 开始显示问题列表，共', issues.length, '个问题');
        console.log('原始问题数据:', issues);
        
        elements.issuesContainer.innerHTML = '';
        
        if (!issues || issues.length === 0) {
            elements.issuesContainer.innerHTML = `
                <div class="alert alert-success border-0 shadow-sm">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-check-circle-fill me-3 text-success" style="font-size: 1.5rem;"></i>
                        <div>
                            <h5 class="alert-heading mb-1">✅ 审查通过</h5>
                            <p class="mb-0">未发现竞争限制问题，文件符合公平竞争要求。</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // 添加问题概览
        const summaryElement = document.createElement('div');
        summaryElement.className = 'alert alert-warning border-0 shadow-sm mb-4';
        summaryElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-triangle-fill me-3 text-warning" style="font-size: 1.5rem;"></i>
                <div>
                    <h5 class="alert-heading mb-1">🔍 审查发现问题</h5>
                    <p class="mb-0">共发现 <strong>${issues.length}</strong> 个需要注意的公平竞争问题，请逐一查看详情：</p>
                </div>
            </div>
        `;
        elements.issuesContainer.appendChild(summaryElement);
        
        issues.forEach((issue, index) => {
            console.log(`创建第${index + 1}个问题元素:`, issue);
            const issueElement = createIssueElement(issue, index);
            elements.issuesContainer.appendChild(issueElement);
        });
        
        console.log('✅ 问题列表显示完成');
    }

    /**
     * 创建问题元素（增强版）
     */
    function createIssueElement(issue, index) {
        const element = document.createElement('div');
        element.className = 'card mb-4 issue-card border-0 shadow-sm';
        
        // 智能处理不同格式的问题数据
        const processedIssue = processIssueData(issue);
        
        // 获取严重程度对应的样式
        const severityInfo = getSeverityInfo(processedIssue.severityLevel);
        
        console.log(`🎨 创建第${index + 1}个问题显示元素:`, processedIssue);
        
        element.innerHTML = `
            <div class="card-header ${severityInfo.bgClass} border-0" style="border-left: 4px solid ${severityInfo.color} !important;">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0 fw-bold">
                        <i class="${severityInfo.icon} me-2" style="color: ${severityInfo.color}"></i>
                        问题 ${index + 1}：${escapeHtml(processedIssue.violationType)}
                    </h5>
                    <span class="badge ${severityInfo.badgeClass} fs-6">${severityInfo.label}</span>
                </div>
            </div>
            <div class="card-body">
                ${createProblemDescriptionSection(processedIssue)}
                ${createOriginalTextSection(processedIssue)}
                ${createLegalBasisSection(processedIssue)}
                ${createCompetitiveImpactSection(processedIssue)}
                ${createRevisionSuggestionSection(processedIssue)}
            </div>
        `;
        
        return element;
    }

    /**
     * 智能处理问题数据（增强版）
     */
    function processIssueData(issue) {
        console.log('🔍 处理问题数据:', issue);
        
        if (typeof issue === 'string') {
            console.log('📝 问题数据为字符串，尝试解析...');
            
            // 检查是否是JSON格式的字符串
            const parsed = tryParseAIJSON(issue);
            if (parsed) {
                console.log('✅ JSON解析成功:', parsed);
                return processIssueData(parsed); // 递归处理解析后的对象
            }
            
            // 如果不是JSON，可能是纯文本问题描述
            console.log('📝 非JSON字符串，作为问题描述处理');
            return { 
                issueId: 1,
                violationType: 'AI审查发现的问题',
                problemDescription: issue.length > 500 ? issue.substring(0, 500) + '...' : issue, 
                originalText: '',
                legalBasis: '',
                competitiveImpact: '',
                revisionSuggestion: '',
                severityLevel: 'medium'
            };
        }
        
        // 处理对象类型的数据，支持多种字段名称映射
        const processedIssue = {
            issueId: issue.issueId || issue.id || 0,
            violationType: issue.violationType || issue.title || issue.type || 'AI审查结果',
            problemDescription: issue.problemDescription || issue.description || issue.analysis || '',
            originalText: issue.originalText || issue.quote || issue.originalQuote || '',
            legalBasis: issue.legalBasis || issue.violation || issue.violatedArticle || '',
            competitiveImpact: issue.competitiveImpact || issue.impact || '',
            revisionSuggestion: issue.revisionSuggestion || issue.suggestion || '',
            severityLevel: issue.severityLevel || determineSeverityLevel(issue)
        };
        
        // 智能处理violation字段的详细信息
        if (issue.violation && typeof issue.violation === 'string') {
            // 如果violation包含结构化信息，尝试提取
            if (issue.violation.includes('【具体条款】') || issue.violation.includes('违反《')) {
                processedIssue.legalBasis = issue.violation;
            } else if (!processedIssue.legalBasis) {
                processedIssue.legalBasis = issue.violation;
            }
        }
        
        // 确保关键字段不为空
        if (!processedIssue.violationType || processedIssue.violationType === 'AI审查结果') {
            if (processedIssue.problemDescription) {
                // 从问题描述中提取可能的标题
                const firstSentence = processedIssue.problemDescription.split(/[。；！？\n]/)[0];
                if (firstSentence && firstSentence.length < 50) {
                    processedIssue.violationType = firstSentence;
                } else {
                    processedIssue.violationType = '公平竞争问题';
                }
            }
        }
        
        console.log('✅ 处理后的问题数据:', processedIssue);
        return processedIssue;
    }
    
    /**
     * 智能判断问题严重程度
     */
    function determineSeverityLevel(issue) {
        const text = (issue.description || issue.title || '').toLowerCase();
        
        // 高风险关键词
        const highRiskKeywords = ['排除', '限制', '歧视', '垄断', '禁止', '强制'];
        // 中等风险关键词  
        const mediumRiskKeywords = ['优先', '优惠', '倾斜', '支持', '扶持'];
        
        if (highRiskKeywords.some(keyword => text.includes(keyword))) {
            return 'high';
        } else if (mediumRiskKeywords.some(keyword => text.includes(keyword))) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * 获取严重程度信息
     */
    function getSeverityInfo(level) {
        const severityMap = {
            'high': {
                color: '#dc3545',
                bgClass: 'bg-danger bg-opacity-10',
                badgeClass: 'bg-danger',
                icon: 'bi bi-exclamation-triangle-fill',
                label: '高风险'
            },
            'medium': {
                color: '#fd7e14',
                bgClass: 'bg-warning bg-opacity-10', 
                badgeClass: 'bg-warning',
                icon: 'bi bi-exclamation-triangle',
                label: '中等风险'
            },
            'low': {
                color: '#ffc107',
                bgClass: 'bg-warning bg-opacity-5',
                badgeClass: 'bg-warning',
                icon: 'bi bi-info-circle',
                label: '低风险'
            }
        };
        return severityMap[level] || severityMap['medium'];
    }

    /**
     * 创建问题描述区域
     */
    function createProblemDescriptionSection(issue) {
        if (!issue.problemDescription) return '';
        return `
            <div class="mb-3">
                <div class="section-title text-primary">
                    <i class="bi bi-clipboard-data"></i>问题分析
                </div>
                <div class="problem-description">
                    ${escapeHtml(issue.problemDescription)}
                </div>
            </div>
        `;
    }

    /**
     * 创建原文引用区域
     */
    function createOriginalTextSection(issue) {
        if (!issue.originalText) return '';
        return `
            <div class="mb-3">
                <div class="section-title text-info">
                    <i class="bi bi-quote"></i>原文引用
                </div>
                <div class="quote-highlight">
                    "${escapeHtml(issue.originalText)}"
                </div>
            </div>
        `;
    }

    /**
     * 创建法条依据区域
     */
    function createLegalBasisSection(issue) {
        const legalText = issue.legalBasis || 
                         (issue.violatedArticle ? `违反《公平竞争审查条例实施办法》${issue.violatedArticle}` : '');
        if (!legalText) return '';
        
        return `
            <div class="mb-3">
                <div class="section-title text-secondary">
                    <i class="bi bi-book"></i>违反条款
                </div>
                <div class="violation-text">
                    ${escapeHtml(legalText)}
                </div>
            </div>
        `;
    }

    /**
     * 创建竞争影响区域
     */
    function createCompetitiveImpactSection(issue) {
        if (!issue.competitiveImpact) return '';
        return `
            <div class="mb-3">
                <div class="section-title text-warning">
                    <i class="bi bi-graph-down"></i>竞争影响
                </div>
                <div class="competitive-impact">
                    ${escapeHtml(issue.competitiveImpact)}
                </div>
            </div>
        `;
    }

    /**
     * 创建修改建议区域
     */
    function createRevisionSuggestionSection(issue) {
        if (!issue.revisionSuggestion) return '';
        return `
            <div class="mb-0">
                <div class="section-title text-success">
                    <i class="bi bi-lightbulb"></i>修改建议
                </div>
                <div class="suggestion-list">
                    ${formatSuggestion(issue.revisionSuggestion)}
                </div>
            </div>
        `;
    }

    /**
     * 专门用于解析AI返回的JSON（增强版）
     */
    function tryParseAIJSON(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }
        
        console.log('🔍 尝试解析AI JSON，文本长度:', text.length);
        console.log('🔍 文本前200字符:', text.substring(0, 200));
        
        try {
            // 方法1: 直接解析
            const result = JSON.parse(text);
            console.log('✅ 直接JSON解析成功');
            return result;
        } catch (e) {
            console.log('❌ 直接JSON解析失败，尝试其他方法...');
        }
        
        try {
            // 方法2: 查找并提取完整的JSON对象
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log('🔍 找到JSON模式，尝试解析...');
                const result = JSON.parse(jsonMatch[0]);
                console.log('✅ JSON模式解析成功');
                return result;
            }
        } catch (e) {
            console.log('❌ JSON模式解析失败');
        }
        
        try {
            // 方法3: 智能修复常见问题
            console.log('🔧 尝试智能修复JSON...');
            let fixedText = text
                // 移除可能的markdown代码块标记
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                // 修复多余的逗号
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')
                // 修复转义问题
                .replace(/\\n/g, '\\\\n')
                .replace(/\\r/g, '\\\\r')
                // 修复未正确转义的引号
                .replace(/"([^"]*[^\\])"([^,:}\]])/g, '"$1\\"$2');
            
            const result = JSON.parse(fixedText);
            console.log('✅ 智能修复后解析成功');
            return result;
        } catch (e) {
            console.log('❌ 智能修复解析失败');
        }
        
        try {
            // 方法4: 提取issues数组（特殊处理）
            console.log('🔧 尝试提取issues数组...');
            const issuesMatch = text.match(/"issues"\s*:\s*\[([\s\S]*?)\]/); 
            if (issuesMatch) {
                console.log('🔍 找到issues数组模式');
                // 尝试构建完整的JSON
                const totalIssuesMatch = text.match(/"totalIssues"\s*:\s*(\d+)/);
                const totalIssues = totalIssuesMatch ? parseInt(totalIssuesMatch[1]) : 0;
                
                const reconstructed = {
                    totalIssues: totalIssues,
                    issues: [],
                    rawResponse: text
                };
                
                // 尝试解析单个问题
                const issuePattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
                const issueMatches = issuesMatch[1].match(issuePattern);
                
                if (issueMatches) {
                    issueMatches.forEach((issueStr, index) => {
                        try {
                            const issue = JSON.parse(issueStr);
                            reconstructed.issues.push(issue);
                        } catch (e) {
                            console.log(`❌ 解析第${index + 1}个问题失败`);
                        }
                    });
                }
                
                if (reconstructed.issues.length > 0) {
                    console.log(`✅ 成功提取${reconstructed.issues.length}个问题`);
                    return reconstructed;
                }
            }
        } catch (e) {
            console.log('❌ 提取issues数组失败');
        }
        
        console.log('❌ 所有JSON解析方法都失败');
        return null;
    }
    
    /**
     * 兼容性的tryParseJSON函数
     */
    function tryParseJSON(text) {
        return tryParseAIJSON(text);
    }

    /**
     * 转义HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 导出当前结果（增强版）
     */
    async function exportCurrentResult() {
        if (!appState.currentResult) {
            showNotification('没有可导出的审查结果', 'warning');
            return;
        }

        try {
            updateExportButton(true);
            
            // 确保文件名编码正确
            let safeFileName = null;
            if (appState.currentFile && appState.currentFile.name) {
                safeFileName = appState.currentFile.name;
                console.log('导出时的原始文件名:', safeFileName);
                
                // 确保文件名是正确的UTF-8编码
                try {
                    // 测试文件名是否包含合理的中文字符
                    if (/[\u4e00-\u9fa5]/.test(safeFileName)) {
                        console.log('文件名包含中文字符，保持原样');
                    } else if (/[^\x00-\x7F]/.test(safeFileName)) {
                        // 包含非ASCII但不是中文，可能有编码问题
                        console.log('文件名包含非ASCII字符但非中文，可能有编码问题');
                    }
                } catch (e) {
                    console.log('文件名编码检查失败:', e.message);
                    safeFileName = null;
                }
            }

            const response = await fetch('/export-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                body: JSON.stringify({
                    result: appState.currentResult,
                    fileName: safeFileName
                })
            });

            if (!response.ok) {
                throw new Error(`生成报告失败: ${response.statusText}`);
            }

            const blob = await response.blob();
            const fileName = getFileNameFromResponse(response) || 
                `公平竞争审查报告_${new Date().toISOString().split('T')[0]}.docx`;
            
            downloadBlob(blob, fileName);
            showNotification('报告导出成功', 'success');
            
        } catch (error) {
            console.error('导出报告失败:', error);
            showNotification(`导出报告失败: ${error.message}`, 'error');
        } finally {
            updateExportButton(false);
        }
    }

    /**
     * 更新导出按钮状态
     */
    function updateExportButton(isLoading) {
        if (!elements.exportResultBtn) return;
        
        elements.exportResultBtn.disabled = isLoading;
        elements.exportResultBtn.innerHTML = isLoading ? 
            '<i class="bi bi-hourglass-split me-2"></i>生成中...' :
            '<i class="bi bi-file-earmark-word me-2"></i>导出报告';
    }

    /**
     * 从响应头获取文件名
     */
    function getFileNameFromResponse(response) {
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (fileNameMatch) {
                return decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
            }
        }
        return null;
    }

    /**
     * 下载文件
     */
    function downloadBlob(blob, fileName) {
        const url = window.URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = fileName;
        linkElement.click();
        window.URL.revokeObjectURL(url);
    }

    /**
     * 处理错误（增强版）
     */
    function handleStreamError(error) {
        console.error('处理错误:', error);
        updateUIState('error');
        
        let errorMessage = getErrorMessage(error);
        showNotification(errorMessage, 'error');
    }

    /**
     * 获取错误消息
     */
    function getErrorMessage(error) {
        const message = error.message || '未知错误';
        
        if (message.includes('500') || message.includes('服务器内部错误')) {
            return ERROR_MESSAGES.SERVER_ERROR;
        }
        if (message.includes('timeout') || message.includes('超时')) {
            return ERROR_MESSAGES.TIMEOUT_ERROR;
        }
        if (message.includes('network') || message.includes('连接')) {
            return ERROR_MESSAGES.NETWORK_ERROR;
        }
        
        return message;
    }

    /**
     * 显示通知
     */
    function showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `alert alert-${getBootstrapAlertClass(type)} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        
        notification.innerHTML = `
            ${getNotificationIcon(type)} ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // 自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 获取Bootstrap警告类
     */
    function getBootstrapAlertClass(type) {
        const mapping = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info'
        };
        return mapping[type] || 'info';
    }

    /**
     * 获取通知图标
     */
    function getNotificationIcon(type) {
        const icons = {
            'success': '<i class="bi bi-check-circle-fill me-2"></i>',
            'error': '<i class="bi bi-exclamation-triangle-fill me-2"></i>',
            'warning': '<i class="bi bi-exclamation-circle-fill me-2"></i>',
            'info': '<i class="bi bi-info-circle-fill me-2"></i>'
        };
        return icons[type] || icons.info;
    }

    // 辅助函数

    /**
     * 延迟函数
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 格式化文件大小
     */
    function formatFileSize(bytes) {
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化修改建议（增强版）
     */
    function formatSuggestion(suggestion) {
        if (!suggestion) return '';
        
        // 转义HTML
        let formatted = escapeHtml(suggestion);
        
        // 检查是否包含编号列表格式（1. 2. 3.）
        if (/\d+\.\s/.test(formatted)) {
            // 分割建议为编号列表
            const suggestions = formatted.split(/(?=\d+\.\s)/).filter(s => s.trim());
            
            if (suggestions.length > 1) {
                const listItems = suggestions.map(item => {
                    const cleanItem = item.trim();
                    if (cleanItem) {
                        // 提取编号和内容
                        const match = cleanItem.match(/^(\d+\.\s)(.*)$/s);
                        if (match) {
                            return `<div class="suggestion-item mb-2">
                                <span class="fw-bold text-success">${match[1]}</span>
                                <span>${match[2].trim()}</span>
                            </div>`;
                        }
                        return `<div class="suggestion-item mb-2">${cleanItem}</div>`;
                    }
                    return '';
                }).filter(item => item);
                
                return listItems.join('');
            }
        }
        
        // 如果不是编号列表，按换行符分割
        return formatted
            .split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => `<div class="suggestion-item mb-2">${line}</div>`)
            .join('');
    }

    // 推理过程相关函数 (保持原有逻辑，添加增强功能)

    function addReasoningStep(message, type = 'thinking') {
        if (!elements.reasoningContent) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const step = document.createElement('div');
        step.className = `reasoning-step ${type === 'result' ? 'reasoning-result' : 'reasoning-thinking'}`;
        
        step.innerHTML = `
            <span class="reasoning-timestamp">${timestamp}</span>
            <span>${escapeHtml(message)}</span>
        `;
        
        elements.reasoningContent.appendChild(step);
        scrollReasoningToBottom();
    }

    function addProcessingStep(message) {
        if (!elements.reasoningContent) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const step = document.createElement('div');
        step.className = 'reasoning-step reasoning-thinking reasoning-processing';
        step.id = 'processing-step';
        
        step.innerHTML = `
            <span class="reasoning-timestamp">${timestamp}</span>
            <span>${escapeHtml(message)}</span>
        `;
        
        elements.reasoningContent.appendChild(step);
        scrollReasoningToBottom();
    }

    function removeProcessingStep() {
        const processingStep = document.getElementById('processing-step');
        if (processingStep) {
            processingStep.remove();
        }
    }

    function addAIThinkingStep(message) {
        if (!elements.reasoningContent) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const step = document.createElement('div');
        step.className = 'reasoning-step reasoning-ai-thinking';
        
        step.innerHTML = `
            <span class="reasoning-timestamp">${timestamp}</span>
            <span>${escapeHtml(message)}</span>
        `;
        
        elements.reasoningContent.appendChild(step);
        scrollReasoningToBottom();
    }

    function clearReasoningLog() {
        if (elements.reasoningContent) {
            elements.reasoningContent.innerHTML = '';
        }
    }

    function scrollReasoningToBottom() {
        if (elements.reasoningContent) {
            setTimeout(() => {
                elements.reasoningContent.scrollTo({
                    top: elements.reasoningContent.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }

    /**
     * 显示涉密文档禁止上传提醒
     */
    function showConfidentialDocumentWarning(onConfirm) {
        // 创建简洁的自定义弹窗
        const modalHtml = `
            <div class="modal fade" id="confidentialWarningModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" style="max-width: 380px;">
                    <div class="modal-content" style="border-radius: 12px; border: none; box-shadow: 0 12px 28px rgba(0,0,0,0.15);">
                        <div class="modal-body text-center p-4">
                            <div class="mb-3">
                                <div style="width: 48px; height: 48px; background: #ff3b30; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                                    <i class="bi bi-exclamation" style="color: white; font-size: 24px; font-weight: bold;"></i>
                                </div>
                            </div>
                            <h5 class="modal-title mb-4" style="color: #1d1d1f; font-weight: 600;">禁止上传涉密文档</h5>
                            <div class="d-flex gap-3 justify-content-center">
                                <button type="button" class="btn btn-outline-secondary px-4" data-bs-dismiss="modal" style="border-radius: 8px; min-width: 80px;">
                                    取消
                                </button>
                                <button type="button" class="btn btn-primary px-4" id="confirmUploadBtn" style="background: #007aff; border: none; border-radius: 8px; min-width: 80px;">
                                    继续上传
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        const existingModal = document.getElementById('confidentialWarningModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加模态框到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 初始化Bootstrap模态框
        const modal = new bootstrap.Modal(document.getElementById('confidentialWarningModal'));
        
        // 绑定确认按钮事件
        document.getElementById('confirmUploadBtn').addEventListener('click', function() {
            modal.hide();
            if (onConfirm) {
                onConfirm();
            }
        });
        
        // 模态框关闭时清理DOM
        document.getElementById('confidentialWarningModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
        
        // 显示模态框
        modal.show();
    }

    // 导出全局调试函数 (仅开发环境)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugApp = {
            state: appState,
            elements: elements,
            config: CONFIG,
            resetApp: resetFileSelection,
            showNotification: showNotification
        };
    }
});