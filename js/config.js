// ── Calendar display constants ────────────────────────────────────
/** FullCalendar slot grid step (HH:MM:SS). @type {string} */
export const SLOT_DURATION = '00:15:00';
/** FullCalendar drag-snap step (HH:MM:SS). @type {string} */
export const SNAP_DURATION = '00:15:00';
/** Lower bound of the day grid (hour 0..24). @type {number} */
export const START_HOUR = 0; // 00:00
/** Upper bound of the day grid (hour 0..24). @type {number} */
export const END_HOUR = 24; // 24:00

// ── Infrastructure constants ──────────────────────────────────────

// ── Storage keys ──────────────────────────────────────────────────
/** localStorage key — `{start, end}` working hours JSON. @type {string} */
export const STORAGE_KEY_WORKING_HOURS = 'redmine_calendar_working_hours';
/** localStorage key — `'working' | '24h'` view mode. @type {string} */
export const STORAGE_KEY_VIEW_MODE = 'redmine_calendar_view_mode';
/** localStorage key — `'workweek' | 'full-week'` day-range mode. @type {string} */
export const STORAGE_KEY_DAY_RANGE = 'redmine_calendar_day_range';
/** localStorage key — JSON array of favourite tickets. @type {string} */
export const STORAGE_KEY_FAVOURITES = 'redmine_calendar_favourites';
/** localStorage key — JSON array of recently-used tickets. @type {string} */
export const STORAGE_KEY_LAST_USED = 'redmine_calendar_last_used';

/** localStorage key — numeric weekly contracted hours. @type {string} */
export const STORAGE_KEY_WEEKLY_HOURS = 'redmine_calendar_weekly_hours';

// ── AI Chatbot constants ─────────────────────────────────────────
/** Default `max_tokens` used in chatbot API requests. @type {number} */
export const AI_MAX_TOKENS = 1024;
