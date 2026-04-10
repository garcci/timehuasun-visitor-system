// pages/history/history.ts
import { getApplications, getApplicationsFromApi, formatSubmitTime, formatVisitTime, formatEndTime } from '../../utils/api'
import { maskName, maskIdCard, maskPhone } from '../../utils/mask'
import type { Application } from '../../utils/api'

const STATUS_LABEL: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '未通过',
}

// 筛选选项
const FILTER_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
]

// 时间筛选选项
const TIME_FILTER_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: 'month', label: '本月' },
  { value: 'lastMonth', label: '上月' },
  { value: 'quarter', label: '近三个月' },
]

interface DisplayApp extends Application {
  statusLabel: string
  visitTime: string
  endTime: string
  submitTimeFormatted: string
}

Component({
  data: {
    list: [] as DisplayApp[],
    originalList: [] as DisplayApp[], // 原始数据，用于筛选
    filterOptions: FILTER_OPTIONS,
    timeFilterOptions: TIME_FILTER_OPTIONS,
    currentStatus: '', // 当前状态筛选
    currentTimeFilter: '', // 当前时间筛选
    showFilterPanel: false, // 是否显示筛选面板
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
        this.setData({ list, originalList: list })
        // 应用当前筛选
        this.applyFilters()
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
    
    // 切换筛选面板显示
    toggleFilterPanel() {
      this.setData({ showFilterPanel: !this.data.showFilterPanel })
    },
    
    // 选择状态筛选
    onStatusChange(e: any) {
      const status = e.currentTarget.dataset.value as string
      this.setData({ currentStatus: status }, () => {
        this.applyFilters()
      })
    },
    
    // 选择时间筛选
    onTimeFilterChange(e: any) {
      const timeFilter = e.currentTarget.dataset.value as string
      this.setData({ currentTimeFilter: timeFilter }, () => {
        this.applyFilters()
      })
    },
    
    // 应用筛选
    applyFilters() {
      const { originalList, currentStatus, currentTimeFilter } = this.data
      
      let filteredList = [...originalList]
      
      // 状态筛选
      if (currentStatus) {
        filteredList = filteredList.filter(item => item.status === currentStatus)
      }
      
      // 时间筛选
      if (currentTimeFilter) {
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        filteredList = filteredList.filter(item => {
          const submitDate = new Date(item.submitTime)
          const itemMonth = submitDate.getMonth()
          const itemYear = submitDate.getFullYear()
          
          switch (currentTimeFilter) {
            case 'month':
              return itemMonth === currentMonth && itemYear === currentYear
            case 'lastMonth':
              const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
              const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
              return itemMonth === lastMonth && itemYear === lastMonthYear
            case 'quarter':
              const threeMonthsAgo = new Date()
              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
              return submitDate >= threeMonthsAgo
            default:
              return true
          }
        })
      }
      
      this.setData({ list: filteredList })
    },
    
    // 重置筛选
    resetFilters() {
      this.setData({
        currentStatus: '',
        currentTimeFilter: '',
        showFilterPanel: false
      }, () => {
        this.applyFilters()
      })
    },
  },
})
