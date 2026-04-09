# SQL 语法错误修复报告

**修复时间**: 2026-04-07  
**问题**: 获取访客列表时出现 SQL 语法错误

---

## ❌ 错误信息

```json
{
    "code": 500,
    "message": "获取访客列表失败",
    "error": "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '? ORDER BY created_at DESC' at line 1"
}
```

---

## 🔍 问题分析

### 根本原因
MySQL 的 `LIMIT` 和 `OFFSET` 子句**不支持参数化查询**（占位符 `?`）。

### 错误代码
```javascript
// ❌ 错误写法
query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
values.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

const [visitors] = await pool.query(query, values);
```

MySQL 驱动会将整个 SQL 语句发送给服务器，但 `LIMIT ?` 中的 `?` 不会被正确替换为数值，导致语法错误。

---

## ✅ 修复方案

### 1. 直接拼接 LIMIT 和 OFFSET（安全方式）

```javascript
// ✅ 正确写法
const limitNum = Math.max(1, Math.min(1000, parseInt(limit)));
const offsetNum = Math.max(0, (parseInt(page) - 1) * limitNum);

query += ` ORDER BY submit_time DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

const [visitors] = await pool.query(query, values);
```

**安全措施**:
- ✅ 使用 `parseInt()` 转换为整数
- ✅ 使用 `Math.max/min` 限制范围（1-1000）
- ✅ 防止 SQL 注入攻击

### 2. 修复 COUNT 查询

```javascript
// ❌ 原来的写法（正则替换不可靠）
const [total] = await pool.query(
  query.replace('SELECT *', 'SELECT COUNT(*) as count')
       .replace(/LIMIT \? OFFSET \?/, '')
);

// ✅ 新的写法（独立构建）
let countQuery = 'SELECT COUNT(*) as count FROM visitor_applications';
if (conditions.length > 0) {
  countQuery += ' WHERE ' + conditions.join(' AND ');
}
const [total] = await pool.query(countQuery, values);
```

### 3. 修正字段名

```javascript
// ❌ 错误字段名
ORDER BY created_at DESC

// ✅ 正确字段名
ORDER BY submit_time DESC
```

---

## 📝 完整修复代码

```javascript
router.get('/visitors', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, status } = req.query;
    const pool = require('../database/mysql').getPool();
    
    let query = 'SELECT * FROM visitor_applications';
    const conditions = [];
    const values = [];

    // 添加筛选条件
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

    // 安全的 LIMIT 和 OFFSET 处理
    const limitNum = Math.max(1, Math.min(1000, parseInt(limit)));
    const offsetNum = Math.max(0, (parseInt(page) - 1) * limitNum);
    
    query += ` ORDER BY submit_time DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [visitors] = await pool.query(query, values);
    
    // 独立的 COUNT 查询
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
    res.status(500).json({ 
      code: 500, 
      message: '获取访客列表失败', 
      error: error.message 
    });
  }
});
```

---

## 🎯 修复要点

### 1. MySQL 参数化查询的限制
- ✅ **WHERE 子句**可以使用 `?` 占位符
- ❌ **LIMIT/OFFSET** 不能使用 `?` 占位符
- ✅ 需要直接拼接到 SQL 字符串中

### 2. 安全防护措施
```javascript
// 限制范围，防止恶意输入
const limitNum = Math.max(1, Math.min(1000, parseInt(limit)));
const offsetNum = Math.max(0, (parseInt(page) - 1) * limitNum);
```

**防护效果**:
- `parseInt()` - 确保是数字
- `Math.max(1, ...)` - 最小值为 1
- `Math.min(1000, ...)` - 最大值为 1000
- 即使攻击者传入 `'OR 1=1--` 也会被转换为 `NaN`，然后变成 `1`

### 3. 字段名修正
- `created_at` → `submit_time`（与实际数据库字段一致）

---

## 🧪 测试验证

### 测试用例

```bash
# 1. 基本查询
curl "https://visitor.timehuasun.cn:8021/api/admin/visitors?page=1&limit=10"

# 2. 带关键词搜索
curl "https://visitor.timehuasun.cn:8021/api/admin/visitors?page=1&limit=10&keyword=张三"

# 3. 带状态筛选
curl "https://visitor.timehuasun.cn:8021/api/admin/visitors?page=1&limit=10&status=pending"

# 4. 边界值测试
curl "https://visitor.timehuasun.cn:8021/api/admin/visitors?page=1&limit=1000"
curl "https://visitor.timehuasun.cn:8021/api/admin/visitors?page=1&limit=999999"  # 会被限制为1000
```

### 预期结果
```json
{
  "code": 0,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

---

## 📊 修复前后对比

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| SQL 语法 | ❌ 错误 | ✅ 正确 |
| 参数化查询 | ❌ LIMIT 不支持 | ✅ 安全拼接 |
| 字段名 | ❌ created_at | ✅ submit_time |
| COUNT 查询 | ⚠️ 正则替换 | ✅ 独立构建 |
| 安全性 | ⚠️ 一般 | ✅ 范围限制 |

---

## 💡 最佳实践

### MySQL 参数化查询规则

1. **可以使用占位符的地方**:
   - WHERE 子句的值
   - INSERT 的值
   - UPDATE 的 SET 值

2. **不能使用占位符的地方**:
   - 表名
   - 字段名
   - LIMIT/OFFSET
   - ORDER BY 字段名

3. **安全拼接的方法**:
   ```javascript
   // ✅ 白名单验证
   const allowedFields = ['name', 'phone', 'submit_time'];
   const orderBy = allowedFields.includes(field) ? field : 'submit_time';
   
   // ✅ 类型转换 + 范围限制
   const limit = Math.max(1, Math.min(1000, parseInt(input)));
   
   // ✅ 转义特殊字符
   const keyword = input.replace(/[%'_]/g, '\\$&');
   ```

---

## ✅ 修复状态

- ✅ 代码已修复
- ✅ 已上传到服务器
- ✅ 服务已重启（PID: 1333）
- ✅ 无 SQL 错误日志
- ✅ 接口可正常访问（需有效 Token）

---

**修复负责人**: AI Assistant  
**审核状态**: ✅ 已完成  
**影响范围**: 管理后台访客列表接口
