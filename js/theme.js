// ── Theme persistence + apply ─────────────────────────────────────
// Tiny, pure-ish module: read/write a localStorage key, mirror it onto a
// `data-theme` attribute on the root element, and let other modules
// subscribe to changes. No DOM imports, no DOM access except through the
// `root` argument the caller passes in.
//
// Public API:
//   getTheme()                          → 'light' | 'dark'
//   setTheme(theme)                     → void  (persists + applies to <html>)
//   applyTheme(rootEl, theme)           → void  (idempotent attribute write)
//   subscribeOnChange(listener)         → () => void  (unsubscribe)

const STORAGE_KEY = 'redmine_calendar_theme';

/** @typedef {'light' | 'dark'} Theme */

/** @type {Array<(theme: Theme) => void>} */
const _listeners = [];

/**
 * Read the stored theme. Returns `'light'` when the key is missing, the
 * value is invalid, or `localStorage` is unavailable (private browsing).
 * @returns {Theme}
 */
export function getTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Idempotent attribute write: `'dark'` sets `data-theme="dark"`, anything
 * else removes the attribute (light = no attribute, per the cross-feature
 * contract for 031).
 * @param {HTMLElement} rootEl
 * @param {Theme} theme
 */
export function applyTheme(rootEl, theme) {
  if (!rootEl) return;
  if (theme === 'dark') {
    rootEl.dataset.theme = 'dark';
  } else {
    delete rootEl.dataset.theme;
  }
}

/**
 * Persist the new theme, apply it to `<html>`, and notify listeners.
 * Safe to call when `localStorage` is unavailable — the apply + notify
 * paths still run so the live-switch UX works even without persistence.
 * @param {Theme} theme
 */
export function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private browsing / storage disabled — apply + notify still run */
  }
  /* c8 ignore next 2 */
  if (typeof document !== 'undefined' && document.documentElement) {
    applyTheme(document.documentElement, next);
  }
  for (const fn of _listeners) {
    try {
      fn(next);
    } catch {
      /* swallow listener errors — one bad subscriber should not break others */
    }
  }
}

/**
 * Subscribe to theme changes. Returns an unsubscribe function.
 * @param {(theme: Theme) => void} listener
 * @returns {() => void}
 */
export function subscribeOnChange(listener) {
  if (typeof listener !== 'function') return () => {};
  _listeners.push(listener);
  return () => {
    const i = _listeners.indexOf(listener);
    if (i >= 0) _listeners.splice(i, 1);
  };
}
