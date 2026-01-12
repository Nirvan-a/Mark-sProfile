# 使用官方 Python 运行时作为基础镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（包括 Playwright 所需依赖和中文字体）
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    fonts-noto-cjk \
    fonts-noto-cjk-extra \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 安装 Playwright 浏览器（用于 PDF 生成）
RUN playwright install chromium
RUN playwright install-deps chromium

# 复制应用代码
COPY . .

# 暴露端口（Fly.io 会自动映射）
EXPOSE 8001

# 启动命令（增加超时配置以支持长时间运行的PDF生成请求）
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--timeout-keep-alive", "120"]
