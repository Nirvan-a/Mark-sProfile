# 个人主页 - 个人工具集

一个基于 React + TypeScript + FastAPI 的个人主页项目，内置多个实用工具。

## 📋 项目概述

- **主页**：个人展示页面，包含工具入口
- **智能问数工具**：上传 Excel 文件，通过自然语言查询数据
- **智能报告工具**：按照要求撰写长文报告，自动生成大纲并完成撰写
- **智能点单工具**：智能点单助手，帮助您快速完成点单
- **智能规划工具**：智能规划助手，帮助您制定计划

## 🏗️ 项目结构

```
个人主页/
├── web/              # 前端项目（React + TypeScript + Vite）
│   └── src/
│       ├── pages/    # 页面组件（如主页）
│       ├── tools/    # 小工具集合
│       │   └── askdata/  # 智能问数工具
│       └── shared/   # 共享资源
└── server/           # 后端服务（FastAPI + Python）
```

## 🚀 快速开始

### 一键安装所有依赖

```bash
npm run install:all
```

### 单栈开发模式（推荐）

一套前后端服务，通过路由访问所有工具：

```bash
# 启动完整的开发环境
npm run dev

# 前端: http://localhost:5173
# 后端: http://localhost:8001
```

### 工具访问地址

所有工具都在同一个前端应用中，通过路由访问：

| 工具 | 访问地址 | API 路由 | 状态 |
|------|----------|----------|------|
| **个人主页** | http://localhost:5173/ | - | ✅ |
| **智能问数** | http://localhost:5173/askdata | /api/askdata/* | ✅ |
| **智能报告** | http://localhost:5173/smartreport | /api/smartreport/* | ✅ |
| **智能点单** | http://localhost:5173/smartorder | /api/smartorder/* | ✅ |
| **智能规划** | http://localhost:5173/smartplan | /api/smartplan/* | ✅ |

### 传统开发模式

```bash
# 仅启动前端
cd web && npm run dev

# 仅启动后端
npm run dev:server
```

### 管理命令

```bash
# 查看服务状态和所有访问地址
npm run list

# 停止所有服务
npm run stop

# 清理构建文件
npm run clean
```

## 📦 构建

### 前端构建

```bash
# 前端构建
cd web
npm run build

# 构建产物在 web/dist 目录
```


## 🛠️ 添加新工具

1. 在 `web/src/tools/` 下创建新工具目录
2. 实现工具组件
3. 在 `web/src/App.tsx` 中添加路由
4. 在主页 `web/src/pages/Profile.tsx` 添加入口卡片


## 📝 路由说明

- `/` - 主页（Profile）
- `/askdata` - 智能问数工具
- `/smartreport` - 智能报告工具
- `/smartorder` - 智能点单工具
- `/smartplan` - 智能规划工具

## 🔗 相关文档

- [后端 API 文档](./server/README.md)

## 📄 许可证

MIT

