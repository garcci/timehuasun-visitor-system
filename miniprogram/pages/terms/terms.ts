// pages/terms/terms.ts
import { agreeTerms } from '../../utils/api'

Page({
  onAgree() {
    agreeTerms()
    wx.showToast({ title: '已同意', icon: 'success', duration: 1200 })
    setTimeout(() => {
      wx.navigateBack()
    }, 1200)
  }
})
