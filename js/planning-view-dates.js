// Pure date-navigation utilities used by planning-view.js.

/**
 * Add `days` to a YYYY-MM-DD string and return the result.
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
function _addDays(dateStr, days) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

// Step `result` by `step` days until it lands on a weekday (skips Sat/Sun).
function _skipWeekend(result, step) {
  while (true) {
    const dow = new Date(result + 'T00:00:00Z').getUTCDay();
    if (dow !== 0 && dow !== 6) break;
    result = _addDays(result, step);
  }
  return result;
}

/**
 * Navigate to the previous day. Skips weekends when moFr is true.
 * @param {string} dateStr  YYYY-MM-DD
 * @param {boolean} moFr
 * @returns {string}
 */
export function prevDay(dateStr, moFr) {
  const result = _addDays(dateStr, -1);
  return moFr ? _skipWeekend(result, -1) : result;
}

/**
 * Navigate to the next day. Skips weekends when moFr is true.
 * @param {string} dateStr  YYYY-MM-DD
 * @param {boolean} moFr
 * @returns {string}
 */
export function nextDay(dateStr, moFr) {
  const result = _addDays(dateStr, 1);
  return moFr ? _skipWeekend(result, 1) : result;
}

/**
 * Returns today's date as YYYY-MM-DD regardless of Mo-Fr toggle.
 * @returns {string}
 */
export function toToday() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the Monday of the week containing dateStr.
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {string}
 */
export function mondayOf(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const dow = dt.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}
