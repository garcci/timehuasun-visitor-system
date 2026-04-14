// utils/error-handler.ts - 统一错误处理

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK',           // 网络错误
  TIMEOUT = 'TIMEOUT',           // 超时
  AUTH = 'AUTH',                 // 认证错误
  VALIDATION = 'VALIDATION',     // 验证错误
  SERVER = 'SERVER',             // 服务器错误
  UNKNOWN = 'UNKNOWN'            // 未知错误
}

/**
 * 错误信息映射
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
  [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorType.AUTH]: '登录已过期，请重新登录',
  [ErrorType.VALIDATION]: '输入信息有误，请检查后重试',
  [ErrorType.SERVER]: '服务器异常，请稍后重试',
  [ErrorType.UNKNOWN]: '操作失败，请稍后重试'
}

/**
 * 判断错误类型
 */
export function getErrorType(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN
  
  // 网络错误
  if (error.errMsg?.includes('request:fail') || 
      error.errMsg?.includes('net::ERR') ||
      error.code === 'NETWORK_ERROR') {
    return ErrorType.NETWORK
  }
  
  // 超时
  if (error.errMsg?.includes('timeout') || 
      error.code === 'ECONNABORTED' ||
      error.statusCode === 408) {
    return ErrorType.TIMEOUT
  }
  
  // 认证错误
  if (error.statusCode === 401 || 
      error.statusCode === 403 ||
      error.message?.includes('unauthorized')) {
    return ErrorType.AUTH
  }
  
  // 验证错误
  if (error.statusCode === 400 || 
      error.statusCode === 422 ||
      error.message?.includes('validation')) {
    return ErrorType.VALIDATION
  }
  
  // 服务器错误
  if (error.statusCode >= 500) {
    return ErrorType.SERVER
  }
  
  return ErrorType.UNKNOWN
}

/**
 * 获取友好的错误提示
 */
export function getErrorMessage(error: any): string {
  const errorType = getErrorType(error)
  
  // 如果有自定义消息，优先使用
  if (error.message && typeof error.message === 'string') {
    return error.message
  }
  
  // 如果有服务端返回的消息
  if (error.data?.message) {
    return error.data.message
  }
  
  // 使用默认消息
  return ERROR_MESSAGES[errorType]
}

/**
 * 显示错误提示
 */
export function showError(error: any, options?: {
  title?: string
  duration?: number
  showToast?: boolean
}) {
  const {
    title = getErrorMessage(error),
    duration = 2000,
    showToast = true
  } = options || {}
  
  console.error('❌ 错误:', error)
  
  if (showToast) {
    wx.showToast({
      title,
      icon: 'none',
      duration
    })
  }
  
  // 认证错误，跳转到登录页
  if (getErrorType(error) === ErrorType.AUTH) {
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/index/index' })
    }, duration)
  }
}

/**
 * 安全执行异步函数
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: any) => void
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    console.error('safeExecute 捕获错误:', error)
    
    if (errorHandler) {
      errorHandler(error)
    } else {
      showError(error)
    }
    
    return null
  }
}

/**
 * 带重试的请求
 */
export async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // 最后一次不等待
      if (i < maxRetries) {
        console.log(`⏳ 第 ${i + 1} 次重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

/**
 * 初始化全局错误处理
 */
export function initErrorHandler(): void {
  // 监听全局错误
  wx.onError((error) => {
    console.error('🚨 全局错误:', error)
  })
  
  // 监听 Promise 未捕获错误
  wx.onUnhandledRejection((res) => {
    console.error('🚨 未处理的 Promise 错误:', res.reason)
  })
}
