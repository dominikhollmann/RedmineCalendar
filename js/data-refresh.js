/**
 * data-refresh.js — manual + auto-refresh controller.
 * Extracted from calendar.js to stay within the 600-LOC hard limit.
 *
 * Public API:
 *   registerRefreshCallback(fn)  — add a refresh source callback
 *   triggerRefresh()             — manual or programmatic one-shot refresh
 *   startAutoRefresh(secs)       — start polling; 0 = disabled; floor 60 s
 *   stopAutoRefresh()            — clear the polling interval
 *   getLastRefreshedAt()         — Date | null of last successful refresh
 */

import { showToast } from './notify.js';
import { t } from './i18n.js';

const AUTO_REFRESH_FLOOR_SECS = 60;

/** @type {number|null} */
let _intervalId = null;

/** @type {Date|null} */
let _lastRefreshedAt = null;

let _refreshing = false;

/** @type {(() => Promise<void>)[]} */
const _callbacks = [];

/**
 * Register a callback that is called on every refresh trigger.
 * @param {() => Promise<void>} fn
 */
export function registerRefreshCallback(fn) {
  _callbacks.push(fn);
}

/**
 * Format a Date as HH:MM.
 * @param {Date} date
 * @returns {string}
 */
function _formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Trigger a full data refresh. No-op when a refresh is already in progress.
 * @returns {Promise<void>}
 */
export async function triggerRefresh() {
  if (_refreshing) return;
  _refreshing = true;
  const failed = [];
  try {
    await Promise.all(
      _callbacks.map(async (cb, i) => {
        try {
          await cb();
        } catch {
          failed.push(i);
        }
      })
    );
    _lastRefreshedAt = new Date();
    showToast(t('calendar.last_refreshed', { time: _formatTime(_lastRefreshedAt) }));
  } finally {
    _refreshing = false;
  }
  if (failed.length > 0) {
    showToast(t('calendar.refresh_failed', { sources: failed.join(', ') }));
  }
}

const _hasDocument =
  typeof document !== 'undefined' &&
  typeof document.addEventListener === 'function' &&
  typeof document.removeEventListener === 'function';

/**
 * Start auto-polling. Interval floor is 60 s; 0 disables polling.
 * Pauses when the tab is hidden; resumes on visibility restore.
 * @param {number} intervalSecs
 */
export function startAutoRefresh(intervalSecs) {
  stopAutoRefresh();
  if (!intervalSecs) return;
  const clampedSecs = Math.max(intervalSecs, AUTO_REFRESH_FLOOR_SECS);
  _intervalId = /** @type {number} */ (
    /** @type {unknown} */ (
      setInterval(() => {
        /* c8 ignore next */
        if (!_hasDocument || document.visibilityState !== 'hidden') triggerRefresh();
      }, clampedSecs * 1000)
    )
  );

  /* c8 ignore next 2 */
  if (_hasDocument) document.addEventListener('visibilitychange', _onVisibilityChange);
}

/* c8 ignore next 5 */
function _onVisibilityChange() {
  if (document.visibilityState === 'visible' && _intervalId !== null) {
    triggerRefresh();
  }
}

/**
 * Stop the auto-polling interval.
 */
export function stopAutoRefresh() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  /* c8 ignore next 2 */
  if (_hasDocument) document.removeEventListener('visibilitychange', _onVisibilityChange);
}

/**
 * Return the timestamp of the last successful refresh, or null.
 * @returns {Date|null}
 */
export function getLastRefreshedAt() {
  return _lastRefreshedAt;
}
