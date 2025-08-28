document.addEventListener('DOMContentLoaded', function() {
    const uploadBtn = document.getElementById('upload-btn');
    const fileUpload = document.getElementById('file-upload');
    const reviewBtn = document.getElementById('review-btn');
    const uploadArea = document.getElementById('upload-area');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeFile = document.getElementById('remove-file');
    const loadingElement = document.getElementById('loading');
    const reasoningContent = document.getElementById('reasoning-content');
    const reviewResults = document.getElementById('review-results');
    const issuesContainer = document.getElementById('issues-container');
    const issueCount = document.getElementById('issue-count');
    const newReviewBtn = document.getElementById('new-review-btn');
    const exportResultBtn = document.getElementById('export-result-btn');
    
    let currentFile = null;
    let currentResult = null;

    // 上传按钮事件
    uploadBtn.addEventListener('click', function() {
        fileUpload.click();
    });

    // 文件选择事件
    fileUpload.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            handleFileSelection(this.files[0]);
        }
    });

    // 拖拽功能
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('border-primary');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('border-primary');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('border-primary');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    // 移除文件
    removeFile.addEventListener('click', function() {
        resetFileSelection();
    });

    // 开始审查
    reviewBtn.addEventListener('click', function() {
        if (currentFile) {
            startStreamReview();
        }
    });

    // 重新审查
    newReviewBtn.addEventListener('click', function() {
        resetFileSelection();
        reviewResults.classList.add('d-none');
    });

    // 导出结果
    exportResultBtn.addEventListener('click', function() {
        exportCurrentResult();
    });

    // 处理文件选择
    function handleFileSelection(file) {
        const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['docx', 'doc'];
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
            alert('只支持 DOCX 和 DOC 文件');
            return;
        }
        
        if (file.size > 30 * 1024 * 1024) {
            alert('文件大小不能超过30MB');
            return;
        }
        
        // 直接处理文件上传，不显示涉密文档提醒
        currentFile = file;
        
        uploadArea.classList.add('d-none');
        fileInfo.classList.remove('d-none');
        fileName.textContent = file.name;
        fileSize.textContent = `文件大小: ${formatFileSize(file.size)}`;
        
        reviewBtn.disabled = false;
    }

    // 重置文件选择
    function resetFileSelection() {
        currentFile = null;
        fileUpload.value = '';
        fileInfo.classList.add('d-none');
        uploadArea.classList.remove('d-none');
        reviewBtn.disabled = true;
        loadingElement.classList.add('d-none');
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 流式审查
    async function startStreamReview() {
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
            try {
                reviewBtn.disabled = true;
                reviewBtn.textContent = "审查中...";
                fileInfo.classList.add('d-none');
                loadingElement.classList.remove('d-none');
                
                if (retryCount === 0) {
                    clearReasoningLog();
                    addReasoningStep('🚀 开始处理文件，准备进行公平竞争审查...');
                } else {
                    addReasoningStep(`🔄 正在进行第${retryCount + 1}次尝试...`);
                }
                
                const formData = new FormData();
                formData.append('file', currentFile);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                }, 120000); // 2分钟超时
                
                const response = await fetch('/api/v3/enhanced-stream-review', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
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
                                const data = JSON.parse(line.substring(6));
                                handleStreamMessage(data);
                                
                                // 如果收到完成或错误消息，结束重试循环
                                if (data.type === 'complete' || data.type === 'error') {
                                    return;
                                }
                            } catch (e) {
                                console.error('解析流数据错误:', e, '原始数据:', line);
                            }
                        }
                    }
                }
                
                // 如果没有收到任何数据，抛出错误进行重试
                if (!hasReceivedData) {
                    throw new Error('未收到服务器响应数据');
                }
                
                return; // 成功完成，退出重试循环
                
            } catch (error) {
                console.error(`第${retryCount + 1}次尝试失败:`, error);
                retryCount++;
                
                if (error.name === 'AbortError') {
                    addReasoningStep('⏰ 请求超时，正在重试...');
                } else if (retryCount <= maxRetries) {
                    const waitTime = Math.min(3000 * retryCount, 10000); // 指数退避，最大10秒
                    addReasoningStep(`❌ 连接失败，${waitTime/1000}秒后重试... (${retryCount}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        
        // 所有重试都失败了
        addReasoningStep('❌ 多次尝试后仍然失败，请检查网络连接或稍后重试', 'result');
        handleStreamError(new Error('审查请求失败，请稍后重试'));
    }

    // 处理流式消息
    function handleStreamMessage(data) {
        switch (data.type) {
            case 'start':
                addReasoningStep('📄 文件上传成功，开始提取文档内容...');
                break;
                
            case 'progress':
                if (data.step === 'extract') {
                    addProcessingStep('📝 正在提取文档内容，准备进行文本分析...');
                } else if (data.step === 'extract_success') {
                    removeProcessingStep();
                    addReasoningStep(`📄 ${data.message}`);
                } else if (data.step === 'precheck') {
                    removeProcessingStep();
                    addProcessingStep('🔍 正在进行预判断，检查文档是否涉及公平竞争审查范围...');
                } else if (data.step === 'detailed_review') {
                    removeProcessingStep();
                    addProcessingStep('🤖 正在调用DeepSeek V3.1模型进行深度分析，请稍候...');
                }
                break;
                
            case 'precheck_result':
                removeProcessingStep();
                if (data.result.needsReview) {
                    const confidence = data.result.confidence ? (data.result.confidence * 100).toFixed(1) + '%' : '未知';
                    addReasoningStep(`✅ 预判断完成：文档涉及公平竞争内容，置信度 ${confidence}`);
                } else {
                    addReasoningStep(`✅ 预判断完成：${data.result.reason}`, 'result');
                    setTimeout(() => {
                        showPreCheckResult(data.result);
                    }, 1000);
                    return;
                }
                break;
                
            case 'complete':
                removeProcessingStep();
                const totalIssues = data.result.totalIssues || 0;
                const issueText = totalIssues === 0 ? '未发现问题' : `发现 ${totalIssues} 个潜在问题`;
                addReasoningStep(`🎯 AI审查完成！${issueText}`, 'result');
                
                setTimeout(() => {
                    showFinalResult(data.result);
                }, 800);
                break;
                
            case 'ai_thinking':
                // AI思考过程，使用特殊样式
                addAIThinkingStep(data.message);
                break;
                
            case 'error':
                removeProcessingStep();
                addReasoningStep(`❌ 审查过程出错：${data.message}`, 'result');
                handleStreamError(new Error(data.message));
                break;
        }
    }

    // 显示预判断结果
    function showPreCheckResult(result) {
        loadingElement.classList.add('d-none');
        reviewBtn.textContent = "开始审查";
        reviewBtn.disabled = false;
        
        issueCount.textContent = 0;
        
        issuesContainer.innerHTML = `
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
        
        reviewResults.classList.remove('d-none');
    }

    // 显示最终结果
    function showFinalResult(result) {
        loadingElement.classList.add('d-none');
        reviewBtn.textContent = "开始审查";
        reviewBtn.disabled = false;
        
        // 保存当前结果供导出使用
        currentResult = result;
        
        issueCount.textContent = result.totalIssues || 0;
        
        displayIssues(result.issues || []);
        reviewResults.classList.remove('d-none');
    }

    // 添加推理步骤
    function addReasoningStep(message, type = 'thinking') {
        const timestamp = new Date().toLocaleTimeString();
        const step = document.createElement('div');
        step.className = `reasoning-step ${type === 'result' ? 'reasoning-result' : 'reasoning-thinking'}`;
        
        step.innerHTML = `
            <span class="reasoning-timestamp">${timestamp}</span>
            <span>${message}</span>
        `;
        
        reasoningContent.appendChild(step);
        
        // 平滑滚动到底部
        setTimeout(() => {
            reasoningContent.scrollTo({
                top: reasoningContent.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    // 添加处理中状态的推理步骤
    function addProcessingStep(message) {
        const timestamp = new Date().toLocaleTimeString();
        const step = document.createElement('div');
        step.className = 'reasoning-step reasoning-thinking reasoning-processing';
        step.id = 'processing-step';
        
        step.innerHTML = `
            <span class="reasoning-timestamp">${timestamp}</span>
            <span>${message}</span>
        `;
        
        reasoningContent.appendChild(step);
        
        setTimeout(() => {
            reasoningContent.scrollTo({
                top: reasoningContent.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    // 移除处理中状态
    function removeProcessingStep() {
        const processingStep = document.getElementById('processing-step');
        if (processingStep) {
            processingStep.remove();
        }
    }

    // 添加AI思考步骤
    function addAIThinkingStep(message) {
        const timestamp = new Date().toLocaleTimeString();
        const step = document.createElement('div');
        step.className = 'reasoning-step reasoning-ai-thinking';
        
        step.innerHTML = `
            <span class="reasoning-timestamp">${timestamp}</span>
            <span>${message}</span>
        `;
        
        reasoningContent.appendChild(step);
        
        setTimeout(() => {
            reasoningContent.scrollTo({
                top: reasoningContent.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    // 清空推理过程
    function clearReasoningLog() {
        reasoningContent.innerHTML = '';
    }

    // 格式化修改建议
    function formatSuggestion(suggestion) {
        if (!suggestion) return '';
        
        // 将数字开头的行转换为换行显示
        return suggestion
            .replace(/(\d+\.\s)/g, '<br>$1')
            .replace(/^<br>/, '') // 移除开头的<br>
            .trim();
    }

    // 显示问题列表
    function displayIssues(issues) {
        issuesContainer.innerHTML = '';
        
        if (issues.length === 0) {
            issuesContainer.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    未发现竞争限制问题，文件符合公平竞争要求。
                </div>
            `;
            return;
        }
        
        issues.forEach((issue, index) => {
            const issueElement = document.createElement('div');
            issueElement.className = 'card mb-3';
            
            // 处理可能的JSON字符串或对象格式数据
            let processedIssue = issue;
            if (typeof issue === 'string') {
                try {
                    // 如果问题是JSON字符串，尝试解析
                    processedIssue = JSON.parse(issue);
                } catch (e) {
                    // 如果不是JSON，将其作为描述文本
                    processedIssue = { description: issue, title: 'AI审查结果' };
                }
            }
            
            // 安全获取字段值，防止显示undefined
            const title = processedIssue.title || 'AI审查结果';
            const description = processedIssue.description || '';
            const quote = processedIssue.quote || '';
            const violation = processedIssue.violation || '';
            const suggestion = processedIssue.suggestion || '';
            
            issueElement.innerHTML = `
                <div class="card-header bg-warning bg-opacity-25">
                    <h5 class="mb-0">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        问题 ${index + 1}: ${title}
                    </h5>
                </div>
                <div class="card-body">
                    ${description ? `<div class="mb-3"><strong>问题描述:</strong> ${description}</div>` : ''}
                    ${quote ? `<div class="mb-3"><strong>原文引用:</strong><div class="bg-light p-2 rounded">${quote}</div></div>` : ''}
                    ${violation ? `<div class="mb-3"><strong>违反条款:</strong> ${violation}</div>` : ''}
                    ${suggestion ? `<div class="mb-3"><strong>修改建议:</strong><div class="bg-success bg-opacity-10 p-2 rounded">${formatSuggestion(suggestion)}</div></div>` : ''}
                </div>
            `;
            
            issuesContainer.appendChild(issueElement);
        });
    }

    // 导出Word审查报告
    async function exportCurrentResult() {
        if (!currentResult) {
            alert('没有可导出的审查结果');
            return;
        }

        try {
            // 禁用按钮，显示生成状态
            exportResultBtn.disabled = true;
            exportResultBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>生成中...';

            const response = await fetch('/export-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    result: currentResult,
                    fileName: currentFile ? currentFile.name : null
                })
            });

            if (!response.ok) {
                throw new Error(`生成报告失败: ${response.statusText}`);
            }

            // 获取文件blob
            const blob = await response.blob();
            
            // 获取文件名
            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = `公平竞争审查报告_${new Date().toISOString().split('T')[0]}.docx`;
            
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (fileNameMatch) {
                    fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
                }
            }

            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const linkElement = document.createElement('a');
            linkElement.href = url;
            linkElement.download = fileName;
            linkElement.click();
            
            // 清理
            window.URL.revokeObjectURL(url);
            
            // 恢复按钮状态
            exportResultBtn.disabled = false;
            exportResultBtn.innerHTML = '<i class="bi bi-file-earmark-word me-2"></i>导出报告';
            
        } catch (error) {
            console.error('导出报告失败:', error);
            alert('导出报告失败: ' + error.message);
            
            // 恢复按钮状态
            exportResultBtn.disabled = false;
            exportResultBtn.innerHTML = '<i class="bi bi-file-earmark-word me-2"></i>导出报告';
        }
    }

    // 显示涉密文档禁止上传提醒
    function showConfidentialDocumentWarning(onConfirm) {
        // 创建模态框HTML
        const modalHtml = `
            <div class="modal fade" id="confidentialWarningModal" tabindex="-1" aria-labelledby="confidentialWarningModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title" id="confidentialWarningModalLabel">
                                <i class="bi bi-shield-exclamation me-2"></i>
                                重要提醒：禁止上传涉密文档
                            </h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-warning border-0 mb-4">
                                <h6 class="fw-bold mb-3">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    请确认您上传的文档不包含以下涉密内容：
                                </h6>
                                <ul class="mb-0">
                                    <li>国家秘密、工作秘密等保密信息</li>
                                    <li>个人隐私信息、身份证号码等敏感数据</li>
                                    <li>商业机密、技术秘密等商业敏感信息</li>
                                    <li>内部文件编号、内部流程等机关内部信息</li>
                                    <li>其他不宜公开的敏感信息</li>
                                </ul>
                            </div>
                            <div class="bg-light p-3 rounded">
                                <h6 class="fw-bold text-primary mb-2">
                                    <i class="bi bi-info-circle me-2"></i>
                                    温馨提示：
                                </h6>
                                <p class="mb-0 small">
                                    • 本系统仅用于公平竞争审查，请确保上传文档的合规性<br>
                                    • 如有疑问，请咨询相关保密工作负责人<br>
                                    • 上传即表示您确认文档不包含任何涉密内容
                                </p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle me-2"></i>取消上传
                            </button>
                            <button type="button" class="btn btn-primary" id="confirmUploadBtn">
                                <i class="bi bi-check-circle me-2"></i>确认并继续
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 如果已存在模态框，先移除
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

    // 处理错误
    function handleStreamError(error) {
        console.error('处理错误:', error);
        loadingElement.classList.add('d-none');
        
        let errorMessage = error.message || '未知错误';
        
        if (errorMessage.includes('500') || errorMessage.includes('服务器内部错误')) {
            errorMessage = '服务器处理文件时出错，请稍后重试或联系管理员。';
        }
        
        alert(`审查过程中出错:\\n${errorMessage}`);
        
        reviewBtn.disabled = false;
        reviewBtn.textContent = "开始审查";
        fileInfo.classList.remove('d-none');
    }
});