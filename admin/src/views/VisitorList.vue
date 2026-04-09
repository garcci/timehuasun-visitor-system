<template>
  <div class="visitor-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>访客列表</span>
          <el-button type="primary" icon="Download" @click="handleExport">导出 CSV</el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="姓名/手机号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
            <el-option label="待审批" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="来访日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 批量操作栏 -->
      <div v-if="selectedRows.length > 0" class="batch-actions" style="margin-bottom: 15px; padding: 10px; background: #f5f7fa; border-radius: 4px;">
        <span style="margin-right: 15px;">已选择 {{ selectedRows.length }} 项</span>
        <el-button size="small" type="success" @click="handleBatchApprove">批量通过</el-button>
        <el-button size="small" type="danger" @click="handleBatchReject">批量拒绝</el-button>
        <el-button size="small" @click="clearSelection">取消选择</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        ref="tableRef"
        :data="tableData"
        stripe
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column prop="visitDate" label="来访日期" width="120" />
        <el-table-column prop="visitTime" label="来访时间" width="100" />
        <el-table-column prop="hostName" label="被访人" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitTime" label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.submitTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="220">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">查看</el-button>
            <template v-if="row.status === 'pending'">
              <el-button size="small" type="success" @click="handleApprove(row)">通过</el-button>
              <el-button size="small" type="danger" @click="handleReject(row)">拒绝</el-button>
            </template>
            <el-button v-else size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        style="margin-top: 20px; justify-content: flex-end;"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getVisitors, deleteVisitor, exportVisitors, approveVisitor } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const tableRef = ref(null)

const searchForm = reactive({
  keyword: '',
  status: '',
  dateRange: []
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      keyword: searchForm.keyword,
      status: searchForm.status
    }
    // 添加日期范围参数
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    const res = await getVisitors(params)
    
    if (res.code === 0 && res.data) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.dateRange = []
  handleSearch()
}

const handleView = (row) => {
  router.push(`/visitors/${row.id}`)
}

const handleExport = async () => {
  try {
    const res = await exportVisitors({
      status: searchForm.status
    })
    
    // 创建下载链接
    const blob = new Blob([res], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `visitors_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除访客 ${row.name} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteVisitor(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 快捷审批 - 通过
const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要通过 ${row.name} 的访客申请吗？`, '确认通过', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success'
    })
    
    await approveVisitor(row.id, 'approved')
    ElMessage.success('审批通过')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('审批失败')
    }
  }
}

// 快捷审批 - 拒绝
const handleReject = async (row) => {
  try {
    const { value: rejectReason } = await ElMessageBox.prompt(
      `请输入拒绝 ${row.name} 申请的原因`,
      '确认拒绝',
      {
        confirmButtonText: '确定拒绝',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入拒绝原因（必填）',
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
            return '拒绝原因不能为空'
          }
          return true
        }
      }
    )
    
    await approveVisitor(row.id, 'rejected', rejectReason)
    ElMessage.success('已拒绝申请')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleSizeChange = () => {
  loadData()
}

const handlePageChange = () => {
  loadData()
}

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || '未知'
}

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss')
}

// 选择项变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 清空选择
const clearSelection = () => {
  tableRef.value?.clearSelection()
  selectedRows.value = []
}

// 批量通过
const handleBatchApprove = async () => {
  const pendingRows = selectedRows.value.filter(row => row.status === 'pending')
  if (pendingRows.length === 0) {
    ElMessage.warning('请选择待审批的申请')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要通过选中的 ${pendingRows.length} 个申请吗？`,
      '批量通过确认',
      { type: 'success' }
    )
    
    let successCount = 0
    for (const row of pendingRows) {
      try {
        await approveVisitor(row.id, 'approved')
        successCount++
      } catch (e) {
        console.error(`审批 ${row.id} 失败`, e)
      }
    }
    
    ElMessage.success(`成功通过 ${successCount} 个申请`)
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量操作失败')
    }
  }
}

// 批量拒绝
const handleBatchReject = async () => {
  const pendingRows = selectedRows.value.filter(row => row.status === 'pending')
  if (pendingRows.length === 0) {
    ElMessage.warning('请选择待审批的申请')
    return
  }
  
  try {
    const { value: rejectReason } = await ElMessageBox.prompt(
      `请输入拒绝 ${pendingRows.length} 个申请的统一原因`,
      '批量拒绝确认',
      {
        confirmButtonText: '确定拒绝',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入拒绝原因（必填）',
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
            return '拒绝原因不能为空'
          }
          return true
        }
      }
    )
    
    let successCount = 0
    for (const row of pendingRows) {
      try {
        await approveVisitor(row.id, 'rejected', rejectReason)
        successCount++
      } catch (e) {
        console.error(`拒绝 ${row.id} 失败`, e)
      }
    }
    
    ElMessage.success(`成功拒绝 ${successCount} 个申请`)
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量操作失败')
    }
  }
}
</script>

<style scoped>
.visitor-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
