#!/bin/bash

# 快速部署脚本
# 自动完成可以自动化的步骤，引导完成需要手动操作的步骤

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Cloudflare Pages + Render 部署    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. 检查并提交代码
echo -e "${YELLOW}[1/5] 检查代码状态...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo "发现未提交的更改，正在提交..."
    git add .
    git commit -m "准备部署: $(date +%Y-%m-%d\ %H:%M:%S)" || true
    git push origin main || echo "推送失败，请手动推送"
else
    echo -e "${GREEN}✅ 代码已是最新${NC}"
fi

# 2. 构建前端
echo ""
echo -e "${YELLOW}[2/5] 构建前端项目...${NC}"
cd web
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi
npm run build
cd ..
echo -e "${GREEN}✅ 前端构建完成${NC}"

# 3. Cloudflare Pages 部署
echo ""
echo -e "${YELLOW}[3/5] Cloudflare Pages 部署...${NC}"
if command -v wrangler &> /dev/null; then
    if wrangler whoami &> /dev/null; then
        echo -e "${GREEN}✅ 已登录 Cloudflare${NC}"
        read -p "是否直接部署到 Cloudflare Pages? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "请输入项目名称 (默认: profile-page): " project_name
            project_name=${project_name:-profile-page}
            wrangler pages deploy web/dist --project-name="$project_name"
            echo -e "${GREEN}✅ 部署完成！${NC}"
        else
            echo "跳过直接部署，请通过 Cloudflare Dashboard 部署"
        fi
    else
        echo "需要登录 Cloudflare..."
        wrangler login
    fi
else
    echo "未安装 wrangler，请通过 Cloudflare Dashboard 部署"
fi

# 4. 显示部署信息
echo ""
echo -e "${YELLOW}[4/5] 部署信息${NC}"
echo ""
echo "GitHub 仓库: $(git remote get-url origin)"
echo "前端构建目录: web/dist"
echo ""

# 5. 下一步指引
echo -e "${YELLOW}[5/5] 下一步操作${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Cloudflare Pages 配置:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. 访问: https://dash.cloudflare.com → Pages"
echo "2. Create a project → Connect to Git"
echo "3. 选择仓库: $(basename -s .git $(git remote get-url origin))"
echo "4. 配置:"
echo "   • Build command: cd web && npm install && npm run build"
echo "   • Output directory: web/dist"
echo "   • Environment variable:"
echo "     - VITE_API_BASE_URL = <Render后端URL>"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Render 后端配置:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. 访问: https://render.com → New + → Web Service"
echo "2. Connect GitHub → 选择仓库"
echo "3. 配置:"
echo "   • Name: profile-page-api"
echo "   • Root Directory: server"
echo "   • Build Command: pip install -r requirements.txt"
echo "   • Start Command: uvicorn app:app --host 0.0.0.0 --port \$PORT"
echo "4. 环境变量:"
echo "   • PYTHON_VERSION=3.11"
echo "   • DASHSCOPE_API_KEY=<你的API密钥>"
echo "   • CORS_ORIGINS=<前端URL> (部署前端后填写)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 询问是否打开浏览器
read -p "是否打开 Cloudflare Dashboard? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://dash.cloudflare.com" 2>/dev/null || echo "请访问: https://dash.cloudflare.com"
fi

read -p "是否打开 Render Dashboard? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://dashboard.render.com" 2>/dev/null || echo "请访问: https://dashboard.render.com"
fi

echo ""
echo -e "${GREEN}✨ 准备完成！请按照上述步骤完成部署。${NC}"
echo "📖 详细文档: DEPLOY_GUIDE.md"

