#!/bin/bash

# Fly.io 快速部署脚本
# 解决 Render 免费计划冷启动问题的最佳方案

set -e

echo "🚀 Fly.io 部署助手"
echo "=================="
echo ""

# 检查是否已安装 flyctl
if ! command -v flyctl &> /dev/null; then
    echo "❌ 未检测到 flyctl，正在安装..."
    curl -L https://fly.io/install.sh | sh
    
    # 提示用户添加到 PATH
    echo ""
    echo "⚠️  请将 Fly.io 添加到 PATH:"
    echo "   export PATH=\"\$HOME/.fly/bin:\$PATH\""
    echo "   或重启终端"
    echo ""
    read -p "按 Enter 继续（假设已添加到 PATH）..."
fi

# 检查是否已登录
if ! flyctl auth whoami &> /dev/null; then
    echo "🔐 需要登录 Fly.io..."
    flyctl auth login
fi

# 检查应用是否存在
if flyctl apps list 2>/dev/null | grep -q "profile-page-api"; then
    echo "✓ 应用 'profile-page-api' 已存在"
    DEPLOY_MODE="update"
else
    echo "📦 首次部署，将创建新应用..."
    DEPLOY_MODE="create"
fi

echo ""
echo "🔧 配置环境变量"
echo "==============="
echo "请确保已设置以下环境变量："
echo "  - DASHSCOPE_API_KEY"
echo "  - CORS_ORIGINS (可选，格式: https://your-frontend.pages.dev)"
echo ""

# 提示设置环境变量
read -p "是否现在设置 DASHSCOPE_API_KEY? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "请输入 DASHSCOPE_API_KEY: " API_KEY
    flyctl secrets set DASHSCOPE_API_KEY="$API_KEY"
    echo "✓ DASHSCOPE_API_KEY 已设置"
fi

read -p "是否设置 CORS_ORIGINS? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "请输入 CORS_ORIGINS (多个用逗号分隔): " CORS_ORIGINS
    flyctl secrets set CORS_ORIGINS="$CORS_ORIGINS"
    echo "✓ CORS_ORIGINS 已设置"
fi

echo ""
echo "🚀 开始部署..."
echo "=============="

# 如果是首次部署，先 launch
if [ "$DEPLOY_MODE" == "create" ]; then
    echo "正在创建应用..."
    flyctl launch --no-deploy --name profile-page-api --region iad
fi

# 部署
flyctl deploy

echo ""
echo "✅ 部署完成！"
echo "============"
echo ""
echo "📋 下一步："
echo "1. 查看服务状态: flyctl status"
echo "2. 查看日志: flyctl logs"
echo "3. 打开应用: flyctl open"
echo ""
echo "💰 成本提示："
echo "   - 免费额度：160GB/月出站流量 + 3个共享CPU机器"
echo "   - 冷启动：2-5秒（比 Render 免费计划快很多）"
echo "   - 实际成本通常 < \$3/月"
echo ""
echo "🔗 获取应用 URL:"
flyctl status | grep "Hostname" || flyctl info | grep "Hostname"

