// pages/agreement/agreement.ts
import { signAgreement, isAgreementSigned, agreePrivacy, isPrivacyAgreed } from '../../utils/api'

const COUNTDOWN = 5

Page({
  data: {
    countdown: COUNTDOWN,
    canSign: false,
    signed: false,
    agreedPrivacy: false,
    agreedTerms: false,
    canSignAll: false,
    progressWidth: 0,
    btnClass: 'btn-sign-disabled',
    btnText: '请阅读协议（5s）',
  },

  onLoad() {
    // 页面加载时不跳转，避免白屏
  },

  onShow() {
    // 保密协议每次都要签署，不跳转
    // 只检查倒计时是否正常
  },

  onReady() {
    // 启动倒计时
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
        this.setData({ canSign: true })
        this.updateBtnState()
      }
    }, 1000)
  },

  updateProgress(count: number) {
    const width = ((COUNTDOWN - count) / COUNTDOWN) * 100
    this.setData({ 
      countdown: count,
      progressWidth: width,
      btnText: count > 0 ? `请阅读协议（${count}s）` : '请勾选同意隐私政策'
    })
  },

  updateBtnState() {
    const { canSign, agreedPrivacy, agreedTerms } = this.data
    const canSignAll = canSign && agreedPrivacy && agreedTerms
    
    let btnClass = 'btn-sign-disabled'
    let btnText = '请阅读协议（0s）'
    
    if (this.data.signed) {
      btnClass = 'btn-signed'
      btnText = '✓ 已签署'
    } else if (canSignAll) {
      btnClass = ''
      btnText = '我已阅读，同意签署'
    } else if (!canSign) {
      btnText = `请阅读协议（${this.data.countdown}s）`
    } else if (!agreedPrivacy) {
      btnText = '请勾选同意隐私政策'
    } else if (!agreedTerms) {
      btnText = '请勾选同意用户协议'
    }
    
    this.setData({ 
      canSignAll,
      btnClass,
      btnText
    })
  },

  onPrivacyCheck(e: any) {
    const checked = e.detail.value.length > 0
    this.setData({ agreedPrivacy: checked })
    // 隐私政策同意时缓存
    if (checked) {
      agreePrivacy()
    }
    this.updateBtnState()
  },

  onTermsCheck(e: any) {
    this.setData({ agreedTerms: e.detail.value.length > 0 })
    this.updateBtnState()
  },

  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  onViewTerms() {
    wx.navigateTo({ url: '/pages/terms/terms' })
  },

  onSign() {
    if (!this.data.canSignAll) {
      wx.showToast({ title: this.data.btnText, icon: 'none' })
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
