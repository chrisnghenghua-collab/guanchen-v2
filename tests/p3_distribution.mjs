// P3 quality gate for v2 generators over random KNOWN charts:
// variant distribution, distinct full answers, duplicate sentences inside an answer, unfilled/English code leakage.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const E = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'engine');
const imp = rel => import(pathToFileURL(path.join(E, rel)).href);
const svc = await imp('legacy/server/result-request/production-result-service.mjs');
const { buildChartFacts } = await imp('interpretation/facts.mjs'); const { loadCopy } = await imp('interpretation/copy.mjs'); const { GENERATORS, NEEDS_ACTIVE_LUCK } = await imp('interpretation/questions.mjs');
const t = loadCopy(new URL(pathToFileURL(path.join(E, 'interpretation/copy/zh-CN.csv')).href));
const LOC = JSON.parse(fs.readFileSync(path.join(E, 'packages/step01-production-core/data/locations.v2.json'), 'utf8')).records;
const N = Number(process.argv[2] ?? 500), MAX_TOP = 0.6;
let seed = 99; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const pick = a => a[Math.floor(rnd() * a.length)]; const pad = x => String(x).padStart(2, '0');
const st = {}; const fails = []; let n = 0;
for (let i = 0; i < N; i++) {
  const req = {requestType:'GUANCHEN_PRODUCT_RESULT_REQUEST',requestVersion:'1.0.0',birth:{calendar:'GREGORIAN',date:`${1950+Math.floor(rnd()*70)}-${pad(1+Math.floor(rnd()*12))}-${pad(1+Math.floor(rnd()*28))}`,timeKnowledge:'KNOWN',time:`${pad(Math.floor(rnd()*24))}:${pad(Math.floor(rnd()*60))}`,gender:pick(['MALE','FEMALE']),location:pick(LOC).id},asOfLocal:'2026-10-22T12:00:00+08:00'};
  let inp; try { inp = svc.composeProductionInputs(req); } catch { continue; } if (!inp.core) continue; n++;
  const f = buildChartFacts(inp);
  for (const [id, gen] of Object.entries(GENERATORS)) {
    if (NEEDS_ACTIVE_LUCK.has(id) && f.luckStatus !== 'ACTIVE') continue;
    let a; try { a = gen(f, t, 'NONE'); } catch (e) { fails.push(`${id}:THROW:${e.message}`); continue; }
    const s = (st[id] ??= { variants: {}, answers: new Set(), conclusions: new Set() });
    s.variants[a.variant] = (s.variants[a.variant] ?? 0) + 1; s.answers.add(JSON.stringify(a)); s.conclusions.add(a.conclusion);
    const sentences = [a.conclusion, ...a.basis.flatMap(b => [b.term, b.plain]), ...a.advice, a.reminder];
    if (new Set(a.advice).size !== a.advice.length) fails.push(`${id}:DUP_ADVICE`);
    if (sentences.some(x => /[A-Z]{3,}|\{|\}|undefined|null/.test(x))) fails.push(`${id}:LEAK:${sentences.find(x => /[A-Z]{3,}|\{|\}|undefined|null/.test(x))}`);
    if (a.basis.length < 2 || a.advice.length < 2) fails.push(`${id}:THIN`);
  }
}
let ok = fails.length === 0;
console.log(`charts ${n}`);
for (const [id, s] of Object.entries(st)) {
  const tot = Object.values(s.variants).reduce((x, y) => x + y, 0), top = Math.max(...Object.values(s.variants)) / tot;
  if (top > MAX_TOP) ok = false;
  console.log(`${id.padEnd(28)} 结论类别 ${Object.keys(s.variants).length}｜最多占 ${Math.round(top * 100)}%｜不同完整回答 ${s.answers.size}/${tot}｜${Object.entries(s.variants).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' ')}`);
}
console.log(fails.length ? 'FAILS ' + [...new Set(fails)].slice(0, 10).join(' | ') : 'no leaks / duplicates / thin answers');
console.log(`P3_DISTRIBUTION ${ok ? 'PASS' : 'FAIL'}`); process.exitCode = ok ? 0 : 1;
