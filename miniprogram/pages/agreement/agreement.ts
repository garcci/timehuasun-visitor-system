// pages/agreement/agreement.ts
import { signAgreement } from '../../utils/api'

const COUNTDOWN = 5

Component({
  data: {
    countdown: COUNTDOWN,
    canSign: false,
    signed: false,
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
      this.setData({ countdown: COUNTDOWN, canSign: false, signed: false })
      if ((this as any)._timer) clearInterval((this as any)._timer)
      ;(this as any)._timer = setInterval(() => {
        const next = this.data.countdown - 1
        if (next <= 0) {
          clearInterval((this as any)._timer)
          this.setData({ countdown: 0, canSign: true })
        } else {
          this.setData({ countdown: next })
        }
      }, 1000)
    },
    onSign() {
      if (!this.data.canSign) return
      signAgreement()
      this.setData({ signed: true })
      wx.showToast({ title: '签署成功', icon: 'success', duration: 1200 })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/apply/apply?agreed=true' })
      }, 1200)
    },
  },
})
