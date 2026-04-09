<template>
  <div class="config-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>环境配置管理</span>
          <el-button type="primary" @click="handleSaveAll" :loading="saving">
            保存全部配置
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- 数据库配置 -->
        <el-tab-pane label="数据库配置" name="database">
          <el-form :model="config.database" label-width="140px">
            <el-form-item label="数据库地址">
              <el-input v-model="config.database.DB_HOST" placeholder="localhost" />
            </el-form-item>
            <el-form-item label="数据库端口">
              <el-input-number v-model="config.database.DB_PORT" :min="1" :max="65535" />
            </el-form-item>
            <el-form-item label="数据库名称">
              <el-input v-model="config.database.DB_NAME" disabled />
            </el-form-item>
            <el-form-item label="数据库用户">
              <el-input v-model="config.database.DB_USER" placeholder="visitor_user" />
            </el-form-item>
            <el-form-item label="数据库密码">
              <el-input
                v-model="config.database.DB_PASSWORD"
                type="password"
                show-password
                placeholder="请输入密码"
              />
            </el-form-item>
            <el-form-item label="连接池大小">
              <el-input-number v-model="config.database.connectionPoolSize" :min="1" :max="100" />
            </el-form-item>
            <el-form-item>
              <el-button type="success" @click="testConfig('database')">测试连接</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Redis 配置 -->
        <el-tab-pane label="Redis 缓存" name="redis">
          <el-form :model="config.redis" label-width="140px">
            <el-form-item label="Redis 地址">
              <el-input v-model="config.redis.REDIS_HOST" placeholder="localhost" />
            </el-form-item>
            <el-form-item label="Redis 端口">
              <el-input-number v-model="config.redis.REDIS_PORT" :min="1" :max="65535" />
            </el-form-item>
            <el-form-item label="Redis 密码">
              <el-input
                v-model="config.redis.REDIS_PASSWORD"
                type="password"
                show-password
                placeholder="无密码留空"
              />
            </el-form-item>
            <el-form-item label="缓存 TTL(秒)">
              <el-input-number v-model="config.redis.cacheTTL" :min="0" :max="86400" />
            </el-form-item>
            <el-form-item>
              <el-button type="success" @click="testConfig('redis')">测试连接</el-button>
              <el-button type="warning" @click="clearCache">清空缓存</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- OA 系统配置 -->
        <el-tab-pane label="OA 系统集成" name="oa">
          <el-form :model="config.oa" label-width="140px">
            <el-form-item label="OA 系统地址">
              <el-input
                v-model="config.oa.OA_BASE_URL"
                placeholder="http://192.168.x.x:8080"
              />
            </el-form-item>
            <el-form-item label="认证信息">
              <el-input
                v-model="config.oa.OA_AUTHORIZATION"
                type="password"
                show-password
                placeholder="Basic xxxxxxxx"
              />
            </el-form-item>
            <el-form-item label="签名密钥">
              <el-input
                v-model="config.oa.apiSecret"
                type="password"
                show-password
                placeholder="请输入密钥"
              />
            </el-form-item>
            <el-form-item label="超时时间 (ms)">
              <el-input-number v-model="config.oa.timeout" :step="1000" :min="1000" />
            </el-form-item>
            <el-form-item>
              <el-button type="success" @click="testConfig('oa')">测试接口</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- JWT 配置 -->
        <el-tab-pane label="JWT 安全" name="jwt">
          <el-form :model="config.jwt" label-width="140px">
            <el-form-item label="JWT 密钥">
              <el-input
                v-model="config.jwt.JWT_SECRET"
                type="password"
                show-password
                placeholder="请输入密钥"
              />
              <el-button @click="generateSecret" style="margin-left: 10px">
                生成随机密钥
              </el-button>
            </el-form-item>
            <el-form-item label="Token 有效期">
              <el-select v-model="config.jwt.JWT_EXPIRES_IN">
                <el-option label="1 小时" value="1h" />
                <el-option label="12 小时" value="12h" />
                <el-option label="1 天" value="1d" />
                <el-option label="7 天" value="7d" />
                <el-option label="30 天" value="30d" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 日志配置 -->
        <el-tab-pane label="日志配置" name="log">
          <el-form :model="config.log" label-width="140px">
            <el-form-item label="日志级别">
              <el-select v-model="config.log.LOG_LEVEL">
                <el-option label="Debug" value="debug" />
                <el-option label="Info" value="info" />
                <el-option label="Warn" value="warn" />
                <el-option label="Error" value="error" />
              </el-select>
            </el-form-item>
            <el-form-item label="日志保留天数">
              <el-input-number v-model="config.log.logRetentionDays" :min="1" :max="365" />
            </el-form-item>
            <el-form-item label="单个日志文件大小 (MB)">
              <el-input-number v-model="config.log.maxFileSize" :min="1" :max="100" />
            </el-form-item>
            <el-form-item label="日志文件数量">
              <el-input-number v-model="config.log.maxFiles" :min="1" :max="100" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getConfig, updateConfig, testConfig as apiTestConfig, clearCache as apiClearCache } from '@/api'

const activeTab = ref('database')
const saving = ref(false)

const config = reactive({
  database: {
    DB_HOST: 'localhost',
    DB_PORT: 3306,
    DB_NAME: 'visitor_system',
    DB_USER: 'visitor_user',
    DB_PASSWORD: '',
    connectionPoolSize: 10
  },
  redis: {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: '',
    cacheTTL: 300
  },
  oa: {
    OA_BASE_URL: 'http://192.168.0.158:8080',
    OA_AUTHORIZATION: '',
    apiSecret: '',
    timeout: 10000
  },
  jwt: {
    JWT_SECRET: '',
    JWT_EXPIRES_IN: '7d'
  },
  log: {
    LOG_LEVEL: 'info',
    logRetentionDays: 30,
    maxFileSize: 10,
    maxFiles: 10
  }
})

onMounted(async () => {
  await loadConfig()
})

const loadConfig = async () => {
  try {
    const res = await getConfig()
    if (res.code === 0 && res.data) {
      Object.assign(config, res.data)
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

const testConfig = async (type) => {
  try {
    const res = await apiTestConfig(type)
    if (res.code === 0) {
      ElMessage.success(`${type.toUpperCase()} 连接测试成功！`)
    } else {
      ElMessage.error(res.message || '连接失败')
    }
  } catch (error) {
    ElMessage.error('连接失败，请检查配置')
  }
}

const clearCache = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有缓存吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await apiClearCache()
    if (res.code === 0) {
      ElMessage.success('缓存已清空')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空缓存失败')
    }
  }
}

const generateSecret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let secret = ''
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  config.jwt.JWT_SECRET = secret
  ElMessage.success('已生成随机密钥')
}

const handleSaveAll = async () => {
  saving.value = true
  try {
    const res = await updateConfig(config)
    if (res.code === 0) {
      ElMessage.success('配置保存成功，应用将自动重启')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.config-manager {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-tabs__content) {
  padding: 20px;
}
</style>
