#!/bin/bash
# 启动脚本，用于各种部署平台

# 如果 PORT 环境变量未设置，使用默认端口 8001
PORT=${PORT:-8001}

# 启动 FastAPI 应用
uvicorn app:app --host 0.0.0.0 --port $PORT

