// backend/src/services/oa.service.js - OA 系统集成服务

const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const cacheService = require('./cache.service');
const CircuitBreaker = require('../utils/circuit-breaker');
const logger = require('../config/logger');

/**
 * OA 服务类
 * 负责与 OA 系统进行交互，包括发起审批和接收回调
 */
class OaService {
  constructor() {
    // 创建 OA 接口熔断器
    this.oaBreaker = new CircuitBreaker({
      failureThreshold: 5,    // 连续失败 5 次
      resetTimeout: 60000,    // 60 秒后尝试恢复
      monitoringPeriod: 10000 // 10 秒监控周期
    });
  }
  /**
   * 调用签名生成方法
   * @param {Object} data - 需要签名的数据
   * @returns {string} 签名值
   */
  generateSign(data) {
    const sortedKeys = Object.keys(data).sort();
    const str = sortedKeys.map(key => `${key}=${data[key]}`).join('&') + config.oa.apiSecret;
    return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
  }

  /**
   * 验证 OA 回调的签名
   * @param {Object} params - 回调参数
   * @param {string} signature - 签名值
   * @returns {boolean} 验证是否通过
   */
  verifyCallbackSignature(params, signature) {
    const { sign, ...data } = params;
    const expectedSign = this.generateSign(data);
    return expectedSign === signature;
  }

  /**
   * 根据手机号查询 OA 系统中的用户信息（带缓存和熔断保护）
   * @param {Object} params - 查询参数
   * @param {string} params.phone - 手机号
   * @param {string} [params.type='host'] - 查询类型：host-被访人，visitor-访客，companion-随行人员
   * @returns {Promise<Object>} 查询结果
   */
  async queryUserByPhone(params) {
    // 在前端先验证手机号格式
    if (!params.phone || typeof params.phone !== 'string') {
      throw new Error('手机号不能为空');
    }

    // 生成缓存 key（格式：oa:phone:{phone}:{type}）
    const cacheKey = `oa:phone:${params.phone}:${params.type || 'host'}`;

    // 尝试从缓存获取
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      logger.cacheHit(cacheKey, true);
      return cachedData;
    }

    logger.cacheHit(cacheKey, false);
    logger.info('缓存未命中，查询 OA 系统...', { phone: params.phone, type: params.type });

    try {
      // 使用熔断器包装 OA 接口调用
      const result = await this.oaBreaker.execute(async () => {
        const url = `${config.oa.baseUrl}/api/pro-visitor/proVisitorRestService/verifyMobile`;
        
        const requestData = {
          mobile: params.phone,
        };

        const startTime = Date.now();
        logger.info('正在验证 OA 系统手机号并获取用户信息...', {
          url: url.replace(config.oa.baseUrl, '[OA_BASE]'),
          mobile: params.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
        });

        const response = await axios.post(url, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': config.oa.authorization, // Basic Auth
          },
          timeout: 10000,
        });

        const duration = Date.now() - startTime;
        logger.oaCall('verifyMobile', { mobile: params.phone }, response.data, duration);

        return response.data;
      });

      // 解析结果
      let finalResult;
      if (result.success) {
        // 手机号存在，返回完整用户信息
        finalResult = {
          success: true,
          found: true,
          data: {
            loginName: result.loginName || '',
            name: result.name || '',
            phone: params.phone,
            department: result.department || '',
            employeeId: result.employeeId || ''
          }
        };
      } else {
        // 手机号不存在
        finalResult = {
          success: true,
          found: false,
          message: result.message || '该手机号未在 OA 系统中登记',
          suggestion: '请检查手机号是否正确，或联系被访人确认'
        };
      }

      // 写入缓存（5 分钟）
      await cacheService.set(cacheKey, finalResult, 300);
      logger.info('OA 查询结果已缓存', { cacheKey, ttl: 300 });

      return finalResult;
    } catch (error) {
      logger.error('OA 查询失败', error, { phone: params.phone, type: params.type });
      
      // 判断是否为熔断器打开
      if (error.code === 'CIRCUIT_BREAKER_OPEN') {
        logger.warn('熔断器打开，拒绝 OA 请求', { phone: params.phone });
        return {
          success: false,
          found: false,
          message: 'OA 系统暂时不可用（熔断保护），请稍后重试',
          circuitBreaker: true,
          nextAttempt: this.oaBreaker.nextAttempt
        };
      }
      
      // 错误缓存 1 分钟
      const errorResult = {
        success: false,
        found: false,
        message: 'OA 系统暂时不可用，请稍后重试',
        error: error.message,
      };
      
      await cacheService.set(cacheKey, errorResult, 60);
      logger.info('OA 错误结果已缓存', { cacheKey, ttl: 60 });
      
      return errorResult;
    }
  }

  /**
   * 校验手机号
   * @param {Object} params - 校验参数
   * @param {string} params.phone - 手机号
   * @param {string} [params.name] - 姓名（可选）
   * @param {string} [params.idCard] - 身份证号（可选）
   * @param {string} [params.type='visitor'] - 校验类型：visitor-访客，host-被访人，companion-随行人员
   * @returns {Promise<Object>} 校验结果
   */
  async validatePhone(params) {
    try {
      const url = `${config.oa.baseUrl}/api/visitors/validate-phone`;
      
      const requestData = {
        phone: params.phone,
        name: params.name || '',
        idCard: params.idCard || '',
        type: params.type || 'visitor',
        timestamp: Date.now(),
      };

      // 生成签名
      requestData.sign = this.generateSign(requestData);

      const response = await axios.post(url, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.oa.apiKey,
        },
        timeout: 10000,
      });

      if (response.data && response.data.code === 0) {
        return {
          success: true,
          valid: response.data.data.valid,
          data: response.data.data,
        };
      } else {
        return {
          success: true,
          valid: false,
          reason: response.data.data?.reason || 'UNKNOWN_ERROR',
          message: response.data.message || '校验失败',
          suggestion: response.data.data?.suggestion || '',
        };
      }
    } catch (error) {
      console.error('调用手机号校验接口失败:', error.message);
      // 如果 OA 系统不可用，默认放行（可配置）
      return {
        success: false,
        valid: true, // 故障时默认通过，可修改为 false
        message: 'OA 系统不可用，暂时跳过校验',
        error: error.message,
      };
    }
  }

  /**
   * 处理 OA 审批结果回调
   * @param {Object} callbackData - OA 回调数据
   * @returns {Promise<Object>} 处理结果
   */
  async handleApprovalCallback(callbackData) {
    try {
      const { 
        applicationId, 
        oaFlowId, 
        status, 
        approvalTime, 
        rejectReason,
        approverName,
        approverPhone 
      } = callbackData;

      console.log('📥 收到 OA 审批结果回调:', callbackData);

      // 验证签名（开发环境暂时跳过）
      const signature = callbackData.sign;
      if (process.env.NODE_ENV !== 'development') {
        if (!this.verifyCallbackSignature(callbackData, signature)) {
          console.error('❌ 回调签名验证失败');
          throw new Error('签名验证失败');
        }
        console.log('✅ 回调签名验证通过');
      } else {
        console.log('⚠️  开发环境，跳过签名验证');
      }

      // 返回处理结果，由控制器更新数据库
      return {
        applicationId,
        oaFlowId,
        status: status === 'approved' ? 'approved' : 'rejected',
        approvalTime: approvalTime || new Date().toISOString(),
        rejectReason: rejectReason || null,
        approverInfo: {
          name: approverName,
          phone: approverPhone
        }
      };
    } catch (error) {
      console.error('❌ 处理 OA 回调失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询 OA 审批进度（可选功能）
   * @param {string} oaFlowId - OA 流程 ID
   * @returns {Promise<Object>} 审批进度信息
   */
  async queryApprovalProgress(oaFlowId) {
    try {
      const url = `${config.oa.baseUrl}/api/approval/progress/${oaFlowId}`;
      
      const response = await axios.get(url, {
        headers: {
          'X-API-Key': config.oa.apiKey,
        },
        timeout: 5000,
      });

      if (response.data && response.data.code === 0) {
        return response.data.data;
      } else {
        throw new Error('查询进度失败');
      }
    } catch (error) {
      console.error('查询 OA 审批进度失败:', error.message);
      throw error;
    }
  }

  /**
   * 调用 OA KM 审批接口启动流程
   * @param {Object} formData - 表单数据
   * @param {string} formData.subject - 文档标题
   * @param {string} formData.templateId - 模板 ID
   * @param {Object} formData.formValues - 表单值对象
   * @param {string} formData.creatorLoginName - 创建人登录名
   * @returns {Promise<Object>} OA 返回的审批流信息
   */
  async startKmReviewFlow(formData) {
    try {
      const url = `${config.oa.baseUrl}/api/km-review/kmReviewRestServiceNew/addReview`;
      
      // 准备 FormData（multipart/form-data）
      const FormData = require('form-data');
      const form = new FormData();
      
      // 添加字段
      form.append('docSubject', formData.subject || '来访人员登记');
      form.append('fdTemplateId', formData.templateId || '19a6b6c4b5665792716b86a4f34be6bf');
      form.append('formValues', JSON.stringify(formData.formValues));
      form.append('docCreator', JSON.stringify({ LoginName: formData.creatorLoginName || 'admin' }));
      
      console.log('📤 正在调用 OA KM 审批接口启动流程...');
      console.log('请求 URL:', url);
      console.log('请求数据:', {
        docSubject: formData.subject,
        fdTemplateId: formData.templateId,
        formValues: formData.formValues,
        docCreator: formData.creatorLoginName
      });

      const response = await axios.post(url, form, {
        headers: {
          'Authorization': config.oa.authorization, // Basic Auth
          ...form.getHeaders(), // Content-Type with boundary
        },
        timeout: 15000, // 15 秒超时
      });

      console.log('📥 OA KM 审批返回结果:', response.data);

      // 解析返回结果
      if (response.data && response.data.success) {
        console.log('✅ OA KM 审批流程启动成功');
        return {
          success: true,
          data: response.data,
          message: '审批流程启动成功'
        };
      } else {
        console.error('❌ OA KM 接口返回错误:', response.data);
        return {
          success: false,
          message: response.data.message || 'OA KM 接口调用失败',
          data: response.data
        };
      }
    } catch (error) {
      console.error('❌ 调用 OA KM 接口失败:', error.message);
      return {
        success: false,
        message: 'OA KM 系统暂时不可用，请稍后重试',
        error: error.message,
      };
    }
  }

  /**
   * 获取熔断器状态
   * @returns {Object} 熔断器统计信息
   */
  getCircuitBreakerStats() {
    return this.oaBreaker.getStats();
  }

  /**
   * 手动重置熔断器
   */
  resetCircuitBreaker() {
    this.oaBreaker.reset();
  }
}

// 导出单例
module.exports = new OaService();
