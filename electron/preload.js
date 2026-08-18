'use strict';

/**
 * 预加载脚本：开启 contextIsolation，最小化暴露。
 * 前端仅使用浏览器原生能力（fetch / localStorage / FileReader / Canvas），
 * 无需向渲染进程注入 Node API，因此此处保持最小实现。
 */
// 不向 window 注入任何 Node 能力，仅保留上下文隔离的安全边界。
window.addEventListener('DOMContentLoaded', () => {
  // 预留扩展点（如需桥接原生能力可在此安全暴露）
});
