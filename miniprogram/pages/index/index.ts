// pages/index/index.ts
import { isAgreementSigned, getApplications } from '../../utils/api'

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
    console.log('onApply clicked, isAgreementSigned:', isAgreementSigned())
    if (isAgreementSigned()) {
      wx.navigateTo({ url: '/pages/apply/apply?agreed=true' })
    } else {
      wx.navigateTo({ url: '/pages/agreement/agreement' })
    }
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
