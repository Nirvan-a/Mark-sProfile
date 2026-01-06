#!/bin/bash

# 清理缓存并重新部署脚本
# 用于清理 Cloudflare 和 Render 的构建缓存

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     清理缓存并重新部署脚本            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# 1. 清理本地构建缓存
echo -e "${YELLOW}[1/4] 清理本地构建缓存...${NC}"
cd "$(dirname "$0")"
cd web
rm -rf dist node_modules/.vite .vite
echo -e "${GREEN}✅ 本地缓存已清理${NC}"
echo ""

# 2. 重新构建
echo -e "${YELLOW}[2/4] 重新构建前端...${NC}"
npm run build
echo -e "${GREEN}✅ 前端构建完成${NC}"
echo ""

# 3. 提交并推送代码
echo -e "${YELLOW}[3/4] 提交并推送代码...${NC}"
cd ..
if [ -n "$(git status --porcelain)" ]; then
    git add .
    git commit -m "chore: 清理缓存并重新构建 - $(date +%Y-%m-%d\ %H:%M:%S)" || true
    git push origin main || echo -e "${YELLOW}⚠️  推送失败，请手动推送${NC}"
    echo -e "${GREEN}✅ 代码已推送${NC}"
else
    echo -e "${GREEN}✅ 没有需要提交的更改${NC}"
fi
echo ""

# 4. 部署选项
echo -e "${YELLOW}[4/4] 部署选项${NC}"
echo ""
echo "=========================================="
echo "🌐 Cloudflare Pages 缓存清理"
echo "=========================================="
echo ""
echo "方法 1: 通过 Cloudflare Dashboard"
echo "1. 访问 https://dash.cloudflare.com"
echo "2. 进入 Workers & Pages → 你的项目"
echo "3. 点击 'Settings' → 'Builds & deployments'"
echo "4. 点击 'Clear build cache' 或 'Retry deployment'"
echo "5. 或者触发新的部署："
echo "   - 点击 'Create deployment'"
echo "   - 选择最新的 commit"
echo "   - 点击 'Deploy'"
echo ""
echo "方法 2: 通过 Wrangler CLI"
if command -v wrangler &> /dev/null; then
    read -p "是否使用 wrangler 重新部署到 Cloudflare Pages? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "请输入项目名称 (默认: profile-page): " project_name
        project_name=${project_name:-profile-page}
        echo -e "${YELLOW}正在部署...${NC}"
        wrangler pages deploy web/dist --project-name="$project_name"
        echo -e "${GREEN}✅ Cloudflare Pages 部署完成${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未安装 wrangler，请通过 Dashboard 部署${NC}"
fi
echo ""

echo "=========================================="
echo "⚙️  Render 缓存清理"
echo "=========================================="
echo ""
echo "方法 1: 通过 Render Dashboard"
echo "1. 访问 https://dashboard.render.com"
echo "2. 进入你的服务"
echo "3. 点击 'Manual Deploy' → 'Clear build cache & deploy'"
echo "   或者"
echo "4. 点击 'Settings' → 滚动到底部 → 'Clear build cache'"
echo ""
echo "方法 2: 通过 Render API (需要 API Key)"
echo "使用 Render API 清除缓存并触发重新部署"
echo ""
echo "=========================================="
echo "🔍 验证步骤"
echo "=========================================="
echo ""
echo "1. 等待部署完成（通常 2-5 分钟）"
echo "2. 清除浏览器缓存："
echo "   - Chrome/Edge: Ctrl+Shift+Delete (Windows) 或 Cmd+Shift+Delete (Mac)"
echo "   - 选择 '缓存的图片和文件'"
echo "   - 或者使用无痕模式访问"
echo "3. 强制刷新页面："
echo "   - Windows: Ctrl+Shift+R"
echo "   - Mac: Cmd+Shift+R"
echo "4. 检查 favicon 是否更新"
echo ""
echo -e "${GREEN}✅ 脚本执行完成！${NC}"

