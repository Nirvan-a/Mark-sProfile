#!/bin/bash

# Fly.io 快速部署脚本

set -e

echo "🚀 开始部署到 Fly.io..."

# 检查是否已安装 flyctl
if ! command -v flyctl &> /dev/null; then
    echo "❌ 未找到 flyctl，请先安装 Fly.io CLI:"
    echo "   macOS: brew install flyctl"
    echo "   或访问: https://fly.io/docs/getting-started/installing-flyctl/"
    exit 1
fi

# 检查是否已登录
if ! flyctl auth whoami &> /dev/null; then
    echo "🔐 请先登录 Fly.io:"
    flyctl auth login
fi

# 检查是否存在 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件"
    echo "📝 请在部署后设置环境变量："
    echo "   flyctl secrets set DASHSCOPE_API_KEY=your_key"
    echo "   flyctl secrets set TAVILY_API_KEY=your_key"
    echo "   flyctl secrets set CORS_ORIGINS=https://your-frontend.pages.dev"
    echo ""
fi

# 检查是否已初始化应用
if [ ! -f fly.toml ]; then
    echo "📦 首次部署，正在初始化应用..."
    flyctl launch --no-deploy
    echo "✅ 应用已创建，请先设置环境变量，然后运行此脚本再次部署"
    exit 0
fi

# 部署应用
echo "📤 正在部署应用..."
flyctl deploy

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 后续步骤："
echo "   1. 检查应用状态: flyctl status"
echo "   2. 查看日志: flyctl logs"
echo "   3. 测试健康检查: curl \$(flyctl info -s | grep 'Hostname' | awk '{print \$2}')/api/health"
echo ""
echo "🌐 前端配置："
echo "   在 Cloudflare Pages 环境变量中添加："
echo "   VITE_API_BASE_URL=\$(flyctl info -s | grep 'Hostname' | awk '{print \$2}')"
echo ""
