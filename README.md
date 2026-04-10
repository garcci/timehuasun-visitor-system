# 时代华鑫访客系统

微信小程序访客管理系统，支持访客申请、审批流程、二维码凭证等功能。

## 📁 项目结构

```
├── miniprogram/          # 微信小程序前端
│   ├── pages/           # 页面（申请、状态、历史等）
│   ├── utils/           # 工具函数（API、脱敏等）
│   └── app.json         # 小程序配置
├── backend/             # Node.js 后端服务
│   ├── src/
│   │   ├── controllers/ # 控制器
│   │   ├── routes/      # 路由
│   │   ├── models/      # 数据模型
│   │   └── database/    # 数据库配置
│   └── .env             # 环境变量
├── admin/               # 管理后台（Vue.js）
├── docs/                # 文档
│   ├── guides/          # 使用指南
│   ├── reports/         # 优化报告
│   ├── oa/              # OA集成文档
│   └── PROJECT_STRUCTURE.md # 项目结构
├── PRD.md               # 产品需求文档
├── SIGNATURE_RULES.md   # 签名规则
└── JAVA_UTIL_README.md  # Java工具说明
```

## 🚀 快速开始

### 前端开发
```bash
# 使用微信开发者工具打开 miniprogram 目录
```

### 后端启动
```bash
cd backend
npm install
cp .env.example .env  # 配置环境变量
npm start
```

### 生产部署
```bash
# 使用自动部署脚本
./auto-deploy.sh

# 或手动部署
scp -r backend/ user@server:/path/to/deploy
ssh user@server "cd /path && npm install && pm2 start src/index.js"
```

## 🔧 核心功能

- ✅ 访客在线申请
- ✅ 被访人OA系统自动查询
- ✅ 随行人员管理
- ✅ 审批流程（待审批/已通过/已拒绝）
- ✅ 二维码进厂凭证
- ✅ 历史记录查询
- ✅ 数据脱敏保护
- ✅ 草稿自动保存

## 📊 技术栈

**前端**
- 微信小程序 (TypeScript)
- 原生组件 + 自定义样式

**后端**
- Node.js + Express
- MySQL 数据库
- JWT 认证
- Winston 日志

**部署**
- Nginx 反向代理
- HTTPS (阿里云SSL证书)
- PM2 进程管理

## 📝 文档

### 使用指南
- [管理后台登录指南](docs/guides/ADMIN_LOGIN_GUIDE.md)
- [PM2部署指南](docs/guides/PM2_SETUP_GUIDE.md)
- [高可用保障](docs/guides/HIGH_AVAILABILITY_GUARANTEE.md)

### 优化报告
- [系统优化报告](docs/reports/OPTIMIZATION_REPORT.md)
- [优化总结](docs/reports/OPTIMIZATION_SUMMARY.md)
- [SQL修复报告](docs/reports/SQL_FIX_REPORT.md)

### OA集成
- [OA API密钥配置](docs/oa/OA_API_SECRET_CONFIG.md)
- [OA回调示例](docs/oa/OA_CALLBACK_EXAMPLE.md)

### 核心文档
- [PRD.md](PRD.md) - 产品需求文档
- [SIGNATURE_RULES.md](SIGNATURE_RULES.md) - 签名规则
- [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) - 项目结构

## 🔐 安全提示

- 所有敏感信息（身份证、手机号）均已脱敏显示
- API接口使用HTTPS加密传输
- 数据库连接使用连接池管理
- 输入验证和SQL注入防护

## 📞 技术支持

如有问题，请联系系统管理员。
