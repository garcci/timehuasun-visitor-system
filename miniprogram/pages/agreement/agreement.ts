// pages/agreement/agreement.ts
const COUNTDOWN = 5

Page({
  data: {
    countdown: COUNTDOWN,
    canSign: false,
    signed: false,
    progressWidth: 0,
    btnClass: 'btn-sign-disabled',
    btnText: '请阅读协议（5s）',
  },

  onLoad() {
    console.log('agreement onLoad')
  },

  onShow() {
    console.log('agreement onShow')
  },

  onReady() {
    console.log('agreement onReady')
    this.startCountdown()
  },

  startCountdown() {
    let count = COUNTDOWN
    this.updateProgress(count)

    const timer = setInterval(() => {
      count--
      this.updateProgress(count)
      
      if (count <= 0) {
        clearInterval(timer)
        this.setData({ canSign: true, btnClass: '', btnText: '同意签署' })
      }
    }, 1000)
  },

  updateProgress(count: number) {
    const width = ((COUNTDOWN - count) / COUNTDOWN) * 100
    this.setData({ 
      countdown: count,
      progressWidth: width,
      btnText: `请阅读协议（${count}s）`
    })
  },

  onSign() {
    if (!this.data.canSign) {
      wx.showToast({ title: `请阅读完协议（${this.data.countdown}s）`, icon: 'none' })
      return
    }

    this.setData({ signed: true })
    wx.showToast({ title: '签署成功', icon: 'success', duration: 1200 })

    setTimeout(() => {
      wx.navigateTo({ url: '/pages/apply/apply' })
    }, 1200)
  },
})
