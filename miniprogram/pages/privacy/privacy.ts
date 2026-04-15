// pages/privacy/privacy.ts
import { agreePrivacy } from '../../utils/api'

Page({
  onAgree() {
    agreePrivacy()
    wx.showToast({ title: '已同意', icon: 'success', duration: 1200 })
    setTimeout(() => {
      wx.navigateBack()
    }, 1200)
  }
})
