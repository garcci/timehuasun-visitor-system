// pages/status/status.ts
import { getApplicationById, getApplicationByIdApi, mockUpdateStatus, formatDateTime, formatSubmitTime } from '../../utils/api'
import { maskIdCard, maskPhone, maskName } from '../../utils/mask'
import type { Application } from '../../utils/api'

const STATUS_LABEL: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '未通过',
}

Component({
  data: {
    app: null as Application | null,
    statusLabel: '',
    visitTime: '',
    endTime: '',
    submitTimeFormatted: '',
    // 脱敏后的数据
    maskedName: '',
    maskedIdCard: '',
    maskedPhone: '',
  },
  pageLifetimes: {
    show() {
      this.loadApp()
    },
  },
  methods: {
    async loadApp(showLoading = true) {
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      const id = (page as any).options?.id as string
      if (!id) return
      
      if (showLoading) {
        wx.showLoading({ title: '加载中...' })
      }
      
      try {
        // 优先从后端 API 获取
        const app = await getApplicationByIdApi(id)
        
        if (!app) {
          if (showLoading) {
            wx.hideLoading()
          }
          wx.showToast({ title: '申请不存在', icon: 'none' })
          return
        }
        
        if (showLoading) {
          wx.hideLoading()
        }
        
        // 格式化来访时间
        let visitTime = ''
        if (app.visitDate && app.visitTime) {
          // 从 visitDate 中提取日期部分，并转换时区
          let datePart = app.visitDate
          if (app.visitDate.includes('T')) {
            // ISO 格式，需要转换时区
            const utcDate = new Date(app.visitDate)
            // 转换为本地时区（中国时区 UTC+8）
            const year = utcDate.getFullYear()
            const month = String(utcDate.getMonth() + 1).padStart(2, '0')
            const day = String(utcDate.getDate()).padStart(2, '0')
            datePart = `${year}-${month}-${day}`
          }
          // 从 visitTime 中提取时间部分（HH:mm）
          const timePart = app.visitTime.substring(0, 5)
          visitTime = `${datePart} ${timePart}`
        } else if (app.visitStartDate || app.visitStartTime) {
          visitTime = formatDateTime(app.visitStartDate, app.visitStartTime)
        }
        
        // 格式化结束时间
        let endTime = ''
        if (app.endDate && app.endTime) {
          // 从 endDate 中提取日期部分，并转换时区
          let datePart = app.endDate
          if (app.endDate.includes('T')) {
            // ISO 格式，需要转换时区
            const utcDate = new Date(app.endDate)
            // 转换为本地时区（中国时区 UTC+8）
            const year = utcDate.getFullYear()
            const month = String(utcDate.getMonth() + 1).padStart(2, '0')
            const day = String(utcDate.getDate()).padStart(2, '0')
            datePart = `${year}-${month}-${day}`
          }
          // 从 endTime 中提取时间部分（HH:mm）
          const timePart = app.endTime.substring(0, 5)
          endTime = `${datePart} ${timePart}`
        } else if (app.visitStartDate || app.visitStartTime) {
          endTime = formatDateTime(app.visitStartDate, app.visitStartTime)
        }
        
        // 格式化提交时间
        const submitTimeFormatted = formatSubmitTime(app.submitTime)
        
        // 脱敏处理 - 主申请人
        const maskedName = maskName(app.name || '')
        const maskedIdCard = maskIdCard(app.idCard || '')
        const maskedPhone = maskPhone(app.phone || '')
        
        // 脱敏处理 - 随行人员
        const companionsWithMask = (app.companions || []).map(companion => ({
          ...companion,
          maskedName: maskName(companion.name || ''),
          maskedIdCard: maskIdCard(companion.idCard || ''),
          maskedPhone: companion.phone ? maskPhone(companion.phone) : ''
        }))
        
        this.setData(
          { 
            app: { ...app, companions: companionsWithMask }, // 使用脱敏后的随行人员数据
            statusLabel: STATUS_LABEL[app.status] || app.status, 
            visitTime, 
            endTime, 
            submitTimeFormatted,
            maskedName,
            maskedIdCard,
            maskedPhone
          },
          () => {
            if (app.status === 'approved') {
              wx.nextTick(() => this.drawQRCode())
            }
          }
        )
      } catch (error) {
        if (showLoading) {
          wx.hideLoading()
        }
        console.error('加载申请详情失败:', error)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    drawQRCode() {
      const app = this.data.app
      if (!app) return
      // 二维码内容：凭证核心字段
      const qrText = [
        `ID:${app.id}`,
        `姓名:${app.name}`,
        `证件:${app.idCard}`,
        `时间:${this.data.visitTime}`,
      ].join('|')
      // @ts-ignore
      const QRCode = require('../../utils/qrcode')
      new QRCode({
        canvasId: 'qrcode-canvas',
        text: qrText,
        width: 240,
        height: 240,
        colorDark: '#1677ff',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
        componentContext: this,
      })
    },
    onMockApprove() {
      const app = this.data.app
      if (!app) return
      wx.showModal({
        title: '模拟审批',
        content: '选择审批结果',
        confirmText: '通过',
        cancelText: '拒绝',
        success: (res) => {
          if (res.confirm) {
            mockUpdateStatus(app.id, 'approved')
          } else if (res.cancel) {
            mockUpdateStatus(app.id, 'rejected', '材料不符合要求')
          }
          this.loadApp()
        },
      })
    },
    onGoHome() {
      wx.reLaunch({ url: '/pages/index/index' })
    },
    onGoApply() {
      wx.navigateTo({ url: '/pages/apply/apply' })
    },
    
    /**
     * 下拉刷新
     */
    onPullDownRefresh() {
      console.log('🔄 下拉刷新')
      // 刷新时不显示 loading，因为下拉动画已经提供了视觉反馈
      this.loadApp(false).then(() => {
        // 停止下拉刷新动画
        wx.stopPullDownRefresh()
        console.log('✅ 刷新完成')
      }).catch((err) => {
        console.error('❌ 刷新失败:', err)
        wx.stopPullDownRefresh()
        wx.showToast({
          title: '刷新失败',
          icon: 'none'
        })
      })
    },
  },
})
