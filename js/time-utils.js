/**
 * Pure time primitives. No imports — safe to import from any module (zero
 * coupling). Single home for the `"HH:MM" → minutes-since-midnight` conversion
 * previously copied across outlook / planning-view / time-entry-form-utils.
 * @module time-utils
 */

/**
 * Convert an `"HH:MM"` stamp to minutes since midnight.
 * @param {string} hhmm
 * @returns {number}
 */
export function timeToMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
