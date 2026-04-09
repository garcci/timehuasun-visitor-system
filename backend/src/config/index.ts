// backend/src/config/index.ts - 配置文件

import dotenv from 'dotenv'

dotenv.config()

export const config = {
  // 服务配置
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  // 微信小程序配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },
  
  // OA 系统配置
  oa: {
    baseUrl: process.env.OA_BASE_URL || '',
    authorization: process.env.OA_AUTHORIZATION || '', // Basic Auth: Basic YXBpOkdkZnZ0RW5jQ1JVMTRYdg==
    apiKey: process.env.OA_API_KEY || '',
    apiSecret: process.env.OA_API_SECRET || '',
    flowTypeId: process.env.OA_FLOW_TYPE_ID || '', // OA 流程类型 ID
    callbackToken: process.env.OA_CALLBACK_TOKEN || '', // OA 回调验证 token
  },
  
  // 数据库配置（如使用 MongoDB）
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/visitor-system',
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

export default config
