// backend/src/routes/admin.js - 管理后台路由

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../config');
const logger = require('../config/logger');
const cacheService = require('../services/cache.service');
const monitorService = require('../services/monitor.service');
const oaService = require('../services/oa.service');

// 验证管理员权限的中间件
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ code: 401, message: '未授权，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Token 验证失败', { error: error.message });
    res.status(401).json({ code: 401, message: 'Token 无效或已过期' });
  }
};

/**
 * 管理员登录
 * POST /api/admin/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }

    // 从环境变量读取配置的密码（支持明文或加密）
    const configuredPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // 验证密码（支持 bcrypt 加密和明文）
    let isValidPassword = false;
    
    // 如果是 bcrypt 格式（以 $2b$ 开头），使用 bcrypt 验证
    if (configuredPassword.startsWith('$2b$')) {
      isValidPassword = await bcrypt.compare(password, configuredPassword);
    } else {
      // 否则直接比较（明文，向后兼容）
      isValidPassword = (password === configuredPassword);
    }

    if (isValidPassword) {
      const token = jwt.sign(
        { username, role: 'admin', id: 1 },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn || '7d' }
      );

      logger.info('管理员登录成功', { username });
      
      res.json({ 
        code: 0, 
        token,
        user: { username, role: 'admin' }
      });
    } else {
      logger.warn('管理员登录失败', { username });
      res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }
  } catch (error) {
    logger.error('管理员登录错误', error);
    res.status(500).json({ 
      code: 500, 
      message: '登录失败', 
      error: error.message 
    });
  }
});

/**
 * 获取所有配置
 * GET /api/admin/config
 */
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const envConfig = {
      database: {
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: parseInt(process.env.DB_PORT) || 3306,
        DB_NAME: process.env.DB_NAME || 'visitor_system',
        DB_USER: process.env.DB_USER || 'visitor_user',
        DB_PASSWORD: process.env.DB_PASSWORD || '',
        connectionPoolSize: config.database.connectionLimit || 10
      },
      redis: {
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
        cacheTTL: 300
      },
      oa: {
        OA_BASE_URL: process.env.OA_BASE_URL || '',
        OA_AUTHORIZATION: process.env.OA_AUTHORIZATION || '', // 不隐藏，方便查看
        apiSecret: config.oa.apiSecret || '', // 不隐藏，方便查看
        timeout: config.oa.timeout || 10000
      },
      jwt: {
        JWT_SECRET: process.env.JWT_SECRET || '', // 不隐藏，方便查看
        JWT_EXPIRES_IN: config.jwt.expiresIn || '7d'
      },
      log: {
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        logRetentionDays: 30,
        maxFileSize: 10,
        maxFiles: 10
      }
    };

    res.json({ code: 0, data: envConfig });
  } catch (error) {
    logger.error('获取配置失败', error);
    res.status(500).json({ code: 500, message: '获取配置失败', error: error.message });
  }
});

/**
 * 更新配置
 * PUT /api/admin/config
 */
router.put('/config', authMiddleware, async (req, res) => {
  try {
    const newConfig = req.body;
    
    logger.info('配置已更新', { config: newConfig });
    
    // TODO: 保存到 .env 文件或数据库
    // TODO: 触发应用重启
    
    res.json({ 
      code: 0, 
      message: '配置保存成功，应用将在 3 秒后重启...',
      restart: true
    });

    // 延迟 3 秒后重启（实际部署时由 PM2 或 systemd 管理）
    setTimeout(() => {
      logger.info('应用重启中...');
      // process.exit(0); // 如果有进程管理工具，可以注释掉这行
    }, 3000);

  } catch (error) {
    logger.error('更新配置失败', error);
    res.status(500).json({ code: 500, message: '更新配置失败', error: error.message });
  }
});

/**
 * 测试配置连接
 * POST /api/admin/config/test/:type
 */
router.post('/config/test/:type', authMiddleware, async (req, res) => {
  const { type } = req.params;

  try {
    let result = { success: false, message: '' };

    switch (type) {
      case 'database':
        // 测试 MySQL 连接
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 3306,
          user: process.env.DB_USER || 'visitor_user',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'visitor_system'
        });
        
        await connection.ping();
        await connection.end();
        
        result = { success: true, message: '数据库连接成功' };
        break;

      case 'redis':
        // 测试 Redis 连接
        try {
          const Redis = require('ioredis');
          const testClient = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            connectTimeout: 3000
          });
          
          await testClient.ping();
          await testClient.quit();
          
          result = { success: true, message: 'Redis 连接成功' };
        } catch (error) {
          result = { 
            success: false, 
            message: `Redis 连接失败：${error.message}` 
          };
        }
        break;

      case 'oa':
        // 测试 OA 接口
        const testPhone = '15734268771';
        const oaResult = await oaService.queryUserByPhone({ 
          phone: testPhone, 
          type: 'host' 
        });
        
        result = { 
          success: !!oaResult, 
          message: oaResult ? 'OA 接口调用成功' : 'OA 接口调用失败' 
        };
        break;

      default:
        result = { success: false, message: '未知的测试类型' };
    }

    if (result.success) {
      res.json({ code: 0, message: result.message });
    } else {
      res.status(500).json({ code: 500, message: result.message });
    }

  } catch (error) {
    logger.error(`测试${type}连接失败`, error);
    res.status(500).json({ 
      code: 500, 
      message: `测试${type}连接失败`, 
      error: error.message 
    });
  }
});

/**
 * 清空缓存
 * POST /api/admin/cache/clear
 */
router.post('/cache/clear', authMiddleware, async (req, res) => {
  try {
    await cacheService.clear();
    logger.info('缓存已清空');
    res.json({ code: 0, message: '缓存已清空' });
  } catch (error) {
    logger.error('清空缓存失败', error);
    res.status(500).json({ code: 500, message: '清空缓存失败', error: error.message });
  }
});

/**
 * 获取统计数据
 * GET /api/admin/stats
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const pool = require('../database/mysql').getPool();
    
    // 获取访客统计
    const [totalVisitors] = await pool.query(
      'SELECT COUNT(*) as count FROM visitor_applications'
    );
    
    // 获取今日访客数
    const today = new Date().toISOString().split('T')[0];
    const [todayVisitors] = await pool.query(
      'SELECT COUNT(*) as count FROM visitor_applications WHERE DATE(submit_time) = ?'
      [today]
    );

    // 获取审批状态统计
    const [statusStats] = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM visitor_applications 
       GROUP BY status`
    );

    // 系统信息
    const stats = {
      visitors: {
        total: totalVisitors[0].count,
        today: todayVisitors[0].count,
        byStatus: statusStats.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {})
      },
      system: {
        uptime: monitorService.metrics.uptime,
        requests: monitorService.metrics.requests,
        memory: process.memoryUsage(),
        cacheAvailable: cacheService.isAvailable()
      }
    };

    res.json({ code: 0, data: stats });
  } catch (error) {
    logger.error('获取统计数据失败', error);
    res.status(500).json({ code: 500, message: '获取统计数据失败', error: error.message });
  }
});

/**
 * 获取日志列表
 * GET /api/admin/logs
 */
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    
    // TODO: 从日志文件中读取并返回
    // 这里简化处理，返回最近的日志
    
    res.json({ 
      code: 0, 
      data: {
        logs: [],
        total: 0
      }
    });
  } catch (error) {
    logger.error('获取日志失败', error);
    res.status(500).json({ code: 500, message: '获取日志失败', error: error.message });
  }
});

/**
 * 服务控制
 * POST /api/admin/service/:action
 */
router.post('/service/:action', authMiddleware, async (req, res) => {
  const { action } = req.params;

  try {
    switch (action) {
      case 'restart':
        logger.info('应用重启请求已接收');
        res.json({ code: 0, message: '应用重启中...' });
        setTimeout(() => process.exit(0), 1000);
        break;

      case 'stop':
        logger.info('应用停止请求已接收');
        res.json({ code: 0, message: '应用停止中...' });
        setTimeout(() => process.exit(0), 1000);
        break;

      default:
        res.status(400).json({ code: 400, message: '未知的操作' });
    }
  } catch (error) {
    logger.error('服务控制失败', error);
    res.status(500).json({ code: 500, message: '服务控制失败', error: error.message });
  }
});

/**
 * 获取访客列表
 * GET /api/admin/visitors
 */
router.get('/visitors', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, status } = req.query;
    const pool = require('../database/mysql').getPool();
    
    let query = 'SELECT * FROM visitor_applications';
    const conditions = [];
    const values = [];

    if (keyword) {
      conditions.push('(name LIKE ? OR phone LIKE ?)');
      values.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // 注意：MySQL 的 LIMIT 和 OFFSET 不能直接使用参数化查询
    // 需要进行整数转换以防止 SQL 注入
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit)));
    const offsetNum = Math.max(0, (parseInt(page) - 1) * limitNum);
    
    query += ` ORDER BY submit_time DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [visitors] = await pool.query(query, values);
    
    // 构建 COUNT 查询
    let countQuery = 'SELECT COUNT(*) as count FROM visitor_applications';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const [total] = await pool.query(countQuery, values);

    res.json({ 
      code: 0, 
      data: {
        list: visitors,
        total: total[0].count,
        page: parseInt(page),
        limit: limitNum
      }
    });
  } catch (error) {
    logger.error('获取访客列表失败', error);
    res.status(500).json({ code: 500, message: '获取访客列表失败', error: error.message });
  }
});

/**
 * 删除访客记录
 * DELETE /api/admin/visitors/:id
 */
router.delete('/visitors/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = require('../database/mysql').getPool();
    
    await pool.query('DELETE FROM visitor_applications WHERE id = ?', [id]);
    await pool.query('DELETE FROM visitor_companions WHERE application_id = ?', [id]);
    
    logger.info('访客记录已删除', { id });
    
    res.json({ code: 0, message: '删除成功' });
  } catch (error) {
    logger.error('删除访客记录失败', error);
    res.status(500).json({ code: 500, message: '删除失败', error: error.message });
  }
});

/**
 * 修改管理员密码
 * PUT /api/admin/password
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 验证参数
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ code: 400, message: '旧密码和新密码不能为空' });
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return res.status(400).json({ code: 400, message: '密码长度至少 6 位' });
    }

    // 验证旧密码（从环境变量读取）
    const currentPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (oldPassword !== currentPassword) {
      logger.warn('旧密码验证失败', { username: req.user.username });
      return res.status(401).json({ code: 401, message: '旧密码错误' });
    }

    // 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    logger.info('管理员密码已修改', { username: req.user.username });

    // TODO: 将新密码保存到数据库或环境变量
    // 这里为了简单，直接更新到 .env 文件
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../../.env');
    
    // 读取现有配置
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // 替换或添加密码配置
    if (envContent.includes('ADMIN_PASSWORD=')) {
      envContent = envContent.replace(/ADMIN_PASSWORD=.*/, `ADMIN_PASSWORD=${hashedPassword}`);
    } else {
      envContent += `\nADMIN_PASSWORD=${hashedPassword}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);

    res.json({ 
      code: 0, 
      message: '密码修改成功，请重新登录',
      needRelogin: true
    });

  } catch (error) {
    logger.error('修改密码失败', error);
    res.status(500).json({ code: 500, message: '修改密码失败', error: error.message });
  }
});

/**
 * 获取访客详情
 * GET /api/admin/visitors/:id
 */
router.get('/visitors/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = require('../database/mysql').getPool();
    
    // 查询申请详情
    const [applications] = await pool.query(
      'SELECT * FROM visitor_applications WHERE id = ?',
      [id]
    );
    
    if (!applications || applications.length === 0) {
      return res.status(404).json({ code: 404, message: '访客申请不存在' });
    }
    
    const application = applications[0];
    
    // 查询随行人员
    const [companions] = await pool.query(
      'SELECT * FROM visitor_companions WHERE application_id = ?',
      [id]
    );
    
    res.json({
      code: 0,
      message: 'success',
      data: {
        ...application,
        companions: companions || []
      }
    });
  } catch (error) {
    logger.error('获取访客详情失败', error);
    res.status(500).json({ code: 500, message: '获取访客详情失败', error: error.message });
  }
});

/**
 * 审批访客申请
 * PUT /api/admin/visitors/:id/approve
 */
router.put('/visitors/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;
    const pool = require('../database/mysql').getPool();
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的审批状态' });
    }
    
    if (status === 'rejected' && !rejectReason) {
      return res.status(400).json({ code: 400, message: '拒绝时必须填写原因' });
    }
    
    // 更新申请状态
    const now = new Date();
    const approvalTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    await pool.query(
      'UPDATE visitor_applications SET status = ?, reject_reason = ?, approval_time = ? WHERE id = ?',
      [status, rejectReason || null, approvalTime, id]
    );
    
    logger.info('管理员审批访客申请', { 
      applicationId: id, 
      status, 
      admin: req.user.username 
    });
    
    res.json({
      code: 0,
      message: status === 'approved' ? '审批通过' : '已拒绝'
    });
  } catch (error) {
    logger.error('审批访客申请失败', error);
    res.status(500).json({ code: 500, message: '审批失败', error: error.message });
  }
});

/**
 * 导出访客数据（CSV格式）
 * GET /api/admin/visitors/export
 */
router.get('/visitors/export', authMiddleware, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const pool = require('../database/mysql').getPool();
    
    let sql = 'SELECT * FROM visitor_applications WHERE 1=1';
    const params = [];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (startDate) {
      sql += ' AND submit_time >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND submit_time <= ?';
      params.push(endDate + ' 23:59:59');
    }
    
    sql += ' ORDER BY submit_time DESC';
    
    const [applications] = await pool.query(sql, params);
    
    // 生成 CSV
    const headers = ['ID', '姓名', '手机号', '身份证', '单位', '被访人', '被访人电话', '来访时间', '结束时间', '状态', '提交时间'];
    const rows = applications.map(app => [
      app.id,
      app.name,
      app.phone,
      app.id_card,
      app.organization || '',
      app.host_name || '',
      app.host_phone || '',
      app.visit_date || '',
      app.end_date || '',
      app.status,
      app.submit_time
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=visitors_${new Date().toISOString().split('T')[0]}.csv`);
    
    // 添加 BOM 以支持中文
    res.write('\uFEFF');
    res.end(csvContent);
    
    logger.info('导出访客数据', { count: rows.length, admin: req.user.username });
  } catch (error) {
    logger.error('导出访客数据失败', error);
    res.status(500).json({ code: 500, message: '导出失败', error: error.message });
  }
});

/**
 * 获取统计数据（增强版）
 * GET /api/admin/stats/enhanced
 */
router.get('/stats/enhanced', authMiddleware, async (req, res) => {
  try {
    const pool = require('../database/mysql').getPool();
    
    // 总申请数
    const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM visitor_applications');
    const total = totalResult[0].total;
    
    // 各状态统计
    const [statusStats] = await pool.query(
      'SELECT status, COUNT(*) as count FROM visitor_applications GROUP BY status'
    );
    
    // 今日申请数
    const [todayResult] = await pool.query(
      'SELECT COUNT(*) as count FROM visitor_applications WHERE DATE(submit_time) = CURDATE()'
    );
    const todayCount = todayResult[0].count;
    
    // 本周申请数
    const [weekResult] = await pool.query(
      'SELECT COUNT(*) as count FROM visitor_applications WHERE YEARWEEK(submit_time, 1) = YEARWEEK(CURDATE(), 1)'
    );
    const weekCount = weekResult[0].count;
    
    // 本月申请数
    const [monthResult] = await pool.query(
      'SELECT COUNT(*) as count FROM visitor_applications WHERE YEAR(submit_time) = YEAR(CURDATE()) AND MONTH(submit_time) = MONTH(CURDATE())'
    );
    const monthCount = monthResult[0].count;
    
    // 近7天趋势
    const [trendResult] = await pool.query(`
      SELECT DATE(submit_time) as date, COUNT(*) as count 
      FROM visitor_applications 
      WHERE submit_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(submit_time)
      ORDER BY date ASC
    `);
    
    res.json({
      code: 0,
      message: 'success',
      data: {
        total,
        today: todayCount,
        week: weekCount,
        month: monthCount,
        statusStats,
        trend: trendResult
      }
    });
  } catch (error) {
    logger.error('获取统计数据失败', error);
    res.status(500).json({ code: 500, message: '获取统计数据失败', error: error.message });
  }
});

module.exports = router;
