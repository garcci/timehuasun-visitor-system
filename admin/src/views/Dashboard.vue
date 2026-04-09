<template>
  <div class="dashboard">
    <!-- 数据统计卡片 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <el-icon :size="30"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">总申请数</div>
              <div class="stat-value">{{ stats.total || 0 }}</div>
              <div class="stat-subtitle">所有访客申请</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <el-icon :size="30"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">待审批</div>
              <div class="stat-value">{{ stats.pending || 0 }}</div>
              <div class="stat-subtitle">等待处理的申请</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
              <el-icon :size="30"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">已通过</div>
              <div class="stat-value">{{ stats.approved || 0 }}</div>
              <div class="stat-subtitle">审批通过的申请</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
              <el-icon :size="30"><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">已拒绝</div>
              <div class="stat-value">{{ stats.rejected || 0 }}</div>
              <div class="stat-subtitle">被拒绝的申请</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <!-- 左侧：今日访客和趋势图 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span><el-icon><TrendCharts /></el-icon> 数据趋势</span>
              <el-radio-group v-model="dateRange" size="small">
                <el-radio-button label="week">近 7 天</el-radio-button>
                <el-radio-button label="month">近 30 天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" style="height: 300px;"></div>
        </el-card>

        <el-card style="margin-top: 20px;">
          <template #header>
            <span><el-icon><Calendar /></el-icon> 今日访客</span>
            <el-tag type="success" effect="dark">实时更新</el-tag>
          </template>
          <el-table :data="todayVisitors" style="width: 100%" :height="250">
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="phone" label="电话" width="120" />
            <el-table-column prop="visitTime" label="来访时间" width="160" />
            <el-table-column prop="hostName" label="被访人" />
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：待审批列表和系统信息 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span><el-icon><Bell /></el-icon> 待审批事项</span>
              <el-badge :value="pendingList.length" type="danger" />
            </div>
          </template>
          <el-timeline>
            <el-timeline-item 
              v-for="item in pendingList" 
              :key="item.id" 
              timestamp="待处理"
              placement="top">
              <el-card shadow="hover">
                <h4>{{ item.name }}</h4>
                <p>来访：{{ item.visitDate }} {{ item.visitTime }}</p>
                <p>被访：{{ item.hostName }}</p>
                <div style="margin-top: 10px;">
                  <el-button size="small" type="success" @click="handleApprove(item.id)">通过</el-button>
                  <el-button size="small" type="danger" @click="handleReject(item.id)">拒绝</el-button>
                </div>
              </el-card>
            </el-timeline-item>
            <el-timeline-item v-if="pendingList.length === 0" timestamp="无待办">
              <el-empty description="没有待审批的申请" :image-size="80" />
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <el-card style="margin-top: 20px;">
          <template #header>
            <span><el-icon><Setting /></el-icon> 系统状态</span>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="运行环境">{{ env }}</el-descriptions-item>
            <el-descriptions-item label="服务状态">
              <el-tag type="success" size="small">正常运行</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="缓存状态">
              <el-tag :type="cacheAvailable ? 'success' : 'warning'" size="small">
                {{ cacheAvailable ? '可用' : '不可用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ lastUpdate }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Clock, CircleCheck, CircleClose, TrendCharts, Calendar, Bell, Setting } from '@element-plus/icons-vue'
import { getStats, getVisitorsApi, updateStatusApi, getEnhancedStats } from '@/api'
import * as echarts from 'echarts'

const stats = ref({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0
})
const env = ref('production')
const dateRange = ref('week')
const chartRef = ref(null)
let chartInstance = null
const todayVisitors = ref([])
const pendingList = ref([])
const cacheAvailable = ref(true)
const lastUpdate = ref(new Date().toLocaleString())

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['申请数', '通过数', '拒绝数']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '申请数',
        type: 'line',
        smooth: true,
        data: [],
        itemStyle: { color: '#667eea' }
      },
      {
        name: '通过数',
        type: 'line',
        smooth: true,
        data: [],
        itemStyle: { color: '#4facfe' }
      },
      {
        name: '拒绝数',
        type: 'line',
        smooth: true,
        data: [],
        itemStyle: { color: '#fa709a' }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await getEnhancedStats()
    if (res.code === 0 && res.data) {
      // 使用真实数据
      stats.value = {
        total: res.data.total || 0,
        pending: res.data.statusStats?.find(s => s.status === 'pending')?.count || 0,
        approved: res.data.statusStats?.find(s => s.status === 'approved')?.count || 0,
        rejected: res.data.statusStats?.find(s => s.status === 'rejected')?.count || 0
      }
      cacheAvailable.value = true
      lastUpdate.value = new Date().toLocaleString()
      
      // 更新图表数据（使用真实趋势数据）
      updateChartData(res.data.trend || [])
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 加载今日访客
const loadTodayVisitors = async () => {
  try {
    const res = await getVisitorsApi(1, 10)
    if (res.code === 0 && res.data?.list) {
      todayVisitors.value = res.data.list.slice(0, 5)
    }
  } catch (error) {
    console.error('加载今日访客失败:', error)
  }
}

// 加载待审批列表
const loadPendingList = async () => {
  try {
    const res = await getVisitorsApi(1, 10, 'pending')
    if (res.code === 0 && res.data?.list) {
      pendingList.value = res.data.list
    }
  } catch (error) {
    console.error('加载待审批列表失败:', error)
  }
}

// 更新图表数据
const updateChartData = (trendData = []) => {
  if (!chartInstance) return
  
  let dates = []
  let applyData = []
  
  if (trendData && trendData.length > 0) {
    // 使用真实趋势数据
    dates = trendData.map(item => {
      const date = new Date(item.date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    })
    applyData = trendData.map(item => item.count)
  } else {
    // 如果没有数据，显示空图表
    const days = dateRange.value === 'week' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(`${d.getMonth() + 1}/${d.getDate()}`)
      applyData.push(0)
    }
  }
  
  chartInstance.setOption({
    xAxis: { data: dates },
    series: [
      { data: applyData },
      { data: applyData.map(() => 0) }, // 通过数（暂时用0）
      { data: applyData.map(() => 0) }  // 拒绝数（暂时用0）
    ]
  })
}

// 审批通过
const handleApprove = async (id) => {
  try {
    await ElMessageBox.confirm('确认通过该申请？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success'
    })
    
    await updateStatusApi(id, 'approved')
    ElMessage.success('已通过')
    loadPendingList()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审批失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 拒绝申请
const handleReject = async (id) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝原因', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '请输入原因'
    })
    
    await updateStatusApi(id, 'rejected', value)
    ElMessage.success('已拒绝')
    loadPendingList()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('拒绝失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 获取状态类型
const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const texts = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || status
}

// 监听日期范围变化
const watchDateRange = () => {
  updateChartData()
}

onMounted(async () => {
  await loadStats()
  await loadTodayVisitors()
  await loadPendingList()
  initChart()
  
  // 每 30 秒刷新一次数据
  const timer = setInterval(() => {
    loadStats()
    loadTodayVisitors()
    loadPendingList()
  }, 30000)
  
  onUnmounted(() => {
    clearInterval(timer)
    if (chartInstance) {
      chartInstance.dispose()
    }
  })
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: calc(100vh - 84px);
}

.stat-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stat-icon {
  width: 70px;
  height: 70px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 20px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-subtitle {
  font-size: 12px;
  color: #999;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-card) {
  border-radius: 12px;
  margin-bottom: 20px;
}

:deep(.el-card__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
}

:deep(.el-card__header span) {
  color: white;
  font-weight: 600;
}

:deep(.el-timeline-item__timestamp) {
  color: #667eea;
  font-weight: 600;
}

:deep(.el-descriptions__label) {
  width: 100px;
  font-weight: 600;
}
</style>
