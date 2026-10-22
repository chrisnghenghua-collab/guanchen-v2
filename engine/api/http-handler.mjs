// Fetch Request -> Response for POST /api/v2/reading. Provider-neutral (Netlify adapter is a thin wrapper).
import { createReading, ReadingError } from './reading-service.mjs';
import { estimateBirthTime, questionnaire, PERIODS } from './time-estimate.mjs';
import { loadCopy } from '../interpretation/copy.mjs';
export const READING_PATH = '/api/v2/reading';
export const ESTIMATE_PATH = '/api/v2/time-estimate';
export const MAX_BODY_BYTES = 16384;
const copy = loadCopy();
const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
const error = (status, code, field = null, extra = {}) => json(status, { error: { code, field, message: copy.has(`error.${code}`) ? copy(`error.${code}`) : copy('error.INTERNAL') } }, extra);

export const handleReadingRequest = (request, options = {}) => handleJson(request, READING_PATH, body => createReading(body, options));
// GET returns the questionnaire and period options (for the UI); POST returns ranked candidate 时辰.
export const handleEstimateRequest = (request, options = {}) => (request.method === 'GET' && new URL(request.url).pathname === ESTIMATE_PATH)
  ? json(200, { questions: questionnaire(), periods: [...Object.keys(PERIODS).filter(p => p !== 'UNKNOWN'), 'AROUND', 'UNKNOWN'].map(value => ({ value, label: copy(`estimate.period.${value}`) })), findExactHint: copy('estimate.find_exact') })
  : handleJson(request, ESTIMATE_PATH, body => estimateBirthTime(body, options), 'GET, POST');

async function handleJson(request, path, run, allow = 'POST') {
  if (new URL(request.url).pathname !== path) return error(404, 'NOT_FOUND');
  if (request.method !== 'POST') return error(405, 'METHOD_NOT_ALLOWED', null, { Allow: allow });
  if (!/^application\/json(\s*;\s*charset=utf-8)?$/i.test((request.headers.get('content-type') ?? '').trim())) return error(415, 'UNSUPPORTED_MEDIA_TYPE');
  const declared = request.headers.get('content-length');
  if (declared !== null && Number(declared) > MAX_BODY_BYTES) return error(413, 'BODY_TOO_LARGE');
  let text;
  try { text = await request.text(); } catch { return error(400, 'INVALID_BODY'); }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return error(413, 'BODY_TOO_LARGE');
  let body;
  try { body = JSON.parse(text); } catch { return error(400, 'INVALID_JSON'); }
  try { return json(200, run(body)); }
  catch (e) {
    // 422: the input is well-formed but this exact local birth time cannot be resolved (DST overlap/gap). Everything else: 400.
    if (e instanceof ReadingError) return error(e.code.startsWith('BIRTH_TIME') ? 422 : 400, e.code, e.field);
    return error(500, 'INTERNAL');
  }
}
