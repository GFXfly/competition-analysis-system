/**
 * PM2进程管理配置文件
 * 用于增强AI分析公平竞争审查系统的生产部署
 */

module.exports = {
    apps: [{
        name: 'competition-analysis',
        script: 'server.js',
        cwd: '/var/www/competition-analysis',
        
        // 实例配置
        instances: 2, // 启动2个实例实现负载均衡
        exec_mode: 'cluster', // 集群模式
        
        // 环境配置
        env: {
            NODE_ENV: 'development',
            PORT: 3000
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        
        // 日志配置
        log_file: '/var/log/competition-analysis/combined.log',
        out_file: '/var/log/competition-analysis/out.log',
        error_file: '/var/log/competition-analysis/error.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        
        // 监控和重启配置
        watch: false, // 生产环境不建议开启文件监控
        ignore_watch: ['node_modules', 'logs'],
        max_memory_restart: '1G', // 内存超过1G自动重启
        
        // 自动重启配置
        restart_delay: 4000, // 重启延迟4秒
        autorestart: true,
        max_restarts: 10, // 最大重启次数
        min_uptime: '10s', // 最小运行时间
        
        // 健康检查
        health_check_grace_period: 3000,
        health_check_interval: 30000,
        
        // 其他配置
        source_map_support: true,
        instance_var: 'INSTANCE_ID',
        
        // 启动配置
        wait_ready: true,
        listen_timeout: 10000,
        kill_timeout: 5000,
        
        // cron重启（可选）
        cron_restart: '0 2 * * *' // 每天凌晨2点重启
    }],

    // 部署配置（可选）
    deploy: {
        production: {
            user: 'root',
            host: 'cursor2.com',
            ref: 'origin/main',
            repo: 'git@github.com:yourusername/competition-analysis.git',
            path: '/var/www/competition-analysis',
            'pre-deploy-local': '',
            'post-deploy': 'npm ci --only=production && pm2 reload ecosystem.config.js --env production',
            'pre-setup': 'apt-get install -y git'
        }
    }
};