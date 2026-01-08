# 🧹 清理缓存并重新部署指南

本指南用于清理 Cloudflare Pages 的构建缓存并重新部署前端。

## ✅ 已完成的操作

1. ✅ 清理了本地构建缓存（`web/dist`, `node_modules/.vite`）
2. ✅ 重新构建了前端项目
3. ✅ 构建产物已生成在 `web/dist` 目录

## 🌐 Cloudflare Pages 缓存清理

### 方法 1: 通过 Dashboard（推荐）

1. **访问 Cloudflare Dashboard**
   - 打开 https://dash.cloudflare.com
   - 登录你的账户

2. **进入你的 Pages 项目**
   - 点击左侧菜单 "Workers & Pages"
   - 找到并点击你的项目（例如：`profile-page`）

3. **清除构建缓存并重新部署**
   
   **选项 A: 清除缓存并重新部署**
   - 点击 "Settings" 标签
   - 滚动到 "Builds & deployments" 部分
   - 点击 "Clear build cache" 按钮
   - 然后点击 "Create deployment" → 选择最新 commit → "Deploy"

   **选项 B: 直接触发新部署**
   - 点击 "Deployments" 标签
   - 点击 "Create deployment" 按钮
   - 选择最新的 commit（包含你的更改）
   - 点击 "Deploy"
   - 这会自动清除缓存并重新构建

4. **等待部署完成**
   - 通常需要 2-5 分钟
   - 可以在 "Deployments" 页面查看进度

### 方法 2: 通过 Wrangler CLI

如果你已经安装了 `wrangler` 并已登录：

```bash
# 部署到 Cloudflare Pages（会自动清除缓存）
cd web
wrangler pages deploy dist --project-name="profile-page"
```

### 方法 3: 通过 API

```bash
# 需要 Cloudflare API Token
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json"
```

## 🔍 验证步骤

### 1. 等待部署完成
- Cloudflare Pages: 通常 2-5 分钟

### 2. 清除浏览器缓存

**Chrome/Edge:**
- Windows: `Ctrl + Shift + Delete`
- Mac: `Cmd + Shift + Delete`
- 选择 "缓存的图片和文件" 或 "Cached images and files"
- 时间范围选择 "全部时间" 或 "All time"
- 点击 "清除数据"

**Firefox:**
- Windows: `Ctrl + Shift + Delete`
- Mac: `Cmd + Shift + Delete`
- 选择 "缓存" 或 "Cache"
- 点击 "立即清除"

**Safari:**
- Mac: `Cmd + Option + E` (清除缓存)
- 或通过菜单：开发 → 清空缓存

### 3. 强制刷新页面

- **Windows:** `Ctrl + Shift + R` 或 `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

### 4. 使用无痕模式测试

打开无痕/隐私模式访问网站，这样可以避免浏览器缓存的影响。

### 5. 检查 favicon

- 查看浏览器标签页的图标是否已更新
- 如果还是旧图标，可能需要等待几分钟（CDN 缓存）
- 可以尝试访问 `https://your-domain.com/vite.svg` 直接查看文件

## 🚨 如果仍然显示旧图标

### 额外检查步骤：

1. **检查文件是否正确部署**
   ```bash
   # 检查 Cloudflare Pages 上的文件
   curl -I https://your-domain.com/vite.svg
   ```

2. **检查文件大小**
   - 如果文件异常大（> 1MB），可能文件本身有问题
   - 正常的 SVG favicon 应该在几 KB 到几十 KB

3. **等待 CDN 缓存过期**
   - Cloudflare 的 CDN 缓存可能需要一些时间更新
   - 通常 5-15 分钟会自动更新

4. **清除 Cloudflare CDN 缓存**
   - 在 Cloudflare Dashboard 中
   - 进入你的域名设置
   - 点击 "Caching" → "Purge Everything"
   - 这会清除所有 CDN 缓存

## 📝 快速命令

如果你已经配置好环境，可以使用提供的脚本：

```bash
./clear-cache-and-redeploy.sh
```

这个脚本会自动：
1. 清理本地缓存
2. 重新构建
3. 提交并推送代码
4. 提供部署选项

