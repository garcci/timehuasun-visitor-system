// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 模拟版本中注释掉微信登录，避免网络请求失败
    // wx.login({
    //   success: res => {
    //     // 发送 res.code 到后台换取 openId, sessionKey, unionId
    //     console.log('wx.login code:', res.code)
    //   },
    //   fail: err => {
    //     console.warn('wx.login failed (expected in demo):', err)
    //   },
    // })
  },
})
