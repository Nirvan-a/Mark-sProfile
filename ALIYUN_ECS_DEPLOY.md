# 阿里云 ECS 部署指南

## 📋 前置准备

### 1. 开通免费试用

1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 注册账号并完成实名认证（个人认证）
3. 开通 **云服务器 ECS 免费试用（个人版）**
4. 选择配置：**2核(vCPU) 2GiB**（推荐）或 **2核(vCPU) 4GiB**（更稳妥）
5. 选择地域：**华东1（杭州）** 或其他国内地域
6. 选择操作系统：**Ubuntu 22.04** 或 **Alibaba Cloud Linux**（推荐 Ubuntu，Docker 安装更简单）

### 2. 准备信息

- ✅ Dockerfile（项目已存在）
- ✅ 环境变量值：
  - `DASHSCOPE_API_KEY`：你的阿里云 DashScope API Key
  - `CORS_ORIGINS`：前端域名（多个用逗号分隔）
  - `PORT`：端口（默认 8001）

---

## 🚀 部署步骤

### 步骤 1：获取服务器信息

1. 登录 [阿里云 ECS 控制台](https://ecs.console.aliyun.com/)
2. 找到你刚创建的实例，点击进入详情页
3. **记录以下信息**：
   - **公网 IP**：例如 `123.456.789.012`
   - **登录密码**：如果没有设置，需要重置密码
   - **实例 ID**：例如 `i-xxxxx`

### 步骤 2：配置安全组规则（重要！）

1. 在实例详情页，点击 **"安全组"** 标签
2. 点击安全组 ID 进入安全组配置
3. 点击 **"添加规则"**，添加以下规则：

| 规则方向 | 协议类型 | 端口范围 | 授权对象 | 描述 |
|---------|---------|---------|---------|------|
| 入方向 | TCP | 22/22 | 0.0.0.0/0 | SSH 登录 |
| 入方向 | TCP | 8001/8001 | 0.0.0.0/0 | 后端 API 端口 |

**注意**：为了安全，建议 SSH（22端口）只允许你的 IP 访问，而不是 `0.0.0.0/0`

### 步骤 3：SSH 连接到服务器

#### Windows 用户：

使用 PuTTY 或 PowerShell：

```bash
# PowerShell
ssh root@你的公网IP
```

#### macOS/Linux 用户：

```bash
ssh root@你的公网IP
```

输入密码登录（首次登录会提示修改密码）

### 步骤 4：安装 Docker

#### 如果选择 Ubuntu 系统：

```bash
# 更新系统
apt-get update

# 安装必要的工具
apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -

# 添加 Docker 仓库
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# 更新软件包列表
apt-get update

# 安装 Docker
apt-get install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker 服务
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker ps
```

#### 如果选择 Alibaba Cloud Linux 系统：

```bash
# 更新系统
yum update -y

# 安装 Docker
yum install -y docker

# 启动 Docker 服务
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker ps
```

### 步骤 5：克隆项目代码

```bash
# 安装 Git（如果还没有）
apt-get install -y git  # Ubuntu
# 或
yum install -y git      # Alibaba Cloud Linux

# 配置 Git 使用 HTTP/1.1（解决阿里云网络问题）
git config --global http.version HTTP/1.1
git config --global http.postBuffer 524288000

# 方法 1：使用 GitHub 代理服务（推荐，如果 GitHub 访问失败）
git clone https://ghproxy.com/https://github.com/YOUR_USERNAME/Profile-Page.git

# 方法 2：直接克隆（如果网络正常）
# git clone https://github.com/YOUR_USERNAME/Profile-Page.git

# 方法 3：浅克隆（只克隆最新代码，更快）
# git clone --depth 1 https://ghproxy.com/https://github.com/YOUR_USERNAME/Profile-Page.git

# 方法 4：使用 SSH（需要先配置 SSH 密钥，需要网络支持）
# git clone git@github.com:YOUR_USERNAME/Profile-Page.git

# 方法 5：使用 Gitee 中转（如果仓库公开，先在 gitee.com 导入 GitHub 仓库）
# git clone https://gitee.com/YOUR_GITEE_USERNAME/Profile-Page.git

# 进入项目目录
cd Profile-Page
```

**注意**：
- 如果遇到 `error: RPC failed; curl 16 Error in the HTTP2 framing layer` 错误，先运行上面的 Git 配置命令
- 如果你的仓库是私有的，需要：
  1. 配置 SSH 密钥，或
  2. 使用 HTTPS + Personal Access Token

### 步骤 6：构建 Docker 镜像

```bash
# 在项目根目录（有 Dockerfile 的目录）
docker build -t profile-backend:latest .
```

**注意**：首次构建可能需要 5-10 分钟，因为需要下载依赖和 Playwright 浏览器

### 步骤 7：运行容器

```bash
docker run -d \
  --name profile-backend \
  -p 8001:8001 \
  -e PORT=8001 \
  -e DASHSCOPE_API_KEY=你的API密钥 \
  -e CORS_ORIGINS=https://你的前端域名1,https://你的前端域名2 \
  --restart=always \
  profile-backend:latest
```

**参数说明**：
- `-d`：后台运行
- `--name`：容器名称
- `-p 8001:8001`：端口映射
- `-e`：环境变量
- `--restart=always`：自动重启（服务器重启后容器也会自动启动）

**示例 CORS_ORIGINS**：
```bash
-e CORS_ORIGINS=https://your-app.pages.dev,https://profile.example.com
```

**注意**：多个域名用逗号分隔，**不要有空格**

### 步骤 8：验证部署

```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs profile-backend

# 实时查看日志
docker logs -f profile-backend

# 测试健康检查接口
curl http://localhost:8001/api/health
```

应该返回：
```json
{"status": "ok"}
```

### 步骤 9：测试公网访问

在本地电脑浏览器或命令行测试：

```bash
curl http://你的公网IP:8001/api/health
```

或者在浏览器访问：
```
http://你的公网IP:8001/api/health
```

---

## 🌐 配置域名（可选但推荐）

### 使用阿里云域名

1. 在 [阿里云域名控制台](https://dc.console.aliyun.com/) 购买域名（如果还没有）
2. 在 [DNS 解析控制台](https://dns.console.aliyun.com/) 添加解析记录：
   - **记录类型**：A
   - **主机记录**：`api`（或其他子域名）
   - **记录值**：你的公网 IP
   - **TTL**：600（10分钟）

3. 等待 DNS 解析生效（通常几分钟到几小时）

### 配置 HTTPS（推荐）

#### 使用 Nginx 反向代理 + Let's Encrypt

1. 安装 Nginx：
```bash
apt-get install -y nginx  # Ubuntu
# 或
yum install -y nginx      # Alibaba Cloud Linux
```

2. 安装 Certbot：
```bash
apt-get install -y certbot python3-certbot-nginx  # Ubuntu
# 或
yum install -y certbot python3-certbot-nginx      # Alibaba Cloud Linux
```

3. 配置 Nginx：
```bash
# 创建配置文件
nano /etc/nginx/sites-available/api.yourdomain.com
```

添加以下内容（替换 `api.yourdomain.com` 为你的域名）：
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

```bash
# 创建符号链接（Ubuntu）
ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
# 或直接编辑 /etc/nginx/nginx.conf（Alibaba Cloud Linux）

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

4. 申请 SSL 证书：
```bash
certbot --nginx -d api.yourdomain.com
```

按照提示操作，Certbot 会自动配置 HTTPS

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

如果你的前端域名有变化，需要更新容器的环境变量：

```bash
# 停止并删除旧容器
docker stop profile-backend
docker rm profile-backend

# 重新运行容器（更新 CORS_ORIGINS）
docker run -d \
  --name profile-backend \
  -p 8001:8001 \
  -e PORT=8001 \
  -e DASHSCOPE_API_KEY=你的API密钥 \
  -e CORS_ORIGINS=https://你的新前端域名1,https://你的新前端域名2 \
  --restart=always \
  profile-backend:latest
```

---

## ✅ 验证部署

### 1. 健康检查

```bash
# 在服务器上测试
curl http://localhost:8001/api/health

# 在本地测试
curl http://你的公网IP:8001/api/health
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
   - 请求 URL 应该指向你的阿里云后端地址
   - 状态码应该是 200（成功）

### 3. 检查日志

```bash
# 查看容器日志
docker logs profile-backend

# 实时查看日志
docker logs -f profile-backend
```

确认：
- ✅ 应用正常启动
- ✅ 没有错误信息
- ✅ 路由加载成功

---

## 💰 成本说明

### 免费试用期间

- **300元免费额度**：约可运行 **2439小时**（约3个月）
- **如果选择 2核2GB 配置**：每小时约 ¥0.123
- **如果选择 2核4GB 配置**：每小时约 ¥0.254（约1181小时）

### 超出免费额度后

- 按实际使用量计费（按小时）
- 2核2GB：约 ¥0.123/小时
- 2核4GB：约 ¥0.254/小时

**建议**：如果流量不大，2核2GB 足够使用

---

## 🔧 常见问题

### Q1: SSH 连接失败？

**检查：**
1. 确认安全组规则已开放 22 端口
2. 确认使用的是公网 IP（不是内网 IP）
3. 确认密码正确（如果忘记密码，在控制台重置）

### Q1.5: Git clone 失败（连接超时或 HTTP2 错误）？

**问题：**
- `error: RPC failed; curl 16 Error in the HTTP2 framing layer` - HTTP/2 协议问题
- `Failed to connect to github.com port 443 after xxx ms: Connection timed out` - 网络连接问题（国内访问 GitHub 受限）

**解决方案：**

#### 方法 1：使用 GitHub 代理服务（推荐 ⭐⭐⭐⭐⭐）

```bash
# 使用 ghproxy.com 代理服务
git clone https://ghproxy.com/https://github.com/YOUR_USERNAME/Profile-Page.git
```

#### 方法 2：禁用 HTTP/2（解决 HTTP2 错误）

```bash
git config --global http.version HTTP/1.1
git config --global http.postBuffer 524288000
git clone https://github.com/YOUR_USERNAME/Profile-Page.git
```

#### 方法 3：使用 Gitee 中转（适合公开仓库 ⭐⭐⭐⭐）

1. 访问 [Gitee](https://gitee.com/)
2. 创建仓库 → **导入仓库** → 输入 GitHub 仓库地址
3. 等待导入完成后，从 Gitee 克隆：
```bash
git clone https://gitee.com/YOUR_GITEE_USERNAME/Profile-Page.git
```

#### 方法 4：直接下载代码包（最简单 ⭐⭐⭐⭐⭐）

```bash
# 使用 wget 或 curl 下载 zip 包
wget https://github.com/YOUR_USERNAME/Profile-Page/archive/refs/heads/main.zip

# 或使用代理
wget https://ghproxy.com/https://github.com/YOUR_USERNAME/Profile-Page/archive/refs/heads/main.zip

# 解压
unzip main.zip
mv Profile-Page-main Profile-Page
cd Profile-Page
```

#### 方法 5：配置代理（如果你有代理服务）

```bash
# 配置 Git 使用代理（替换为你的代理地址）
git config --global http.proxy http://proxy.example.com:8080
git config --global https.proxy http://proxy.example.com:8080

git clone https://github.com/YOUR_USERNAME/Profile-Page.git

# 使用完后取消代理
# git config --global --unset http.proxy
# git config --global --unset https.proxy
```

**推荐顺序**：
1. 先试方法 1（GitHub 代理）或方法 4（下载 zip 包）- 最简单快速
2. 如果仓库是公开的，使用方法 3（Gitee 中转）- 国内速度快
3. 如果有代理，使用方法 5

### Q2: Docker 构建失败？

**检查：**
1. 确认网络连接正常（需要下载依赖）
2. 查看构建日志：`docker build -t profile-backend .` 的输出
3. 确认磁盘空间足够（至少需要 5GB）

**常见错误：**
- 网络超时 → 可能需要配置代理或使用国内镜像源
- 内存不足 → 2GB 内存可能不够构建，可以临时增加交换空间

### Q3: 容器启动失败？

**检查：**
1. 查看容器日志：`docker logs profile-backend`
2. 确认环境变量配置正确
3. 确认端口没有被占用：`netstat -tulpn | grep 8001`

**常见错误：**
- 端口冲突 → 检查是否有其他程序占用 8001 端口
- 内存不足 → Playwright 需要至少 2GB 内存
- 环境变量错误 → 检查 CORS_ORIGINS 格式（不要有空格）

### Q4: 无法从公网访问？

**检查：**
1. 确认安全组规则已开放 8001 端口
2. 确认容器正在运行：`docker ps`
3. 确认容器内部服务正常：`curl http://localhost:8001/api/health`
4. 检查防火墙（如果启用了）：
```bash
# Ubuntu
ufw status
ufw allow 8001

# Alibaba Cloud Linux
firewall-cmd --list-ports
firewall-cmd --add-port=8001/tcp --permanent
firewall-cmd --reload
```

### Q5: CORS 错误？

**检查：**
1. 确认 `CORS_ORIGINS` 环境变量包含前端域名
2. 确认域名格式正确（包含 `https://` 或 `http://`）
3. 确认多个域名之间用逗号分隔，**没有空格**
4. 重启容器使环境变量生效

### Q6: 如何更新代码？

```bash
# SSH 连接到服务器
ssh root@你的公网IP

# 进入项目目录
cd Profile-Page

# 拉取最新代码
git pull

# 停止并删除旧容器
docker stop profile-backend
docker rm profile-backend

# 重新构建镜像
docker build -t profile-backend:latest .

# 重新运行容器
docker run -d \
  --name profile-backend \
  -p 8001:8001 \
  -e PORT=8001 \
  -e DASHSCOPE_API_KEY=你的API密钥 \
  -e CORS_ORIGINS=https://你的前端域名1,https://你的前端域名2 \
  --restart=always \
  profile-backend:latest
```

### Q7: 如何查看资源使用情况？

```bash
# 查看容器资源使用
docker stats profile-backend

# 查看系统资源使用
htop  # 需要安装：apt-get install htop
# 或
top
```

### Q8: 如何配置自动备份？

建议使用阿里云快照功能：

1. 在 ECS 控制台，选择你的实例
2. 点击 **"更多"** → **"创建快照"**
3. 可以设置自动快照策略（控制台 → 快照 → 自动快照策略）

---

## 📝 部署检查清单

- [ ] 开通阿里云 ECS 免费试用
- [ ] 配置安全组规则（开放 22 和 8001 端口）
- [ ] SSH 连接到服务器
- [ ] 安装 Docker
- [ ] 克隆项目代码
- [ ] 构建 Docker 镜像
- [ ] 运行容器（配置环境变量）
- [ ] 测试健康检查接口
- [ ] 配置域名（可选）
- [ ] 配置 HTTPS（可选，推荐）
- [ ] 更新 Cloudflare Pages 环境变量（VITE_API_BASE_URL）
- [ ] 验证前端连接
- [ ] 检查日志确认正常运行
- [ ] 测试所有功能正常

---

## 🎉 完成！

部署完成后，你的后端就在阿里云 ECS 上运行了，国内访问速度会显著提升！

**优势：**
- ✅ 3个月免费试用（300元额度）
- ✅ 配置灵活，可以随时调整
- ✅ 完全控制，可以安装任何需要的软件
- ✅ 与 DashScope API 同平台，网络更优

如果遇到问题，可以：
1. 查看阿里云官方文档
2. 联系阿里云技术支持（在线客服）
3. 查看容器日志排查错误
4. 检查安全组和防火墙配置

