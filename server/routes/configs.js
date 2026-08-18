'use strict';

const express = require('express');
const { getPool } = require('../db');
const logger = require('../logger');

const router = express.Router();

/**
 * 统一响应格式
 */
function ok(res, data, message = 'ok') {
  res.json({ code: 0, data, message });
}
function fail(res, message, code = 1, status = 200) {
  res.status(status).json({ code, data: null, message });
}

/**
 * 校验并归一化配置 data：{ mode: 'wheel'|'number', items: [{number, weight}] }
 */
function sanitizeConfigData(raw) {
  const data = { mode: 'wheel', items: [] };
  if (raw && typeof raw === 'object') {
    data.mode = raw.mode === 'number' ? 'number' : 'wheel';
    if (Array.isArray(raw.items)) {
      for (const it of raw.items) {
        const number = Number(it && it.number);
        const weight = Number(it && it.weight);
        if (!Number.isFinite(number) || !Number.isInteger(number)) continue;
        data.items.push({
          number,
          weight: Number.isFinite(weight) && weight > 0 ? Math.floor(weight) : 1,
        });
      }
    }
  }
  return data;
}

/**
 * GET /api/config/active  读取当前激活配置
 */
router.get('/active', async (req, res) => {
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT id, name, data, is_active FROM configs WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) {
      const [any] = await p.query('SELECT id, name, data FROM configs ORDER BY id ASC LIMIT 1');
      if (any.length === 0) return ok(res, null);
      return ok(res, { id: any[0].id, name: any[0].name, data: sanitizeConfigData(any[0].data), active: false });
    }
    const row = rows[0];
    return ok(res, { id: row.id, name: row.name, data: sanitizeConfigData(row.data), active: true });
  } catch (err) {
    logger.error('读取激活配置失败：', err);
    return fail(res, '读取配置失败：' + err.message, 1, 500);
  }
});

/**
 * PUT /api/config/active  保存当前激活配置（就地更新其 data）
 * body: { name?, data }
 */
router.put('/active', async (req, res) => {
  try {
    const p = getPool();
    const name = (req.body && req.body.name) || undefined;
    const data = sanitizeConfigData(req.body && req.body.data);

    const [rows] = await p.query('SELECT id FROM configs WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) {
      // 没有激活配置则新建并激活
      await p.query('INSERT INTO configs (name, data, is_active) VALUES (?, ?, 1)', [
        name || '默认配置',
        JSON.stringify(data),
      ]);
      const [ins] = await p.query('SELECT LAST_INSERT_ID() AS id');
      logger.info('新建并激活配置（name=%s）', name || '默认配置');
      return ok(res, { id: ins[0].id, name: name || '默认配置', data, active: true }, '配置已保存');
    }

    const id = rows[0].id;
    if (name) {
      await p.query('UPDATE configs SET name = ?, data = ? WHERE id = ?', [name, JSON.stringify(data), id]);
    } else {
      await p.query('UPDATE configs SET data = ? WHERE id = ?', [JSON.stringify(data), id]);
    }
    logger.info('已更新激活配置（id=%s）', id);
    return ok(res, { id, data, active: true }, '配置已保存');
  } catch (err) {
    logger.error('保存激活配置失败：', err);
    return fail(res, '保存配置失败：' + err.message, 1, 500);
  }
});

/**
 * GET /api/configs  配置列表（不含大字段可被精简，此处完整返回）
 */
router.get('/', async (req, res) => {
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT id, name, data, is_active, created_at, updated_at FROM configs ORDER BY is_active DESC, updated_at DESC, id DESC');
    const list = rows.map((r) => ({
      id: r.id,
      name: r.name,
      data: sanitizeConfigData(r.data),
      is_active: !!r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    return ok(res, list);
  } catch (err) {
    logger.error('读取配置列表失败：', err);
    return fail(res, '读取配置列表失败：' + err.message, 1, 500);
  }
});

/**
 * POST /api/configs  新建配置
 * body: { name?, data }
 */
router.post('/', async (req, res) => {
  try {
    const p = getPool();
    const name = (req.body && req.body.name) || '未命名配置';
    const data = sanitizeConfigData(req.body && req.body.data);
    const [ins] = await p.query('INSERT INTO configs (name, data) VALUES (?, ?)', [name, JSON.stringify(data)]);
    logger.info('新建配置（name=%s, id=%s）', name, ins.insertId);
    return ok(res, { id: ins.insertId, name, data, is_active: false }, '已新建配置');
  } catch (err) {
    logger.error('新建配置失败：', err);
    return fail(res, '新建配置失败：' + err.message, 1, 500);
  }
});

/**
 * PUT /api/configs/:id  更新配置
 * body: { name?, data }
 */
router.put('/:id', async (req, res) => {
  try {
    const p = getPool();
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return fail(res, '无效的配置 ID');
    const [exist] = await p.query('SELECT id FROM configs WHERE id = ?', [id]);
    if (exist.length === 0) return fail(res, '配置不存在', 1, 404);

    const name = req.body && req.body.name;
    const data = req.body && req.body.data !== undefined ? sanitizeConfigData(req.body.data) : undefined;

    if (name && data) {
      await p.query('UPDATE configs SET name = ?, data = ? WHERE id = ?', [name, JSON.stringify(data), id]);
    } else if (data) {
      await p.query('UPDATE configs SET data = ? WHERE id = ?', [JSON.stringify(data), id]);
    } else if (name) {
      await p.query('UPDATE configs SET name = ? WHERE id = ?', [name, id]);
    }
    logger.info('更新配置（id=%s）', id);
    return ok(res, { id }, '已更新配置');
  } catch (err) {
    logger.error('更新配置失败：', err);
    return fail(res, '更新配置失败：' + err.message, 1, 500);
  }
});

/**
 * DELETE /api/configs/:id  删除配置（激活配置被删后自动激活其余第一条）
 */
router.delete('/:id', async (req, res) => {
  try {
    const p = getPool();
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return fail(res, '无效的配置 ID');
    const [exist] = await p.query('SELECT id, is_active FROM configs WHERE id = ?', [id]);
    if (exist.length === 0) return fail(res, '配置不存在', 1, 404);

    const wasActive = !!exist[0].is_active;
    await p.query('DELETE FROM configs WHERE id = ?', [id]);
    if (wasActive) {
      await p.query('UPDATE configs SET is_active = 1 ORDER BY id ASC LIMIT 1');
    }
    logger.info('删除配置（id=%s, wasActive=%s）', id, wasActive);
    return ok(res, { id }, '已删除配置');
  } catch (err) {
    logger.error('删除配置失败：', err);
    return fail(res, '删除配置失败：' + err.message, 1, 500);
  }
});

/**
 * POST /api/configs/:id/activate  激活切换（事务内清旧置新）
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const p = getPool();
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return fail(res, '无效的配置 ID');
    const [exist] = await p.query('SELECT id FROM configs WHERE id = ?', [id]);
    if (exist.length === 0) return fail(res, '配置不存在', 1, 404);

    const conn = await p.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE configs SET is_active = 0');
      await conn.query('UPDATE configs SET is_active = 1 WHERE id = ?', [id]);
      await conn.commit();
      logger.info('已切换激活配置（id=%s）', id);
      return ok(res, { id }, '已激活配置');
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    logger.error('激活配置失败：', err);
    return fail(res, '激活配置失败：' + err.message, 1, 500);
  }
});

module.exports = router;
