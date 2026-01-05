# 部署检查清单

使用此清单确保部署过程完整无误。

## ✅ 后端部署 (Render)

- [ ] 在 Render 创建 Web Service
- [ ] 配置 Root Directory: `server`
- [ ] 配置 Build Command: `pip install -r requirements.txt`
- [ ] 配置 Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- [ ] 添加环境变量 `PYTHON_VERSION=3.11`
- [ ] 添加环境变量 `DASHSCOPE_API_KEY`（你的实际 API Key）
- [ ] 部署完成，获取后端 URL: `https://________________.onrender.com`
- [ ] 测试健康检查: `https://________________.onrender.com/api/health` 返回 `{"status":"ok"}`

## ✅ 前端部署 (Cloudflare Pages)

- [ ] 在 Cloudflare Pages 创建项目
- [ ] 连接 GitHub 仓库
- [ ] 配置 Build Command: `cd web && npm install && npm run build`
- [ ] 配置 Build Output Directory: `web/dist`
- [ ] 添加环境变量 `VITE_API_BASE_URL` = 后端 URL（上面获取的）
- [ ] 部署完成，获取前端 URL: `https://________________.pages.dev`
- [ ] 访问前端 URL，检查页面是否正常加载

## ✅ 配置 CORS

- [ ] 回到 Render Dashboard
- [ ] 在 Web Service 的 Environment 中添加 `CORS_ORIGINS`
- [ ] 设置值为前端 URL: `https://________________.pages.dev`
- [ ] 保存更改，等待重新部署完成

## ✅ 最终验证

- [ ] 访问前端页面
- [ ] 打开浏览器开发者工具 (F12)
- [ ] 检查 Console 是否有错误
- [ ] 检查 Network 标签，确认 API 请求成功
- [ ] 测试各个功能模块是否正常工作
- [ ] 确认没有 CORS 错误

## 🎉 完成！

如果所有项目都打勾，部署就完成了！

---

## 📝 部署后的 URL

**前端**: `https://________________.pages.dev`  
**后端**: `https://________________.onrender.com`

保存这些 URL，后续可能需要用到。

