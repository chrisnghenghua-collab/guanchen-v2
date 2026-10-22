// Loads copy/zh-CN.csv (columns: key,文本,说明). Missing keys or unfilled {placeholders} throw: never ship half a sentence.
import fs from 'node:fs';
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
export function loadCopy(url = new URL('./copy/zh-CN.csv', import.meta.url)) {
  const rows = parseCsv(fs.readFileSync(url, 'utf8'));
  const [head, ...body] = rows;
  if (head[0] !== 'key' || head[1] !== '文本') throw new Error('COPY_TABLE_HEADER');
  const map = new Map();
  for (const [key, text] of body) { const k = key.trim(); if (!k) continue; if (map.has(k)) throw new Error('COPY_DUPLICATE_KEY:' + k); map.set(k, text.trim()); }
  const t = (key, vars = {}) => {
    if (!map.has(key)) throw new Error('COPY_MISSING_KEY:' + key);
    const out = map.get(key).replace(/\{(\w+)\}/g, (m, v) => { if (!(v in vars)) throw new Error(`COPY_UNFILLED:${key}:{${v}}`); return vars[v]; });
    return out;
  };
  t.has = key => map.has(key); t.size = map.size;
  return t;
}
