// utils/perf.ts - 性能监控

/**
 * 页面性能监控
 */
export function reportPagePerformance(pageName: string): void {
  const perf = (wx as any).getPerformance && (wx as any).getPerformance()
  if (!perf) return
  
  const timing = perf.getEntriesByType && perf.getEntriesByType('navigation')[0]
  if (!timing) return
  
  const metrics = {
    page: pageName,
    // DNS 解析时间
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    // TCP 连接时间
    tcp: timing.connectEnd - timing.connectStart,
    // 首字节时间
    ttfb: timing.responseStart - timing.requestStart,
    // DOM 解析时间
    domParse: timing.domInteractive - timing.responseEnd,
    // 页面完全加载时间
    loadTime: timing.loadEventEnd - timing.startTime
  }
  
  console.log(`📊 ${pageName} 性能数据:`, metrics)
  
  // 慢页面警告
  if (metrics.loadTime > 3000) {
    console.warn(`⚠️ ${pageName} 加载较慢: ${metrics.loadTime}ms`)
  }
}

/**
 * 上报自定义性能指标
 */
export function reportCustomMetric(name: string, value: number): void {
  console.log(`📊 性能指标 [${name}]: ${value}ms`)
}

/**
 * 监控 API 请求性能
 */
export function monitorApiRequest<T>(
  apiName: string,
  promise: Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  return promise
    .then((result) => {
      const duration = Date.now() - startTime
      console.log(`📊 API [${apiName}]: ${duration}ms`)
      
      // 慢请求警告
      if (duration > 2000) {
        console.warn(`⚠️ 慢请求 [${apiName}]: ${duration}ms`)
      }
      
      return result
    })
    .catch((error) => {
      const duration = Date.now() - startTime
      console.error(`❌ API [${apiName}] 失败: ${duration}ms`, error)
      throw error
    })
}

/**
 * 内存使用监控（仅开发环境）
 */
export function logMemoryUsage(): void {
  const memInfo = (wx as any).getMemoryInfo && (wx as any).getMemoryInfo()
  if (memInfo) {
    console.log('💾 内存使用情况:', {
      used: `${(memInfo.used / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memInfo.total / 1024 / 1024).toFixed(2)} MB`
    })
  }
}
