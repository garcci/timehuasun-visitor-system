// pages/index/index.ts
import { isAgreementSigned, getApplications } from '../../utils/api'

Component({
  data: {
    pendingCount: 0,
  },
  pageLifetimes: {
    show() {
      const apps = getApplications()
      this.setData({ pendingCount: apps.filter(a => a.status === 'pending').length })
    },
  },
  methods: {
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
  },
})
