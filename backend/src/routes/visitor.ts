// backend/src/routes/visitor.ts - 访客 API 路由

import { Router } from 'express'
import { visitorController } from '../controllers/visitor.controller'
import { authMiddleware } from '../middleware/auth'
import { validateApplication } from '../middleware/validation'

const router = Router()

/**
 * @route   POST /api/visitor/applications
 * @desc    提交访客申请
 * @access  需要微信登录认证
 */
router.post('/applications', authMiddleware, validateApplication, visitorController.submitApplication)

/**
 * @route   GET /api/visitor/applications/:id
 * @desc    获取单个申请详情
 * @access  需要认证（仅本人或管理员）
 */
router.get('/applications/:id', authMiddleware, visitorController.getApplicationById)

/**
 * @route   GET /api/visitor/applications
 * @desc    获取申请列表（支持分页和筛选）
 * @access  公开接口（管理后台使用）
 */
router.get('/applications', visitorController.getApplications)

/**
 * @route   PUT /api/visitor/applications/:id/status
 * @desc    更新申请状态（OA 回调接口）
 * @access  OA 系统回调（需要 token 验证）
 */
router.put('/applications/:id/status', visitorController.updateApplicationStatus)

/**
 * @route   GET /api/visitor/hosts/validate
 * @desc    验证被访人信息（检查白名单）
 * @access  公开接口（可考虑限流）
 */
router.get('/hosts/validate', visitorController.validateHost)

/**
 * @route   GET /api/visitor/hosts/list
 * @desc    获取被访人白名单列表
 * @access  需要认证
 */
router.get('/hosts/list', authMiddleware, visitorController.getHostList)

export default router
