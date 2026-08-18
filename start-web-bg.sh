#!/usr/bin/env bash
# 后台无终端启动网页端（脱离当前 shell，关闭终端也不停）。
# 用法： ./start-web-bg.sh
set -e
cd "$(dirname "$0")"
mkdir -p logs
PORT="${PORT:-3000}"

# setsid + 重定向，彻底脱离终端
setsid node server/index.js > logs/server.log 2>&1 < /dev/null &

sleep 1
echo "网页端已在后台启动： http://localhost:${PORT}"
echo "日志文件： logs/server.log"
echo "停止服务： pkill -f 'node server/index.js'"
