'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

/** 获取一个空闲端口，避免与已占用端口冲突。 */
function getFreePort() {
  return new Promise((resolve) => {
    const srv = http.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

let mainWindow = null;
let server = null;

async function createWindow() {
  const port = await getFreePort();
  process.env.PORT = String(port);

  // 复用同一份 Express 应用（require.main 不是 index.js，故不会自动监听）
  const { start } = require('../server/index.js');
  server = await start();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0F1023',
    title: '加权随机数生成器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  await mainWindow.loadURL(`http://localhost:${port}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        return downloadFile(next, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    });
    req.on('error', reject);
  });
}

ipcMain.handle('get-app-version', () => app.getVersion());

// 下载更新安装包并启动安装（随后退出当前实例以便覆盖）
ipcMain.handle('download-and-install', async (event, url) => {
  const u = new URL(url);
  const ext = path.extname(u.pathname) || '.exe';
  const dest = path.join(app.getPath('temp'), 'random-update' + ext);
  await downloadFile(url, dest);
  shell.openPath(dest);
  setTimeout(() => { try { app.quit(); } catch { /* noop */ } }, 1500);
  return { ok: true, path: dest };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) {
    try { server.close(); } catch { /* noop */ }
    server = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
