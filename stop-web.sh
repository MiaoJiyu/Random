#!/usr/bin/env bash
# 停止后台网页端服务
pkill -f 'node server/index.js' && echo "已停止" || echo "没有正在运行的服务"
