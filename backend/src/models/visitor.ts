// backend/src/models/visitor.ts - 访客申请数据模型

/** 随行人员 */
export interface Companion {
  name: string           // 姓名
  idCard: string         // 身份证号
  phone?: string         // 联系电话（可选）
}

/** 访客申请表单 */
export interface VisitorApplication {
  // 基础信息
  id?: string            // 申请 ID（后端生成）
  openid?: string        // 用户微信 openid
  
  // 访客信息
  name: string           // 姓名
  phone: string          // 联系电话
  idType: string         // 证件类型：居民身份证、护照、港澳通行证、台湾通行证、其他
  idCard: string         // 证件号码
  organization?: string  // 来访单位
  plateNumber?: string   // 车牌号（可选）
  
  // 随行人员
  companions: Companion[]
  
  // 被访人信息
  hostName: string       // 被访人姓名
  hostPhone: string      // 被访人联系电话
  visitDate: string      // 来访日期 YYYY-MM-DD
  visitTime: string      // 来访时间 HH:mm
  purpose: string        // 来访事由
  remark?: string        // 备注
  
  // 审批相关
  status: 'pending' | 'approved' | 'rejected'  // 审批状态
  submitTime: string     // 提交时间 ISO 字符串
  approvalTime?: string  // 审批时间 ISO 字符串
  rejectReason?: string  // 驳回原因
  oaFlowId?: string      // OA 流程 ID
  
  // 审计字段
  createdAt?: Date       // 创建时间
  updatedAt?: Date       // 更新时间
}

/** 被访人白名单 */
export interface HostWhitelist {
  id?: string
  name: string           // 被访人姓名
  phone: string          // 联系电话
  department?: string    // 所属部门
  enabled: boolean       // 是否启用
  createdAt?: Date
  updatedAt?: Date
}

/** API 响应格式 */
export interface ApiResponse<T = any> {
  code: number           // 状态码：0=成功，其他=失败
  message: string        // 响应消息
  data?: T               // 响应数据
}

/** 分页查询参数 */
export interface PaginationQuery {
  page: number           // 页码，默认 1
  pageSize: number       // 每页数量，默认 10
  status?: string        // 按状态筛选
  keyword?: string       // 搜索关键词（姓名、手机号等）
  startDate?: string     // 开始日期
  endDate?: string       // 结束日期
}

/** 分页响应 */
export interface PaginationResponse<T> {
  list: T[]              // 数据列表
  total: number          // 总数
  page: number           // 当前页
  pageSize: number       // 每页数量
}
