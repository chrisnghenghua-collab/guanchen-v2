// P2 round 2: Chris's 10 constructed true-solar-time cases (BAZI_10_TRUE_SOLAR_TEST_CASES_20261022, Swiss Ephemeris reference).
// Rule: 子初换日 (D-01, 2026-10-22). Case 08 is the 23:00 boundary case.
// Cases whose city is in the 57-location catalog go through the real public entry (netlify/functions/result.mjs).
// Since D-02 (2026-10-22) Taipei / Hong Kong / Macau are in locations.v2.json, so all 10 cases use the public entry.
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const E = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'engine');
const imp = rel => import(pathToFileURL(path.join(E, rel)).href);
const fn = await imp('legacy/netlify/functions/result.mjs');
const C = 'packages/step01-production-core/src/core/bazi/';
const { baziYearPillarForInstant, baziMonthPillarForInstant } = await imp(C + 'calendar/authorityCalendar.ts');
const { localApparentSolarDateTime } = await imp(C + 'time/trueSolarTime.ts');
const { astronomyEquationOfTimeMinutes } = await imp(C + 'time/astronomyEquationOfTime.ts');
const { resolveDayHourPillars } = await imp(C + 'pillars/dayHour.ts');
const cases = [
  ['01', 'cn_north_beijing', 116.4074, '2000-01-01', '12:30', 'MALE', '2000-01-01 12:12:30', '己卯 丙子 戊午 戊午'],
  ['02', 'cn_southwest_chengdu', 104.0665, '2002-07-09', '02:00', 'FEMALE', '2002-07-09 00:51:12', '壬午 丁未 戊寅 壬子'],
  ['03', 'cn_northwest_urumqi', 87.6168, '2001-11-15', '09:15', 'MALE', '2001-11-15 07:20:55', '辛巳 己亥 壬午 甲辰'],
  ['04', 'tw_north_taipei', 121.5654, '1997-10-20', '18:50', 'FEMALE', '1997-10-20 19:11:29', '丁丑 庚戌 乙未 丙戌', 'Taipei'],
  ['05', 'hk_hong_kong', 114.1694, '2005-11-23', '07:30', 'MALE', '2005-11-23 07:20:23', '乙酉 丁亥 辛亥 壬辰', 'Hong Kong'],
  ['06', 'mo_macau', 113.5439, '1999-12-15', '23:10', 'FEMALE', '1999-12-15 22:49:09', '己卯 丙子 辛丑 己亥', 'Macau'],
  ['07', 'my_west_kuala_lumpur', 101.6869, '2008-08-08', '09:30', 'MALE', '2008-08-08 08:11:06', '戊子 庚申 庚辰 庚辰'],
  ['08', 'my_west_penang', 100.3327, '2012-05-12', '01:05', 'FEMALE', '2012-05-11 23:49:59', '壬辰 乙巳 癸酉 壬子'],
  ['09', 'sg_singapore', 103.8198, '2014-02-04', '05:30', 'MALE', '2014-02-04 04:11:26', '癸巳 乙丑 丙午 庚寅'],
  ['10', 'sg_singapore', 103.8198, '2014-02-04', '07:30', 'FEMALE', '2014-02-04 06:11:26', '甲午 丙寅 丙午 辛卯'],
];
const pad = n => String(n).padStart(2, '0');
const fmt = t => `${t.year}-${pad(t.month)}-${pad(t.day)} ${pad(t.hour)}:${pad(t.minute)}:${pad(Math.floor(t.second ?? 0))}`;
const rows = [];
for (const [id, loc, lon, date, time, gender, expTst, expP, city] of cases) {
  const [Y, M, D] = date.split('-').map(Number), [h, m] = time.split(':').map(Number);
  const instantMs = Date.UTC(Y, M - 1, D, h, m) - 8 * 3600000; // all cases are UTC+08:00 civil time
  const tst = localApparentSolarDateTime(instantMs, lon, astronomyEquationOfTimeMinutes);
  const internal = [baziYearPillarForInstant(instantMs).name, baziMonthPillarForInstant(instantMs).name, resolveDayHourPillars(tst).day, resolveDayHourPillars(tst).hour].join(' ');
  let path_ = 'ENGINE_INTERNAL (city not in catalog: ' + city + ')', got = internal, http = null;
  if (loc) {
    const body = { requestType: 'GUANCHEN_PRODUCT_RESULT_REQUEST', requestVersion: '1.0.0', birth: { calendar: 'GREGORIAN', date, timeKnowledge: 'KNOWN', time, gender, location: loc }, asOfLocal: '2026-10-22T12:00:00+08:00' };
    const r = await fn.default(new Request('http://local/api/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    http = r.status; const p = await r.json(); const P = p.chart?.pillars;
    got = P ? [P.year, P.month, P.day, P.hour].join(' ') : `HTTP ${r.status} ${JSON.stringify(p)}`; path_ = 'PUBLIC_HTTP_ENTRY ' + loc;
  }
  const tstSec = (Date.UTC(...fmt(tst).split(/[- :]/).map(Number).map((v, i) => i === 1 ? v - 1 : v)) - Date.UTC(...expTst.split(/[- :]/).map(Number).map((v, i) => i === 1 ? v - 1 : v))) / 1000;
  const e = expP.split(' '), g = got.split(' ');
  const diff = ['年', '月', '日', '时'].filter((_, i) => e[i] !== g[i]);
  rows.push({ id, path: path_, http, expected: expP, guanchen: got, internalSameAsPublic: got === internal, trueSolarGuanchen: fmt(tst), trueSolarExpected: expTst, trueSolarDeltaSec: tstSec, differs: diff });
}
const bad = rows.filter(r => r.differs.length || r.http !== 200);
process.on('exit', () => { console.log(`USER_CASES ${rows.length - bad.length}/${rows.length} MATCH`); process.exitCode = bad.length ? 1 : 0; });
for (const r of rows) console.log(`${r.id} ${r.differs.length ? 'DIFF ' + r.differs.join('') : 'MATCH'} | 期望 ${r.expected} | 观辰 ${r.guanchen} | 真太阳时 ${r.trueSolarGuanchen} (Δ${r.trueSolarDeltaSec}s) | ${r.path}${r.http ? ' HTTP ' + r.http : ''}${r.internalSameAsPublic ? '' : ' INTERNAL≠PUBLIC'}`);
