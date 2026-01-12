# 🚀 部署后配置步骤

## ✅ 当前状态

部署正在进行中，预计 5-10 分钟完成。部署完成后，请按以下步骤配置：

## 1️⃣ 检查部署状态

```bash
cd server

# 查看部署状态
flyctl status --app profile-page-api

# 查看日志（确认应用已启动）
flyctl logs --app profile-page-api

# 测试健康检查
curl https://profile-page-api.fly.dev/api/health
```

应该返回：`{"status":"ok"}`

## 2️⃣ 设置环境变量（必需）

应用需要以下环境变量才能正常工作：

```bash
# 设置 DashScope API Key（必需）
flyctl secrets set DASHSCOPE_API_KEY=your_dashscope_key --app profile-page-api

# 设置 Tavily API Key（必需）
flyctl secrets set TAVILY_API_KEY=your_tavily_key --app profile-page-api

# 设置前端域名（用于 CORS，必需）
# 替换为你的 Cloudflare Pages 域名
flyctl secrets set CORS_ORIGINS=https://your-frontend.pages.dev --app profile-page-api
```

**获取 API Keys：**
- DashScope: https://dashscope.console.aliyun.com/
- Tavily: https://tavily.com/

**验证环境变量：**
```bash
flyctl secrets list --app profile-page-api
```

**注意：** 设置环境变量后，应用会自动重启。

## 3️⃣ 配置前端

在 Cloudflare Pages 项目中：

1. 进入项目设置 → Environment variables
2. 添加以下环境变量（Production 环境）：

```
VITE_API_BASE_URL=https://profile-page-api.fly.dev
```

3. 重新部署前端（如果需要）

## 4️⃣ 验证完整流程

1. **后端健康检查：**
   ```bash
   curl https://profile-page-api.fly.dev/api/health
   ```

2. **前端访问：**
   访问你的 Cloudflare Pages 域名，测试 API 调用是否正常

3. **检查 CORS：**
   打开浏览器开发者工具，确认没有 CORS 错误

## 📋 常用命令

```bash
# 查看应用状态
flyctl status --app profile-page-api

# 查看实时日志
flyctl logs --app profile-page-api

# 查看应用信息（包括 URL）
flyctl info --app profile-page-api

# 更新部署
cd server
flyctl deploy --app profile-page-api

# 查看所有环境变量
flyctl secrets list --app profile-page-api

# SSH 进入容器（调试用）
flyctl ssh console --app profile-page-api
```

## ⚠️ 故障排查

### 应用无法启动

```bash
# 查看详细日志
flyctl logs --app profile-page-api

# 检查环境变量是否设置
flyctl secrets list --app profile-page-api
```

### CORS 错误

确保设置了 `CORS_ORIGINS` 环境变量，并且包含完整的前端域名（包括 `https://`）

### 502 错误

应用可能还在启动中，等待 1-2 分钟后再试。查看日志确认：

```bash
flyctl logs --app profile-page-api
```

## 🎉 完成！

配置完成后，你的后端将：
- ✅ 始终保持运行（无冷启动）
- ✅ 自动 HTTPS
- ✅ 全球 CDN 加速
- ✅ 完全免费

---

**应用 URL：** https://profile-page-api.fly.dev  
**前端需要配置：** `VITE_API_BASE_URL=https://profile-page-api.fly.dev`
