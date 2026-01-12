#!/bin/bash

# 在服务器上执行的检查和清理脚本
# 复制这些命令到服务器执行

echo "📋 检查当前目录结构..."

echo ""
echo "=== 1. 检查根目录下的项目 ==="
ls -la ~/ | grep -E "(Profile|profile|Mark)"

echo ""
echo "=== 2. 检查 /opt 目录 ==="
ls -la /opt/ 2>/dev/null || echo "/opt 目录不存在"

echo ""
echo "=== 3. 检查服务状态 ==="
systemctl status profile-page-api 2>/dev/null || echo "服务不存在"

echo ""
echo "=== 4. 查找可能的项目目录 ==="
find /opt /root /home -maxdepth 2 -type d -iname "*profile*" 2>/dev/null | head -10

echo ""
echo "✅ 检查完成！"
