// TEMPORARY (P5 deployment debugging, 2026-10-23). Remove after P5 passes.
// Only answers when the request carries header x-guanchen-diag: 1; otherwise 404. Reports what the deployed package
// contains and whether the two real functions load. No user data involved.
import fs from 'node:fs';
const here = new URL('.', import.meta.url);
const root = new URL('../../', import.meta.url);
const ls = (u, depth = 1) => { try { return fs.readdirSync(u, { withFileTypes: true }).map(d => d.name + (d.isDirectory() ? '/' : '')).sort(); } catch (e) { return 'ERR ' + e.code; } };
export default async function diagProbe(request) {
  if (request.headers.get('x-guanchen-diag') !== '1') return new Response('Not found', { status: 404 });
  const out = { node: process.version, functionFile: import.meta.url, functionsDir: ls(here), root: ls(root), rootApi: ls(new URL('api/', root)), rootNodeModules: ls(new URL('node_modules/', root)) };
  for (const f of ['time-estimate.mjs', 'reading.mjs']) {
    try { const P = await import(new URL(f, here).href); out[f] = { keys: Object.keys(P), defaultType: typeof P.default }; }
    catch (e) { out[f] = { importError: String(e?.message ?? e).split('\n')[0] }; }
  }
  try { const H = await import(new URL('api/http-handler.mjs', root).href); out.handler = Object.keys(H);
    const r = await H.handleEstimateRequest(new Request(new URL('/api/v2/time-estimate', request.url))); out.estimateGet = { status: r.status, start: (await r.text()).slice(0, 80) }; }
  catch (e) { out.handler = { importError: String(e?.message ?? e).split('\n')[0] }; }
  return new Response(JSON.stringify(out, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
export const config = { path: '/api/v2/diag-probe' };
