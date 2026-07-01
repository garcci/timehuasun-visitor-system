// pages/status/status.ts
import { getApplicationByIdApi, mockUpdateStatus, formatSubmitTime, formatVisitTime, formatEndTime } from '../../utils/api'
import { maskIdCard, maskPhone, maskName } from '../../utils/mask'
import type { Application } from '../../utils/api'

const STATUS_LABEL: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '未通过',
}

// 状态流程配置
const STATUS_FLOW = [
  { status: 'submit', label: '提交申请', icon: '✓' },
  { status: 'pending', label: '审批中', icon: '···' },
  { status: 'approved', label: '审批通过', icon: '✓' },
]

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
    // 新增：状态流程和时间线
    statusFlow: STATUS_FLOW,
    currentStep: 0,
    // 新增：倒计时
    countdown: '',
    countdownTimer: null as any,
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
        const visitTime = formatVisitTime(app)
        
        // 格式化结束时间
        const endTime = formatEndTime(app)
        
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
        
        // 计算当前步骤
        const currentStep = this.calculateCurrentStep(app.status)
        
        this.setData(
          { 
            app: { ...app, companions: companionsWithMask }, // 使用脱敏后的随行人员数据
            statusLabel: STATUS_LABEL[app.status] || app.status, 
            visitTime, 
            endTime, 
            submitTimeFormatted,
            maskedName,
            maskedIdCard,
            maskedPhone,
            currentStep
          },
          () => {
            if (app.status === 'approved') {
              wx.nextTick(() => this.drawQRCode())
              // 启动倒计时 - 使用格式化后的日期时间，避免时区问题
              // ⚠️ 关键修复：使用已格式化的 visitTime 和 endTime，而非原始字段
              if (this.data.visitTime && this.data.endTime) {
                // visitTime 和 endTime 已经是 "YYYY-MM-DD HH:mm" 格式
                const parts = this.data.visitTime.split(' ')
                const dateStr = parts[0] || ''
                const timeStr = parts[1] || '00:00'
                this.startCountdown(dateStr, timeStr)
              }
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
    // 计算当前步骤
    calculateCurrentStep(status: string) {
      const stepMap: Record<string, number> = {
        'pending': 1,
        'approved': 2,
        'rejected': 2
      }
      return stepMap[status] || 0
    },
    // 启动倒计时
    startCountdown(visitDate: string, visitTime: string) {
      // 清除之前的定时器
      if (this.data.countdownTimer) {
        clearInterval(this.data.countdownTimer)
      }
          
      // 处理日期格式
      let dateStr = visitDate
      let timeStr = visitTime || '00:00'
          
      // 如果日期包含 T，提取日期部分
      if (dateStr && dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0]
      } else if (dateStr && dateStr.includes(' ')) {
        // 处理 "YYYY-MM-DD HH:mm:ss" 等空格分隔的日期格式
        dateStr = dateStr.split(' ')[0]
      }
          
      // 处理 ISO 8601 时间格式: "1970-01-01T10:00:00.000Z"
      if (timeStr && timeStr.includes('T')) {
        timeStr = timeStr.split('T')[1].substring(0, 5)
      } else if (timeStr && timeStr.length > 5) {
        // 如果时间包含秒，去掉秒
        timeStr = timeStr.substring(0, 5)
      }
          
      console.log('⏰ 启动倒计时:', { dateStr, timeStr })
          
      if (!dateStr || !timeStr) {
        console.log('日期或时间为空，不启动倒计时')
        return
      }
          
      // ⚠️ 关键修复：使用本地时间构造 Date 对象，getTime() 自动转换为 UTC 时间戳
      // 避免 Date.UTC() 将本地时间参数误当 UTC 时间处理，导致时区偏差
      const [year, month, day] = dateStr.split('-').map(Number)
      const [hours, minutes] = timeStr.split(':').map(Number)
          
      // 使用本地时间参数构造 Date 对象（对应用户选择的本地时间）
      // getTime() 返回正确的 UTC 时间戳，可与 Date.now() 直接比较
      const targetTimestamp = new Date(year, month - 1, day, hours, minutes, 0).getTime()
          
      console.log('⏰ 目标时间戳:', targetTimestamp)
      console.log('⏰ 目标时间:', new Date(targetTimestamp).toLocaleString('zh-CN'))
          
      // 检查日期是否有效
      if (isNaN(targetTimestamp)) {
        console.log('无效的日期格式:', { dateStr, timeStr })
        this.setData({ countdown: '' })
        return
      }
          
      const updateCountdown = () => {
        const now = Date.now()
        const diff = targetTimestamp - now
            
        if (diff <= 0) {
          this.setData({ countdown: '已过期' })
          clearInterval(this.data.countdownTimer)
          return
        }
            
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            
        let countdownText = ''
        if (days > 0) {
          countdownText = `${days}天${hours}小时`
        } else if (hours > 0) {
          countdownText = `${hours}小时${minutes}分钟`
        } else {
          countdownText = `${minutes}分钟后`
        }
            
        this.setData({ countdown: countdownText })
      }
          
      updateCountdown()
      const timer = setInterval(updateCountdown, 60000) // 每分钟更新一次
      this.setData({ countdownTimer: timer })
    },
    // 页面隐藏时清除定时器
    onUnload() {
      if (this.data.countdownTimer) {
        clearInterval(this.data.countdownTimer)
      }
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
