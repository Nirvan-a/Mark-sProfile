# 部署指南：Cloudflare Pages + Railway

## 📋 部署概览

- **前端**：Cloudflare Pages（免费，自动 HTTPS + CDN）
- **后端**：Railway（免费额度 $5/月）
- **API 代理**：Cloudflare Worker（免费，10万请求/天）

## 🚀 第一步：部署后端到 Railway

### 1.1 准备代码

确保代码已推送到 Git 仓库（GitHub/GitLab/Bitbucket）

### 1.2 在 Railway 创建项目

1. 访问 https://railway.app
2. 使用 GitHub 账号登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择你的仓库

### 1.3 配置服务

Railway 会自动检测到项目，需要配置：

**Root Directory**: `server`（因为后端代码在 server 目录）

**Start Command**: 
```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

**Environment Variables**:
```
DASHSCOPE_API_KEY=your_dashscope_api_key
PORT=8001
```

### 1.4 获取后端 URL

部署完成后，Railway 会分配一个 URL，例如：
```
https://profile-page-api.up.railway.app
```

**重要**：复制这个 URL，后续配置需要用到。

### 1.5 测试后端

访问 `https://your-backend-url.railway.app/api/health`，应该返回：
```json
{"status": "ok"}
```

---

## 🌐 第二步：部署前端到 Cloudflare Pages

### 2.1 在 Cloudflare 创建 Pages 项目

1. 访问 https://dash.cloudflare.com
2. 进入 "Workers & Pages"
3. 点击 "Create application" → "Pages" → "Connect to Git"
4. 选择你的 Git 仓库

### 2.2 配置构建设置

**Build command**:
```bash
cd web && npm install && npm run build
```

**Build output directory**:
```
web/dist
```

**Root directory**: 留空（项目根目录）

### 2.3 环境变量（可选）

如果直接使用 Worker 代理，不需要配置 `VITE_API_BASE_URL`。

如果直接调用后端，配置：
```
VITE_API_BASE_URL=https://your-backend-url.railway.app
```

### 2.4 部署

点击 "Save and Deploy"，等待构建完成。

### 2.5 获取前端 URL

Cloudflare Pages 会分配一个 URL，例如：
```
https://profile-page.pages.dev
```

---

## 🔧 第三步：配置 Cloudflare Worker 代理

### 3.1 创建 Worker

1. 在 Cloudflare Dashboard 进入 "Workers & Pages"
2. 点击 "Create application" → "Worker"
3. 名称：`api-proxy`（或你喜欢的名字）
4. 点击 "Deploy"

### 3.2 添加代码

1. 点击 "Edit code"
2. 删除默认代码
3. 复制 `cloudflare-worker.js` 文件的内容
4. 粘贴到编辑器
5. 点击 "Save and deploy"

### 3.3 配置环境变量

1. 在 Worker 设置中找到 "Variables"
2. 添加环境变量：
   - **Variable name**: `BACKEND_URL`
   - **Value**: 你的 Railway 后端 URL（例如：`https://profile-page-api.up.railway.app`）

### 3.4 配置路由

1. 在 Worker 设置中找到 "Triggers"
2. 点击 "Add route"
3. 配置：
   - **Route**: `yourdomain.com/api/*`（替换为你的域名）
   - **Zone**: 选择你的域名
4. 保存

**如果没有自定义域名**：
- 可以先使用 Cloudflare Pages 的默认域名
- 路由配置为：`your-pages-domain.pages.dev/api/*`

---

## 🌍 第四步：配置自定义域名（可选但推荐）

### 4.1 在 Cloudflare Pages 配置域名

1. 进入 Pages 项目设置
2. 找到 "Custom domains"
3. 添加你的域名（例如：`profile.yourdomain.com`）
4. 按照提示配置 DNS 记录

### 4.2 在 Cloudflare Worker 配置域名路由

1. 在 Worker 的 "Triggers" 中添加路由
2. 路由：`yourdomain.com/api/*`
3. 或：`profile.yourdomain.com/api/*`

### 4.3 更新后端 CORS

在 Railway 的环境变量中添加：
```
CORS_ORIGINS=https://yourdomain.com,https://profile.yourdomain.com
```

---

## ✅ 第五步：验证部署

### 5.1 测试前端

访问你的前端 URL，检查页面是否正常加载。

### 5.2 测试 API 代理

在浏览器控制台运行：
```javascript
fetch('/api/health').then(r => r.json()).then(console.log)
```

应该返回：`{status: "ok"}`

### 5.3 测试完整功能

1. 访问智能报告工具
2. 测试知识库查询
3. 测试其他工具功能

---

## 🔍 故障排查

### 问题 1：CORS 错误

**解决方案**：
- 确保后端 CORS 配置包含前端域名
- 确保使用 Cloudflare Worker 代理（推荐）

### 问题 2：API 请求失败

**检查**：
1. Railway 后端是否正常运行
2. Worker 环境变量 `BACKEND_URL` 是否正确
3. Worker 路由配置是否正确

### 问题 3：前端构建失败

**检查**：
1. 构建命令是否正确
2. Node.js 版本是否兼容
3. 依赖是否完整

### 问题 4：后端无法访问

**检查**：
1. Railway 服务是否运行
2. 环境变量是否配置正确
3. 日志中是否有错误信息

---

## 📊 监控和维护

### Railway 监控

1. 在 Railway Dashboard 查看资源使用情况
2. 设置使用量告警（接近 $5 时提醒）
3. 查看日志排查问题

### Cloudflare 监控

1. 在 Worker 的 "Metrics" 查看请求统计
2. 在 Pages 的 "Analytics" 查看访问统计

---

## 🎯 部署检查清单

### 后端（Railway）
- [ ] 项目已连接到 Git 仓库
- [ ] Root Directory 设置为 `server`
- [ ] Start Command 配置正确
- [ ] 环境变量 `DASHSCOPE_API_KEY` 已配置
- [ ] 后端 URL 已获取
- [ ] `/api/health` 接口测试通过

### 前端（Cloudflare Pages）
- [ ] 项目已连接到 Git 仓库
- [ ] Build command 配置正确
- [ ] Build output directory 设置为 `web/dist`
- [ ] 前端 URL 已获取
- [ ] 页面可以正常访问

### API 代理（Cloudflare Worker）
- [ ] Worker 已创建
- [ ] 代码已部署
- [ ] 环境变量 `BACKEND_URL` 已配置
- [ ] 路由已配置（`yourdomain.com/api/*`）
- [ ] API 请求测试通过

### 域名配置（可选）
- [ ] 自定义域名已添加到 Cloudflare Pages
- [ ] DNS 记录已配置
- [ ] Worker 路由已更新
- [ ] 后端 CORS 已更新

---

## 💡 优化建议

1. **使用 Cloudflare Worker 缓存**：减少后端请求
2. **监控资源使用**：避免超出免费额度
3. **定期备份**：重要数据定期备份
4. **性能优化**：使用 CDN 加速静态资源

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看 Railway 日志
2. 查看 Cloudflare Worker 日志
3. 检查浏览器控制台错误
4. 查看后端日志

