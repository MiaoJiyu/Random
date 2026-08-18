'use strict';

/**
 * Canvas 大转盘：扇形按权重分配角度，整体 rotate 变换实现减速旋转，
 * spinTo 使预选目标扇区中心停在顶部指针处。
 * 全局类：Wheel
 */
class Wheel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.items = [];
    this.sectors = [];
    this.rotation = 0;
    this.raf = null;
    this._setup();
  }

  _setup() {
    const size = 460;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
    this.center = size / 2;
    this.radius = size / 2 - 12;
  }

  // 霓虹暖色调色板（循环使用）
  static PALETTE = [
    '#F5B301', '#FF8C00', '#8B5CF6', '#22D3EE', '#FB7185',
    '#4ADE80', '#60A5FA', '#F472B6', '#A78BFA', '#FBBF24',
    '#34D399', '#38BDF8', '#F97316', '#C084FC', '#2DD4BF',
  ];

  /** 根据 items 构建扇区几何。扇区按数量等分（与权重无关，视觉等分）。 */
  build(items) {
    this.items = (items || []).filter((it) => it && it.weight > 0);
    const n = this.items.length;
    this.sectors = [];
    if (n === 0) { this.draw(); return; }
    const sweep = (Math.PI * 2) / n; // 等分
    let angle = -Math.PI / 2; // 从顶部开始顺时针
    this.items.forEach((it, i) => {
      const start = angle;
      const end = angle + sweep;
      this.sectors.push({
        number: it.number,
        weight: it.weight,
        start,
        end,
        mid: (start + end) / 2,
        color: Wheel.PALETTE[i % Wheel.PALETTE.length],
      });
      angle = end;
    });
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.save();
    ctx.translate(this.center, this.center);
    ctx.rotate(this.rotation);

    if (this.sectors.length === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#232544';
      ctx.fill();
      ctx.restore();
      return;
    }

    this.sectors.forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, this.radius, s.start, s.end);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,16,35,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 标签
      ctx.save();
      ctx.rotate(s.mid);
      ctx.translate(this.radius * 0.62, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#0F1023';
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s.number), 0, 0);
      ctx.restore();
    });
    ctx.restore();

    // 外圈描边
    ctx.beginPath();
    ctx.arc(this.center, this.center, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245,179,1,0.8)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  /**
   * 旋转到目标数字（预选结果），减速动画。
   * @param {number} targetNumber
   * @param {number} duration 毫秒
   * @param {function} onDone
   */
  spinTo(targetNumber, duration, onDone) {
    const target = this.sectors.find((s) => s.number === targetNumber);
    if (!target) { if (onDone) onDone(); return; }

    // 目标扇区中心应停在顶部（指针处，角度 -PI/2）
    const desiredMod = ((-Math.PI / 2 - target.mid) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const currentMod = ((this.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let diff = desiredMod - currentMod;
    if (diff < 0) diff += Math.PI * 2;
    const finalRotation = this.rotation + diff + Math.PI * 2 * 5; // 至少 5 圈

    const startRotation = this.rotation;
    const startTime = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      this.rotation = startRotation + (finalRotation - startRotation) * easeOut(t);
      this.draw();
      if (t < 1) {
        this.raf = requestAnimationFrame(step);
      } else {
        this.raf = null;
        if (onDone) onDone();
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  stopSpin() {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
  }
}
