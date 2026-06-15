/** @type {Map<number, import('./types.d.ts').TicketInfo | null>} */
const _cache = new Map();

/**
 * Returns cached TicketInfo for ticketId, or calls fetchFn() on a miss.
 * Successful results (including null) are cached; throws are NOT cached (FR-017).
 * @param {number} ticketId
 * @param {() => Promise<import('./types.d.ts').TicketInfo | null>} fetchFn
 * @returns {Promise<import('./types.d.ts').TicketInfo | null>}
 */
export async function cachedLookupIssue(ticketId, fetchFn) {
  if (_cache.has(ticketId)) return _cache.get(ticketId) ?? null;
  const result = await fetchFn();
  _cache.set(ticketId, result);
  return result;
}

/** Resets the entire cache. For unit tests only. */
export function clearCache() {
  _cache.clear();
}
