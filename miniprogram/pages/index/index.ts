// pages/index/index.ts
import { isPrivacyAgreed, getApplications } from '../../utils/api'

Page({
  data: {
    pendingCount: 0,
  },

  onShow() {
    console.log('index onShow')
    const apps = getApplications()
    this.setData({ pendingCount: apps.filter((a: any) => a.status === 'pending').length })
  },

  onApply() {
    console.log('onApply clicked, isPrivacyAgreed:', isPrivacyAgreed())
    // 隐私政策已同意则直接跳转申请页面（保密协议在申请页面签署）
    wx.navigateTo({ url: '/pages/apply/apply' })
  },

  onHistory() {
    console.log('onHistory clicked')
    wx.navigateTo({ url: '/pages/history/history' })
  },

  onTerms() {
    console.log('onTerms clicked')
    wx.navigateTo({ url: '/pages/terms/terms' })
  },

  onPrivacy() {
    console.log('onPrivacy clicked')
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },
})
