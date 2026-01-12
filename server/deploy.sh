#!/bin/bash

# 阿里云服务器部署脚本
# 使用方法: bash deploy.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署后端服务..."

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置变量（可根据实际情况修改）
PROJECT_DIR="/opt/profile-page"
SERVICE_NAME="profile-page-api"
USER_NAME="www-data"  # 或你的用户名
PYTHON_VERSION="3.11"

echo -e "${YELLOW}配置信息:${NC}"
echo "  项目目录: $PROJECT_DIR"
echo "  服务名称: $SERVICE_NAME"
echo "  运行用户: $USER_NAME"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 sudo 运行此脚本${NC}"
    exit 1
fi

# 1. 创建项目目录
echo -e "${GREEN}[1/6] 创建项目目录...${NC}"
mkdir -p $PROJECT_DIR/server
mkdir -p $PROJECT_DIR/logs

# 2. 检查 Python 版本
echo -e "${GREEN}[2/6] 检查 Python 环境...${NC}"
if ! command -v python$PYTHON_VERSION &> /dev/null; then
    echo -e "${YELLOW}Python $PYTHON_VERSION 未安装，尝试安装...${NC}"
    apt-get update
    apt-get install -y software-properties-common
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update
    apt-get install -y python$PYTHON_VERSION python$PYTHON_VERSION-venv python$PYTHON_VERSION-dev
    apt-get install -y gcc g++ make
fi

# 3. 创建虚拟环境
echo -e "${GREEN}[3/6] 创建 Python 虚拟环境...${NC}"
if [ ! -d "$PROJECT_DIR/venv" ]; then
    python$PYTHON_VERSION -m venv $PROJECT_DIR/venv
    echo -e "${GREEN}虚拟环境创建成功${NC}"
else
    echo -e "${YELLOW}虚拟环境已存在，跳过创建${NC}"
fi

# 4. 激活虚拟环境并安装依赖
echo -e "${GREEN}[4/6] 安装依赖...${NC}"
source $PROJECT_DIR/venv/bin/activate
cd $PROJECT_DIR/server

# 如果有 requirements.txt，安装依赖
if [ -f "requirements.txt" ]; then
    pip install --upgrade pip
    # 安装 playwright 浏览器（如果需要）
    pip install -r requirements.txt
    if grep -q "playwright" requirements.txt; then
        echo -e "${YELLOW}正在安装 playwright 浏览器（可能需要一些时间）...${NC}"
        playwright install chromium || echo -e "${YELLOW}Playwright 浏览器安装失败，如不需要 PDF 生成功能可忽略${NC}"
    fi
    echo -e "${GREEN}依赖安装完成${NC}"
else
    echo -e "${YELLOW}未找到 requirements.txt，请手动安装依赖${NC}"
fi

# 5. 设置文件权限
echo -e "${GREEN}[5/6] 设置文件权限...${NC}"
chown -R $USER_NAME:$USER_NAME $PROJECT_DIR
chmod +x $PROJECT_DIR/server/deploy.sh

# 6. 创建 systemd 服务文件
echo -e "${GREEN}[6/6] 配置 systemd 服务...${NC}"
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Profile Page API Service
After=network.target

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$PROJECT_DIR/server
Environment="PATH=$PROJECT_DIR/venv/bin"
EnvironmentFile=$PROJECT_DIR/server/.env
ExecStart=$PROJECT_DIR/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/api.log
StandardError=append:$PROJECT_DIR/logs/api-error.log

[Install]
WantedBy=multi-user.target
EOF

# 重新加载 systemd
systemctl daemon-reload

echo -e "${GREEN}✅ 部署脚本执行完成！${NC}"
echo ""
echo -e "${YELLOW}接下来的步骤:${NC}"
echo "1. 将项目代码复制到 $PROJECT_DIR/server"
echo "2. 创建 .env 文件: cp $PROJECT_DIR/server/env.example $PROJECT_DIR/server/.env"
echo "3. 编辑 .env 文件，配置环境变量（DASHSCOPE_API_KEY, TAVILY_API_KEY, CORS_ORIGINS 等）"
echo "4. 启动服务: sudo systemctl start $SERVICE_NAME"
echo "5. 设置开机自启: sudo systemctl enable $SERVICE_NAME"
echo "6. 查看日志: sudo journalctl -u $SERVICE_NAME -f"
echo "7. 测试 API: curl http://localhost:8001/api/health"
