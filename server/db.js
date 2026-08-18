'use strict';

const mysql = require('mysql2/promise');
const logger = require('./logger');

let pool = null;

/**
 * 根据环境变量创建连接池（单例）。
 */
function getPool() {
  if (pool) return pool;

  if (!process.env.DB_HOST || !process.env.DB_USER) {
    throw new Error('数据库环境变量缺失（DB_HOST / DB_USER）。请检查 .env 文件。');
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'random',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4',
    connectTimeout: 10000,
  });

  logger.info('已创建 MySQL 连接池（host=%s, db=%s）', process.env.DB_HOST, process.env.DB_NAME);
  return pool;
}

/**
 * 幂等建表：configs（配置）与 history（历史记录）。
 * 首次启动且数据库可连通时调用。
 */
async function ensureSchema() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS configs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL DEFAULT '默认配置',
      data JSON NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS history (
      id INT PRIMARY KEY AUTO_INCREMENT,
      number INT NOT NULL,
      weight INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created_at (created_at),
      INDEX idx_number (number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  logger.info('数据库表结构已就绪（configs / history）');
  await ensureDefaultConfig();
}

/**
 * 当没有任何激活配置时，写入一份带示例数据的默认激活配置。
 */
async function ensureDefaultConfig() {
  const p = getPool();
  const [rows] = await p.query('SELECT COUNT(*) AS cnt FROM configs WHERE is_active = 1');
  if (rows[0].cnt > 0) return;

  const [any] = await p.query('SELECT COUNT(*) AS cnt FROM configs');
  if (any[0].cnt > 0) {
    // 存在配置但未激活，激活第一条
    await p.query('UPDATE configs SET is_active = 1 ORDER BY id ASC LIMIT 1');
    logger.info('已将已有配置标记为激活');
    return;
  }

  const sample = {
    mode: 'wheel',
    items: [
      { number: 1, weight: 10 },
      { number: 2, weight: 20 },
      { number: 3, weight: 30 },
      { number: 4, weight: 15 },
      { number: 5, weight: 25 },
      { number: 6, weight: 5 },
      { number: 7, weight: 40 },
      { number: 8, weight: 10 },
      { number: 9, weight: 20 },
      { number: 10, weight: 15 },
    ],
  };
  await p.query('INSERT INTO configs (name, data, is_active) VALUES (?, ?, 1)', [
    '默认配置',
    JSON.stringify(sample),
  ]);
  logger.info('已写入默认示例配置并激活');
}

/**
 * 数据库连接健康检查（捕获异常，不让请求崩溃）。
 */
async function healthCheck() {
  try {
    const p = getPool();
    await p.query('SELECT 1');
    return true;
  } catch (err) {
    logger.warn('数据库健康检查失败：%s', err.message);
    return false;
  }
}

module.exports = {
  getPool,
  ensureSchema,
  healthCheck,
};
