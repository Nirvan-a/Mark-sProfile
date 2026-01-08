# 从 Render 迁移到 Railway - 快速指南 🚂

## ⏱️ 预计时间：5-10 分钟

## ✅ 准备工作

项目已包含 `railway.json` 配置文件，无需修改代码！

## 🚀 迁移步骤

### 1. 部署到 Railway（3-5分钟）

#### 方式 A: 通过 GitHub 部署（推荐）

1. **访问 Railway**
   - 打开 https://railway.app
   - 使用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的 `Profile-Page` 仓库

3. **Railway 会自动检测配置**
   - Railway 会自动识别 `railway.json`
   - 自动设置根目录为 `server`
   - 自动运行构建和启动命令

#### 方式 B: 通过 Railway CLI（可选）

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 初始化项目（在项目根目录）
railway init

# 部署
railway up
```

---

### 2. 配置环境变量（2分钟）

在 Railway Dashboard 中，进入你的服务 → Variables，添加：

#### 必需的环境变量：

```bash
# DashScope API Key（必需）
DASHSCOPE_API_KEY=your_dashscope_api_key

# CORS 配置（必需，填入你的 Cloudflare Pages 域名）
CORS_ORIGINS=https://your-frontend.pages.dev,https://your-custom-domain.com

# Python 版本（可选，默认会使用合适的版本）
PYTHON_VERSION=3.11.0
```

**💡 提示**：
- `CORS_ORIGINS` 格式：多个域名用逗号分隔，不要有空格
- 如果你的前端域名是 `https://your-app.pages.dev`，直接填这个

---

### 3. 获取 Railway 后端地址（30秒）

部署完成后，在 Railway Dashboard：
- 进入你的服务
- 点击 "Settings" → "Networking"
- 找到 "Public Domain" 或 "Generate Domain"
- 复制生成的 URL，例如：`https://your-app.up.railway.app`

---

### 4. 更新前端配置（1-2分钟）

#### 方式 A: 如果使用环境变量 `VITE_API_BASE_URL`

在 **Cloudflare Pages** Dashboard：
1. 进入你的 Pages 项目
2. 点击 "Settings" → "Environment variables"
3. 添加/更新：
   ```
   VITE_API_BASE_URL=https://your-app.up.railway.app
   ```
4. 保存并重新部署（或等待自动部署）

#### 方式 B: 如果使用 Cloudflare Worker 代理

如果使用了 Cloudflare Worker 作为代理：
1. 进入 Cloudflare Dashboard → Workers & Pages
2. 找到你的 Worker
3. 进入 "Settings" → "Variables"
4. 更新 `BACKEND_URL`：
   ```
   BACKEND_URL=https://your-app.up.railway.app
   ```

#### 方式 C: 直接配置 CORS（推荐）

如果前端直接调用后端 API：
- 确保在 Railway 的 `CORS_ORIGINS` 中包含了你的前端域名
- 前端使用相对路径或 `VITE_API_BASE_URL` 环境变量

---

### 5. 验证部署（1分钟）

1. **检查后端健康**
   ```bash
   curl https://your-app.up.railway.app/api/health
   # 应该返回: {"status":"ok"}
   ```

2. **检查前端**
   - 访问你的 Cloudflare Pages 地址
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签，确认 API 请求指向 Railway 地址
   - 测试一个功能（如智能报告），确认正常

---

## 🔄 从 Render 切换到 Railway

### 选项 1: 并行运行（推荐，零风险）

1. **在 Railway 部署新服务**（保持 Render 运行）
2. **测试 Railway 服务**（使用新的 URL）
3. **确认无误后**，更新前端配置指向 Railway
4. **观察 1-2 天**，确认稳定后再删除 Render 服务

### 选项 2: 直接切换

1. **在 Railway 完成部署和测试**
2. **更新前端配置**指向 Railway
3. **删除 Render 服务**

---

## 📋 配置对比

| 配置项 | Render | Railway |
|--------|--------|---------|
| 配置文件 | `render.yaml` | `railway.json` ✅ |
| 环境变量 | Dashboard → Environment | Dashboard → Variables |
| 自定义域名 | 支持（免费） | 支持（需要配置） |
| 日志查看 | Dashboard → Logs | Dashboard → Deployments → View Logs |
| 重启服务 | Dashboard → Manual Deploy | Dashboard → Redeploy |

---

## 🎯 Railway vs Render 优势

| 特性 | Railway | Render Free |
|------|---------|-------------|
| **冷启动** | 无（不休眠）✅ | 30-60秒 ❌ |
| **价格** | $5/月起 | $0（但会休眠） |
| **部署速度** | 快（2-3分钟） | 快（2-3分钟） |
| **配置复杂度** | 简单 ✅ | 简单 ✅ |
| **日志** | 实时 | 实时 |

---

## ⚠️ 常见问题

### Q: Railway 会自动检测 Python 版本吗？
A: 是的，Railway 会自动检测 `runtime.txt` 或根据代码判断。也可以手动设置 `PYTHON_VERSION` 环境变量。

### Q: 如何查看 Railway 部署日志？
A: 在 Railway Dashboard → 你的服务 → "Deployments" → 点击最新的部署 → "View Logs"

### Q: Railway 服务会休眠吗？
A: Hobby 计划（$5/月）不会休眠，服务始终保持运行。

### Q: 如何设置自定义域名？
A: Railway Dashboard → Settings → Networking → "Custom Domain" → 添加你的域名并配置 DNS

### Q: 迁移后需要修改代码吗？
A: **不需要！** 项目已有 `railway.json`，Railway 会自动识别配置。

---

## 🎉 完成！

迁移完成后，你的架构：
```
前端: Cloudflare Pages
  ↓
后端: Railway (不休眠，快速响应)
```

享受无冷启动的体验！🚀

