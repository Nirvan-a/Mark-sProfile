# Railway 迁移检查清单 ✅

## 📋 迁移前准备

- [ ] 确认 Render 后端服务正常运行
- [ ] 记录 Render 的环境变量（DASHSCOPE_API_KEY, CORS_ORIGINS）
- [ ] 确认 Cloudflare Pages 前端域名
- [ ] 准备好 GitHub 账号（如果通过 GitHub 部署）

---

## 🚀 第一步：在 Railway 部署后端

### 方式 A: 通过网页界面（推荐）

1. **访问 Railway**
   - [ ] 打开 https://railway.app
   - [ ] 使用 GitHub 账号登录

2. **创建新项目**
   - [ ] 点击 "New Project"
   - [ ] 选择 "Deploy from GitHub repo"
   - [ ] 选择 `Profile-Page` 仓库
   - [ ] 等待 Railway 自动检测配置

3. **确认配置**
   - [ ] Railway 应该自动识别 `railway.json`
   - [ ] 根目录应该是 `server`（或自动设置）
   - [ ] 构建命令应该包含字体和 Playwright 安装

---

## ⚙️ 第二步：配置环境变量

在 Railway Dashboard → 你的服务 → Variables，添加：

### 必需变量：

- [ ] **DASHSCOPE_API_KEY**
  ```
  值: [从 Render 复制，或使用现有值]
  ```

- [ ] **CORS_ORIGINS**
  ```
  值: https://你的前端域名.pages.dev,https://你的自定义域名.com
  示例: https://profile-page.pages.dev,https://profile.mazhaofeng.com
  注意: 多个域名用逗号分隔，不要有空格
  ```

### 可选变量：

- [ ] **PYTHON_VERSION** (可选)
  ```
  值: 3.11.0
  注意: Railway 通常会自动检测，但可以手动设置确保一致性
  ```

---

## 🔗 第三步：获取 Railway 后端地址

- [ ] 在 Railway Dashboard → 你的服务
- [ ] 点击 "Settings" → "Networking"
- [ ] 点击 "Generate Domain"（如果还没有）
- [ ] 复制生成的 URL，格式：`https://xxx.up.railway.app`
- [ ] **记录这个地址** ⬇️

```
Railway 后端地址: https://________________.up.railway.app
```

---

## ✅ 第四步：测试 Railway 后端

- [ ] 在浏览器或使用 curl 测试健康检查：
  ```bash
  curl https://你的-railway地址.up.railway.app/api/health
  ```
  应该返回: `{"status":"ok"}`

- [ ] 测试根路径：
  ```bash
  curl https://你的-railway地址.up.railway.app/
  ```
  应该返回: `{"status":"ok","message":"Profile Page API"}`

---

## 🌐 第五步：更新前端配置

### 在 Cloudflare Pages 中：

1. **访问 Cloudflare Dashboard**
   - [ ] 进入你的 Pages 项目
   - [ ] 点击 "Settings" → "Environment variables"

2. **添加/更新环境变量**
   - [ ] 添加或更新 `VITE_API_BASE_URL`
   - [ ] 值设置为：`https://你的-railway地址.up.railway.app`
   - [ ] 选择环境：Production（和 Preview，如果需要）

3. **触发重新部署**
   - [ ] 保存环境变量后，Cloudflare Pages 会自动重新部署
   - [ ] 或手动触发：Deployments → Retry deployment

---

## 🔍 第六步：验证迁移

### 检查前端：

- [ ] 访问你的 Cloudflare Pages 地址
- [ ] 打开浏览器开发者工具（F12）→ Network 标签
- [ ] 执行一个需要后端的功能（如智能报告、智能问数）
- [ ] 确认 API 请求指向 Railway 地址（不是 Render）
- [ ] 确认请求成功（200 状态码）

### 检查后端日志：

- [ ] 在 Railway Dashboard → Deployments → 查看最新部署日志
- [ ] 确认没有错误
- [ ] 确认服务正常运行

---

## 🎯 第七步：清理 Render（可选）

**⚠️ 建议：先保持 Render 运行 1-2 天，确认 Railway 稳定后再删除**

- [ ] 确认 Railway 服务稳定运行至少 24 小时
- [ ] 确认前端功能全部正常
- [ ] 在 Render Dashboard 删除旧服务（可选）

---

## 🆘 遇到问题？

### 问题 1: Railway 构建失败

**检查**:
- [ ] 查看 Railway 部署日志
- [ ] 确认 `server/requirements.txt` 存在
- [ ] 确认 `server/install_chinese_fonts.sh` 和 `install_playwright.sh` 有执行权限

**解决**:
```bash
# 在本地测试构建命令
cd server
pip install -r requirements.txt
bash install_chinese_fonts.sh
bash install_playwright.sh
```

### 问题 2: CORS 错误

**检查**:
- [ ] 确认 `CORS_ORIGINS` 环境变量格式正确
- [ ] 确认前端域名已添加到 `CORS_ORIGINS`
- [ ] 检查后端日志确认 CORS 配置

**解决**:
```bash
# 在 Railway 中更新 CORS_ORIGINS
格式: https://domain1.com,https://domain2.com
不要有空格！
```

### 问题 3: API 请求失败

**检查**:
- [ ] 确认 `VITE_API_BASE_URL` 环境变量已更新
- [ ] 确认 Cloudflare Pages 已重新部署
- [ ] 检查浏览器控制台错误信息
- [ ] 确认 Railway 服务正在运行

### 问题 4: 环境变量未生效

**检查**:
- [ ] 确认在 Railway Dashboard 中正确添加了变量
- [ ] 确认变量名称拼写正确（大小写敏感）
- [ ] 重新部署服务以应用新环境变量

---

## 📝 迁移后验证清单

- [ ] Railway 后端响应正常（无冷启动延迟）
- [ ] 前端所有功能正常
- [ ] 智能报告工具工作正常
- [ ] 智能问数工具工作正常
- [ ] 智能点单工具工作正常
- [ ] 文件上传功能正常
- [ ] 图表生成功能正常

---

## ✨ 完成！

迁移完成后，你的新架构：

```
┌─────────────────────┐
│ Cloudflare Pages    │ 前端（静态站点）
│ (前端应用)          │
└──────────┬──────────┘
           │ HTTPS
           │ API 请求
           ▼
┌─────────────────────┐
│ Railway             │ 后端（FastAPI）
│ (API 服务)          │ ✅ 不休眠，快速响应
└─────────────────────┘
```

🎉 享受无冷启动的快速体验！

