#!/bin/bash
# Playwright 浏览器安装脚本
# 用于在 Linux 服务器上安装 Playwright 浏览器和系统依赖

set -e

echo "🎭 开始安装 Playwright 浏览器..."

# 检查是否在 Render 平台
if [ -d "/opt/render" ]; then
    echo "📍 检测到 Render 平台环境"
    export PLAYWRIGHT_BROWSERS_PATH=/opt/render/.cache/ms-playwright
    mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
fi

# 安装系统依赖（Playwright 需要）
echo "📦 安装系统依赖..."
apt-get update || true
apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libatspi2.0-0 \
    libxshmfence1 \
    || echo "⚠️  部分系统依赖安装失败，继续尝试安装浏览器..."

# 安装 Playwright 浏览器
echo "📥 安装 Chromium 浏览器..."
python -m playwright install chromium || {
    echo "❌ playwright install 失败，尝试使用 --with-deps..."
    python -m playwright install --with-deps chromium || {
        echo "❌ 使用 --with-deps 也失败，尝试直接安装..."
        python -m playwright install chromium --force || {
            echo "❌ Playwright 浏览器安装失败"
            exit 1
        }
    }
}

# 验证安装
echo "✅ 验证 Playwright 安装..."
python -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); print(f'✅ Playwright 版本: {p.__version__}'); p.stop()" || {
    echo "⚠️  Playwright Python 包验证失败，但浏览器可能已安装"
}

# 检查浏览器文件是否存在
if [ -n "$PLAYWRIGHT_BROWSERS_PATH" ]; then
    BROWSER_PATH="$PLAYWRIGHT_BROWSERS_PATH/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell"
    if ls $BROWSER_PATH 1> /dev/null 2>&1; then
        echo "✅ 浏览器文件已找到: $(ls $BROWSER_PATH | head -1)"
    else
        echo "⚠️  浏览器文件未在预期路径找到，但可能在其他位置"
    fi
else
    # 默认路径
    DEFAULT_PATH="$HOME/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell"
    if ls $DEFAULT_PATH 1> /dev/null 2>&1; then
        echo "✅ 浏览器文件已找到: $(ls $DEFAULT_PATH | head -1)"
    else
        echo "⚠️  浏览器文件未在默认路径找到"
    fi
fi

echo "✅ Playwright 安装完成"

