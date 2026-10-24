// 观辰 local preview: serves engine/public and the two v2 API endpoints, the same way Netlify does.
// Usage (in D:\GUANCHEN_V2):  node tools\dev_server.mjs   then open http://localhost:8888
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'engine', 'public');
const fn = {
  '/api/v2/reading': (await import(pathToFileURL(path.join(ROOT, 'engine/netlify/functions/reading.mjs')).href)).default,
  '/api/v2/time-estimate': (await import(pathToFileURL(path.join(ROOT, 'engine/netlify/functions/time-estimate.mjs')).href)).default
};
// P8-1: usage counters run against an in-memory store locally (never touches the live counts)
const STATS = await import(pathToFileURL(path.join(ROOT, 'engine/api/stats-service.mjs')).href);
const statsStore = STATS.memoryStore();
fn['/api/v2/stats'] = req => STATS.handleStatsRequest(req, statsStore);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const PORT = Number(process.env.PORT || 8888);
http.createServer(async (rq, rs) => {
  const url = new URL(rq.url, `http://localhost:${PORT}`);
  try {
    if (fn[url.pathname]) {
      const init = { method: rq.method, headers: rq.headers, ...(['GET', 'HEAD'].includes(rq.method) ? {} : { body: Readable.toWeb(rq), duplex: 'half' }) };
      const res = await fn[url.pathname](new Request(url, init));
      rs.writeHead(res.status, Object.fromEntries(res.headers)); rs.end(Buffer.from(await res.arrayBuffer())); return;
    }
    let file = path.normalize(path.join(PUB, decodeURIComponent(url.pathname)));
    if (!file.startsWith(PUB)) { rs.writeHead(403); rs.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { rs.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); rs.end('Not found'); return; }
    rs.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(rs);
  } catch (e) { rs.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); rs.end('preview server error: ' + e.message); }
}).listen(PORT, () => console.log(`观辰 preview: http://localhost:${PORT}  (Ctrl+C to stop)`));
