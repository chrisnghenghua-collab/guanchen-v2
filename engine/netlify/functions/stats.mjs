// Netlify Function: GET/POST /api/v2/stats (P8-1, 2026-10-24). Anonymous usage counters kept in Netlify Blobs (store "gc-stats").
// @netlify/blobs is imported statically here so Netlify's bundler packages it; the counting rules live in api/stats-service.mjs.
import { getStore } from '@netlify/blobs';
const SERVICE = new URL(['..', '..', 'api', 'stats-service.mjs'].join('/'), import.meta.url).href;

// Only the production site counts into "gc-stats"; previews and branch deploys use a separate store so tests never inflate the real numbers.
function blobsStore(context) {
  const name = context?.deploy?.context === 'production' ? 'gc-stats' : 'gc-stats-preview';
  const s = getStore({ name, consistency: 'strong' });
  return {
    async read(key) { const r = await s.getWithMetadata(key, { type: 'json' }); return r ? { data: r.data, etag: r.etag ?? null } : { data: null, etag: null }; },
    async write(key, data, etag) { const r = await s.setJSON(key, data, etag ? { onlyIfMatch: etag } : { onlyIfNew: true }); return r?.modified !== false; }
  };
}

export default async function stats(request, context) {
  try {
    const { handleStatsRequest } = await import(SERVICE);
    return await handleStatsRequest(request, blobsStore(context));
  } catch (e) {
    console.error('[stats] failure', e);   // server-side log only
    return new Response(JSON.stringify({ error: { code: 'INTERNAL' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
export const config = { path: '/api/v2/stats' };
