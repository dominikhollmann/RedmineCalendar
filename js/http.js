// Shared low-level HTTP helpers used by both API clients (redmine-api, chatbot-api).
// Transport-only: no auth headers and no domain error mapping live here — those
// stay in the respective clients (Constitution I/V). Extracted to remove the
// duplicate copies of httpsOrigin + the retry constants (feature 048, clone #16).

/**
 * Return the HTTPS origin (`https://host/`) of a URL, or the input unchanged
 * when it cannot be parsed. Used to surface the proxy origin in error messages.
 * @param {string} url
 * @returns {string}
 */
export function httpsOrigin(url) {
  try {
    return `https://${new URL(url).host}/`;
  } catch {
    return url;
  }
}

/** HTTP statuses that warrant a retry with exponential backoff. */
export const RETRY_STATUSES = new Set([429, 503]);

/** Number of retries attempted after the initial request. */
export const RETRY_COUNT = 2;

/** Base backoff in milliseconds (doubled each attempt). */
export const RETRY_BASE_MS = 1000;

/**
 * Run `doFetch` with retry + exponential backoff on network failure and on
 * retryable statuses (429/503, honouring `Retry-After`). The caller supplies the
 * fetch thunk (so it controls URL/headers/body) and a factory for the error to
 * throw once retries are exhausted on a network failure — keeping each client's
 * domain error mapping (RedmineError vs. AI proxy error) where it belongs.
 * @param {() => Promise<Response>} doFetch
 * @param {() => Error} onNetworkError
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(doFetch, onNetworkError) {
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    let response;
    try {
      response = await doFetch();
    } catch {
      if (attempt === RETRY_COUNT) throw onNetworkError();
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
      continue;
    }
    if (!RETRY_STATUSES.has(response.status) || attempt === RETRY_COUNT) return response;
    const retryAfterSec = Number(response.headers.get('Retry-After'));
    const delay = retryAfterSec > 0 ? retryAfterSec * 1000 : RETRY_BASE_MS * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, delay));
  }
  // unreachable: the last iteration always returns or throws
  throw onNetworkError();
}
