# PM2 进程管理器使用指南

**配置时间**: 2026-04-08  
**状态**: ✅ **已启用**

---

## 📋 PM2 配置概览

### 当前服务状态

```bash
$ pm2 status
┌────┬─────────────────┬──────────┬───────┬───────────┬──────────┬──────────┐
│ id │ name            │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼─────────────────┼──────────┼───────┼───────────┼──────────┼──────────┤
│ 0  │ visitor-backend │ fork     │ 0    │ online    │ 0%       │ 43.6mb   │
└────┴─────────────────┴──────────┴───────┴───────────┴──────────┴──────────┘
```

### 配置文件位置

- **本地**: `backend/ecosystem.config.js`
- **服务器**: `/home/node/visitor/auto-deploy/current/backend/ecosystem.config.js`

---

## 🔧 核心配置说明

### ecosystem.config.js 关键参数

```javascript
{
  name: 'visitor-backend',        // 应用名称
  script: './src/index.js',       // 启动脚本
  instances: 1,                   // 实例数（单实例）
  exec_mode: 'fork',              // 运行模式
  
  // 自动重启
  autorestart: true,              // 崩溃自动重启
  max_memory_restart: '500M',     // 内存超过500M自动重启
  max_restarts: 10,               // 最大重启次数
  min_uptime: '10s',              // 最小运行时间
  
  // 优雅关闭
  kill_timeout: 5000,             // 优雅关闭超时5秒
  wait_ready: true,               // 等待就绪信号
  listen_timeout: 3000,           // 监听超时3秒
  
  // 日志
  error_file: './logs/error.log', // 错误日志
  out_file: './logs/out.log',     // 输出日志
  merge_logs: true,               // 合并日志
  log_date_format: 'YYYY-MM-DD HH:mm:ss'
}
```

---

## 📝 常用命令

### 基础管理

```bash
# 设置PATH（每次SSH连接后执行）
export PATH=/usr/local/nodejs/bin:$PATH

# 查看服务状态
pm2 status

# 查看详细状态
pm2 show visitor-backend

# 查看实时日志
pm2 logs visitor-backend

# 查看最近100行日志
pm2 logs visitor-backend --lines 100

# 清空日志
pm2 flush
```

### 重启操作

```bash
# 平滑重启（推荐）
pm2 reload visitor-backend

# 强制重启
pm2 restart visitor-backend

# 停止服务
pm2 stop visitor-backend

# 启动服务
pm2 start visitor-backend

# 删除服务
pm2 delete visitor-backend
```

### 监控与诊断

```bash
# 实时监控面板
pm2 monit

# 查看进程列表
pm2 list

# 查看内存使用
pm2 info visitor-backend

# 生成诊断报告
pm2 report
```

### 开机自启

```bash
# 保存当前进程列表
pm2 save

# 配置开机自启
pm2 startup systemd -u root --hp /root

# 取消开机自启
pm2 unstartup systemd
```

---

## 🚀 部署流程

### 方式1: 使用配置文件（推荐）

```bash
# 1. 上传代码到服务器
scp backend/src/* visitor:/home/node/visitor/auto-deploy/current/backend/src/
scp backend/ecosystem.config.js visitor:/home/node/visitor/auto-deploy/current/backend/

# 2. SSH连接并重启
ssh visitor
export PATH=/usr/local/nodejs/bin:$PATH
cd /home/node/visitor/auto-deploy/current/backend
pm2 reload ecosystem.config.js
```

### 方式2: 直接重启

```bash
ssh visitor
export PATH=/usr/local/nodejs/bin:$PATH
cd /home/node/visitor/auto-deploy/current/backend
pm2 restart visitor-backend
```

### 方式3: 使用部署脚本

创建 `deploy.sh`:

```bash
#!/bin/bash
echo "开始部署..."

# 上传文件
scp backend/ecosystem.config.js visitor:/home/node/visitor/auto-deploy/current/backend/
scp -r backend/src/* visitor:/home/node/visitor/auto-deploy/current/backend/src/

# 重启服务
ssh visitor 'export PATH=/usr/local/nodejs/bin:$PATH && cd /home/node/visitor/auto-deploy/current/backend && pm2 reload ecosystem.config.js'

echo "部署完成！"
```

---

## 📊 日志管理

### 日志文件位置

```
/home/node/visitor/auto-deploy/current/backend/logs/
├── error.log      # 错误日志
└── out.log        # 标准输出日志
```

### 查看日志

```bash
# 实时查看所有日志
pm2 logs

# 只查看错误日志
pm2 logs visitor-backend --err

# 只查看输出日志
pm2 logs visitor-backend --out

# 指定行数
pm2 logs visitor-backend --lines 50

# 带时间戳
pm2 logs visitor-backend --timestamp
```

### 日志轮转（防止日志过大）

安装pm2-logrotate:

```bash
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 🔍 故障排查

### 问题1: 服务频繁重启

**检查方法**:
```bash
pm2 info visitor-backend | grep "restart"
pm2 logs visitor-backend --err --lines 100
```

**常见原因**:
- 代码有未捕获的异常
- 数据库连接失败
- 端口被占用
- 内存泄漏

**解决方案**:
```bash
# 查看详细错误
pm2 logs visitor-backend --err

# 检查内存使用
pm2 monit

# 手动测试启动
cd /home/node/visitor/auto-deploy/current/backend
node src/index.js
```

### 问题2: 内存持续增长

**监控**:
```bash
pm2 monit
```

**解决**:
```bash
# 设置内存限制（已在配置中设置为500M）
pm2 set visitor-backend:max_memory_restart 500M

# 定期重启（可选）
pm2 restart visitor-backend
```

### 问题3: 服务无响应

**检查**:
```bash
# 检查进程状态
pm2 status

# 检查健康接口
curl https://visitor.timehuasun.cn:8021/health

# 检查系统资源
top -p $(pm2 pid visitor-backend)
```

**恢复**:
```bash
pm2 restart visitor-backend
```

### 问题4: 开机后服务未启动

**检查**:
```bash
systemctl status pm2-root
pm2 list
```

**修复**:
```bash
# 重新配置开机自启
pm2 startup systemd -u root --hp /root
pm2 save
```

---

## 📈 性能优化建议

### 1. 集群模式（高并发场景）

修改 `ecosystem.config.js`:

```javascript
{
  instances: 4,           // 根据CPU核心数调整
  exec_mode: 'cluster',   // 集群模式
}
```

**注意**: 当前使用单实例，因为应用可能不是完全无状态的。

### 2. 内存限制

当前配置: `max_memory_restart: '500M'`

根据服务器内存调整：
- 小内存（<2GB）: 300M
- 中等内存（2-4GB）: 500M
- 大内存（>4GB）: 1G

### 3. 日志优化

启用日志轮转，防止磁盘占满：

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔒 安全建议

### 1. 日志权限

```bash
chmod 640 /home/node/visitor/auto-deploy/current/backend/logs/*.log
chown root:root /home/node/visitor/auto-deploy/current/backend/logs/*.log
```

### 2. PM2访问控制

PM2默认以root运行，建议创建专用用户：

```bash
useradd -m -s /bin/bash pm2user
su - pm2user
npm install -g pm2
```

### 3. 环境变量保护

敏感信息不要写在配置文件中，使用 `.env` 文件：

```bash
# .env
DB_PASSWORD=your_password
JWT_SECRET=your_secret

# ecosystem.config.js
env_file: './.env'
```

---

## 🎯 最佳实践

### 1. 部署前检查清单

- [ ] 代码已提交到Git
- [ ] 本地测试通过
- [ ] 备份当前版本
- [ ] 准备回滚方案

### 2. 部署步骤

```bash
# 1. 备份
ssh visitor 'cd /home/node/visitor && cp -r auto-deploy/current auto-deploy/backup_$(date +%Y%m%d_%H%M%S)'

# 2. 上传新代码
scp -r backend/src/* visitor:/home/node/visitor/auto-deploy/current/backend/src/

# 3. 重启服务
ssh visitor 'export PATH=/usr/local/nodejs/bin:$PATH && cd /home/node/visitor/auto-deploy/current/backend && pm2 reload ecosystem.config.js'

# 4. 验证
sleep 3
curl -k https://visitor.timehuasun.cn:8021/health

# 5. 观察日志
ssh visitor 'export PATH=/usr/local/nodejs/bin:$PATH && pm2 logs visitor-backend --lines 20'
```

### 3. 回滚步骤

```bash
# 如果新版本有问题，快速回滚
ssh visitor 'export PATH=/usr/local/nodejs/bin:$PATH && cd /home/node/visitor/auto-deploy && rm -rf current && ln -s backup_20260408_150000 current && cd current/backend && pm2 reload ecosystem.config.js'
```

---

## 📞 常见问题FAQ

### Q1: PM2和nohup有什么区别？

**A**: PM2提供了更多功能：
- 自动重启（崩溃、内存超限）
- 日志管理
- 性能监控
- 开机自启
- 零停机重启

### Q2: 为什么选择fork模式而不是cluster？

**A**: 
- Fork模式更简单，适合单实例
- Cluster模式需要应用支持多进程
- 当前访问量不需要多实例

### Q3: 如何查看历史重启记录？

**A**: 
```bash
pm2 info visitor-backend | grep "restart"
```

### Q4: PM2会占用很多资源吗？

**A**: 
- PM2守护进程约占用10-20MB内存
- 对性能影响极小
- 带来的稳定性提升远大于资源消耗

---

## 📚 相关资源

- [PM2官方文档](https://pm2.keymetrics.io/)
- [PM2 GitHub](https://github.com/Unitech/pm2)
- [PM2最佳实践](https://pm2.keymetrics.io/docs/usage/process-management/)

---

**配置完成时间**: 2026-04-08  
**PM2版本**: 6.0.14  
**Node.js版本**: v16.20.2  
**最后更新**: 2026-04-08
