# 🚀 快速部署指南

## 5 分钟快速部署

### 步骤 1：部署后端到 Railway（2分钟）

1. 访问 https://railway.app，用 GitHub 登录
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. 在服务设置中：
   - **Root Directory**: `server`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. 添加环境变量：
   - `DASHSCOPE_API_KEY`: 你的 API Key
6. 等待部署完成，复制后端 URL（例如：`https://xxx.up.railway.app`）

### 步骤 2：部署前端到 Cloudflare Pages（2分钟）

1. 访问 https://dash.cloudflare.com，进入 "Workers & Pages"
2. 点击 "Create application" → "Pages" → "Connect to Git"
3. 选择你的仓库
4. 配置：
   - **Build command**: `cd web && npm install && npm run build`
   - **Build output directory**: `web/dist`
5. 点击 "Save and Deploy"

### 步骤 3：配置 Cloudflare Worker（1分钟）

1. 在 Cloudflare Dashboard 创建新的 Worker
2. 复制 `cloudflare-worker.js` 的内容到 Worker
3. 在 Worker 设置中添加环境变量：
   - `BACKEND_URL`: 你的 Railway 后端 URL
4. 配置路由：`your-pages-domain.pages.dev/api/*` → Worker

### 完成！

现在访问你的 Cloudflare Pages URL，应该可以正常使用了。

---

## 📝 详细步骤

查看 `DEPLOYMENT_GUIDE.md` 获取完整的部署文档。

