# 新版本发布与自动更新配置指南

本文说明如何发布新版本、如何让客户端自动检测并安装更新。

## 一、两个"版本"的概念

| 概念 | 来源 | 说明 |
| --- | --- | --- |
| 客户端当前版本 | Electron：已安装程序的 `package.json` 的 `version`；网页版：`GET /api/version`（也是 `package.json`） | 客户端启动后向服务器"自报"的版本 |
| 服务器公告版本 | 数据库 `settings` 表的 `version` + `downloadUrl` | 管理员配置，表示"最新可用版本" |

启动检测逻辑（`public/js/app.js` 的 `checkForUpdate()`）在应用启动时后台运行，**不阻塞抽选**：

1. 读取 `GET /api/settings` 得到 `{ version, downloadUrl, hasPassword }`；
2. 若 `version` 与 `downloadUrl` 都已设置，且 `最新版本 !== 客户端当前版本`，则触发更新；
3. 区分环境：
   - **Electron 桌面端**：后台下载安装包 → 打开安装 → 1.5 秒后退出当前程序以便覆盖安装；
   - **网页版**：仅触发浏览器下载安装包并提示"新版本已下载，请运行安装"（网页由服务器静态托管，无法自更新）。

## 二、发布一个新版本的标准流程

1. **修改版本号**：编辑 `package.json`，把 `version` 改到新值（如 `2.0.0` → `2.1.0`）。该值决定了新安装包自身的版本号，也是客户端后续自报的"当前版本"。
2. **重新打包安装包**：
   - Windows：运行 `build-win.bat`（或 `npm run build:win`），产物在 `dist/` 下，为 NSIS 安装程序（`.exe`）。
   - 本工程 `package.json` 的 `build` 配置仅包含 `win -> nsis`，其他平台可按需扩展。
3. **托管安装包**：把 `dist/` 中的安装包上传到一个可公开访问的 HTTP/HTTPS 地址，得到下载链接，例如 `https://example.com/releases/random-2.1.0.exe`。
4. **公告新版本**：在数据库/设置中写入新的 `version` 与 `downloadUrl`（见第三节）。
5. 此后，所有已安装的旧版客户端（当前版本低于最新）**下次启动时**就会自动检测并下载安装。

## 三、如何配置 version 与 downloadUrl

目前没有"版本管理"页面，需通过后端 API 或数据库直接配置。两种密码之外的设置项（`password` 用于数据页密码保护）为 `version` 与 `downloadUrl`。

> 首次启动会自动初始化 `settings` 表：`version` = `package.json` 版本、`downloadUrl` = `''`、`password` = `''`。

### 方式 A：调用后端 API（推荐）

`PUT /api/settings`，请求体支持 `version` / `downloadUrl`，只传需要改的字段即可：

```bash
curl -X PUT http://<服务器地址>/api/settings \
  -H 'Content-Type: application/json' \
  -d '{"version":"2.1.0","downloadUrl":"https://example.com/releases/random-2.1.0.exe"}'
```

### 方式 B：直接改数据库

`settings` 表为 KV 结构（`k` 主键，`v` 文本）：

```sql
UPDATE settings SET v='2.1.0'                                   WHERE k='version';
UPDATE settings SET v='https://example.com/releases/random-2.1.0.exe' WHERE k='downloadUrl';
```

### 验证配置是否生效

```bash
# 公告版本与下载地址
curl http://<服务器地址>/api/settings
# => {"code":0,"data":{"version":"2.1.0","downloadUrl":"https://example.com/releases/random-2.1.0.exe","hasPassword":false},"message":"ok"}

# 客户端当前版本（= 服务器 package.json）
curl http://<服务器地址>/api/version
# => {"code":0,"data":{"version":"2.0.0"},"message":"ok"}
```

当 `/api/settings` 的 `version` 与 `/api/version` 不一致、且 `downloadUrl` 非空时，客户端即会触发更新。

## 四、自动更新触发逻辑（排查参考）

- 触发条件：**`version` 与 `downloadUrl` 都已设置** 且 **与客户端当前版本不一致**。
- 客户端当前版本：Electron 为已安装程序的 `package.json` `version`；网页版为服务器 `package.json` `version`。
- 触发后行为：
  - Electron：下载到临时目录 → `shell.openPath` 打开安装包 → 约 1.5 秒后 `app.quit()` 退出以便覆盖安装。
  - 网页版：浏览器下载安装包，提示"新版本已下载，请运行安装"（建议用户改用桌面版以获得自动安装体验）。

## 五、注意事项 / 常见坑

- **版本是字符串精确比较**（不是语义化版本号比较），请确保两侧写法完全一致（如都用 `2.1.0`，避免一侧 `v2.1.0`）。
- **必须同时更新 `version` 和 `downloadUrl`**，二者缺一不可，否则不触发。
- 只改 `settings.version` 而不重新打包发布，已安装客户端不会"变新"——它比对的是自身 `package.json`。
- 安装包地址需在客户端网络可达（内网环境要保证客户端能联通该地址），否则 Electron 端下载会失败，但**不影响抽选功能**，错误仅以 toast 提示。
- 建议使用带版本号的固定文件名（如 `random-2.1.0.exe`）并稳定托管，避免缓存导致下载到旧包。
- 网页版自动更新仅作"提示下载安装桌面端"用途，因网页由服务器静态托管、不具备自更新能力。
