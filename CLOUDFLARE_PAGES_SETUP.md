# Cloudflare Pages 部署配置检查清单

## ✅ 已确认的配置

你的项目已经准备好自动部署到 Cloudflare Pages。以下是配置检查清单：

### 1. 构建配置（在 Cloudflare Pages 控制台设置）

在 Cloudflare Pages 项目设置中，确保以下配置：

```
构建命令: cd web && npm install && npm run build
构建输出目录: web/dist
根目录: /（默认，项目根目录）
Node.js 版本: 18 或更高（Cloudflare Pages 会自动检测）
```

### 2. 环境变量（如需要）

如果需要配置环境变量（比如后端 API 地址），在 Cloudflare Pages 项目设置中添加：

- **变量名**: `VITE_API_BASE_URL`
- **值**: 你的后端 API 地址（例如：`https://your-api-domain.com`）

**注意**: 如果不设置 `VITE_API_BASE_URL`，前端会使用相对路径访问 API（适用于 API 和前端在同一域名下的情况）。

### 3. Git 自动部署

确保在 Cloudflare Pages 中：
- ✅ 已连接到你的 Git 仓库
- ✅ 已选择正确的分支（通常是 `main` 或 `master`）
- ✅ 自动部署已启用

### 4. 部署流程

**修改-推送-重新部署**流程现在已经完全自动化：

1. 本地修改代码
2. 提交并推送到 Git：
   ```bash
   git add .
   git commit -m "你的提交信息"
   git push
   ```
3. Cloudflare Pages 会自动：
   - 检测到 Git 推送
   - 运行构建命令
   - 部署到生产环境

### 5. 部署状态查看

- 在 Cloudflare Pages 控制台的"部署"页面可以查看：
  - 部署历史
  - 构建日志
  - 部署状态（成功/失败）

### 6. SPA 路由处理

由于不使用 `_redirects` 文件，你需要：

**选项 1（推荐）**: 在 Cloudflare Pages 项目设置中启用 **"Single Page Application"** 选项
- 在项目设置 → 函数和部署 → 兼容性标志中查找
- 或在 Cloudflare Dashboard → Pages → 你的项目 → 设置 → 构建和部署

**选项 2**: 使用 Cloudflare 的 Transform Rules
- 在 Cloudflare Dashboard → Rules → Transform Rules
- 创建一个规则，将非静态资源请求重写为 `index.html`

### 7. 验证部署

部署成功后，访问你的 Cloudflare Pages 域名（例如：`https://your-project.pages.dev`）验证：
- ✅ 主页正常加载
- ✅ 路由正常工作（如 `/askdata`, `/smartreport` 等）
- ✅ API 请求正常工作（如果配置了 `VITE_API_BASE_URL`）

## 🚨 常见问题

### 构建失败
- 检查构建日志中的错误信息
- 确认 Node.js 版本（需要 18+）
- 确认所有依赖都在 `package.json` 中

### 路由 404
- 确保已启用 SPA 模式或配置了 Transform Rules
- 检查 `_headers` 文件是否正确

### API 请求失败
- 检查 `VITE_API_BASE_URL` 环境变量是否正确设置
- 检查后端 CORS 配置是否允许你的 Cloudflare Pages 域名

## 📝 总结

✅ 你的项目已经完全准备好自动部署  
✅ 修改-推送-重新部署流程应该可以正常工作  
✅ 只需确保在 Cloudflare Pages 控制台中的构建配置正确即可
