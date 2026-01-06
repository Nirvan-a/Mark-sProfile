# ✅ 域名配置完成 - 下一步操作

## 🎉 当前状态

你的域名配置已完成：

- ✅ `mazhaofeng.com` - Active, SSL enabled
- ✅ `profile.mazhaofeng.com` - Active

## 📋 必须完成的最后一步：更新后端 CORS

### 步骤 1: 访问 Render Dashboard

1. 打开: https://dashboard.render.com
2. 进入服务: `profile-page-api`

### 步骤 2: 更新 CORS 环境变量

1. 点击 **"Environment"** 标签
2. 找到 `CORS_ORIGINS` 环境变量
3. 点击编辑，更新值为：

```
https://profile-page-1z0.pages.dev,https://mazhaofeng.com,https://profile.mazhaofeng.com
```

**重要提示**:
- 多个域名用逗号分隔
- 确保包含 `https://` 前缀
- 不要包含尾部斜杠 `/`
- 包含原始的 Cloudflare Pages 地址（作为备用）

4. 点击 **"Save Changes"**

### 步骤 3: 等待重新部署

- Render 会自动重新部署（约 2-3 分钟）
- 等待状态变为 "Live"

## ✅ 验证配置

### 1. 测试根域名

访问: `https://mazhaofeng.com`
- ✅ 应该能正常打开
- ✅ 地址栏显示锁图标（HTTPS）
- ✅ 页面功能正常

### 2. 测试子域名

访问: `https://profile.mazhaofeng.com`
- ✅ 应该能正常打开
- ✅ 地址栏显示锁图标（HTTPS）
- ✅ 页面功能正常

### 3. 测试 API 调用

打开浏览器开发者工具 (F12)：
- ✅ Console 不应该有 CORS 错误
- ✅ Network 标签中 API 请求应该成功（状态码 200）
- ✅ 测试各个功能模块，确认 API 调用正常

### 4. 测试两个域名

分别在两个域名下测试：
- `https://mazhaofeng.com` - 应该正常工作
- `https://profile.mazhaofeng.com` - 应该正常工作

## 🎯 推荐使用

**建议使用子域名**: `profile.mazhaofeng.com`

**原因**:
- 更清晰，表明这是个人主页/工具集
- 可以保留根域名用于其他用途（如个人博客、作品集等）
- 更容易管理多个服务

## 📝 配置总结

### 前端域名
- 主域名: `https://mazhaofeng.com`
- 子域名: `https://profile.mazhaofeng.com`
- 原始地址: `https://profile-page-1z0.pages.dev`（备用）

### 后端配置
- URL: `https://profile-page-api-3y6v.onrender.com`
- CORS: 包含所有前端域名

## 🆘 如果遇到问题

### CORS 错误

如果看到 CORS 错误：
1. 确认 `CORS_ORIGINS` 包含所有域名
2. 确认域名格式正确（包含 `https://`，不包含尾部斜杠）
3. 等待 Render 重新部署完成
4. 清除浏览器缓存后重试

### 域名无法访问

如果域名无法访问：
1. 检查 DNS 记录是否正确
2. 等待 DNS 生效（最多 48 小时）
3. 在 Cloudflare Dashboard 检查域名状态

### SSL 证书问题

如果 SSL 证书未配置：
1. 等待 Cloudflare 自动配置（通常几分钟）
2. 在 Cloudflare Dashboard 检查证书状态
3. 确认 DNS 记录正确

## 🎉 完成！

完成 CORS 配置后，你的应用就可以通过两个域名正常访问了！

**访问地址**:
- `https://mazhaofeng.com`
- `https://profile.mazhaofeng.com`

两个域名都会指向同一个应用，功能完全相同。

