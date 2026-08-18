'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

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
