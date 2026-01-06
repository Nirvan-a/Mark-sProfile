# 子域名配置指南

## 📋 子域名格式说明

**正确格式**: `profile.mazhaofeng.com` ✅
- `profile` 是子域名
- `mazhaofeng.com` 是主域名

**错误格式**: `mazhaofeng.profile.com` ❌
- 这会是 `profile.com` 的子域名，不是你的域名

## 🚀 配置子域名步骤

### 情况 1: 如果已经配置了根域名 `mazhaofeng.com`

如果你想同时使用根域名和子域名：

#### 步骤 1: 在 Cloudflare Pages 添加子域名

1. **访问 Cloudflare Dashboard**
   - 打开: https://dash.cloudflare.com
   - 进入你的 Pages 项目: `profile-page`

2. **添加子域名**
   - 点击 **"Settings"** → **"Custom domains"**
   - 点击 **"Add custom domain"**
   - 输入: `profile.mazhaofeng.com`
   - 点击 **"Continue"**

3. **配置 DNS 记录**
   - 如果域名在 Cloudflare 管理，会自动配置
   - 如果不在，需要手动添加 CNAME 记录

#### 步骤 2: 配置 DNS 记录（如果不在 Cloudflare 管理）

在你的域名 DNS 提供商处添加：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| CNAME | `profile` | `profile-page-1z0.pages.dev` | 自动 |

**说明**:
- `名称` 填写 `profile`（不带 `.mazhaofeng.com`）
- `值` 填写你的 Cloudflare Pages 地址

#### 步骤 3: 更新后端 CORS

在 Render Dashboard 更新 `CORS_ORIGINS` 环境变量：

```
https://mazhaofeng.com,https://profile.mazhaofeng.com
```

### 情况 2: 只想使用子域名（不使用根域名）

如果你想只使用 `profile.mazhaofeng.com`，不使用 `mazhaofeng.com`：

#### 步骤 1: 在 Cloudflare Pages 添加子域名

1. 访问 Cloudflare Dashboard → Pages 项目
2. 点击 **"Settings"** → **"Custom domains"**
3. 点击 **"Add custom domain"**
4. 输入: `profile.mazhaofeng.com`
5. 点击 **"Continue"**

#### 步骤 2: 配置 DNS 记录

添加 CNAME 记录：
- **名称**: `profile`
- **值**: `profile-page-1z0.pages.dev`

#### 步骤 3: 更新后端 CORS

在 Render Dashboard 更新 `CORS_ORIGINS`：

```
https://profile-page-1z0.pages.dev,https://profile.mazhaofeng.com
```

## 🔧 多个子域名配置

如果你想配置多个子域名（例如：`profile.mazhaofeng.com` 和 `www.mazhaofeng.com`）：

### 在 Cloudflare Pages

1. 在 **"Custom domains"** 部分
2. 点击 **"Add custom domain"** 添加每个子域名
3. 每个子域名都会指向同一个 Pages 项目

### 在 DNS 配置

为每个子域名添加 CNAME 记录：

| 类型 | 名称 | 值 |
|------|------|-----|
| CNAME | `profile` | `profile-page-1z0.pages.dev` |
| CNAME | `www` | `profile-page-1z0.pages.dev` |

### 在后端 CORS

更新 `CORS_ORIGINS`，包含所有域名：

```
https://profile-page-1z0.pages.dev,https://mazhaofeng.com,https://profile.mazhaofeng.com,https://www.mazhaofeng.com
```

## 📝 常见子域名示例

| 子域名 | DNS 记录名称 | 完整域名 |
|--------|-------------|----------|
| `profile.mazhaofeng.com` | `profile` | `profile.mazhaofeng.com` |
| `www.mazhaofeng.com` | `www` | `www.mazhaofeng.com` |
| `app.mazhaofeng.com` | `app` | `app.mazhaofeng.com` |
| `demo.mazhaofeng.com` | `demo` | `demo.mazhaofeng.com` |

## ✅ 验证配置

### 1. 检查 DNS 解析

```bash
# 检查子域名解析
nslookup profile.mazhaofeng.com
# 或
dig profile.mazhaofeng.com
```

应该返回 Cloudflare Pages 的 IP 地址。

### 2. 检查访问

访问 `https://profile.mazhaofeng.com`：
- 应该能正常打开页面
- 地址栏显示锁图标（HTTPS）
- 页面功能正常

### 3. 检查 CORS

打开浏览器开发者工具 (F12)：
- Console 不应该有 CORS 错误
- Network 标签中 API 请求应该成功

## 🆘 常见问题

### 问题 1: 子域名无法访问

**解决方案**:
- 检查 DNS 记录是否正确
- 确认 CNAME 记录名称是 `profile`（不是 `profile.mazhaofeng.com`）
- 等待 DNS 生效（最多 48 小时）

### 问题 2: SSL 证书错误

**解决方案**:
- 等待 Cloudflare 自动配置 SSL（通常几分钟）
- 检查 DNS 记录是否正确
- 在 Cloudflare Dashboard 查看证书状态

### 问题 3: 根域名和子域名冲突

**解决方案**:
- 可以同时配置根域名和子域名
- 它们都指向同一个 Pages 项目
- 确保后端 CORS 包含所有域名

## 🎯 推荐配置

**推荐使用子域名**: `profile.mazhaofeng.com`

**原因**:
- 更清晰，表明这是个人主页/工具集
- 可以保留根域名用于其他用途
- 更容易管理多个服务

**配置示例**:
- 前端: `https://profile.mazhaofeng.com`
- 后端: `https://profile-page-api-3y6v.onrender.com`
- CORS: `https://profile.mazhaofeng.com`

## 📋 配置清单

- [ ] 在 Cloudflare Pages 添加子域名 `profile.mazhaofeng.com`
- [ ] 在 DNS 添加 CNAME 记录: `profile` → `profile-page-1z0.pages.dev`
- [ ] 等待 DNS 生效
- [ ] 更新后端 CORS，添加 `https://profile.mazhaofeng.com`
- [ ] 等待 SSL 证书配置
- [ ] 验证子域名访问正常
- [ ] 验证 API 调用正常

## 🎉 完成！

配置完成后，你的应用就可以通过 `https://profile.mazhaofeng.com` 访问了！

