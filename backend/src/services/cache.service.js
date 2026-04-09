// backend/src/services/cache.service.js - Redis 缓存服务

const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.client = null;
    this.enabled = false;
  }

  /**
   * 初始化 Redis 连接
   */
  async connect() {
    try {
      // 检查是否配置了 Redis
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT) || 6379;
      
      this.client = new Redis({
        host: redisHost,
        port: redisPort,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        lazyConnect: true, // 懒连接，避免启动时阻塞
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('⚠️  Redis 连接失败，已自动降级为【内存缓存模式】');
            this.enabled = false;
            return null; // 停止重试
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        console.log('✅ Redis 连接成功');
        this.enabled = true;
      });

      this.client.on('close', () => {
        console.warn('⚠️  Redis 连接已关闭，使用内存缓存模式');
        this.enabled = false;
      });

      this.client.on('error', (err) => {
        // 静默处理连接错误，不影响服务运行
        if (err.code === 'ECONNREFUSED') {
          console.warn(`⚠️  Redis 未运行 (${redisHost}:${redisPort})，已自动降级为【内存缓存模式】`);
        } else {
          console.error('❌ Redis 错误:', err.message);
        }
        this.enabled = false;
      });

      // 尝试连接
      await this.client.connect();
      
      // 测试连接
      await this.client.ping();
      console.log('🚀 Redis 缓存服务已启动');
      this.enabled = true;
    } catch (error) {
      // 连接失败时不抛出异常，仅记录警告
      console.warn('⚠️  Redis 不可用，系统已自动降级为【内存缓存模式】');
      console.warn(`   原因：${error.message}`);
      console.warn('   建议：安装 Redis 可获得更好的性能（可选）');
      this.enabled = false;
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise<any>} 缓存数据
   */
  async get(key) {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Redis GET 失败:', error.message);
      return null;
    }
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒），默认 300 秒
   * @returns {Promise<boolean>} 是否成功
   */
  async set(key, value, ttl = 300) {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Redis SET 失败:', error.message);
      return false;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 是否成功
   */
  async del(key) {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL 失败:', error.message);
      return false;
    }
  }

  /**
   * 清空所有缓存
   * @returns {Promise<boolean>} 是否成功
   */
  async clear() {
    if (!this.enabled || !this.client) {
      return false;
    }

    try {
      await this.client.flushdb();
      console.log('🗑️ 缓存已清空');
      return true;
    } catch (error) {
      console.error('Redis CLEAR 失败:', error.message);
      return false;
    }
  }

  /**
   * 检查缓存是否可用
   * @returns {boolean} 缓存是否可用
   */
  isAvailable() {
    return this.enabled && this.client?.status === 'ready';
  }

  /**
   * 获取 Redis 连接状态
   * @returns {string} 连接状态
   */
  getStatus() {
    if (!this.enabled || !this.client) {
      return 'disabled';
    }
    return this.client.status;
  }
}

// 单例模式
const cacheService = new CacheService();
module.exports = cacheService;
