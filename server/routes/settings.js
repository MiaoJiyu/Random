'use strict';

/**
 * 设置路由：
 *   GET  /api/settings              读取 { version, downloadUrl, hasPassword }（不返回密码哈希）
 *   PUT  /api/settings              更新 { version, downloadUrl }（供管理员配置发布信息）
 *   POST /api/settings/password/verify   校验密码 { password } -> { ok }
 *   PUT  /api/settings/password     设置/修改密码 { oldPassword, newPassword }
 *
 * 密码以 scrypt + 随机盐哈希存储（settings 表中 k='password'），不存储明文。
 */
const crypto = require('crypto');
const express = require('express');
const db = require('../db');

function getPool() { return db.getPool(); }

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  if (!stored) return false;
  const idx = stored.indexOf(':');
  if (idx < 0) return false;
  const salt = stored.slice(0, idx);
  const hash = stored.slice(idx + 1);
  const h = crypto.scryptSync(pw, salt, 64).toString('hex');
  const a = Buffer.from(h, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function ok(res, data) { res.json({ code: 0, data, message: 'ok' }); }
function fail(res, msg, http = 400) { res.status(http).json({ code: 1, data: null, message: msg }); }

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT k, v FROM settings');
    const map = {};
    rows.forEach((r) => { map[r.k] = r.v; });
    ok(res, {
      version: map.version || '',
      downloadUrl: map.downloadUrl || '',
      hasPassword: !!(map.password && map.password.length > 0),
    });
  } catch (err) { fail(res, '读取设置失败：' + err.message, 500); }
});

router.put('/', async (req, res) => {
  try {
    const { version, downloadUrl } = req.body || {};
    const p = getPool();
    if (version !== undefined) await p.query("UPDATE settings SET v = ? WHERE k = 'version'", [String(version)]);
    if (downloadUrl !== undefined) await p.query("UPDATE settings SET v = ? WHERE k = 'downloadUrl'", [String(downloadUrl)]);
    ok(res, { success: true });
  } catch (err) { fail(res, '更新失败：' + err.message, 500); }
});

router.post('/password/verify', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return ok(res, { ok: false });
    const p = getPool();
    const [rows] = await p.query("SELECT v FROM settings WHERE k = 'password'");
    const stored = rows[0] ? rows[0].v : '';
    ok(res, { ok: verifyPassword(password, stored) });
  } catch (err) { fail(res, '校验失败：' + err.message, 500); }
});

router.put('/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 4) return fail(res, '新密码至少 4 位');
    const p = getPool();
    const [rows] = await p.query("SELECT v FROM settings WHERE k = 'password'");
    const stored = rows[0] ? rows[0].v : '';
    if (stored && !verifyPassword(oldPassword || '', stored)) {
      return fail(res, '当前密码错误');
    }
    await p.query("UPDATE settings SET v = ? WHERE k = 'password'", [hashPassword(newPassword)]);
    ok(res, { success: true });
  } catch (err) { fail(res, '设置失败：' + err.message, 500); }
});

module.exports = router;
