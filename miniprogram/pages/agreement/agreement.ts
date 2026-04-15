// pages/agreement/agreement.ts
import { signAgreement } from '../../utils/api'

const COUNTDOWN = 5

Component({
  data: {
    countdown: COUNTDOWN,
    canSign: false,
    signed: false,
    COUNTDOWN, // 暴露给模板用于进度条计算
    agreedPrivacy: false,
    agreedTerms: false,
    canSignAll: false,
  },
  lifetimes: {
    detached() {
      if ((this as any)._timer) clearInterval((this as any)._timer)
    },
  },
  pageLifetimes: {
    show() {
      this.startCountdown()
    },
    hide() {
      if ((this as any)._timer) clearInterval((this as any)._timer)
    },
  },
  methods: {
    startCountdown() {
      this.setData({ countdown: COUNTDOWN, canSign: false, signed: false, canSignAll: false })
      if ((this as any)._timer) clearInterval((this as any)._timer)
      ;(this as any)._timer = setInterval(() => {
        const next = this.data.countdown - 1
        if (next <= 0) {
          clearInterval((this as any)._timer)
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
      this.setData({
        agreedPrivacy: e.detail.value.length > 0,
        canSignAll: this.data.canSign && e.detail.value.length > 0 && this.data.agreedTerms
      })
    },
    onTermsCheck(e: any) {
      this.setData({
        agreedTerms: e.detail.value.length > 0,
        canSignAll: this.data.canSign && this.data.agreedPrivacy && e.detail.value.length > 0
      })
    },
    onViewPrivacy() {
      wx.navigateTo({ url: '/pages/privacy/privacy' })
    },
    onViewTerms() {
      wx.navigateTo({ url: '/pages/terms/terms' })
    },
    onSign() {
      if (!this.data.canSignAll) return
      signAgreement()
      this.setData({ signed: true })
      wx.showToast({ title: '签署成功', icon: 'success', duration: 1200 })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/apply/apply?agreed=true' })
      }, 1200)
    },
  },
})
