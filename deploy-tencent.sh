#!/bin/bash
# 腾讯云部署脚本
# 用于将 Docker 镜像推送到腾讯云容器镜像服务

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 腾讯云部署脚本${NC}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 配置变量（请根据实际情况修改）
NAMESPACE="profile-page"
REPO_NAME="backend"
IMAGE_TAG="latest"
REGISTRY="ccr.ccs.tencentyun.com"

# 读取配置
echo -e "${YELLOW}请配置以下信息：${NC}"
read -p "腾讯云命名空间 (默认: $NAMESPACE): " input_namespace
NAMESPACE=${input_namespace:-$NAMESPACE}

read -p "镜像仓库名 (默认: $REPO_NAME): " input_repo
REPO_NAME=${input_repo:-$REPO_NAME}

read -p "镜像标签 (默认: $IMAGE_TAG): " input_tag
IMAGE_TAG=${input_tag:-$IMAGE_TAG}

# 构建完整镜像地址
FULL_IMAGE_NAME="$REGISTRY/$NAMESPACE/$REPO_NAME:$IMAGE_TAG"

echo ""
echo -e "${GREEN}配置信息：${NC}"
echo "  命名空间: $NAMESPACE"
echo "  仓库名: $REPO_NAME"
echo "  标签: $IMAGE_TAG"
echo "  完整镜像地址: $FULL_IMAGE_NAME"
echo ""

# 确认
read -p "确认开始构建和推送？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消${NC}"
    exit 0
fi

# 登录腾讯云容器镜像服务
echo ""
echo -e "${GREEN}步骤 1: 登录腾讯云容器镜像服务${NC}"
echo "请访问 https://console.cloud.tencent.com/tcr 获取登录凭证"
echo "然后在终端执行：docker login $REGISTRY"
read -p "已完成登录？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}请先完成登录再继续${NC}"
    exit 0
fi

# 构建镜像
echo ""
echo -e "${GREEN}步骤 2: 构建 Docker 镜像${NC}"
docker build -t "$FULL_IMAGE_NAME" .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 镜像构建成功${NC}"

# 推送镜像
echo ""
echo -e "${GREEN}步骤 3: 推送镜像到腾讯云${NC}"
docker push "$FULL_IMAGE_NAME"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 镜像推送失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 镜像推送成功！${NC}"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo "1. 访问腾讯云控制台：https://console.cloud.tencent.com/tke2/eci"
echo "2. 创建 Serverless 容器实例"
echo "3. 使用镜像：$FULL_IMAGE_NAME"
echo "4. 配置环境变量（参考 .env.tencent.example）"
echo "5. 开启公网 IP"
echo "6. 创建并启动容器实例"
echo ""
echo -e "${GREEN}详细步骤请参考：TENCENT_CLOUD_DEPLOY.md${NC}"

