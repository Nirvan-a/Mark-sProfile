#!/bin/bash

# 部署脚本 - Cloudflare Pages + Render
# 使用方法: ./deploy.sh

set -e

echo "🚀 开始部署流程..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "package.json" ] || [ ! -d "web" ] || [ ! -d "server" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查 Git 状态
echo -e "${YELLOW}📦 检查 Git 状态...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  检测到未提交的更改${NC}"
    read -p "是否提交并推送更改? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "请输入提交信息: " commit_msg
        git commit -m "${commit_msg:-更新代码}"
        git push origin main
        echo -e "${GREEN}✅ 代码已推送到 GitHub${NC}"
    fi
else
    echo -e "${GREEN}✅ Git 工作区干净${NC}"
fi

echo ""
echo "=========================================="
echo "🌐 Cloudflare Pages 部署"
echo "=========================================="
echo ""

# 检查 wrangler
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ 未找到 wrangler CLI${NC}"
    echo "请安装: npm install -g wrangler"
    exit 1
fi

# 检查是否登录
echo -e "${YELLOW}🔐 检查 Cloudflare 登录状态...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  未登录 Cloudflare，正在登录...${NC}"
    wrangler login
else
    echo -e "${GREEN}✅ 已登录 Cloudflare${NC}"
    wrangler whoami
fi

# 构建前端
echo ""
echo -e "${YELLOW}🔨 构建前端项目...${NC}"
cd web
npm install
npm run build
cd ..

# 检查构建输出
if [ ! -d "web/dist" ]; then
    echo -e "${RED}❌ 构建失败: 未找到 web/dist 目录${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 前端构建完成${NC}"

# 部署到 Cloudflare Pages
echo ""
echo -e "${YELLOW}📤 部署到 Cloudflare Pages...${NC}"
echo ""
echo "请选择部署方式:"
echo "1) 使用 wrangler pages deploy (快速部署)"
echo "2) 通过 GitHub 自动部署 (推荐，需要先在 Cloudflare Dashboard 配置)"
read -p "请选择 (1/2): " deploy_choice

if [ "$deploy_choice" = "1" ]; then
    # 直接部署
    read -p "请输入 Cloudflare Pages 项目名称 (默认: profile-page): " project_name
    project_name=${project_name:-profile-page}
    
    echo -e "${YELLOW}正在部署到 Cloudflare Pages...${NC}"
    wrangler pages deploy web/dist --project-name="$project_name"
    
    echo ""
    echo -e "${GREEN}✅ 前端部署完成！${NC}"
    echo ""
    echo "⚠️  注意: 如果这是首次部署，请确保在 Cloudflare Dashboard 中:"
    echo "   1. 设置环境变量 VITE_API_BASE_URL"
    echo "   2. 配置构建设置 (Build command: cd web && npm install && npm run build)"
    echo "   3. 配置输出目录 (Output directory: web/dist)"
else
    echo ""
    echo -e "${YELLOW}📝 通过 GitHub 自动部署步骤:${NC}"
    echo ""
    echo "1. 访问 https://dash.cloudflare.com"
    echo "2. 进入 Pages → Create a project"
    echo "3. 连接 GitHub 仓库: $(git remote get-url origin)"
    echo "4. 配置:"
    echo "   - Build command: cd web && npm install && npm run build"
    echo "   - Output directory: web/dist"
    echo "   - Environment variable: VITE_API_BASE_URL = <你的Render后端URL>"
    echo "5. 点击 Deploy"
    echo ""
fi

echo ""
echo "=========================================="
echo "⚙️  Render 后端部署"
echo "=========================================="
echo ""
echo -e "${YELLOW}📝 Render 需要通过 Web UI 部署:${NC}"
echo ""
echo "1. 访问 https://render.com"
echo "2. 点击 'New +' → 'Web Service'"
echo "3. 连接 GitHub 仓库: $(git remote get-url origin)"
echo "4. 配置:"
echo "   - Name: profile-page-api"
echo "   - Root Directory: server"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: uvicorn app:app --host 0.0.0.0 --port \$PORT"
echo "5. 添加环境变量:"
echo "   - PYTHON_VERSION=3.11"
echo "   - DASHSCOPE_API_KEY=<你的API密钥>"
echo "   - CORS_ORIGINS=<前端URL> (部署前端后填写)"
echo "6. 点击 'Create Web Service'"
echo ""

# 询问是否打开浏览器
read -p "是否打开 Render Dashboard? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://dashboard.render.com" 2>/dev/null || echo "请手动访问: https://dashboard.render.com"
fi

echo ""
echo "=========================================="
echo "✅ 部署准备完成！"
echo "=========================================="
echo ""
echo "📋 下一步:"
echo "1. 完成 Render 后端部署，获取后端 URL"
echo "2. 在 Cloudflare Pages 设置环境变量 VITE_API_BASE_URL"
echo "3. 在 Render 设置环境变量 CORS_ORIGINS (前端 URL)"
echo ""
echo "📖 详细说明请查看: DEPLOY_GUIDE.md"

