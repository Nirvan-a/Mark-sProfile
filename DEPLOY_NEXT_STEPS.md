# 🎉 后端部署成功！下一步操作

## ✅ 后端状态

- **后端 URL**: https://profile-page-api-3y6v.onrender.com
- **状态**: ✅ 已成功部署
- **健康检查**: https://profile-page-api-3y6v.onrender.com/api/health

## 📋 下一步：部署前端到 Cloudflare Pages

### 步骤 1: 创建 Cloudflare Pages 项目

1. **访问 Cloudflare Dashboard**
   - 打开: https://dash.cloudflare.com
   - 登录你的账号

2. **创建 Pages 项目**
   - 点击左侧菜单 **"Pages"**
   - 点击 **"Create a project"**
   - 选择 **"Connect to Git"**

3. **连接 GitHub 仓库**
   - 选择 GitHub 账号
   - 选择仓库: `Nirvan-a/Mark-sProfile`
   - 点击 **"Begin setup"**

### 步骤 2: 配置构建设置

在 **"Set up builds"** 页面填写：

| 配置项 | 值 |
|--------|-----|
| **Project name** | `profile-page` |
| **Production branch** | `main` |
| **Framework preset** | `None` 或 `Vite` |
| **Build command** | `cd web && npm install && npm run build` |
| **Build output directory** | `web/dist` |

**注意**: 如果看不到 "Build output directory" 字段：
- 先完成初始部署
- 部署后，在 **Settings** → **Builds & deployments** → **Configure build** 中修改

### 步骤 3: 配置环境变量

在 **"Environment variables"** 部分添加：

| 变量名 | 值 |
|--------|-----|
| `VITE_API_BASE_URL` | `https://profile-page-api-3y6v.onrender.com` |

**重要提示**:
- URL 必须以 `https://` 开头
- 不要以斜杠 `/` 结尾
- 使用上面提供的完整后端 URL

### 步骤 4: 部署

1. 点击 **"Save and Deploy"**
2. 等待构建完成（约 3-5 分钟）
3. 部署完成后，你会得到一个前端 URL，例如：`https://profile-page.pages.dev`
4. **保存这个前端 URL**，下一步需要用到

### 步骤 5: 更新后端 CORS 配置

前端部署完成后，需要更新后端的 CORS 配置：

1. **回到 Render Dashboard**
   - 访问: https://dashboard.render.com
   - 进入 `profile-page-api` 服务

2. **添加 CORS 环境变量**
   - 点击 **"Environment"** 标签
   - 添加新的环境变量：
     - **Key**: `CORS_ORIGINS`
     - **Value**: `https://你的前端URL.pages.dev`
     - 例如: `https://profile-page.pages.dev`
   - 如果有自定义域名，可以添加多个，用逗号分隔：
     - `https://profile-page.pages.dev,https://your-custom-domain.com`

3. **保存并等待重新部署**
   - 点击 **"Save Changes"**
   - Render 会自动重新部署（约 2-3 分钟）

## ✅ 验证部署

### 检查后端
```bash
# 健康检查
curl https://profile-page-api-3y6v.onrender.com/api/health
# 应该返回: {"status":"ok"}
```

### 检查前端
1. 访问你的 Cloudflare Pages URL
2. 打开浏览器开发者工具 (F12)
3. 查看 Console 和 Network 标签
4. 确认 API 请求能正常发送到后端
5. 测试各个功能模块

## 🎯 快速命令

如果前端项目已创建，可以使用以下命令快速重新部署：

```bash
# 构建并部署前端
cd web && npm run build && cd .. && wrangler pages deploy web/dist --project-name="profile-page"
```

## 📝 部署信息汇总

### 后端 (Render)
- **URL**: https://profile-page-api-3y6v.onrender.com
- **环境变量**:
  - `PYTHON_VERSION` = `3.11.0`
  - `DASHSCOPE_API_KEY` = `<你的API密钥>`
  - `CORS_ORIGINS` = `<前端URL>` (部署前端后填写)

### 前端 (Cloudflare Pages)
- **URL**: `<部署后获取>`
- **环境变量**:
  - `VITE_API_BASE_URL` = `https://profile-page-api-3y6v.onrender.com`

## 🆘 常见问题

### 问题：前端无法连接后端
- 检查 `VITE_API_BASE_URL` 是否正确
- 确认后端服务正在运行
- 检查浏览器控制台是否有 CORS 错误

### 问题：CORS 错误
- 确认后端的 `CORS_ORIGINS` 包含前端 URL
- 确保 URL 格式正确（包含 `https://`，不包含尾部斜杠）
- 等待 Render 重新部署完成

### 问题：404 错误
- 后端根路径 `/` 返回 404 是正常的
- 使用 `/api/health` 检查后端是否正常
- 前端路由应该通过 Cloudflare Pages 的 `_redirects` 文件处理

## 🎉 完成！

完成以上步骤后，你的应用就可以正常访问了！

