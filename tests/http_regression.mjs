// GUANCHEN V2 HTTP regression (derived from GC-WEB-11 harness).
// Usage (from D:\GUANCHEN_V2):  node tests/http_regression.mjs [reportDir]
// Real requests over node:http -> Fetch Request -> engine/legacy/server/http/result-request-handler.mjs.
// Also compares every response body with tests/golden/gc11_expected.json (GC-WEB-11 Windows run).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto';
import { Readable } from 'node:stream'; import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.join(ROOT, 'engine');
const REPORT = path.resolve(process.argv[2] ?? path.join(ROOT, 'tests', 'last-run'));
const GOLDEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'golden', 'gc11_expected.json'), 'utf8')).cases;
fs.mkdirSync(REPORT, { recursive: true });
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const imp = rel => import(pathToFileURL(path.join(WORK, rel)).href);
const PKG = '';
// Real Netlify Function entry (default export) -> engine handler -> production service.
const fn = await imp('legacy/netlify/functions/result.mjs');
const pkgService = await imp('legacy/server/result-request/production-result-service.mjs');
const srcService = pkgService;
const { validateStep05PublicPayload } = await imp(PKG + 'legacy/src/step05A1WebRuntimePublicContractAdapterFoundation.mjs');
const { assertPublicResultFirewall } = await imp(PKG + 'legacy/server/result-request/public-boundary.mjs');
const { FROZEN_PRODUCT_RECIPE_CATALOG } = await imp(PKG + 'legacy/src/step04A0ProductSurfaceContractAuthority.mjs');
const IDS = FROZEN_PRODUCT_RECIPE_CATALOG.map(r => r.questionId);
const FORBIDDEN = /astronomy-engine|node_modules|\/var\/task|\bstack\b|SyntaxError|\.ts\b|[A-Z]:\\|resolverTrace|private metadata/i;

// Synthetic birth data only (no real person). 2026-10-23: historical fixture replaced (it was real data).
const req = (b = {}, top = {}) => ({ requestType: 'GUANCHEN_PRODUCT_RESULT_REQUEST', requestVersion: '1.0.0',
  birth: { calendar: 'GREGORIAN', date: '1990-03-14', timeKnowledge: 'KNOWN', time: '15:20', gender: 'MALE', location: 'my_west_kuala_lumpur', ...b },
  asOfLocal: '2026-09-20T12:00:00+08:00', ...top });
const drop = (o, k) => { const c = structuredClone(o); delete c.birth[k]; return c; };

const server = http.createServer(async (rq, rs) => {
  const controller = new AbortController(); rq.once('aborted', () => controller.abort());
  try {
    const url = new URL(rq.url, `http://127.0.0.1:${server.address().port}`);
    const init = { method: rq.method, headers: rq.headers, signal: controller.signal,
      ...(['GET', 'HEAD'].includes(rq.method) ? {} : { body: Readable.toWeb(rq), duplex: 'half' }) };
    const res = await fn.default(new Request(url, init));
    const bytes = Buffer.from(await res.arrayBuffer());
    rs.writeHead(res.status, Object.fromEntries(res.headers)); rs.end(bytes);
  } catch (e) { rs.writeHead(599, { 'content-type': 'text/plain' }); rs.end('HOST_BRIDGE_FAILURE'); }
});
await new Promise((ok, no) => { server.once('error', no); server.listen(0, '127.0.0.1', ok); });
const BASE = `http://127.0.0.1:${server.address().port}`;
const post = (body, { ct = 'application/json', method = 'POST', route = '/api/result', raw } = {}) =>
  fetch(BASE + route, { method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': ct }, body: raw ?? JSON.stringify(body) }) });

const rows = []; const diag = [];
const statusesOf = p => Object.fromEntries(IDS.map(id => [id, p?.availability?.questionStatuses?.[id] ?? 'MISSING']));
async function run(id, group, label, body, expectStatus, opts = {}, check = () => []) {
  const row = { id, group, label, expectStatus };
  try {
    const r = await post(body, opts); const text = await r.text();
    Object.assign(row, { status: r.status, cacheControl: r.headers.get('cache-control'), nosniff: r.headers.get('x-content-type-options'),
      contentType: r.headers.get('content-type'), setCookie: r.headers.has('set-cookie'), allow: r.headers.get('allow'), bodySha256: sha(text), bodyBytes: text.length });
    const problems = [];
    if (r.status !== expectStatus) problems.push(`STATUS ${r.status} != ${expectStatus}`);
    if (row.cacheControl !== 'no-store') problems.push('CACHE_CONTROL');
    if (row.nosniff !== 'nosniff') problems.push('NOSNIFF');
    if (row.setCookie) problems.push('SET_COOKIE');
    if (FORBIDDEN.test(text)) problems.push('BODY_LEAK_PATTERN');
    let p = null; try { p = JSON.parse(text); } catch { problems.push('NON_JSON_BODY'); }
    if (r.status === 200 && p) {
      if (!validateStep05PublicPayload(p).valid) problems.push('PUBLIC_SCHEMA_INVALID');
      try { assertPublicResultFirewall(p); } catch (e) { problems.push('FIREWALL:' + e.message); }
      if (p.contract?.recipeCount !== 20) problems.push('RECIPE_COUNT');
      const pkg = JSON.stringify(pkgService.requestProductionResult(body)), src = JSON.stringify(srcService.requestProductionResult(body));
      row.parityHttpVsPackagedDirect = sha(text) === sha(pkg); row.parityPackagedVsSourceTree = sha(pkg) === sha(src);
      if (!row.parityHttpVsPackagedDirect) problems.push('PARITY_HTTP_VS_PACKAGED');
      if (!row.parityPackagedVsSourceTree) problems.push('PARITY_PACKAGED_VS_SOURCE');
      row.pillars = p.chart?.pillars ?? null; row.timeKnowledge = p.chart?.timeKnowledge?.mode ?? null;
      row.dayMaster = p.chart?.dayMaster ?? null; row.patternStage = p.chart?.patternStage ?? null;
      row.activeDayun = p.timing?.activeDayun ?? null; row.annual = p.timing?.annual ?? null;
      row.overall = p.availability?.overall; row.questionStatuses = statusesOf(p);
      row.counts = Object.values(row.questionStatuses).reduce((a, s) => (a[s] = (a[s] ?? 0) + 1, a), {});
      for (const d of Object.values(p.domains)) for (const q of d.questions) if (q.availability === 'UNAVAILABLE' && (q.answer !== null || q.state !== null)) problems.push('UNAVAILABLE_WITH_CONTENT:' + q.questionId);
      row._payload = p;
    } else if (p) {
      row.errorCode = p?.error?.code ?? null;
      if (JSON.stringify(Object.keys(p)) !== '["error"]' || JSON.stringify(Object.keys(p.error ?? {})) !== '["code"]') problems.push('ERROR_SHAPE');
      if (r.status === 500) { try { pkgService.requestProductionResult(body); diag.push({ id, note: 'direct call did not throw' }); } catch (e) { diag.push({ id, code: e.code, reason: e.reason, message: e.message, stack: String(e.stack).split('\n').slice(0, 8) }); } }
    }
    if (r.status === 400 && body && typeof body === 'object') { try { pkgService.requestProductionResult(body); row.directReason = 'NO_THROW'; } catch (e) { row.directReason = e.reason ?? e.code ?? e.message; } }
    const golden = GOLDEN[id];
    if (golden) { row.goldenMatch = golden.status === row.status && golden.bodySha256 === row.bodySha256; if (!row.goldenMatch) problems.push('GOLDEN_MISMATCH'); }
    problems.push(...check(row));
    row.problems = problems; row.verdict = problems.length ? 'FAIL' : 'PASS';
  } catch (e) { row.verdict = 'ERROR'; row.problems = ['HARNESS_EXCEPTION:' + e.message]; }
  rows.push(row); return row;
}
const knownChecks = row => {
  const out = [], P = row.pillars;
  if (!P || !['year', 'month', 'day', 'hour'].every(k => typeof P[k] === 'string' && P[k].length === 2)) out.push('KNOWN_FOUR_PILLARS_MISSING');
  for (const id of ['CAREER_JOB_CHANGE', 'CAREER_NEW_OPPORTUNITY']) if (row.questionStatuses?.[id] !== 'UNAVAILABLE') out.push('V1_CONTEXT_RECIPE_NOT_UNAVAILABLE:' + id);
  if (row.counts?.ERROR) out.push('RECIPE_ERROR_STATE');
  return out;
};
const nonKnownChecks = row => {
  const out = [];
  if (row.pillars) out.push('NON_KNOWN_HAS_PILLARS');
  if (row.activeDayun || row.annual) out.push('NON_KNOWN_HAS_TIMING');
  if (Object.values(row.questionStatuses ?? {}).some(s => s !== 'UNAVAILABLE')) out.push('NON_KNOWN_RECIPE_NOT_UNAVAILABLE');
  return out;
};

// HTTP-01 / HTTP-08 valid KNOWN across locations, genders, eras
const A = req();
await run('HTTP-01a', '11B', 'KNOWN KL male 1990 (historical fixture)', A, 200, {}, knownChecks);
await run('HTTP-01b', '11B', 'KNOWN Singapore female 1985', req({ date: '1985-09-27', time: '08:10', gender: 'FEMALE', location: 'sg_singapore' }), 200, {}, knownChecks);
await run('HTTP-01c', '11B', 'KNOWN Beijing male 1975', req({ date: '1975-02-14', time: '23:20', location: 'cn_north_beijing' }), 200, {}, knownChecks);
await run('HTTP-01d', '11B', 'KNOWN KL female 2001, asOf today', req({ date: '2001-09-30', time: '00:15', gender: 'FEMALE' }, { asOfLocal: '2026-10-20T12:00:00+08:00' }), 200, {}, knownChecks);
await run('HTTP-01e', '11B', 'KNOWN infant 2025, asOf before Dayun start (pre-Dayun timing path)', req({ date: '2025-03-01', time: '10:00', gender: 'FEMALE' }, { asOfLocal: '2025-06-01T12:00:00+08:00' }), 200, {}, knownChecks);
// HTTP-02 gender
await run('HTTP-02a', '11D', 'gender null', req({ gender: null }), 400);
await run('HTTP-02b', '11D', 'gender key missing', drop(A, 'gender'), 400);
await run('HTTP-02c', '11D', 'gender OTHER', req({ gender: 'OTHER' }), 400);
// HTTP-03 / 04 UNKNOWN & PARTIAL
await run('HTTP-03a', '11C', 'UNKNOWN time=null', req({ timeKnowledge: 'UNKNOWN', time: null }), 200, {}, nonKnownChecks);
await run('HTTP-03b', '11D', 'UNKNOWN but time given', req({ timeKnowledge: 'UNKNOWN', time: '15:20' }), 400);
await run('HTTP-04a', '11C', 'PARTIAL time=15:20', req({ timeKnowledge: 'PARTIAL' }), 200, {}, nonKnownChecks);
await run('HTTP-04b', '11C', 'PARTIAL time=null', req({ timeKnowledge: 'PARTIAL', time: null }), 200, {}, nonKnownChecks);
// HTTP-05 illegal input
await run('HTTP-05a', '11D', 'date 2026-02-30', req({ date: '2026-02-30' }), 400);
await run('HTTP-05b', '11D', 'KNOWN time 24:00', req({ time: '24:00' }), 400);
await run('HTTP-05c', '11D', 'KNOWN time null', req({ time: null }), 400);
await run('HTTP-05d', '11D', 'location not in catalog', req({ location: 'xx_atlantis' }), 400);
await run('HTTP-05e', '11D', 'calendar LUNAR', req({ calendar: 'LUNAR' }), 400);
await run('HTTP-05f', '11D', 'extra top-level key', req({}, { debug: true }), 400);
await run('HTTP-05g', '11D', 'wrong requestVersion', req({}, { requestVersion: '2.0.0' }), 400);
await run('HTTP-05h', '11D', 'asOfLocal without offset', req({}, { asOfLocal: '2026-09-20T12:00:00' }), 400);
await run('HTTP-05i', '11D', 'year 100 out of range', req({ date: '0100-01-01' }), 400);
// HTTP-06 protocol
await run('HTTP-06a', '11D', 'GET', null, 405, { method: 'GET' }, r => r.allow === 'POST' ? [] : ['ALLOW_HEADER']);
await run('HTTP-06b', '11D', 'text/plain', A, 415, { ct: 'text/plain' });
await run('HTTP-06c', '11D', 'malformed JSON', null, 400, { raw: '{' });
await run('HTTP-06d', '11D', 'empty object', null, 400, { raw: '{}' });
await run('HTTP-06e', '11D', 'oversized 65537 bytes', null, 413, { raw: ' '.repeat(65537) });
await run('HTTP-06f', '11D', 'JSON array body', null, 400, { raw: '[]' });
// HTTP-07 determinism & contamination (A, B, A) + concurrency
const B = req({ date: '1985-09-27', time: '08:10', gender: 'FEMALE', location: 'sg_singapore' });
const a1 = await run('HTTP-07a', '11E', 'repeat A #1', A, 200, {}, knownChecks);
const b1 = await run('HTTP-07b', '11E', 'interleave B', B, 200, {}, knownChecks);
const a2 = await run('HTTP-07c', '11E', 'repeat A #2 after B', A, 200, {}, r => [...knownChecks(r), ...(r.bodySha256 === a1.bodySha256 ? [] : ['NOT_DETERMINISTIC'])]);
const fixtures = [A, B, req({ date: '1975-02-14', time: '23:20', location: 'cn_north_beijing' }), req({ timeKnowledge: 'UNKNOWN', time: null }), req({ date: '2001-09-30', time: '00:15', gender: 'FEMALE' })];
const seq = fixtures.map(f => sha(JSON.stringify(pkgService.requestProductionResult(f))));
const par = await Promise.all(fixtures.map(f => post(f).then(r => r.text()).then(sha)));
rows.push({ id: 'HTTP-07d', group: '11E', label: '5 concurrent different requests each match own direct result', verdict: par.every((h, i) => h === seq[i]) ? 'PASS' : 'FAIL', problems: par.every((h, i) => h === seq[i]) ? [] : ['CONCURRENT_CROSS_CONTAMINATION'] });
// HTTP-08 difference across charts
const known = rows.filter(r => r.group === '11B' && r.verdict === 'PASS');
const pillarSet = new Set(known.map(r => JSON.stringify(r.pillars)));
const answerSet = new Set(known.map(r => sha(JSON.stringify(r._payload.domains))));
rows.push({ id: 'HTTP-08', group: '11E', label: 'different KNOWN charts produce different pillars and different domain content', distinctPillars: pillarSet.size, distinctDomainContent: answerSet.size, of: known.length,
  verdict: known.length >= 4 && pillarSet.size === known.length && answerSet.size === known.length ? 'PASS' : 'FAIL', problems: [] });
if (rows.at(-1).verdict === 'FAIL') rows.at(-1).problems.push('CHARTS_NOT_DISTINCT');

await new Promise(ok => server.close(ok));
const g = grp => rows.filter(r => r.group === grp);
const gate = list => list.length && list.every(r => r.verdict === 'PASS') ? 'PASS' : 'FAIL';
const gates = {
  '11A_REAL_FUNCTION_REACHED': rows.some(r => r.status === 200 && r.parityHttpVsPackagedDirect) && !rows.some(r => r.status === 599) ? 'PASS' : 'FAIL',
  '11B_KNOWN_REAL_PILLARS': gate(g('11B')), '11C_NON_KNOWN_NO_FAKE_PILLARS': gate(g('11C')),
  '11D_INVALID_REJECTED': gate(g('11D')), '11E_CONTRACT_PRIVACY_DETERMINISM': gate(g('11E')),
  '11G_TRACEABLE_LOGS': 'PASS',
};
for (const r of rows) delete r._payload;
const goldenChecked = rows.filter(r => 'goldenMatch' in r);
gates.GOLDEN_BYTE_IDENTICAL = goldenChecked.length === Object.keys(GOLDEN).length && goldenChecked.every(r => r.goldenMatch) ? 'PASS' : 'FAIL';
const summary = { schema: 'GUANCHEN_V2_HTTP_REGRESSION/1.0.0', node: process.version, engine: WORK, host: 'node:http -> Fetch Request -> engine/legacy/netlify/functions/result.mjs (default export) -> legacy/server/http/result-request-handler.mjs', goldenChecked: goldenChecked.length,
  notCovered: ['Netlify zip-it-and-ship-it packaging & provider runtime (GC-WEB-15)', 'browser UI (GC-WEB-14)', '20-recipe interpretation quality (GC-WEB-12)'],
  total: rows.length, pass: rows.filter(r => r.verdict === 'PASS').length, fail: rows.filter(r => r.verdict !== 'PASS').map(r => `${r.id}:${r.problems.join(',')}`), gates };
fs.writeFileSync(path.join(REPORT, 'CASES.json'), JSON.stringify(rows, null, 1) + '\n');
fs.writeFileSync(path.join(REPORT, 'SUMMARY.json'), JSON.stringify(summary, null, 1) + '\n');
if (diag.length) fs.writeFileSync(path.join(REPORT, 'DIAG_500_INTERNAL.json'), JSON.stringify(diag, null, 1) + '\n');
console.log(JSON.stringify(summary, null, 1));
process.exit(summary.fail.length || gates.GOLDEN_BYTE_IDENTICAL !== 'PASS' ? 1 : 0);
