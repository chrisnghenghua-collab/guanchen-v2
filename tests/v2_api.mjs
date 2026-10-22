// GUANCHEN API v2 contract test: real HTTP over node:http -> engine/netlify/functions/reading.mjs.
// Usage (from D:\GUANCHEN_V2):  node tests/v2_api.mjs           (compare chart golden)
//                               node tests/v2_api.mjs --update  (rewrite chart golden; only after an approved calculation change)
// Copy text is NOT part of the golden (Chris edits the copy table); only calculation results are.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto';
import { Readable } from 'node:stream'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), E = path.join(ROOT, 'engine');
const GOLDEN = path.join(ROOT, 'tests', 'golden', 'v2_chart_expected.json'), UPDATE = process.argv.includes('--update');
const imp = rel => import(pathToFileURL(path.join(E, rel)).href);
const fn = await imp('netlify/functions/reading.mjs');
const fnEst = await imp('netlify/functions/time-estimate.mjs');
const legacy = await imp('legacy/server/result-request/production-result-service.mjs');
const moment = (await import(pathToFileURL(path.join(E, 'node_modules/moment-timezone/index.js')).href)).default;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const server = http.createServer(async (rq, rs) => {
  try { const url = new URL(rq.url, 'http://127.0.0.1'); const target = url.pathname === '/api/v2/time-estimate' ? fnEst : fn; const res = await target.default(new Request(url, { method: rq.method, headers: rq.headers, ...(['GET', 'HEAD'].includes(rq.method) ? {} : { body: Readable.toWeb(rq), duplex: 'half' }) }));
    rs.writeHead(res.status, Object.fromEntries(res.headers)); rs.end(Buffer.from(await res.arrayBuffer())); } catch { rs.writeHead(599); rs.end('BRIDGE'); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const URL_ = `http://127.0.0.1:${server.address().port}/api/v2/reading`;
const send = (body, { method = 'POST', ct = 'application/json', raw, url = URL_ } = {}) => fetch(url, { method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': ct }, body: raw ?? JSON.stringify(body) }) });
const ASOF = '2026-10-22T12:00:00+08:00';
const req = (date, time, gender, location, extra = {}) => ({ version: 2, birth: { date, time, gender, location }, asOf: ASOF, ...extra });
const LEAK = /[A-Z]{3,}_|[A-Z]{4,}|\{\w+\}|undefined|NaN|\bnull\b|node_modules|[A-Z]:\\|\.ts\b|\.mjs\b|stack/;
const golden = fs.existsSync(GOLDEN) && !UPDATE ? JSON.parse(fs.readFileSync(GOLDEN, 'utf8')).cases : {};
const newGolden = {}, rows = [];
async function test(id, label, fnc) { const row = { id, label }; try { const problems = await fnc(row); row.problems = problems.filter(Boolean); } catch (e) { row.problems = ['EXCEPTION ' + e.message]; } row.verdict = row.problems.length ? 'FAIL' : 'PASS'; rows.push(row); }
const headersOk = r => [r.headers.get('cache-control') === 'no-store' ? null : 'CACHE', r.headers.get('x-content-type-options') === 'nosniff' ? null : 'NOSNIFF', r.headers.has('set-cookie') ? 'COOKIE' : null];
function readingChecks(p, text) {
  const out = [];
  if (LEAK.test(textOnly(p))) out.push('LEAK:' + textOnly(p).match(LEAK)[0]);
  const qs = p.domains.flatMap(d => d.questions);
  if (qs.length !== 20) out.push('QUESTION_COUNT ' + qs.length);
  for (const q of qs.filter(q => q.available)) {
    if (!q.conclusion || q.basis.length < 2 || q.advice.length < 2 || !q.reminder) out.push('THIN ' + q.id);
    if (q.basis.some(b => !b.term || !b.plain)) out.push('EMPTY_BASIS ' + q.id);
    if (new Set(q.advice).size !== q.advice.length) out.push('DUP_ADVICE ' + q.id);
  }
  return out;
}
// user-visible strings only (skip ids / codes / pillars metadata keys)
const textOnly = p => JSON.stringify(p, (k, v) => (['id', 'domain', 'gender', 'timezone', 'apiVersion', 'asOf'].includes(k) ? undefined : v));
const chartHash = p => sha(JSON.stringify({ ...p.chart, dayMaster: { ...p.chart.dayMaster, image: undefined }, overview: undefined }));
function goldenCheck(id, p) { const h = chartHash(p); newGolden[id] = h; return golden[id] && golden[id] !== h ? 'CHART_GOLDEN_MISMATCH' : (!golden[id] && !UPDATE ? 'CHART_GOLDEN_MISSING' : null); }
async function legacyParity(b) {
  const lp = legacy.requestProductionResult({ requestType: 'GUANCHEN_PRODUCT_RESULT_REQUEST', requestVersion: '1.0.0', birth: { calendar: 'GREGORIAN', date: b.birth.date, timeKnowledge: 'KNOWN', time: b.birth.time, gender: b.birth.gender, location: b.loc }, asOfLocal: ASOF });
  return lp.chart.pillars;
}
const KNOWN = [['V2-01a', '1990-03-14', '15:20', 'MALE', 'my_west_kuala_lumpur', '吉隆坡'], ['V2-01b', '1985-09-27', '08:10', 'FEMALE', 'sg_singapore', '新加坡'], ['V2-01c', '1975-02-14', '23:20', 'MALE', 'cn_north_beijing', '北京'],
  ['V2-01d', '1997-10-20', '18:50', 'FEMALE', 'tw_north_taipei', '臺北'], ['V2-01e', '2005-11-23', '07:30', 'MALE', 'hk_hong_kong', 'Hong Kong'], ['V2-01f', '1940-03-15', '09:00', 'FEMALE', 'cn_northwest_kashgar', '喀什']];
const bodies = {};
for (const [id, date, time, g, loc, name] of KNOWN) await test(id, `KNOWN ${name} ${date} ${time}`, async row => {
  const b = req(date, time, g, name); bodies[id] = b; const r = await send(b); const text = await r.text(); const p = JSON.parse(text);
  row.pillars = p.chart && Object.values(p.chart.pillars).join(' '); row.bodySha = sha(text);
  const lp = await legacyParity({ ...b, loc });
  return [r.status === 200 ? null : 'STATUS ' + r.status, ...headersOk(r), p.input.location.id === loc ? null : 'LOCATION_RESOLVE', p.timeKnown ? null : 'TIME_KNOWN',
    ['year', 'month', 'day', 'hour'].every(k => p.chart.pillars[k] === lp[k]) ? null : 'PILLARS_DIFFER_FROM_VERIFIED_CORE', p.chart.luck.dayun.length === 12 ? null : 'DAYUN_COUNT',
    ...readingChecks(p, text), p.domains.flatMap(d => d.questions).every(q => q.available) ? null : 'UNEXPECTED_UNAVAILABLE', goldenCheck(id, p)];
});
await test('V2-02', 'pre-luck infant: 18 available + 2 explained', async () => {
  const r = await send({ ...req('2025-03-01', '10:00', 'FEMALE', 'my_west_kuala_lumpur'), asOf: '2025-06-01T12:00:00+08:00' }); const p = await r.json(); const qs = p.domains.flatMap(d => d.questions);
  const un = qs.filter(q => !q.available);
  return [r.status === 200 ? null : 'STATUS', un.length === 2 && un.every(q => ['CAREER_NEXT_6M', 'WEALTH_NEXT_12M'].includes(q.id) && /起运/.test(q.unavailableReason)) ? null : 'PRE_LUCK_SET', goldenCheck('V2-02', p)];
});
await test('V2-03', 'time unknown -> 200, no chart, explained', async () => { const r = await send(req('1990-05-05', null, 'MALE', 'sg_singapore')); const p = await r.json(); return [r.status === 200 ? null : 'STATUS', p.timeKnown === false && p.chart === null && p.domains.length === 0 && /出生时辰/.test(p.message) ? null : 'SHAPE']; });
for (const [id, body, code, status = 400] of [
  ['V2-04a', req('1992-02-30', '10:00', 'MALE', '吉隆坡'), 'INVALID_DATE'], ['V2-04b', req('1990-03-14', '24:00', 'MALE', '吉隆坡'), 'INVALID_TIME'],
  ['V2-04c', { version: 2, birth: { date: '1990-03-14', time: '10:00', location: '吉隆坡' }, asOf: ASOF }, 'GENDER_REQUIRED'], ['V2-04d', req('1990-03-14', '10:00', 'MALE', '东京'), 'LOCATION_NOT_SUPPORTED'],
  ['V2-04e', { ...req('1990-03-14', '10:00', 'MALE', '吉隆坡'), debug: true }, 'UNKNOWN_FIELD'], ['V2-04f', { ...req('1990-03-14', '10:00', 'MALE', '吉隆坡'), version: 1 }, 'UNSUPPORTED_VERSION'],
  ['V2-04g', req('1990-03-14', '10:00', 'MALE', '吉隆坡', { context: { CAREER_JOB_CHANGE: 'MAYBE' } }), 'INVALID_CONTEXT'], ['V2-04h', { ...req('1990-03-14', '10:00', 'MALE', '吉隆坡'), asOf: 'tomorrow' }, 'INVALID_ASOF'],
  ['V2-04i', req('1899-12-31', '10:00', 'MALE', '吉隆坡'), 'DATE_OUT_OF_RANGE'], ['V2-04j', req('1990-03-14', '10:00', 'OTHER', '吉隆坡'), 'GENDER_REQUIRED']])
  await test(id, `invalid -> ${code}`, async () => { const r = await send(body); const p = await r.json(); return [r.status === status ? null : 'STATUS ' + r.status, p.error?.code === code ? null : 'CODE ' + p.error?.code, /[\u4e00-\u9fff]/.test(p.error?.message ?? '') ? null : 'NO_CHINESE_MESSAGE', ...headersOk(r)]; });
// V2-05 DST overlap / gap in Hong Kong, located from the pinned tzdb (no hand-typed dates)
const zone = moment.tz.zone('Asia/Hong_Kong'); let overlap = null, gap = null;
for (let i = 1; i < zone.untils.length; i++) { const at = zone.untils[i - 1], before = -zone.offsets[i - 1], after = -zone.offsets[i]; const y = new Date(at).getUTCFullYear(); if (y < 1950 || y > 1979) continue;
  const local = new Date(at + Math.min(before, after) * 60000 + 30 * 60000); const s = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}|${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
  if (after < before && !overlap) overlap = s; if (after > before && !gap) gap = s.replace(/\|(\d\d):(\d\d)/, (m, h, mm) => `|${String((+h) % 24).padStart(2, '0')}:${mm}`); }
for (const [id, s, code] of [['V2-05a', overlap, 'BIRTH_TIME_AMBIGUOUS'], ['V2-05b', gap, 'BIRTH_TIME_NOT_EXIST']]) await test(id, `HK DST ${s} -> ${code}`, async row => { row.input = s; const [d, tm] = s.split('|'); const r = await send(req(d, tm, 'MALE', '香港')); const p = await r.json(); return [r.status === 422 ? null : 'STATUS ' + r.status, p.error?.code === code ? null : 'CODE ' + p.error?.code]; });
for (const [id, label, opts, status, code] of [['V2-06a', 'GET', { method: 'GET' }, 405, 'METHOD_NOT_ALLOWED'], ['V2-06b', 'text/plain', { ct: 'text/plain' }, 415, 'UNSUPPORTED_MEDIA_TYPE'], ['V2-06c', 'malformed JSON', { raw: '{' }, 400, 'INVALID_JSON'],
  ['V2-06d', 'array body', { raw: '[]' }, 400, 'INVALID_BODY'], ['V2-06e', 'oversized', { raw: ' '.repeat(20000) }, 413, 'BODY_TOO_LARGE'], ['V2-06f', 'wrong path', { url: URL_.replace('/api/v2/reading', '/api/v2/other') }, 404, 'NOT_FOUND']])
  await test(id, label, async () => { const r = await send(req('1990-03-14', '10:00', 'MALE', '吉隆坡'), opts); const p = await r.json(); return [r.status === status ? null : 'STATUS ' + r.status, p.error?.code === code ? null : 'CODE ' + p.error?.code, status === 405 ? (r.headers.get('allow') === 'POST' ? null : 'ALLOW') : null, ...headersOk(r)]; });
await test('V2-07a', 'repeat A after B: byte-identical', async () => { const a1 = await (await send(bodies['V2-01a'])).text(); await send(bodies['V2-01b']); const a2 = await (await send(bodies['V2-01a'])).text(); return [a1 === a2 ? null : 'NOT_DETERMINISTIC']; });
await test('V2-07b', '6 concurrent different charts each match their sequential result', async () => { const ids = KNOWN.map(k => k[0]); const seq = rows.filter(r => ids.includes(r.id)).map(r => r.bodySha); const par = await Promise.all(ids.map(id => send(bodies[id]).then(r => r.text()).then(sha))); return [par.every((h, i) => h === seq[i]) ? null : 'CROSS_CONTAMINATION']; });
await test('V2-07c', 'context changes job-change advice, not the conclusion', async () => {
  const p0 = await (await send(bodies['V2-01a'])).json(), p1 = await (await send({ ...bodies['V2-01a'], context: { CAREER_JOB_CHANGE: 'OFFER_RECEIVED', CAREER_NEW_OPPORTUNITY: 'SWITCH_FIELD' } })).json();
  const q = (p, id) => p.domains[0].questions.find(x => x.id === id);
  return [q(p0, 'CAREER_JOB_CHANGE').conclusion === q(p1, 'CAREER_JOB_CHANGE').conclusion ? null : 'CONCLUSION_CHANGED', JSON.stringify(q(p0, 'CAREER_JOB_CHANGE').advice) !== JSON.stringify(q(p1, 'CAREER_JOB_CHANGE').advice) ? null : 'ADVICE_SAME', JSON.stringify(q(p0, 'CAREER_NEW_OPPORTUNITY').advice) !== JSON.stringify(q(p1, 'CAREER_NEW_OPPORTUNITY').advice) ? null : 'OPP_ADVICE_SAME'];
});
await test('V2-07d', 'different charts give different readings', async () => { const ids = KNOWN.map(k => k[0]); const set = new Set(rows.filter(r => ids.includes(r.id)).map(r => r.pillars)); return [set.size === ids.length ? null : 'PILLARS_NOT_DISTINCT']; });
await test('V2-08', 'server clock used when asOf omitted', async () => { const b = { ...bodies['V2-01a'] }; delete b.asOf; const r = await send(b); const p = await r.json(); const d = Math.abs(Date.parse(p.input.asOf) - Date.now()); return [r.status === 200 ? null : 'STATUS', d < 120000 ? null : 'ASOF_NOT_NOW ' + p.input.asOf]; });
// ---- /api/v2/time-estimate (P4 V1) ----
const EST = URL_.replace('/api/v2/reading', '/api/v2/time-estimate');
const ebirth = { date: '1990-03-14', gender: 'MALE', location: '吉隆坡' };
const est = (body, opts = {}) => send({ version: 2, birth: ebirth, asOf: ASOF, ...body }, { url: EST, ...opts });
await test('E-01', 'GET questionnaire + periods', async () => { const r = await fetch(EST); const p = await r.json(); return [r.status === 200 ? null : 'STATUS', p.questions?.length === 8 ? null : 'Q_COUNT', p.periods?.length === 10 ? null : 'PERIOD_COUNT', /出生证明/.test(p.findExactHint) ? null : 'HINT', LEAK.test(JSON.stringify(p, (k, v) => (k === 'id' || k === 'value' ? undefined : v))) ? 'LEAK' : null]; });
await test('E-02', 'UNKNOWN, no answers: 13 candidates, ranked by duration, questions offered', async () => { const r = await est({ period: 'UNKNOWN' }); const p = await r.json(); const sum = p.candidates.reduce((x, c) => x + c.percent, 0);
  return [r.status === 200 ? null : 'STATUS', p.candidateCount === 13 ? null : 'CANDS ' + p.candidateCount, Math.abs(sum - 100) < 1 ? null : 'SUM ' + sum, p.questions.length >= 1 ? null : 'NO_QUESTIONS', p.candidates.filter(c => c.recommended).length === 2 ? null : 'RECOMMENDED', /不是确定/.test(p.reminder) ? null : 'REMINDER']; });
let picked;
await test('E-03', 'answers consistent with the true chart put the true 时辰 (未) in the top 2', async () => { const r = await est({ period: 'UNKNOWN', answers: { Q_DECIDE: '比劫', Q_PRESSURE: 'balanced', Q_RHYTHM: '土', Q_CLOSE: 'none', Q_EXPRESS: 'low', Q_MONEY: 'low', Q_RULES: 'mid', Q_CARE: 'mid' } }); const p = await r.json();
  picked = p.candidates.find(c => c.label.startsWith('未')); return [r.status === 200 ? null : 'STATUS', picked && picked.rank <= 2 ? null : 'TRUE_HOUR_NOT_TOP2', /^\d\d:\d\d$/.test(picked?.fillTime ?? '') ? null : 'FILL_TIME', /性格/.test(p.note) ? null : 'CIRCULAR_NOTE']; });
await test('E-04', 'picked candidate fills a normal reading, marked as estimated', async () => { const r = await send({ version: 2, birth: { ...ebirth, time: picked.fillTime }, estimate: { label: picked.label, percent: picked.percent }, asOf: ASOF }); const p = await r.json();
  return [r.status === 200 ? null : 'STATUS', p.chart.pillars.hour === picked.label.match(/（(..)）/)[1] ? null : 'HOUR_MISMATCH', /推测时辰/.test(p.timeEstimated?.message ?? '') ? null : 'NO_ESTIMATE_NOTICE', ...readingChecks(p)]; });
await test('E-05', 'AFTERNOON offers only the questions that separate its candidates', async () => { const p = await (await est({ period: 'AFTERNOON' })).json(); return [p.candidateCount === 3 ? null : 'CANDS ' + p.candidateCount, p.questions.length > 0 && p.questions.length < 8 ? null : 'Q_NOT_ADAPTIVE ' + p.questions.length]; });
await test('E-06', 'MIDNIGHT includes the late-Zi candidate with the next day pillar', async () => { const p = await (await est({ period: 'MIDNIGHT' })).json(); return [new Set(p.candidates.map(c => c.dayPillar)).size === 2 ? null : 'NO_NEXT_DAY_CANDIDATE']; });
for (const [id, body, code] of [['E-07a', { period: 'TEATIME' }, 'INVALID_PERIOD'], ['E-07b', { period: 'UNKNOWN', answers: { Q_DECIDE: 'MAYBE' } }, 'INVALID_ANSWERS'], ['E-07c', { period: 'AROUND', around: '25:00' }, 'INVALID_AROUND'], ['E-07d', { period: 'UNKNOWN', extra: 1 }, 'UNKNOWN_FIELD']])
  await test(id, 'estimate invalid -> ' + code, async () => { const r = await est(body); const p = await r.json(); return [r.status === 400 ? null : 'STATUS ' + r.status, p.error?.code === code ? null : 'CODE ' + p.error?.code]; });
await test('E-08', 'reading rejects a malformed estimate marker', async () => { const r = await send({ version: 2, birth: { ...ebirth, time: '15:15' }, estimate: { label: '<b>x</b>', percent: 300 }, asOf: ASOF }); const p = await r.json(); return [r.status === 400 && p.error?.code === 'INVALID_ESTIMATE' ? null : 'NOT_REJECTED']; });
server.close();
if (UPDATE) { fs.writeFileSync(GOLDEN, JSON.stringify({ note: 'Hashes of the v2 chart section (calculation only, copy excluded). Regenerate with --update only after an approved calculation change.', updated: new Date().toISOString(), cases: newGolden }, null, 1) + '\n'); console.log('golden written', Object.keys(newGolden).length); }
for (const r of rows) console.log(`${r.verdict.padEnd(4)} ${r.id.padEnd(7)} ${r.label}${r.pillars ? ' | ' + r.pillars : ''}${r.problems.length ? ' | ' + r.problems.join(', ') : ''}`);
const bad = rows.filter(r => r.verdict !== 'PASS');
console.log(`V2_API ${bad.length ? 'FAIL' : 'PASS'}: ${rows.length - bad.length}/${rows.length}`); process.exitCode = bad.length ? 1 : 0;
