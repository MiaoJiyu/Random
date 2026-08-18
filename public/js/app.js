'use strict';

/**
 * 应用核心：全局状态、视图路由、Toast/模态框、本地持久化、云端状态。
 * 其他视图模块通过 window.App 读写状态并触发刷新。
 */
const App = (function () {
  const LOCAL_KEY = 'random_local_config';

  const state = {
    items: [],          // [{number, weight}]
    mode: 'wheel',      // 'wheel' | 'number'
    view: 'draw',
    activeConfigId: null,
    cloudConfigs: [],
    cloudOnline: false,
  };

  function saveLocal() {
    const data = { mode: state.mode, items: state.items };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return {
        mode: d.mode === 'number' ? 'number' : 'wheel',
        items: RandomUtil.sanitizeItems(d.items),
      };
    } catch { return null; }
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast ' + type; }, 2600);
  }

  // ---------- Modal ----------
  function showModal(title, bodyHtml, onOk, okText = '确定') {
    const mask = document.getElementById('modalMask');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    const okBtn = document.getElementById('modalOk');
    const cancelBtn = document.getElementById('modalCancel');
    okBtn.textContent = okText;
    mask.classList.remove('hidden');
    const cleanup = () => {
      mask.classList.add('hidden');
      okBtn.onclick = null; cancelBtn.onclick = null;
      mask.onclick = null;
    };
    mask.onclick = (e) => { if (e.target === mask) cleanup(); };
    cancelBtn.onclick = cleanup;
    okBtn.onclick = () => { cleanup(); if (onOk) onOk(); };
  }
  /** 输入数字弹窗，返回整数权重（取消或非法返回 null）。 */
  function promptWeight(title, defaultVal = 1) {
    return new Promise((resolve) => {
      showModal(
        title,
        `<input type="number" id="modalInput" min="1" value="${defaultVal}" />`,
        () => {
          const v = parseInt(document.getElementById('modalInput').value, 10);
          resolve(Number.isFinite(v) && v > 0 ? v : null);
        }
      );
      setTimeout(() => { const i = document.getElementById('modalInput'); if (i) i.focus(); }, 50);
    });
  }
  function confirmDialog(title, bodyText, onOk) {
    showModal(title, `<div>${bodyText}</div>`, onOk);
  }

  // ---------- 状态变更通知 ----------
  function notifyDataChanged() {
    state.items = RandomUtil.sanitizeItems(state.items);
    saveLocal();
    if (DataPanel) DataPanel.render();
    if (DrawView) DrawView.render();
    updateNowConfig();
    updateDataStats();
  }
  function notifyConfigsChanged() {
    if (DataPanel) DataPanel.renderCloudConfigs();
    if (DrawView) DrawView.renderConfigSelect();
  }

  function updateDataStats() {
    const s = RandomUtil.stats(state.items);
    const c = document.getElementById('statCount');
    const w = document.getElementById('statWeight');
    const a = document.getElementById('statAvg');
    if (c) c.textContent = s.count;
    if (w) w.textContent = s.totalWeight;
    if (a) a.textContent = s.avgProb.toFixed(2) + '%';
  }
  function updateNowConfig() {
    const el = document.getElementById('drawNowConfig');
    if (el) {
      const id = state.activeConfigId;
      const name = state.cloudConfigs.find((c) => c.id === id);
      el.textContent = name ? name.name : '本地配置（未命名）';
    }
  }

  // ---------- 视图切换 ----------
  function switchView(view) {
    state.view = view;
    document.querySelectorAll('.nav-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.view === view);
    });
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('active', v.id === 'view-' + view);
    });
    if (view === 'stats' && StatsView) StatsView.onShow();
  }

  // ---------- 云端状态 ----------
  async function refreshCloudStatus() {
    const ok = await API.getHealth();
    state.cloudOnline = ok;
    const el = document.getElementById('cloudStatus');
    el.classList.toggle('online', ok);
    el.classList.toggle('offline', !ok);
    el.querySelector('.txt').textContent = ok ? '云端已连接' : '云端离线（本地可用）';
  }

  // ---------- 初始化 ----------
  async function init() {
    // 本地优先
    const local = loadLocal();
    if (local) {
      state.items = local.items;
      state.mode = local.mode;
    }

    // 绑定导航
    document.querySelectorAll('.nav-tab').forEach((t) => {
      t.onclick = () => switchView(t.dataset.view);
    });

    // 初始化各视图
    if (DrawView) DrawView.init();
    if (DataPanel) DataPanel.init();
    if (StatsView) StatsView.init();

    // 云端
    await refreshCloudStatus();
    if (state.cloudOnline) {
      try {
        const active = await API.getActiveConfig();
        if (active && active.data) {
          state.activeConfigId = active.id;
          if (!local) {
            state.items = RandomUtil.sanitizeItems(active.data.items);
            state.mode = active.data.mode === 'number' ? 'number' : 'wheel';
          }
        }
        const list = await API.listConfigs();
        state.cloudConfigs = list || [];
      } catch (e) {
        toast('读取云端配置失败：' + e.message, 'error');
      }
    } else if (!local) {
      // 离线且无本地：放一份示例
      state.items = RandomUtil.sanitizeItems([
        { number: 1, weight: 10 }, { number: 2, weight: 20 }, { number: 3, weight: 30 },
        { number: 4, weight: 15 }, { number: 5, weight: 25 }, { number: 6, weight: 5 },
        { number: 7, weight: 40 }, { number: 8, weight: 10 }, { number: 9, weight: 20 },
        { number: 10, weight: 15 },
      ]);
    }

    notifyDataChanged();
    notifyConfigsChanged();
    updateNowConfig();
    // 初始模式按钮高亮
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === state.mode);
    });
    switchView('draw');
  }

  return {
    state, toast, showModal, promptWeight, confirmDialog,
    saveLocal, notifyDataChanged, notifyConfigsChanged,
    switchView, refreshCloudStatus, updateNowConfig, init,
  };
})();

document.addEventListener('DOMContentLoaded', () => { App.init(); });
