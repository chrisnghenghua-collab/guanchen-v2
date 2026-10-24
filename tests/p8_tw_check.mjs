// P8-4 check: 繁体（台湾正体）conversion used by the website (engine/public/assets/zh-tw.js + zh-tw-data.json).
// 1. 干支 characters never change; 2. key 命理 terms convert as reviewed; 3. 60 sample readings leave no Simplified character;
// 4. the table is up to date with the site's text (otherwise: python tools\gen_zh_tw.py). Read-only.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), E = path.join(ROOT, 'engine');
const { makeConverter } = await import(pathToFileURL(path.join(E, 'public/assets/zh-tw.js')).href);
const data = JSON.parse(fs.readFileSync(path.join(E, 'public/assets/zh-tw-data.json'), 'utf8'));
const T = makeConverter(data);
const problems = []; let checks = 0;
const eq = (what, a, b) => { checks++; if (a !== b) problems.push(`${what}: ${a} ≠ ${b}`); };
// 1
for (const ch of '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水') eq('干支 ' + ch, T(ch), ch);
// 2 (reviewed 2026-10-24)
const TERMS = { 天干: '天干', 藏干: '藏干', '年干·时干': '年干·時干', 乙丑: '乙丑', 丑未冲: '丑未沖', 六冲: '六沖', 冲日支: '沖日支', 冲月令: '沖月令', 冲太岁: '沖太歲',
  天克地冲: '天剋地沖', 冲到日柱: '沖到日柱', 容易冲动: '容易衝動', 避免冲突: '避免衝突', 不宜硬冲: '不宜硬衝', 缓冲: '緩衝', 劫财: '劫財', 七杀: '七殺', 伤官: '傷官',
  临官: '臨官', 长生: '長生', 天乙贵人: '天乙貴人', 红鸾: '紅鸞', 禄神: '祿神', 丧门: '喪門', 吊客: '弔客', 后五年: '後五年', 运里出现: '運裡出現', 生于: '生於',
  真太阳时: '真太陽時', 节气: '節氣', 说明与隐私: '說明與隱私', 规律吃饭: '規律吃飯', 斗湖: '斗湖', 划不划算: '划不划算', 钟表: '鐘錶', 合伙: '合夥', 还是只是: '還是只是', 组织里: '組織裡', 了解: '了解' };
for (const [k, v] of Object.entries(TERMS)) eq('TERM ' + k, T(k), v);
// 3
// converted text must be stable: converting it a second time changes nothing (otherwise something was left in Simplified)
const firstDiff = (a, b) => { let k = 0; while (k < a.length && a[k] === b[k]) k++; return k; };
const H = await import(pathToFileURL(path.join(E, 'api/http-handler.mjs')).href);
const LOC = JSON.parse(fs.readFileSync(path.join(E, 'packages/step01-production-core/data/locations.v2.json'), 'utf8')).records;
let seed = 5; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const pad = x => String(x).padStart(2, '0');
const left = new Map();
const scan = (v, where) => { if (typeof v === 'string') { const o = T(v), o2 = T(o); if (o2 !== o) { const k = firstDiff(o, o2); const ch = o[k]; if (!left.has(ch)) left.set(ch, where + '：' + o.slice(Math.max(0, k - 8), k + 12)); } }
  else if (Array.isArray(v)) v.forEach(x => scan(x, where)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!['id', 'timezone', 'asOf'].includes(k)) scan(x, where); };
for (let i = 0; i < 60; i++) {
  const body = { version: 2, birth: { date: `${1940 + Math.floor(rnd() * 80)}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`, time: `${pad(Math.floor(rnd() * 24))}:${pad(Math.floor(rnd() * 60))}`, gender: rnd() < .5 ? 'MALE' : 'FEMALE', location: LOC[Math.floor(rnd() * LOC.length)].id }, asOf: '2026-10-24T12:00:00+08:00' };
  const r = await H.handleReadingRequest(new Request('http://l/api/v2/reading', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  scan(await r.json(), 'reading');
}
scan(await (await H.handleEstimateRequest(new Request('http://l/api/v2/time-estimate'))).json(), 'questionnaire');
const appText = fs.readFileSync(path.join(E, 'public/assets/app.js'), 'utf8').match(/[一-鿿][^`'"<>${}]*/g) ?? [];
scan(appText, 'page');
checks++; if (left.size) problems.push('SIMPLIFIED_LEFT ' + [...left.entries()].slice(0, 8).map(([c, w]) => `${c}（${w}）`).join('；'));
// 4: every OpenCC phrase that occurs in the site's fixed text must be in the table
const corpus = [path.join(E, 'interpretation/copy/zh-CN.csv'), path.join(E, 'public/assets/app.js')].map(f => fs.readFileSync(f, 'utf8')).join('\n');
const missing = [];
for (const line of fs.readFileSync(path.join(ROOT, 'tools/opencc/STPhrases.txt'), 'utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue; const k = line.split('\t')[0];
  if (corpus.includes(k) && !Object.hasOwn(data.p, k)) missing.push(k);
}
checks++; if (missing.length) problems.push(`ZH_TW_DATA_STALE (${missing.length} phrases, e.g. ${missing.slice(0, 5).join('、')}): run python tools\\gen_zh_tw.py`);
console.log(problems.length ? 'P8_TW FAIL: ' + problems.join('; ') : `P8_TW PASS (${checks} checks: 干支 unchanged, ${Object.keys(TERMS).length} reviewed terms, 60 readings + questionnaire + page text fully converted, table up to date)`);
process.exit(problems.length ? 1 : 0);
