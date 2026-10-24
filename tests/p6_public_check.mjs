// P6: static checks for the website (engine/public). Read-only.
// 1) the birthplace list shown on the site matches the engine's 142 locations exactly
// 2) every file the page loads exists, and the page only calls the two v2 endpoints
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PUB = path.join(ROOT, 'engine', 'public');
const problems = [];
const eng = JSON.parse(fs.readFileSync(path.join(ROOT, 'engine/packages/step01-production-core/data/locations.v2.json'), 'utf8')).records;
const pub = JSON.parse(fs.readFileSync(path.join(PUB, 'data/locations.json'), 'utf8'));
const pubCities = pub.countries.flatMap(c => c.groups.flatMap(g => g.cities));
const engIds = new Set(eng.map(r => r.id)), pubIds = new Set(pubCities.map(c => c.id));
if (pubCities.length !== eng.length || pubIds.size !== engIds.size || [...engIds].some(id => !pubIds.has(id))) problems.push('LOCATIONS_OUT_OF_SYNC: run python tools\\gen_public_locations.py');
for (const c of pubCities) { const r = eng.find(x => x.id === c.id); if (r && r.city !== c.name) problems.push('LOCATION_NAME ' + c.id); }
const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:href|src)="([^"#:]+)"/g)) if (!fs.existsSync(path.join(PUB, m[1]))) problems.push('MISSING_FILE ' + m[1]);
const js = fs.readFileSync(path.join(PUB, 'assets/app.js'), 'utf8');
const calls = [...js.matchAll(/'(\/api\/[^']+)'/g)].map(m => m[1]);
for (const c of calls) if (!['/api/v2/reading', '/api/v2/time-estimate', '/api/v2/stats'].includes(c))   // stats: anonymous counters (P8-1, 2026-10-24)
  problems.push('UNKNOWN_API ' + c);
if (!calls.length) problems.push('NO_API_CALLS_FOUND');
if (/localStorage|sessionStorage|document\.cookie/.test(js)) problems.push('STORES_DATA_IN_BROWSER');
console.log(problems.length ? 'P6_PUBLIC FAIL: ' + problems.join('; ') : `P6_PUBLIC PASS (${pubCities.length} locations in sync, ${calls.length} API calls, all page files present)`);
process.exit(problems.length ? 1 : 0);
