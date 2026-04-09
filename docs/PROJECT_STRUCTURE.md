# 项目结构说明

**更新日期**: 2026-04-07

---

## 📁 根目录结构

```
miniprogram-1/
├── README.md                    # 项目说明文档 ⭐
├── PRD.md                       # 产品需求文档 ⭐
├── OPTIMIZATION_SUMMARY.md      # 优化总结（新建）
├── OPTIMIZATION_REPORT.md       # 详细优化报告
├── package.json                 # 项目依赖配置
├── tsconfig.json                # TypeScript配置
├── docker-compose.yml           # Docker编排配置
├── project.config.json          # 小程序项目配置
├── project.private.config.json  # 小程序私有配置
├── logo.png                     # 项目Logo
│
├── miniprogram/                 # 📱 微信小程序前端
│   ├── pages/                   # 页面
│   │   ├── apply/              # 申请页面
│   │   ├── status/             # 审批状态页
│   │   ├── history/            # 历史记录页
│   │   └── index/              # 首页
│   ├── utils/                   # 工具函数
│   │   ├── api.ts              # API封装
│   │   ├── mask.ts             # 数据脱敏
│   │   └── util.ts             # 通用工具
│   ├── app.json                 # 小程序配置
│   ├── app.ts                   # 小程序入口
│   └── app.wxss                 # 全局样式
│
├── backend/                     # 🔧 Node.js后端服务
│   ├── src/
│   │   ├── controllers/        # 控制器
│   │   │   └── visitorController.js
│   │   ├── routes/             # 路由
│   │   ├── models/             # 数据模型
│   │   ├── database/           # 数据库配置
│   │   ├── services/           # 服务层
│   │   ├── config/             # 配置文件
│   │   └── index.js            # 服务入口
│   ├── .env                    # 环境变量
│   └── package.json            # 后端依赖
│
├── admin/                       # 🖥️ 管理后台（Vue.js）
│
├── docs/                        # 📚 文档目录
│   └── archive/                # 归档文档（464个历史文件）
│
├── config/                      # ⚙️ 配置文件
│   ├── nginx-443.conf          # Nginx HTTPS配置
│   ├── nginx-ssl.conf          # SSL配置
│   └── ...
│
└── scripts/                     # 🛠️ 脚本目录
    └── archive/                # 归档脚本
```

---

## 🎯 核心文件说明

### 文档类
| 文件 | 说明 | 重要性 |
|------|------|--------|
| README.md | 项目快速入门指南 | ⭐⭐⭐⭐⭐ |
| PRD.md | 产品需求文档 | ⭐⭐⭐⭐⭐ |
| OPTIMIZATION_SUMMARY.md | 优化总结 | ⭐⭐⭐⭐ |
| OPTIMIZATION_REPORT.md | 详细优化报告 | ⭐⭐⭐ |

### 配置类
| 文件 | 说明 |
|------|------|
| package.json | 项目元信息和依赖 |
| tsconfig.json | TypeScript编译配置 |
| docker-compose.yml | Docker容器编排 |
| project.config.json | 微信小程序配置 |

### 代码类
| 目录 | 说明 |
|------|------|
| miniprogram/ | 微信小程序源代码 |
| backend/ | Node.js后端服务 |
| admin/ | 管理后台前端 |

### 运维类
| 目录/文件 | 说明 |
|-----------|------|
| config/ | Nginx等配置文件 |
| docs/archive/ | 历史文档归档 |
| scripts/archive/ | 历史脚本归档 |

---

## 📊 优化前后对比

### 根目录文件数量
```
优化前: ~150个文件/文件夹
优化后: 16个文件/文件夹
清理率: 89%
```

### 文档整理
```
优化前: 464个Markdown文件在根目录
优化后: 4个核心文档 + 归档目录
清晰度: ⭐⭐⭐⭐⭐
```

---

## 🔍 快速查找

### 我想...

**查看项目介绍** → [README.md](README.md)  
**了解产品需求** → [PRD.md](PRD.md)  
**查看优化内容** → [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)  
**修改小程序代码** → `miniprogram/pages/`  
**修改后端接口** → `backend/src/controllers/`  
**查看历史文档** → `docs/archive/`  
**查看Nginx配置** → `config/`  

---

## 💡 维护建议

1. **新文档** - 统一放在 `docs/` 目录下
2. **新脚本** - 统一放在 `scripts/` 目录下
3. **配置文件** - 统一放在 `config/` 目录下
4. **定期清理** - 每季度清理一次归档目录

---

**最后更新**: 2026-04-07  
**维护人员**: 开发团队
