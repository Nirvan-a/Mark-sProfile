# 后端部署方案对比

## 📊 项目后端需求分析

### 技术栈
- **框架**: FastAPI (Python 3.11)
- **关键依赖**: Playwright (需要浏览器), matplotlib, pandas, langchain 等
- **资源需求**: 
  - 内存: 至少 2GB (Playwright 需要)
  - CPU: 1核即可
  - 存储: 需要存储图表文件、文档等

### 部署要求
- ✅ 支持 Docker 部署
- ✅ 能从 Cloudflare 域名前端访问
- ✅ 保证所有功能正常运行（包括 Playwright）

---

## 🎯 推荐部署方案（按优先级排序）

### 方案一：Fly.io ⭐⭐⭐⭐⭐（推荐）

**优势：**
- ✅ **免费层充足**：3个共享CPU-1x、256MB RAM的VM，或1个性能VM（1GB RAM）
- ✅ **支持 Docker**：完美支持你的 Dockerfile
- ✅ **全球节点**：可选择靠近中国的区域（如新加坡、日本）
- ✅ **自动 HTTPS**：免费 SSL 证书
- ✅ **按需扩展**：流量大时可以自动扩展

**费用：**
- 免费层：3个VM（性能受限）或1个性能VM
- 付费：$1.94/月起（1GB RAM + 1共享CPU）

**部署步骤：**

1. 安装 Fly CLI：
```bash
curl -L https://fly.io/install.sh | sh
```

2. 登录：
```bash
fly auth login
```

3. 初始化项目：
```bash
cd /Users/nirvana/Desktop/Cursor/Profile-Page
fly launch --name your-backend-name
```

4. 配置 `fly.toml`（如果自动生成的不对）：
```toml
app = "your-backend-name"
primary_region = "sin"  # 新加坡，或 "nrt" (东京)

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8001"

[http_service]
  internal_port = 8001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory_mb = 2048  # Playwright 需要至少 2GB
  cpu_kind = "shared"
  cpus = 1
```

5. 设置环境变量：
```bash
fly secrets set DASHSCOPE_API_KEY=your_key
fly secrets set CORS_ORIGINS=https://profile.mazhaofeng.com,https://your-domain.pages.dev
```

6. 部署：
```bash
fly deploy
```

7. 获取部署地址：
```bash
fly status
# 会显示类似：https://your-backend-name.fly.dev
```

**配置 Cloudflare Worker 代理：**
在 Cloudflare Worker 中设置 `BACKEND_URL` 环境变量为 `https://your-backend-name.fly.dev`

---

### 方案二：Render ⭐⭐⭐⭐

**优势：**
- ✅ **免费层可用**：但有限制（服务休眠、冷启动慢）
- ✅ **支持 Docker**：完美支持
- ✅ **自动部署**：GitHub 集成
- ✅ **免费 SSL**

**劣势：**
- ❌ 免费服务15分钟无请求会休眠（需要冷启动）
- ❌ 冷启动可能需要30-60秒

**费用：**
- 免费层：服务会休眠
- Starter: $7/月起（不休眠，512MB RAM，需要升级到 $25/月才能获得2GB RAM）

**部署步骤：**

1. 登录 [Render](https://render.com)
2. 新建 Web Service
3. 连接 GitHub 仓库
4. 配置：
   - **Name**: `profile-page-backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context**: `.`
   - **Plan**: Free（或 Starter $7/月）
5. 环境变量：
   - `DASHSCOPE_API_KEY`: 你的密钥
   - `CORS_ORIGINS`: `https://profile.mazhaofeng.com,https://your-domain.pages.dev`
   - `PORT`: `8001`
6. 部署后获取地址（类似 `https://your-app.onrender.com`）

**注意**：免费层内存只有512MB，Playwright可能无法运行，需要至少 Starter 计划（$7/月，但只有512MB）或 Professional（$25/月，2GB RAM）

---

### 方案三：Koyeb ⭐⭐⭐⭐

**优势：**
- ✅ **免费层**：永久免费（但有资源限制）
- ✅ **支持 Docker**：完美支持
- ✅ **全球CDN**：自动加速
- ✅ **不休眠**：免费层也不休眠

**费用：**
- 免费层：永久免费，但资源有限
- Starter: €9/月起（更稳定）

**部署步骤：**

1. 登录 [Koyeb](https://www.koyeb.com)
2. 创建 App
3. 选择 Docker 部署
4. 连接 GitHub 仓库或直接上传 Dockerfile
5. 配置环境变量
6. 部署

**注意**：免费层可能内存不足（Playwright需要2GB），建议使用付费计划

---

### 方案四：腾讯云 Serverless 容器（ECI）（国内推荐）⭐⭐⭐⭐⭐

**优势：**
- ✅ **国内速度快**：访问速度快
- ✅ **按需付费**：不用不花钱
- ✅ **支持 Docker**：完美支持
- ✅ **资源充足**：可以配置2GB+内存
- ✅ **独立服务**：不依赖其他平台

**费用：**
- 按实际使用计费（CPU + 内存 + 流量）
- 预估：低流量情况下每月 ¥5-15 人民币

**部署步骤：** 参考项目中的 `TENCENT_CLOUD_DEPLOY.md` 文件

---

### 方案四-B：腾讯云 CloudBase Run（云托管）（可选）⭐⭐⭐⭐

**优势：**
- ✅ **国内速度快**：访问速度快
- ✅ **支持 Docker**：完美支持
- ✅ **资源充足**：可以配置2GB+内存
- ✅ **一站式服务**：可与 CloudBase 其他服务集成（数据库、存储等）
- ✅ **有免费额度**：但有限

**费用：**
- 有免费额度（有限）
- 超出后按资源使用计费
- 预估：低流量情况下每月 ¥10-30 人民币

**部署步骤：**
1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 创建环境（如果还没有）
3. 进入「云托管」服务
4. 创建服务并配置 Docker 镜像
5. 配置环境变量和资源
6. 部署

**注意**：相比 ECI，CloudBase Run 更适合需要 CloudBase 其他服务的场景。如果只是部署后端 API，推荐使用 ECI（方案四）。

**详细对比**：参考项目中的 `TENCENT_CLOUDBASE_VS_SERVERLESS.md` 文件

---

### 方案六：Google Cloud Run ⭐⭐⭐

**优势：**
- ✅ **免费层充足**：每月200万请求免费
- ✅ **按需计费**：按请求付费
- ✅ **支持 Docker**
- ✅ **全球部署**

**费用：**
- 免费层：每月200万请求
- 付费：按请求和资源使用计费，通常每月 $5-20

**部署步骤：**

1. 安装 gcloud CLI
2. 构建并推送镜像：
```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/profile-backend
```

3. 部署到 Cloud Run：
```bash
gcloud run deploy profile-backend \
  --image gcr.io/PROJECT-ID/profile-backend \
  --platform managed \
  --region asia-east1 \
  --memory 2Gi \
  --cpu 1 \
  --allow-unauthenticated \
  --set-env-vars DASHSCOPE_API_KEY=your_key,CORS_ORIGINS=https://your-domain.com
```

---

## 🔧 Cloudflare Worker 代理配置

无论选择哪个方案，都需要在 Cloudflare Worker 中配置代理：

1. 在 Cloudflare Dashboard 进入 Workers & Pages
2. 编辑你的 Worker（或创建新的）
3. 使用项目中的 `cloudflare-worker.js` 代码
4. 设置环境变量：
   - `BACKEND_URL`: 你部署的后端地址（如 `https://your-backend.fly.dev`）
5. 配置路由：`yourdomain.com/api/*` → Worker

---

## 📝 快速对比表

| 方案 | 免费层 | 付费起步 | 国内速度 | Playwright支持 | 推荐指数 |
|------|--------|----------|----------|----------------|----------|
| Fly.io | ✅ 有 | $1.94/月 | ⭐⭐⭐ | ✅ 完美 | ⭐⭐⭐⭐⭐ |
| Render | ⚠️ 受限 | $7/月起 | ⭐⭐ | ⚠️ 需要付费 | ⭐⭐⭐ |
| Koyeb | ✅ 有 | €9/月 | ⭐⭐⭐ | ⚠️ 免费层可能不足 | ⭐⭐⭐⭐ |
| 腾讯云 ECI | ❌ 无 | ¥5起 | ⭐⭐⭐⭐⭐ | ✅ 完美 | ⭐⭐⭐⭐⭐ |
| 腾讯云 CloudBase Run | ⚠️ 有限 | ¥10起 | ⭐⭐⭐⭐⭐ | ✅ 完美 | ⭐⭐⭐⭐ |
| Cloud Run | ✅ 有 | 按需 | ⭐⭐⭐ | ✅ 支持 | ⭐⭐⭐ |

---

## 🎯 最终推荐

### 如果追求免费且功能完整：
**Fly.io** - 免费层够用，全球节点，性能稳定

### 如果追求国内访问速度：
**腾讯云 Serverless 容器（ECI）** - 国内最快，按需付费，成本最低（约¥5-15/月）
**或 腾讯云 CloudBase Run** - 国内速度快，适合需要 CloudBase 其他服务的场景（约¥10-30/月）

### 如果追求简单部署：
**Render Starter ($7/月)** - 界面友好，自动部署，但免费层不适合Playwright

---

## 📚 下一步

1. 选择其中一个方案
2. 按照对应方案的部署步骤操作
3. 配置 Cloudflare Worker 代理
4. 在前端环境变量中配置后端地址（如果需要）
5. 测试所有功能（特别是需要 Playwright 的功能）

