# 部署状态

## ✅ 已完成的步骤

1. **代码已推送到 GitHub**
   - 仓库: https://github.com/Nirvan-a/Mark-sProfile.git
   - 所有配置文件已提交

2. **前端已构建**
   - 构建目录: `web/dist`
   - 构建状态: ✅ 成功

3. **Cloudflare 已登录**
   - Wrangler CLI 已认证
   - 可以执行部署命令

4. **配置文件已就绪**
   - `render.yaml` - Render 后端配置
   - `web/wrangler.toml` - Cloudflare Pages 配置
   - `web/public/_redirects` - SPA 路由配置

## 📋 下一步操作

### 方式一：通过 Web UI 部署（推荐）

#### Cloudflare Pages

1. 访问: https://dash.cloudflare.com → Pages
2. 点击 **"Create a project"** → **"Connect to Git"**
3. 选择 GitHub 仓库: `Nirvan-a/Mark-sProfile`
4. 配置构建设置:
   - **Project name**: `profile-page`
   - **Production branch**: `main`
   - **Framework preset**: `None` 或 `Vite`
   - **Build command**: `cd web && npm install && npm run build`
   - **Build output directory**: `web/dist`
5. 添加环境变量:
   - `VITE_API_BASE_URL` = `<Render后端URL>` (部署后端后填写)
6. 点击 **"Save and Deploy"**

#### Render 后端

1. 访问: https://render.com → **"New +"** → **"Web Service"**
2. 选择 **"Connect GitHub"** → 选择仓库 `Nirvan-a/Mark-sProfile`
3. 配置服务:
   - **Name**: `profile-page-api`
   - **Region**: `Singapore` (或离你最近的区域)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. 添加环境变量:
   - `PYTHON_VERSION` = `3.11`
   - `DASHSCOPE_API_KEY` = `<你的API密钥>`
   - `CORS_ORIGINS` = `<前端URL>` (部署前端后填写)
5. 点击 **"Create Web Service"**

### 方式二：使用命令行（需要先创建项目）

如果已经在 Cloudflare Dashboard 创建了项目，可以使用：

```bash
# 部署前端
wrangler pages deploy web/dist --project-name="profile-page"
```

## 🔄 部署顺序

1. **先部署后端** (Render)
   - 获取后端 URL: `https://profile-page-api.onrender.com`
   
2. **再部署前端** (Cloudflare Pages)
   - 设置环境变量 `VITE_API_BASE_URL` = 后端 URL
   - 获取前端 URL: `https://profile-page.pages.dev`
   
3. **更新后端 CORS**
   - 在 Render 中添加 `CORS_ORIGINS` = 前端 URL

## 🚀 快速命令

```bash
# 重新构建并部署前端（如果项目已创建）
cd web && npm run build && cd .. && wrangler pages deploy web/dist --project-name="profile-page"

# 检查部署状态
wrangler pages deployment list --project-name="profile-page"
```

## 📝 环境变量清单

### Cloudflare Pages
- `VITE_API_BASE_URL` = `https://your-render-service.onrender.com`

### Render
- `PYTHON_VERSION` = `3.11`
- `DASHSCOPE_API_KEY` = `<你的API密钥>`
- `CORS_ORIGINS` = `https://your-frontend.pages.dev`

## ✅ 验证清单

- [ ] 后端部署完成，可以访问 `/api/health`
- [ ] 前端部署完成，页面可以正常加载
- [ ] 环境变量已正确配置
- [ ] CORS 配置已更新
- [ ] 前端可以正常调用后端 API

