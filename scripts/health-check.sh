#!/bin/bash
# 健康检查脚本 - 用于监控告警

# 配置（服务器上使用 localhost）
API_URL="http://localhost:3000/health"
LOG_FILE="/home/node/visitor/logs/health-check.log"
ALERT_COUNT_FILE="/tmp/health_check_fail_count"
MAX_FAIL_COUNT=3

# 确保日志目录存在
mkdir -p $(dirname $LOG_FILE)

# 发送告警（这里可以接入企业微信、钉钉等）
send_alert() {
    local message="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $message" >> $LOG_FILE
    # TODO: 接入企业微信/钉钉告警
    # curl -s "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"msgtype\": \"text\", \"text\": {\"content\": \"$message\"}}"
}

# 记录日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# 检查API健康状态
check_health() {
    local response=$(curl -sk --connect-timeout 10 "$API_URL" 2>&1)
    local http_code=$(curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 10 "$API_URL" 2>&1)
    
    if [ "$http_code" = "200" ]; then
        # 检查返回内容是否包含 ok
        if echo "$response" | grep -q '"status":"ok"'; then
            echo "healthy"
        else
            echo "unhealthy: response invalid"
        fi
    else
        echo "unhealthy: HTTP $http_code"
    fi
}

# 主逻辑
main() {
    log "开始健康检查..."
    
    result=$(check_health)
    
    if [ "$result" = "healthy" ]; then
        log "健康检查通过"
        # 重置失败计数
        if [ -f "$ALERT_COUNT_FILE" ]; then
            rm -f "$ALERT_COUNT_FILE"
            send_alert "✅ 访客系统服务已恢复正常"
        fi
    else
        log "健康检查失败: $result"
        
        # 增加失败计数
        if [ -f "$ALERT_COUNT_FILE" ]; then
            count=$(cat $ALERT_COUNT_FILE)
            count=$((count + 1))
        else
            count=1
        fi
        echo $count > $ALERT_COUNT_FILE
        
        log "连续失败次数: $count"
        
        # 达到阈值发送告警
        if [ "$count" -ge "$MAX_FAIL_COUNT" ]; then
            send_alert "🚨 访客系统服务异常！连续 $count 次健康检查失败: $result"
        fi
    fi
}

main
