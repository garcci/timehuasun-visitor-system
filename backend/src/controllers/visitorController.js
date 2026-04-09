// backend/src/controllers/visitorController.js - 访客申请控制器（MySQL 版本）

const { query } = require('../database/mysql');
const { v4: uuidv4 } = require('uuid');
const oaService = require('../services/oa.service'); // 使用全局 config
const monitorService = require('../services/monitor.service');

/**
 * 将数据库字段转换为驼峰命名
 */
function convertToCamelCase(row) {
  if (!row) return null;
  
  // 处理主表数据
  const converted = {
    ...row,
    idType: row.id_type,
    idCard: row.id_card,
    organization: row.organization,
    plateNumber: row.plate_number,
    hostName: row.host_name,
    hostPhone: row.host_phone,
    visitDate: row.visit_date,
    visitTime: row.visit_time,
    endDate: row.end_date,
    endTime: row.end_time,
    purpose: row.purpose,
    remark: row.remark,
    status: row.status,
    submitTime: row.submit_time,
    approvalTime: row.approval_time,
    rejectReason: row.reject_reason,
    oaFlowId: row.oa_flow_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  
  // 删除下划线风格的字段
  delete converted.id_type;
  delete converted.id_card;
  delete converted.plate_number;
  delete converted.host_name;
  delete converted.host_phone;
  delete converted.visit_date;
  delete converted.visit_time;
  delete converted.end_date;
  delete converted.end_time;
  delete converted.submit_time;
  delete converted.approval_time;
  delete converted.reject_reason;
  delete converted.oa_flow_id;
  delete converted.created_at;
  delete converted.updated_at;
  
  return converted;
}

/**
 * 根据手机号查询用户信息
 * POST /api/visitors/query-by-phone
 */
exports.queryUserByPhone = async (req, res) => {
  try {
    const { phone, type } = req.body;
    
    // 参数验证
    if (!phone) {
      return res.status(400).json({ 
        code: 400, 
        message: '缺少手机号参数' 
      });
    }
    
    // 验证手机号格式（必须是 11 位数字）
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        code: 400,
        message: '手机号格式不正确，请输入 11 位数字'
      });
    }
    
    // 注意：type 参数是可选的，默认使用'host'
    const finalType = (type !== undefined && type !== null) ? type : 'host';
    
    // 验证 type 参数（可选，但有值时必须正确）
    const validTypes = ['host', 'visitor', 'companion'];
    if (!validTypes.includes(finalType)) {
      return res.status(400).json({
        code: 400,
        message: `type 参数必须是以下值之一：${validTypes.join(', ')}`
      });
    }
    
    // 限制请求体大小（防止超大请求）
    const requestSize = JSON.stringify(req.body).length;
    if (requestSize > 10240) { // 10KB
      return res.status(400).json({
        code: 400,
        message: '请求体过大'
      });
    }
    
    // 调用 OA 服务进行查询
    const result = await oaService.queryUserByPhone({
      phone,
      type: finalType
    });
    
    if (!result.success) {
      // OA 系统不可用
      return res.status(503).json({
        code: 503,
        message: result.message || '系统繁忙，请稍后重试',
        error: result.error
      });
    }
    
    if (result.found) {
      // 查询成功，返回用户信息
      res.json({
        code: 0,
        message: '查询成功',
        data: {
          found: true,
          phone: phone,
          name: result.data.name,
          loginName: result.data.loginName,
          department: result.data.department || '',
          employeeId: result.data.employeeId || ''
        }
      });
    } else {
      // 未查询到该手机号
      res.json({
        code: 1001,
        message: '该手机号未在 OA 系统中登记',
        data: {
          found: false,
          phone: phone,
          suggestion: result.suggestion || '请检查手机号是否正确，或联系被访人确认'
        }
      });
    }
  } catch (error) {
    console.error('手机号查询失败:', error);
    
    // 区分错误类型
    let statusCode = 500;
    let message = '查询失败，请稍后重试';
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ETIMEDOUT') {
      statusCode = 504;
      message = '查询超时，请检查网络连接';
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 503;
      message = '无法连接到 OA 系统';
    } else if (error.response?.status === 401) {
      statusCode = 503;
      message = 'OA 系统认证失败，请联系管理员';
    }
    
    res.status(statusCode).json({
      code: statusCode,
      message,
      error: error.message
    });
  }
};

/**
 * 校验手机号
 * POST /api/visitors/validate-phone
 */
exports.validatePhone = async (req, res) => {
  try {
    const { phone, name, idCard, type } = req.body;
    
    // 参数验证
    if (!phone) {
      return res.status(400).json({ 
        code: 400, 
        message: '缺少手机号参数' 
      });
    }
    
    // 调用 OA 服务进行校验
    const result = await oaService.validatePhone({
      phone,
      name: name || '',
      idCard: idCard || '',
      type: type || 'visitor'
    });
    
    if (result.success && result.valid) {
      res.json({
        code: 0,
        message: '手机号校验通过',
        data: result.data || { valid: true }
      });
    } else {
      res.json({
        code: 1001,
        message: result.message || '手机号校验不通过',
        data: {
          valid: false,
          reason: result.reason || 'UNKNOWN_ERROR',
          suggestion: result.suggestion || '请检查手机号是否正确',
          phone: phone
        }
      });
    }
  } catch (error) {
    console.error('手机号校验失败:', error);
    res.status(500).json({
      code: 500,
      message: '校验失败，请稍后重试',
      error: error.message
    });
  }
};

/**
 * 提交访客申请
 * POST /api/visitors
 */
exports.submitApplication = async (req, res) => {
  try {
    const { openid, companions, ...applicationData } = req.body;
    
    // 参数验证
    if (!openid) {
      return res.status(400).json({ 
        code: 400, 
        message: '缺少 openid 参数' 
      });
    }
    
    // 生成申请 ID
    const applicationId = uuidv4();
    
    // 使用本地时间（中国时区 UTC+8）
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const submitTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    // 插入主表数据 - 确保所有参数都有默认值，避免 undefined
    await query(`
      INSERT INTO visitor_applications (
        id, openid, name, phone, id_type, id_card, organization, plate_number,
        host_name, host_phone, visit_date, visit_time, end_date, end_time,
        purpose, remark, status, submit_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      applicationId,
      openid,
      applicationData.name,
      applicationData.phone,
      applicationData.idType || '居民身份证',
      applicationData.idCard || '',
      applicationData.organization || '',
      applicationData.plateNumber || '',
      applicationData.hostName,
      applicationData.hostPhone,
      applicationData.visitDate,
      applicationData.visitTime || null,
      applicationData.endDate || null,
      applicationData.endTime || null,
      applicationData.purpose,
      applicationData.remark || '',
      'pending',
      submitTime
    ]);
    
    // 插入随行人员数据
    if (companions && companions.length > 0) {
      for (const companion of companions) {
        await query(`
          INSERT INTO visitor_companions (application_id, name, id_card, phone)
          VALUES (?, ?, ?, ?)
        `, [applicationId, companion.name, companion.idCard, companion.phone || '']);
      }
    }
    
    console.log(`✅ 收到新的访客申请：${applicationId}`);
    
    // 异步调用 OA KM 审批接口启动审批流程
    // 不阻塞主流程，即使 OA 调用失败也不影响申请提交
    (async () => {
      try {
        // 准备表单数据（与 startKmReview 相同的逻辑）
        const formValues = {
          fd_visitor_s_name: applicationData.name,
          fd_contact_phone_number: applicationData.phone,
          fd_document_type: applicationData.idType || '居民身份证',
          fd_document_number: applicationData.idCard || '',
          fd_visiting_unit: applicationData.organization || '',
          fd_license_plate_number: applicationData.plateNumber || '',
          fd_contact_number_of_the_interviewee: applicationData.hostPhone,
          fd_interviewee_s_name: applicationData.hostName,
          fd_visiting_time: `${applicationData.visitDate} ${applicationData.visitTime}`,
          fd_visit_end_time: `${applicationData.endDate} ${applicationData.endTime}`,
          fd_purpose_of_visit: applicationData.purpose,
          // 随行人员字段（平铺结构）
          'fd_accompanying_personnel.fd_name_of_entourage': [],
          'fd_accompanying_personnel.fd_identity_card_number': [],
          'fd_accompanying_personnel.fd_contact_number_of_entourage': []
        };
        
        // 如果有随行人员，添加到表单中
        if (companions && companions.length > 0) {
          companions.forEach(companion => {
            formValues['fd_accompanying_personnel.fd_name_of_entourage'].push(companion.name || '');
            formValues['fd_accompanying_personnel.fd_identity_card_number'].push(companion.idCard || '');
            formValues['fd_accompanying_personnel.fd_contact_number_of_entourage'].push(companion.phone || '');
          });
          
          console.log(`📊 找到 ${companions.length} 名随行人员`);
        }
        
        // 获取被访人登录名（如果有的话）
        const creatorLoginName = applicationData.hostLoginName || 'admin';
        
        // 调用 OA KM 审批接口
        const oaResult = await oaService.startKmReviewFlow({
          subject: '来访人员登记',
          templateId: '19d57b3d17147da385a03924492ad823', // 生产环境模板 ID
          formValues: formValues,
          creatorLoginName: creatorLoginName
        });
        
        console.log('🔍 OA 返回结果:', JSON.stringify(oaResult, null, 2));
        
        // 保存 OA 流程 ID 到数据库
        if (oaResult.success && oaResult.data) {
          // 尝试多种可能的字段名获取 flowId
          const responseData = oaResult.data;
          let oaFlowId = '';
          
          // OA 返回格式：{"success":true,"code":"200","data":"flow_id_string"}
          // data 直接是字符串类型的 flowId
          if (typeof responseData === 'string') {
            oaFlowId = responseData;
          } else if (responseData.flowId) {
            oaFlowId = responseData.flowId;
          } else if (responseData.data && typeof responseData.data === 'string') {
            oaFlowId = responseData.data;
          } else if (responseData.data && responseData.data.flowId) {
            oaFlowId = responseData.data.flowId;
          } else if (responseData.fdId) {
            oaFlowId = responseData.fdId;
          } else if (responseData.docId) {
            oaFlowId = responseData.docId;
          }
          
          if (oaFlowId) {
            await query(
              'UPDATE visitor_applications SET oa_flow_id = ? WHERE id = ?',
              [oaFlowId, applicationId]
            );
            console.log(`✅ OA 流程 ID 已保存到数据库：${oaFlowId}`);
          } else {
            console.warn('⚠️  OA 返回成功但未找到流程 ID，完整响应:', JSON.stringify(responseData));
          }
        } else {
          console.warn('⚠️  OA 调用失败:', oaResult.message);
        }
      } catch (error) {
        console.error('❌ 启动 OA 审批流程失败:', error.message);
        // 记录错误，但不影响用户提交
        // 可以后续通过定时任务重试或人工处理
      }
    })();
    
    res.json({
      code: 0,
      message: '申请提交成功',
      data: {
        id: applicationId,
        submitTime: submitTime
      }
    });
  } catch (error) {
    console.error('提交申请失败:', error);
    res.status(500).json({
      code: 500,
      message: '提交申请失败',
      error: error.message
    });
  }
};

/**
 * 获取申请列表（分页）
 * GET /api/visitors?openid=xxx&page=1&pageSize=10&status=pending
 */
exports.getApplications = async (req, res) => {
  try {
    const { openid, page = 1, pageSize = 10, status } = req.query;
    
    if (!openid) {
      return res.status(400).json({ 
        code: 400, 
        message: '缺少 openid 参数' 
      });
    }
    
    // 构建查询条件
    let sql = `SELECT * FROM visitor_applications WHERE openid = ?`;
    const params = [openid];
    
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    
    sql += ` ORDER BY submit_time DESC`;
    
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const offset = (pageNum - 1) * pageSizeNum;
    
    // 直接在 SQL 中使用数字，不使用参数绑定
    const applications = await query(`${sql} LIMIT ${offset}, ${pageSizeNum}`, [openid]);
    
    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM visitor_applications WHERE openid = ?`;
    const countParams = [openid];
    
    if (status) {
      countSql += ` AND status = ?`;
      countParams.push(status);
    }
    
    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;
    
    // 获取每个申请的随行人员
    const applicationsWithCompanions = await Promise.all(
      applications.map(async (app) => {
        const companions = await query(
          'SELECT * FROM visitor_companions WHERE application_id = ?',
          [app.id]
        );
        return {
          ...convertToCamelCase(app),
          companions: companions.map(convertToCamelCase) // 转换为驼峰命名
        };
      })
    );
    
    res.json({
      code: 0,
      message: 'success',
      data: {
        list: applicationsWithCompanions,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取申请列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取申请列表失败',
      error: error.message
    });
  }
};

/**
 * 获取单个申请详情
 * GET /api/visitors/:id
 */
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await query(
      'SELECT * FROM visitor_applications WHERE id = ?',
      [id]
    );
    
    if (!application || application.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '申请不存在'
      });
    }
    
    // 获取随行人员
    const companions = await query(
      'SELECT * FROM visitor_companions WHERE application_id = ?',
      [id]
    );
    
    res.json({
      code: 0,
      message: 'success',
      data: {
        ...convertToCamelCase(application[0]),
        companions: companions.map(convertToCamelCase) // 转换为驼峰命名
      }
    });
  } catch (error) {
    console.error('获取申请详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取申请详情失败',
      error: error.message
    });
  }
};

/**
 * 更新申请状态（审批用）
 * PUT /api/visitors/:id/status
 */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        code: 400,
        message: '无效的审批状态'
      });
    }
    
    const application = await query(
      'SELECT * FROM visitor_applications WHERE id = ?',
      [id]
    );
    
    if (!application || application.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '申请不存在'
      });
    }
    
    const approvalTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    await query(`
      UPDATE visitor_applications 
      SET status = ?, approval_time = ?, reject_reason = ?
      WHERE id = ?
    `, [status, approvalTime, rejectReason || null, id]);
    
    console.log(`✅ 申请 ${id} 已${status === 'approved' ? '通过' : '拒绝'}`);
    
    res.json({
      code: 0,
      message: '审批成功',
      data: {
        ...application[0],
        status,
        approvalTime,
        rejectReason: rejectReason || null
      }
    });
  } catch (error) {
    console.error('更新申请状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新申请状态失败',
      error: error.message
    });
  }
};

/**
 * OA 审批结果回调接口
 * POST /api/visitors/callback/approval
 * 
 * OA 系统回调参数示例：
 * {
 *   "applicationId": "申请 ID",
 *   "oaFlowId": "OA 流程 ID",
 *   "status": "approved" | "rejected",
 *   "approvalTime": "2026-04-01 10:00:00",
 *   "rejectReason": "拒绝原因（如果被拒）",
 *   "approverName": "审批人姓名",
 *   "approverPhone": "审批人电话",
 *   "sign": "签名"
 * }
 */
exports.approvalCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    
    console.log('📥 收到 OA 回调请求:', JSON.stringify(callbackData, null, 2));
    
    // 验证签名
    const signature = req.headers['x-oa-signature'] || callbackData.sign;
    if (!signature) {
      return res.status(400).json({
        code: 400,
        message: '缺少签名参数'
      });
    }
    
    // 使用 oaService 处理回调
    const result = await oaService.handleApprovalCallback({
      ...callbackData,
      sign: signature
    });
    
    // 更新数据库状态
    const approvalTime = result.approvalTime ? result.approvalTime.replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // 优先使用 applicationId，如果没有则通过 oaFlowId 查找
    let applicationId = result.applicationId;
    
    if (!applicationId && result.oaFlowId) {
      // 通过 oaFlowId 查找申请记录
      const applications = await query(
        'SELECT id FROM visitor_applications WHERE oa_flow_id = ?',
        [result.oaFlowId]
      );
      
      if (!applications || applications.length === 0) {
        return res.status(404).json({
          code: 404,
          message: `未找到 OA 流程 ID 为 ${result.oaFlowId} 的申请记录`
        });
      }
      
      applicationId = applications[0].id;
      console.log(`🔍 通过 oaFlowId 找到申请记录: ${applicationId}`);
    }
    
    if (!applicationId) {
      return res.status(400).json({
        code: 400,
        message: '缺少 applicationId 且无法通过 oaFlowId 查找'
      });
    }
    
    await query(`
      UPDATE visitor_applications 
      SET status = ?, 
          approval_time = ?, 
          reject_reason = ?,
          oa_flow_id = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [
      result.status,
      approvalTime,
      result.rejectReason || null,
      result.oaFlowId || null,
      applicationId
    ]);
    
    console.log(`✅ OA 回调处理完成，申请 ${applicationId} 状态已更新为 ${result.status}`);
    
    res.json({
      code: 0,
      message: '回调处理成功'
    });
  } catch (error) {
    console.error('❌ 处理 OA 回调失败:', error);
    res.status(500).json({
      code: 500,
      message: '回调处理失败',
      error: error.message
    });
  }
};

/**
 * 启动 KM 审批流程
 * POST /api/visitors/start-km-review
 */
exports.startKmReview = async (req, res) => {
  try {
    const { applicationId, creatorLoginName } = req.body;
    
    // 参数验证
    if (!applicationId) {
      return res.status(400).json({
        code: 400,
        message: '缺少申请 ID 参数'
      });
    }
    
    // 查询申请数据
    const applications = await query(`
      SELECT * FROM visitor_applications 
      WHERE id = ?
    `, [applicationId]);
    
    if (!applications || applications.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '申请不存在'
      });
    }
    
    const app = convertToCamelCase(applications[0]);
    
    // 查询随行人员数据
    const companionsRows = await query(`
      SELECT * FROM visitor_companions 
      WHERE application_id = ?
    `, [applicationId]);
    
    // 准备表单数据
    const formValues = {
      fd_visitor_s_name: app.name,
      fd_contact_phone_number: app.phone,
      fd_document_type: app.idType || '身份证',
      fd_document_number: app.idCard || '',
      fd_visiting_unit: app.organization || '',
      fd_license_plate_number: app.plateNumber || '',
      fd_contact_number_of_the_interviewee: app.hostPhone,
      fd_interviewee_s_name: app.hostName,
      fd_visiting_time: `${app.visitDate} ${app.visitTime}`,
      fd_visit_end_time: `${app.endDate} ${app.endTime}`,
      fd_purpose_of_visit: app.purpose,
      // 随行人员字段（平铺结构，不是嵌套对象）
      'fd_accompanying_personnel.fd_name_of_entourage': [],
      'fd_accompanying_personnel.fd_identity_card_number': [],
      'fd_accompanying_personnel.fd_contact_number_of_entourage': []
    };
    
    // 如果有随行人员，添加到表单中
    if (companionsRows && companionsRows.length > 0) {
      companionsRows.forEach(companion => {
        formValues['fd_accompanying_personnel.fd_name_of_entourage'].push(companion.name || '');
        formValues['fd_accompanying_personnel.fd_identity_card_number'].push(companion.id_card || '');
        formValues['fd_accompanying_personnel.fd_contact_number_of_entourage'].push(companion.phone || '');
      });
      
      console.log(`📊 找到 ${companionsRows.length} 名随行人员`);
      console.log('📋 随行人员数据:', {
        names: formValues['fd_accompanying_personnel.fd_name_of_entourage'],
        idCards: formValues['fd_accompanying_personnel.fd_identity_card_number'],
        phones: formValues['fd_accompanying_personnel.fd_contact_number_of_entourage']
      });
    } else {
      console.log('ℹ️ 该申请没有随行人员');
    }
    
    // 调用 OA 服务启动 KM 审批流程
    const result = await oaService.startKmReviewFlow({
      subject: '来访人员登记',
      templateId: '19a6b6c4b5665792716b86a4f34be6bf',
      formValues: formValues,
      creatorLoginName: creatorLoginName || 'admin'
    });
    
    if (result.success) {
      // 更新数据库，保存 OA 流程 ID（如果有的话）
      const oaFlowId = result.data?.flowId || result.data?.data?.flowId || '';
      
      if (oaFlowId) {
        await query(`
          UPDATE visitor_applications 
          SET oa_flow_id = ?, updated_at = NOW()
          WHERE id = ?
        `, [oaFlowId, applicationId]);
      }
      
      console.log(`✅ KM 审批流程启动成功，申请 ID: ${applicationId}, OA 流程 ID: ${oaFlowId}`);
      
      res.json({
        code: 0,
        message: '审批流程启动成功',
        data: {
          applicationId: applicationId,
          oaFlowId: oaFlowId,
          result: result.data
        }
      });
    } else {
      console.error('❌ KM 审批流程启动失败:', result.message);
      
      res.status(500).json({
        code: 500,
        message: result.message || '审批流程启动失败',
        data: result.data
      });
    }
  } catch (error) {
    console.error('❌ 启动 KM 审批流程失败:', error);
    res.status(500).json({
      code: 500,
      message: '启动审批流程失败',
      error: error.message
    });
  }
};

/**
 * 获取熔断器状态
 * GET /api/visitors/circuit-breaker/stats
 */
exports.getCircuitBreakerStats = async (req, res) => {
  try {
    const stats = oaService.getCircuitBreakerStats();
    
    res.json({
      code: 0,
      message: '获取成功',
      data: stats
    });
  } catch (error) {
    console.error('获取熔断器状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取状态失败',
      error: error.message
    });
  }
};

/**
 * 重置熔断器
 * POST /api/visitors/circuit-breaker/reset
 */
exports.resetCircuitBreaker = async (req, res) => {
  try {
    oaService.resetCircuitBreaker();
    
    res.json({
      code: 0,
      message: '熔断器已重置'
    });
  } catch (error) {
    console.error('重置熔断器失败:', error);
    res.status(500).json({
      code: 500,
      message: '重置失败',
      error: error.message
    });
  }
};

/**
 * 获取监控指标
 * GET /api/visitors/monitor/metrics
 */
exports.getMonitorMetrics = async (req, res) => {
  try {
    const metrics = monitorService.getMetrics();
    
    res.json({
      code: 0,
      message: '获取成功',
      data: metrics
    });
  } catch (error) {
    console.error('获取监控指标失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取失败',
      error: error.message
    });
  }
};
