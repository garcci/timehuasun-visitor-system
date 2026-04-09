// backend/src/config/index.js - 配置文件 (JavaScript 版本)

require('dotenv').config()

// 环境检测和安全提示
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  console.log('🚀 当前运行在【生产环境】');
  console.log(`📍 服务地址：http://0.0.0.0:${process.env.PORT || 8021}`);
  console.log(`🔗 OA 系统：${process.env.OA_BASE_URL}`);
  
  // 生产环境安全检查
  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    console.warn('⚠️  警告：生产环境使用了默认 JWT 密钥，请立即修改！');
  }
} else {
  console.log('🛠️  当前运行在【开发环境】');
  console.log(`📍 服务地址：http://localhost:${process.env.PORT || 3000}`);
  console.log(`🔗 OA 系统：${process.env.OA_BASE_URL}`);
}
console.log('');

module.exports = {
  // 服务配置
  port: process.env.PORT || (isProduction ? 8021 : 3000),
  env: process.env.NODE_ENV || 'development',
  isProduction: isProduction,
  
  // 微信小程序配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },
  
  // OA 系统配置
  oa: {
    baseUrl: process.env.OA_BASE_URL || '',
    authorization: process.env.OA_AUTHORIZATION || '', // Basic Auth
    apiKey: process.env.OA_API_KEY || '',
    apiSecret: process.env.OA_API_SECRET || '',
    flowTypeId: process.env.OA_FLOW_TYPE_ID || '', // OA 流程类型 ID
    callbackToken: process.env.OA_CALLBACK_TOKEN || '', // OA 回调验证 token
  },
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'visitor_system',
  },
  
  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '7d',
  },
  
  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
}
