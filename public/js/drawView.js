'use strict';

/**
 * 抽取视图：加权预选 → 大转盘 / 数字闪动动画 → 结果展示 + 异步上报历史。
 * 全局对象：DrawView
 */
const DrawView = (function () {
  let wheel = null;
  let btnDraw, btnStop, wheelWrap, numberWrap, numberFlash, resultValue, resultWeight, wheelCenter;
  let configSelect, btnUseCloud, btnPushLocal;
  let animating = false;
  let animTimer = null;
  let currentPick = null;

  function init() {
    wheel = new Wheel(document.getElementById('wheelCanvas'));
    btnDraw = document.getElementById('btnDraw');
    btnStop = document.getElementById('btnStop');
    wheelWrap = document.getElementById('wheelWrap');
    numberWrap = document.getElementById('numberWrap');
    numberFlash = document.getElementById('numberFlash');
    resultValue = document.getElementById('resultValue');
    resultWeight = document.getElementById('resultWeight');
    wheelCenter = document.getElementById('wheelCenter');

    configSelect = document.getElementById('configSelect');
    btnUseCloud = document.getElementById('btnUseCloud');
    btnPushLocal = document.getElementById('btnPushLocal');

    btnDraw.onclick = startDraw;
    btnStop.onclick = stopDraw;
    wheelCenter.onclick = () => { if (!animating) startDraw(); };

    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.onclick = () => {
        if (animating) return;
        App.state.mode = b.dataset.mode;
        App.saveLocal();
        render();
      };
    });

    btnUseCloud.onclick = useCloud;
    btnPushLocal.onclick = pushLocal;
  }

  function render() {
    const mode = App.state.mode;
    wheelWrap.classList.toggle('hidden', mode !== 'wheel');
    numberWrap.classList.toggle('hidden', mode !== 'number');
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    if (mode === 'wheel') wheel.build(App.state.items);
  }

  function renderConfigSelect() {
    if (!configSelect) return;
    configSelect.innerHTML = '';
    App.state.cloudConfigs.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = (c.is_active ? '★ ' : '') + c.name;
      configSelect.appendChild(opt);
    });
  }

  function startDraw() {
    if (animating) return;
    const pick = RandomUtil.weightedPick(App.state.items);
    if (!pick) { App.toast('请先在「数据」视图添加数字', 'error'); return; }
    currentPick = pick;
    animating = true;
    btnDraw.classList.add('hidden');
    btnStop.classList.remove('hidden');
    resultValue.textContent = '抽取中…';
    resultWeight.textContent = '';

    if (App.state.mode === 'wheel') {
      wheel.spinTo(pick.number, 5000, () => finishDraw());
    } else {
      const nums = App.state.items.map((i) => i.number);
      const CONVERGE_AT = 3700; // 最后 1.3 秒收敛到加权目标，使“结束即结果”
      let elapsed = 0;
      animTimer = setInterval(() => {
        if (elapsed >= CONVERGE_AT) {
          numberFlash.textContent = pick.number; // 收敛到目标
        } else {
          numberFlash.textContent = nums[Math.floor(Math.random() * nums.length)];
        }
        elapsed += 60;
        if (elapsed >= 5000) { clearInterval(animTimer); animTimer = null; finishDraw(); }
      }, 60);
    }
  }

  function stopDraw() {
    if (!animating) return;
    if (App.state.mode === 'number' && animTimer) {
      clearInterval(animTimer); animTimer = null;
      finishDraw();
    } else if (App.state.mode === 'wheel') {
      wheel.stopSpin();
      wheel.spinTo(currentPick.number, 700, () => finishDraw());
    }
  }

  function finishDraw() {
    animating = false;
    btnStop.classList.add('hidden');
    btnDraw.classList.remove('hidden');

    // 数字模式：结果 = 当前闪动显示的数字（停止即锁定）；转盘模式：结果 = 加权预选
    let resultNumber;
    if (App.state.mode === 'number') {
      resultNumber = parseInt(numberFlash.textContent, 10);
    } else {
      resultNumber = currentPick ? currentPick.number : parseInt(numberFlash.textContent, 10);
    }
    if (!Number.isFinite(resultNumber)) return;
    const item = App.state.items.find((it) => it.number === resultNumber);
    const weight = item ? item.weight : 1;

    resultValue.textContent = resultNumber;
    resultWeight.textContent = ''; // 抽取结果不显示权重
    App.toast('🎉 结果：' + resultNumber, 'success');
    API.reportHistory(resultNumber, weight);
  }

  async function useCloud() {
    if (!App.state.cloudOnline) { App.toast('云端离线，无法拉取', 'error'); return; }
    const id = parseInt(configSelect.value, 10);
    const cfg = App.state.cloudConfigs.find((c) => c.id === id);
    if (!cfg) { App.toast('请选择云端配置', 'error'); return; }
    const data = cfg.data || {};
    App.state.items = RandomUtil.sanitizeItems(data.items);
    App.state.mode = data.mode === 'number' ? 'number' : 'wheel';
    App.state.activeConfigId = cfg.id;
    App.saveLocal();
    App.notifyDataChanged();
    App.notifyConfigsChanged();
    App.toast('已从云端拉取：' + cfg.name, 'success');
  }

  async function pushLocal() {
    if (!App.state.cloudOnline) { App.toast('云端离线，无法上传', 'error'); return; }
    const id = parseInt(configSelect.value, 10);
    let name = (App.state.cloudConfigs.find((c) => c.id === id) || {}).name;
    if (!name) name = '本地配置';
    try {
      await API.saveActiveConfig({ name, data: { mode: App.state.mode, items: App.state.items } });
      const active = await API.getActiveConfig();
      if (active) App.state.activeConfigId = active.id;
      const list = await API.listConfigs();
      App.state.cloudConfigs = list || [];
      App.notifyConfigsChanged();
      App.toast('本地配置已上传并设为激活', 'success');
    } catch (e) {
      App.toast('上传失败：' + e.message, 'error');
    }
  }

  return { init, render, renderConfigSelect };
})();
