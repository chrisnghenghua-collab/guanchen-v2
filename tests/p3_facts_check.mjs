// P3-1 check: interpretation/facts.mjs vs the engine's own tenGod() and natal clash detection, over random KNOWN charts.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const E = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'engine');
const imp = rel => import(pathToFileURL(path.join(E, rel)).href);
const svc = await imp('legacy/server/result-request/production-result-service.mjs');
const F = await imp('interpretation/facts.mjs');
const { tenGod } = await imp('src/patternEngine.mjs');
const LOC = JSON.parse(fs.readFileSync(path.join(E, 'packages/step01-production-core/data/locations.v2.json'), 'utf8')).records;
// exhaustive ten-god table check: 10 x 10
let tgBad = 0; for (const a of F.STEMS) for (const b of F.STEMS) if (F.TEN_GOD_EN[tenGod(a, b)] !== F.tenGodOf(a, b)) tgBad++;
let seed = 5; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const pick = a => a[Math.floor(rnd() * a.length)]; const pad = x => String(x).padStart(2, '0');
let n = 0, clashBad = 0, visBad = 0, luckBad = 0; const dom = {}; const sample = [];
for (let i = 0; i < 400; i++) {
  const req = {requestType:'GUANCHEN_PRODUCT_RESULT_REQUEST',requestVersion:'1.0.0',birth:{calendar:'GREGORIAN',date:`${1950+Math.floor(rnd()*70)}-${pad(1+Math.floor(rnd()*12))}-${pad(1+Math.floor(rnd()*28))}`,timeKnowledge:'KNOWN',time:`${pad(Math.floor(rnd()*24))}:${pad(Math.floor(rnd()*60))}`,gender:pick(['MALE','FEMALE']),location:pick(LOC).id},asOfLocal:'2026-10-22T12:00:00+08:00'};
  let inp; try { inp = svc.composeProductionInputs(req); } catch { continue; } n++;
  const f = F.buildChartFacts(inp);
  for (const pos of ['year','month','hour']) if (F.TEN_GOD_EN[inp.analysis.visibleTenGods[pos]] !== f.visibleTenGods[pos]) visBad++;
  const engClash = new Set(inp.analysis.resolution.relationResolution.clashes.map(c => [c.a.position, c.b.position].map(p => p.split('_')[0].toLowerCase()).sort().join('-')));
  const myClash = new Set(f.natalRelations.filter(r => r.layer === 'branch' && r.type === '冲').map(r => [r.a, r.b].sort().join('-')));
  if ([...engClash].sort().join() !== [...myClash].sort().join()) clashBad++;
  // timing: engine marks dayun/year clashes against natal; compare presence of DAYUN-origin clash pairs
  const engLuck = new Set((inp.timingRoot.relationResolution.clashes ?? []).filter(c => c.source?.scope === 'DAYUN' || c.target?.scope === 'DAYUN').map(c => { const o = c.source.scope === 'DAYUN' ? c.target : c.source; return o.scope === 'NATAL' ? o.position.split('_')[0].toLowerCase() : 'annual'; }));
  const myLuck = new Set([...(f.dayun?.hits ?? []).filter(h => h.layer === 'branch' && h.type === '冲').map(h => h.target), ...(f.annualVsDayun.some(h => h.layer === 'branch' && h.type === '冲') ? ['annual'] : [])]);
  if (f.dayun && [...engLuck].sort().join() !== [...myLuck].sort().join()) luckBad++;
  dom[f.dominantFamily] = (dom[f.dominantFamily] ?? 0) + 1;
  if (sample.length < 2) sample.push(f);
}
console.log(JSON.stringify({ tenGodTable100: tgBad === 0 ? 'PASS' : 'FAIL ' + tgBad, charts: n, visibleTenGodMismatch: visBad, natalClashMismatch: clashBad, dayunClashMismatch: luckBad, dominantFamilyDistribution: dom }));
console.log(JSON.stringify(sample[0], null, 0).slice(0, 1500));
