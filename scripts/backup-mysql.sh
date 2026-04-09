#!/bin/bash
# MySQL 自动备份脚本

# 备份配置
BACKUP_DIR=/home/node/visitor/backups
DB_NAME=visitor_system
DB_USER=root
DB_PASS=4P6yliAa@123
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE=$BACKUP_DIR/${DB_NAME}_${DATE}.sql

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始备份数据库 $DB_NAME..."
mysqldump -u$DB_USER -p$DB_PASS --single-transaction --routines --triggers $DB_NAME > $BACKUP_FILE

# 检查备份是否成功
if [ $? -eq 0 ]; then
    # 压缩备份文件
    gzip $BACKUP_FILE
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份成功: ${BACKUP_FILE}.gz"
    
    # 计算备份文件大小
    SIZE=$(du -h ${BACKUP_FILE}.gz | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份文件大小: $SIZE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份失败!"
    exit 1
fi

# 清理7天前的备份
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 清理7天前的备份文件..."
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete

# 显示剩余备份数量
COUNT=$(find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 当前保留备份数量: $COUNT"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份任务完成"
