// app.ts
import { initErrorHandler } from './utils/error-handler'
import { initNetworkMonitor } from './utils/network'
import { isHarmonyOS, getPlatform } from './utils/api'

App<IAppOption>({
  globalData: {
    isConnected: true,
    networkType: 'unknown',
    isHarmony: false,
    platform: '',
  },
  onLaunch() {
    // 检测平台
    const platform = getPlatform()
    ;(this.globalData as any).isHarmony = platform.isHarmony
    ;(this.globalData as any).platform = platform.platform
    if (platform.isHarmony) {
      console.log('🚀 运行在 HarmonyOS 平台')
    }
    
    // 初始化全局错误处理
    initErrorHandler()
    
    // 初始化网络监听
    initNetworkMonitor((isConnected, networkType) => {
      this.globalData.isConnected = isConnected
      this.globalData.networkType = networkType
    })
    
    // 检查更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate()
                }
              }
            })
          })
        }
      })
    }
  },
})
