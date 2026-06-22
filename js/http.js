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
