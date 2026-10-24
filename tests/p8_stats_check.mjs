// P8-1 check: anonymous usage counters (engine/api/stats-service.mjs) with the in-memory store.
// Counting, daily keys (Malaysia time), concurrent increments (compare-and-set), input validation, and no personal data in answers.
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const E = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'engine');
const S = await import(pathToFileURL(path.join(E, 'api/stats-service.mjs')).href);
const problems = []; let checks = 0;
const ok = (what, cond) => { checks++; if (!cond) problems.push(what); };
const store = S.memoryStore();
const post = body => S.handleStatsRequest(new Request('http://l/api/v2/stats', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }), store);
// 1. simple counting
for (const e of ['visit', 'visit', 'reading', 'quiz', 'period']) ok('POST ' + e, (await post({ event: e })).status === 200);
let t = (await S.summary(store)).total;
ok('TOTALS ' + JSON.stringify(t), t.visit === 2 && t.reading === 1 && t.quiz === 1 && t.period === 1);
// 2. 50 concurrent readings must all be counted
await Promise.all(Array.from({ length: 50 }, () => post({ event: 'reading' })));
t = (await S.summary(store)).total; ok('CONCURRENT reading=' + t.reading, t.reading === 51);
// 3. invalid input is rejected and not counted
for (const bad of [{ event: 'hack' }, { event: 'reading', birth: '1990-01-01' }, 'not json', {}]) ok('REJECT ' + JSON.stringify(bad), (await post(bad)).status === 400);
ok('METHOD', (await S.handleStatsRequest(new Request('http://l/api/v2/stats', { method: 'PUT' }), store)).status === 405);
t = (await S.summary(store)).total; ok('NOT_COUNTED', t.reading === 51 && t.visit === 2);
// 4. day keys use Malaysia time: 2026-10-23 16:30 UTC = 2026-10-24 00:30 in Kuala Lumpur
ok('DAYKEY ' + S.dayKey(Date.UTC(2026, 9, 23, 16, 30)), S.dayKey(Date.UTC(2026, 9, 23, 16, 30)) === 'day-2026-10-24');
// 5. GET answer: totals + daily table, only counter fields
const g = await S.handleStatsRequest(new Request('http://l/api/v2/stats?days=7'), store), j = await g.json();
ok('GET', g.status === 200 && j.days.length === 7 && j.days[0].reading === 51);
const keys = new Set(Object.keys(j.total)); j.days.forEach(d => Object.keys(d).forEach(k => keys.add(k)));
ok('FIELDS ' + [...keys].join(','), [...keys].every(k => [...S.EVENTS, 'date'].includes(k)));
ok('CACHE', /max-age=60/.test(g.headers.get('cache-control') ?? ''));
console.log(problems.length ? 'P8_STATS FAIL: ' + problems.join('; ') : `P8_STATS PASS (${checks} checks: counting, 50 concurrent, rejects bad input, Malaysia-time days, counters only)`);
process.exit(problems.length ? 1 : 0);
