# 阿里云 ECS 部署指南

## 📋 前置准备

1. **开通阿里云 ECS 免费试用**
   - 访问 [阿里云官网](https://www.aliyun.com/)
   - 注册账号并完成实名认证
   - 开通 **云服务器 ECS 免费试用（个人版）**
   - 选择配置：**2核 2GiB Ubuntu 22.04**

2. **准备信息**
   - 服务器信息：`i-bp1aychxzcsmoihrda01` / `121.41.228.247`
   - API Keys：`sk-ee3665e8d0a04e8786aaa86ea91ac963` / `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`

---

## 🚀 部署步骤

### 1. 配置安全组
在阿里云控制台添加入方向规则：
- 22端口（SSH）
- 80端口（HTTP）
- 8001端口（API）

### 2. SSH 连接服务器
```bash
ssh root@121.41.228.247
```

### 3. 安装 Docker
```bash
# Ubuntu
apt-get update
apt-get install -y docker.io
systemctl start docker
systemctl enable docker
```

### 4. 部署应用
```bash
# 克隆代码
git config --global http.version HTTP/1.1
git clone https://ghproxy.com/https://github.com/Nirvan-a/Mark-sProfile.git
cd Mark-sProfile

# 构建镜像
docker build -t profile:latest .

# 运行容器
docker run -d \
  --name profile \
  -p 8001:8001 \
  -e PORT=8001 \
  -e DASHSCOPE_API_KEY=sk-ee3665e8d0a04e8786aaa86ea91ac963 \
  -e TAVILY_API_KEY=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 \
  -e CORS_ORIGINS=https://profile.mazhaofeng.com \
  --restart=always \
  profile:latest
```

### 5. 验证部署
```bash
# 查看容器状态
docker ps

# 测试 API
curl http://localhost:8001/api/health
# 应该返回: {"status":"ok"}
```

---

## 🌐 配置域名和 HTTPS

### DNS 配置（Cloudflare）
1. 登录 Cloudflare Dashboard
2. 添加 A 记录：
   - Name: `api`
   - Content: `121.41.228.247`
   - Proxy status: DNS only（灰色云图标）

### Nginx + HTTPS 配置
```bash
# 安装 Nginx 和 Certbot
apt-get install -y nginx certbot python3-certbot-nginx

# 创建 Nginx 配置
cat > /etc/nginx/sites-available/api.mazhaofeng.com << 'EOF'
server {
    listen 80;
    server_name api.mazhaofeng.com;
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/api.mazhaofeng.com /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# 申请 SSL 证书
certbot --nginx -d api.mazhaofeng.com
```

## 🔄 更新前端配置

在 Cloudflare Pages 中更新环境变量：
- `VITE_API_BASE_URL`: `https://api.mazhaofeng.com`

## ✅ 验证部署

```bash
# 测试 HTTPS 访问
curl https://api.mazhaofeng.com/api/health
# 应该返回: {"status":"ok"}
```

## 💰 成本说明

- 阿里云 ECS 免费试用：300元额度，约3个月
- 域名：通过 Cloudflare 管理
- SSL证书：Let's Encrypt 免费

## 🔧 常见问题

**522 错误**：检查安全组是否开放80端口
**502 错误**：检查容器是否正常运行 `docker ps`

**更新应用**：
```bash
# 进入项目目录
cd Mark-sProfile

# 拉取最新代码
git pull

# 重新构建
docker build -t profile:latest .
docker stop profile && docker rm profile
docker run -d --name profile -p 8001:8001 \
  -e DASHSCOPE_API_KEY=sk-ee3665e8d0a04e8786aaa86ea91ac963 \
  -e TAVILY_API_KEY=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 \
  -e CORS_ORIGINS=https://profile.mazhaofeng.com \
  --restart=always profile:latest
```

