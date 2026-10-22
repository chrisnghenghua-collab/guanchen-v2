// Netlify Function: GET|POST /api/v2/time-estimate (GUANCHEN API v2 birth-time estimation, P4 V1).
export default async function timeEstimate(request) {
  try {
    const { handleEstimateRequest } = await import('../../api/http-handler.mjs');
    return await handleEstimateRequest(request);
  } catch (e) {
    console.error('[time-estimate] failure', e); // server-side log only (Netlify function logs); never sent to the user
    return new Response(JSON.stringify({ error: { code: 'INTERNAL', field: null, message: '系统暂时无法推算，请稍后再试。' } }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
}
export const config = { path: '/api/v2/time-estimate' };
