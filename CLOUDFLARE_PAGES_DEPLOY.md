# Cloudflare Pages 前端部署指南

## 🚀 第一步：访问 Cloudflare Dashboard

1. 打开浏览器，访问：https://dash.cloudflare.com
2. 如果没有账号，点击 "Sign up" 注册（免费）
3. 如果有账号，直接登录

---

## 📦 第二步：创建 Pages 项目

### 2.1 进入 Pages
1. 登录后，在左侧菜单找到 **"Workers & Pages"**
2. 点击进入

### 2.2 创建新项目
1. 点击右上角的 **"Create application"** 按钮
2. 选择 **"Pages"** 标签页
3. 点击 **"Connect to Git"**

### 2.3 连接 GitHub
1. 选择 **"GitHub"** 作为 Git 提供商
2. 如果还没授权，会提示授权 Cloudflare 访问你的 GitHub
3. 点击 **"Authorize Cloudflare"** 并确认授权
4. 授权完成后，会显示你的 GitHub 仓库列表

### 2.4 选择仓库
1. 在仓库列表中找到并选择：**Nirvan-a/Mark-sProfile**
2. 点击仓库名称

---

## ⚙️ 第三步：配置构建设置

### 3.1 项目设置
在 "Set up builds" 页面，填写以下信息：

**Project name**:
- 可以保持默认：`Mark-sProfile`
- 或改为：`profile-page`（更简洁）

### 3.2 构建设置（重要）

**Production branch**:
- 保持默认：`main`

**Build command**:
```bash
cd web && npm install && npm run build
```

**Build output directory**:
```
web/dist
```

**Root directory**: 
- **留空**（不填写，使用项目根目录）

### 3.3 环境变量（可选）

如果使用 Cloudflare Worker 代理 API，**不需要**配置环境变量。

如果想直接调用后端（不推荐），可以添加：
- **Variable name**: `VITE_API_BASE_URL`
- **Value**: 你的后端 URL（例如：`https://xxx.onrender.com`）

**建议**：先不配置，等后端部署完成后再决定。

---

## 🚀 第四步：部署

### 4.1 开始部署
1. 检查所有配置是否正确
2. 点击 **"Save and Deploy"** 按钮
3. 等待构建开始

### 4.2 查看构建进度
1. 构建开始后，会显示构建日志
2. 通常需要 2-5 分钟
3. 可以在 "Deployments" 标签页查看进度

### 4.3 构建完成
构建成功后，会显示：
- ✅ Build successful
- 前端 URL（例如：`https://xxx.pages.dev`）

---

## 🌐 第五步：获取前端 URL

### 5.1 查看 URL
部署完成后，在项目页面可以看到：
- **Production URL**: `https://xxx.pages.dev`
- 这是你的前端访问地址

### 5.2 保存 URL
**重要**：复制这个 URL，后续配置 Worker 需要用到。

---

## ✅ 第六步：测试前端

### 6.1 访问前端
在浏览器打开你的前端 URL，应该能看到：
- 个人主页
- 工具入口（智能问数、智能报告等）

### 6.2 检查功能
- 页面是否正常加载
- 样式是否正常
- 路由是否工作

**注意**：API 功能暂时不可用（需要等后端部署完成并配置 Worker）

---

## 🎨 第七步：配置自定义域名（可选）

### 7.1 添加自定义域名
1. 在 Pages 项目页面，找到 **"Custom domains"** 部分
2. 点击 **"Set up a custom domain"**
3. 输入你的域名（例如：`profile.yourdomain.com`）
4. 按照提示配置 DNS 记录

### 7.2 DNS 配置
Cloudflare 会显示需要添加的 DNS 记录：
- 类型：`CNAME`
- 名称：`profile`（或你想要的子域名）
- 目标：`xxx.pages.dev`

---

## 📝 部署检查清单

- [ ] Cloudflare 账号已注册/登录
- [ ] 已连接到 GitHub
- [ ] 已选择 `Nirvan-a/Mark-sProfile` 仓库
- [ ] Build command 已配置：`cd web && npm install && npm run build`
- [ ] Build output directory 已配置：`web/dist`
- [ ] 已点击 "Save and Deploy"
- [ ] 构建已完成
- [ ] 前端 URL 已获取
- [ ] 前端页面可以正常访问

---

## 🆘 常见问题

### 问题 1：构建失败
**可能原因**：
- Build command 错误
- Node.js 版本不兼容
- 依赖安装失败

**解决方案**：
1. 查看构建日志
2. 检查错误信息
3. 确认 `package.json` 中的依赖是否正确

### 问题 2：页面空白
**可能原因**：
- 构建输出目录错误
- 路由配置问题

**解决方案**：
1. 确认 Build output directory 是 `web/dist`
2. 检查 `vite.config.ts` 配置

### 问题 3：样式丢失
**可能原因**：
- CSS 文件路径错误
- 构建配置问题

**解决方案**：
1. 检查构建日志
2. 确认静态资源路径

---

## 🎯 下一步

前端部署完成后：
1. ✅ 保存前端 URL
2. ⏳ 等待后端部署完成（Render 或 Fly.io）
3. 🔧 配置 Cloudflare Worker 代理 API
4. ✅ 测试完整功能

---

## 💡 提示

- 前端部署通常比后端快（2-5 分钟）
- 可以先部署前端，再等后端
- 前端部署完成后，API 功能需要等后端和 Worker 配置好才能用

