// Pure-logic context-collection module — no DOM access.
// Exports: installFetchLog, installErrorLog, log, getNetworkLog, getErrorLog,
//          getAppLog, getLocalStorageSnapshot, captureScreenshot,
//          collectBaseContext, collectBugContext, buildEnvPairs

import { getVersion } from './version.js';
import { getCentralConfigSync } from './config-store.js';

/** @typedef {import('./types').NetworkLogEntry} NetworkLogEntry */
/** @typedef {import('./types').SessionError} SessionError */
/** @typedef {import('./types').AppLogEntry} AppLogEntry */
/** @typedef {import('./types').CalendarViewState} CalendarViewState */

// ── Ring buffer helpers ────────────────────────────────────────────

/**
 * @template T
 * @param {T[]} buf
 * @param {T} entry
 * @param {number} limit
 */
function pushRing(buf, entry, limit) {
  if (buf.length >= limit) buf.shift();
  buf.push(entry);
}

// ── Fetch log (T005) ──────────────────────────────────────────────

/** @type {NetworkLogEntry[]} */
const _networkLog = [];
const NETWORK_LOG_LIMIT = 20;
let _wrapped = false;
let _originalFetch = null;

/** Install the window.fetch proxy — call once at app startup. Idempotent. */
export function installFetchLog() {
  if (_wrapped || typeof window === 'undefined') return;
  _wrapped = true;
  _originalFetch = window.fetch.bind(window);
  window.fetch = async function (url, options) {
    const start = Date.now();
    const method = (options?.method ?? 'GET').toUpperCase();
    try {
      const resp = await _originalFetch(url, options);
      pushRing(
        _networkLog,
        { url: String(url), method, status: resp.status, ms: Date.now() - start },
        NETWORK_LOG_LIMIT
      );
      return resp;
    } catch (err) {
      pushRing(
        _networkLog,
        { url: String(url), method, status: 0, ms: Date.now() - start },
        NETWORK_LOG_LIMIT
      );
      throw err;
    }
  };
}

/** @returns {NetworkLogEntry[]} */
export function getNetworkLog() {
  return [..._networkLog];
}

/**
 * Strip the query string and fragment from a URL, keeping only
 * `scheme://host/path`. Used to sanitize captured network-log URLs before they
 * are attached to a feedback ticket, so search terms, filters, and record IDs
 * are not exposed (feature 049, FR-013). Falls back to the input unchanged when
 * the string cannot be parsed as a URL.
 * @param {string} url
 * @returns {string}
 */
export function sanitizeNetworkUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    // Relative URL (no base) — `new URL` throws, so strip the query string and
    // fragment manually to keep the same guarantee for relative paths.
    return String(url).split(/[?#]/)[0];
  }
}

// ── Error log + app log (T006) ────────────────────────────────────

/** @type {SessionError[]} */
const _errorLog = [];
const ERROR_LOG_LIMIT = 10;

/** @type {AppLogEntry[]} */
const _appLog = [];
const APP_LOG_LIMIT = 50;

/** Install window.onerror + unhandledrejection listeners. Idempotent via flag. */
let _errorsInstalled = false;
export function installErrorLog() {
  if (_errorsInstalled || typeof window === 'undefined') return;
  _errorsInstalled = true;
  window.onerror = function (_msg, _src, _line, _col, err) {
    pushRing(
      _errorLog,
      {
        message: err?.message ?? String(_msg),
        stack: err?.stack ?? '',
        timestamp: new Date().toISOString(),
      },
      ERROR_LOG_LIMIT
    );
  };
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason;
    pushRing(
      _errorLog,
      {
        message: reason?.message ?? String(reason),
        stack: reason?.stack ?? '',
        timestamp: new Date().toISOString(),
      },
      ERROR_LOG_LIMIT
    );
  });
}

/** @returns {SessionError[]} */
export function getErrorLog() {
  return [..._errorLog];
}

/**
 * Structured app-level log. Modules call this instead of console.log for
 * traceability in bug reports.
 * @param {'log'|'warn'|'error'} level
 * @param {string} message
 */
export function log(level, message) {
  pushRing(_appLog, { level, message, timestamp: new Date().toISOString() }, APP_LOG_LIMIT);
}

/** @returns {AppLogEntry[]} */
export function getAppLog() {
  return [..._appLog];
}

// ── localStorage snapshot (T007) ──────────────────────────────────

const STORAGE_ALLOWLIST = [
  'redmine_calendar_theme',
  'redmine_calendar_view_mode',
  'redmine_calendar_active_view',
  'redmine_calendar_day_range',
  'redmine_calendar_working_hours',
  'redmine_calendar_weekly_hours',
  'redmine_calendar_fast_mode',
  'redmine_calendar_auto_refresh_interval',
  'redmine_calendar_ai_consent',
  'redmine_calendar_planning_source_outlook',
  'redmine_calendar_planning_source_teams',
  'redmine_calendar_voice_privacy_dismissed',
];

/** @returns {Record<string, string>} */
export function getLocalStorageSnapshot() {
  if (typeof localStorage === 'undefined') return /** @type {Record<string, string>} */ ({});
  /** @type {Record<string, string>} */
  const result = {};
  for (const key of STORAGE_ALLOWLIST) {
    const val = localStorage.getItem(key);
    if (val !== null) result[key] = val;
  }
  return result;
}

// ── Screenshot + context collection (T009) ────────────────────────

/**
 * Capture a PNG data URL of the current tab using getDisplayMedia.
 * Returns null on any error (browser restriction, user cancellation, etc.).
 * @returns {Promise<string|null>}
 */
export async function captureScreenshotTab() {
  try {
    // preferCurrentTab is a Chrome hint not yet in the TypeScript lib types.
    const stream = await navigator.mediaDevices.getDisplayMedia(
      /** @type {any} */ ({ video: { displaySurface: 'browser' }, preferCurrentTab: true })
    );
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await new Promise((resolve) => {
      video.onloadedmetadata = () => resolve(video.play());
    });
    await new Promise((r) => requestAnimationFrame(r));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0);
    stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Extract OS name from a userAgent string.
 * @param {string} ua
 * @returns {string}
 */
export function _extractOs(ua) {
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os/i.test(ua)) return 'Mac OS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

/**
 * Classify the device form factor from a userAgent string.
 * @param {string} ua
 * @returns {'Mobile'|'Desktop'}
 */
export function _deviceType(ua) {
  return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua) ? 'Mobile' : 'Desktop';
}

/** @returns {string} The IANA timezone name, or '' when unavailable. */
function _timezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

/** @returns {boolean} Whether a Redmine API key is stored (never the key). */
function _credentialsConfigured() {
  return (
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('redmine_calendar_credentials') !== null
  );
}

/** @returns {{userAgent:string, locale:string, online:boolean}} */
function _navInfo() {
  if (typeof navigator === 'undefined') return { userAgent: '', locale: '', online: true };
  return {
    userAgent: navigator.userAgent,
    locale: navigator.language ?? '',
    online: navigator.onLine,
  };
}

/** @returns {{viewportWidth:number, viewportHeight:number, screenWidth:number, screenHeight:number, devicePixelRatio:number}} */
function _displayInfo() {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 0,
      viewportHeight: 0,
      screenWidth: 0,
      screenHeight: 0,
      devicePixelRatio: 1,
    };
  }
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    devicePixelRatio: window.devicePixelRatio ?? 1,
  };
}

/** @returns {{redmineServerUrl:string, aiProvider:string, aiModel:string, feedbackSystem:string}} */
function _configMeta() {
  const cfg = /** @type {import('./types').CentralConfig} */ (getCentralConfigSync() ?? {});
  return {
    redmineServerUrl: cfg.redmineServerUrl ?? cfg.redmineUrl ?? '',
    aiProvider: cfg.aiProvider ?? '',
    aiModel: cfg.aiModel ?? '',
    feedbackSystem: cfg.feedback?.system ?? '',
  };
}

/**
 * Collect base environment context. Includes only non-sensitive signals: app
 * version, device/OS/locale/timezone, viewport + screen, online status, whether
 * credentials are configured (boolean, never the key), and the non-sensitive
 * admin config already public in `config.json`.
 *
 * NOTE: when you add a field here, also add a row to {@link buildEnvPairs} so it
 * surfaces in the ticket — `tests/unit/feedback-context.test.js` enforces this.
 * @param {string|null} [screenshot]  Screenshot data URL, or null if none taken yet.
 * @returns {Promise<object>}
 */
export async function collectBaseContext(screenshot = null) {
  const nav = _navInfo();
  return {
    pageUrl: typeof window !== 'undefined' ? (window.location?.href ?? '') : '',
    appVersion: await getVersion(),
    userAgent: nav.userAgent,
    os: _extractOs(nav.userAgent),
    deviceType: _deviceType(nav.userAgent),
    locale: nav.locale,
    timezone: _timezone(),
    ..._displayInfo(),
    online: nav.online,
    credentialsConfigured: _credentialsConfigured(),
    ..._configMeta(),
    screenshotDataUrl: screenshot,
  };
}

/**
 * Build the ordered [label, value] pairs for the Environment section, shared by
 * the in-dialog preview and both ticket bodies (Redmine HTML + GitHub Markdown).
 * Empty / missing values are dropped so the section stays tidy.
 * @param {object} ctx  A base/bug context object or a FeedbackReport.
 * @returns {Array<[string, string]>}
 */
export function buildEnvPairs(ctx) {
  const dpr = ctx.devicePixelRatio;
  const yn = (b) => (b === undefined || b === null ? '' : b ? 'Yes' : 'No');
  /** @type {Array<[string, string]>} */
  const pairs = [
    ['App URL', ctx.pageUrl],
    ['App Version', ctx.appVersion],
    ['Device', ctx.deviceType],
    ['OS', ctx.os],
    ['Locale', ctx.locale],
    ['Timezone', ctx.timezone],
    ['Viewport', ctx.viewportWidth ? `${ctx.viewportWidth} × ${ctx.viewportHeight}` : ''],
    [
      'Screen',
      ctx.screenWidth ? `${ctx.screenWidth} × ${ctx.screenHeight}${dpr ? ` @ ${dpr}x` : ''}` : '',
    ],
    ['Online', yn(ctx.online)],
    ['Credentials configured', yn(ctx.credentialsConfigured)],
    ['Redmine Server', ctx.redmineServerUrl],
    ['AI Provider', ctx.aiProvider],
    ['AI Model', ctx.aiModel],
    ['Feedback System', ctx.feedbackSystem],
    ['User Agent', ctx.userAgent],
  ];
  return pairs.filter(([, v]) => v !== undefined && v !== null && v !== '');
}

// Calendar state provider registered by calendar.js at startup (avoids a
// dynamic import that would add calendar.js's full closure to this module).
let _calendarStateProvider = null;

/**
 * Register a function that returns the current calendar view state.
 * Called once by calendar.js after initialisation.
 * @param {() => object|null} fn
 */
export function setCalendarStateProvider(fn) {
  _calendarStateProvider = fn;
}

/**
 * Collect full bug-report context (base + all ring buffers + calendar state).
 * @param {string|null} [screenshot]  Pre-captured screenshot data URL.
 * @returns {Promise<object>}
 */
export async function collectBugContext(screenshot = undefined) {
  const base = await collectBaseContext(screenshot);
  return {
    ...base,
    errors: getErrorLog(),
    networkLog: getNetworkLog(),
    appLog: getAppLog(),
    localStorageSnapshot: getLocalStorageSnapshot(),
    calendarState: _calendarStateProvider?.() ?? null,
  };
}
