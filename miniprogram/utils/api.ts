// utils/api.ts — 真实后端 API 接口
import { showError, retryRequest } from './error-handler'

// ==================== 配置区域 ====================
// 选择环境配置（取消注释需要使用的配置）

// 🔥 本地开发环境（用于本地调试）
// const API_BASE_URL = 'http://localhost:3000/api'

// 🌐 测试环境（内网 HTTP 访问）
// const API_BASE_URL = 'http://192.168.99.253:8020/api'

// ☁️ 生产环境（外网 HTTPS 访问）- 当前激活（上架用）
const API_BASE_URL = 'https://visitor.timehuasun.cn:8021/api'

// 🔄 环境切换说明：
// 1. 本地开发：注释掉当前行，取消注释 localhost 那行
// 2. 预览/发布：确保使用外网 HTTPS 地址
// 3. 真机调试：需要配置微信公众号域名或关闭域名校验

// 测试用 openid（开发时使用）
const TEST_OPENID = 'test-user-from-miniprogram'

// 当前用户的 openid（登录后获取）
let currentOpenId: string | null = null

/**
 * 初始化 OpenID - 通过微信登录获取真实 openid
 */
export async function initOpenId(): Promise<string> {
  // 如果已经有 openid，直接返回
  if (currentOpenId) {
    return currentOpenId
  }
  
  // 尝试从本地存储获取（但如果是测试 ID，重新登录）
  const cached = wx.getStorageSync('user_openid')
  if (cached && cached !== TEST_OPENID) {
    currentOpenId = cached as string
    console.log('✅ 使用缓存的 OpenID:', currentOpenId)
    return currentOpenId
  }
  
  // 调用微信登录
  return new Promise((resolve) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 调用后端接口换取 openid
          wx.request({
            url: `${API_BASE_URL}/auth/login`,
            method: 'POST',
            data: { code: res.code },
            timeout: 10000,
            success: (result) => {
              try {
                // 检查请求是否成功
                if (result.statusCode !== 200) {
                  console.error('❌ 微信登录请求失败:', result.statusCode)
                  // 降级使用测试 openid
                  currentOpenId = TEST_OPENID
                  resolve(TEST_OPENID)
                  return
                }
                
                // 检查响应数据结构
                const responseData = result.data as any
                if (!responseData) {
                  console.error('❌ 微信登录响应数据为空')
                  // 降级使用测试 openid
                  currentOpenId = TEST_OPENID
                  resolve(TEST_OPENID)
                  return
                }
                
                // 检查业务逻辑是否成功
                if (responseData.success && responseData.data) {
                  currentOpenId = responseData.data.openid
                  // 缓存到本地
                  wx.setStorageSync('user_openid', currentOpenId)
                  console.log('✅ 微信登录成功，OpenID:', currentOpenId)
                  resolve(currentOpenId!)
                } else {
                  console.error('❌ 微信登录失败:', responseData)
                  // 降级使用测试 openid
                  currentOpenId = TEST_OPENID
                  resolve(TEST_OPENID)
                }
              } catch (error) {
                console.error('❌ 微信登录处理异常:', error)
                // 降级使用测试 openid
                currentOpenId = TEST_OPENID
                resolve(TEST_OPENID)
              }
            },
            fail: (err) => {
              console.error('❌ 微信登录请求失败:', err)
              // 降级使用测试 openid
              currentOpenId = TEST_OPENID
              resolve(TEST_OPENID)
            }
          })
        } else {
          console.error('❌ 微信登录失败:', res.errMsg)
          // 降级使用测试 openid
          currentOpenId = TEST_OPENID
          resolve(TEST_OPENID)
        }
      },
      fail: (err) => {
        console.error('❌ wx.login 调用失败:', err)
        // 降级使用测试 openid
        currentOpenId = TEST_OPENID
        resolve(TEST_OPENID)
      }
    })
  })
}

/**
 * 获取当前 OpenID
 */
export async function getCurrentOpenId(): Promise<string> {
  return await initOpenId()
}

// 导出 API_BASE_URL 供其他模块使用
export { API_BASE_URL }

export interface Companion {
  name: string
  idCard: string
  phone?: string
}

export interface Application {
  id: string
  name: string
  phone?: string           // 联系电话
  idType?: string          // 证件类型
  idCard: string
  organization?: string    // 来访单位
  plateNumber: string
  hostName?: string        // 被访人姓名
  hostDept?: string        // 被访部门（已弃用）
  hostPhone?: string       // 被访人联系电话
  hostLoginName?: string   // 被访人登录名（用于 OA 审批）
  visitDate?: string       // 来访日期 YYYY-MM-DD
  visitTime?: string       // 来访时间 HH:mm
  endDate?: string         // 结束日期 YYYY-MM-DD
  endTime?: string         // 结束时间 HH:mm
  purpose?: string         // 来访事由
  remark?: string          // 备注
  visitStartDate?: string  // YYYY-MM-DD
  visitStartTime?: string  // HH:mm
  companions: Companion[]
  status: 'pending' | 'approved' | 'rejected'
  submitTime: string       // ISO 字符串
  rejectReason?: string
}

/**
 * 通用请求函数
 */
async function request<T>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json'
      },
      timeout: 10000, // 10 秒超时
      success: (res: any) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          resolve(res.data.data)
        } else {
          // 使用统一错误处理
          showError({
            statusCode: res.statusCode,
            message: res.data.message || '请求失败',
            data: res.data
          })
          reject(new Error(res.data.message || '请求失败'))
        }
      },
      fail: (err) => {
        console.error('请求错误:', err)
        // 使用统一错误处理
        showError(err, {
          title: '网络错误，请检查网络连接'
        })
        reject(err)
      }
    })
  })
}

const APP_KEY = 'visitor_applications'
const DRAFT_KEY = 'visitor_draft'
const PRIVACY_KEY = 'visitor_privacy_agreed'
const TERMS_KEY = 'visitor_terms_agreed'

// 隐私政策只需同意一次
export function isPrivacyAgreed(): boolean {
  return wx.getStorageSync(PRIVACY_KEY) === true
}

export function agreePrivacy(): void {
  wx.setStorageSync(PRIVACY_KEY, true)
}

// 用户服务协议只需同意一次
export function isTermsAgreed(): boolean {
  return wx.getStorageSync(TERMS_KEY) === true
}

export function agreeTerms(): void {
  wx.setStorageSync(TERMS_KEY, true)
}

// 保密协议每次都要签署（不缓存）
export function isAgreementSigned(): boolean {
  return false // 每次填写前都要重新签署
}

export function signAgreement(): void {
  // 不缓存签署状态，每次都要重新签署
}

/**
 * 获取申请列表（从后端 API）
 */
export async function getApplicationsFromApi(page = 1, pageSize = 10, status?: string): Promise<{list: Application[], total: number, page: number, pageSize: number}> {
  try {
    const openid = await getCurrentOpenId()
    let url = `/visitors?openid=${openid}&page=${page}&pageSize=${pageSize}`
    if (status) {
      url += `&status=${status}`
    }
    
    const result = await request<{list: Application[], total: number, page: number, pageSize: number}>(url, 'GET')
    
    // 缓存到本地（离线可用）
    try {
      wx.setStorageSync('applications_cache', result.list)
      wx.setStorageSync('applications_cache_time', Date.now())
    } catch (e) {
      console.warn('缓存失败:', e)
    }
    
    return result
  } catch (error) {
    console.error('获取申请列表失败:', error)
    
    // 降级：使用缓存数据
    try {
      const cached = wx.getStorageSync('applications_cache')
      const cacheTime = wx.getStorageSync('applications_cache_time')
      
      // 如果缓存存在且在 24 小时内，返回缓存
      if (cached && cacheTime && (Date.now() - cacheTime < 24 * 60 * 60 * 1000)) {
        console.log('✅ 使用缓存数据（网络异常）')
        return {
          list: cached,
          total: cached.length,
          page,
          pageSize
        }
      }
    } catch (e) {
      console.warn('读取缓存失败:', e)
    }
    
    return { list: [], total: 0, page: 1, pageSize: 10 }
  }
}

/**
 * 获取单个申请详情
 */
export async function getApplicationByIdApi(id: string): Promise<Application | null> {
  try {
    return await request(`/visitors/${id}`, 'GET')
  } catch (error) {
    console.error('获取申请详情失败:', error)
    return null
  }
}

/**
 * 提交访客申请到后端 API
 */
export async function submitApplicationApi(
  data: Omit<Application, 'id' | 'status' | 'submitTime'>
): Promise<{id: string, submitTime: string}> {
  try {
    const openid = await getCurrentOpenId()
    const result = await request<{id: string, submitTime: string}>('/visitors', 'POST', {
      openid,
      ...data
    })
    return result
  } catch (error) {
    console.error('提交申请失败:', error)
    throw error
  }
}

// ==================== 保留原有 Mock 函数用于降级兼容 ====================

export function getApplications(): Application[] {
  return wx.getStorageSync(APP_KEY) || []
}

export function getApplicationById(id: string): Application | undefined {
  return getApplications().find(a => a.id === id)
}

export function submitApplication(
  data: Omit<Application, 'id' | 'status' | 'submitTime'>
): Application {
  const apps = getApplications()
  const newApp: Application = {
    ...data,
    id: Date.now().toString(),
    status: 'pending',
    submitTime: new Date().toISOString(),
  }
  apps.unshift(newApp)
  wx.setStorageSync(APP_KEY, apps)
  clearDraft()
  return newApp
}

export function getDraft(): Partial<Application> | null {
  return wx.getStorageSync(DRAFT_KEY) || null
}

export function saveDraft(data: Partial<Application>): void {
  wx.setStorageSync(DRAFT_KEY, data)
}

export function clearDraft(): void {
  wx.removeStorageSync(DRAFT_KEY)
}

/** 仅用于演示：模拟审批结果 */
export function mockUpdateStatus(
  id: string,
  status: 'approved' | 'rejected',
  rejectReason?: string
): void {
  const apps = getApplications()
  const idx = apps.findIndex(a => a.id === id)
  if (idx !== -1) {
    apps[idx].status = status
    if (rejectReason) apps[idx].rejectReason = rejectReason
    wx.setStorageSync(APP_KEY, apps)
  }
}

export function getToday(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export function formatDateTime(date: string | undefined, time: string | undefined): string {
  if (!date || !time) return ''
  // 如果 time 已经包含日期部分，只取时间
  const timePart = time.includes('T') ? time.split('T')[1].substring(0, 5) : time.substring(0, 5)
  return `${date} ${timePart}`
}

/**
 * 格式化提交时间（ISO 字符串 → 本地时间）
 */
export function formatSubmitTime(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 格式化来访时间
 */
export function formatVisitTime(app: Application): string {
  // 优先使用 visitDate/visitTime，否则使用 visitStartDate/visitStartTime
  if (app.visitDate) {
    if (app.visitTime && app.visitTime.trim()) {
      // 从 visitDate 中提取日期部分，并转换时区
      let datePart = app.visitDate
      if (app.visitDate.includes('T')) {
        // ISO 格式，需要转换时区
        const utcDate = new Date(app.visitDate)
        const year = utcDate.getFullYear()
        const month = String(utcDate.getMonth() + 1).padStart(2, '0')
        const day = String(utcDate.getDate()).padStart(2, '0')
        datePart = `${year}-${month}-${day}`
      }
      // 从 visitTime 中提取时间部分（HH:mm）
      const timePart = app.visitTime.substring(0, 5)
      return `${datePart} ${timePart}`
    }
    // 如果只有 visitDate，提取日期部分
    if (app.visitDate.includes('T')) {
      const utcDate = new Date(app.visitDate)
      const year = utcDate.getFullYear()
      const month = String(utcDate.getMonth() + 1).padStart(2, '0')
      const day = String(utcDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return app.visitDate
  }
  return formatDateTime(app.visitStartDate, app.visitStartTime)
}

/**
 * 格式化结束时间
 */
export function formatEndTime(app: Application): string {
  // 优先使用 endDate/endTime，否则使用开始时间加 2 小时
  if (app.endDate && app.endTime) {
    // 从 endDate 中提取日期部分，并转换时区
    let datePart = app.endDate
    if (app.endDate.includes('T')) {
      // ISO 格式，需要转换时区
      const utcDate = new Date(app.endDate)
      const year = utcDate.getFullYear()
      const month = String(utcDate.getMonth() + 1).padStart(2, '0')
      const day = String(utcDate.getDate()).padStart(2, '0')
      datePart = `${year}-${month}-${day}`
    }
    // 从 endTime 中提取时间部分（HH:mm）
    const timePart = app.endTime.substring(0, 5)
    return `${datePart} ${timePart}`
  }
  
  // 如果没有结束时间，使用开始时间加 2 小时
  const startDate = app.visitDate || app.visitStartDate
  const startTime = app.visitTime || app.visitStartTime
  
  // 如果连开始时间也没有，返回空字符串
  if (!startTime) {
    return ''
  }
  
  const [hours, minutes] = startTime.split(':').map(Number)
  const endHours = String((hours + 2) % 24).padStart(2, '0')
  
  // 处理 startDate 可能是 ISO 格式，并转换时区
  let datePart = startDate
  if (startDate && startDate.includes('T')) {
    const utcDate = new Date(startDate)
    const year = utcDate.getFullYear()
    const month = String(utcDate.getMonth() + 1).padStart(2, '0')
    const day = String(utcDate.getDate()).padStart(2, '0')
    datePart = `${year}-${month}-${day}`
  }
  return `${datePart} ${endHours}:${String(minutes).padStart(2, '0')}`
}
