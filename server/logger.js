'use strict';

/**
 * 统一日志模块：支持 console 风格占位符（%s/%d/%j），不打印密码等敏感信息。
 */
const util = require('util');

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmt(args) {
  // 对含 password 字段的对象做脱敏，避免日志泄露凭据
  const safe = args.map((a) => {
    if (a && typeof a === 'object' && !Array.isArray(a) && !(a instanceof Error)) {
      const clone = {};
      for (const k of Object.keys(a)) {
        clone[k] = /password/i.test(k) ? '***' : a[k];
      }
      return clone;
    }
    return a;
  });
  return util.format(...safe);
}

const logger = {
  info(...args) {
    console.log(`[${ts()}] [INFO] ${fmt(args)}`);
  },
  warn(...args) {
    console.warn(`[${ts()}] [WARN] ${fmt(args)}`);
  },
  error(...args) {
    console.error(`[${ts()}] [ERROR] ${fmt(args)}`);
  },
};

module.exports = logger;
