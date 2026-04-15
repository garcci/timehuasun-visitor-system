// pages/apply/apply.ts
import { getDraft, saveDraft, getToday, submitApplicationApi, API_BASE_URL, getApplications } from '../../utils/api'

const ID_TYPES = ['居民身份证', '护照', '港澳通行证', '台湾通行证', '其他']

interface FormData {
  name: string
  phone: string
  idType: string
  idCard: string
  organization: string
  plateNumber: string
  hostName: string
  hostPhone: string
  hostLoginName: string // 新增：被访人登录名（用于 OA 审批）
  visitDate: string
  visitTime: string
  endDate: string
  endTime: string
  purpose: string
  remark: string
}

Page({
  data: {
    today: '',
    idTypeOptions: ID_TYPES,
    idTypeIndex: 0, // 默认选中第一个（居民身份证）
    form: {
      name: '',
      phone: '',
      idType: '居民身份证', // 默认值为居民身份证
      idCard: '',
      organization: '',
      plateNumber: '',
      hostName: '',
      hostPhone: '',
      hostLoginName: '', // 新增：被访人登录名
      visitDate: '',
      visitTime: '',
      endDate: '',
      endTime: '',
      purpose: '',
      remark: '',
    } as FormData,
    errors: {} as Record<string, string>,
    companions: [] as Array<{name: string, idCard: string, phone?: string}>,
    newCompanion: {name: '', idCard: '', phone: ''},
    hostValidateSuccess: false, // 被访人电话验证成功标志
    validatingHost: false, // 正在验证被访人电话
    queryTimer: null as any, // 手机号查询防抖定时器
    isSubmitting: false, // 是否正在提交
    autoSaveTimer: null as any, // 自动保存草稿定时器
    scrollIntoView: '', // 滚动到指定视图
    phoneHistory: [] as string[], // 历史手机号
    idCardHistory: [] as string[], // 历史身份证
    showPhonePicker: false, // 是否显示手机号选择器
    showIdCardPicker: false, // 是否显示身份证选择器
    blurTimer: null as any, // blur延迟隐藏定时器
    isSelectingHistory: false, // 是否正在选择历史记录
    // 常用被访人
    frequentHosts: [] as Array<{name: string, phone: string, loginName: string}>,
    showFrequentHosts: false, // 是否显示常用被访人
    // 进度统计
    completedCount: 0, // 已完成字段数
    totalFields: 8, // 总必填字段数
    progressPercent: 0, // 进度百分比
    unfilledRequired: [] as string[], // 未填写的必填项
    orgHistory: [] as string[], // 常用单位历史
    lastApplication: null as any, // 上次申请记录
    companionHistory: [] as Array<{name: string, idCard: string, phone?: string}>, // 常用随行人员
  },

  onLoad(options: any) {
    // 每次都要签署保密协议（通过页面参数控制）
    if (options?.from !== 'agreement') {
      wx.redirectTo({ url: '/pages/agreement/agreement' })
    }
  },
  onShow() {
    // 获取当前日期和时间
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      
      const currentDate = `${year}-${month}-${day}`
      const currentTime = `${hours}:${minutes}`
      
      // 结束时间默认为当前时间 +2 小时
      const endHours = String((parseInt(hours) + 2) % 24).padStart(2, '0')
      const endTime = `${endHours}:${minutes}`
      
      this.setData({ 
        today: getToday(),
        'form.visitDate': currentDate,
        'form.visitTime': currentTime,
        'form.endDate': currentDate,
        'form.endTime': endTime
      })
      
      // 检查是否有已提交的申请
      const submittedApps = getApplications()
      const hasSubmitted = submittedApps.length > 0
      
      // 尝试加载草稿
      const draft = getDraft()
      
      if (draft) {
        // ✅ 有草稿，恢复草稿（保留来访时间）
        console.log('检测到草稿，恢复草稿')
        const { companions, visitDate, visitTime, endDate, endTime: draftEndTime, ...formFields } = draft
        this.setData({
          form: { ...this.data.form, ...(formFields as Partial<FormData>) },
          companions: companions || []
        })
        
        // ✅ 如果被访人手机号符合格式，自动校验
        const hostPhone = formFields.hostPhone as string
        if (hostPhone && /^1[3-9]\d{9}$/.test(hostPhone)) {
          console.log('📱 草稿中的被访人手机号符合格式，自动校验:', hostPhone)
          // 延迟执行，确保 setData 完成
          setTimeout(() => {
            this.validateHostPhone(hostPhone)
          }, 500)
        }
      } else if (hasSubmitted) {
        // ✅ 没有草稿但有已提交的申请，清空表单
        console.log('检测到已提交的申请且无草稿，清空表单')
        this.setData({
          form: {
            name: '',
            phone: '',
            idType: '居民身份证',
            idCard: '',
            organization: '',
            plateNumber: '',
            hostName: '',
            hostPhone: '',
            hostLoginName: '',
            visitDate: currentDate,
            visitTime: currentTime,
            endDate: currentDate,
            endTime: endTime,
            purpose: '',
            remark: '',
          },
          companions: [],
          newCompanion: {name: '', idCard: '', phone: ''},
          hostValidateSuccess: false,
          validatingHost: false,
          errors: {}
        })
      }
      // 如果既没有草稿也没有已提交的申请，保持默认值
      
      // 加载历史输入记录
      this.loadHistory()
      // 加载常用被访人
      this.loadFrequentHosts()
      // 加载常用单位
      this.loadOrgHistory()
      // 加载常用随行人员
      this.loadCompanionHistory()
      // 加载上次申请记录
      this.loadLastApplication()
      // 计算进度
      this.calculateProgress()
    },

    onHide() {
      // 页面隐藏时，如果有未保存的内容，自动保存草稿
      const hasContent = Object.values(this.data.form).some(v => v && v.toString().trim())
      if (hasContent && !this.data.isSubmitting) {
        this.autoSaveDraft()
      }
    },

  // 加载历史输入记录
  loadHistory() {
      try {
        const phoneHistory = wx.getStorageSync('phone_history') || []
        const idCardHistory = wx.getStorageSync('idcard_history') || []
        
        console.log('📋 加载历史记录:', {
          phoneHistory,
          idCardHistory,
          phoneCount: phoneHistory.length,
          idCardCount: idCardHistory.length
        })
        
        this.setData({
          phoneHistory: phoneHistory.slice(0, 5), // 最多保存5条
          idCardHistory: idCardHistory.slice(0, 5)
        })
      } catch (e) {
        console.error('加载历史记录失败:', e)
      }
    },
    
    // 加载常用被访人
    loadFrequentHosts() {
      try {
        const hosts = wx.getStorageSync('frequent_hosts') || []
        console.log('👥 加载常用被访人:', hosts)
        this.setData({
          frequentHosts: hosts.slice(0, 5) // 最多显示5个
        })
      } catch (e) {
        console.error('加载常用被访人失败:', e)
      }
    },
    
    // 加载常用单位历史
    loadOrgHistory() {
      try {
        const orgs = wx.getStorageSync('org_history') || []
        this.setData({ orgHistory: orgs.slice(0, 5) })
      } catch (e) {
        console.error('加载常用单位失败:', e)
      }
    },
    
    // 选择常用单位
    selectOrg(e: any) {
      const org = e.currentTarget.dataset.value as string
      this.setData({ 'form.organization': org })
      this.calculateProgress()
      this.autoSaveDraft()
    },
    
    // 保存单位到历史
    saveOrgHistory(org: string) {
      if (!org) return
      try {
        let history = wx.getStorageSync('org_history') || []
        history = history.filter((item: string) => item !== org)
        history.unshift(org)
        history = history.slice(0, 5)
        wx.setStorageSync('org_history', history)
      } catch (e) {
        console.error('保存单位历史失败:', e)
      }
    },
    
    // 加载上次申请记录
    loadLastApplication() {
      try {
        const apps = wx.getStorageSync('applications') || []
        if (apps.length > 0) {
          this.setData({ lastApplication: apps[apps.length - 1] })
        }
      } catch (e) {
        console.error('加载上次申请失败:', e)
      }
    },
    
    // 复制上次申请
    copyLastApplication() {
      const last = this.data.lastApplication
      if (!last) return
      
      wx.showModal({
        title: '复制上次申请',
        content: '将自动填充来访人信息（不含被访人），是否继续？',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              'form.name': last.name || '',
              'form.phone': last.phone || '',
              'form.idCard': last.idCard || '',
              'form.organization': last.organization || '',
              'form.plateNumber': last.plateNumber || ''
            })
            this.calculateProgress()
            this.autoSaveDraft()
            wx.showToast({ title: '已复制', icon: 'success' })
          }
        }
      })
    },
    
    // 加载常用随行人员
    loadCompanionHistory() {
      try {
        const history = wx.getStorageSync('companion_history') || []
        this.setData({ companionHistory: history.slice(0, 5) })
      } catch (e) {
        console.error('加载常用随行人员失败:', e)
      }
    },
    
    // 保存随行人员到历史
    saveCompanionHistory(companion: {name: string, idCard: string, phone?: string}) {
      if (!companion.name || !companion.idCard) return
      try {
        let history = wx.getStorageSync('companion_history') || []
        // 去重（根据身份证号）
        history = history.filter((item: any) => item.idCard !== companion.idCard)
        // 添加到开头
        history.unshift({
          name: companion.name,
          idCard: companion.idCard,
          phone: companion.phone || ''
        })
        // 只保留最近10个
        history = history.slice(0, 10)
        wx.setStorageSync('companion_history', history)
      } catch (e) {
        console.error('保存随行人员历史失败:', e)
      }
    },
    
    // 从历史选择随行人员
    selectCompanionFromHistory(e: any) {
      const index = e.currentTarget.dataset.index as number
      const companion = this.data.companionHistory[index]
      if (companion) {
        this.setData({
          newCompanion: {
            name: companion.name,
            idCard: companion.idCard,
            phone: companion.phone || ''
          }
        })
        wx.showToast({ title: '已填充', icon: 'success' })
      }
    },
    
    // 计算表单进度
    calculateProgress() {
      const f = this.data.form
      const required = ['name', 'phone', 'idType', 'idCard', 'organization', 'hostPhone', 'visitDate', 'purpose']
      const fieldNames: Record<string, string> = {
        name: '姓名', phone: '电话', idType: '证件类型', idCard: '证件号码',
        organization: '单位', hostPhone: '被访人电话', visitDate: '来访时间', purpose: '来访事由'
      }
      
      let completed = 0
      const unfilled: string[] = []
      
      required.forEach(field => {
        const value = (f as any)[field]
        if (value && value.toString().trim()) {
          completed++
        } else {
          unfilled.push(fieldNames[field])
        }
      })
      
      this.setData({
        completedCount: completed,
        progressPercent: Math.round((completed / required.length) * 100),
        unfilledRequired: unfilled
      })
    },
    
    // 保存常用被访人
    saveFrequentHost(name: string, phone: string, loginName: string) {
      if (!name || !phone) return
      
      try {
        let hosts = wx.getStorageSync('frequent_hosts') || []
        
        // 移除重复项（根据手机号判断）
        hosts = hosts.filter((h: any) => h.phone !== phone)
        
        // 添加到开头
        hosts.unshift({ name, phone, loginName })
        
        // 只保留最近10个
        hosts = hosts.slice(0, 10)
        
        wx.setStorageSync('frequent_hosts', hosts)
        console.log('💾 保存常用被访人:', hosts)
      } catch (e) {
        console.error('保存常用被访人失败:', e)
      }
    },
    
    // 显示/隐藏常用被访人
    toggleFrequentHosts() {
      this.setData({
        showFrequentHosts: !this.data.showFrequentHosts,
        // 隐藏其他选择器
        showPhonePicker: false,
        showIdCardPicker: false
      })
    },
    
    // 选择常用被访人
    selectFrequentHost(e: any) {
      const { name, phone, loginname } = e.currentTarget.dataset
      console.log('✅ 选择常用被访人:', { name, phone, loginname })
      
      this.setData({
        'form.hostName': name,
        'form.hostPhone': phone,
        'form.hostLoginName': loginname || '',
        hostValidateSuccess: true,
        showFrequentHosts: false,
        // 清除可能的错误提示
        'errors.hostName': '',
        'errors.hostPhone': ''
      })
      
      // 自动保存草稿
      this.autoSaveDraft()
    },
    
    // 保存历史输入
    saveToHistory(type: 'phone' | 'idcard', value: string) {
      if (!value) return
      
      try {
        const key = type === 'phone' ? 'phone_history' : 'idcard_history'
        let history = wx.getStorageSync(key) || []
        
        // 移除重复项
        history = history.filter((item: string) => item !== value)
        
        // 添加到开头
        history.unshift(value)
        
        // 只保留最近5条
        history = history.slice(0, 5)
        
        wx.setStorageSync(key, history)
        
        // 更新界面
        if (type === 'phone') {
          this.setData({ phoneHistory: history })
        } else {
          this.setData({ idCardHistory: history })
        }
      } catch (e) {
        console.error('保存历史记录失败:', e)
      }
    },
    
    // 显示手机号选择器
    onPhoneFocus() {
      console.log('📱 手机号输入框聚焦, 历史记录数量:', this.data.phoneHistory.length)
      if (this.data.phoneHistory.length > 0) {
        this.setData({ showPhonePicker: true })
        console.log('✅ 显示手机号历史记录')
      } else {
        console.log('⚠️ 没有手机号历史记录')
      }
    },
    
    // 显示身份证选择器
    onIdCardFocus() {
      console.log('🆔 身份证输入框聚焦, 历史记录数量:', this.data.idCardHistory.length)
      if (this.data.idCardHistory.length > 0) {
        this.setData({ showIdCardPicker: true })
        console.log('✅ 显示身份证历史记录')
      } else {
        console.log('⚠️ 没有身份证历史记录')
      }
    },
    
    // 隐藏选择器（带延迟，给tap事件时间触发）
    hidePickers() {
      // 清除之前的定时器
      if (this.data.blurTimer) {
        clearTimeout(this.data.blurTimer)
      }
      
      // 如果正在选择历史记录，不隐藏
      if (this.data.isSelectingHistory) return
      
      // 延迟150ms隐藏，让tap事件先触发
      this.setData({
        blurTimer: setTimeout(() => {
          if (!this.data.isSelectingHistory) {
            this.setData({
              showPhonePicker: false,
              showIdCardPicker: false,
              blurTimer: null
            })
          }
        }, 150)
      })
    },
    
    // 带延迟的blur（用于替换hidePickers）
    onBlurWithDelay() {
      this.hidePickers()
    },
    
    // 选择历史手机号
    selectPhone(e: any) {
      const phone = e.currentTarget.dataset.value as string
      
      // 标记正在选择
      this.setData({ isSelectingHistory: true })
      
      // 清除blur定时器
      if (this.data.blurTimer) {
        clearTimeout(this.data.blurTimer)
      }
      
      this.setData({
        'form.phone': phone,
        showPhonePicker: false,
        isSelectingHistory: false,
        blurTimer: null
      })
      this.autoSaveDraft()
    },
    
    // 选择历史身份证
    selectIdCard(e: any) {
      const idCard = e.currentTarget.dataset.value as string
      
      // 标记正在选择
      this.setData({ isSelectingHistory: true })
      
      // 清除blur定时器
      if (this.data.blurTimer) {
        clearTimeout(this.data.blurTimer)
      }
      
      this.setData({
        'form.idCard': idCard,
        showIdCardPicker: false,
        isSelectingHistory: false,
        blurTimer: null
      })
      this.autoSaveDraft()
    },
    
    // 获取微信手机号（已移除）
    // async onGetPhoneNumber(e: any) { ... },
    
    onInput(e: any) {
      const field = e.currentTarget.dataset.field as string
      const value = e.detail.value as string
      this.setData({ [`form.${field}`]: value })
      // 实时验证该字段
      this.validateField(field, value)
      // 计算进度
      this.calculateProgress()
      // 自动保存草稿
      this.autoSaveDraft()
    },
    // 单个字段实时验证
    validateField(field: string, value: string) {
      const errors = { ...this.data.errors }
      
      switch (field) {
        case 'name':
          if (value.trim() && value.trim().length < 2) {
            errors.name = '姓名至少需要2个字符'
          } else {
            delete errors.name
          }
          break
        case 'organization':
          if (value.trim()) {
            delete errors.organization
          }
          break
        case 'purpose':
          if (value.trim()) {
            delete errors.purpose
          }
          break
      }
      
      this.setData({ errors })
    },
    /**
     * 身份证号输入时实时验证（只在输入完整时才验证）
     */
    onIdCardInput(e: any) {
      const idCard = e.detail.value as string
      
      // 只有在输入完整（15位或18位）时才进行验证
      let errorMessage = ''
      if (idCard.length === 15 || idCard.length === 18) {
        // 身份证正则：15位或18位（最后一位可以是X）
        const isValid = /(^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$)|(^[1-9]\d{5}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}$)/.test(idCard)
        if (!isValid) {
          errorMessage = '身份证号格式不正确'
        }
      }
      // 如果位数不足，不显示错误（让用户继续输入）
      
      this.setData({
        'form.idCard': idCard,
        'errors.idCard': errorMessage
      })
      
      // 自动保存草稿
      this.autoSaveDraft()
      
      // ❌ 移除：不再在输入时保存历史记录，改为提交成功后保存
      // if (idCard.length >= 15 && !errorMessage) {
      //   this.saveToHistory('idcard', idCard)
      // }
    },
    
    /**
     * 手机号输入时实时验证（只在输入完整11位时才验证）
     */
    onPhoneInput(e: any) {
      const phone = e.detail.value as string
      
      // 只有在输入完整11位时才进行验证
      let errorMessage = ''
      if (phone.length === 11) {
        // 手机号正则：1开头，第二位3-9，共11位
        const isValid = /^1[3-9]\d{9}$/.test(phone)
        if (!isValid) {
          errorMessage = '手机号格式不正确'
        }
      }
      // 如果位数不足11位，不显示错误（让用户继续输入）
      
      this.setData({
        'form.phone': phone,
        'errors.phone': errorMessage
      })
      
      // 自动保存草稿
      this.autoSaveDraft()
      
      // ❌ 移除：不再在输入时保存历史记录，改为提交成功后保存
      // if (phone.length === 11 && !errorMessage) {
      //   this.saveToHistory('phone', phone)
      // }
    },
    onPlateInput(e: any) {
      // 车牌号自动转大写
      const value = (e.detail.value as string).toUpperCase()
      this.setData({ 'form.plateNumber': value })
      // 自动保存草稿
      this.autoSaveDraft()
    },
    onIdTypeChange(e: any) {
      const idx = Number(e.detail.value)
      this.setData({ idTypeIndex: idx, 'form.idType': ID_TYPES[idx] })
      this.calculateProgress()
    },
    onDateChange(e: any) {
      const selectedDate = e.detail.value as string
      
      // 不允许选择过去的日期
      const today = this.data.today.replace(/-/g, '')
      const selected = selectedDate.replace(/-/g, '')
      
      if (selected < today) {
        wx.showModal({
          title: '提示',
          content: '不能选择过去的日期，请重新选择',
          showCancel: false
        })
        // 恢复为今天
        this.setData({ 'form.visitDate': this.data.today })
        return
      }
      
      this.setData({ 'form.visitDate': selectedDate })
      this.calculateProgress()
      
      // 如果结束日期小于开始日期，自动调整结束日期
      if (this.data.form.endDate && this.data.form.endDate < selectedDate) {
        this.setData({ 'form.endDate': selectedDate })
      }
    },
    onTimeChange(e: any) {
      const selectedTime = e.detail.value as string
      this.setData({ 'form.visitTime': selectedTime })
      this.calculateProgress()
      
      // 检查结束时间是否小于开始时间
      if (this.data.form.endTime && this.data.form.endTime <= selectedTime && 
          this.data.form.endDate === this.data.form.visitDate) {
        // 同一天内，结束时间必须大于开始时间
        wx.showModal({
          title: '提示',
          content: '结束时间必须大于开始时间，已自动调整结束时间',
          showCancel: false
        })
        // 自动调整为开始时间 +2 小时
        const [hours, minutes] = selectedTime.split(':').map(Number)
        const endHours = String((hours + 2) % 24).padStart(2, '0')
        this.setData({ 'form.endTime': `${endHours}:${String(minutes).padStart(2, '0')}` })
      }
    },
    onEndDateChange(e: any) {
      const selectedDate = e.detail.value as string
      
      // 结束日期不能小于开始日期
      if (selectedDate < this.data.form.visitDate) {
        wx.showModal({
          title: '提示',
          content: '结束日期不能小于开始日期',
          showCancel: false
        })
        // 恢复为开始日期
        this.setData({ 'form.endDate': this.data.form.visitDate })
        return
      }
      
      this.setData({ 'form.endDate': selectedDate })
    },
    onEndTimeChange(e: any) {
      const selectedTime = e.detail.value as string
      
      // 如果是同一天，结束时间必须大于开始时间
      if (this.data.form.endDate === this.data.form.visitDate && 
          selectedTime <= this.data.form.visitTime) {
        wx.showModal({
          title: '提示',
          content: '同一天的结束时间必须大于开始时间',
          showCancel: false
        })
        // 清空结束时间，让用户重新选择
        this.setData({ 'form.endTime': '' })
        return
      }
      
      this.setData({ 'form.endTime': selectedTime })
    },
    
    /**
     * 被访人手机号失去焦点时，验证并获取信息
     */
    async onHostPhoneBlur(e: any) {
      const phone = e.detail.value?.trim()
      
      // 清除之前的定时器（防抖）
      if (this.data.queryTimer) {
        clearTimeout(this.data.queryTimer)
      }
      
      // 清空之前的状态
      this.setData({
        hostValidateSuccess: false,
        validatingHost: false
      })
      
      // 如果为空，不处理
      if (!phone) {
        const errors = { ...this.data.errors }
        delete errors.hostPhone
        this.setData({ errors })
        return
      }
      
      // 只有在输入完整11位时才进行验证和查询
      if (phone.length !== 11) {
        // 位数不足，清除错误提示（让用户继续输入）
        const errors = { ...this.data.errors }
        delete errors.hostPhone
        this.setData({ errors })
        return
      }
      
      // 验证格式 - 必须是 11 位数字
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        // 只在完整11位且格式错误时才显示错误
        this.setData({ 'errors.hostPhone': '手机号格式不正确' })
        return
      }
      
      // 设置防抖延迟（800ms，给用户更多时间修改）
      this.setData({
        queryTimer: setTimeout(async () => {
          await this.validateHostPhone(phone)
        }, 800)
      })
    },
    
    /**
     * 验证被访人手机号的独立方法
     */
    async validateHostPhone(phone: string) {
      
      // 显示加载中
      this.setData({ validatingHost: true })
      
      try {
        // 调用后端接口查询 OA 系统
        const res = await new Promise<any>((resolve, reject) => {
          wx.request({
            url: `${API_BASE_URL}/visitors/query-by-phone`,
            method: 'POST',
            data: { phone, type: 'host' },
            timeout: 10000, // 10 秒超时
            success: resolve,
            fail: reject
          })
        })
        
        if (res.statusCode === 200) {
          const { code, data } = res.data
          
          if (code === 0) {
            // ✅ 查询成功，自动填充所有字段
            this.setData({
              'form.hostPhone': phone,
              'form.hostName': data.name, // 自动填充姓名
              'form.hostLoginName': data.loginName, // 保存登录名用于审批
              hostValidateSuccess: true,
              validatingHost: false
            })
            
            // 计算进度
            this.calculateProgress()
            
            wx.showToast({
              title: '查询成功',
              icon: 'success'
            })
            
            // 清除错误
            const errors = { ...this.data.errors }
            delete errors.hostPhone
            this.setData({ errors })
            
            // 自动聚焦到下一个字段（访客姓名）
            setTimeout(() => {
              this.focusOnField('name')
            }, 500)
            
          } else if (code === 1001) {
            // ❌ 未查询到该手机号
            this.setData({
              'form.hostPhone': phone,  // 保留用户输入的手机号
              'form.hostName': '',
              'form.hostLoginName': '',
              hostValidateSuccess: false,
              validatingHost: false,
              'errors.hostPhone': '该手机号未在 OA 系统中登记'
            })
            
            // 不再弹框，只显示错误提示
            // wx.showModal 已移除
          }
        } else {
          throw new Error(`HTTP 错误：${res.statusCode}`)
        }
      } catch (error: any) {
        this.setData({ validatingHost: false })
        console.error('手机号查询失败:', error)
        
        // 区分不同类型的错误
        let errorMessage = '系统繁忙，请稍后重试'
        
        if (error.code === 'ETIMEDOUT' || error.errMsg?.includes('timeout')) {
          // 超时错误
          errorMessage = '查询超时，请检查网络连接后重试'
        } else if (error.code === 'ENOTFOUND' || error.errMsg?.includes('network')) {
          // 网络错误
          errorMessage = '网络连接失败，请检查网络设置'
        } else if (error.statusCode === 500) {
          // 服务器错误
          errorMessage = '服务器开小差了，请联系管理员'
        } else if (error.statusCode === 503) {
          // 服务不可用
          errorMessage = 'OA 系统暂时不可用，请稍后重试'
        }
        
        this.setData({
          'form.hostPhone': phone,  // 保留用户输入的手机号
          'form.hostName': '',
          'form.hostLoginName': '',
          hostValidateSuccess: false,
          validatingHost: false,
          'errors.hostPhone': errorMessage
        })
        
        // 不再弹框，只显示错误提示
        // wx.showModal 已移除
      }
    },
    
    /**
     * 自动保存草稿（防抖，1秒后保存）
     */
    autoSaveDraft() {
      // 清除之前的定时器
      if (this.data.autoSaveTimer) {
        clearTimeout(this.data.autoSaveTimer)
      }
      
      // 设置新的定时器，1秒后保存
      this.setData({
        autoSaveTimer: setTimeout(() => {
          const draft = {
            ...this.data.form,
            companions: this.data.companions
          }
          saveDraft(draft)
          console.log('草稿已自动保存')
        }, 1000)
      })
    },
    
    // 来访事由聚焦时，滚动到该字段
    onPurposeFocus() {
      this.setData({ scrollIntoView: 'purpose-field' })
    },
    
    // 清空字段
    clearField(e: any) {
      const field = e.currentTarget.dataset.field as string
      this.setData({ [`form.${field}`]: '' })
      this.calculateProgress()
      this.autoSaveDraft()
    },
    
    /**
     * 聚焦到指定字段
     */
    focusOnField(fieldName: string) {
      // 微信小程序中，使用 createSelectorQuery 获取字段后，通过调用 focus() 方法聚焦
      const query = wx.createSelectorQuery()
      query.select(`#${fieldName}`)
            .fields({ node: true, id: true } as any, (node: any) => {
              if (node && node.node) {
                // Input 组件的聚焦需要调用原生方法
                node.node.focus()
              }
            }).exec()
    },
    
    /**
     * 被访人姓名变更时，标记为未验证
     */
    onHostNameInput(e: any) {
      const name = e.detail.value as string
      this.setData({ 
        'form.hostName': name,
        hostValidateSuccess: false 
      })
    },
    
    onCompanionInput(e: any) {
      const field = e.currentTarget.dataset.field as string
      this.setData({ [`newCompanion.${field}`]: e.detail.value as string })
      // 自动保存草稿
      this.autoSaveDraft()
    },
    addCompanion() {
      const { name, idCard, phone } = this.data.newCompanion
      if (!name.trim() || !idCard.trim()) {
        wx.showToast({ title: '请填写随行人员姓名和身份证号', icon: 'none' })
        return
      }
      if (!/^\d{17}[\dXx]$/.test(idCard)) {
        wx.showToast({ title: '身份证号格式不正确', icon: 'none' })
        return
      }
      // 验证手机号格式（如果填写了）
      if (phone && !/^1\d{10}$/.test(phone)) {
        wx.showToast({ title: '随行人员手机号格式不正确', icon: 'none' })
        return
      }
      const companions = [...this.data.companions, { name: name.trim(), idCard: idCard.trim(), phone: phone.trim() }]
      this.setData({
        companions,
        newCompanion: { name: '', idCard: '', phone: '' }
      })
      // 保存到历史
      this.saveCompanionHistory({ name: name.trim(), idCard: idCard.trim(), phone: phone.trim() })
      // 自动保存草稿
      this.autoSaveDraft()
      wx.showToast({ title: '添加成功', icon: 'success' })
    },
    removeCompanion(e: any) {
      const index = e.currentTarget.dataset.index as number
      const companions = [...this.data.companions]
      companions.splice(index, 1)
      this.setData({ companions })
      // 自动保存草稿
      this.autoSaveDraft()
    },
    validate(): boolean {
      const f = this.data.form
      const errors: Record<string, string> = {}
      let firstErrorField = ''

      if (!f.name.trim()) { errors.name = '请输入来访人姓名'; firstErrorField = firstErrorField || 'name-field' }
      if (!f.phone.trim()) {
        errors.phone = '请输入联系电话'
        firstErrorField = firstErrorField || 'phone-field'
      } else if (!/^1\d{10}$/.test(f.phone)) {
        errors.phone = '手机号格式不正确'
        firstErrorField = firstErrorField || 'phone-field'
      }
      if (!f.idType) { errors.idType = '请选择证件类型'; firstErrorField = firstErrorField || 'idtype-field' }
      if (!f.idCard.trim()) {
        errors.idCard = '请输入证件号码'
        firstErrorField = firstErrorField || 'idcard-field'
      } else if (!/^\d{17}[\dXx]$/.test(f.idCard)) {
        errors.idCard = '身份证号格式不正确'
        firstErrorField = firstErrorField || 'idcard-field'
      }
      if (!f.organization.trim()) { errors.organization = '请输入来访单位'; firstErrorField = firstErrorField || 'org-field' }
      if (!f.hostName.trim()) { errors.hostName = '请输入被访人姓名'; firstErrorField = firstErrorField || 'host-field' }
      if (!f.hostPhone.trim()) {
        errors.hostPhone = '请输入被访人联系电话'
        firstErrorField = firstErrorField || 'host-field'
      } else if (!/^1[3-9]\d{9}$/.test(f.hostPhone)) {
        errors.hostPhone = '手机号格式不正确'
        firstErrorField = firstErrorField || 'host-field'
      }
      // 检查被访人是否验证通过
      if (!this.data.hostValidateSuccess && f.hostPhone.trim()) {
        errors.hostPhone = '请先验证被访人信息'
        firstErrorField = firstErrorField || 'host-field'
      }
      if (!f.visitDate) { errors.visitDate = '请选择来访时间'; firstErrorField = firstErrorField || 'time-field' }
      if (!f.purpose.trim()) { errors.purpose = '请填写来访事由'; firstErrorField = firstErrorField || 'purpose-field' }

      this.setData({ errors, scrollIntoView: firstErrorField })
      return Object.keys(errors).length === 0
    },
    async onSubmit() {
      // 防止重复提交
      if (this.data.isSubmitting) {
        wx.showToast({ title: '请勿重复提交', icon: 'none' })
        return
      }
      
      if (!this.validate()) {
        wx.showToast({ title: '请检查填写内容', icon: 'none' })
        return
      }
      
      // 检查是否有未添加的随行人员信息
      const { newCompanion } = this.data
      if (newCompanion.name.trim() || newCompanion.idCard.trim()) {
        const res = await wx.showModal({
          title: '提示',
          content: '您填写了随行人员信息但未点击"确认添加此人"，是否继续提交？',
          confirmText: '继续提交',
          cancelText: '去添加'
        })
        if (!res.confirm) {
          return
        }
      }
      
      // 检查隐私授权
      const needAuthorization = await this.checkPrivacyAuthorization()
      if (!needAuthorization) {
        return
      }
      
      this.setData({ isSubmitting: true })
      wx.showLoading({ title: '提交中...' })
      
      try {
        const f = this.data.form
        const companions = this.data.companions
        
        // 保存草稿（包含随行人员）
        saveDraft({ ...f, companions })
        
        // 提交到后端 API
        const result = await submitApplicationApi({
          name: f.name.trim(),
          phone: f.phone.trim(),
          idType: f.idType,
          idCard: f.idCard.trim(),
          organization: f.organization.trim(),
          plateNumber: f.plateNumber.trim(),
          hostName: f.hostName.trim(),
          hostPhone: f.hostPhone.trim(),
          hostLoginName: f.hostLoginName.trim(), // 传递登录名给 OA 审批
          visitDate: f.visitDate,
          visitTime: f.visitTime,
          endDate: f.endDate,
          endTime: f.endTime,
          visitStartDate: f.visitDate,
          visitStartTime: f.visitTime,
          purpose: f.purpose.trim(),
          remark: f.remark.trim(),
          companions,
        })
        
        wx.hideLoading()
        wx.showToast({ title: '提交成功', icon: 'success' })
        
        // ✅ 提交成功后保存历史记录
        this.saveToHistory('phone', f.phone.trim())
        this.saveToHistory('idcard', f.idCard.trim())
        this.saveOrgHistory(f.organization.trim())
        console.log('✅ 已保存历史记录:', { phone: f.phone.trim(), idCard: f.idCard.trim(), org: f.organization.trim() })
        
        // ✅ 提交成功后保存常用被访人
        this.saveFrequentHost(f.hostName.trim(), f.hostPhone.trim(), f.hostLoginName.trim())
        
        // ✅ 保存到本地申请列表（用于一键复制）
        const newApp = {
          name: f.name.trim(),
          phone: f.phone.trim(),
          idCard: f.idCard.trim(),
          organization: f.organization.trim(),
          plateNumber: f.plateNumber.trim(),
          submitTime: new Date().toISOString()
        }
        let apps = wx.getStorageSync('applications') || []
        apps.push(newApp)
        // 只保留最近10条
        if (apps.length > 10) apps = apps.slice(-10)
        wx.setStorageSync('applications', apps)
        console.log('✅ 已保存到申请列表')
        
        // 提交成功后清除草稿
        wx.removeStorageSync('visitor_draft')
        console.log('提交成功，已清除草稿')
        
        // 跳转到状态页，使用返回的申请 ID
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/status/status?id=${result.id}` })
        }, 1500)
      } catch (error) {
        wx.hideLoading()
        console.error('提交失败:', error)
        wx.showToast({ title: '提交失败，请重试', icon: 'none' })
      } finally {
        // 无论成功或失败，都重置提交状态
        this.setData({ isSubmitting: false })
      }
    },
    
    /**
     * 检查隐私授权
     */
    async checkPrivacyAuthorization(): Promise<boolean> {
      return new Promise((resolve) => {
        // 检查是否需要隐私授权
        const wxAny = wx as any
        wxAny.getPrivacySetting({
          success: (res: any) => {
            if (res.needAuthorization) {
              // 需要授权，显示隐私协议弹窗
              wxAny.requirePrivacyAuthorize({
                success: () => {
                  console.log('用户同意隐私协议')
                  resolve(true)
                },
                fail: () => {
                  wx.showToast({ title: '需要同意隐私协议', icon: 'none' })
                  resolve(false)
                }
              })
            } else {
              // 不需要授权，直接继续
              resolve(true)
            }
          },
          fail: () => {
            // 获取失败，默认继续（兼容旧版本）
            resolve(true)
          }
        })
      })
    },
  })
