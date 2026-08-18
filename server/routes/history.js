'use strict';

const express = require('express');
const { getPool } = require('../db');
const logger = require('../logger');

const router = express.Router();

function ok(res, data, message = 'ok') {
  res.json({ code: 0, data, message });
}
function fail(res, message, code = 1, status = 200) {
  res.status(status).json({ code, data: null, message });
}

/**
 * POST /api/history  写入一条抽取历史
 * body: { number, weight }
 */
router.post('/', async (req, res) => {
  try {
    const p = getPool();
    const number = Number(req.body && req.body.number);
    const weight = Number(req.body && req.body.weight);
    if (!Number.isFinite(number) || !Number.isInteger(number)) {
      return fail(res, '无效的抽取结果数字');
    }
    const w = Number.isFinite(weight) && weight > 0 ? Math.floor(weight) : 1;
    const [ins] = await p.query('INSERT INTO history (number, weight) VALUES (?, ?)', [number, w]);
    return ok(res, { id: ins.insertId, number, weight }, '已记录');
  } catch (err) {
    logger.error('写入历史失败：', err);
    return fail(res, '写入历史失败：' + err.message, 1, 500);
  }
});

/**
 * GET /api/history  分页查询（按时间倒序）
 * query: page (默认1), pageSize (默认100, 最大500)
 */
router.get('/', async (req, res) => {
  try {
    const p = getPool();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(500, Math.max(1, parseInt(req.query.pageSize || '100', 10)));
    const offset = (page - 1) * pageSize;

    const [rows] = await p.query(
      'SELECT id, number, weight, created_at FROM history ORDER BY id DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    const [totalRows] = await p.query('SELECT COUNT(*) AS total FROM history');

    return ok(res, {
      list: rows,
      page,
      pageSize,
      total: totalRows[0].total,
    });
  } catch (err) {
    logger.error('查询历史失败：', err);
    return fail(res, '查询历史失败：' + err.message, 1, 500);
  }
});

/**
 * DELETE /api/history  清空全部历史
 */
router.delete('/', async (req, res) => {
  try {
    const p = getPool();
    await p.query('DELETE FROM history');
    logger.info('已清空历史记录');
    return ok(res, null, '已清空历史记录');
  } catch (err) {
    logger.error('清空历史失败：', err);
    return fail(res, '清空历史失败：' + err.message, 1, 500);
  }
});

/**
 * 统计聚合处理函数（同时挂载于 /api/stats 与 /api/history/stats）。
 * 返回：每个 number 的抽取次数 cnt 与平均权重 avg_weight，以及总数 total
 */
async function statsHandler(req, res) {
  try {
    const p = getPool();
    const [rows] = await p.query(
      'SELECT number, COUNT(*) AS cnt, AVG(weight) AS avg_weight FROM history GROUP BY number ORDER BY cnt DESC, number ASC'
    );
    const [totalRows] = await p.query('SELECT COUNT(*) AS total FROM history');
    const distribution = rows.map((r) => ({
      number: r.number,
      count: r.cnt,
      avgWeight: Math.round(r.avg_weight),
    }));
    return ok(res, { total: totalRows[0].total, distribution });
  } catch (err) {
    logger.error('统计失败：', err);
    return fail(res, '统计失败：' + err.message, 1, 500);
  }
}

// 同时保留 /api/history/stats 兼容路径
router.get('/stats', statsHandler);

module.exports = { router, statsHandler };
