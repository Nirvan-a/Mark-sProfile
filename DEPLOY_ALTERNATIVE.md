# 🚀 替代部署方案（Railway 受限）

由于 Railway 免费计划受限，我们使用 **Render** 作为后端部署平台。

## 方案对比

| 平台 | 免费额度 | 限制 | 推荐度 |
|------|---------|------|--------|
| **Render** | ✅ 免费 | 会休眠（15分钟无请求） | ⭐⭐⭐⭐⭐ |
| Railway | ❌ 已受限 | 只能部署数据库 | ❌ |
| Fly.io | ✅ 免费 | 配置复杂 | ⭐⭐⭐ |

## 🎯 推荐方案：Render + Cloudflare

- **后端**：Render（免费，会休眠）
- **前端**：Cloudflare Pages（免费）
- **API 代理**：Cloudflare Worker（免费）

---

## 第一步：部署后端到 Render

### 1.1 访问 Render
打开浏览器，访问：https://render.com

### 1.2 注册/登录
- 点击 "Get Started for Free"
- 使用 GitHub 账号登录
- 授权 Render 访问你的 GitHub

### 1.3 创建 Web Service
1. 在 Dashboard 点击 "New +"
2. 选择 "Web Service"
3. 点击 "Connect account" 连接 GitHub（如果还没连接）
4. 在仓库列表中找到并选择：**Nirvan-a/Mark-sProfile**

### 1.4 配置服务
填写以下信息：

**基本信息**：
- **Name**: `profile-page-api`（或你喜欢的名字）
- **Region**: 选择离你最近的区域（如 `Singapore` 或 `Oregon`）
- **Branch**: `main`
- **Root Directory**: `server` ⚠️ **重要**

**构建和启动**：
- **Environment**: `Python 3`
- **Build Command**: 
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```bash
  uvicorn app:app --host 0.0.0.0 --port $PORT
  ```

**计划**：
- 选择 **Free**（免费计划）

### 1.5 添加环境变量
在 "Advanced" 部分，点击 "Add Environment Variable"：

- **Key**: `DASHSCOPE_API_KEY`
- **Value**: 你的 DashScope API Key

### 1.6 部署
1. 点击 "Create Web Service"
2. 等待构建和部署（通常 5-10 分钟）
3. 在 "Events" 标签页查看部署进度

### 1.7 获取后端 URL
部署完成后，Render 会自动分配一个 URL，例如：
```
https://profile-page-api.onrender.com
```

**重要**：复制这个 URL，后续步骤需要用到。

### 1.8 测试后端
访问：`https://你的后端URL.onrender.com/api/health`

应该返回：`{"status": "ok"}`

⚠️ **注意**：Render 免费计划会休眠（15分钟无请求后），首次访问需要等待 30-60 秒唤醒。

---

## 第二步：部署前端到 Cloudflare Pages

（步骤与之前相同）

1. 访问 https://dash.cloudflare.com
2. 进入 "Workers & Pages" → "Create application" → "Pages"
3. 连接 `Nirvan-a/Mark-sProfile` 仓库
4. 配置：
   - **Build command**: `cd web && npm install && npm run build`
   - **Build output directory**: `web/dist`
5. 点击 "Save and Deploy"

---

## 第三步：配置 Cloudflare Worker

（步骤与之前相同，只需将 `BACKEND_URL` 改为 Render 的 URL）

1. 创建 Worker
2. 复制 `cloudflare-worker.js` 的代码
3. 添加环境变量：
   - `BACKEND_URL` = 你的 Render 后端 URL
4. 配置路由：`你的前端域名/api/*` → Worker

---

## 🆚 Render vs Railway

### Render 优点
- ✅ 完全免费
- ✅ 自动 HTTPS
- ✅ 配置简单
- ✅ 支持 Python

### Render 缺点
- ⚠️ 免费计划会休眠（首次访问需要等待）
- ⚠️ 构建时间可能较长

### 解决方案
- 使用 Cloudflare Worker 代理可以改善首次访问体验
- 或者考虑升级到付费计划（$7/月起）

---

## 📝 其他替代方案

### 方案 2：Fly.io（如果 Render 不行）

1. 安装 Fly CLI：
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. 登录：
   ```bash
   flyctl auth login
   ```

3. 部署：
   ```bash
   cd server
   flyctl launch
   ```

### 方案 3：使用国内平台（如果主要用户在国内）

- 阿里云函数计算（免费额度）
- 腾讯云 Serverless（免费额度）
- 华为云函数工作流（免费额度）

---

## ✅ 完成检查清单

- [ ] Render 账号已注册
- [ ] 后端已部署到 Render
- [ ] 后端 URL 可以访问 `/api/health`
- [ ] Cloudflare Pages 前端已部署
- [ ] Cloudflare Worker 已配置
- [ ] API 请求测试通过

---

## 🆘 遇到问题？

### Render 部署失败
- 检查 Root Directory 是否设置为 `server`
- 检查 Build Command 是否正确
- 查看构建日志排查问题

### Render 休眠问题
- 首次访问需要等待 30-60 秒
- 使用 Cloudflare Worker 可以改善体验
- 考虑使用 Uptime Robot 等工具定期唤醒（免费）

