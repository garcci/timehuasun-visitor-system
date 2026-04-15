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

  onLoad() {
    if (isAgreementSigned()) {
      wx.reLaunch({ url: '/pages/apply/apply' })
      return
    }
  },

  onReady() {
    if (isAgreementSigned()) return
    this.startCountdown()
  },

  startCountdown() {
    let count = COUNTDOWN
    this.setData({ countdown: count, canSign: false })

    const timer = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(timer)
        this.setData({ canSign: true })
        this.updateCanSignAll()
      } else {
        this.setData({ countdown: count })
      }
    }, 1000)
  },

  updateCanSignAll() {
    this.setData({
      canSignAll: this.data.canSign && this.data.agreedPrivacy && this.data.agreedTerms
    })
  },

  onPrivacyCheck(e: any) {
    this.setData({ agreedPrivacy: e.detail.value.length > 0 })
    this.updateCanSignAll()
  },

  onTermsCheck(e: any) {
    this.setData({ agreedTerms: e.detail.value.length > 0 })
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
      } else {
        wx.showToast({ title: '请勾选同意用户协议', icon: 'none' })
      }
      return
    }

    signAgreement()
    this.setData({ signed: true })
    wx.showToast({ title: '签署成功', icon: 'success', duration: 1200 })

    setTimeout(() => {
      wx.reLaunch({ url: '/pages/apply/apply' })
    }, 1200)
  },
})
