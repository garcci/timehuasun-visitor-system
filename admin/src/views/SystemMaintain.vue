<template>
  <div class="system-maintain">
    <el-row :gutter="20">
      <!-- 服务控制 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>服务控制</span>
          </template>
          
          <el-descriptions :column="1" border style="margin-bottom: 20px;">
            <el-descriptions-item label="服务状态">
              <el-tag type="success" effect="dark">运行中</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="进程 ID">81643</el-descriptions-item>
            <el-descriptions-item label="启动时间">2026-04-02 14:30:00</el-descriptions-item>
            <el-descriptions-item label="运行时长">{{ uptime }}</el-descriptions-item>
          </el-descriptions>

          <el-button type="warning" @click="handleRestart" style="margin-right: 10px;">
            重启服务
          </el-button>
          <el-button type="danger" @click="handleStop">停止服务</el-button>
        </el-card>
      </el-col>

      <!-- 日志查看 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>实时日志</span>
              <el-button size="small" @click="handleClearLog">清空</el-button>
            </div>
          </template>
          
          <div class="log-container">
            <pre>{{ logContent }}</pre>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据库维护 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <span>数据库维护</span>
      </template>
      
      <el-descriptions :column="3" border>
        <el-descriptions-item label="数据库">MySQL 8.0</el-descriptions-item>
        <el-descriptions-item label="连接状态">
          <el-tag type="success">正常</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="表数量">2</el-descriptions-item>
        <el-descriptions-item label="数据量">1,234 条记录</el-descriptions-item>
        <el-descriptions-item label="占用空间">15.6 MB</el-descriptions-item>
        <el-descriptions-item label="最后备份">未备份</el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 20px;">
        <el-button type="primary" @click="handleBackup">备份数据库</el-button>
        <el-button type="warning" @click="handleOptimize">优化表</el-button>
        <el-button type="info" @click="handleClean">清理旧数据</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { controlService, backupDatabase } from '@/api'

const uptime = ref('2 小时 30 分')
const logContent = ref(`[2026-04-02 14:30:00] INFO: 服务器启动成功
[2026-04-02 14:30:01] INFO: MySQL 数据库连接成功
[2026-04-02 14:30:01] INFO: Redis 缓存连接成功
[2026-04-02 14:30:01] INFO: 监听端口：3000
[2026-04-02 14:30:05] INFO: GET /health - 200 OK
[2026-04-02 14:30:10] INFO: POST /api/visitors/query-by-phone - 200 OK
`)

const handleRestart = async () => {
  try {
    await ElMessageBox.confirm('确定要重启服务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await controlService('restart')
    if (res.code === 0) {
      ElMessage.success('服务重启中...')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重启失败')
    }
  }
}

const handleStop = async () => {
  try {
    await ElMessageBox.confirm('确定要停止服务吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })
    
    const res = await controlService('stop')
    if (res.code === 0) {
      ElMessage.success('服务已停止')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('停止失败')
    }
  }
}

const handleClearLog = () => {
  logContent.value = ''
  ElMessage.success('日志已清空')
}

const handleBackup = async () => {
  try {
    const res = await backupDatabase()
    if (res.code === 0) {
      ElMessage.success('备份成功')
    }
  } catch (error) {
    ElMessage.error('备份失败')
  }
}

const handleOptimize = () => {
  ElMessage.info('优化功能开发中...')
}

const handleClean = () => {
  ElMessage.info('清理功能开发中...')
}
</script>

<style scoped>
.system-maintain {
  padding: 20px;
}

.log-container {
  height: 400px;
  overflow-y: auto;
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
