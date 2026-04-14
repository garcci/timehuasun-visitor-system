// utils/network.ts - 网络状态监控

let networkChangeCallback: ((isConnected: boolean, networkType: string) => void) | null = null

/**
 * 初始化网络监听
 */
export function initNetworkMonitor(
  callback: (isConnected: boolean, networkType: string) => void
): void {
  networkChangeCallback = callback
  
  // 获取当前网络状态
  wx.getNetworkType({
    success: (res) => {
      const isConnected = res.networkType !== 'none'
      callback(isConnected, res.networkType)
    }
  })
  
  // 监听网络变化
  wx.onNetworkStatusChange((res) => {
    if (networkChangeCallback) {
      networkChangeCallback(res.isConnected, res.networkType)
    }
    
    // 网络断开提示
    if (!res.isConnected) {
      wx.showToast({
        title: '网络已断开',
        icon: 'none',
        duration: 2000
      })
    } else if (res.networkType === 'wifi') {
      wx.showToast({
        title: '已连接WiFi',
        icon: 'success',
        duration: 1500
      })
    }
  })
}

/**
 * 检查网络是否可用
 */
export function checkNetwork(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none')
      },
      fail: () => resolve(false)
    })
  })
}
