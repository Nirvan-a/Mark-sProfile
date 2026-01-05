# Fly.io 快速部署指南

## 步骤 1：安装 Fly CLI

在终端运行：
```bash
curl -L https://fly.io/install.sh | sh
```

如果使用 macOS，可能需要：
```bash
brew install flyctl
```

## 步骤 2：登录

```bash
flyctl auth login
```

会打开浏览器，用 GitHub 账号登录。

## 步骤 3：进入服务器目录

```bash
cd /Users/nirvana/Desktop/Cursor/Profile-Page/server
```

## 步骤 4：初始化 Fly 应用

```bash
flyctl launch
```

按提示操作：
- **App name**: `profile-page-api`（或你喜欢的名字，需要全局唯一）
- **Region**: 选择离你最近的（如 `sin` 新加坡 或 `iad` 美国东部）
- **Postgres**: 输入 `n`（不需要）
- **Redis**: 输入 `n`（不需要）

## 步骤 5：设置环境变量

```bash
flyctl secrets set DASHSCOPE_API_KEY=你的API密钥
```

## 步骤 6：部署

```bash
flyctl deploy
```

等待 2-3 分钟，部署完成后会显示 URL。

## 步骤 7：获取 URL

部署完成后会显示类似：
```
https://profile-page-api.fly.dev
```

## 步骤 8：测试

访问：`https://你的URL.fly.dev/api/health`

应该返回：`{"status": "ok"}`

---

## 如果遇到问题

### 问题 1：flyctl 命令找不到
确保安装后重启终端，或运行：
```bash
export PATH="$HOME/.fly/bin:$PATH"
```

### 问题 2：需要修改配置
编辑 `fly.toml` 文件（在 server 目录下）

### 问题 3：部署失败
查看错误日志，通常是因为：
- 内存不足（默认 256MB，可能需要增加）
- 端口配置错误

