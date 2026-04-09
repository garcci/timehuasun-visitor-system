# 访客系统后端服务

## 📦 技术栈

- **Node.js** - 运行环境
- **Express** - Web 框架
- **MongoDB** - 数据库
- **Mongoose** - ODM 库

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 MongoDB 连接字符串。

### 3. 启动服务

**开发模式（自动重启）：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

服务默认运行在 `http://localhost:3000`

## 📡 API 接口文档

### 基础 URL
```
http://localhost:3000/api/visitors
```

### 接口列表

#### 1. 提交访客申请
```http
POST /api/visitors
Content-Type: application/json

{
  "openid": "user-openid-xxx",
  "name": "张三",
  "phone": "13800138000",
  "idType": "居民身份证",
  "idCard": "110101199001011234",
  "organization": "某某公司",
  "plateNumber": "京 A12345",
  "companions": [
    {
      "name": "李四",
      "idCard": "110101199001011235",
      "phone": "13900139000"
    }
  ],
  "hostName": "王五",
  "hostPhone": "13600136000",
  "visitDate": "2025-01-15",
  "visitTime": "14:30",
  "endDate": "2025-01-15",
  "endTime": "16:30",
  "purpose": "商务洽谈",
  "remark": ""
}
```

**响应示例：**
```json
{
  "code": 0,
  "message": "申请提交成功",
  "data": {
    "id": "uuid-xxx",
    "submitTime": "2025-01-15T06:30:00.000Z"
  }
}
```

---

#### 2. 获取申请列表
```http
GET /api/visitors?openid=xxx&page=1&pageSize=10&status=pending
```

**查询参数：**
- `openid` (必填) - 用户 openid
- `page` (可选) - 页码，默认 1
- `pageSize` (可选) - 每页数量，默认 10
- `status` (可选) - 状态筛选：pending/approved/rejected

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "_id": "mongo-id",
        "id": "uuid-xxx",
        "openid": "user-openid",
        "name": "张三",
        "status": "pending",
        "submitTime": "2025-01-15T06:30:00.000Z",
        ...
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

---

#### 3. 获取单个申请详情
```http
GET /api/visitors/:id
```

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "_id": "mongo-id",
    "id": "uuid-xxx",
    "name": "张三",
    "status": "approved",
    ...
  }
}
```

---

#### 4. 更新申请状态（审批）
```http
PUT /api/visitors/:id/status
Content-Type: application/json

{
  "status": "approved",
  "rejectReason": "" // 仅在拒绝时需要
}
```

**响应示例：**
```json
{
  "code": 0,
  "message": "审批成功",
  "data": {
    "_id": "mongo-id",
    "id": "uuid-xxx",
    "status": "approved",
    "approvalTime": "2025-01-15T07:00:00.000Z",
    ...
  }
}
```

---

### 健康检查
```http
GET /health
```

**响应：**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T06:30:00.000Z"
}
```

## 🗄️ 数据库

### MongoDB 连接

本地开发：
```
mongodb://localhost:27017/visitor-system
```

### 数据模型

#### VisitorApplication（访客申请）
- `openid` - 用户微信 openid
- `name` - 访客姓名
- `phone` - 联系电话
- `idType` - 证件类型
- `idCard` - 证件号码
- `organization` - 来访单位
- `plateNumber` - 车牌号
- `companions` - 随行人员数组
- `hostName` - 被访人姓名
- `hostPhone` - 被访人电话
- `visitDate` - 来访日期
- `visitTime` - 来访时间
- `endDate` - 结束日期
- `endTime` - 结束时间
- `purpose` - 来访事由
- `remark` - 备注
- `status` - 审批状态（pending/approved/rejected）
- `submitTime` - 提交时间
- `approvalTime` - 审批时间
- `rejectReason` - 拒绝原因
- `oaFlowId` - OA 流程 ID

## 🔧 开发说明

### 项目结构
```
backend/
├── src/
│   ├── controllers/     # 控制器
│   ├── models/          # 数据模型
│   ├── routes/          # 路由
│   ├── database/        # 数据库配置
│   ├── middleware/      # 中间件
│   ├── utils/           # 工具函数
│   └── index.js         # 入口文件
├── .env                 # 环境变量
├── .env.example         # 环境变量示例
└── package.json
```

### TODO: OA 系统集成

以下功能需要对接 OA 系统接口：

1. **调用 OA 审批流程**
   - 位置：`controllers/visitorController.js` 的 `submitApplication`
   - 说明：提交申请后调用 OA 系统启动审批流程

2. **验证被访人信息**
   - 新增接口：`GET /api/hosts/validate?phone=xxx`
   - 说明：根据手机号验证被访人并获取姓名

3. **白名单校验**
   - 新增接口：`POST /api/whitelist/check`
   - 说明：检查被访人是否在白名单内

## 📝 注意事项

1. 确保 MongoDB 服务已启动
2. 首次运行需要安装依赖：`npm install`
3. 开发模式下使用 `nodemon` 实现热重载
4. 生产环境请修改 `.env` 中的数据库连接
