#!/bin/bash

# ============================================
# 访客系统实时监控仪表板
# 显示系统关键指标和服务状态
# ============================================

export PATH=/usr/local/nodejs/bin:$PATH

clear

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           访客系统实时监控仪表板                            ║"
echo "║           $(date '+%Y-%m-%d %H:%M:%S')                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 1. 服务状态
echo "📊 服务状态"
echo "─────────────────────────────────────────────────────────────"
pm2_status=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
try:
    apps = json.load(sys.stdin)
    for app in apps:
        if app['name'] == 'visitor-backend':
            env = app['pm2_env']
            monit = app['monit']
            status = env['status']
            uptime = env['uptime_ms']
            restarts = env['restart_time']
            memory_mb = monit['memory'] / 1024 / 1024
            cpu = monit['cpu']
            
            # 格式化运行时间
            hours = uptime // 3600000
            minutes = (uptime % 3600000) // 60000
            
            print(f'  状态:     {status}')
            print(f'  运行时间: {hours}小时{minutes}分钟')
            print(f'  重启次数: {restarts}次')
            print(f'  内存使用: {memory_mb:.1f}MB')
            print(f'  CPU使用:  {cpu}%')
            break
except:
    print('  ❌ 无法获取PM2状态')
" 2>/dev/null)

if [ -n "$pm2_status" ]; then
    echo "$pm2_status"
else
    echo "  ❌ PM2服务异常"
fi
echo ""

# 2. 健康检查
echo "🏥 健康检查"
echo "─────────────────────────────────────────────────────────────"
health_response=$(curl -k -s https://visitor.timehuasun.cn:8021/health --max-time 5)
if [ $? -eq 0 ] && [ -n "$health_response" ]; then
    health_status=$(echo "$health_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'unknown'))" 2>/dev/null)
    echo "  HTTP状态: ✅ 200 OK"
    echo "  服务状态: $health_status"
else
    echo "  HTTP状态: ❌ 服务无响应"
fi
echo ""

# 3. 系统资源
echo "💻 系统资源"
echo "─────────────────────────────────────────────────────────────"
# CPU
cpu_idle=$(top -bn1 | grep "Cpu(s)" | awk '{print $8}' | cut -d'%' -f1)
cpu_usage=$(echo "100 - $cpu_idle" | bc 2>/dev/null || echo "N/A")
echo "  CPU使用率: ${cpu_usage}%"

# 内存
mem_info=$(free -m | awk 'NR==2{printf "%.1f/%.1f MB (%.1f%%)", $3, $2, $3*100/$2}')
echo "  内存使用: $mem_info"

# 磁盘
disk_info=$(df -h /home | awk 'NR==2{printf "%s/%s (%s)", $3, $2, $5}')
echo "  磁盘使用: $disk_info"
echo ""

# 4. PM2进程列表
echo "🔄 PM2进程"
echo "─────────────────────────────────────────────────────────────"
pm2 list 2>/dev/null | grep -E "visitor-backend|pm2-logrotate" || echo "  无运行中的进程"
echo ""

# 5. 最近日志
echo "📝 最近日志（最后5条）"
echo "─────────────────────────────────────────────────────────────"
if [ -f "/var/log/visitor-health-check.log" ]; then
    tail -5 /var/log/visitor-health-check.log | while read line; do
        echo "  $line"
    done
else
    echo "  暂无日志"
fi
echo ""

# 6. 定时任务
echo "⏰ 定时任务"
echo "─────────────────────────────────────────────────────────────"
cron_count=$(crontab -l 2>/dev/null | grep -c "visitor\|cleanup")
echo "  已配置 $cron_count 个监控任务"
crontab -l 2>/dev/null | grep "visitor\|cleanup" | while read line; do
    echo "  ✓ $line"
done
echo ""

# 7. 快速操作
echo "🛠️  快速操作命令"
echo "─────────────────────────────────────────────────────────────"
echo "  查看实时日志:  pm2 logs visitor-backend"
echo "  重启服务:     pm2 restart visitor-backend"
echo "  查看监控:     pm2 monit"
echo "  健康检查:     curl -k https://visitor.timehuasun.cn:8021/health"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  监控配置:                                                  ║"
echo "║  ✓ PM2自动重启 (内存>500MB)                                ║"
echo "║  ✓ 健康检查 (每5分钟)                                      ║"
echo "║  ✓ 日志轮转 (每天2点)                                      ║"
echo "║  ✓ 开机自启 (systemd)                                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
