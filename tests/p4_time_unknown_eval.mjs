// P4 evaluation: for a birth DATE with unknown time, how much do chart and readings change across the candidate hours?
// Candidates: every 时辰 the civil day can map to under 真太阳时 + 子初换日 (usually 13 slots incl. the late-Zi slot = next day pillar).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), E = path.join(ROOT, 'engine');
const imp = rel => import(pathToFileURL(path.join(E, rel)).href);
const { createReading } = await imp('api/reading-service.mjs');
const LOC = JSON.parse(fs.readFileSync(path.join(E, 'packages/step01-production-core/data/locations.v2.json'), 'utf8')).records;
const N = Number(process.argv[2] ?? 200);
let seed = 4242; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const pick = a => a[Math.floor(rnd() * a.length)]; const pad = x => String(x).padStart(2, '0');
const qStat = {}, out = { dates: 0, candidates: [], dayPillarVariants: [], strengthVariants: [], familyVariants: [], profileVariants: [], hourAffectsYearMonth: 0 };
const variantOf = q => q.available ? q.conclusion : 'UNAVAILABLE';
for (let i = 0; i < N; i++) {
  const date = `${1950 + Math.floor(rnd() * 70)}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`, gender = pick(['MALE', 'FEMALE']), loc = pick(LOC).id;
  // every 10 minutes of the civil day; keep one reading per distinct (day pillar, hour pillar)
  const slots = new Map(), slotMinute = new Map();
  for (let m = 0; m < 1440; m += 10) {
    let r; try { r = createReading({ version: 2, birth: { date, time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, gender, location: loc }, asOf: '2026-10-22T12:00:00+08:00' }); } catch { continue; }
    const k = r.chart.pillars.day + r.chart.pillars.hour;
    if (!slots.has(k)) { slots.set(k, r); slotMinute.set(k, m); }
  }
  if (slots.size < 2) continue;
  out.dates++; const rs = [...slots.values()];
  out.candidates.push(rs.length);
  out.dayPillarVariants.push(new Set(rs.map(r => r.chart.pillars.day)).size);
  if (new Set(rs.map(r => r.chart.pillars.year + r.chart.pillars.month)).size > 1) out.hourAffectsYearMonth++;
  out.strengthVariants.push(new Set(rs.map(r => r.chart.strength)).size);
  out.familyVariants.push(new Set(rs.map(r => r.chart.overview[1].term.split('（')[0])).size);
  // "profile" = what a self-report questionnaire could in principle tell apart: dominant family x strength group x top element
  const top = r => Object.entries(r.chart.elements).sort((a, b) => b[1] - a[1])[0][0];
  out.profileVariants.push(new Set(rs.map(r => r.chart.overview[1].term.split('（')[0] + r.chart.strength + top(r))).size);
  const mins = [...slotMinute.values()];
  // scenario A: user knows a 6-hour period (凌晨 0-6 / 上午 6-12 / 下午 12-18 / 晚上 18-24) -> candidates whose civil start falls inside
  // scenario B: a questionnaire narrows to 2 adjacent 时辰
  const groupsA = [0, 360, 720, 1080].map(st => rs.filter((_, k) => mins[k] >= st && mins[k] < st + 360)).filter(g => g.length);
  const groupsB = rs.slice(0, -1).map((_, k) => [rs[k], rs[k + 1]]);
  for (const d of rs[0].domains) for (const q of d.questions) {
    const val = r => variantOf(r.domains.find(x => x.domain === d.domain).questions.find(x => x.id === q.id));
    const s2 = (qStat[q.id] ??= { robust: 0, distinct: [] }); s2.a ??= [0, 0]; s2.b ??= [0, 0];
    for (const g of groupsA) { s2.a[1]++; if (new Set(g.map(val)).size === 1) s2.a[0]++; }
    for (const g of groupsB) { s2.b[1]++; if (new Set(g.map(val)).size === 1) s2.b[0]++; }
  }
  for (const d of rs[0].domains) for (const q of d.questions) {
    const vals = rs.map(r => variantOf(r.domains.find(x => x.domain === d.domain).questions.find(x => x.id === q.id)));
    const s = (qStat[q.id] ??= { robust: 0, distinct: [] });
    const distinct = new Set(vals).size; s.distinct.push(distinct); if (distinct === 1) s.robust++;
  }
}
const avg = a => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
const hist = a => a.reduce((h, v) => (h[v] = (h[v] ?? 0) + 1, h), {});
console.log(JSON.stringify({ dates: out.dates, candidatesPerDate: { avg: avg(out.candidates), hist: hist(out.candidates) }, dayPillarVariants: hist(out.dayPillarVariants),
  yearOrMonthPillarChangesWithinDay: out.hourAffectsYearMonth, strengthBandVariants: { avg: avg(out.strengthVariants), hist: hist(out.strengthVariants) },
  dominantFamilyVariants: { avg: avg(out.familyVariants), hist: hist(out.familyVariants) }, questionnaireDistinguishableProfiles: { avg: avg(out.profileVariants), hist: hist(out.profileVariants) } }, null, 1));
console.log('\nper question: % of dates where the conclusion is the SAME for every candidate hour | avg distinct conclusions across candidates');
console.log('(columns: all candidates | known 6-hour period | 2 adjacent 时辰)');
for (const [id, s] of Object.entries(qStat)) console.log(id.padEnd(31), String(Math.round(s.robust / out.dates * 100)).padStart(3) + '%', ' | ' + String(Math.round(s.a[0] / s.a[1] * 100)).padStart(3) + '%', ' | ' + String(Math.round(s.b[0] / s.b[1] * 100)).padStart(3) + '%');
const mean = k => avg(Object.values(qStat).map(s => k === 'all' ? s.robust / out.dates * 100 : s[k][0] / s[k][1] * 100));
console.log('AVERAGE over 20 questions'.padEnd(31), mean('all') + '%', ' | ' + mean('a') + '%', ' | ' + mean('b') + '%');
