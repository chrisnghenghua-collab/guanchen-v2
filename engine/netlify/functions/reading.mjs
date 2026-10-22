// Netlify Function: POST /api/v2/reading  (GUANCHEN API v2, 2026-10-22). Any load/initialisation failure becomes a generic 500.
const HANDLER = new URL(['..', '..', 'api', 'http-handler.mjs'].join('/'), import.meta.url).href;
export default async function reading(request) {
  try {
    // Loaded at run time from a computed path, so no bundler can merge the engine into this file;
    // the engine files are shipped unchanged via netlify.toml included_files (2026-10-23 fix).
    const { handleReadingRequest } = await import(HANDLER);
    return await handleReadingRequest(request);
  } catch (e) {
    // TEMPORARY (P5 only): header x-guanchen-diag: 1 returns the first error line for deployment debugging. Remove after P5 passes.
    console.error('[reading] failure', e); // server-side log only (Netlify function logs); never sent to the user
    return new Response(JSON.stringify({ error: { code: 'INTERNAL', field: null, ...(request.headers.get('x-guanchen-diag') === '1' ? { diag: String(e?.message ?? e).split('\n')[0].slice(0, 300) } : {}), message: '系统暂时无法排盘，请稍后再试。' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
}
export const config = { path: '/api/v2/reading' };
