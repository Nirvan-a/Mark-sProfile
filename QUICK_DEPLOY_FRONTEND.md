# 🚀 快速部署前端到 Cloudflare Pages

## ✅ 准备工作已完成

- ✅ 前端已构建 (`web/dist`)
- ✅ 后端已部署: https://profile-page-api-3y6v.onrender.com
- ✅ 代码已推送到 GitHub

## 📋 部署步骤（5 分钟）

### 1. 打开 Cloudflare Dashboard
访问: https://dash.cloudflare.com → **Pages**

### 2. 创建项目
- 点击 **"Create a project"**
- 选择 **"Connect to Git"**
- 选择 GitHub 账号
- 选择仓库: **`Nirvan-a/Mark-sProfile`**
- 点击 **"Begin setup"**

### 3. 配置构建设置

在 **"Set up builds"** 页面：

| 字段 | 值 |
|------|-----|
| **Project name** | `profile-page` |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | `cd web && npm install && npm run build` |
| **Build output directory** | `web/dist` |

**注意**: 如果看不到 "Build output directory" 字段：
- 先点击 "Save and Deploy" 完成初始部署
- 然后在 **Settings** → **Builds & deployments** → **Configure build** 中修改

### 4. 添加环境变量

在 **"Environment variables"** 部分（可能在构建配置下方或 Settings 中）：

点击 **"Add variable"** 添加：

- **Variable name**: `VITE_API_BASE_URL`
- **Value**: `https://profile-page-api-3y6v.onrender.com`

**重要**: 
- 不要以 `/` 结尾
- 确保是 `https://` 开头

### 5. 部署

- 点击 **"Save and Deploy"**
- 等待构建完成（约 3-5 分钟）
- 部署完成后会显示你的前端 URL，例如：`https://profile-page.pages.dev`

### 6. 更新后端 CORS（重要！）

前端部署完成后，**必须**更新后端 CORS 配置：

1. 打开 Render Dashboard: https://dashboard.render.com
2. 进入 `profile-page-api` 服务
3. 点击 **"Environment"** 标签
4. 添加环境变量：
   - **Key**: `CORS_ORIGINS`
   - **Value**: `https://你的前端URL.pages.dev`
   - 例如: `https://profile-page.pages.dev`
5. 点击 **"Save Changes"**
6. 等待重新部署完成（约 2-3 分钟）

## ✅ 验证

1. 访问前端 URL
2. 打开浏览器开发者工具 (F12)
3. 检查 Console 是否有错误
4. 检查 Network 标签，确认 API 请求成功
5. 测试各个功能模块

## 🎉 完成！

部署完成后，你的应用就可以正常使用了！

---

## 📝 部署信息

**后端 URL**: https://profile-page-api-3y6v.onrender.com  
**前端 URL**: `<部署后获取>`

