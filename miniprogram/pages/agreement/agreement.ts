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
    // 页面加载时检查是否已签署
    if (isAgreementSigned()) {
      wx.reLaunch({ url: '/pages/apply/apply' })
      return
    }
  },

  onShow() {
    // 检查是否已签署过协议
    if (isAgreementSigned()) {
      return
    }
    // 确保倒计时正常运行
    if (!this.data.canSign && !this.data.signed && this.data.countdown === COUNTDOWN) {
      this.startCountdown()
    }
  },

  onReady() {
    // 页面初次渲染完成后启动倒计时
    if (!isAgreementSigned() && !this.data.signed && this.data.countdown === COUNTDOWN) {
      this.startCountdown()
    }
  },

  onHide() {
    if ((this as any)._timer) {
      clearInterval((this as any)._timer)
      ;(this as any)._timer = null
    }
  },

  onUnload() {
    if ((this as any)._timer) {
      clearInterval((this as any)._timer)
      ;(this as any)._timer = null
    }
  },

  startCountdown() {
    // 清理旧定时器
    if ((this as any)._timer) {
      clearInterval((this as any)._timer)
      ;(this as any)._timer = null
    }
    
    // 重置状态
    this.setData({ 
      countdown: COUNTDOWN, 
      canSign: false, 
      signed: false, 
      canSignAll: false, 
      agreedPrivacy: false, 
      agreedTerms: false 
    })
    
    ;(this as any)._timer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        clearInterval((this as any)._timer)
        ;(this as any)._timer = null
        this.updateCanSignAll()
      } else {
        this.setData({ countdown: next })
      }
    }, 1000)
  },

  updateCanSignAll() {
    this.setData({
      canSign: true,
      canSignAll: this.data.agreedPrivacy && this.data.agreedTerms
    })
  },

  onPrivacyCheck(e: any) {
    const checked = e.detail.value.length > 0
    this.setData({
      agreedPrivacy: checked,
      canSignAll: this.data.canSign && checked && this.data.agreedTerms
    })
  },

  onTermsCheck(e: any) {
    const checked = e.detail.value.length > 0
    this.setData({
      agreedTerms: checked,
      canSignAll: this.data.canSign && this.data.agreedPrivacy && checked
    })
  },

  onViewPrivacy() {
    this.setData({ agreedPrivacy: true })
    this.updateCanSignAll()
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  onViewTerms() {
    this.setData({ agreedTerms: true })
    this.updateCanSignAll()
    wx.navigateTo({ url: '/pages/terms/terms' })
  },

  onSign() {
    if (!this.data.canSignAll) {
      if (!this.data.canSign) {
        wx.showToast({ title: '请阅读完协议', icon: 'none' })
      } else if (!this.data.agreedPrivacy) {
        wx.showToast({ title: '请同意隐私政策', icon: 'none' })
      } else if (!this.data.agreedTerms) {
        wx.showToast({ title: '请同意用户协议', icon: 'none' })
      }
      return
    }
    
    // 清理定时器
    if ((this as any)._timer) {
      clearInterval((this as any)._timer)
      ;(this as any)._timer = null
    }
    
    signAgreement()
    this.setData({ signed: true })
    wx.showToast({ title: '签署成功', icon: 'success', duration: 1200 })
    
    setTimeout(() => {
      wx.reLaunch({ url: '/pages/apply/apply?agreed=true' })
    }, 1200)
  },
})
