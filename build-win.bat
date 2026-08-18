@echo off
chcp 65001 >nul
cd /d %~dp0

rem 使用国内镜像下载 Electron 及其辅助工具（避免 GitHub 连接超时）
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/"

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
