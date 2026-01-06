# Playwright 浏览器安装修复

## 问题

PDF 生成功能失败，错误信息：
```
BrowserType.launch: Executable doesn't exist at /opt/render/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell
```

## 原因

Playwright 需要安装浏览器二进制文件才能工作。在 Render 部署时，只安装了 Python 包，但没有安装浏览器二进制文件。

## 解决方案

已在 `render.yaml` 中更新构建命令：
```yaml
buildCommand: pip install -r requirements.txt && playwright install chromium
```

## 部署步骤

### 方法 1: 自动部署（推荐）

代码已推送到 GitHub，Render 会自动检测并重新部署。

### 方法 2: 手动更新

如果自动部署没有触发：

1. 访问 Render Dashboard: https://dashboard.render.com
2. 进入 `profile-page-api` 服务
3. 点击 **"Settings"** 标签
4. 找到 **"Build Command"**
5. 更新为：
   ```
   pip install -r requirements.txt && playwright install chromium
   ```
6. 点击 **"Save Changes"**
7. 等待重新部署完成（约 5-10 分钟，因为需要下载浏览器二进制文件）

## 验证

部署完成后，测试 PDF 生成功能：
1. 在智能报告工具中生成一份报告
2. 点击下载 → PDF
3. 应该能成功生成并下载 PDF 文件

## 注意事项

- Playwright 浏览器二进制文件较大（约 100-200MB），首次安装需要较长时间
- Render 免费计划可能会因为安装时间较长而超时，如果遇到问题，可以考虑：
  - 使用 `playwright install --with-deps chromium` 安装依赖
  - 或者暂时禁用 PDF 功能，使用 Markdown 下载

