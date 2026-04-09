// backend/src/index.js - 后端服务入口文件

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression'); // 响应压缩
const helmet = require('helmet'); // 安全头
const rateLimit = require('express-rate-limit'); // 请求限流
require('dotenv').config();

const { initDB } = require('./database/mysql');
const visitorRoutes = require('./routes/visitor');
const adminRoutes = require('./routes/admin'); // 新增：管理后台路由
const deployRoutes = require('./routes/deploy'); // 新增：部署路由
const authRoutes = require('./routes/auth'); // 新增：认证路由
const cacheService = require('./services/cache.service');
const monitorService = require('./services/monitor.service');
const logger = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件 - Helmet
app.use(helmet({
  contentSecurityPolicy: false, // 小程序不需要 CSP
  crossOriginEmbedderPolicy: false
}));

// 响应压缩 - 减少传输体积
app.use(compression());

// 请求限流 - 防止滥用
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200, // 最多200次请求
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 日志中间件（使用 Winston）
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.apiRequest(req, res, duration);
    monitorService.recordRequest(res.statusCode, duration);
  });
  
  next();
});

// 路由配置
app.use('/api/auth', authRoutes); // 新增：认证路由
app.use('/api/visitors', visitorRoutes);
app.use('/api/admin', adminRoutes); // 新增：管理后台路由
app.use('/api/admin/deploy', deployRoutes); // 新增：部署路由

// 健康检查接口（增强版）- 必须在通配符路由之前定义
app.get('/health', (req, res) => {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: Date.now() - monitorService.metrics.startTime,
    cache: {
      available: cacheService.isAvailable(),
      status: cacheService.getStatus()
    },
    memory: monitorService.metrics.memory,
  };
  
  res.json(healthData);
});

// 服务管理后台静态文件（生产环境）
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../../admin/dist')));
  
  // 所有非 API 请求都返回 index.html（Vue Router 的 History 模式）
  app.get('*', (req, res, next) => {
    // 如果是 API 请求，跳过
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // 返回管理后台页面
    res.sendFile(path.join(__dirname, '../../admin/dist/index.html'));
  });
}

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理（使用 Winston 日志）
app.use((err, req, res, next) => {
  logger.error('Server Error', err, {
    url: req.url,
    method: req.method,
    body: req.body,
  });
  res.status(500).json({ code: 500, message: '服务器内部错误', error: err.message });
});

// 先启动服务，数据库和缓存改为懒加载模式
// 监听 0.0.0.0 允许局域网访问
app.listen(PORT, '0.0.0.0', () => {
  logger.info('服务器启动成功', {
    port: PORT,
    url: `http://localhost:${PORT}`,
    healthCheck: `http://localhost:${PORT}/health`,
    apiEndpoint: `http://localhost:${PORT}/api/visitors`,
    lanUrl: `http://<server-ip>:${PORT}`, // 局域网访问地址
  });
  
  // 输出环境信息
  if (process.env.NODE_ENV === 'production') {
    console.log('\n🚀 当前运行在【生产环境】');
    console.log(`📍 本地访问：http://localhost:${PORT}`);
    console.log(`📍 局域网访问：http://<server-ip>:${PORT} (将 <server-ip> 替换为服务器实际 IP)`);
    console.log(`🔗 OA 系统：${process.env.OA_BASE_URL}`);
    
    // 生产环境安全检查
    if (process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
      console.warn('\n⚠️  警告：生产环境使用了默认 JWT 密钥，请立即修改！');
    }
  } else {
    console.log('\n🛠️  当前运行在【开发环境】');
    console.log(`📍 服务地址：http://localhost:${PORT}`);
    console.log(`🔗 OA 系统：${process.env.OA_BASE_URL}`);
  }
  console.log('');
  
  // 后台初始化数据库和缓存（不影响服务启动）
  setImmediate(() => {
    Promise.all([
      initDB().catch(err => {
        logger.warn('数据库初始化失败，但服务仍可运行（将在首次访问时重试）', err);
        console.warn('⚠️  数据库初始化失败，服务将在首次访问数据库时重试连接');
      }),
      cacheService.connect().then(result => {
        // Redis 连接结果已经在 cacheService 内部处理
        if (!cacheService.isAvailable()) {
          logger.warn('Redis 未连接，使用内存缓存模式');
          console.warn('💡 提示：系统已运行在无 Redis 模式下，性能可能略有影响（可选安装）');
        }
      }).catch(err => {
        logger.warn('缓存初始化失败，但服务仍可运行', err);
        console.warn('💡 提示：系统已运行在无缓存模式下');
      })
    ]).then(() => {
      const dbStatus = '已连接';
      const cacheStatus = cacheService.isAvailable() ? 'Redis' : '内存缓存';
      logger.info(`后台初始化完成 - 数据库：${dbStatus}, 缓存：${cacheStatus}`);
    });
  });
});
