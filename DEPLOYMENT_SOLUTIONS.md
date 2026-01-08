# 解决 Render 免费计划冷启动问题

## 问题描述
Render 免费计划在 15 分钟无活动后会自动休眠，导致首次访问需要几十秒的冷启动时间。

## 解决方案

### 方案 1: Render Starter Plan（推荐，最省事）💰
**价格**: $7/月  
**优点**:
- 不会休眠，始终保持运行
- 配置不变，只需升级计划
- 512MB RAM，适合大多数应用
- 无缝迁移，无需改动代码

**操作步骤**:
1. 登录 Render Dashboard
2. 找到你的服务 `profile-page-api`
3. 进入 Settings → Plan
4. 从 Free 升级到 Starter ($7/月)
5. 完成！服务将保持运行状态

---

### 方案 2: Fly.io（最具性价比）🚀
**价格**: 免费额度充足，超出后约 $1-3/月（取决于使用量）  
**优点**:
- 免费额度：每月 160GB 出站流量 + 3 个共享 CPU 机器（256MB RAM）
- 按使用量付费，实际成本通常 <$3/月
- 冷启动极快（2-5秒）
- 全球边缘部署，访问速度快

**部署步骤**:
1. 安装 Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. 登录 Fly.io:
   ```bash
   flyctl auth login
   ```

3. 在项目根目录部署（已有 `fly.toml` 配置）:
   ```bash
   flyctl deploy
   ```

4. 设置环境变量:
   ```bash
   flyctl secrets set DASHSCOPE_API_KEY=your_key
   flyctl secrets set CORS_ORIGINS=https://your-frontend.pages.dev
   ```

**配置调整**: 已配置 `auto_stop_machines = true` 和 `auto_start_machines = true`，机器会在无活动时停止以节省成本，有请求时自动启动（启动速度比 Render 快很多）。

---

### 方案 3: Railway（简单易用）🚂
**价格**: $5/月起（Hobby 计划），或按使用量付费  
**优点**:
- 界面友好，部署简单
- Hobby 计划 $5/月，500 小时/月运行时间
- 支持按使用量付费（Pay As You Go）
- 不会自动休眠

**部署步骤**:
1. 访问 [Railway.app](https://railway.app) 并登录
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. 在 Settings 中设置环境变量:
   - `DASHSCOPE_API_KEY`
   - `CORS_ORIGINS`
   - `PORT` (Railway 会自动提供)
5. 部署完成！

**配置**: 项目已有 `railway.json`，Railway 会自动识别。

---

### 方案 4: 使用外部健康检查保持 Render 免费计划活跃（临时方案）⏰
**注意**: Render 免费计划会忽略来自外部服务的健康检查，此方案效果有限。

如果必须使用免费计划，可以尝试：
1. 使用第三方服务定期 ping 你的 API（如 UptimeRobot 免费版）
2. 在前端添加定时心跳请求
3. 但这些方法在 Render 免费计划上可能无效

---

## 推荐排序

1. **Fly.io** - 最具性价比，冷启动快，免费额度充足
2. **Railway Hobby** - 如果希望固定 $5/月，不想计算使用量
3. **Render Starter** - 如果不想改动部署，直接升级最简单（但 $7/月略超预算）

## 成本对比

| 平台 | 月度成本 | 冷启动 | 配置难度 | 推荐度 |
|------|---------|--------|----------|--------|
| Render Free | $0 | 30-60秒 ❌ | 已配置 ✅ | ⭐ |
| Render Starter | $7 | 无 ✅ | 零改动 ✅ | ⭐⭐⭐ |
| Fly.io | $0-3 | 2-5秒 ✅ | 中等 ⚠️ | ⭐⭐⭐⭐⭐ |
| Railway Hobby | $5 | 无 ✅ | 简单 ✅ | ⭐⭐⭐⭐ |

## 快速迁移到 Fly.io（推荐）

如果选择 Fly.io，项目已包含配置，只需：

```bash
# 1. 安装 Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. 登录
flyctl auth login

# 3. 部署（从项目根目录）
flyctl deploy

# 4. 设置环境变量
flyctl secrets set DASHSCOPE_API_KEY=your_key
flyctl secrets set CORS_ORIGINS=https://your-frontend.pages.dev

# 5. 查看服务 URL
flyctl status
```

部署完成后，更新前端 API 地址即可。

