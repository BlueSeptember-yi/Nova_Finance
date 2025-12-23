#!/bin/bash
# 创建超级管理员脚本
# 使用方法: ./create_admin.sh [username] [password]

set -e

CONTAINER_NAME="financial-manager-backend"

# 检查容器是否运行
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "错误: 容器 ${CONTAINER_NAME} 未运行"
    echo "请先运行: docker-compose up -d"
    exit 1
fi

# 获取参数
USERNAME=${1:-""}
PASSWORD=${2:-""}

# 构建命令
if [ -z "$USERNAME" ] && [ -z "$PASSWORD" ]; then
    # 使用默认配置（自动生成密码）
    CMD="python -m scripts.create_super_admin"
elif [ -n "$USERNAME" ] && [ -z "$PASSWORD" ]; then
    # 指定用户名，密码自动生成
    CMD="python -m scripts.create_super_admin ${USERNAME}"
elif [ -n "$USERNAME" ] && [ -n "$PASSWORD" ]; then
    # 指定用户名和密码
    CMD="python -m scripts.create_super_admin ${USERNAME} ${PASSWORD}"
else
    echo "使用方法: $0 [username] [password]"
    echo "示例:"
    echo "  $0                    # 使用默认用户名，自动生成密码"
    echo "  $0 myadmin            # 指定用户名，自动生成密码"
    echo "  $0 myadmin MyPass123  # 指定用户名和密码"
    exit 1
fi

# 执行命令
echo "正在创建超级管理员..."
docker exec -it ${CONTAINER_NAME} ${CMD}
