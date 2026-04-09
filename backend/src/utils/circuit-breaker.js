// backend/src/utils/circuit-breaker.js - 熔断器实现

/**
 * 熔断器实现
 * 
 * 三种状态:
 * - CLOSED: 正常状态，允许请求通过
 * - OPEN: 熔断状态，拒绝所有请求
 * - HALF_OPEN: 半开状态，允许一个请求探测
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5; // 失败阈值
    this.resetTimeout = options.resetTimeout || 60000;     // 重置超时（毫秒）
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 监控周期
    
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.successCount = 0;
    
    // 统计信息
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateChanges: 0,
    };
  }

  /**
   * 执行受保护的操作
   * @param {Function} asyncFunction - 异步函数
   * @returns {Promise<any>} 执行结果
   */
  async execute(asyncFunction) {
    this.stats.totalRequests++;

    // 检查是否需要改变状态
    this.checkState();

    // 如果是 OPEN 状态，直接拒绝
    if (this.state === 'OPEN') {
      this.stats.rejectedRequests++;
      const error = new Error('Circuit breaker is OPEN');
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }

    try {
      const result = await asyncFunction();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功时的处理
   */
  onSuccess() {
    this.successCount++;
    this.stats.successfulRequests++;

    if (this.state === 'HALF_OPEN') {
      // 半开状态下成功，关闭熔断器
      console.log('✅ 熔断器检测到恢复，切换到 CLOSED 状态');
      this.close();
    } else if (this.state === 'CLOSED') {
      // 清除失败计数
      this.failureCount = 0;
    }
  }

  /**
   * 失败时的处理
   */
  onFailure() {
    this.failureCount++;
    this.failedRequests++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // 半开状态下失败，重新打开熔断器
      console.warn('⚠️ 熔断器探测失败，切换到 OPEN 状态');
      this.open();
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // 达到失败阈值，打开熔断器
      console.warn('🚨 失败次数达到阈值，切换到 OPEN 状态');
      this.open();
    }
  }

  /**
   * 检查状态是否需要切换
   */
  checkState() {
    if (this.state === 'OPEN' && this.nextAttempt && Date.now() >= this.nextAttempt) {
      console.log('🔄 重置超时已到，切换到 HALF_OPEN 状态');
      this.halfOpen();
    }
  }

  /**
   * 打开熔断器
   */
  open() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeout;
    this.stats.stateChanges++;
    this.emitStateChange('OPEN');
  }

  /**
   * 关闭熔断器
   */
  close() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = null;
    this.stats.stateChanges++;
    this.emitStateChange('CLOSED');
  }

  /**
   * 设置为半开状态
   */
  halfOpen() {
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    this.stats.stateChanges++;
    this.emitStateChange('HALF_OPEN');
  }

  /**
   * 状态变化回调（可扩展为发送监控事件）
   * @param {string} newState - 新状态
   */
  emitStateChange(newState) {
    console.log(`📊 熔断器状态变化：${newState}`);
    // TODO: 发送到监控系统
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      currentState: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate: this.stats.totalRequests > 0 
        ? (this.stats.failedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * 手动重置
   */
  reset() {
    console.log('🔧 手动重置熔断器');
    this.close();
  }
}

module.exports = CircuitBreaker;
