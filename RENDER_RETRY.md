# Render 部署重试方法

## 方法一：通过 Dashboard 手动重试（推荐）

1. **访问 Render Dashboard**
   - 打开 https://dashboard.render.com
   - 登录你的账号

2. **进入你的服务**
   - 找到 `profile-page-api` 服务
   - 点击进入服务详情页

3. **手动触发重新部署**
   - 点击右上角的 **"Manual Deploy"** 按钮
   - 或者点击 **"Deploy"** → **"Deploy latest commit"**
   - 选择要部署的分支（通常是 `main`）
   - 点击 **"Deploy"**

## 方法二：修复环境变量后自动重试

如果是因为环境变量配置错误导致失败：

1. **进入服务设置**
   - 在服务详情页，点击 **"Settings"** 标签
   - 或者直接点击左侧菜单的 **"Environment"**

2. **修改环境变量**
   - 找到 `PYTHON_VERSION`
   - 将值改为 `3.11.0`（确保是完整版本号）
   - 点击 **"Save Changes"**

3. **自动重新部署**
   - 保存后，Render 会自动触发重新部署
   - 等待部署完成

## 方法三：通过 Git 推送触发

如果服务已连接 GitHub 仓库：

1. **确保代码已更新**
   ```bash
   git status
   git push origin main
   ```

2. **Render 会自动检测**
   - Render 会自动检测到新的推送
   - 自动触发重新部署
   - 在 Dashboard 的 "Events" 标签可以看到部署日志

## 方法四：查看日志并修复问题

如果部署失败，先查看日志：

1. **查看部署日志**
   - 在服务详情页，点击 **"Logs"** 标签
   - 查看最新的部署日志
   - 找到错误信息

2. **根据错误修复**
   - 如果是环境变量错误，修改环境变量
   - 如果是代码错误，修复代码后推送
   - 如果是依赖问题，检查 `requirements.txt`

3. **重新部署**
   - 修复后，使用上述任一方法重新部署

## 常见问题

### 问题：部署一直失败
**解决**：
1. 检查 `PYTHON_VERSION` 是否为 `3.11.0`（完整版本号）
2. 检查 `DASHSCOPE_API_KEY` 是否已设置
3. 查看日志中的具体错误信息

### 问题：找不到 Manual Deploy 按钮
**解决**：
- 确保你已登录
- 确保你有该服务的权限
- 尝试刷新页面

### 问题：自动部署没有触发
**解决**：
1. 检查 GitHub 仓库连接是否正常
2. 检查是否推送到正确的分支（通常是 `main`）
3. 在服务设置中检查 "Auto-Deploy" 是否启用

## 快速检查清单

- [ ] `PYTHON_VERSION` = `3.11.0`（不是 `3.11`）
- [ ] `DASHSCOPE_API_KEY` 已设置
- [ ] Root Directory = `server`
- [ ] Build Command = `pip install -r requirements.txt`
- [ ] Start Command = `uvicorn app:app --host 0.0.0.0 --port $PORT`

