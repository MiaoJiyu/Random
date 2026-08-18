@echo off
chcp 65001 >nul
cd /d %~dp0

IF NOT EXIST node_modules (
  echo 首次运行，正在安装依赖（可能需要几分钟）...
  call npm install
)

echo.
echo 正在启动桌面客户端（Electron）...
echo.

call npm run electron
pause
