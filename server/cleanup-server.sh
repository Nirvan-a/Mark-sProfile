#!/bin/bash

# 清理服务器上已存在的项目
# 使用方法: bash cleanup-server.sh

set -e

SERVER="root@121.41.228.247"
PROJECT_DIR="/opt/profile-page"

echo "🧹 清理服务器上的旧项目..."

# 连接到服务器并清理
ssh $SERVER << 'ENDSSH'
    set -e
    
    PROJECT_DIR="/opt/profile-page"
    SERVICE_NAME="profile-page-api"
    
    echo "检查服务状态..."
    
    # 停止并禁用服务
    if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
        echo "停止运行中的服务..."
        systemctl stop $SERVICE_NAME
        systemctl disable $SERVICE_NAME
    fi
    
    # 删除服务文件
    if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
        echo "删除 systemd 服务文件..."
        rm -f /etc/systemd/system/$SERVICE_NAME.service
        systemctl daemon-reload
    fi
    
    # 删除项目目录
    if [ -d "$PROJECT_DIR" ]; then
        echo "删除项目目录: $PROJECT_DIR"
        rm -rf $PROJECT_DIR
    fi
    
    # 删除日志目录（如果存在）
    if [ -d "/opt/profile-page/logs" ]; then
        echo "删除日志目录..."
        rm -rf /opt/profile-page/logs
    fi
    
    echo "✅ 清理完成！"
ENDSSH

echo "✅ 服务器清理完成！现在可以重新部署了。"
