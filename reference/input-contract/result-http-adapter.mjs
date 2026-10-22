import { validatePublicResult } from './public-result-validator.mjs';

const failure = code => Object.assign(new Error(code), { code });
export function createResultHttpPort(contract) {
  return async function requestResult(request, options = {}) {
    const { signal } = options;
    signal?.throwIfAborted();
    let response;
    try {
      response = await fetch('/api/result', {
        method: 'POST', mode: 'same-origin', credentials: 'omit', redirect: 'error', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(request), signal,
      });
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      throw failure('RESULT_REQUEST_FAILED');
    }
    signal?.throwIfAborted();
    if (!response.ok) throw failure('RESULT_REQUEST_FAILED');
    if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw failure('INVALID_PUBLIC_PRODUCT_RESULT');
    let payload;
    try { payload = await response.json(); } catch { signal?.throwIfAborted(); throw failure('INVALID_PUBLIC_PRODUCT_RESULT'); }
    signal?.throwIfAborted();
    if (!validatePublicResult(payload, contract).valid) throw failure('INVALID_PUBLIC_PRODUCT_RESULT');
    return payload;
  };
}

export function bindProductionResultPort(contract) {
  globalThis.__GUANCHEN_RESULT_REQUEST_PORT__ = createResultHttpPort(contract);
}
