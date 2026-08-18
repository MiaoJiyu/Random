# 加权随机数生成器（Node.js 全栈版）

基于原 Python/Tkinter 项目的完整重写。提供**网页版**与 **Electron 桌面版**两套界面，共享同一套前端代码；配置与历史记录保存在云端 MySQL，无需登录、开箱即用。

## 功能特性

- 加权随机抽取（等价 `random.choices` 预选），结果动画前已确定。
- 双模式抽取：**大转盘（Canvas）** 与 **数字闪动**，可随时切换。
- 数字/权重灵活编辑：单个 / 区间 / 列表批量增删，多选与统一权重，行内改权重，实时概率与统计。
- 数据导入导出：JSON、CSV、Excel（`.xlsx`），含示例模板下载。
- 历史记录与统计图表（ECharts 柱状图 / 饼图），分页展示，可清空。
- 云端配置管理：多份配置新建 / 激活 / 删除，网页与客户端双向同步，离线降级 + 自动补传。

## 快速开始

```bash
# 安装依赖（首次）
npm install

# 启动网页版（默认 http://localhost:3000）
npm start

# 启动桌面客户端（Electron）
npm run electron

# 打包 Windows 安装程序（需在 Windows 开发机执行）
npm run build:win
```

Windows 用户也可直接双击 `start-web.bat` / `start-desktop.bat` / `build-win.bat`。

## 目录结构

```
server/      Express 后端 + MySQL 连接池 + 配置/历史 API（自动建表）
public/      前端 SPA（HTML/CSS/JS）+ 本地 vendor（echarts、xlsx）
electron/    Electron 主进程与预加载（内嵌后端，打包桌面端）
scripts/     vendor 拷贝与示例模板生成
docs/        用户手册、数据库设计文档、示例模板
```

## 文档

- [用户手册](docs/用户手册.md)
- [数据库设计文档](docs/数据库设计文档.md)

> 云端数据库配置见 `.env`（已内置）。如需修改连接，复制 `.env.example` 为 `.env` 后填写。
