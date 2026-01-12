#!/bin/bash

# 生成 SSH 密钥并复制到服务器
# 使用方法: bash setup-ssh-key.sh

echo "🔑 设置 SSH 密钥认证..."

# 检查是否已有 SSH 密钥
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "生成新的 SSH 密钥..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
fi

echo "将公钥复制到服务器..."
echo "请输入服务器密码（将被复制到 ~/.ssh/authorized_keys）"
ssh-copy-id root@121.41.228.247

echo "✅ SSH 密钥设置完成！现在可以使用密钥登录了。"
echo "测试连接: ssh root@121.41.228.247"
