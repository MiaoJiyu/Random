'use strict';

/**
 * 将 node_modules 中的 echarts / xlsx UMD 产物拷贝到 public/vendor，
 * 使前端离线可用（不依赖 CDN）。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vendorDir = path.join(root, 'public', 'vendor');

const targets = [
  {
    name: 'echarts.min.js',
    candidates: [
      path.join(root, 'node_modules', 'echarts', 'dist', 'echarts.min.js'),
    ],
  },
  {
    name: 'xlsx.full.min.js',
    candidates: [
      path.join(root, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'),
      path.join(root, 'node_modules', 'xlsx', 'dist', 'xlsx.core.min.js'),
    ],
  },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(vendorDir);

let okCount = 0;
for (const t of targets) {
  let copied = false;
  for (const src of t.candidates) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(vendorDir, t.name));
      console.log(`[copy-vendor] ${t.name} <- ${path.relative(root, src)}`);
      copied = true;
      okCount++;
      break;
    }
  }
  if (!copied) {
    console.warn(`[copy-vendor] 警告：未找到 ${t.name} 的源文件，跳过（请确认依赖已安装）。`);
  }
}

console.log(`[copy-vendor] 完成，${okCount}/${targets.length} 个 vendor 文件就绪。`);
