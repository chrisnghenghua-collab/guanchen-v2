// P5/P8: checks a deployed site against this local engine (P8 2026-10-24: + page files, security headers, counters, 404). Usage: node tests\p5_live_check.mjs https://<site>.netlify.app
// Read-only: sends a few requests with fictional birth data, compares the live answers with the same request run locally.
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const E = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'engine');
const imp = rel => import(pathToFileURL(path.join(E, rel)).href);
const H = await imp('api/http-handler.mjs');
const BASE = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(BASE)) { console.log('P5_LIVE FAIL: give the site address, e.g. node tests\\p5_live_check.mjs https://xxx.netlify.app'); process.exit(1); }
const ASOF = '2026-10-23T12:00:00+08:00';
const birth = { date: '1990-03-14', time: '15:20', gender: 'MALE', location: '吉隆坡' };
const rows = [];
const check = async (id, label, fn) => { let p; try { p = (await fn()).filter(Boolean); } catch (e) { p = ['EXCEPTION ' + e.message]; } rows.push({ id, label, p }); console.log((p.length ? 'FAIL ' : 'PASS ') + id.padEnd(5) + label + (p.length ? '  | ' + p.join(', ') : '')); };
const live = (route, body) => fetch(BASE + route, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const local = (route, body) => { const req = new Request('http://local' + route, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return route.endsWith('time-estimate') ? H.handleEstimateRequest(req) : H.handleReadingRequest(req); };
const same = async (route, body) => { const [a, b] = await Promise.all([live(route, body), local(route, body)]); const [ta, tb] = [await a.text(), await b.text()];
  return [a.status === b.status ? null : `STATUS live ${a.status} / local ${b.status}`, ta === tb ? null : 'LIVE_DIFFERS_FROM_LOCAL', a.headers.get('cache-control') === 'no-store' ? null : 'CACHE_HEADER']; };
await check('L-01', 'home page opens', async () => { const r = await fetch(BASE + '/'); const t = await r.text(); return [r.status === 200 ? null : 'STATUS ' + r.status, t.includes('观辰') ? null : 'NOT_GUANCHEN_PAGE']; });
await check('L-02', 'questionnaire (GET time-estimate) identical to local', () => same('/api/v2/time-estimate'));
await check('L-03', 'reading for a fictional chart identical to local', () => same('/api/v2/reading', { version: 2, birth, asOf: ASOF }));
await check('L-04', 'birth-time estimate identical to local', () => same('/api/v2/time-estimate', { version: 2, birth: { date: birth.date, gender: 'MALE', location: '吉隆坡' }, period: 'UNKNOWN', answers: { H01: 'A' }, asOf: ASOF }));
await check('L-05', 'invalid input rejected the same way', () => same('/api/v2/reading', { version: 2, birth: { ...birth, location: '东京' }, asOf: ASOF }));
await check('L-06', 'old interface is NOT deployed', async () => { const r = await live('/api/result', {}); return [[404, 405].includes(r.status) ? null : 'OLD_API_REACHABLE ' + r.status]; });
await check('L-07', 'temporary diagnostic probe is gone', async () => { const r = await fetch(BASE + '/api/v2/diag-probe', { headers: { 'x-guanchen-diag': '1' } }); return [r.status === 404 ? null : 'PROBE_STILL_DEPLOYED ' + r.status]; });
// P8 (2026-10-24): page files, security headers, anonymous counters (read only: this check never adds to the counts), 404 page
await check('L-08', 'page files are served (繁體 table, icons, share image, stats page)', async () => {
  const out = [];
  for (const f of ['/assets/app.js', '/assets/zh-tw.js', '/assets/zh-tw-data.json', '/assets/scene.js', '/favicon.svg', '/og-image.jpg', '/site.webmanifest', '/stats.html', '/assets/stats.js', '/robots.txt', '/sitemap.xml']) { const r = await fetch(BASE + f); if (r.status !== 200) out.push(f + ' ' + r.status); }
  return out;
});
await check('L-09', 'security headers present', async () => { const r = await fetch(BASE + '/'); const csp = r.headers.get('content-security-policy') ?? '';
  const home = await (await fetch(BASE + '/')).text();
  return [csp.includes("default-src 'self'") ? null : 'NO_CSP', /name="robots" content="noindex"/.test(home) ? 'HOME_STILL_NOINDEX' : null, r.headers.get('x-frame-options') === 'DENY' ? null : 'NO_FRAME_DENY', r.headers.get('x-content-type-options') === 'nosniff' ? null : 'NO_NOSNIFF']; });
await check('L-10', 'usage counters answer (numbers only)', async () => { const r = await fetch(BASE + '/api/v2/stats'); const j = await r.json();
  return [r.status === 200 ? null : 'STATUS ' + r.status, j.total && ['visit', 'reading', 'quiz', 'period'].every(k => Number.isInteger(j.total[k])) && Object.keys(j.total).length === 4 ? null : 'BAD_SHAPE ' + JSON.stringify(j).slice(0, 80)]; });
await check('L-11', 'unknown address shows the 观辰 404 page', async () => { const r = await fetch(BASE + '/no-such-page-' + Date.now()); const t = await r.text(); return [r.status === 404 ? null : 'STATUS ' + r.status, t.includes('观辰') ? null : 'NOT_OUR_404']; });
await check('L-12', 'three.js from cdnjs still matches the fingerprint in the page', async () => {
  const home = await (await fetch(BASE + '/')).text();
  const m = home.match(/src="(https:\/\/cdnjs[^"]+three\.min\.js)" integrity="(sha512-[^"]+)"/); if (!m) return ['NO_INTEGRITY_ATTRIBUTE'];
  const { createHash } = await import('node:crypto');
  const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
  return ['sha512-' + createHash('sha512').update(buf).digest('base64') === m[2] ? null : 'THREE_JS_CHANGED'];
});
const fail = rows.filter(r => r.p.length).length;
console.log(fail ? `P5_LIVE FAIL: ${fail}/${rows.length} - send this output to Claude` : `P5_LIVE PASS: ${rows.length}/${rows.length} (${BASE})`);
process.exit(fail ? 1 : 0);
