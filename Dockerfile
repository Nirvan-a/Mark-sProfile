# Dockerfile for containerized deployment
# 适用于 Fly.io, Railway, Render 等支持 Docker 的平台

FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY server/requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY server/ .

# 暴露端口（平台会自动设置 PORT 环境变量）
EXPOSE 8001

# 启动命令（使用环境变量 PORT，如果没有则使用 8001）
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8001}

