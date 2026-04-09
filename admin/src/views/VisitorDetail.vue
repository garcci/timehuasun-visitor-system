<template>
  <div class="visitor-detail">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>访客详情</span>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-descriptions v-if="visitor" :column="2" border>
        <el-descriptions-item label="申请ID">{{ visitor.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(visitor.status)">
            {{ getStatusText(visitor.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="姓名">{{ visitor.name }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ visitor.phone }}</el-descriptions-item>
        <el-descriptions-item label="身份证号">{{ visitor.id_card }}</el-descriptions-item>
        <el-descriptions-item label="证件类型">{{ visitor.id_type || '居民身份证' }}</el-descriptions-item>
        <el-descriptions-item label="单位/组织">{{ visitor.organization || '-' }}</el-descriptions-item>
        <el-descriptions-item label="车牌号">{{ visitor.plate_number || '-' }}</el-descriptions-item>
        <el-descriptions-item label="来访时间">{{ formatDateTime(visitor.visit_date, visitor.visit_time) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ formatDateTime(visitor.end_date, visitor.end_time) }}</el-descriptions-item>
        <el-descriptions-item label="被访人姓名">{{ visitor.host_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="被访人电话">{{ visitor.host_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="OA流程ID" :span="2">
          <span v-if="visitor.oa_flow_id" style="font-family: monospace; color: #409eff;">
            {{ visitor.oa_flow_id }}
          </span>
          <span v-else style="color: #909399;">未生成</span>
        </el-descriptions-item>
        <el-descriptions-item label="来访目的" :span="2">{{ visitor.purpose || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ visitor.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ visitor.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="审批时间">{{ visitor.approval_time || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="visitor.reject_reason" label="拒绝原因" :span="2">
          <span style="color: #f56c6c">{{ visitor.reject_reason }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 随行人员 -->
      <div v-if="visitor && visitor.companions && visitor.companions.length > 0" class="companions-section">
        <h3>随行人员（{{ visitor.companions.length }}人）</h3>
        <el-table :data="visitor.companions" border stripe>
          <el-table-column type="index" label="#" width="60" />
          <el-table-column prop="name" label="姓名" />
          <el-table-column prop="id_card" label="身份证号" />
          <el-table-column prop="phone" label="手机号" />
          <el-table-column prop="company" label="单位" />
        </el-table>
      </div>

      <!-- 审批操作 -->
      <div v-if="visitor && visitor.status === 'pending'" class="approval-actions">
        <el-divider />
        <h3>审批操作</h3>
        <el-form :model="approvalForm" label-width="100px">
          <el-form-item label="审批结果">
            <el-radio-group v-model="approvalForm.status">
              <el-radio label="approved">通过</el-radio>
              <el-radio label="rejected">拒绝</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="approvalForm.status === 'rejected'" label="拒绝原因">
            <el-input
              v-model="approvalForm.rejectReason"
              type="textarea"
              :rows="3"
              placeholder="请输入拒绝原因"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleApprove" :loading="approving">
              提交审批
            </el-button>
            <el-button @click="resetApproval">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getVisitorDetail, approveVisitor } from '@/api'

const route = useRoute()
const router = useRouter()

const visitor = ref(null)
const approving = ref(false)
const approvalForm = ref({
  status: 'approved',
  rejectReason: ''
})

// 加载访客详情
const loadVisitorDetail = async () => {
  try {
    const res = await getVisitorDetail(route.params.id)
    if (res.code === 0) {
      visitor.value = res.data
    }
  } catch (error) {
    ElMessage.error('加载访客详情失败')
  }
}

// 审批操作
const handleApprove = async () => {
  if (approvalForm.value.status === 'rejected' && !approvalForm.value.rejectReason) {
    ElMessage.warning('请填写拒绝原因')
    return
  }

  approving.value = true
  try {
    const res = await approveVisitor(
      route.params.id,
      approvalForm.value.status,
      approvalForm.value.rejectReason
    )
    
    if (res.code === 0) {
      ElMessage.success(res.message)
      await loadVisitorDetail() // 重新加载数据
    }
  } catch (error) {
    ElMessage.error('审批失败')
  } finally {
    approving.value = false
  }
}

// 重置审批表单
const resetApproval = () => {
  approvalForm.value = {
    status: 'approved',
    rejectReason: ''
  }
}

// 格式化日期时间
const formatDateTime = (date, time) => {
  if (!date) return '-'
  const datePart = date.includes('T') ? date.split('T')[0] : date
  const timePart = time ? time.substring(0, 5) : ''
  return timePart ? `${datePart} ${timePart}` : datePart
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

onMounted(() => {
  loadVisitorDetail()
})
</script>

<style scoped>
.visitor-detail {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.companions-section {
  margin-top: 30px;
}

.companions-section h3 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #303133;
}

.approval-actions {
  margin-top: 30px;
}

.approval-actions h3 {
  margin-bottom: 20px;
  font-size: 16px;
  color: #303133;
}
</style>
