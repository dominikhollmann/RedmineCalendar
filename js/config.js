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
/** localStorage key — `'false'` disables auto-close on ticket selection; absent or any other value means on. @type {string} */
export const STORAGE_KEY_FAST_MODE = 'redmine_calendar_fast_mode';

/** localStorage key — numeric weekly contracted hours. @type {string} */
export const STORAGE_KEY_WEEKLY_HOURS = 'redmine_calendar_weekly_hours';

/** Default weekly contracted hours, used whenever none is configured. @type {number} */
export const DEFAULT_WEEKLY_HOURS = 40;

/** localStorage key — `'1'` (enabled) / `'0'` (disabled) for Outlook Planning View source. @type {string} */
export const STORAGE_KEY_PLANNING_SOURCE_OUTLOOK = 'redmine_calendar_planning_source_outlook';

/** localStorage key — `'1'` (enabled) / `'0'` (disabled) for Teams Planning View source. Off by default. @type {string} */
export const STORAGE_KEY_PLANNING_SOURCE_TEAMS = 'redmine_calendar_planning_source_teams';

/** localStorage key — JSON `string[]` ordering of planning-source columns (Feature 054 / #274). @type {string} */
export const STORAGE_KEY_PLANNING_SOURCE_ORDER = 'redmine_calendar_planning_source_order';

/** Default planning-source column order (bookings is always first and not part of this list). @type {string[]} */
export const DEFAULT_PLANNING_SOURCE_ORDER = ['outlook', 'teams'];

/** localStorage key — `'planning'` | `'calendar'` — last active top-level view. @type {string} */
export const STORAGE_KEY_ACTIVE_VIEW = 'redmine_calendar_active_view';

// ── Privacy / DSGVO constants ─────────────────────────────────────
/** localStorage key — AI planning consent record (ConsentRecord JSON). @type {string} */
export const STORAGE_KEY_AI_CONSENT = 'redmine_calendar_ai_consent';
/** localStorage key prefix — planning snapshot entries (all keys starting with this are managed by retention cleanup). @type {string} */
export const STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX = 'redmine_calendar_planning_snapshot_';

// ── Interaction constants ─────────────────────────────────────────
/** Double-click detection window shared by all calendar eventClick handlers. @type {number} */
export const DBLCLICK_MS = 300;

// ── AI Chatbot constants ─────────────────────────────────────────
/** Default `max_tokens` used in chatbot API requests. @type {number} */
export const AI_MAX_TOKENS = 1024;
