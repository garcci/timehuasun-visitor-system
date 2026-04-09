# 访客预约系统 - 产品需求文档（PRD）

## 📋 文档信息

| 项目 | 内容 |
|------|------|
| 项目名称 | 访客预约微信小程序系统 |
| 文档版本 | v2.0 |
| 创建时间 | 2026-04-03 |
| 最后更新 | 2026-04-03 |
| 产品负责人 | 产品团队 |
| 技术负责人 | 开发团队 |

---

## 🎯 产品概述

### 1.1 产品定位

一款基于微信小程序的访客预约管理系统，实现访客在线填写申请、OA 系统自动审批、访客状态实时查询等功能，提升访客管理效率和用户体验。

### 1.2 目标用户

- **访客**：需要进入园区的外部人员
- **被访人**：园区内工作人员（通过 OA 系统审批）
- **管理员**：系统运维人员

### 1.3 核心价值

- ✅ 访客在线预约，减少现场等待时间
- ✅ 自动化审批流程，提高效率
- ✅ 与 OA 系统集成，实现统一身份认证
- ✅ 实时状态通知，信息透明
- ✅ 电子化管理，便于统计和追溯

---

## 📱 功能架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────┐
│          微信小程序（前端）              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ 首页 │ │ 申请 │ │ 记录 │ │ 状态 │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
└─────────────────────────────────────────┘
              │
              ▼ HTTPS
┌─────────────────────────────────────────┐
│       Nginx（反向代理 + SSL）            │
└─────────────────────────────────────────┘
              │
              ▼ HTTP
┌─────────────────────────────────────────┐
│      Node.js + Express（后端 API）       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ 路由 │ │控制器 │ │ 服务 │ │ 模型 │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
└─────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
    ┌────────┐    ┌────────┐    ┌────────┐
    │ MySQL  │    │ Redis  │    │OA 系统  │
    │ 数据库 │    │ 缓存   │    │ 审批   │
    └────────┘    └────────┘    └────────┘
```

### 2.2 功能模块

#### 模块一：小程序前端

**1. 首页模块**
- 产品介绍和使用指南
- 快速入口（立即预约）
- 系统公告（可选）

**2. 预约申请模块**
- 访客信息填写
  - 姓名、手机号、证件类型、证件号码
  - 来访单位、车牌号
- 被访人信息验证
  - 手机号查询（对接 OA 系统）
  - 自动填充被访人信息
  - 姓名二次确认
- 来访时间选择
  - 来访日期（不能选择过去日期）
  - 来访时间
  - 结束时间（自动计算或手动选择）
- 来访事由填写
- 随行人员添加（可选）
- 保密协议签署（每次申请需重新同意）
- 草稿自动保存

**3. 历史记录模块**
- 申请列表展示（分页加载）
- 状态筛选（全部/待审批/已通过/已拒绝）
- 申请详情查看
- 审批进度查看（可选）

**4. 状态通知模块**
- 审批结果通知
- 状态变更提醒
- 短信/模板消息推送（可选）

#### 模块二：后端 API 服务

**1. 访客申请接口**
- `POST /api/visitors` - 提交申请
- `GET /api/visitors` - 获取申请列表
- `GET /api/visitors/:id` - 获取申请详情
- `PUT /api/visitors/:id/status` - 更新申请状态

**2. OA 系统集成接口**
- `POST /api/visitors/query-by-phone` - 根据手机号查询 OA 用户
- `POST /api/visitors/validate-phone` - 校验手机号
- `POST /api/visitors/callback/approval` - OA 审批回调

**3. 系统管理接口**
- `GET /api/admin/statistics` - 统计数据
- `POST /api/admin/cache/clear` - 清空缓存
- `GET /api/health` - 健康检查

#### 模块三：管理后台（Vue3）

**1. 仪表盘**
- 今日访客数量
- 待审批数量
- 数据统计图表

**2. 申请管理**
- 申请列表查看
- 申请详情查看
- 审批操作（通过/拒绝）
- 批量操作

**3. 系统维护**
- 上传自动更新包
- 查看部署日志
- 系统配置管理

---

## 🔧 技术规格

### 3.1 技术栈

**前端（小程序）**
- 微信小程序原生开发
- TypeScript
- 组件化开发

**前端（管理后台）**
- Vue 3
- Element Plus
- Vite
- Vue Router

**后端**
- Node.js 14+
- Express 框架
- MySQL 5.7+ 数据库
- Redis（缓存，可选）
- Winston（日志库）

**部署环境**
- CentOS 7+
- Nginx（反向代理）
- PM2（进程管理）
- Let's Encrypt（SSL 证书）

### 3.2 核心接口设计

#### 3.2.1 手机号查询接口

**请求：**
```http
POST /api/visitors/query-by-phone
Content-Type: application/json

{
  "phone": "13800138000",
  "type": "host"  // host-被访人，visitor-访客，companion-随行人员
}
```

**响应：**
```json
{
  "code": 0,
  "message": "查询成功",
  "data": {
    "found": true,
    "phone": "13800138000",
    "name": "张三",
    "loginName": "zhangsan",
    "department": "技术部",
    "employeeId": "E12345"
  }
}
```

**错误响应：**
```json
{
  "code": 1001,
  "message": "该手机号未在 OA 系统中登记",
  "data": {
    "found": false,
    "phone": "13800138000",
    "suggestion": "请检查手机号是否正确，或联系被访人确认"
  }
}
```

#### 3.2.2 提交申请接口

**请求：**
```http
POST /api/visitors
Content-Type: application/json

{
  "openid": "wx1234567890",
  "name": "李四",
  "phone": "13900139000",
  "idType": "居民身份证",
  "idCard": "110101199001011234",
  "organization": "某某公司",
  "plateNumber": "京 A12345",
  "hostName": "张三",
  "hostPhone": "13800138000",
  "hostLoginName": "zhangsan",
  "visitDate": "2026-04-05",
  "visitTime": "10:00",
  "endDate": "2026-04-05",
  "endTime": "12:00",
  "purpose": "商务拜访",
  "remark": "",
  "companions": [
    {
      "name": "王五",
      "idCard": "110101199001012345",
      "phone": "13700137000"
    }
  ]
}
```

**响应：**
```json
{
  "code": 0,
  "message": "提交成功",
  "data": {
    "id": "uuid-1234-5678-90ab-cdef",
    "submitTime": "2026-04-03 10:30:00",
    "status": "pending",
    "oaFlowId": "oa-flow-123456"
  }
}
```

#### 3.2.3 OA 回调接口

**请求：**
```http
POST /api/visitors/callback/approval
Content-Type: application/json

{
  "applicationId": "uuid-1234-5678-90ab-cdef",
  "oaFlowId": "oa-flow-123456",
  "status": "approved",  // approved-通过，rejected-拒绝
  "approvalTime": "2026-04-03 11:00:00",
  "rejectReason": "",
  "approverName": "领导",
  "approverPhone": "13600136000",
  "sign": "MD5_SIGNATURE"
}
```

**响应：**
```json
{
  "code": 0,
  "message": "回调处理成功"
}
```

### 3.3 数据库设计

#### visitor_applications（访客申请表）

```sql
CREATE TABLE visitor_applications (
  id VARCHAR(36) PRIMARY KEY COMMENT '申请 ID（UUID）',
  openid VARCHAR(100) NOT NULL COMMENT '用户微信 openid',
  
  -- 访客信息
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  phone VARCHAR(20) NOT NULL COMMENT '联系电话',
  id_type VARCHAR(50) NOT NULL DEFAULT '居民身份证' COMMENT '证件类型',
  id_card VARCHAR(50) NOT NULL COMMENT '证件号码',
  organization VARCHAR(200) COMMENT '来访单位',
  plate_number VARCHAR(20) COMMENT '车牌号',
  
  -- 被访人信息
  host_name VARCHAR(100) NOT NULL COMMENT '被访人姓名',
  host_phone VARCHAR(20) NOT NULL COMMENT '被访人联系电话',
  host_login_name VARCHAR(100) COMMENT '被访人登录名（OA 系统）',
  visit_date VARCHAR(20) NOT NULL COMMENT '来访日期 YYYY-MM-DD',
  visit_time VARCHAR(10) NOT NULL COMMENT '来访时间 HH:mm',
  end_date VARCHAR(20) NOT NULL COMMENT '结束日期 YYYY-MM-DD',
  end_time VARCHAR(10) NOT NULL COMMENT '结束时间 HH:mm',
  purpose TEXT NOT NULL COMMENT '来访事由',
  remark TEXT COMMENT '备注',
  
  -- 审批相关
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '审批状态',
  submit_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  approval_time DATETIME COMMENT '审批时间',
  reject_reason TEXT COMMENT '拒绝原因',
  oa_flow_id VARCHAR(100) COMMENT 'OA 流程 ID',
  
  -- 审计字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_openid (openid),
  INDEX idx_phone (phone),
  INDEX idx_status (status),
  INDEX idx_visit_date (visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### companions（随行人员表）

```sql
CREATE TABLE companions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id VARCHAR(36) NOT NULL COMMENT '申请 ID（外键）',
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  id_card VARCHAR(50) NOT NULL COMMENT '证件号码',
  phone VARCHAR(20) COMMENT '联系电话',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES visitor_applications(id) ON DELETE CASCADE,
  INDEX idx_application_id (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🎨 UI/UX 要求

### 4.1 设计风格

- **简洁明了**：界面清爽，操作流程简单
- **专业可靠**：符合商务场景使用
- **一致性**：保持微信小程序设计规范

### 4.2 交互要求

**表单填写**
- 实时验证输入内容
- 错误提示清晰明确
- 自动保存草稿防止数据丢失
- 支持一键清除

**加载状态**
- 显示 Loading 提示
- 加载失败提供重试
- 超时友好提示

**反馈机制**
- 操作成功/失败即时提示
- 重要操作二次确认
- 审批结果实时通知

### 4.3 页面原型

#### 首页
```
┌─────────────────────────┐
│     访客预约系统        │
│                         │
│   [Logo/图片]           │
│                         │
│   欢迎使用访客预约系统  │
│   快速预约 · 智能审批   │
│                         │
│   [立即预约] 按钮       │
│                         │
│   使用指南：            │
│   1. 填写访客信息       │
│   2. 验证被访人         │
│   3. 等待审批           │
│   4. 查看结果           │
│                         │
└─────────────────────────┘
```

#### 申请页面
```
┌─────────────────────────┐
│  ← 填写申请             │
│                         │
│ 访客信息 *             │
│ ┌─────────────────────┐ │
│ │ 姓名                │ │
│ ├─────────────────────┤ │
│ │ 手机号              │ │
│ ├─────────────────────┤ │
│ │ 证件类型 [下拉]     │ │
│ ├─────────────────────┤ │
│ │ 证件号码            │ │
│ ├─────────────────────┤ │
│ │ 来访单位            │ │
│ ├─────────────────────┤ │
│ │ 车牌号              │ │
│ └─────────────────────┘ │
│                         │
│ 被访人信息 *           │
│ ┌─────────────────────┐ │
│ │ 被访人手机号        │ │
│ │ (验证后自动填充姓名)│ │
│ └─────────────────────┘ │
│                         │
│ 来访时间 *             │
│ ┌─────────────────────┐ │
│ │ 日期 [选择器]       │ │
│ ├─────────────────────┤ │
│ │ 时间 [选择器]       │ │
│ ├─────────────────────┤ │
│ │ 结束时间 [选择器]   │ │
│ └─────────────────────┘ │
│                         │
│ 来访事由 *             │
│ ┌─────────────────────┐ │
│ │ [多行文本框]        │ │
│ └─────────────────────┘ │
│                         │
│ 随行人员 [添加]        │
│ ┌─────────────────────┐ │
│ │ 张三 [删除]         │ │
│ └─────────────────────┘ │
│                         │
│ [提交申请] 按钮        │
│                         │
└─────────────────────────┘
```

---

## ⚙️ 功能详细说明

### 5.1 手机号查询与验证

**业务流程：**
1. 用户输入被访人手机号
2. 失去焦点时触发查询（防抖 300ms）
3. 调用后端接口查询 OA 系统
4. 返回被访人信息并自动填充
5. 用户确认姓名无误

**异常处理：**
- 手机号格式错误 → 提示重新输入
- OA 系统无此人 → 提示未登记
- OA 系统不可用 → 提示系统繁忙，可手动填写
- 网络超时 → 提示重试

**优化点：**
- 防抖避免频繁请求
- 缓存查询结果（5 分钟）
- 熔断保护（连续失败 5 次暂停请求）

### 5.2 表单提交

**验证规则：**
- 姓名：必填，1-50 个字符
- 手机号：必填，11 位数字，1 开头
- 证件类型：必填，枚举值
- 证件号码：必填，符合格式
- 来访单位：必填
- 被访人手机号：必填，已验证
- 来访时间：必填，不能是过去时间
- 来访事由：必填，10-500 字

**提交流程：**
1. 前端表单验证
2. 保存草稿（本地存储）
3. 调用后端 API 提交
4. 异步启动 OA 审批流程
5. 返回申请 ID 和提交时间
6. 跳转到状态页

**草稿机制：**
- 实时保存到 localStorage
- 再次进入自动恢复
- 提交成功后清除

### 5.3 OA 审批流程

**启动审批：**
1. 申请提交成功后
2. 异步调用 OA 系统接口
3. 传递完整的访客信息
4. OA 系统返回流程 ID
5. 保存流程 ID 到数据库

**审批回调：**
1. OA 系统审批完成后回调
2. 验证签名确保安全性
3. 更新申请状态到数据库
4. 可选：发送通知给访客

**异常处理：**
- OA 接口调用失败 → 记录日志，不影响申请提交
- 回调签名验证失败 → 拒绝请求
- 数据库更新失败 → 重试机制

### 5.4 缓存策略

**缓存内容：**
- OA 用户信息查询结果
- 缓存时间：5 分钟
- 错误结果缓存：1 分钟

**缓存 Key 设计：**
```
oa:phone:{手机号}:{类型}
示例：oa:phone:13800138000:host
```

**缓存更新：**
- 定期清理过期数据
- 手动清空缓存接口
- Redis 持久化（可选）

---

## 🔒 安全要求

### 6.1 数据安全

- **HTTPS 传输**：所有接口使用 HTTPS
- **敏感信息加密**：身份证号等加密存储
- **SQL 注入防护**：参数化查询
- **XSS 防护**：输入过滤和转义

### 6.2 接口安全

- **请求频率限制**：防止恶意刷接口
- **签名验证**：OA 回调验证签名
- **Token 认证**：管理后台需要登录
- **CORS 配置**：限制跨域访问

### 6.3 权限控制

- **角色分离**：访客、被访人、管理员
- **数据隔离**：只能查看自己的申请
- **操作审计**：关键操作记录日志

---

## 📊 性能要求

### 7.1 响应时间

- API 响应时间 < 500ms（P95）
- 页面加载时间 < 2s
- 手机号查询 < 1s（命中缓存 < 100ms）

### 7.2 并发能力

- 支持 100 QPS
- 支持 1000 并发用户
- 数据库连接池：10-50

### 7.3 可用性

- 系统可用性 > 99%
- 故障恢复时间 < 30 分钟
- 数据备份：每日自动备份

---

## 🧪 测试要求

### 8.1 功能测试

- ✅ 表单填写和验证
- ✅ 手机号查询
- ✅ 申请提交
- ✅ 列表查询
- ✅ 详情查看
- ✅ 状态更新

### 8.2 接口测试

- ✅ 所有 API 接口测试
- ✅ 边界条件测试
- ✅ 错误处理测试
- ✅ 并发测试

### 8.3 集成测试

- ✅ OA 系统集成测试
- ✅ 数据库操作测试
- ✅ 缓存功能测试
- ✅ 端到端测试

---

## 🚀 部署上线

### 9.1 环境要求

**服务器配置：**
- CPU: 2 核+
- 内存：4GB+
- 磁盘：50GB+
- 操作系统：CentOS 7+

**软件要求：**
- Node.js 14+
- MySQL 5.7+
- Redis 5+（可选）
- Nginx 1.18+
- PM2 4+

### 9.2 部署流程

1. **准备环境**
   - 安装依赖软件
   - 配置域名和 SSL 证书
   - 配置数据库

2. **代码部署**
   - 上传代码到服务器
   - 安装 npm 依赖
   - 配置环境变量

3. **启动服务**
   - 初始化数据库
   - 启动 Node.js 应用
   - 配置 Nginx 反向代理

4. **测试验证**
   - 功能测试
   - 性能测试
   - 安全测试

5. **监控上线**
   - 配置日志监控
   - 配置告警通知
   - 正式上线

### 9.3 运维手册

**日常监控：**
- 查看服务状态：`pm2 status`
- 查看日志：`pm2 logs`
- 监控系统资源：`pm2 monit`

**常见操作：**
- 重启服务：`pm2 restart visitor-api`
- 停止服务：`pm2 stop visitor-api`
- 查看历史日志：`pm2 logs --lines 1000`

**故障处理：**
1. 服务异常 → 查看日志定位问题
2. 数据库连接失败 → 检查数据库状态
3. OA 接口失败 → 检查网络和配置
4. 性能下降 → 分析慢查询和缓存

---

## 📈 迭代计划

### v1.0（当前版本）

- ✅ 基础预约功能
- ✅ OA 系统集成
- ✅ 申请管理
- ✅ 状态查询

### v1.1（规划中）

- ⭕ 消息通知（短信/模板消息）
- ⭕ 审批进度查看
- ⭕ 二维码访客证
- ⭕ 黑名单管理

### v2.0（规划中）

- ⭕ 数据分析报表
- ⭕ 多租户支持
- ⭕ 移动端管理后台
- ⭕ AI 智能客服

---

## 📝 附录

### 附录 A：错误码定义

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 0 | 成功 | - |
| 1001 | 手机号未登记 | 检查手机号或手动填写 |
| 1002 | 手机号格式错误 | 重新输入正确格式 |
| 1003 | 表单验证失败 | 检查填写内容 |
| 2001 | OA 系统不可用 | 稍后重试 |
| 2002 | OA 接口调用失败 | 联系管理员 |
| 3001 | 数据库错误 | 联系管理员 |
| 4001 | 签名验证失败 | 检查密钥配置 |
| 5000 | 未知错误 | 联系技术支持 |

### 附录 B：接口文档

详细接口文档见：[API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)

### 附录 C：部署文档

详细部署文档见：[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

### 附录 D：快速开始

快速开始指南见：[QUICK_START.md](./QUICK_START.md)

---

**文档结束**
