// P2 calculation cross-check: GUANCHEN engine (computeStep01, TRUE_SOLAR_TIME) vs an independent reference.
// Reference sources (all different from the engine's astronomy-engine + moment-timezone path):
//   jie instants  : tyme4ts SolarTerm (sxtwl-family algorithm, Beijing-time JD)
//   timezone      : Node built-in ICU (Intl) tz data
//   true solar    : Meeus equation of time (ch.28) + longitude, written here
//   day pillar    : Julian Day Number arithmetic, 子初换日 (23:00 true solar = next day, D-01)
// Usage (from D:\GUANCHEN_V2):  node tests/p2_calc_crosscheck.mjs [outDir]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, 'tests', 'last-p2'));
fs.mkdirSync(OUT, { recursive: true });
const E = path.join(ROOT, 'engine');
const { computeStep01 } = await import(pathToFileURL(path.join(E, 'packages/step01-production-core/facade.mjs')).href);
const { SolarTerm } = await import(pathToFileURL(path.join(E, 'node_modules/tyme4ts/dist/lib/index.mjs')).href);
const LOC = JSON.parse(fs.readFileSync(path.join(E, 'packages/step01-production-core/data/locations.v2.json'), 'utf8')).records;

const STEMS = '甲乙丙丁戊己庚辛壬癸', BRANCH = '子丑寅卯辰巳午未申酉戌亥';
const gz = i => STEMS[((i % 60) + 60) % 60 % 10] + BRANCH[((i % 60) + 60) % 60 % 12];
const idxOf = name => { for (let i = 0; i < 60; i++) if (gz(i) === name) return i; return -1; };
const MIN = 60000, DAY = 86400000;

// ---------- reference: jie (12 节) instants in UTC ms ----------
const JIE_IDX = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]; // 小寒 立春 惊蛰 清明 立夏 芒种 小暑 立秋 白露 寒露 立冬 大雪
const JIE_BRANCH = { 1: 1, 3: 2, 5: 3, 7: 4, 9: 5, 11: 6, 13: 7, 15: 8, 17: 9, 19: 10, 21: 11, 23: 0 };
const jieCache = new Map();
function jieList(year) {
  if (jieCache.has(year)) return jieCache.get(year);
  const rows = JIE_IDX.map(i => { const t = SolarTerm.fromIndex(year, i); const jd = t.getJulianDay().getDay();
    return { name: t.getName(), branch: JIE_BRANCH[i], ms: Math.round((jd - 2440587.5) * DAY) - 8 * 3600000 }; });
  jieCache.set(year, rows); return rows;
}
function allJieAround(ms) { const y = new Date(ms).getUTCFullYear(); return [y - 1, y, y + 1, y + 2].flatMap(jieList).sort((a, b) => a.ms - b.ms); }
function refYearMonth(ms) {
  const list = allJieAround(ms); let cur = null, curIdx = -1;
  list.forEach((j, k) => { if (j.ms <= ms) { cur = j; curIdx = k; } });
  // year: last 立春 <= ms
  const lichun = list.filter(j => j.name === '立春' && j.ms <= ms).at(-1);
  const lcYear = new Date(lichun.ms + 8 * 3600000).getUTCFullYear();
  const yearIdx = ((lcYear - 4) % 60 + 60) % 60;
  const k = (cur.branch - 2 + 12) % 12; // months since 寅
  const stem = ((yearIdx % 10) % 5 * 2 + 2 + k) % 10;
  let monthIdx = -1; for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === cur.branch) monthIdx = i;
  const nearest = Math.min(...list.map(j => Math.abs(j.ms - ms)));
  return { year: gz(yearIdx), yearIdx, month: gz(monthIdx), monthIdx, list, curIdx, nearestJieMin: nearest / MIN };
}

// ---------- reference: timezone via ICU ----------
function icuOffsetMin(ms, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms) / MIN);
}
function icuLocalToUtc(c, tz) {
  const naive = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, 0);
  const cands = new Set();
  for (const probe of [naive - 14 * 3600000, naive, naive + 14 * 3600000, naive - 2 * 3600000, naive + 2 * 3600000]) {
    const off = icuOffsetMin(probe, tz); const ms = naive - off * MIN; if (icuOffsetMin(ms, tz) === off) cands.add(ms);
  }
  return [...cands].sort((a, b) => a - b);
}

// ---------- reference: true solar time (Meeus EoT) ----------
function eotMinutes(ms) {
  const jd = ms / DAY + 2440587.5, T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) * Math.PI / 180;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * Math.PI / 180;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const eps = (23 + 26 / 60 + 21.448 / 3600 - (46.815 * T) / 3600) * Math.PI / 180;
  const y = Math.tan(eps / 2) ** 2;
  const E = y * Math.sin(2 * L0) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L0) - 0.5 * y * y * Math.sin(4 * L0) - 1.25 * e * e * Math.sin(2 * M);
  return E * 180 / Math.PI * 4;
}
const trueSolarMs = (ms, lon) => ms + (lon * 4 + eotMinutes(ms)) * MIN; // as a "UTC-shaped" local apparent clock

// ---------- reference: day / hour pillar ----------
function dayIdxForCivil(y, m, d) { const jdn = Math.floor(Date.UTC(y, m - 1, d) / DAY + 2440587.5 + 0.5); return ((jdn + 49) % 60 + 60) % 60; }
function refDayHour(tsMs) {
  const t = new Date(tsMs); const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate(), h = t.getUTCHours(), mi = t.getUTCMinutes(), s = t.getUTCSeconds();
  const civilDayIdx = dayIdxForCivil(y, m, d); const branch = Math.floor((h + 1) / 2) % 12;
  const dayIdx = h === 23 ? (civilDayIdx + 1) % 60 : civilDayIdx; // D-01 子初换日: 23:00 true solar starts the next day
  const stemDay = dayIdx;
  const stem = ((stemDay % 10) % 5 * 2 + branch) % 10;
  let hourIdx = -1; for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) hourIdx = i;
  const secOfDay = h * 3600 + mi * 60 + s; const border = [...Array(13)].map((_, k) => k === 0 ? 0 : (2 * k - 1) * 3600);
  const nearestHourBorderSec = Math.min(...border.map(b => Math.abs(secOfDay - b)), Math.abs(secOfDay - 86400));
  return { day: gz(dayIdx), hour: gz(hourIdx), nearestHourBorderSec };
}

// ---------- cases ----------
let seed = 20261022; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(rnd() * a.length)];
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const cases = [];
const add = (kind, loc, c, gender) => cases.push({ kind, loc, c, gender });
const toCivil = (ms, offMin) => { const t = new Date(ms + offMin * MIN); return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate(), hour: t.getUTCHours(), minute: t.getUTCMinutes() }; };
for (let i = 0; i < 700; i++) { const y = 1900 + Math.floor(rnd() * 131), m = 1 + Math.floor(rnd() * 12); add('RANDOM', pick(LOC), { year: y, month: m, day: 1 + Math.floor(rnd() * daysIn(y, m)), hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60) }, pick(['MALE', 'FEMALE'])); }
for (let y = 1930; y <= 2030; y += 1) for (const j of [jieList(y)[1], pick(jieList(y))]) for (const dMin of pick([[-3, 3], [-30, 30], [-1, 1]])) {
  const loc = pick(LOC); const off = icuOffsetMin(j.ms, loc.timezone); add('JIE_BOUNDARY', loc, toCivil(j.ms + dMin * MIN, off), pick(['MALE', 'FEMALE'])); }
for (let i = 0; i < 200; i++) { const y = 1900 + Math.floor(rnd() * 131), m = 1 + Math.floor(rnd() * 12); add('HOUR_EDGE', pick(LOC), { year: y, month: m, day: 1 + Math.floor(rnd() * daysIn(y, m)), hour: pick([22, 23, 0, 1, 10, 11, 12, 13]), minute: pick([0, 1, 2, 3, 55, 56, 57, 58, 59, 30]) }, pick(['MALE', 'FEMALE'])); }
const byCountry = c => LOC.filter(l => l.id.startsWith(c));
for (const [ys, ye, cc] of [[1941, 1945, 'my'], [1970, 1982, 'my'], [1941, 1945, 'sg'], [1970, 1982, 'sg'], [1986, 1991, 'cn'], [1919, 1949, 'cn'], [1941, 1979, 'tw'], [1941, 1979, 'hk'], [1941, 1979, 'mo'], [1980, 2030, 'tw'], [1980, 2030, 'hk'], [1980, 2030, 'mo']]) for (let i = 0; i < 25; i++) {
  const y = ys + Math.floor(rnd() * (ye - ys + 1)), m = 1 + Math.floor(rnd() * 12); add('HISTORIC_TZ', pick(byCountry(cc)), { year: y, month: m, day: 1 + Math.floor(rnd() * daysIn(y, m)), hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60) }, pick(['MALE', 'FEMALE'])); }

// ---------- run ----------
const rows = []; const stats = {};
const bump = (k) => stats[k] = (stats[k] ?? 0) + 1;
for (const k of cases) {
  const r = { kind: k.kind, loc: k.loc.id, tz: k.loc.timezone, lon: k.loc.longitude, civil: k.c, gender: k.gender };
  const core = computeStep01({ birth: { calendar: { type: 'SOLAR', date: { year: k.c.year, month: k.c.month, day: k.c.day } }, time: { hour: k.c.hour, minute: k.c.minute, second: 0 }, gender: k.gender, timeMode: 'TRUE_SOLAR_TIME' }, location: k.loc.id, asOf: { instantUTC: '2026-10-22T04:00:00.000Z' } });
  const icu = icuLocalToUtc(k.c, k.loc.timezone);
  r.engineStatus = core.status; r.icuCandidates = icu.length;
  if (core.status !== 'OK') {
    r.engineCode = core.code;
    r.verdict = (icu.length !== 1 && /AMBIGUOUS|GAP|NONEXIST|INVALID_LOCAL/i.test(core.code ?? '')) ? 'AGREE_TZ_REJECT' : (core.code === 'POST_SUPPORTED_DAYUN_RANGE' ? 'SKIP_RANGE' : 'ENGINE_REJECT_UNEXPECTED');
    bump(r.verdict); rows.push(r); continue;
  }
  if (icu.length !== 1) { r.verdict = 'TZ_AMBIGUITY_DISAGREE'; bump(r.verdict); rows.push(r); continue; }
  const ms = icu[0]; const engMs = Date.parse(core.birthInstantUTC);
  r.tzDeltaMin = (engMs - ms) / MIN; r.offsetEngine = core.utcOffsetMinutes; r.offsetIcu = icuOffsetMin(ms, k.loc.timezone);
  const ym = refYearMonth(engMs);
  const ts = trueSolarMs(engMs, k.loc.longitude);
  const engTs = Date.UTC(core.trueSolarTime.year, core.trueSolarTime.month - 1, core.trueSolarTime.day, core.trueSolarTime.hour, core.trueSolarTime.minute, Math.floor(core.trueSolarTime.second ?? 0));
  r.trueSolarDeltaSec = Math.round((engTs - ts) / 1000);
  const dh = refDayHour(engTs);                 // structure check on engine's own true solar clock
  const dhRef = refDayHour(ts);                 // fully independent clock
  r.engine = core.pillars; r.ref = { year: ym.year, month: ym.month, day: dhRef.day, hour: dhRef.hour };
  r.nearestJieMin = +ym.nearestJieMin.toFixed(2); r.nearestHourBorderSec = dhRef.nearestHourBorderSec;
  // luck
  const yang = ym.yearIdx % 2 === 0; const fwd = (yang && k.gender === 'MALE') || (!yang && k.gender === 'FEMALE');
  const list = ym.list; const target = fwd ? list.find(j => j.ms > engMs) : [...list].reverse().find(j => j.ms < engMs);
  r.luck = { engineDir: core.luck.direction, refDir: fwd ? 'FORWARD' : 'BACKWARD', engineMinutes: Math.round(core.luck.sourceIntervalMinutes), refMinutes: Math.round(Math.abs(target.ms - engMs) / MIN), engineTarget: core.luck.targetJie?.name ?? null, refTarget: target.name };
  const seqRef = Array.from({ length: core.luck.sequence.length }, (_, i) => gz(ym.monthIdx + (fwd ? i + 1 : -(i + 1))));
  r.luck.seqMatch = JSON.stringify(core.luck.sequence.map(x => x.name ?? x)) === JSON.stringify(seqRef);
  // verdicts
  const issues = [];
  // pre-1926 local mean time offsets carry seconds; ICU rounds them to whole minutes -> only >=1 min counts
  if (Math.abs(r.tzDeltaMin) >= 1) issues.push('TZ'); else if (r.tzDeltaMin !== 0) issues.push('TZ_SECONDS@LMT');
  if (core.pillars.year !== ym.year) issues.push(ym.nearestJieMin < 3 ? 'YEAR@JIE_EDGE' : 'YEAR');
  if (core.pillars.month !== ym.month) issues.push(ym.nearestJieMin < 3 ? 'MONTH@JIE_EDGE' : 'MONTH');
  if (Math.abs(r.trueSolarDeltaSec) > 60) issues.push('TRUE_SOLAR>60s');
  if (core.pillars.day !== dh.day || core.pillars.hour !== dh.hour) issues.push('DAYHOUR_RULE');
  if (core.pillars.day !== dhRef.day || core.pillars.hour !== dhRef.hour) issues.push(dhRef.nearestHourBorderSec <= 60 ? 'DAYHOUR@HOUR_EDGE' : 'DAYHOUR_INDEP');
  const dirOk = ({ FORWARD: 'FORWARD', REVERSE: 'BACKWARD' })[core.luck.direction] === r.luck.refDir;
  if (!dirOk) issues.push(ym.nearestJieMin < 3 && core.pillars.year !== ym.year ? 'LUCK_DIR@JIE_EDGE' : 'LUCK_DIR');
  if (Math.abs(r.luck.engineMinutes - r.luck.refMinutes) > 3) issues.push(ym.nearestJieMin < 3 ? 'LUCK_MIN@JIE_EDGE' : 'LUCK_MINUTES');
  if (!r.luck.seqMatch) issues.push(ym.nearestJieMin < 3 && (core.pillars.year !== ym.year || core.pillars.month !== ym.month) ? 'LUCK_SEQ@JIE_EDGE' : 'LUCK_SEQ');
  const hard = issues.filter(x => !x.includes('@'));
  r.issues = issues; r.verdict = hard.length ? 'MISMATCH' : (issues.length ? 'EDGE_ONLY' : 'MATCH');
  bump(r.verdict); for (const x of issues) bump('issue:' + x); rows.push(r);
}
const kinds = {}; for (const r of rows) { kinds[r.kind] ??= {}; kinds[r.kind][r.verdict] = (kinds[r.kind][r.verdict] ?? 0) + 1; }
const ok = rows.filter(r => r.engineStatus === 'OK' && r.icuCandidates === 1);
const summary = { schema: 'GUANCHEN_P2_CALC_CROSSCHECK/1.0.0', node: process.version, total: rows.length, stats, byKind: kinds,
  trueSolarDeltaSec: { maxAbs: Math.max(...ok.map(r => Math.abs(r.trueSolarDeltaSec))), mean: +(ok.reduce((a, r) => a + r.trueSolarDeltaSec, 0) / ok.length).toFixed(1) },
  luckMinutesDelta: { maxAbs: Math.max(...ok.map(r => Math.abs(r.luck.engineMinutes - r.luck.refMinutes))) },
  mismatches: rows.filter(r => r.verdict === 'MISMATCH' || r.verdict === 'ENGINE_REJECT_UNEXPECTED' || r.verdict === 'TZ_AMBIGUITY_DISAGREE').slice(0, 40) };
fs.writeFileSync(path.join(OUT, 'P2_ROWS.json'), JSON.stringify(rows, null, 1));
fs.writeFileSync(path.join(OUT, 'P2_SUMMARY.json'), JSON.stringify(summary, null, 1));
const { mismatches, ...head } = summary; console.log(JSON.stringify(head, null, 1)); console.log('mismatch rows:', summary.mismatches.length);
console.log(`CROSSCHECK ${summary.mismatches.length === 0 ? 'PASS' : 'FAIL'}: ${stats.MATCH} match, ${stats.EDGE_ONLY ?? 0} edge-only, ${summary.mismatches.length} real mismatches`);
process.exitCode = summary.mismatches.length ? 1 : 0;
