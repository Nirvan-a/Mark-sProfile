# 手动部署步骤（如需手动操作）

如果 SSH 密钥配置有困难，可以按照以下步骤手动操作：

## 步骤 1: 连接到服务器

```bash
ssh root@121.41.228.247
# 输入密码
```

## 步骤 2: 准备服务器环境

```bash
# 更新系统
apt-get update && apt-get upgrade -y

# 安装基础工具
apt-get install -y git curl wget
```

## 步骤 3: 创建项目目录

```bash
mkdir -p /opt/profile-page/server
mkdir -p /opt/profile-page/logs
```

## 步骤 4: 上传代码

### 方式 A: 使用 scp（从本地）

在**本地**执行：

```bash
cd /Users/nirvana/Desktop/Cursor/Profile-Page
tar --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='web/dist' \
    -czf server.tar.gz server/

scp server.tar.gz root@121.41.228.247:/tmp/
```

然后在**服务器**上：

```bash
cd /opt/profile-page
tar -xzf /tmp/server.tar.gz
```

### 方式 B: 使用 Git（如果代码在仓库中）

```bash
cd /opt/profile-page
git clone https://your-repo-url.git .
```

## 步骤 5: 运行部署脚本

```bash
cd /opt/profile-page/server
chmod +x deploy.sh
bash deploy.sh
```

## 步骤 6: 配置环境变量

```bash
cd /opt/profile-page/server
cp env.example .env
nano .env
```

在 `.env` 文件中填入：
- DASHSCOPE_API_KEY
- TAVILY_API_KEY
- CORS_ORIGINS（你的 Cloudflare Pages 域名）

## 步骤 7: 启动服务

```bash
# 启动服务
systemctl start profile-page-api

# 设置开机自启
systemctl enable profile-page-api

# 查看状态
systemctl status profile-page-api

# 查看日志
journalctl -u profile-page-api -f
```

## 步骤 8: 测试 API

```bash
curl http://localhost:8001/api/health
```

## 步骤 9: 配置防火墙和安全组

```bash
# 配置防火墙
ufw allow 8001/tcp
ufw enable

# 或配置 Nginx 反向代理（推荐）
# 参考 ALIYUN_DEPLOY.md 中的 Nginx 配置部分
```

## 更新代码

以后更新代码时：

```bash
# 在服务器上
cd /opt/profile-page/server
# 如果使用 Git
git pull
# 或重新上传代码

# 重启服务
systemctl restart profile-page-api
```
