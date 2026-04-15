// pages/index/index.ts
import { isAgreementSigned, getApplications } from '../../utils/api'

Page({
  data: {
    pendingCount: 0,
  },

  onShow() {
    const apps = getApplications()
    this.setData({ pendingCount: apps.filter((a: any) => a.status === 'pending').length })
  },

  onApply() {
    if (isAgreementSigned()) {
      wx.navigateTo({ url: '/pages/apply/apply' })
    } else {
      wx.navigateTo({ url: '/pages/agreement/agreement' })
    }
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
})
