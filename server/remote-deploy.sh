#!/bin/bash

# 远程部署脚本 - 自动连接服务器并部署
# 使用方法: bash remote-deploy.sh

set -e

SERVER="root@121.41.228.247"
PROJECT_DIR="/opt/profile-page"

echo "🚀 开始远程部署到 $SERVER..."

# 1. 测试 SSH 连接
echo "[1/5] 测试 SSH 连接..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER "echo 'SSH连接成功'" 2>/dev/null; then
    echo "❌ SSH 连接失败，请确保："
    echo "   1. 已配置 SSH 密钥认证"
    echo "   2. 或使用: ssh root@121.41.228.247 手动连接一次"
    exit 1
fi

# 2. 上传代码到服务器
echo "[2/5] 打包本地代码..."
cd "$(dirname "$0")/.."
tar --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='web/dist' \
    --exclude='.env' \
    -czf /tmp/profile-page-server.tar.gz server/

echo "[3/5] 上传代码到服务器..."
scp /tmp/profile-page-server.tar.gz $SERVER:/tmp/

# 3. 在服务器上执行部署
echo "[4/5] 在服务器上执行部署..."
ssh $SERVER << 'ENDSSH'
    set -e
    
    PROJECT_DIR="/opt/profile-page"
    
    # 创建目录
    mkdir -p $PROJECT_DIR/server
    mkdir -p $PROJECT_DIR/logs
    
    # 解压代码
    cd $PROJECT_DIR
    tar -xzf /tmp/profile-page-server.tar.gz
    rm /tmp/profile-page-server.tar.gz
    
    # 进入 server 目录
    cd server
    
    # 运行部署脚本
    if [ -f "deploy.sh" ]; then
        chmod +x deploy.sh
        bash deploy.sh
    else
        echo "⚠️ 未找到 deploy.sh，请手动部署"
    fi
    
    echo "✅ 代码已上传到服务器"
ENDSSH

echo "[5/5] 部署完成！"
echo ""
echo "接下来的步骤："
echo "1. SSH 连接到服务器: ssh root@121.41.228.247"
echo "2. 配置环境变量: cd /opt/profile-page/server && cp env.example .env && nano .env"
echo "3. 启动服务: sudo systemctl start profile-page-api"
echo "4. 设置开机自启: sudo systemctl enable profile-page-api"
