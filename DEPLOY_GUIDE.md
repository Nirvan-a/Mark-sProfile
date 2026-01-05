# 部署指南 - Cloudflare Pages + Render

本指南将帮助您将前端部署到 Cloudflare Pages，后端部署到 Render。

## 📋 部署架构

- **前端**: Cloudflare Pages (免费，全球 CDN)
- **后端**: Render (免费计划，首次访问需要几秒唤醒)

---

## 🚀 第一步：部署后端到 Render

### 1.1 注册 Render 账号

1. 访问 [https://render.com](https://render.com)
2. 使用 GitHub 账号登录（推荐）或邮箱注册

### 1.2 创建 Web Service

1. 在 Render Dashboard 点击 **"New +"** → **"Web Service"**
2. 选择 **"Import from an existing repository"** 或 **"Public Git repository"**
3. 连接你的 GitHub 仓库

### 1.3 配置服务

在配置页面填写以下信息：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Name** | `profile-page-api` | 服务名称 |
| **Region** | `Singapore` (或离你最近的区域) | 选择区域 |
| **Branch** | `main` (或你的主分支) | Git 分支 |
| **Root Directory** | `server` | 后端代码目录 |
| **Runtime** | `Python 3` | 运行时 |
| **Build Command** | `pip install -r requirements.txt` | 构建命令 |
| **Start Command** | `uvicorn app:app --host 0.0.0.0 --port $PORT` | 启动命令 |
| **Plan** | `Free` | 免费计划 |

### 1.4 配置环境变量

在 **"Environment"** 部分添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PYTHON_VERSION` | `3.11` | Python 版本 |
| `DASHSCOPE_API_KEY` | `你的API密钥` | 通义千问 API Key |
| `CORS_ORIGINS` | `https://your-frontend.pages.dev` | 前端域名（先留空，部署前端后再填） |

**注意**: `CORS_ORIGINS` 可以先不填，等前端部署完成后再回来更新。

### 1.5 部署

1. 点击 **"Create Web Service"**
2. 等待构建和部署完成（约 5-10 分钟）
3. 部署完成后，你会得到一个 URL，例如：`https://profile-page-api.onrender.com`
4. **保存这个 URL**，后续配置前端时需要用到

---

## 🌐 第二步：部署前端到 Cloudflare Pages

### 2.1 注册 Cloudflare 账号

1. 访问 [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. 注册/登录账号（免费）

### 2.2 创建 Pages 项目

1. 在 Cloudflare Dashboard 左侧菜单选择 **"Pages"**
2. 点击 **"Create a project"**
3. 选择 **"Connect to Git"**
4. 连接你的 GitHub 仓库

### 2.3 配置构建设置

在 **"Set up builds"** 页面填写：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Project name** | `profile-page` | 项目名称 |
| **Production branch** | `main` | 生产分支 |
| **Framework preset** | `None` 或 `Vite` | 框架预设 |
| **Build command** | `cd web && npm install && npm run build` | 构建命令 |
| **Build output directory** | `web/dist` | 输出目录 |

**注意**: 如果看不到 "Build output directory" 字段：
- 先完成初始部署
- 部署完成后，在 **Settings** → **Builds & deployments** → **Configure build** 中修改

### 2.4 配置环境变量

在 **"Environment variables"** 部分添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_API_BASE_URL` | `https://your-render-url.onrender.com` | 后端 API 地址（使用步骤 1.5 中保存的 URL） |

**重要**: 
- 确保 URL 以 `https://` 开头
- 不要以 `/` 结尾
- 例如：`https://profile-page-api.onrender.com`

### 2.5 部署

1. 点击 **"Save and Deploy"**
2. 等待构建完成（约 3-5 分钟）
3. 部署完成后，你会得到一个 URL，例如：`https://profile-page.pages.dev`

### 2.6 更新后端 CORS 配置

前端部署完成后，需要更新后端的 CORS 配置：

1. 回到 Render Dashboard
2. 进入你的 Web Service
3. 点击 **"Environment"** 标签
4. 找到 `CORS_ORIGINS` 变量
5. 更新值为你的 Cloudflare Pages URL：
   ```
   https://profile-page.pages.dev
   ```
   如果有自定义域名，可以添加多个，用逗号分隔：
   ```
   https://profile-page.pages.dev,https://your-custom-domain.com
   ```
6. 点击 **"Save Changes"**
7. Render 会自动重新部署

---

## ✅ 验证部署

### 检查前端

1. 访问你的 Cloudflare Pages URL
2. 打开浏览器开发者工具（F12）
3. 查看 Console 和 Network 标签
4. 确认 API 请求能正常发送到后端

### 检查后端

1. 访问 `https://your-render-url.onrender.com/api/health`
2. 应该返回：`{"status":"ok"}`

### 测试功能

1. 在前端页面测试各个功能模块
2. 确认 API 调用正常
3. 检查是否有 CORS 错误

---

## 🔧 常见问题

### 问题 1: CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**解决方案**:
1. 确认后端的 `CORS_ORIGINS` 环境变量包含前端域名
2. 确保 URL 格式正确（包含 `https://`，不包含尾部斜杠）
3. 更新后等待 Render 重新部署完成

### 问题 2: 前端无法连接后端

**症状**: 网络请求失败或 404

**解决方案**:
1. 检查 `VITE_API_BASE_URL` 环境变量是否正确
2. 确认后端服务已成功部署（访问 `/api/health` 端点）
3. 检查 Render 服务是否处于运行状态（免费计划可能会休眠）

### 问题 3: Render 服务休眠

**症状**: 首次访问需要等待几秒

**原因**: Render 免费计划会在 15 分钟无活动后休眠

**解决方案**:
- 这是正常现象，首次访问需要 10-30 秒唤醒
- 如需避免休眠，可以升级到付费计划
- 或使用外部监控服务定期 ping 你的服务

### 问题 4: 构建失败

**前端构建失败**:
1. 检查 Node.js 版本（Cloudflare Pages 通常使用 Node 18+）
2. 查看构建日志中的错误信息
3. 确认 `package.json` 中的依赖正确

**后端构建失败**:
1. 检查 Python 版本（确保是 3.11）
2. 查看构建日志
3. 确认 `requirements.txt` 中的依赖正确

---

## 📝 后续优化

### 1. 自定义域名

**Cloudflare Pages**:
1. 在 Pages 项目设置中点击 **"Custom domains"**
2. 添加你的域名
3. 按照提示配置 DNS

**Render**:
1. 在 Web Service 设置中点击 **"Custom Domains"**
2. 添加你的域名
3. 更新 DNS 记录

### 2. 环境变量管理

- 使用 Cloudflare Pages 的环境变量管理功能
- 使用 Render 的环境变量管理功能
- 考虑使用 `.env` 文件（但不要提交到 Git）

### 3. 监控和日志

- Cloudflare Pages 提供构建日志和访问日志
- Render 提供实时日志和指标
- 可以集成第三方监控服务

---

## 🎉 完成！

部署完成后，你的应用应该可以正常访问了！

如果遇到问题，请检查：
1. 环境变量配置是否正确
2. CORS 配置是否包含前端域名
3. 后端服务是否正常运行
4. 浏览器控制台是否有错误信息

