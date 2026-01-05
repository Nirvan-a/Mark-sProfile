# 🚀 部署步骤 - 实时指导

## 第一步：部署后端到 Railway

### 1.1 访问 Railway
打开浏览器，访问：https://railway.app

### 1.2 登录
- 点击右上角 "Login"
- 选择 "Login with GitHub"
- 授权 Railway 访问你的 GitHub 账号

### 1.3 创建新项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 在仓库列表中找到并选择：**Nirvan-a/Mark-sProfile**
4. 点击仓库名称

### 1.4 配置服务
Railway 会自动检测到项目，需要配置：

**重要配置**：
1. 点击服务名称（可能是 "Mark-sProfile"）
2. 在 "Settings" 标签页找到：
   - **Root Directory**: 设置为 `server`
   - **Start Command**: 设置为 `uvicorn app:app --host 0.0.0.0 --port $PORT`

### 1.5 添加环境变量
1. 在服务设置中找到 "Variables" 标签页
2. 点击 "New Variable"
3. 添加：
   - **Name**: `DASHSCOPE_API_KEY`
   - **Value**: 你的 DashScope API Key（从阿里云获取）

### 1.6 等待部署
- Railway 会自动开始构建和部署
- 等待 2-5 分钟
- 在 "Deployments" 标签页查看部署进度

### 1.7 获取后端 URL
1. 部署完成后，在 "Settings" 标签页找到 "Domains"
2. 点击 "Generate Domain"（如果没有自动生成）
3. 复制生成的 URL，例如：`https://xxx.up.railway.app`
4. **重要**：保存这个 URL，后续步骤需要用到

### 1.8 测试后端
在浏览器访问：`https://你的后端URL/api/health`

应该返回：`{"status": "ok"}`

---

## 第二步：部署前端到 Cloudflare Pages

### 2.1 访问 Cloudflare
打开浏览器，访问：https://dash.cloudflare.com

### 2.2 登录
- 如果没有账号，先注册（免费）
- 登录后进入 Dashboard

### 2.3 创建 Pages 项目
1. 在左侧菜单找到 "Workers & Pages"
2. 点击 "Create application"
3. 选择 "Pages" → "Connect to Git"
4. 选择 "GitHub" 并授权
5. 在仓库列表中选择：**Nirvan-a/Mark-sProfile**

### 2.4 配置构建设置
在 "Set up builds" 页面配置：

**Build command**:
```bash
cd web && npm install && npm run build
```

**Build output directory**:
```
web/dist
```

**Root directory**: 留空（项目根目录）

### 2.5 环境变量（可选）
如果直接使用 Worker 代理，**不需要**配置 `VITE_API_BASE_URL`。

如果直接调用后端，可以添加：
- **Variable name**: `VITE_API_BASE_URL`
- **Value**: 你的 Railway 后端 URL

### 2.6 部署
1. 点击 "Save and Deploy"
2. 等待构建完成（通常 2-5 分钟）
3. 构建完成后会显示前端 URL，例如：`https://xxx.pages.dev`

### 2.7 获取前端 URL
在 Pages 项目页面，找到 "Custom domains" 或直接使用默认的 `.pages.dev` 域名。

**保存这个 URL**，后续配置 Worker 需要用到。

---

## 第三步：配置 Cloudflare Worker 代理

### 3.1 创建 Worker
1. 在 Cloudflare Dashboard，进入 "Workers & Pages"
2. 点击 "Create application"
3. 选择 "Worker"
4. 名称：`api-proxy`（或你喜欢的名字）
5. 点击 "Deploy"

### 3.2 添加代码
1. 在 Worker 页面，点击 "Edit code"
2. 删除编辑器中的默认代码
3. 打开项目中的 `cloudflare-worker.js` 文件
4. 复制全部内容
5. 粘贴到 Worker 编辑器
6. 点击 "Save and deploy"

### 3.3 配置环境变量
1. 在 Worker 设置中找到 "Variables" 标签页
2. 在 "Environment Variables" 部分，点击 "Add variable"
3. 添加：
   - **Variable name**: `BACKEND_URL`
   - **Value**: 你的 Railway 后端 URL（例如：`https://xxx.up.railway.app`）
4. 保存

### 3.4 配置路由
1. 在 Worker 设置中找到 "Triggers" 标签页
2. 在 "Routes" 部分，点击 "Add route"
3. 配置：
   - **Route**: `你的前端域名/api/*`
     - 例如：`xxx.pages.dev/api/*`
     - 或：`yourdomain.com/api/*`（如果配置了自定义域名）
   - **Zone**: 选择你的域名（如果没有自定义域名，选择 Cloudflare 的默认域名）
4. 保存

---

## 第四步：测试部署

### 4.1 测试前端
访问你的 Cloudflare Pages URL，检查页面是否正常加载。

### 4.2 测试 API 代理
在浏览器控制台（F12）运行：
```javascript
fetch('/api/health').then(r => r.json()).then(console.log)
```

应该返回：`{status: "ok"}`

### 4.3 测试完整功能
1. 访问智能报告工具
2. 测试知识库查询
3. 测试其他工具功能

---

## 🆘 遇到问题？

### Railway 部署失败
- 检查 Root Directory 是否设置为 `server`
- 检查环境变量是否配置正确
- 查看 Railway 的构建日志

### Cloudflare Pages 构建失败
- 检查 Build command 是否正确
- 检查 Node.js 版本是否兼容
- 查看构建日志

### API 请求失败
- 检查 Worker 的 `BACKEND_URL` 环境变量
- 检查 Worker 路由配置
- 检查后端 CORS 配置

---

## ✅ 完成检查清单

- [ ] Railway 后端部署成功
- [ ] 后端 URL 可以访问 `/api/health`
- [ ] Cloudflare Pages 前端部署成功
- [ ] 前端页面可以正常访问
- [ ] Cloudflare Worker 已创建并配置
- [ ] Worker 环境变量 `BACKEND_URL` 已设置
- [ ] Worker 路由已配置
- [ ] API 请求测试通过
- [ ] 完整功能测试通过

---

## 📝 需要保存的信息

完成部署后，请保存以下信息：

1. **Railway 后端 URL**: `https://xxx.up.railway.app`
2. **Cloudflare Pages 前端 URL**: `https://xxx.pages.dev`
3. **Cloudflare Worker 名称**: `api-proxy`
4. **环境变量**:
   - Railway: `DASHSCOPE_API_KEY`
   - Worker: `BACKEND_URL`

