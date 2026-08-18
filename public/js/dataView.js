'use strict';

/**
 * 数据视图：数字/权重表格编辑、批量增删、统一/多选权重、JSON/CSV/XLSX 导入导出、
 * 模板下载、清空，以及云端配置管理（拉取/上传/新建/激活/删除）。
 * 全局对象：DataPanel
 */
const DataPanel = (function () {
  let tbody, selInfo, checkAll;
  const selected = new Set();

  function init() {
    tbody = document.getElementById('dataTbody');
    selInfo = document.getElementById('selInfo');
    checkAll = document.getElementById('checkAll');

    // 绑定控制按钮
    byId('btnAddSingle').onclick = addSingle;
    byId('btnDelSingle').onclick = delSingle;
    byId('btnAddRange').onclick = addRange;
    byId('btnAddList').onclick = addList;
    byId('btnDelRange').onclick = delRange;
    byId('btnSetWeight').onclick = setWeight;
    byId('btnDelSel').onclick = delSelected;
    byId('btnWeightSel').onclick = weightSelected;
    byId('btnUniform').onclick = uniformWeight;
    byId('btnClearAll').onclick = clearAll;

    byId('btnImportJson').onclick = () => byId('fileJson').click();
    byId('btnExportJson').onclick = exportJson;
    byId('btnImportCsv').onclick = () => byId('fileCsv').click();
    byId('btnImportXlsx').onclick = () => byId('fileXlsx').click();
    byId('btnTpl').onclick = () => API.downloadTemplate();
    byId('btnSaveCloud').onclick = pushLocal;
    byId('btnLoadCloud').onclick = pullActive;
    byId('btnNewConfig').onclick = newConfig;

    byId('fileJson').onchange = onImportJson;
    byId('fileCsv').onchange = (e) => onImportSheet(e, 'csv');
    byId('fileXlsx').onchange = (e) => onImportSheet(e, 'xlsx');

    checkAll.onchange = () => {
      if (checkAll.checked) App.state.items.forEach((it) => selected.add(it.number));
      else selected.clear();
      render();
    };
  }

  function byId(id) { return document.getElementById(id); }

  // ---------- 表格渲染 ----------
  function render() {
    if (!tbody) return;
    const total = App.state.items.reduce((s, it) => s + it.weight, 0);
    tbody.innerHTML = '';
    App.state.items.forEach((it) => {
      const prob = total > 0 ? ((it.weight / total) * 100).toFixed(2) + '%' : '0%';
      const tr = document.createElement('tr');
      if (selected.has(it.number)) tr.classList.add('selected');
      tr.innerHTML = `
        <td class="col-check"><input type="checkbox" ${selected.has(it.number) ? 'checked' : ''} data-num="${it.number}" /></td>
        <td>${it.number}</td>
        <td><input type="number" min="1" value="${it.weight}" data-wnum="${it.number}" /></td>
        <td class="prob-cell">${prob}</td>
        <td><span class="del-row" data-del="${it.number}">✕</span></td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.onchange = () => {
        const n = parseInt(cb.dataset.num, 10);
        if (cb.checked) selected.add(n); else selected.delete(n);
        updateSelInfo();
      };
    });
    tbody.querySelectorAll('input[data-wnum]').forEach((inp) => {
      inp.onchange = () => {
        const n = parseInt(inp.dataset.wnum, 10);
        const w = parseInt(inp.value, 10);
        const it = App.state.items.find((x) => x.number === n);
        if (it && Number.isFinite(w) && w > 0) { it.weight = w; App.notifyDataChanged(); }
        else { App.toast('权重需为正整数', 'error'); App.notifyDataChanged(); }
      };
    });
    tbody.querySelectorAll('[data-del]').forEach((sp) => {
      sp.onclick = () => {
        const n = parseInt(sp.dataset.del, 10);
        App.state.items = App.state.items.filter((x) => x.number !== n);
        selected.delete(n);
        App.notifyDataChanged();
      };
    });
    if (checkAll) checkAll.checked = false;
    updateSelInfo();
  }

  function updateSelInfo() {
    if (selInfo) selInfo.textContent = '已选 ' + selected.size + ' 项';
  }

  // ---------- 编辑操作 ----------
  async function addSingle() {
    const n = parseInt(byId('inSingle').value, 10);
    if (!Number.isFinite(n)) { App.toast('请输入有效数字', 'error'); return; }
    const w = await App.promptWeight('设置数字 ' + n + ' 的权重', 1);
    if (w === null) return;
    setWeightOf(n, w);
    byId('inSingle').value = '';
    App.notifyDataChanged();
  }

  function delSingle() {
    const n = parseInt(byId('inDelSingle').value, 10);
    if (!Number.isFinite(n)) { App.toast('请输入有效数字', 'error'); return; }
    if (!App.state.items.some((x) => x.number === n)) { App.toast('数字 ' + n + ' 不存在', 'error'); return; }
    App.state.items = App.state.items.filter((x) => x.number !== n);
    selected.delete(n);
    byId('inDelSingle').value = '';
    App.notifyDataChanged();
  }

  async function addRange() {
    const nums = RandomUtil.range(byId('inRangeStart').value, byId('inRangeEnd').value);
    if (nums.length === 0) { App.toast('请输入有效区间', 'error'); return; }
    const w = await App.promptWeight('设置区间批量权重', 1);
    if (w === null) return;
    nums.forEach((n) => setWeightOf(n, w));
    byId('inRangeStart').value = ''; byId('inRangeEnd').value = '';
    App.notifyDataChanged();
    App.toast('已添加 ' + nums.length + ' 个数字', 'success');
  }

  async function addList() {
    const nums = RandomUtil.parseNumberList(byId('inRegex').value);
    if (nums.length === 0) { App.toast('无法解析数字列表', 'error'); return; }
    const w = await App.promptWeight('设置批量权重', 1);
    if (w === null) return;
    nums.forEach((n) => setWeightOf(n, w));
    byId('inRegex').value = '';
    App.notifyDataChanged();
    App.toast('已添加 ' + nums.length + ' 个数字', 'success');
  }

  function delRange() {
    const nums = RandomUtil.range(byId('inDelStart').value, byId('inDelEnd').value);
    if (nums.length === 0) { App.toast('请输入有效区间', 'error'); return; }
    const toDel = nums.filter((n) => App.state.items.some((x) => x.number === n));
    if (toDel.length === 0) { App.toast('该区间内没有数字', 'error'); return; }
    App.confirmDialog('确认删除', `确定删除区间内的 ${toDel.length} 个数字吗？`, () => {
      App.state.items = App.state.items.filter((x) => !toDel.includes(x.number));
      toDel.forEach((n) => selected.delete(n));
      byId('inDelStart').value = ''; byId('inDelEnd').value = '';
      App.notifyDataChanged();
    });
  }

  function setWeight() {
    const n = parseInt(byId('inWNum').value, 10);
    const w = parseInt(byId('inWVal').value, 10);
    if (!Number.isFinite(n) || !Number.isFinite(w) || w <= 0) { App.toast('请输入有效的数字与权重', 'error'); return; }
    if (!App.state.items.some((x) => x.number === n)) { App.toast('数字 ' + n + ' 不存在', 'error'); return; }
    setWeightOf(n, w);
    byId('inWNum').value = ''; byId('inWVal').value = '';
    App.notifyDataChanged();
  }

  function delSelected() {
    if (selected.size === 0) { App.toast('请先选择要删除的项', 'error'); return; }
    App.confirmDialog('确认删除', `确定删除选中的 ${selected.size} 个数字吗？`, () => {
      App.state.items = App.state.items.filter((x) => !selected.has(x.number));
      selected.clear();
      App.notifyDataChanged();
    });
  }

  async function weightSelected() {
    if (selected.size === 0) { App.toast('请先选择要编辑的项', 'error'); return; }
    const w = await App.promptWeight('设置选中项的权重', 1);
    if (w === null) return;
    selected.forEach((n) => setWeightOf(n, w));
    App.notifyDataChanged();
    App.toast('已为 ' + selected.size + ' 个数字设置权重 ' + w, 'success');
  }

  async function uniformWeight() {
    if (App.state.items.length === 0) { App.toast('当前没有数字', 'error'); return; }
    const w = await App.promptWeight('设置全部统一权重', 1);
    if (w === null) return;
    App.state.items.forEach((it) => (it.weight = w));
    App.notifyDataChanged();
    App.toast('已将全部 ' + App.state.items.length + ' 个数字权重设为 ' + w, 'success');
  }

  function clearAll() {
    if (App.state.items.length === 0) { App.toast('当前没有数据', 'error'); return; }
    App.confirmDialog('确认清空', '确定清空所有数据吗？此操作不可撤销。', () => {
      App.state.items = [];
      selected.clear();
      App.notifyDataChanged();
      App.toast('已清空所有数据', 'success');
    });
  }

  // 设置/新增某数字权重
  function setWeightOf(n, w) {
    const it = App.state.items.find((x) => x.number === n);
    if (it) it.weight = w;
    else App.state.items.push({ number: n, weight: w });
  }

  // ---------- 导入 / 导出 ----------
  function exportJson() {
    if (App.state.items.length === 0) { App.toast('没有数据可导出', 'error'); return; }
    const data = { mode: App.state.mode, items: App.state.items };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    triggerDownload(blob, 'random-config.json');
    App.toast('配置已导出', 'success');
  }

  function onImportJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        let items = [];
        if (Array.isArray(data.items)) items = data.items;
        else if (data && typeof data === 'object') {
          items = Object.entries(data).map(([k, v]) => ({ number: Number(k), weight: Number(v) }));
        }
        App.state.items = RandomUtil.sanitizeItems(items);
        if (data && data.mode) App.state.mode = data.mode === 'number' ? 'number' : 'wheel';
        App.notifyDataChanged();
        App.toast('JSON 配置已导入', 'success');
      } catch (err) {
        App.toast('JSON 解析失败：' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsArrayBuffer(file);
    });
  }

  async function onImportSheet(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const buf = await readFileAsArrayBuffer(file);
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const items = [];
      rows.forEach((row) => {
        if (!row || row.length === 0) return;
        const n = Number(row[0]);
        if (!Number.isFinite(n) || !Number.isInteger(n)) return; // 跳过表头等文本
        const w = row.length > 1 && Number.isFinite(Number(row[1])) && Number(row[1]) > 0 ? Math.floor(Number(row[1])) : 1;
        items.push({ number: n, weight: w });
      });
      if (items.length === 0) { App.toast('未解析到有效数据', 'error'); return; }
      App.confirmDialog('确认导入', `将导入 ${items.length} 条数据并覆盖当前配置，是否继续？`, () => {
        App.state.items = RandomUtil.sanitizeItems(items);
        App.notifyDataChanged();
        App.toast(type.toUpperCase() + ' 导入成功（' + items.length + ' 条）', 'success');
      });
    } catch (err) {
      App.toast('导入失败：' + err.message, 'error');
    }
    e.target.value = '';
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------- 云端 ----------
  async function pushLocal() {
    if (!App.state.cloudOnline) { App.toast('云端离线，无法上传', 'error'); return; }
    const id = App.state.activeConfigId;
    let name = (App.state.cloudConfigs.find((c) => c.id === id) || {}).name || '本地配置';
    try {
      await API.saveActiveConfig({ name, data: { mode: App.state.mode, items: App.state.items } });
      App.state.activeConfigId = (await API.getActiveConfig()).id;
      App.state.cloudConfigs = await API.listConfigs();
      App.notifyConfigsChanged();
      App.toast('已保存到云端并设为激活', 'success');
    } catch (e) { App.toast('上传失败：' + e.message, 'error'); }
  }

  async function pullActive() {
    if (!App.state.cloudOnline) { App.toast('云端离线，无法拉取', 'error'); return; }
    const active = await API.getActiveConfig();
    if (!active || !active.data) { App.toast('云端没有可用配置', 'error'); return; }
    App.state.items = RandomUtil.sanitizeItems(active.data.items);
    App.state.mode = active.data.mode === 'number' ? 'number' : 'wheel';
    App.state.activeConfigId = active.id;
    App.saveLocal();
    App.notifyDataChanged();
    App.notifyConfigsChanged();
    App.toast('已从云端拉取激活配置', 'success');
  }

  async function newConfig() {
    if (!App.state.cloudOnline) { App.toast('云端离线，无法新建', 'error'); return; }
    const name = (byId('inNewName').value || '').trim();
    if (!name) { App.toast('请输入配置名称', 'error'); return; }
    try {
      await API.createConfig({ name, data: { mode: App.state.mode, items: App.state.items } });
      byId('inNewName').value = '';
      App.state.cloudConfigs = await API.listConfigs();
      App.notifyConfigsChanged();
      App.toast('已新建云端配置：' + name, 'success');
    } catch (e) { App.toast('新建失败：' + e.message, 'error'); }
  }

  async function activate(id) {
    try {
      await API.activateConfig(id);
      App.state.activeConfigId = id;
      App.state.cloudConfigs = await API.listConfigs();
      App.notifyConfigsChanged();
      App.toast('已切换激活配置', 'success');
    } catch (e) { App.toast('激活失败：' + e.message, 'error'); }
  }

  async function removeConfig(id, name) {
    App.confirmDialog('删除配置', `确定删除云端配置「${name}」吗？`, async () => {
      try {
        await API.deleteConfig(id);
        App.state.cloudConfigs = await API.listConfigs();
        App.notifyConfigsChanged();
        App.toast('已删除配置', 'success');
      } catch (e) { App.toast('删除失败：' + e.message, 'error'); }
    });
  }

  function renderCloudConfigs() {
    const list = byId('cloudConfigList');
    if (!list) return;
    list.innerHTML = '';
    App.state.cloudConfigs.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'cloud-item' + (c.is_active ? ' active' : '');
      div.innerHTML = `
        <span class="ci-name">${escapeHtml(c.name)}</span>
        ${c.is_active ? '<span class="ci-badge">激活</span>' : ''}
        <span class="ci-btns">
          ${c.is_active ? '' : '<button class="btn btn-ghost btn-sm" data-act="act">激活</button>'}
          <button class="btn btn-danger btn-sm" data-act="del">删</button>
        </span>`;
      list.appendChild(div);
      const actBtn = div.querySelector('[data-act="act"]');
      if (actBtn) actBtn.onclick = () => activate(c.id);
      div.querySelector('[data-act="del"]').onclick = () => removeConfig(c.id, c.name);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  return { init, render, renderCloudConfigs };
})();
