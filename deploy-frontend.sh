#!/bin/bash
# 快速部署前端到 Cloudflare Pages

set -e

echo "🔨 构建前端..."
cd web
npm run build
cd ..

echo "📤 部署到 Cloudflare Pages..."
read -p "请输入项目名称 (默认: profile-page): " project_name
project_name=${project_name:-profile-page}

wrangler pages deploy web/dist --project-name="$project_name"

echo "✅ 部署完成！"
