// pages/agreement/agreement.ts
import { signAgreement, isAgreementSigned } from '../../utils/api'

const COUNTDOWN = 5

Page({
  data: {
    countdown: COUNTDOWN,
    canSign: false,
    signed: false,
    COUNTDOWN,
    agreedPrivacy: false,
    agreedTerms: false,
    canSignAll: false,
  },

  _timer: null as number | null,

  onLoad() {
    // 已签署直接跳转
    if (isAgreementSigned()) {
      wx.reLaunch({ url: '/pages/apply/apply' })
      return
    }
    // 初始化状态
    this.resetState()
  },

  onShow() {
    // 已签署不处理
    if (isAgreementSigned()) return
    
    // 首次进入或未启动倒计时时启动（倒计时进行中或已结束都不重启）
    if (!this._timer && !this.data.signed && this.data.countdown === COUNTDOWN) {
      this.startCountdown()
    }
  },

  onHide() {
    this.clearTimer()
  },

  onUnload() {
    this.clearTimer()
  },

  clearTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  resetState() {
    this.setData({
      countdown: COUNTDOWN,
      canSign: false,
      signed: false,
      canSignAll: false,
      agreedPrivacy: false,
      agreedTerms: false,
    })
  },

  startCountdown() {
    this.clearTimer()
    this.resetState()
    
    this._timer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        this.clearTimer()
        this.setData({ canSign: true })
        this.updateCanSignAll()
      } else {
        this.setData({ countdown: next })
      }
    }, 1000)
  },

  updateCanSignAll() {
    this.setData({
      canSignAll: this.data.canSign && this.data.agreedPrivacy && this.data.agreedTerms
    })
  },

  onPrivacyCheck(e: any) {
    const checked = e.detail.value.length > 0
    this.setData({ agreedPrivacy: checked })
    this.updateCanSignAll()
  },

  onTermsCheck(e: any) {
    const checked = e.detail.value.length > 0
    this.setData({ agreedTerms: checked })
    this.updateCanSignAll()
  },

  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  onViewTerms() {
    wx.navigateTo({ url: '/pages/terms/terms' })
  },

  onSign() {
    if (!this.data.canSignAll) {
      if (!this.data.canSign) {
        wx.showToast({ title: `请阅读完协议（${this.data.countdown}s）`, icon: 'none' })
      } else if (!this.data.agreedPrivacy) {
        wx.showToast({ title: '请勾选同意隐私政策', icon: 'none' })
      } else if (!this.data.agreedTerms) {
        wx.showToast({ title: '请勾选同意用户协议', icon: 'none' })
      }
      return
    }
    
    this.clearTimer()
    signAgreement()
    this.setData({ signed: true })
    wx.showToast({ title: '签署成功', icon: 'success', duration: 1200 })
    
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/apply/apply' })
    }, 1200)
  },
})
