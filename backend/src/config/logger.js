// backend/src/config/logger.js - Winston 结构化日志配置

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// 定义日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 创建日志实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  defaultMeta: {
    service: 'visitor-backend',
    env: process.env.NODE_ENV || 'development',
  },
  transports: [
    // 错误日志 - 单独文件
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),

    // 警告日志 - 单独文件
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'warn-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),

    // 综合日志 - 所有级别
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
});

// 开发环境下同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// 生产环境下也输出到控制台（用于调试）
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ' ' + JSON.stringify(meta);
        }
        return msg;
      })
    ),
  }));
}

// 封装常用方法
const logHelper = {
  /**
   * Info 级别日志
   */
  info: (message, meta = {}) => {
    logger.info(message, { meta });
  },

  /**
   * Warn 级别日志
   */
  warn: (message, meta = {}) => {
    logger.warn(message, { meta });
  },

  /**
   * Error 级别日志
   */
  error: (message, error, meta = {}) => {
    logger.error(message, {
      meta,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  },

  /**
   * Debug 级别日志
   */
  debug: (message, meta = {}) => {
    logger.debug(message, { meta });
  },

  /**
   * 业务日志
   */
  business: (action, data, user) => {
    logger.info('Business Action', {
      action,
      data,
      user,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * API 请求日志
   */
  apiRequest: (req, res, duration) => {
    logger.info('API Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * OA 接口调用日志
   */
  oaCall: (endpoint, params, result, duration) => {
    logger.info('OA API Call', {
      endpoint,
      params: maskSensitiveData(params),
      success: result.success,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * 缓存命中日志
   */
  cacheHit: (key, fromCache) => {
    logger.debug('Cache Access', {
      key,
      hit: fromCache,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * 脱敏敏感数据
 */
function maskSensitiveData(data) {
  if (!data) return data;
  
  const masked = { ...data };
  
  // 脱敏手机号
  if (masked.phone) {
    masked.phone = masked.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
  
  // 脱敏身份证号
  if (masked.idCard) {
    masked.idCard = masked.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }
  
  return masked;
}

module.exports = logHelper;
