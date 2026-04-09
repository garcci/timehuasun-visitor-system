#!/bin/bash

# ============================================
# 访客系统健康检查和自动恢复脚本
# 每5分钟执行一次，确保服务稳定运行
# ============================================

export PATH=/usr/local/nodejs/bin:$PATH

LOG_FILE="/var/log/visitor-health-check.log"
ALERT_EMAIL=""  # 可选：配置邮箱告警
MAX_RESTART_COUNT=5
CHECK_INTERVAL=300  # 5分钟

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 发送告警（可选）
send_alert() {
    local message="$1"
    log "⚠️  告警: $message"
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "访客系统告警" "$ALERT_EMAIL"
    fi
}

# 检查PM2进程
check_pm2() {
    log "🔍 检查PM2状态..."
    
    if ! command -v pm2 &> /dev/null; then
        log "❌ PM2未安装"
        return 1
    fi
    
    # 检查应用状态
    local status=$(pm2 jlist | python3 -c "
import sys, json
apps = json.load(sys.stdin)
for app in apps:
    if app['name'] == 'visitor-backend':
        print(app['pm2_env']['status'])
        break
" 2>/dev/null)
    
    if [ "$status" != "online" ]; then
        log "❌ 服务状态异常: $status"
        return 1
    fi
    
    log "✅ PM2服务正常"
    return 0
}

# 检查健康接口
check_health() {
    log "🔍 检查健康接口..."
    
    local http_code=$(curl -k -s -o /dev/null -w "%{http_code}" https://visitor.timehuasun.cn:8021/health --max-time 10)
    
    if [ "$http_code" != "200" ]; then
        log "❌ 健康检查失败: HTTP $http_code"
        return 1
    fi
    
    log "✅ 健康检查通过: HTTP $http_code"
    return 0
}

# 检查内存使用
check_memory() {
    log "🔍 检查内存使用..."
    
    local memory=$(pm2 jlist | python3 -c "
import sys, json
apps = json.load(sys.stdin)
for app in apps:
    if app['name'] == 'visitor-backend':
        print(app['monit']['memory'])
        break
" 2>/dev/null)
    
    if [ -n "$memory" ]; then
        local memory_mb=$((memory / 1024 / 1024))
        log "📊 内存使用: ${memory_mb}MB"
        
        if [ $memory_mb -gt 450 ]; then
            log "⚠️  内存使用过高: ${memory_mb}MB"
            send_alert "内存使用过高: ${memory_mb}MB"
            return 1
        fi
    fi
    
    return 0
}

# 检查磁盘空间
check_disk() {
    log "🔍 检查磁盘空间..."
    
    local usage=$(df -h /home | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt 90 ]; then
        log "❌ 磁盘空间不足: ${usage}%"
        send_alert "磁盘空间不足: ${usage}%"
        return 1
    elif [ "$usage" -gt 80 ]; then
        log "⚠️  磁盘空间警告: ${usage}%"
    else
        log "✅ 磁盘空间正常: ${usage}%"
    fi
    
    return 0
}

# 检查重启次数
check_restart_count() {
    log "🔍 检查重启次数..."
    
    local restarts=$(pm2 jlist | python3 -c "
import sys, json
apps = json.load(sys.stdin)
for app in apps:
    if app['name'] == 'visitor-backend':
        print(app['pm2_env']['restart_time'])
        break
" 2>/dev/null)
    
    if [ -n "$restarts" ] && [ "$restarts" -gt "$MAX_RESTART_COUNT" ]; then
        log "❌ 重启次数过多: $restarts 次"
        send_alert "服务重启次数过多: $restarts 次"
        return 1
    fi
    
    log "✅ 重启次数正常: $restarts 次"
    return 0
}

# 重启服务
restart_service() {
    log "🔄 尝试重启服务..."
    
    cd /home/node/visitor/auto-deploy/current/backend
    
    # 停止旧服务
    pm2 stop visitor-backend 2>/dev/null
    sleep 2
    
    # 清理端口
    local pid=$(lsof -ti:3000)
    if [ -n "$pid" ]; then
        kill -9 $pid
        sleep 1
    fi
    
    # 启动新服务
    pm2 start ecosystem.config.js
    sleep 5
    
    # 验证启动
    if check_health; then
        log "✅ 服务重启成功"
        return 0
    else
        log "❌ 服务重启失败"
        return 1
    fi
}

# 主检查流程
main() {
    log "=========================================="
    log "开始健康检查"
    log "=========================================="
    
    local errors=0
    
    # 执行各项检查
    check_pm2 || ((errors++))
    check_health || ((errors++))
    check_memory || ((errors++))
    check_disk || ((errors++))
    check_restart_count || ((errors++))
    
    # 如果有错误，尝试恢复
    if [ $errors -gt 0 ]; then
        log "⚠️  发现 $errors 个问题，尝试自动恢复..."
        
        if restart_service; then
            log "✅ 自动恢复成功"
        else
            log "❌ 自动恢复失败，需要人工干预"
            send_alert "服务自动恢复失败，请立即检查！"
        fi
    else
        log "✅ 所有检查通过，系统运行正常"
    fi
    
    log "=========================================="
    log ""
}

# 执行主流程
main
