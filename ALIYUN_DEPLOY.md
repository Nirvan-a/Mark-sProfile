# 阿里云服务器部署指南

本指南将帮助你在阿里云服务器上部署后端 API 服务。

## 📋 前置要求

1. **阿里云 ECS 实例**
   - 推荐配置：2核4GB 或更高
   - 操作系统：Ubuntu 20.04/22.04 LTS 或 CentOS 7/8
   - 已配置安全组规则（开放 8001 端口，或使用 Nginx 反向代理）

2. **域名（可选）**
   - 如果使用域名访问，需要配置 DNS 解析

3. **API 密钥**
   - 阿里云 DashScope API Key
   - Tavily API Key

## 🚀 快速部署

### 方法一：使用部署脚本（推荐）

#### 1. 准备服务器环境

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 安装基础工具
sudo apt-get install -y git curl wget
```

#### 2. 上传项目代码

**方式 A：从 Git 仓库克隆**

```bash
# 创建项目目录
sudo mkdir -p /opt/profile-page/server
sudo chown $USER:$USER /opt/profile-page -R

# 克隆仓库（或使用你的仓库地址）
cd /opt/profile-page
git clone https://github.com/your-username/Profile-Page.git .

# 或只克隆 server 目录
cd /opt/profile-page
git clone --depth 1 --filter=blob:none --sparse https://github.com/your-username/Profile-Page.git .
git sparse-checkout set server
```

**方式 B：直接上传代码**

```bash
# 在本地打包 server 目录
tar -czf server.tar.gz server/

# 上传到服务器（使用 scp）
scp server.tar.gz user@your-server-ip:/tmp/

# 在服务器上解压
ssh user@your-server-ip
sudo mkdir -p /opt/profile-page
sudo tar -xzf /tmp/server.tar.gz -C /opt/profile-page
```

#### 3. 运行部署脚本

```bash
cd /opt/profile-page/server
sudo bash deploy.sh
```

#### 4. 配置环境变量

```bash
# 复制示例文件
cp env.example .env

# 编辑环境变量
nano .env
```

在 `.env` 文件中填入：

```env
DASHSCOPE_API_KEY=你的阿里云API密钥
TAVILY_API_KEY=你的Tavily API密钥
PORT=8001
CORS_ORIGINS=https://your-frontend.pages.dev,https://your-custom-domain.com
ENV=production
```

#### 5. 启动服务

```bash
# 启动服务
sudo systemctl start profile-page-api

# 设置开机自启
sudo systemctl enable profile-page-api

# 查看服务状态
sudo systemctl status profile-page-api

# 查看日志
sudo journalctl -u profile-page-api -f
```

### 方法二：手动部署

#### 1. 安装 Python 3.11

```bash
# Ubuntu
sudo apt-get update
sudo apt-get install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev gcc g++

# CentOS
sudo yum install -y python3.11 python3.11-pip
```

#### 2. 创建虚拟环境

```bash
cd /opt/profile-page/server
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### 3. 配置环境变量

```bash
cp env.example .env
nano .env  # 填入你的 API 密钥
```

#### 4. 创建 systemd 服务

```bash
sudo nano /etc/systemd/system/profile-page-api.service
```

粘贴以下内容：

```ini
[Unit]
Description=Profile Page API Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/profile-page/server
Environment="PATH=/opt/profile-page/server/venv/bin"
EnvironmentFile=/opt/profile-page/server/.env
ExecStart=/opt/profile-page/server/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=10
StandardOutput=append:/opt/profile-page/logs/api.log
StandardError=append:/opt/profile-page/logs/api-error.log

[Install]
WantedBy=multi-user.target
```

保存后：

```bash
sudo systemctl daemon-reload
sudo systemctl start profile-page-api
sudo systemctl enable profile-page-api
```

## 🔧 Nginx 反向代理配置（可选但推荐）

使用 Nginx 作为反向代理可以提供更好的性能和安全性。

### 1. 安装 Nginx

```bash
sudo apt-get install -y nginx
```

### 2. 配置 Nginx

```bash
# 复制配置文件
sudo cp /opt/profile-page/server/nginx.conf.example /etc/nginx/sites-available/profile-page-api

# 编辑配置（修改域名）
sudo nano /etc/nginx/sites-available/profile-page-api

# 创建软链接
sudo ln -s /etc/nginx/sites-available/profile-page-api /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 3. 配置 SSL 证书（可选，使用 Let's Encrypt）

```bash
# 安装 certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-api-domain.com

# 证书会自动续期
```

## 🔐 安全配置

### 1. 配置防火墙

```bash
# Ubuntu (UFW)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (如果使用 Nginx)
sudo ufw allow 443/tcp  # HTTPS (如果使用 SSL)
sudo ufw enable

# 如果不使用 Nginx，直接开放 8001
# sudo ufw allow 8001/tcp
```

### 2. 配置阿里云安全组

在阿里云控制台：
1. 进入 ECS 实例 → 安全组
2. 添加入站规则：
   - 端口：80 (HTTP) 或 443 (HTTPS) 或 8001 (直接访问)
   - 协议：TCP
   - 授权对象：0.0.0.0/0（或限制为特定 IP）

### 3. 更新前端 CORS 配置

确保后端 `CORS_ORIGINS` 环境变量包含你的前端域名：

```env
CORS_ORIGINS=https://your-frontend.pages.dev,https://your-custom-domain.com
```

## 📊 监控和维护

### 查看服务状态

```bash
# 查看服务状态
sudo systemctl status profile-page-api

# 查看实时日志
sudo journalctl -u profile-page-api -f

# 查看错误日志
tail -f /opt/profile-page/logs/api-error.log
```

### 重启服务

```bash
sudo systemctl restart profile-page-api
```

### 更新代码

```bash
cd /opt/profile-page
git pull  # 或重新上传代码
cd server

# 更新依赖（如果有变更）
source venv/bin/activate
pip install -r requirements.txt

# 重启服务
sudo systemctl restart profile-page-api
```

### 健康检查

```bash
# 测试 API
curl http://localhost:8001/api/health

# 或使用域名
curl https://your-api-domain.com/api/health
```

## 🐛 故障排除

### 服务无法启动

1. **检查日志**
   ```bash
   sudo journalctl -u profile-page-api -n 50
   ```

2. **检查 Python 环境**
   ```bash
   cd /opt/profile-page/server
   source venv/bin/activate
   python --version
   uvicorn --version
   ```

3. **检查环境变量**
   ```bash
   sudo cat /opt/profile-page/server/.env
   ```

4. **检查端口占用**
   ```bash
   sudo netstat -tlnp | grep 8001
   ```

### API 无法访问

1. **检查防火墙**
   ```bash
   sudo ufw status
   ```

2. **检查 Nginx 配置**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **检查后端服务**
   ```bash
   sudo systemctl status profile-page-api
   curl http://localhost:8001/api/health
   ```

### CORS 错误

确保 `CORS_ORIGINS` 环境变量包含正确的前端域名，并重启服务。

## 📝 常见问题

### Q: 如何查看实时日志？

A: 使用以下命令：
```bash
sudo journalctl -u profile-page-api -f
```

### Q: 如何修改服务端口？

A: 修改 `.env` 文件中的 `PORT` 变量，并更新 systemd 服务文件中的端口，然后重启服务。

### Q: 如何添加更多 worker 进程？

A: 修改 systemd 服务文件中的 `--workers` 参数：
```ini
ExecStart=/opt/profile-page/server/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8001 --workers 8
```

### Q: 如何备份数据？

A: 主要需要备份：
- `/opt/profile-page/server/.env` (环境变量)
- `/opt/profile-page/server/tools/smartreport/resources/` (上传的文档和生成的图表)

## 🔗 相关文档

- [后端 API 文档](./server/README.md)
- [Cloudflare Pages 前端部署](./CLOUDFLARE_PAGES_SETUP.md)

## 📄 许可证

MIT
