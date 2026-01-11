# 腾讯云部署指南

## 📋 前置准备

### 1. 注册腾讯云账号
- 访问 [腾讯云官网](https://cloud.tencent.com/)
- 注册账号并完成实名认证
- 建议先领取免费试用额度

### 2. 准备信息
- ✅ Dockerfile（已存在）
- ✅ 环境变量值：
  - `DASHSCOPE_API_KEY`：你的阿里云 DashScope API Key
  - `CORS_ORIGINS`：前端域名（多个用逗号分隔）
  - `PORT`：端口（默认 8001）

---

## 🚀 方式一：腾讯云 Serverless 容器服务（推荐 ⭐⭐⭐⭐⭐）

**优势：** 最简单，按需付费，无需管理集群

### 步骤 1：开通服务

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 搜索 **"Serverless 容器"** 或访问 [Serverless 容器控制台](https://console.cloud.tencent.com/tke2/eci)
3. 如果首次使用，点击 **"立即开通"**

### 步骤 2：构建 Docker 镜像

#### 选项 A：使用腾讯云容器镜像服务（推荐）

1. 进入 [容器镜像服务 TCR](https://console.cloud.tencent.com/tcr)
2. 创建命名空间（如：`profile-page`）
3. 创建镜像仓库（如：`backend`）
4. 按照控制台的指引，在本地构建并推送镜像：

```bash
# 登录腾讯云容器镜像服务
docker login ccr.ccs.tencentyun.com

# 构建镜像（替换 YOUR_NAMESPACE 和 YOUR_REPO）
docker build -t ccr.ccs.tencentyun.com/YOUR_NAMESPACE/YOUR_REPO:latest .

# 推送镜像
docker push ccr.ccs.tencentyun.com/YOUR_NAMESPACE/YOUR_REPO:latest
```

#### 选项 B：使用 Docker Hub

如果已有 Docker Hub 账号：

```bash
# 登录 Docker Hub
docker login

# 构建并推送
docker build -t YOUR_DOCKERHUB_USERNAME/profile-page-backend:latest .
docker push YOUR_DOCKERHUB_USERNAME/profile-page-backend:latest
```

### 步骤 3：创建容器实例

1. 返回 [Serverless 容器控制台](https://console.cloud.tencent.com/tke2/eci)
2. 点击 **"新建"** 创建容器实例
3. 配置如下：

#### 基本信息
- **实例名称**：`profile-page-backend`
- **地域**：选择 **"上海"** 或 **"北京"**（国内用户推荐）
- **可用区**：默认

#### 容器配置
- **镜像**：
  - 如果使用腾讯云 TCR：选择你刚推送的镜像
  - 如果使用 Docker Hub：填入 `YOUR_DOCKERHUB_USERNAME/profile-page-backend:latest`
- **镜像拉取策略**：默认
- **容器名称**：`backend`

#### 资源配置
- **CPU**：1 核（最低配置，可按需调整）
- **内存**：2 GB（推荐，Playwright 需要）
- **GPU**：不需要

#### 网络配置
- **网络类型**：**VPC**（必须选择，否则无法公网访问）
- **VPC**：创建新的或使用现有
- **子网**：创建新的或使用现有
- **公网 IP**：✅ **开启**（必须）
- **公网带宽**：选择 **"按流量计费"**，带宽上限选择 5 Mbps 即可

#### 环境变量配置

点击 **"高级设置"** → **"环境变量"**，添加：

| 变量名 | 变量值 | 说明 |
|--------|--------|------|
| `PORT` | `8001` | 服务端口 |
| `DASHSCOPE_API_KEY` | `你的API密钥` | 阿里云 DashScope API Key |
| `CORS_ORIGINS` | `https://你的前端域名1,https://你的前端域名2` | 前端域名（逗号分隔，无空格） |

**示例 CORS_ORIGINS：**
```
https://your-app.pages.dev,https://profile.mazhaofeng.com
```

#### 存储配置
- 按需配置（本项目暂不需要）

### 步骤 4：创建并启动

1. 检查所有配置无误
2. 点击 **"创建"**
3. 等待容器实例启动（约 1-2 分钟）

### 步骤 5：获取访问地址

1. 容器实例创建成功后，点击实例名称进入详情页
2. 在 **"网络"** 部分查看 **"公网 IP"**
3. **记录这个 IP 地址**，访问地址为：`http://你的公网IP:8001`

**测试访问：**
```bash
# 健康检查
curl http://你的公网IP:8001/api/health

# 应该返回 JSON 响应
```

---

## 🚀 方式二：腾讯云轻量应用服务器（简单但需要手动管理）

如果 Serverless 容器服务不适合，可以使用轻量应用服务器：

1. 购买 [轻量应用服务器](https://console.cloud.tencent.com/lighthouse)
2. 选择配置：2核2GB 或更高（Playwright 需要）
3. 系统选择：Ubuntu 22.04 或 CentOS 8
4. SSH 连接服务器
5. 安装 Docker：
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

6. 克隆项目并构建：
```bash
git clone YOUR_REPO_URL
cd Profile-Page
docker build -t profile-backend .
docker run -d -p 8001:8001 \
  -e PORT=8001 \
  -e DASHSCOPE_API_KEY=你的API密钥 \
  -e CORS_ORIGINS=https://你的前端域名1,https://你的前端域名2 \
  --name profile-backend \
  profile-backend
```

---

## 🌐 配置域名（可选但推荐）

### 使用腾讯云域名

1. 在 [域名注册](https://buy.cloud.tencent.com/domain) 购买域名（如果还没有）
2. 在 [DNS 解析](https://console.cloud.tencent.com/cns) 添加解析记录：
   - **记录类型**：A
   - **主机记录**：`api`（或其他子域名）
   - **记录值**：你的公网 IP
   - **TTL**：600（10分钟）

3. 等待 DNS 解析生效（通常几分钟到几小时）

### 使用现有域名服务商

在你的域名服务商（如 Cloudflare）添加 A 记录：
- **名称**：`api`（或其他子域名）
- **类型**：A
- **内容**：你的公网 IP
- **TTL**：自动

### 配置 HTTPS（推荐）

#### 使用腾讯云 SSL 证书

1. 申请免费 SSL 证书：
   - 进入 [SSL 证书控制台](https://console.cloud.tencent.com/ssl)
   - 点击 **"申请免费证书"**
   - 选择 **"TrustAsia 免费版"**，填写域名信息
   - 完成 DNS 验证

2. 使用 Nginx 反向代理（如果使用轻量服务器）：
   - 安装 Nginx 和 Certbot
   - 配置反向代理和 SSL

#### 或使用 Nginx 配置示例

如果你使用轻量服务器，可以添加 Nginx 配置：

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔄 更新前端配置

### 步骤 1：获取后端地址

- **如果使用 IP 访问**：`http://你的公网IP:8001`
- **如果配置了域名**：`https://api.yourdomain.com` 或 `http://api.yourdomain.com:8001`

### 步骤 2：更新 Cloudflare Pages 环境变量

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → 你的 Pages 项目
3. 点击 **Settings** → **Environment variables**
4. 更新变量：
   - **变量名**：`VITE_API_BASE_URL`
   - **值**：你的新后端地址（例如：`https://api.yourdomain.com` 或 `http://你的公网IP:8001`）
5. **选择环境**：✅ Production（和 Preview 如果需要）
6. 点击 **Save** - Cloudflare 会自动重新部署

### 步骤 3：更新 CORS 配置（如果需要）

如果你的前端域名有变化，记得在腾讯云容器实例的环境变量中更新 `CORS_ORIGINS`。

---

## ✅ 验证部署

### 1. 健康检查

```bash
# 使用 curl
curl http://你的后端地址/api/health

# 或直接在浏览器访问
http://你的后端地址/api/health
```

应该返回：
```json
{"status": "ok"}
```

### 2. 测试 API 功能

1. 访问你的前端网站
2. 打开浏览器开发者工具（F12）→ **Network** 标签
3. 尝试使用需要后端 API 的功能
4. 检查 Network 标签中的请求：
   - 请求 URL 应该指向你的腾讯云后端地址
   - 状态码应该是 200（成功）

### 3. 检查日志

在腾讯云控制台的容器实例详情页，查看 **"日志"** 标签，确认：
- ✅ 应用正常启动
- ✅ 没有错误信息
- ✅ 路由加载成功

---

## 💰 成本估算

### Serverless 容器服务

- **CPU**：1 核 ≈ ¥0.1/小时
- **内存**：2 GB ≈ ¥0.05/小时
- **公网流量**：¥0.8/GB
- **公网 IP**：¥0.02/小时

**估算月费用**：
- 如果 24/7 运行：约 ¥120-150/月
- 如果按需运行：约 ¥30-60/月

### 轻量应用服务器

- **2核2GB**：约 ¥24/月（促销价）
- **4核4GB**：约 ¥50/月（促销价）

**推荐**：轻量应用服务器如果流量不大，性价比更高。

---

## 🔧 常见问题

### Q1: 容器启动失败？

**检查：**
1. 查看容器日志（控制台 → 日志）
2. 确认环境变量配置正确
3. 确认镜像地址正确
4. 确认端口配置正确（8001）

**常见错误：**
- 镜像拉取失败 → 检查镜像地址和拉取凭证
- 端口冲突 → 确认 PORT 环境变量
- 内存不足 → 增加内存配置（Playwright 需要至少 2GB）

### Q2: 无法访问服务？

**检查：**
1. 确认公网 IP 已开启
2. 确认安全组规则允许 8001 端口（如果使用轻量服务器）
3. 检查防火墙设置
4. 使用 `curl` 测试本地端口：
   ```bash
   curl http://localhost:8001/api/health
   ```

### Q3: CORS 错误？

**检查：**
1. 确认 `CORS_ORIGINS` 环境变量包含前端域名
2. 确认域名格式正确（包含 `https://` 或 `http://`）
3. 确认多个域名之间用逗号分隔，**没有空格**
4. 重新部署容器实例使环境变量生效

### Q4: 如何更新代码？

**如果使用容器镜像：**
```bash
# 1. 本地更新代码
git pull

# 2. 重新构建镜像
docker build -t ccr.ccs.tencentyun.com/YOUR_NAMESPACE/YOUR_REPO:latest .

# 3. 推送新镜像
docker push ccr.ccs.tencentyun.com/YOUR_NAMESPACE/YOUR_REPO:latest

# 4. 在腾讯云控制台，重启容器实例（使用新镜像）
```

**如果使用轻量服务器：**
```bash
# SSH 连接服务器
ssh root@你的服务器IP

# 进入项目目录
cd Profile-Page

# 拉取最新代码
git pull

# 重新构建并重启容器
docker stop profile-backend
docker rm profile-backend
docker build -t profile-backend .
docker run -d -p 8001:8001 \
  -e PORT=8001 \
  -e DASHSCOPE_API_KEY=你的API密钥 \
  -e CORS_ORIGINS=https://你的前端域名1,https://你的前端域名2 \
  --name profile-backend \
  profile-backend
```

### Q5: 如何查看日志？

**Serverless 容器：**
- 控制台 → 容器实例 → 日志标签

**轻量服务器：**
```bash
# 查看容器日志
docker logs profile-backend

# 实时查看日志
docker logs -f profile-backend
```

### Q6: 如何配置自动重启？

**Serverless 容器：**
- 默认支持，容器异常退出会自动重启

**轻量服务器 Docker：**
- 使用 `--restart=always` 参数：
```bash
docker run -d -p 8001:8001 \
  --restart=always \
  -e PORT=8001 \
  -e DASHSCOPE_API_KEY=你的API密钥 \
  -e CORS_ORIGINS=https://你的前端域名1,https://你的前端域名2 \
  --name profile-backend \
  profile-backend
```

---

## 📝 部署检查清单

- [ ] 注册腾讯云账号并完成实名认证
- [ ] 选择部署方式（Serverless 容器 或 轻量服务器）
- [ ] 准备 Docker 镜像（推送到 TCR 或 Docker Hub）
- [ ] 创建容器实例/服务器
- [ ] 配置环境变量（PORT、DASHSCOPE_API_KEY、CORS_ORIGINS）
- [ ] 开启公网 IP
- [ ] 测试健康检查接口
- [ ] 配置域名（可选）
- [ ] 更新 Cloudflare Pages 环境变量（VITE_API_BASE_URL）
- [ ] 验证前端连接
- [ ] 检查日志确认正常运行
- [ ] 测试所有功能正常

---

## 🎉 完成！

部署完成后，你的后端就在腾讯云上运行了，国内访问速度会显著提升！

如果遇到问题，可以：
1. 查看腾讯云官方文档
2. 联系腾讯云技术支持
3. 查看容器日志排查错误

