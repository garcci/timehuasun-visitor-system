import request from '@/utils/request'

// 管理员登录
export function login(data) {
  return request({
    url: '/admin/login',
    method: 'post',
    data
  })
}

// 获取配置
export function getConfig() {
  return request({
    url: '/admin/config',
    method: 'get'
  })
}

// 更新配置
export function updateConfig(data) {
  return request({
    url: '/admin/config',
    method: 'put',
    data
  })
}

// 测试配置
export function testConfig(type) {
  return request({
    url: `/admin/config/test/${type}`,
    method: 'post'
  })
}

// 获取统计数据
export function getStats() {
  return request({
    url: '/admin/stats',
    method: 'get'
  })
}

// 获取日志列表
export function getLogs(params) {
  return request({
    url: '/admin/logs',
    method: 'get',
    params
  })
}

// 服务控制
export function controlService(action) {
  return request({
    url: '/admin/service/' + action,
    method: 'post'
  })
}

// 获取访客列表
export function getVisitors(params) {
  return request({
    url: '/admin/visitors',
    method: 'get',
    params
  })
}

// 删除访客
export function deleteVisitor(id) {
  return request({
    url: '/admin/visitors/' + id,
    method: 'delete'
  })
}

// 清空缓存
export function clearCache() {
  return request({
    url: '/admin/cache/clear',
    method: 'post'
  })
}

// 备份数据库
export function backupDatabase() {
  return request({
    url: '/admin/database/backup',
    method: 'post'
  })
}

// 修改密码
export function changePassword(data) {
  return request({
    url: '/admin/password',
    method: 'put',
    data
  })
}

// 获取访客列表（带分页和筛选）
export function getVisitorsApi(page = 1, pageSize = 10, status = '') {
  const params = { page, limit: pageSize }
  if (status) params.status = status
  return request({
    url: '/admin/visitors',
    method: 'get',
    params
  })
}

// 更新申请状态
export function updateStatusApi(id, status, rejectReason = '') {
  return request({
    url: `/visitors/${id}/status`,
    method: 'put',
    data: { status, rejectReason }
  })
}

// 获取访客详情
export function getVisitorDetail(id) {
  return request({
    url: `/admin/visitors/${id}`,
    method: 'get'
  })
}

// 审批访客申请
export function approveVisitor(id, status, rejectReason = '') {
  return request({
    url: `/admin/visitors/${id}/approve`,
    method: 'put',
    data: { status, rejectReason }
  })
}

// 导出访客数据
export function exportVisitors(params = {}) {
  return request({
    url: '/admin/visitors/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 获取增强统计数据
export function getEnhancedStats() {
  return request({
    url: '/admin/stats/enhanced',
    method: 'get'
  })
}
