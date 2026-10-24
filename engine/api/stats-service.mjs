// GUANCHEN P8-1 (2026-10-24) - anonymous usage counters. Counts events only: no IP, no birth data, no cookies, no ids.
// Events: visit (each page open), reading (a chart was shown), quiz (birth-time questionnaire started),
// period (a 大运/流年 page was opened). Totals are public (shown at the bottom of the site, Chris 2026-10-24).
// The store is injected: Netlify Blobs in production (netlify/functions/stats.mjs), an in-memory map for local preview/tests.
export const EVENTS = ['visit', 'reading', 'quiz', 'period'];
const ZONE_OFFSET_MS = 8 * 3600 * 1000;   // days are counted in Malaysia time (UTC+8)
const empty = () => Object.fromEntries(EVENTS.map(e => [e, 0]));
export const dayKey = (ms = Date.now()) => 'day-' + new Date(ms + ZONE_OFFSET_MS).toISOString().slice(0, 10);
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };

/** In-memory store with the same compare-and-set contract as the Blobs adapter. */
export function memoryStore() {
  const m = new Map(); let n = 0;
  return {
    async read(key) { const v = m.get(key); return v ? { data: structuredClone(v.data), etag: v.etag } : { data: null, etag: null }; },
    async write(key, data, etag) { const cur = m.get(key); if ((cur?.etag ?? null) !== etag) return false; m.set(key, { data: structuredClone(data), etag: String(++n) }); return true; }
  };
}

async function bump(store, key, event) {
  for (let i = 0; i < 25; i++) {   // compare-and-set: retry (after a short random pause) when another request wrote in between
    const { data, etag } = await store.read(key);
    const next = { ...empty(), ...(data ?? {}) }; next[event] += 1;
    if (await store.write(key, next, etag)) return next;
    await new Promise(r => setTimeout(r, 5 + Math.random() * 30 * Math.min(i + 1, 6)));
  }
  return null;   // gave up quietly: a lost count is acceptable, an error page is not
}

export async function record(store, event, now = Date.now()) {
  if (!EVENTS.includes(event)) return false;
  await bump(store, 'total', event);
  await bump(store, dayKey(now), event);
  return true;
}

export async function summary(store, days = 0, now = Date.now()) {
  const total = { ...empty(), ...((await store.read('total')).data ?? {}) };
  const out = { total };
  if (days > 0) {
    out.days = [];
    for (let i = 0; i < Math.min(days, 90); i++) { const k = dayKey(now - i * 86400000); out.days.push({ date: k.slice(4), ...empty(), ...((await store.read(k)).data ?? {}) }); }
  }
  return out;
}

/** HTTP handler for /api/v2/stats. GET -> totals (?days=N adds a daily table); POST {"event": "..."} -> count it. */
export async function handleStatsRequest(request, store) {
  if (request.method === 'GET') {
    const days = Math.max(0, Math.min(90, parseInt(new URL(request.url).searchParams.get('days') ?? '0', 10) || 0));
    return new Response(JSON.stringify(await summary(store, days)), { status: 200, headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=60', 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60, stale-while-revalidate=300' } });
  }
  if (request.method === 'POST') {
    let body = null; try { body = await request.json(); } catch { /* ignored */ }
    const ok = body && typeof body === 'object' && Object.keys(body).length === 1 && await record(store, body.event);
    return new Response(JSON.stringify(ok ? { ok: true } : { error: { code: 'INVALID_EVENT' } }), { status: ok ? 200 : 400, headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } });
  }
  return new Response(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED' } }), { status: 405, headers: { ...JSON_HEADERS, Allow: 'GET, POST' } });
}
