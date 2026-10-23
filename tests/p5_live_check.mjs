// P5: checks a deployed site against this local engine. Usage: node tests\p5_live_check.mjs https://<site>.netlify.app
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
await check('L-04', 'birth-time estimate identical to local', () => same('/api/v2/time-estimate', { version: 2, birth: { date: birth.date, gender: 'MALE', location: '吉隆坡' }, period: 'UNKNOWN', answers: { Q_DECIDE: '比劫' }, asOf: ASOF }));
await check('L-05', 'invalid input rejected the same way', () => same('/api/v2/reading', { version: 2, birth: { ...birth, location: '东京' }, asOf: ASOF }));
await check('L-06', 'old interface is NOT deployed', async () => { const r = await live('/api/result', {}); return [[404, 405].includes(r.status) ? null : 'OLD_API_REACHABLE ' + r.status]; });
await check('L-07', 'temporary diagnostic probe is gone', async () => { const r = await fetch(BASE + '/api/v2/diag-probe', { headers: { 'x-guanchen-diag': '1' } }); return [r.status === 404 ? null : 'PROBE_STILL_DEPLOYED ' + r.status]; });
const fail = rows.filter(r => r.p.length).length;
console.log(fail ? `P5_LIVE FAIL: ${fail}/${rows.length} - send this output to Claude` : `P5_LIVE PASS: ${rows.length}/${rows.length} (${BASE})`);
process.exit(fail ? 1 : 0);
