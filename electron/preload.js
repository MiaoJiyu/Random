'use strict';

/**
 * 预加载脚本：开启 contextIsolation，仅以最小、受控的方式向渲染进程暴露
 * 与原生相关的能力（应用版本、下载并安装更新），其余仍走浏览器原生能力。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  downloadAndInstall: (url) => ipcRenderer.invoke('download-and-install', url),
});
