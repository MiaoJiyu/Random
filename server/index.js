'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const express = require('express');
const logger = require('./logger');
const { ensureSchema, healthCheck } = require('./db');
const configsRouter = require('./routes/configs');
const historyModule = require('./routes/history');
const historyRouter = historyModule.router;

const app = express();

// 中间件：请求体限制 10mb，便于上传 Excel/CSV 配置（本项目前端本地解析，保留余量）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态托管前端 SPA（网页版与 Electron 共享同一份代码）
app.use(express.static(path.join(__dirname, '..', 'public')));

// API 路由
app.use('/api/config', configsRouter);
app.use('/api/history', historyRouter);
app.get('/api/stats', historyModule.statsHandler);

/**
 * GET /api/health  健康检查（含数据库连通状态，供前端降级提示）
 */
app.get('/api/health', async (req, res) => {
  const db = await healthCheck();
  res.json({
    code: 0,
    data: { status: db ? 'ok' : 'db_offline', db, time: new Date().toISOString() },
    message: 'ok',
  });
});

/**
 * GET /api/template.csv  示例模板下载（第一列数字、第二列权重）
 */
app.get('/api/template.csv', (req, res) => {
  const csv = '数字,权重\n1,10\n2,20\n3,30\n4,15\n5,25\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="template.csv"');
  res.send('﻿' + csv);
});

/**
 * 兜底错误处理
 */
app.use((err, req, res, next) => {
  logger.error('未捕获的错误：', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ code: 1, data: null, message: '服务器内部错误：' + err.message });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

/**
 * 启动服务。导出 listen 以便 Electron 主进程复用。失败时只影响云端功能，本地功能仍可用。
 */
async function start() {
  try {
    await ensureSchema();
    logger.info('数据库初始化完成');
  } catch (err) {
    logger.warn('数据库初始化失败，将以“云端离线”模式继续（本地功能可用）：%s', err.message);
  }

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      logger.info('服务已启动：http://localhost:%d', PORT);
      resolve(server);
    });
    server.on('error', (err) => {
      logger.error('服务监听失败：', err);
    });
  });
}

// 仅当作为主入口（node server/index.js）直接运行时才自动监听。
// Electron 主进程会 require 本模块的 app 并自行监听空闲端口。
if (require.main === module) {
  start();
}

module.exports = { app, start };
