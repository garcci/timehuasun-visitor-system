// backend/src/controllers/visitor.controller.ts - 访客控制器

import { Request, Response } from 'express'
import { VisitorApplication, ApiResponse, PaginationQuery, PaginationResponse } from '../models/visitor'
import { oaService } from '../services/oa.service'
import { applicationRepository } from '../database/repositories/application.repository'
import { hostWhitelistRepository } from '../database/repositories/host-whitelist.repository'

class VisitorController {
  /**
   * 提交访客申请
   */
  async submitApplication(req: Request, res: Response): Promise<void> {
    try {
      const openid = (req as any).user?.openid // 从认证中间件获取
      const formData: Omit<VisitorApplication, 'id' | 'status' | 'submitTime'> = req.body
      
      // 1. 验证被访人是否在白名单中
      const hostExists = await hostWhitelistRepository.findByPhone(formData.hostPhone)
      if (!hostExists || !hostExists.enabled) {
        res.status(400).json({
          code: 400,
          message: '被访人信息不存在或已停用，请核对后重试',
        } as ApiResponse)
        return
      }
      
      // 2. 创建申请记录
      const application: VisitorApplication = {
        ...formData,
        openid,
        status: 'pending',
        submitTime: new Date().toISOString(),
      }
      
      const savedApp = await applicationRepository.create(application)
      
      // 3. 推送到 OA 系统
      try {
        const oaFlowId = await oaService.submitFlow(savedApp)
        savedApp.oaFlowId = oaFlowId
        await applicationRepository.update(savedApp.id!, savedApp)
      } catch (oaError) {
        console.error('推送到 OA 失败:', oaError)
        // OA 推送失败不影响申请提交，但需要记录日志
      }
      
      res.status(201).json({
        code: 0,
        message: '申请提交成功',
        data: {
          id: savedApp.id,
          submitTime: savedApp.submitTime,
        },
      } as ApiResponse)
      
    } catch (error) {
      console.error('提交申请失败:', error)
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
      } as ApiResponse)
    }
  }
  
  /**
   * 获取单个申请详情
   */
  async getApplicationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const openid = (req as any).user?.openid
      
      const application = await applicationRepository.findById(id)
      
      if (!application) {
        res.status(404).json({
          code: 404,
          message: '申请不存在',
        } as ApiResponse)
        return
      }
      
      // 权限检查：仅本人或管理员可查看
      if (application.openid !== openid && !(req as any).user?.isAdmin) {
        res.status(403).json({
          code: 403,
          message: '无权查看该申请',
        } as ApiResponse)
        return
      }
      
      res.status(200).json({
        code: 0,
        message: 'success',
        data: application,
      } as ApiResponse<VisitorApplication>)
      
    } catch (error) {
      console.error('获取申请详情失败:', error)
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
      } as ApiResponse)
    }
  }
  
  /**
   * 获取申请列表（分页）
   */
  async getApplications(req: Request, res: Response): Promise<void> {
    try {
      const openid = (req as any).user?.openid
      const isAdmin = (req as any).user?.isAdmin
      
      const query: PaginationQuery = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 10,
        status: req.query.status as string,
        keyword: req.query.keyword as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      }
      
      // 非管理员只能查看自己的申请
      const filter: any = isAdmin ? {} : { openid }
      
      if (query.status) filter.status = query.status
      if (query.keyword) {
        filter.$or = [
          { name: { $regex: query.keyword, $options: 'i' } },
          { phone: { $regex: query.keyword, $options: 'i' } },
          { hostName: { $regex: query.keyword, $options: 'i' } },
        ]
      }
      if (query.startDate || query.endDate) {
        filter.submitTime = {}
        if (query.startDate) filter.submitTime.$gte = query.startDate
        if (query.endDate) filter.submitTime.$lte = query.endDate
      }
      
      const result = await applicationRepository.findWithPagination(filter, query.page, query.pageSize)
      
      res.status(200).json({
        code: 0,
        message: 'success',
        data: result,
      } as ApiResponse<PaginationResponse<VisitorApplication>>)
      
    } catch (error) {
      console.error('获取申请列表失败:', error)
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
      } as ApiResponse)
    }
  }
  
  /**
   * 更新申请状态（OA 回调接口）
   */
  async updateApplicationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { status, rejectReason, approvalTime, oaFlowId } = req.body
      
      // 验证 OA 回调 token
      const token = req.headers['x-oa-token'] as string
      if (!oaService.verifyCallbackToken(token)) {
        res.status(401).json({
          code: 401,
          message: '未授权的访问',
        } as ApiResponse)
        return
      }
      
      const application = await applicationRepository.findById(id)
      if (!application) {
        res.status(404).json({
          code: 404,
          message: '申请不存在',
        } as ApiResponse)
        return
      }
      
      // 更新状态
      const updateData: Partial<VisitorApplication> = {
        status: status as 'pending' | 'approved' | 'rejected',
        approvalTime: approvalTime || new Date().toISOString(),
      }
      
      if (status === 'rejected') {
        updateData.rejectReason = rejectReason
      }
      
      if (oaFlowId) {
        updateData.oaFlowId = oaFlowId
      }
      
      await applicationRepository.update(id, updateData)
      
      res.status(200).json({
        code: 0,
        message: '状态更新成功',
      } as ApiResponse)
      
    } catch (error) {
      console.error('更新申请状态失败:', error)
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
      } as ApiResponse)
    }
  }
  
  /**
   * 验证被访人信息
   */
  async validateHost(req: Request, res: Response): Promise<void> {
    try {
      const { phone, name } = req.query
      
      if (!phone) {
        res.status(400).json({
          code: 400,
          message: '缺少电话号码参数',
        } as ApiResponse)
        return
      }
      
      const host = await hostWhitelistRepository.findByPhone(phone as string)
      
      if (!host || !host.enabled) {
        res.status(200).json({
          code: 0,
          message: '被访人信息不存在',
          data: { valid: false },
        } as ApiResponse)
        return
      }
      
      // 如果提供了姓名，还需要验证姓名是否匹配
      if (name && host.name !== name) {
        res.status(200).json({
          code: 0,
          message: '被访人姓名不匹配',
          data: { valid: false },
        } as ApiResponse)
        return
      }
      
      res.status(200).json({
        code: 0,
        message: '验证通过',
        data: {
          valid: true,
          name: host.name,
          department: host.department,
        },
      } as ApiResponse)
      
    } catch (error) {
      console.error('验证被访人失败:', error)
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
      } as ApiResponse)
    }
  }
  
  /**
   * 获取被访人白名单列表
   */
  async getHostList(req: Request, res: Response): Promise<void> {
    try {
      const hosts = await hostWhitelistRepository.findAll()
      
      res.status(200).json({
        code: 0,
        message: 'success',
        data: hosts,
      } as ApiResponse)
      
    } catch (error) {
      console.error('获取白名单失败:', error)
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
      } as ApiResponse)
    }
  }
}

export const visitorController = new VisitorController()
