# Fly.io 部署指南

## 🚀 为什么选择 Fly.io？

- ✅ **完全免费**：提供 3 个共享 CPU 的虚拟机（每个 256MB 内存）
- ✅ **无冷启动**：可以保持应用常驻运行，不会休眠
- ✅ **全球 CDN**：自动提供全球加速
- ✅ **简单易用**：配置简单，部署快捷

## 📋 部署前准备

### 1. 安装 Fly.io CLI

```bash
# macOS
brew install flyctl

# 或使用官方安装脚本
curl -L https://fly.io/install.sh | sh
```

### 2. 登录 Fly.io

```bash
flyctl auth login
```

这会打开浏览器，使用 GitHub 或邮箱登录。

### 3. 配置环境变量

在 `server/` 目录下创建 `.env` 文件（如果还没有），或直接在 Fly.io 上配置：

```bash
# 在 Fly.io 上设置环境变量
flyctl secrets set DASHSCOPE_API_KEY=your_dashscope_key
flyctl secrets set TAVILY_API_KEY=your_tavily_key
flyctl secrets set CORS_ORIGINS=https://your-frontend-domain.pages.dev
```

## 🚀 快速部署（推荐）

使用提供的部署脚本，一键部署：

```bash
cd server
./deploy.sh
```

脚本会自动检查环境、初始化应用（如果需要）并完成部署。

---

## 🚀 手动部署步骤

如果你想手动部署，按以下步骤操作：

### 1. 进入 server 目录

```bash
cd server
```

### 2. 初始化 Fly.io 应用（首次部署）

```bash
flyctl launch
```

按照提示操作：
- 选择应用名称（或直接回车使用默认，如 `profile-page-api`）
- 选择区域（建议选择 `nrt` 东京或 `hkg` 香港）
- 是否立即部署？选择 `No`（先配置环境变量）

### 3. 配置应用（首次部署后）

编辑 `fly.toml` 文件，确保配置正确：

```toml
app = "your-app-name"  # 使用上一步创建的应用名称
auto_stop_machines = false  # 关键：禁用自动停止
min_machines_running = 1  # 始终保持运行
```

### 4. 设置环境变量

**重要：** 环境变量需要在 Fly.io 上配置，不要提交到代码仓库。

```bash
# 设置 API Keys（必需）
flyctl secrets set DASHSCOPE_API_KEY=your_dashscope_key
flyctl secrets set TAVILY_API_KEY=your_tavily_key

# 设置前端域名（用于 CORS，必需）
# 替换为你的 Cloudflare Pages 域名
flyctl secrets set CORS_ORIGINS=https://your-frontend.pages.dev

# 可选：如果有多个前端域名，用逗号分隔
# flyctl secrets set CORS_ORIGINS=https://domain1.pages.dev,https://domain2.pages.dev
```

**获取 API Keys：**
- DashScope API Key: 访问 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
- Tavily API Key: 访问 [Tavily 官网](https://tavily.com/) 注册获取

### 5. 部署应用

```bash
flyctl deploy
```

等待部署完成，Fly.io 会显示应用的 URL，例如：`https://your-app-name.fly.dev`

### 6. 验证部署

```bash
# 检查应用状态
flyctl status

# 查看日志
flyctl logs

# 获取应用 URL
APP_URL=$(flyctl info -s | grep 'Hostname' | awk '{print $2}')

# 测试健康检查
curl https://$APP_URL/api/health

# 应该返回: {"status":"ok"}
```

## 🔧 后续维护

### 更新部署

```bash
cd server
flyctl deploy

# 或使用部署脚本
./deploy.sh
```

### 查看日志

```bash
flyctl logs
```

### 查看应用状态

```bash
flyctl status
```

### 更新环境变量

```bash
flyctl secrets set KEY=value
```

### 查看环境变量列表

```bash
flyctl secrets list
```

## ⚙️ 前端配置

在 Cloudflare Pages 中配置环境变量：

1. 进入 Cloudflare Pages 项目设置
2. 找到 "Environment variables" 部分
3. 添加以下环境变量：

```
VITE_API_BASE_URL=https://your-app-name.fly.dev
```

或者在生产环境构建变量中添加：

```
VITE_API_BASE_URL=https://your-app-name.fly.dev
```

## 💡 关键配置说明

### 无冷启动的关键设置

在 `fly.toml` 中，以下配置确保应用无冷启动：

```toml
[http_service]
  auto_stop_machines = false  # 禁用自动停止（关键！）
  min_machines_running = 1    # 至少保持1个实例运行（关键！）
```

**原理说明：**
- `auto_stop_machines = false`: 禁用自动休眠，应用不会因为无流量而停止
- `min_machines_running = 1`: 确保至少有一个实例始终运行
- 这样配置后，应用会始终保持运行状态，响应时间稳定在 100-200ms，不会有 5-30 秒的冷启动延迟

**注意：** 这会在免费额度内使用一个 VM 实例，但 Fly.io 免费提供 3 个 VM，完全够用。

### 免费额度详情

Fly.io 免费提供：

- **3 个共享 CPU 虚拟机**（可同时运行 3 个应用）
- **每个 VM 最小 256MB 内存**（本配置使用此设置，足够运行 FastAPI）
- **每月 160GB 出站流量**（足够个人项目使用）
- **无限制入站流量**
- **全球 CDN 加速**（自动配置）
- **HTTPS 证书**（自动配置，免费）

**本应用配置：**
- 使用 1 个 VM
- 256MB 内存
- 1 个共享 CPU 核心
- 预计月流量：< 10GB（除非有大量用户）

**完全在免费额度内！** ✅

### 成本优化

如果超过免费额度，可以考虑：
- 使用 256MB 内存（最小配置）
- 只部署 1 个实例
- 监控流量使用情况

## 🔍 故障排查

### 应用无法启动

```bash
# 查看详细日志
flyctl logs

# 检查应用状态
flyctl status

# SSH 进入容器调试
flyctl ssh console
```

### CORS 错误

确保在 Fly.io 上设置了 `CORS_ORIGINS` 环境变量：

```bash
flyctl secrets set CORS_ORIGINS=https://your-frontend.pages.dev
```

### 内存不足

如果应用崩溃，可以尝试增加内存（但会占用更多免费额度）：

```bash
# 编辑 fly.toml，修改 memory_mb
memory_mb = 512  # 从 256 增加到 512
flyctl deploy
```

## 📚 更多资源

- [Fly.io 官方文档](https://fly.io/docs/)
- [Fly.io Python 部署指南](https://fly.io/docs/languages-and-frameworks/python/)
- [Fly.io 免费额度说明](https://fly.io/docs/about/pricing/)

## ✅ 验证清单

- [ ] Fly.io CLI 已安装并登录
- [ ] 环境变量已配置（DASHSCOPE_API_KEY, TAVILY_API_KEY, CORS_ORIGINS）
- [ ] `fly.toml` 配置正确（auto_stop_machines = false）
- [ ] 应用部署成功
- [ ] 健康检查通过（/api/health）
- [ ] 前端环境变量已配置（VITE_API_BASE_URL）
- [ ] CORS 正常工作
