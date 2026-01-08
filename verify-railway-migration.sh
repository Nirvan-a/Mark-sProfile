#!/bin/bash

# Railway 迁移验证脚本
# 用于验证迁移是否成功

set -e

echo "🔍 Railway 迁移验证工具"
echo "========================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取 Railway URL
if [ -z "$1" ]; then
    echo -e "${YELLOW}请输入 Railway 后端地址:${NC}"
    echo "示例: https://your-app.up.railway.app"
    read -p "Railway URL: " RAILWAY_URL
else
    RAILWAY_URL="$1"
fi

# 验证 URL 格式
if [[ ! $RAILWAY_URL =~ ^https?:// ]]; then
    echo -e "${RED}❌ URL 格式不正确，应以 http:// 或 https:// 开头${NC}"
    exit 1
fi

echo ""
echo "🔗 测试连接: $RAILWAY_URL"
echo ""

# 测试根路径
echo "1️⃣  测试根路径 (/):"
ROOT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$RAILWAY_URL/" || echo "HTTP_STATUS:000")
HTTP_STATUS=$(echo "$ROOT_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$ROOT_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ 根路径响应正常 (HTTP $HTTP_STATUS)${NC}"
    echo "   响应: $BODY"
else
    echo -e "${RED}❌ 根路径响应异常 (HTTP $HTTP_STATUS)${NC}"
    echo "   响应: $BODY"
fi

echo ""

# 测试健康检查
echo "2️⃣  测试健康检查 (/api/health):"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$RAILWAY_URL/api/health" || echo "HTTP_STATUS:000")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ 健康检查通过 (HTTP $HEALTH_STATUS)${NC}"
    echo "   响应: $HEALTH_BODY"
else
    echo -e "${RED}❌ 健康检查失败 (HTTP $HEALTH_STATUS)${NC}"
    echo "   响应: $HEALTH_BODY"
fi

echo ""

# 测试 CORS 配置（通过 OPTIONS 请求）
echo "3️⃣  测试 CORS 配置:"
CORS_RESPONSE=$(curl -s -X OPTIONS -H "Origin: https://example.com" -H "Access-Control-Request-Method: POST" \
    -w "\nHTTP_STATUS:%{http_code}" "$RAILWAY_URL/api/health" || echo "HTTP_STATUS:000")
CORS_STATUS=$(echo "$CORS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$CORS_STATUS" = "200" ] || [ "$CORS_STATUS" = "204" ]; then
    echo -e "${GREEN}✅ CORS 配置正常${NC}"
else
    echo -e "${YELLOW}⚠️  CORS 预检请求状态: HTTP $CORS_STATUS${NC}"
    echo "   (这不一定表示有问题，实际 CORS 配置在响应头中)"
fi

echo ""

# 总结
echo "📊 验证总结"
echo "==========="

if [ "$HTTP_STATUS" = "200" ] && [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Railway 后端服务运行正常！${NC}"
    echo ""
    echo "📋 下一步："
    echo "   1. 在 Cloudflare Pages 中设置环境变量："
    echo "      VITE_API_BASE_URL=$RAILWAY_URL"
    echo "   2. 触发 Cloudflare Pages 重新部署"
    echo "   3. 访问前端，测试功能是否正常"
    echo ""
    echo "💡 提示: 迁移完成后，建议保持 Render 运行 1-2 天以确认稳定"
    exit 0
else
    echo -e "${RED}❌ Railway 后端服务存在问题${NC}"
    echo ""
    echo "🔧 排查建议："
    echo "   1. 检查 Railway Dashboard 中的部署日志"
    echo "   2. 确认环境变量已正确设置"
    echo "   3. 确认服务状态为 'Running'"
    echo "   4. 查看 Railway 日志: railway logs"
    exit 1
fi

