// Cache stores the Promise immediately on first call so concurrent callers
// share the same in-flight request rather than each firing their own (SC-004).
/** @type {Map<number, Promise<import('./types.d.ts').TicketInfo | null>>} */
const _cache = new Map();

/**
 * Returns cached TicketInfo for ticketId, or calls fetchFn() on a miss.
 * In-flight requests are deduplicated — concurrent callers receive the same
 * Promise. Successful results (including null) are cached; throws are NOT
 * cached so the next caller retries (FR-017).
 * @param {number} ticketId
 * @param {() => Promise<import('./types.d.ts').TicketInfo | null>} fetchFn
 * @returns {Promise<import('./types.d.ts').TicketInfo | null>}
 */
export function cachedLookupIssue(ticketId, fetchFn) {
  if (_cache.has(ticketId))
    return /** @type {Promise<import('./types.d.ts').TicketInfo | null>} */ (_cache.get(ticketId));
  const promise = Promise.resolve(fetchFn()).catch((err) => {
    _cache.delete(ticketId);
    throw err;
  });
  _cache.set(ticketId, promise);
  return promise;
}

/** Resets the entire cache (including any in-flight promises). For unit tests only. */
export function clearCache() {
  _cache.clear();
}
