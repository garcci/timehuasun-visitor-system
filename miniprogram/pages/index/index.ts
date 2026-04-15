// pages/index/index.ts
import { getApplications, isPrivacyAgreed, agreePrivacy, isTermsAgreed, agreeTerms } from '../../utils/api'

Page({
  data: {
    pendingCount: 0,
    showAgreementModal: false,
    agreedPrivacy: false,
    agreedTerms: false,
  },

  onShow() {
    const apps = getApplications()
    this.setData({ pendingCount: apps.filter((a: any) => a.status === 'pending').length })
    
    // 检查是否已同意协议
    if (!isPrivacyAgreed() || !isTermsAgreed()) {
      this.setData({ showAgreementModal: true })
    }
  },

  onApply() {
    // 直接跳转保密协议页面，签署后再到申请页面
    wx.navigateTo({ url: '/pages/agreement/agreement' })
  },

  onHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  onTerms() {
    wx.navigateTo({ url: '/pages/terms/terms' })
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  // 协议弹窗相关
  onPrivacyCheck(e: any) {
    this.setData({ agreedPrivacy: e.detail.value.length > 0 })
  },

  onTermsCheck(e: any) {
    this.setData({ agreedTerms: e.detail.value.length > 0 })
  },

  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  onViewTerms() {
    wx.navigateTo({ url: '/pages/terms/terms' })
  },

  onAgree() {
    const { agreedPrivacy, agreedTerms } = this.data
    if (!agreedPrivacy || !agreedTerms) {
      wx.showToast({ title: '请阅读并同意协议', icon: 'none' })
      return
    }
    agreePrivacy()
    agreeTerms()
    this.setData({ showAgreementModal: false })
    wx.showToast({ title: '已同意', icon: 'success', duration: 1200 })
  },
})
