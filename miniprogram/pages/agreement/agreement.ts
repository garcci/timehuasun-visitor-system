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
  _isCountdownStarted: false,

  onLoad() {
    // 已签署直接跳转
    if (isAgreementSigned()) {
      wx.reLaunch({ url: '/pages/apply/apply' })
      return
    }
    this.resetState()
  },

  onShow() {
    if (isAgreementSigned()) return
    
    // 只启动一次倒计时
    if (!this._isCountdownStarted && !this.data.signed) {
      this._isCountdownStarted = true
      this.startCountdown()
    }
  },

  onUnload() {
    this.clearTimer()
    this._isCountdownStarted = false
  },

  clearTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  resetState() {
    this._isCountdownStarted = false
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
