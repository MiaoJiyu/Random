'use strict';

/**
 * 加权随机与数据解析工具（等价于 Python random.choices 的预选逻辑）。
 * 全局对象：RandomUtil
 */
const RandomUtil = (function () {
  /**
   * 按权重预选一个目标项（结果在动画开始前即确定）。
   * @param {Array<{number:number, weight:number}>} items
   * @returns {{number:number, weight:number}|null}
   */
  function weightedPick(items) {
    const valid = (items || []).filter((it) => it && Number.isFinite(it.weight) && it.weight > 0);
    if (valid.length === 0) return null;
    const total = valid.reduce((s, it) => s + it.weight, 0);
    let r = Math.random() * total;
    for (const it of valid) {
      r -= it.weight;
      if (r < 0) return it;
    }
    return valid[valid.length - 1];
  }

  /** 解析 "1-10,15,20-25" 或区间字符串为数字数组（去重、排序）。 */
  function parseNumberList(str) {
    const out = new Set();
    const parts = String(str || '').split(',');
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      if (part.includes('-')) {
        const seg = part.split('-');
        const a = parseInt(seg[0], 10), b = parseInt(seg[1], 10);
        if (Number.isFinite(a) && Number.isFinite(b)) {
          const lo = Math.min(a, b), hi = Math.max(a, b);
          for (let n = lo; n <= hi; n++) out.add(n);
        }
      } else {
        const n = parseInt(part, 10);
        if (Number.isFinite(n)) out.add(n);
      }
    }
    return Array.from(out).sort((x, y) => x - y);
  }

  /** 区间 [start, end] 数字数组（自动处理起止反转）。 */
  function range(start, end) {
    let a = parseInt(start, 10), b = parseInt(end, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
    if (a > b) [a, b] = [b, a];
    const out = [];
    for (let n = a; n <= b; n++) out.push(n);
    return out;
  }

  /** 校验单个数字权重条目，返回清洗后的 items。 */
  function sanitizeItems(rawItems) {
    const map = new Map();
    (rawItems || []).forEach((it) => {
      const number = Number(it && it.number);
      const weight = Number(it && it.weight);
      if (!Number.isFinite(number) || !Number.isInteger(number)) return;
      map.set(number, Number.isFinite(weight) && weight > 0 ? Math.floor(weight) : 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([number, weight]) => ({ number, weight }));
  }

  /** 统计：总数、总权重、平均概率。 */
  function stats(items) {
    const count = items.length;
    const totalWeight = items.reduce((s, it) => s + (it.weight || 0), 0);
    const avgProb = count > 0 ? 100 / count : 0;
    return { count, totalWeight, avgProb };
  }

  return { weightedPick, parseNumberList, range, sanitizeItems, stats };
})();
