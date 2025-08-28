// PM2 配置文件
module.exports = {
  apps: [{
    name: 'fair-competition-review',
    script: 'server_new.js',
    cwd: '/var/www/competition',
    instances: 2,  // 根据服务器CPU核数调整
    exec_mode: 'cluster',
    
    // 环境变量 - 从 .env 文件加载
    env_file: '/var/www/competition/.env',
    
    // 日志配置
    log_file: '/var/log/pm2/competition-combined.log',
    out_file: '/var/log/pm2/competition-out.log',
    error_file: '/var/log/pm2/competition-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // 自动重启配置
    watch: false,
    ignore_watch: ['node_modules', 'logs', '*.log'],
    max_memory_restart: '1G',
    
    // 重启策略
    min_uptime: '10s',
    max_restarts: 10,
    
    // 其他配置
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }],

  deploy: {
    production: {
      user: 'root',
      host: 'cursor2.com',  // 替换为你的服务器IP
      ref: 'origin/main',
      repo: 'git@github.com:your-username/competition.git',  // 替换为你的仓库地址
      path: '/var/www/competition',
      
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};