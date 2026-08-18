'use strict';

/**
 * 统一日志模块
 * 使用本地时间戳，不打印密码与完整配置内容，避免敏感信息泄露。
 */

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmt(args) {
  return args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a, (k, v) => (k.toLowerCase().includes('password') ? '***' : v));
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');
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
