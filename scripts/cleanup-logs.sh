#!/bin/bash

# ============================================
# 日志清理和磁盘空间管理脚本
# 每天执行一次，防止磁盘占满
# ============================================

LOG_DIR="/home/node/visitor/auto-deploy/current/backend/logs"
MAX_LOG_SIZE_MB=100
RETAIN_DAYS=7

echo "[$(date)] 开始日志清理..."

# 1. 清理超过7天的旧日志
echo "清理 ${RETAIN_DAYS} 天前的日志..."
find "$LOG_DIR" -name "*.log" -mtime +${RETAIN_DAYS} -delete 2>/dev/null
find "$LOG_DIR" -name "*.log.*.gz" -mtime +${RETAIN_DAYS} -delete 2>/dev/null

# 2. 压缩大日志文件
echo "压缩大日志文件..."
find "$LOG_DIR" -name "*.log" -size +${MAX_LOG_SIZE_MB}M -exec gzip {} \; 2>/dev/null

# 3. 清理PM2旧日志
if command -v pm2 &> /dev/null; then
    echo "清理PM2日志..."
    export PATH=/usr/local/nodejs/bin:$PATH
    pm2 flush 2>/dev/null
fi

# 4. 清理系统临时文件
echo "清理系统临时文件..."
find /tmp -type f -mtime +7 -delete 2>/dev/null
find /var/tmp -type f -mtime +30 -delete 2>/dev/null

# 5. 检查磁盘使用率
DISK_USAGE=$(df -h /home | awk 'NR==2 {print $5}' | sed 's/%//')
echo "当前磁盘使用率: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  警告: 磁盘使用率过高 (${DISK_USAGE}%)"
    echo "建议立即清理或扩容"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚠️  注意: 磁盘使用率较高 (${DISK_USAGE}%)"
else
    echo "✅ 磁盘空间正常"
fi

# 6. 显示清理后的日志大小
if [ -d "$LOG_DIR" ]; then
    LOG_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | awk '{print $1}')
    echo "日志目录大小: $LOG_SIZE"
fi

echo "[$(date)] 日志清理完成"
echo ""
