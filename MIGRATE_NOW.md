# 🚀 立即开始迁移到 Railway

## 快速开始（5步完成）

### ⚡ 第一步：部署到 Railway（3-5分钟）

1. **打开 Railway**
   👉 https://railway.app
   - 使用 GitHub 账号登录（如果没有账号，先注册）

2. **创建新项目**
   - 点击 **"New Project"**
   - 选择 **"Deploy from GitHub repo"**
   - 授权 Railway 访问你的 GitHub（如果第一次）
   - 选择 **`Profile-Page`** 仓库
   - Railway 会自动开始部署

3. **等待部署完成**
   - 查看部署日志，确认构建成功
   - 通常需要 2-3 分钟

---

### ⚙️ 第二步：配置环境变量（2分钟）

在 Railway Dashboard：
1. 进入你的服务（点击项目名称）
2. 点击 **"Variables"** 标签
3. 添加以下环境变量：

#### 必需变量：

```bash
DASHSCOPE_API_KEY
```
**值**: 从 Render Dashboard 复制，或使用现有值

```bash
CORS_ORIGINS
```
**值**: 你的前端域名，例如：
```
https://your-app.pages.dev,https://profile.mazhaofeng.com
```
⚠️ **注意**: 多个域名用逗号分隔，**不要有空格**

---

### 🔗 第三步：获取 Railway 地址（30秒）

1. 在 Railway Dashboard → 你的服务
2. 点击 **"Settings"** → **"Networking"**
3. 点击 **"Generate Domain"**（如果还没有公共域名）
4. 复制生成的 URL（格式：`https://xxx.up.railway.app`）

**记录这个地址** ⬇️
```
_________________________________________________
```

---

### ✅ 第四步：验证 Railway 后端（1分钟）

在终端运行（替换为你的 Railway 地址）：

```bash
# 测试健康检查
curl https://你的-railway地址.up.railway.app/api/health

# 应该返回: {"status":"ok"}
```

或者使用验证脚本：

```bash
./verify-railway-migration.sh https://你的-railway地址.up.railway.app
```

---

### 🌐 第五步：更新前端配置（1分钟）

在 **Cloudflare Pages Dashboard**：

1. 进入你的 Pages 项目
2. 点击 **"Settings"** → **"Environment variables"**
3. 添加/更新环境变量：

   **变量名**: `VITE_API_BASE_URL`  
   **值**: `https://你的-railway地址.up.railway.app`

4. **选择环境**: Production（和 Preview，如果需要）
5. **保存** - Cloudflare 会自动重新部署

---

## 🎉 完成！

迁移完成后：
- ✅ Railway 后端运行（无冷启动延迟）
- ✅ 前端连接到新后端
- ✅ 所有功能正常工作

---

## 📋 详细文档

- **完整迁移指南**: `RAILWAY_MIGRATION_GUIDE.md`
- **详细检查清单**: `RAILWAY_MIGRATION_CHECKLIST.md`
- **验证脚本**: `./verify-railway-migration.sh [RAILWAY_URL]`

---

## 🆘 遇到问题？

### 构建失败？
- 查看 Railway Dashboard → Deployments → 最新部署的日志
- 检查 `server/requirements.txt` 是否正确

### CORS 错误？
- 确认 `CORS_ORIGINS` 环境变量格式正确（逗号分隔，无空格）
- 确认前端域名已包含在 `CORS_ORIGINS` 中

### API 请求失败？
- 确认 `VITE_API_BASE_URL` 已更新
- 确认 Cloudflare Pages 已重新部署
- 检查浏览器控制台错误信息

---

## 💰 成本提醒

Railway Hobby 计划：**$5/月**
- 500 小时运行时间/月
- 通常足够个人项目使用
- 不会休眠，始终保持运行

如果超出，会按使用量计费（Pay As You Go）。

---

**准备好了吗？** 从第一步开始吧！🚀

