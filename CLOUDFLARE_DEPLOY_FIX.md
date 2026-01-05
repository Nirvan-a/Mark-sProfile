# Cloudflare Pages 部署失败排查

## 🔍 常见失败原因

### 1. 构建输出目录配置错误
**症状**：部署到全球网络时失败
**原因**：找不到构建产物

**解决方案**：
1. 进入 Pages 项目 → Settings
2. 找到 "Builds & deployments"
3. 确认 "Output directory" 设置为：`web/dist`
4. 如果没有这个字段，在 "Build command" 中确保输出到正确目录

### 2. 文件大小超限
**症状**：部署失败，可能提示文件太大
**原因**：某些文件超过 Cloudflare 限制

**解决方案**：
- 检查 `web/dist` 目录大小
- 移除不必要的文件
- 优化图片和资源

### 3. 路由配置问题
**症状**：部署成功但页面 404
**原因**：SPA 路由需要特殊配置

**解决方案**：
- 确保有 `_redirects` 文件或 `_headers` 文件
- 配置 SPA 路由重定向

---

## 🛠️ 立即解决方案

### 方案 1：检查并修复输出目录配置

1. 进入 Cloudflare Dashboard
2. 进入你的 Pages 项目
3. 点击 "Settings" 标签页
4. 找到 "Builds & deployments" 部分
5. 点击 "Configure build"
6. 确认：
   - **Build command**: `cd web && npm install && npm run build`
   - **Output directory**: `web/dist`
7. 保存并重新部署

### 方案 2：添加 _redirects 文件（SPA 支持）

如果项目是 SPA（单页应用），需要添加重定向规则。

