// Netlify supplies a standard Fetch Request and accepts a Fetch Response.
// All request and product semantics remain in the provider-neutral handler.
// Importing inside this boundary also contains provider initialization failures.
export async function adaptResultRequest(request, options) {
  try {
    const { handleResultRequest } = await import('../../server/http/result-request-handler.mjs');
    return await handleResultRequest(request, options);
  } catch {
    return new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR' } }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
}

export default async function result(request) {
  return adaptResultRequest(request);
}

// P1-b 2026-10-21: entry points straight at the engine (S6/S7 copy step retired). Netlify packaging is verified in P5.
export const config = { path: '/api/result', nodeBundler: 'none', includedFiles: ['server/**', 'src/**', 'packages/**', 'node_modules/**'] };
