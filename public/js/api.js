'use strict';

/**
 * API 封装：所有请求走相对路径（网页版与 Electron 共享同一份代码）。
 * 统一返回 { code, data, message }。历史上报失败时写入 localStorage 队列，网络恢复后重放。
 */
const API = (function () {
  const QUEUE_KEY = 'random_history_queue';

  function readQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch { return []; }
  }
  function writeQueue(arr) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(arr));
  }

  async function request(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const resp = await fetch(url, opts);
    let json;
    try { json = await resp.json(); } catch { json = { code: -1, data: null, message: '响应解析失败' }; }
    if (resp.status >= 500) throw new Error(json.message || '服务器错误');
    return json;
  }

  async function flushQueue() {
    const q = readQueue();
    if (q.length === 0) return;
    const remain = [];
    for (const item of q) {
      try {
        await request('POST', '/api/history', item);
      } catch {
        remain.push(item);
      }
    }
    writeQueue(remain);
    if (remain.length !== q.length) {
      // 部分或全部重放成功
      if (remain.length === 0) App.toast('离线记录已同步到云端', 'success');
    }
  }

  return {
    async getHealth() {
      try {
        const r = await request('GET', '/api/health');
        if (r.code === 0 && r.data && r.data.db) {
          flushQueue();
          return true;
        }
        return false;
      } catch { return false; }
    },

    async getActiveConfig() {
      const r = await request('GET', '/api/config/active');
      return r.code === 0 ? r.data : null;
    },

    async saveActiveConfig(payload) {
      const r = await request('PUT', '/api/config/active', payload);
      return r;
    },

    async listConfigs() {
      const r = await request('GET', '/api/config');
      return r.code === 0 ? r.data : [];
    },

    async createConfig(payload) {
      const r = await request('POST', '/api/config', payload);
      return r;
    },

    async updateConfig(id, payload) {
      const r = await request('PUT', '/api/config/' + id, payload);
      return r;
    },

    async deleteConfig(id) {
      const r = await request('DELETE', '/api/config/' + id);
      return r;
    },

    async activateConfig(id) {
      const r = await request('POST', '/api/config/' + id + '/activate');
      return r;
    },

    /** 上报一条历史；失败则入队，返回是否成功 */
    async reportHistory(number, weight) {
      try {
        await request('POST', '/api/history', { number, weight });
        return true;
      } catch {
        const q = readQueue();
        q.push({ number, weight, _ts: Date.now() });
        writeQueue(q);
        App.toast('云端离线，结果已暂存，联网后自动同步', 'error');
        return false;
      }
    },

    async getHistory(page = 1, pageSize = 100) {
      const r = await request('GET', `/api/history?page=${page}&pageSize=${pageSize}`);
      return r.code === 0 ? r.data : { list: [], page, pageSize, total: 0 };
    },

    async clearHistory() {
      const r = await request('DELETE', '/api/history');
      return r;
    },

    async getStats() {
      const r = await request('GET', '/api/stats');
      return r.code === 0 ? r.data : { total: 0, distribution: [] };
    },

    /** 触发示例模板下载 */
    downloadTemplate() {
      window.location.href = '/api/template.csv';
    },
  };
})();
