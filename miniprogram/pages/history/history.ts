// pages/history/history.ts
import { getApplications, getApplicationsFromApi, formatDateTime, formatSubmitTime, formatVisitTime, formatEndTime } from '../../utils/api'
import { maskName, maskIdCard, maskPhone } from '../../utils/mask'
import type { Application } from '../../utils/api'

const STATUS_LABEL: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '未通过',
}

interface DisplayApp extends Application {
  statusLabel: string
  visitTime: string
  endTime: string
  submitTimeFormatted: string
}

Component({
  data: {
    list: [] as DisplayApp[],
  },
  pageLifetimes: {
    async show() {
      await this.loadHistory()
    },
  },
  methods: {
    /**
     * 加载历史记录
     */
    async loadHistory() {
      wx.showLoading({ title: '加载中...' })
      
      try {
        // 从后端 API 获取数据
        const result = await getApplicationsFromApi(1, 100)
        const apps = result.list
        
        const list: DisplayApp[] = apps.map(a => {
          // 为随行人员添加脱敏字段
          const companionsWithMask = (a.companions || []).map(c => ({
            ...c,
            maskedName: maskName(c.name || ''),
            maskedIdCard: maskIdCard(c.idCard || ''),
            maskedPhone: c.phone ? maskPhone(c.phone) : ''
          }))
          
          return {
            ...a,
            companions: companionsWithMask, // 使用脱敏后的随行人员数据
            statusLabel: STATUS_LABEL[a.status] || a.status,
            visitTime: formatVisitTime(a),
            endTime: formatEndTime(a),
            submitTimeFormatted: formatSubmitTime(a.submitTime),
          }
        })
        
        wx.hideLoading()
        this.setData({ list })
      } catch (error) {
        wx.hideLoading()
        console.error('加载历史记录失败:', error)
        wx.showToast({ title: '加载失败', icon: 'none' })
        
        // 降级：如果 API 失败，尝试使用本地 Mock 数据
        const apps = getApplications()
        const list: DisplayApp[] = apps.map(a => {
          // 为随行人员添加脱敏字段
          const companionsWithMask = (a.companions || []).map(c => ({
            ...c,
            maskedName: maskName(c.name || ''),
            maskedIdCard: maskIdCard(c.idCard || ''),
            maskedPhone: c.phone ? maskPhone(c.phone) : ''
          }))
          
          return {
            ...a,
            companions: companionsWithMask, // 使用脱敏后的随行人员数据
            statusLabel: STATUS_LABEL[a.status] || a.status,
            visitTime: formatVisitTime(a),
            endTime: formatEndTime(a),
            submitTimeFormatted: formatSubmitTime(a.submitTime),
          }
        })
        this.setData({ list })
      }
    },
    
    /**
     * 下拉刷新
     */
    async onPullDownRefresh() {
      await this.loadHistory()
      wx.stopPullDownRefresh()
    },
    
    /**
     * 跳转到申请页面
     */
    onGoApply() {
      wx.navigateTo({ url: '/pages/apply/apply' })
    },
    
    onItemTap(e: any) {
      const id = e.currentTarget.dataset.id as string
      wx.navigateTo({ url: `/pages/status/status?id=${id}` })
    },
  },
})
