# 环境变量配置说明

## 后端环境变量 (Render)

在 Render Dashboard 的 Web Service → Environment 中添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PYTHON_VERSION` | `3.11.0` | Python 版本（必须是完整版本号） |
| `DASHSCOPE_API_KEY` | `你的API密钥` | 通义千问 API Key |
| `CORS_ORIGINS` | `https://your-frontend.pages.dev` | 前端域名（多个用逗号分隔） |

**CORS_ORIGINS 格式示例**:
```
https://profile-page.pages.dev
```
或
```
https://profile-page.pages.dev,https://your-custom-domain.com
```

---

## 前端环境变量 (Cloudflare Pages)

在 Cloudflare Pages 项目 → Settings → Environment variables 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_API_BASE_URL` | `https://your-render-service.onrender.com` | 后端 API 地址 |

**重要提示**:
- URL 必须以 `https://` 开头
- 不要以斜杠 `/` 结尾
- 使用 Render 部署后给你的完整 URL

**示例**:
```
https://profile-page-api.onrender.com
```

---

## 部署顺序

1. **先部署后端** (Render)
   - 获取后端 URL
   - 配置环境变量（除了 CORS_ORIGINS）

2. **再部署前端** (Cloudflare Pages)
   - 使用后端 URL 配置 `VITE_API_BASE_URL`
   - 获取前端 URL

3. **更新后端 CORS**
   - 在 Render 中添加 `CORS_ORIGINS` 环境变量
   - 值为前端 URL
   - 保存后自动重新部署

