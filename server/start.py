#!/usr/bin/env python3
"""
启动脚本 - 用于 Railway 等平台
在 Python 中处理 PORT 环境变量，避免 bash 解析问题
"""
import os
import sys
import subprocess

# 获取 PORT 环境变量，如果未设置则使用默认值 8001
port = os.environ.get("PORT", "8001")

# 确保 PORT 是数字
try:
    port_int = int(port)
except ValueError:
    print(f"警告: PORT 环境变量不是有效数字: {port}，使用默认值 8001")
    port_int = 8001

# 启动 uvicorn
print(f"🚀 启动 FastAPI 应用，端口: {port_int}")
sys.exit(subprocess.run([
    sys.executable, "-m", "uvicorn",
    "app:app",
    "--host", "0.0.0.0",
    "--port", str(port_int)
]).returncode)

