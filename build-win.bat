@echo off
chcp 65001 >nul
cd /d %~dp0

IF NOT EXIST node_modules (
  echo 首次运行，正在安装依赖（可能需要几分钟）...
  call npm install
)

echo.
echo 开始打包 Windows 安装程序（electron-builder NSIS）...
echo 打包完成后，安装程序位于 dist\ 目录。
echo.

call npm run build:win
pause
