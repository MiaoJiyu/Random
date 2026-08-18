'use strict';

/**
 * 统计视图：历史记录分页列表、ECharts 柱状图/饼图、汇总卡片、清空历史。
 * 全局对象：StatsView
 */
const StatsView = (function () {
  let barChart, pieChart, page = 1, totalPages = 1, inited = false;

  function init() {
    document.getElementById('btnClearHistory').onclick = clearHistory;
  }

  function ensureCharts() {
    if (inited) return;
    if (typeof echarts === 'undefined') return;
    barChart = echarts.init(document.getElementById('barChart'));
    pieChart = echarts.init(document.getElementById('pieChart'));
    inited = true;
  }

  function onShow() {
    ensureCharts();
    if (inited) { barChart.resize(); pieChart.resize(); }
    refresh();
  }

  async function refresh() {
    try {
      const stats = await API.getStats();
      const hist = await API.getHistory(page, 100);

      // 汇总卡片
      document.getElementById('scTotal').textContent = stats.total;
      document.getElementById('scLatest').textContent = hist.list.length ? hist.list[0].number : '—';
      document.getElementById('scTop').textContent = stats.distribution.length ? stats.distribution[0].number : '—';

      renderCharts(stats.distribution);
      renderTable(hist);
    } catch (e) {
      App.toast('加载统计失败：' + e.message, 'error');
    }
  }

  function renderCharts(dist) {
    if (!inited) return;
    const numbers = dist.map((d) => d.number);
    const counts = dist.map((d) => d.count);

    barChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: numbers, axisLabel: { color: '#9CA3AF' }, axisLine: { lineStyle: { color: '#3a3c5a' } } },
      yAxis: { type: 'value', axisLabel: { color: '#9CA3AF' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
      series: [{
        type: 'bar', data: counts, itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#F5B301' }, { offset: 1, color: '#FF8C00' },
          ]),
        },
      }],
    });

    pieChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { type: 'scroll', bottom: 0, textStyle: { color: '#9CA3AF' } },
      series: [{
        type: 'pie', radius: ['38%', '66%'], center: ['50%', '45%'],
        data: dist.map((d, i) => ({
          name: d.number, value: d.count,
          itemStyle: { color: Wheel.PALETTE[i % Wheel.PALETTE.length] },
        })),
        label: { color: '#E6E6F0' },
      }],
    });
  }

  function renderTable(hist) {
    const tb = document.getElementById('historyTbody');
    tb.innerHTML = '';
    hist.list.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${formatTime(r.created_at)}</td><td>${r.number}</td><td>${r.weight}</td>`;
      tb.appendChild(tr);
    });
    totalPages = Math.max(1, Math.ceil(hist.total / hist.pageSize));
    page = Math.min(page, totalPages);
    renderPager();
  }

  function renderPager() {
    const p = document.getElementById('historyPager');
    p.innerHTML = '';
    const prev = document.createElement('button');
    prev.className = 'btn btn-ghost btn-sm';
    prev.textContent = '上一页';
    prev.disabled = page <= 1;
    prev.onclick = () => { if (page > 1) { page--; refresh(); } };

    const next = document.createElement('button');
    next.className = 'btn btn-ghost btn-sm';
    next.textContent = '下一页';
    next.disabled = page >= totalPages;
    next.onclick = () => { if (page < totalPages) { page++; refresh(); } };

    const info = document.createElement('span');
    info.textContent = `第 ${page} / ${totalPages} 页（共 ${totalPages ? '' : ''}${document.getElementById('scTotal').textContent} 条）`;

    p.appendChild(prev); p.appendChild(info); p.appendChild(next);
  }

  function clearHistory() {
    App.confirmDialog('清空历史', '确定清空全部历史记录吗？此操作不可撤销。', async () => {
      try {
        await API.clearHistory();
        page = 1;
        refresh();
        App.toast('已清空历史记录', 'success');
      } catch (e) { App.toast('清空失败：' + e.message, 'error'); }
    });
  }

  function formatTime(t) {
    let d = t;
    if (typeof t === 'string') d = new Date(t);
    if (d instanceof Date && !isNaN(d.getTime())) {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }
    return String(t || '');
  }

  return { init, onShow };
})();
