#!/usr/bin/env node

/**
 * 稳定服务器启动脚本
 * 包含错误处理、自动重启和进程监控
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class StableServerManager {
    constructor() {
        this.serverProcess = null;
        this.restartCount = 0;
        this.maxRestarts = 5;
        this.restartDelay = 3000; // 3秒
        this.isShuttingDown = false;
        this.logFile = path.join(__dirname, 'logs', 'server-manager.log');
        
        // 确保日志目录存在
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        this.setupSignalHandlers();
    }

    /**
     * 记录日志
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logEntry.trim());
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('写入日志文件失败:', error.message);
        }
    }

    /**
     * 启动服务器
     */
    startServer() {
        if (this.isShuttingDown) {
            this.log('正在关闭中，跳过启动');
            return;
        }

        this.log(`启动服务器 (尝试 ${this.restartCount + 1}/${this.maxRestarts + 1})`);
        
        this.serverProcess = spawn('node', ['server_new.js'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            cwd: __dirname,
            env: { ...process.env, NODE_ENV: 'production' }
        });

        // 监听标准输出
        this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                this.log(`[SERVER] ${output}`);
            }
        });

        // 监听错误输出
        this.serverProcess.stderr.on('data', (data) => {
            const error = data.toString().trim();
            if (error) {
                this.log(`[ERROR] ${error}`, 'ERROR');
            }
        });

        // 监听进程退出
        this.serverProcess.on('exit', (code, signal) => {
            this.log(`服务器进程退出: code=${code}, signal=${signal}`, code === 0 ? 'INFO' : 'WARN');
            this.serverProcess = null;

            if (!this.isShuttingDown) {
                this.handleServerExit(code, signal);
            }
        });

        // 监听进程错误
        this.serverProcess.on('error', (error) => {
            this.log(`服务器进程错误: ${error.message}`, 'ERROR');
            this.handleServerExit(1, null);
        });

        this.log('服务器进程已启动');
    }

    /**
     * 处理服务器退出
     */
    handleServerExit(code, signal) {
        if (this.isShuttingDown) return;

        if (code === 0) {
            this.log('服务器正常退出');
            return;
        }

        this.restartCount++;
        
        if (this.restartCount > this.maxRestarts) {
            this.log(`服务器重启次数超过限制 (${this.maxRestarts})，停止重启`, 'ERROR');
            process.exit(1);
        }

        const delay = this.restartDelay * this.restartCount;
        this.log(`${delay}ms 后重启服务器...`);
        
        setTimeout(() => {
            this.startServer();
        }, delay);
    }

    /**
     * 停止服务器
     */
    stopServer() {
        this.isShuttingDown = true;
        
        if (this.serverProcess) {
            this.log('正在停止服务器...');
            
            // 优雅关闭
            this.serverProcess.kill('SIGTERM');
            
            // 5秒后强制关闭
            setTimeout(() => {
                if (this.serverProcess) {
                    this.log('强制关闭服务器进程', 'WARN');
                    this.serverProcess.kill('SIGKILL');
                }
            }, 5000);
        }
    }

    /**
     * 检查服务器健康状态
     */
    async checkHealth() {
        try {
            const { default: fetch } = await import('node-fetch');
            const response = await fetch('http://localhost:3000/health', { 
                timeout: 5000 
            });
            
            if (response.ok) {
                const data = await response.json();
                this.log(`健康检查通过: ${JSON.stringify(data)}`);
                this.restartCount = 0; // 重置重启计数
                return true;
            } else {
                this.log(`健康检查失败: HTTP ${response.status}`, 'WARN');
                return false;
            }
        } catch (error) {
            this.log(`健康检查错误: ${error.message}`, 'WARN');
            return false;
        }
    }

    /**
     * 设置信号处理器
     */
    setupSignalHandlers() {
        process.on('SIGINT', () => {
            this.log('收到 SIGINT 信号，正在关闭...');
            this.stopServer();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            this.log('收到 SIGTERM 信号，正在关闭...');
            this.stopServer();
            process.exit(0);
        });

        process.on('uncaughtException', (error) => {
            this.log(`未捕获的异常: ${error.message}`, 'ERROR');
            this.log(`堆栈: ${error.stack}`, 'ERROR');
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.log(`未处理的Promise拒绝: ${reason}`, 'ERROR');
        });
    }

    /**
     * 启动监控循环
     */
    startMonitoring() {
        this.log('启动服务器监控...');
        this.startServer();

        // 每30秒检查一次健康状态
        setInterval(async () => {
            if (!this.isShuttingDown && this.serverProcess) {
                const isHealthy = await this.checkHealth();
                if (!isHealthy) {
                    this.log('健康检查失败，准备重启服务器', 'WARN');
                    if (this.serverProcess) {
                        this.serverProcess.kill('SIGTERM');
                    }
                }
            }
        }, 30000);
    }
}

// 启动稳定服务器管理器
const manager = new StableServerManager();
manager.startMonitoring();

console.log('🚀 稳定服务器管理器已启动');
console.log('📊 访问: http://localhost:3000');
console.log('🔧 管理后台: http://localhost:3000/admin/audit-logs');
console.log('💡 按 Ctrl+C 停止服务器');