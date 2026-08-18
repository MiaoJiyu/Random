#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "首次运行，正在安装依赖..."
  npm install
fi

PORT="${PORT:-3000}"
echo "启动网页版服务： http://localhost:${PORT}"
echo "按 Ctrl+C 停止服务。"
npm start
