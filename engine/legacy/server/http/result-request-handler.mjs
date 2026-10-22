import { requestProductionResult } from '../result-request/production-result-service.mjs';

export const MAX_RESULT_REQUEST_BYTES = 65536;
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const errorResponse = (status, code, extra = {}) => new Response(JSON.stringify({ error: { code } }), { status, headers: { ...headers, ...extra } });
const bodyError = status => Object.assign(new Error('REQUEST_BODY_REJECTED'), { status });

async function readJson(request) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_RESULT_REQUEST_BYTES)) throw bodyError(413);
  const reader = request.body?.getReader();
  if (!reader) throw bodyError(400);
  const chunks = []; let bytes = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  request.signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      request.signal.throwIfAborted();
      const next = await reader.read();
      request.signal.throwIfAborted();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESULT_REQUEST_BYTES) { cancel(); throw bodyError(413); }
      chunks.push(next.value);
    }
  } finally { request.signal.removeEventListener('abort', cancel); reader.releaseLock(); }
  const body = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); } catch { throw bodyError(400); }
}

// Fetch Request -> Response; no provider, logging, persistence or browser dependencies.
// The optional service is an explicit composition dependency for integration tests.
export async function handleResultRequest(request, { service = requestProductionResult } = {}) {
  if (new URL(request.url).pathname !== '/api/result') return errorResponse(404, 'NOT_FOUND');
  if (request.method !== 'POST') return errorResponse(405, 'METHOD_NOT_ALLOWED', { Allow: 'POST' });
  if (!/^application\/json(?:\s*;\s*charset\s*=\s*utf-8)?\s*$/i.test(request.headers.get('content-type') ?? '')) return errorResponse(415, 'UNSUPPORTED_MEDIA_TYPE');
  let input;
  try { request.signal.throwIfAborted(); input = await readJson(request); }
  catch (error) {
    if (error.status === 413) return errorResponse(413, 'BODY_TOO_LARGE');
    if (request.signal.aborted) return errorResponse(408, 'REQUEST_ABORTED');
    return errorResponse(400, 'INVALID_REQUEST');
  }
  try {
    request.signal.throwIfAborted();
    const result = await service(input, { signal: request.signal });
    request.signal.throwIfAborted();
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    if (request.signal.aborted) return errorResponse(408, 'REQUEST_ABORTED');
    if (error?.code === 'INVALID_PRODUCT_REQUEST' || error?.code === 'STEP01_INPUT_UNSUPPORTED') return errorResponse(400, 'INVALID_REQUEST');
    return errorResponse(500, 'INTERNAL_ERROR');
  }
}
