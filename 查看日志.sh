#!/bin/bash
# 查看后端服务器日志的脚本 - 持续输出新产生的日志

LOG_FILE="/tmp/server_8001.log"

echo "=========================================="
echo "后端服务器日志实时监控"
echo "=========================================="
echo "日志文件: $LOG_FILE"
echo "按 Ctrl+C 退出"
echo "=========================================="
echo ""

# 如果日志文件存在，使用 tail -f 实时查看
if [ -f "$LOG_FILE" ]; then
    # tail -f 会持续监控文件，输出新追加的内容
    # -n 0 表示从文件末尾开始，不显示历史内容（可选：改为 -n 50 显示最后50行）
    tail -f -n 0 "$LOG_FILE"
else
    echo "❌ 日志文件不存在: $LOG_FILE"
    echo "请确保后端服务器正在运行（运行 npm run dev）"
    exit 1
fi

