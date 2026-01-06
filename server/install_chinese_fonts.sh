#!/bin/bash
# 安装中文字体脚本
# 用于在 Linux 服务器上安装中文字体支持

set -e

echo "🔤 开始安装中文字体..."

# 创建字体目录
FONT_DIR="$HOME/.local/share/fonts"
mkdir -p "$FONT_DIR"

# 下载思源黑体（Google Fonts，免费开源）
echo "📥 下载思源黑体..."
cd /tmp

# 下载 Noto Sans CJK SC（思源黑体简体中文）
if [ ! -f "NotoSansCJKsc.zip" ]; then
    wget -q "https://github.com/google/fonts/raw/main/ofl/notosanscjksc/NotoSansCJKsc-Regular.otf" -O "$FONT_DIR/NotoSansCJKsc-Regular.otf" || \
    curl -L "https://github.com/google/fonts/raw/main/ofl/notosanscjksc/NotoSansCJKsc-Regular.otf" -o "$FONT_DIR/NotoSansCJKsc-Regular.otf" || \
    echo "⚠️  无法下载字体，将使用系统默认字体"
fi

# 更新字体缓存
if command -v fc-cache &> /dev/null; then
    echo "🔄 更新字体缓存..."
    fc-cache -fv "$FONT_DIR" || true
fi

# 验证字体安装
if [ -f "$FONT_DIR/NotoSansCJKsc-Regular.otf" ]; then
    echo "✅ 中文字体安装成功: $FONT_DIR/NotoSansCJKsc-Regular.otf"
else
    echo "⚠️  字体文件未找到，将使用系统默认字体"
fi

echo "✅ 字体安装完成"

