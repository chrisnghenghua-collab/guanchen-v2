// Netlify Function: POST /api/v2/reading  (GUANCHEN API v2, 2026-10-22). Any load/initialisation failure becomes a generic 500.
export default async function reading(request) {
  try {
    const { handleReadingRequest } = await import('../../api/http-handler.mjs');
    return await handleReadingRequest(request);
  } catch (e) {
    console.error('[reading] failure', e); // server-side log only (Netlify function logs); never sent to the user
    return new Response(JSON.stringify({ error: { code: 'INTERNAL', field: null, message: '系统暂时无法排盘，请稍后再试。' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
}
export const config = { path: '/api/v2/reading' };
