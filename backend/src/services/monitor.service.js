// backend/src/services/monitor.service.js - 监控服务

const os = require('os');
const logger = require('../config/logger');

class MonitorService {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requests: {
        total: 0,
        success: 0,
        error: 0,
      },
      responseTime: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
      },
      oaRequests: {
        total: 0,
        cache: 0,
        oaApi: 0,
        error: 0,
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
      },
    };

    // 告警阈值
    this.thresholds = {
      errorRate: 0.05,      // 错误率超过 5%
      responseTime: 2000,   // 响应时间超过 2 秒
      memoryUsage: 0.8,     // 内存使用超过 80%
      oaErrorRate: 0.1,     // OA 错误率超过 10%
    };

    // 告警记录
    this.alerts = [];

    // 启动定时任务
    this.startMonitoring();
  }

  /**
   * 记录请求
   */
  recordRequest(statusCode, duration) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    this.metrics.responseTime.total += duration;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, duration);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, duration);
  }

  /**
   * 记录 OA 请求
   */
  recordOARequest(fromCache, isError) {
    this.metrics.oaRequests.total++;
    
    if (fromCache) {
      this.metrics.oaRequests.cache++;
    } else {
      this.metrics.oaRequests.oaApi++;
    }

    if (isError) {
      this.metrics.oaRequests.error++;
    }
  }

  /**
   * 更新内存信息
   */
  updateMemory() {
    const usage = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
    };
  }

  /**
   * 计算错误率
   */
  getErrorRate() {
    if (this.metrics.requests.total === 0) return 0;
    return this.metrics.requests.error / this.metrics.requests.total;
  }

  /**
   * 计算平均响应时间
   */
  getAvgResponseTime() {
    if (this.metrics.responseTime.count === 0) return 0;
    return this.metrics.responseTime.total / this.metrics.responseTime.count;
  }

  /**
   * 计算 OA 错误率
   */
  getOAErrorRate() {
    if (this.metrics.oaRequests.total === 0) return 0;
    return this.metrics.oaRequests.error / this.metrics.oaRequests.total;
  }

  /**
   * 检查告警
   */
  checkAlerts() {
    const errorRate = this.getErrorRate();
    const avgResponseTime = this.getAvgResponseTime();
    const oaErrorRate = this.getOAErrorRate();
    const memoryUsage = this.metrics.memory.rss / os.totalmem();

    // 错误率告警
    if (errorRate > this.thresholds.errorRate) {
      this.sendAlert('ERROR_RATE', `错误率过高：${(errorRate * 100).toFixed(2)}%`);
    }

    // 响应时间告警
    if (avgResponseTime > this.thresholds.responseTime) {
      this.sendAlert('SLOW_RESPONSE', `响应时间过长：${avgResponseTime.toFixed(0)}ms`);
    }

    // 内存告警
    if (memoryUsage > this.thresholds.memoryUsage) {
      this.sendAlert('HIGH_MEMORY', `内存使用过高：${(memoryUsage * 100).toFixed(2)}%`);
    }

    // OA 错误率告警
    if (oaErrorRate > this.thresholds.oaErrorRate) {
      this.sendAlert('OA_ERROR', `OA 接口错误率过高：${(oaErrorRate * 100).toFixed(2)}%`);
    }
  }

  /**
   * 发送告警
   */
  sendAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
    };

    this.alerts.push(alert);
    
    // 保持最近的 100 条告警
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    logger.error('监控告警', new Error(message), {
      alertType: type,
      ...alert,
    });

    // TODO: 发送到外部告警系统（钉钉、企业微信等）
    // this.sendToAlertSystem(alert);
  }

  /**
   * 获取监控指标
   */
  getMetrics() {
    this.updateMemory();
    
    return {
      uptime: Date.now() - this.metrics.startTime,
      requests: {
        ...this.metrics.requests,
        errorRate: this.getErrorRate(),
      },
      responseTime: {
        avg: this.getAvgResponseTime(),
        min: this.metrics.responseTime.min === Infinity ? 0 : this.metrics.responseTime.min,
        max: this.metrics.responseTime.max,
      },
      oaRequests: {
        ...this.metrics.oaRequests,
        errorRate: this.getOAErrorRate(),
        cacheRate: this.metrics.oaRequests.total > 0 
          ? (this.metrics.oaRequests.cache / this.metrics.oaRequests.total * 100).toFixed(2) + '%'
          : '0%',
      },
      memory: {
        ...this.metrics.memory,
        usage: (this.metrics.memory.rss / os.totalmem() * 100).toFixed(2) + '%',
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
      },
      alerts: this.alerts.slice(-10), // 最近 10 条告警
    };
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    // 每分钟检查一次
    setInterval(() => {
      this.checkAlerts();
      this.updateMemory();
      
      logger.debug('监控指标', this.getMetrics());
    }, 60000);

    // 每 5 分钟重置响应时间统计
    setInterval(() => {
      this.metrics.responseTime.total = 0;
      this.metrics.responseTime.count = 0;
      this.metrics.responseTime.min = Infinity;
      this.metrics.responseTime.max = 0;
    }, 300000);
  }

  /**
   * 重置统计信息
   */
  reset() {
    this.metrics.requests.total = 0;
    this.metrics.requests.success = 0;
    this.metrics.requests.error = 0;
    this.metrics.responseTime.total = 0;
    this.metrics.responseTime.count = 0;
    this.metrics.responseTime.min = Infinity;
    this.metrics.responseTime.max = 0;
    this.metrics.oaRequests.total = 0;
    this.metrics.oaRequests.cache = 0;
    this.metrics.oaRequests.oaApi = 0;
    this.metrics.oaRequests.error = 0;
    
    logger.info('监控统计已重置');
  }
}

module.exports = new MonitorService();
