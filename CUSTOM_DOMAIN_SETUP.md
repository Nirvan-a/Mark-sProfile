# 自定义域名配置指南

## 🌐 Cloudflare Pages 自定义域名配置

### 步骤 1: 在 Cloudflare Pages 中添加域名

1. **访问 Cloudflare Dashboard**
   - 打开: https://dash.cloudflare.com
   - 进入你的 Pages 项目: `profile-page`

2. **添加自定义域名**
   - 点击 **"Settings"** 标签
   - 找到 **"Custom domains"** 部分
   - 点击 **"Add custom domain"** 或 **"Set up a custom domain"**

3. **输入域名**
   - 输入你的域名，例如: `profile.yourdomain.com` 或 `yourdomain.com`
   - 点击 **"Continue"**

4. **选择配置方式**
   - **选项 A**: 如果域名已经在 Cloudflare 管理
     - Cloudflare 会自动配置 DNS 记录
     - 点击 **"Add domain"** 完成
   
   - **选项 B**: 如果域名不在 Cloudflare 管理
     - Cloudflare 会显示需要添加的 DNS 记录
     - 按照提示在你的域名 DNS 提供商处添加记录

### 步骤 2: 配置 DNS 记录

如果域名不在 Cloudflare 管理，需要添加以下 DNS 记录：

#### 方式 1: CNAME 记录（推荐，用于子域名）

在你的域名 DNS 提供商处添加：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| CNAME | `profile` (或你想要的子域名) | `profile-page-1z0.pages.dev` | 自动 |

**示例**:
- 如果你想使用 `profile.yourdomain.com`
- 添加 CNAME: `profile` → `profile-page-1z0.pages.dev`

#### 方式 2: A 记录（用于根域名）

如果要在根域名（如 `yourdomain.com`）使用，需要添加 A 记录：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| A | `@` | `188.114.96.1` | 自动 |
| A | `@` | `188.114.97.1` | 自动 |

**注意**: Cloudflare Pages 的 IP 地址可能会变化，建议使用 CNAME 记录。

### 步骤 3: 等待 DNS 生效

- DNS 记录通常需要几分钟到几小时生效
- 可以在 Cloudflare Dashboard 查看域名状态
- 状态显示为 **"Active"** 时表示配置成功

### 步骤 4: 更新后端 CORS 配置

添加自定义域名后，需要更新后端的 CORS 配置：

1. **访问 Render Dashboard**
   - 打开: https://dashboard.render.com
   - 进入 `profile-page-api` 服务

2. **更新 CORS 环境变量**
   - 点击 **"Environment"** 标签
   - 找到 `CORS_ORIGINS` 环境变量
   - 更新值，添加你的自定义域名：
     ```
     https://profile-page-1z0.pages.dev,https://profile.yourdomain.com
     ```
   - 如果有多个域名，用逗号分隔
   - 点击 **"Save Changes"**

3. **等待重新部署**
   - Render 会自动重新部署（约 2-3 分钟）

### 步骤 5: 配置 SSL 证书（自动）

Cloudflare Pages 会自动为自定义域名配置 SSL 证书：
- 通常需要几分钟到几小时
- 在 **"Custom domains"** 部分可以看到证书状态
- 状态显示为 **"Active"** 时表示 SSL 已配置

## 🔧 常见配置场景

### 场景 1: 使用子域名

**示例**: `profile.yourdomain.com`

1. 在 Cloudflare Pages 添加: `profile.yourdomain.com`
2. 在 DNS 添加 CNAME: `profile` → `profile-page-1z0.pages.dev`
3. 更新后端 CORS: 添加 `https://profile.yourdomain.com`

### 场景 2: 使用根域名

**示例**: `yourdomain.com`

1. 在 Cloudflare Pages 添加: `yourdomain.com`
2. 在 DNS 添加 CNAME: `@` → `profile-page-1z0.pages.dev`
   - 或者使用 A 记录（见步骤 2）
3. 更新后端 CORS: 添加 `https://yourdomain.com`

### 场景 3: 使用 www 子域名

**示例**: `www.yourdomain.com`

1. 在 Cloudflare Pages 添加: `www.yourdomain.com`
2. 在 DNS 添加 CNAME: `www` → `profile-page-1z0.pages.dev`
3. 更新后端 CORS: 添加 `https://www.yourdomain.com`

## ✅ 验证配置

### 1. 检查 DNS 解析

```bash
# 检查域名解析
nslookup profile.yourdomain.com
# 或
dig profile.yourdomain.com
```

应该返回 Cloudflare Pages 的 IP 地址。

### 2. 检查 SSL 证书

访问 `https://profile.yourdomain.com`，应该：
- 显示锁图标（HTTPS）
- 浏览器不显示安全警告
- 页面正常加载

### 3. 检查 CORS

打开浏览器开发者工具 (F12)：
- 检查 Console 是否有 CORS 错误
- 检查 Network 标签，API 请求应该成功

## 🆘 常见问题

### 问题 1: DNS 记录不生效

**解决方案**:
- 等待更长时间（最多 48 小时）
- 检查 DNS 记录是否正确
- 清除本地 DNS 缓存: `ipconfig /flushdns` (Windows) 或 `sudo dscacheutil -flushcache` (macOS)

### 问题 2: SSL 证书未配置

**解决方案**:
- 等待更长时间（最多 24 小时）
- 检查 DNS 记录是否正确
- 在 Cloudflare Dashboard 查看证书状态

### 问题 3: CORS 错误

**解决方案**:
- 确认后端的 `CORS_ORIGINS` 包含自定义域名
- 确认域名格式正确（包含 `https://`，不包含尾部斜杠）
- 等待 Render 重新部署完成

### 问题 4: 域名已在使用

**解决方案**:
- 如果域名已经在其他地方使用，需要先移除旧的配置
- 或者使用不同的子域名

## 📝 配置清单

- [ ] 在 Cloudflare Pages 添加自定义域名
- [ ] 在 DNS 提供商处添加 DNS 记录
- [ ] 等待 DNS 生效
- [ ] 更新后端 CORS 配置
- [ ] 等待 SSL 证书配置
- [ ] 验证域名访问正常
- [ ] 验证 API 调用正常

## 🎉 完成！

配置完成后，你的应用就可以通过自定义域名访问了！

**示例**:
- 前端: `https://profile.yourdomain.com`
- 后端: `https://profile-page-api-3y6v.onrender.com`

