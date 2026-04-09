/**
 * 敏感信息脱敏工具函数
 */

/**
 * 身份证号脱敏：110101********1234
 * 保留前6位和后4位，中间用8个星号替换
 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 10) return idCard
  
  // 18位身份证：保留前6位和后4位，中间8位脱敏
  if (idCard.length === 18) {
    return idCard.substring(0, 6) + '********' + idCard.substring(14)
  }
  
  // 15位身份证：保留前6位和后3位，中间6位脱敏
  if (idCard.length === 15) {
    return idCard.substring(0, 6) + '******' + idCard.substring(12)
  }
  
  // 其他长度：使用正则匹配
  return idCard.replace(/^(\d{6})\d+(\d{4})$/, '$1********$2')
}

/**
 * 手机号脱敏：138****1234
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 姓名脱敏：张* / 李** / 欧阳**
 */
export function maskName(name: string): string {
  if (!name) return name
  
  // 单字名
  if (name.length === 1) {
    return name
  }
  
  // 双字名：张*
  if (name.length === 2) {
    return name[0] + '*'
  }
  
  // 三字及以上：张*三 / 欧阳**
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}
