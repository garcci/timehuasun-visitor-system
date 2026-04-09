<template>
  <div class="system-update">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>📦 系统更新</span>
          <el-button type="primary" size="small" @click="checkUpdate">
            🔍 检查更新
          </el-button>
        </div>
      </template>

      <!-- 上传区域 -->
      <el-upload
        class="upload-demo"
        drag
        :http-request="uploadPackage"
        :before-upload="beforeUpload"
        :on-success="handleSuccess"
        :on-error="handleError"
        accept=".tar.gz,.tgz"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将部署包拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只支持 .tar.gz / .tgz 格式的文件，大小不超过 50MB
          </div>
        </template>
      </el-upload>

      <!-- 部署进度 -->
      <div v-if="deploying" class="deploy-progress">
        <el-progress
          :percentage="progressPercentage"
          :status="progressStatus"
          :stroke-width="20"
        >
          <template v-if="progressStatus === 'success'">
            <el-tag type="success">部署成功</el-tag>
          </template>
          <template v-else-if="progressStatus === 'exception'">
            <el-tag type="danger">部署失败</el-tag>
          </template>
        </el-progress>
        
        <div v-if="deployLog" class="deploy-log">
          <h4>部署日志：</h4>
          <pre>{{ deployLog }}</pre>
        </div>
      </div>

      <!-- 当前版本信息 -->
      <el-divider />
      
      <div class="version-info">
        <h4>📋 版本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="当前版本">
            {{ currentVersion }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ lastUpdateTime || '暂无记录' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 部署历史 -->
      <el-divider />
      
      <div class="deploy-history">
        <div class="history-header">
          <h4>📜 部署历史</h4>
          <el-button size="small" @click="loadHistory">
            🔄 刷新
          </el-button>
        </div>
        
        <el-table :data="deployHistory" style="width: 100%" max-height="400">
          <el-table-column prop="timestamp" label="时间" width="180" />
          <el-table-column prop="packageName" label="部署包" />
          <el-table-column prop="packageSize" label="大小" width="100">
            <template #default="{ row }">
              {{ formatFileSize(row.packageSize) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
                {{ row.status === 'success' ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button
                size="small"
                @click="viewLog(row)"
              >
                查看日志
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 日志对话框 -->
    <el-dialog
      v-model="logDialogVisible"
      title="部署日志"
      width="60%"
    >
      <pre class="log-content">{{ selectedLog }}</pre>
      <template #footer>
        <el-button @click="logDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import axios from 'axios'

// 状态
const fileList = ref([])
const deploying = ref(false)
const progressPercentage = ref(0)
const progressStatus = ref('')
const deployLog = ref('')
const currentVersion = ref('1.0.0')
const lastUpdateTime = ref('')
const deployHistory = ref([])
const logDialogVisible = ref(false)
const selectedLog = ref('')

// 上传前验证
const beforeUpload = (file) => {
  const isTarGz = file.name.endsWith('.tar.gz') || file.name.endsWith('.tgz')
  const isLt50M = file.size / 1024 / 1024 < 50

  if (!isTarGz) {
    ElMessage.error('只能上传 .tar.gz 或 .tgz 格式的文件！')
  }
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB！')
  }
  
  return isTarGz && isLt50M
}

// 上传部署包
const uploadPackage = async (options) => {
  const { file, onSuccess, onError } = options
  const formData = new FormData()
  formData.append('package', file)

  try {
    deploying.value = true
    progressPercentage.value = 10
    progressStatus.value = ''
    deployLog.value = '🚀 开始上传部署包...\n'
    deployLog.value += `📦 文件名称：${file.name}\n`
    deployLog.value += `📊 文件大小：${formatFileSize(file.size)}\n`
    deployLog.value += `⏰ 上传时间：${new Date().toLocaleString()}\n\n`

    // 获取 token
    const token = localStorage.getItem('admin_token')
    
    deployLog.value += '📡 正在连接到服务器...\n'
    progressPercentage.value = 20
    
    // 上传文件
    deployLog.value += '⬆️ 正在上传文件...\n'
    progressPercentage.value = 40
    
    const uploadRes = await axios.post('/api/admin/deploy/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    })

    if (uploadRes.data.code === 0) {
      progressPercentage.value = 60
      deployLog.value += '✅ 部署包上传成功\n'
      deployLog.value += `📂 存储路径：${uploadRes.data.data.path}\n\n`
      deployLog.value += '🔄 正在执行部署脚本...\n'
      
      // 调用 Element Plus 的 success 回调
      if (onSuccess) {
        onSuccess(uploadRes.data)
      }
      
      // 执行部署
      await executeDeploy(uploadRes.data.data.path)
    } else {
      const errorMsg = uploadRes.data.message || '上传失败'
      deployLog.value += `❌ 上传失败：${errorMsg}\n`
      ElMessage.error(errorMsg)
      if (onError) {
        onError(new Error(errorMsg))
      }
    }
  } catch (error) {
    console.error('上传失败:', error)
    deployLog.value += `❌ 上传异常：${error.message}\n`
    if (onError) {
      onError(error)
    }
    handleError(error)
  }
}

// 执行部署
const executeDeploy = async (packagePath) => {
  try {
    deployLog.value += '\n━━━━━━━━━━━━━━━━━━━━━━━━\n'
    deployLog.value += '⚙️  开始执行部署流程\n'
    deployLog.value += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
    
    const token = localStorage.getItem('admin_token')
    
    deployLog.value += '📤 发送部署指令到服务器...\n'
    progressPercentage.value = 70
    
    const deployRes = await axios.post('/api/admin/deploy/execute', {
      packagePath: packagePath
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 120000  // 增加超时时间到 120 秒
    })

    if (deployRes.data.code === 0) {
      progressPercentage.value = 90
      deployLog.value += '✅ 部署指令已接受\n\n'
      
      // 显示返回的详细信息
      if (deployRes.data.data) {
        deployLog.value += '📋 部署详情:\n'
        if (deployRes.data.data.script) {
          deployLog.value += `  - 执行脚本：${deployRes.data.data.script}\n`
        }
        if (deployRes.data.data.package) {
          deployLog.value += `  - 部署包：${deployRes.data.data.package}\n`
        }
        deployLog.value += '\n'
      }
      
      deployLog.value += '⏳ 等待服务重启...\n'
      deployLog.value += '🔄 预计需要 10-30 秒\n\n'
      
      progressPercentage.value = 100
      progressStatus.value = 'success'
      deployLog.value += '🎉 部署成功！服务正在重启...\n'
      deployLog.value += '\n💡 提示：请等待 30 秒后刷新页面验证新版本\n'
      
      ElMessage.success('部署成功！服务将在几秒后重启')
      
      // 清空文件列表
      fileList.value = []
      
      // 延迟加载历史记录
      setTimeout(() => {
        deployLog.value += '\n📜 正在加载部署历史...\n'
        loadHistory()
      }, 2000)
      
      // 30 秒后建议刷新
      setTimeout(() => {
        deployLog.value += '\n✅ 服务应该已经重启完成，您可以刷新页面验证新版本！\n'
      }, 30000)
    } else {
      throw new Error(deployRes.data.message || '部署响应异常')
    }
  } catch (error) {
    progressStatus.value = 'exception'
    deployLog.value += `\n❌ 部署失败：${error.message}\n`
    deployLog.value += `⚠️  错误类型：${error.constructor.name}\n`
    deployLog.value += `⏰ 失败时间：${new Date().toLocaleString()}\n`
    ElMessage.error('部署失败：' + error.message)
  } finally {
    deploying.value = false
    deployLog.value += '\n━━━━━━━━━━━━━━━━━━━━━━━━\n'
    deployLog.value += 'ℹ️  部署流程已结束\n'
    deployLog.value += '━━━━━━━━━━━━━━━━━━━━━━━━\n'
  }
}

// 处理成功
const handleSuccess = (response, file, fileList) => {
  console.log('文件上传成功:', response)
  // 已经在 uploadPackage 中处理，这里可以留空或添加额外逻辑
}

// 处理错误
const handleError = (error, file, fileList) => {
  deploying.value = false
  progressStatus.value = 'exception'
  progressPercentage.value = 0
  
  let errorMsg = '上传失败'
  if (error.response) {
    errorMsg = error.response.data.message || error.message
  } else if (error.message) {
    errorMsg = error.message
  }
  
  deployLog.value += `❌ ${errorMsg}\n`
  ElMessage.error(errorMsg)
}

// 检查更新
const checkUpdate = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get('/api/admin/deploy/check-update', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (res.data.code === 0) {
      currentVersion.value = res.data.data.currentVersion
      
      if (res.data.data.hasUpdate) {
        ElMessageBox.alert(
          `发现新版本！\n当前版本：${currentVersion.value}\n\n请上传最新的部署包进行更新。`,
          '系统更新提示',
          {
            confirmButtonText: '确定',
            type: 'info'
          }
        )
      } else {
        ElMessage.success('当前已是最新版本')
      }
    }
  } catch (error) {
    ElMessage.error('检查更新失败：' + error.message)
  }
}

// 加载部署历史
const loadHistory = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await axios.get('/api/admin/deploy/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (res.data.code === 0) {
      deployHistory.value = res.data.data || []
    }
  } catch (error) {
    console.error('加载历史失败:', error)
  }
}

// 查看日志
const viewLog = (row) => {
  selectedLog.value = row.log || '暂无日志记录'
  logDialogVisible.value = true
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 初始化
loadHistory()
checkUpdate()
</script>

<style scoped>
.system-update {
  padding: 20px;
}

.upload-demo {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-upload-dragger {
  margin-top: 20px;
  padding: 40px 20px;
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}

.el-upload-dragger:hover {
  border-color: #409EFF;
  background-color: #f5f7fa;
}

.el-icon--upload {
  font-size: 67px;
  color: #8c939d;
  margin-bottom: 16px;
}

.el-upload__text {
  color: #606266;
  font-size: 14px;
}

.el-upload__text em {
  color: #409EFF;
  font-style: normal;
}

.el-upload__tip {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

.deploy-progress {
  margin-top: 20px;
}

.deploy-log {
  margin-top: 20px;
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.deploy-log pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.version-info {
  margin-top: 20px;
}

.deploy-history {
  margin-top: 20px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.log-content {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
