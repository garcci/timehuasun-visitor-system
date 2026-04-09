// backend/src/routes/visitor.js - 访客申请路由

const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');

/**
 * @route   POST /api/visitors/query-by-phone
 * @desc    根据手机号查询用户信息（OA 系统）
 * @access  Public
 */
router.post('/query-by-phone', visitorController.queryUserByPhone);

/**
 * @route   POST /api/visitors/validate-phone
 * @desc    校验手机号（OA 系统）
 * @access  Public
 */
router.post('/validate-phone', visitorController.validatePhone);

/**
 * @route   POST /api/visitors
 * @desc    提交访客申请
 * @access  Public
 */
router.post('/', visitorController.submitApplication);

/**
 * @route   GET /api/visitors
 * @desc    获取申请列表（分页）
 * @access  Public
 * @query   openid      string  用户 openid（必填）
 * @query   page        number  页码，默认 1
 * @query   pageSize    number  每页数量，默认 10
 * @query   status      string  状态筛选：pending/approved/rejected
 */
router.get('/', visitorController.getApplications);

/**
 * @route   GET /api/visitors/:id
 * @desc    获取单个申请详情
 * @access  Public
 */
router.get('/:id', visitorController.getApplicationById);

/**
 * @route   PUT /api/visitors/:id/status
 * @desc    更新申请状态（审批用）
 * @access  Public
 */
router.put('/:id/status', visitorController.updateApplicationStatus);

/**
 * @route   POST /api/visitors/callback/approval
 * @desc    OA 审批结果回调接口
 * @access  OA 系统（需要签名验证）
 */
router.post('/callback/approval', visitorController.approvalCallback);

/**
 * @route   POST /api/visitors/start-km-review
 * @desc    启动 KM 审批流程
 * @access  Public
 */
router.post('/start-km-review', visitorController.startKmReview);

/**
 * @route   GET /api/visitors/circuit-breaker/stats
 * @desc    获取熔断器状态
 * @access  Public
 */
router.get('/circuit-breaker/stats', visitorController.getCircuitBreakerStats);

/**
 * @route   POST /api/visitors/circuit-breaker/reset
 * @desc    重置熔断器
 * @access  Public
 */
router.post('/circuit-breaker/reset', visitorController.resetCircuitBreaker);

/**
 * @route   GET /api/visitors/monitor/metrics
 * @desc    获取监控指标
 * @access  Public
 */
router.get('/monitor/metrics', visitorController.getMonitorMetrics);

module.exports = router;
