'use strict';

/**
 * 生成示例导入模板：docs/template.csv 与 docs/示例模板.xlsx
 * 第一列数字、第二列权重（缺失默认 1）。
 */
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const root = path.join(__dirname, '..');
const docsDir = path.join(root, 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

// CSV（带 BOM，Excel 打开中文不乱码）
const csvHeader = '数字,权重';
const csvRows = [
  [1, 10],
  [2, 20],
  [3, 30],
  [4, 15],
  [5, 25],
];
const csvContent = '﻿' + csvHeader + '\n' + csvRows.map((r) => r.join(',')).join('\n') + '\n';
fs.writeFileSync(path.join(docsDir, 'template.csv'), csvContent, 'utf-8');
console.log('[gen-template] 已生成 docs/template.csv');

// XLSX
const wsData = [['数字', '权重'], ...csvRows];
const ws = xlsx.utils.aoa_to_sheet(wsData);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, '示例模板');
xlsx.writeFile(wb, path.join(docsDir, '示例模板.xlsx'));
console.log('[gen-template] 已生成 docs/示例模板.xlsx');
