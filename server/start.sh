#!/bin/bash
# 启动脚本，用于各种部署平台

# 如果 PORT 环境变量未设置，使用默认端口 8001
PORT="${PORT:-8001}"

# 确保 PORT 是数字
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo "错误: PORT 环境变量必须是数字，当前值: $PORT"
    PORT=8001
fi

# 启动 FastAPI 应用
exec uvicorn app:app --host 0.0.0.0 --port "$PORT"

