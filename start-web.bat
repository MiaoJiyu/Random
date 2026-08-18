@echo off
chcp 65001 >nul
cd /d %~dp0

IF NOT EXIST node_modules (
  echo 首次运行，正在安装依赖（可能需要几分钟）...
  call npm install
)

echo.
echo 正在启动网页版服务...
echo 浏览器访问： http://localhost:3000
echo 按 Ctrl+C 停止服务。
echo.

call npm start
pause
