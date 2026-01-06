#!/bin/bash
# 安装中文字体脚本
# 用于在 Linux 服务器上安装中文字体支持

set -e

echo "🔤 开始安装中文字体..."

# 创建多个字体目录（确保能被系统识别）
USER_FONT_DIR="$HOME/.local/share/fonts"
SYSTEM_FONT_DIR="/usr/share/fonts/truetype/noto"
mkdir -p "$USER_FONT_DIR"
mkdir -p "$SYSTEM_FONT_DIR" 2>/dev/null || true

# 下载思源黑体（Google Fonts，免费开源）
echo "📥 下载思源黑体..."
cd /tmp

# 下载 Noto Sans CJK SC（思源黑体简体中文）
FONT_URL="https://github.com/google/fonts/raw/main/ofl/notosanscjksc/NotoSansCJKsc-Regular.otf"
FONT_FILE="NotoSansCJKsc-Regular.otf"

# 尝试下载到用户字体目录
if [ ! -f "$USER_FONT_DIR/$FONT_FILE" ]; then
    echo "📥 下载字体到用户目录..."
    wget -q "$FONT_URL" -O "$USER_FONT_DIR/$FONT_FILE" 2>/dev/null || \
    curl -L "$FONT_URL" -o "$USER_FONT_DIR/$FONT_FILE" 2>/dev/null || \
    echo "⚠️  无法下载字体到用户目录"
fi

# 如果可能，也复制到系统字体目录（需要权限）
if [ -w "$SYSTEM_FONT_DIR" ] && [ -f "$USER_FONT_DIR/$FONT_FILE" ]; then
    echo "📥 复制字体到系统目录..."
    cp "$USER_FONT_DIR/$FONT_FILE" "$SYSTEM_FONT_DIR/$FONT_FILE" 2>/dev/null || true
fi

# 更新字体缓存（多个路径）
if command -v fc-cache &> /dev/null; then
    echo "🔄 更新字体缓存..."
    fc-cache -fv "$USER_FONT_DIR" 2>/dev/null || true
    if [ -d "$SYSTEM_FONT_DIR" ]; then
        fc-cache -fv "$SYSTEM_FONT_DIR" 2>/dev/null || true
    fi
    # 更新整个系统字体缓存
    fc-cache -fv 2>/dev/null || true
fi

# 验证字体安装
if [ -f "$USER_FONT_DIR/$FONT_FILE" ]; then
    echo "✅ 中文字体安装成功: $USER_FONT_DIR/$FONT_FILE"
    # 显示字体文件信息
    if command -v file &> /dev/null; then
        file "$USER_FONT_DIR/$FONT_FILE" || true
    fi
else
    echo "⚠️  字体文件未找到，将使用系统默认字体"
fi

# 列出可用的中文字体（用于调试）
if command -v fc-list &> /dev/null; then
    echo "📋 系统中可用的中文字体:"
    fc-list :lang=zh 2>/dev/null | head -5 || echo "   (无法列出字体)"
fi

echo "✅ 字体安装完成"

