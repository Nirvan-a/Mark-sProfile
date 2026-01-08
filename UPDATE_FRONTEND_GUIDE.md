# 更新前端连接到 Railway 后端

## 📋 步骤概览

1. 获取 Railway 后端地址
2. 在 Cloudflare Pages 中更新 `VITE_API_BASE_URL` 环境变量
3. 在 Railway 中更新 `CORS_ORIGINS` 环境变量

---

## 🔗 第一步：获取 Railway 后端地址

1. 访问 [Railway Dashboard](https://railway.app)
2. 进入你的服务
3. 点击 **Settings** → **Networking**
4. 复制生成的域名（格式：`https://xxx.up.railway.app`）

**记录这个地址** ⬇️
```
_________________________________________________
```

---

## 🌐 第二步：更新 Cloudflare Pages 环境变量

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → 你的 Pages 项目
3. 点击 **Settings** → **Environment variables**
4. 找到或添加变量：
   - **变量名**: `VITE_API_BASE_URL`
   - **值**: 你的 Railway 后端地址（例如：`https://xxx.up.railway.app`）
5. **选择环境**: 
   - ✅ Production
   - ✅ Preview（如果需要）
6. 点击 **Save** - Cloudflare 会自动重新部署

---

## 🔒 第三步：更新 Railway CORS 配置

1. 在 [Railway Dashboard](https://railway.app) 中，进入你的服务
2. 点击 **Variables** 标签
3. 找到或添加变量：
   - **变量名**: `CORS_ORIGINS`
   - **值**: 你的前端域名，多个用逗号分隔
     - 例如：`https://your-app.pages.dev,https://profile.mazhaofeng.com`
   - ⚠️ **注意**: 不要有空格，多个域名用逗号分隔
4. 点击 **Save** - Railway 会自动重新部署

---

## ✅ 验证配置

### 1. 等待部署完成
- Cloudflare Pages: 通常 2-5 分钟
- Railway: 通常 1-3 分钟

### 2. 测试 API 连接
打开浏览器开发者工具（F12）→ **Network** 标签，然后：
- 访问你的前端网站
- 尝试使用一个需要后端 API 的功能
- 检查 Network 标签中的请求：
  - 请求 URL 应该指向你的 Railway 后端地址
  - 状态码应该是 200（成功）

### 3. 检查控制台错误
- 打开浏览器控制台（Console 标签）
- 确认没有 CORS 错误
- 确认没有 404 或连接错误

---

## 🆘 常见问题

### CORS 错误？
- 确认 `CORS_ORIGINS` 环境变量包含你的前端域名
- 确认域名格式正确（包含 `https://`）
- 确认多个域名之间用逗号分隔，没有空格

### API 请求失败？
- 确认 `VITE_API_BASE_URL` 环境变量已设置
- 确认 Cloudflare Pages 已重新部署
- 检查 Railway 后端是否正常运行
- 检查浏览器控制台的错误信息

### 环境变量不生效？
- 确认环境变量已保存
- 确认选择了正确的环境（Production/Preview）
- 清除浏览器缓存并强制刷新（Cmd+Shift+R 或 Ctrl+Shift+R）

---

## 📝 快速检查清单

- [ ] 已获取 Railway 后端地址
- [ ] 已在 Cloudflare Pages 中设置 `VITE_API_BASE_URL`
- [ ] 已在 Railway 中设置 `CORS_ORIGINS`
- [ ] 等待部署完成
- [ ] 测试 API 连接成功
- [ ] 无 CORS 错误
- [ ] 所有功能正常工作

---

完成以上步骤后，你的前端应该可以正常连接到 Railway 后端了！🎉

