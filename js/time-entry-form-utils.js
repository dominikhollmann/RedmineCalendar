// Pure helpers, localStorage-backed favourites / last-used storage, stale-ticket
// enrichment, and the shared keyboard-navigation state for the time-entry modal.
// Extracted from js/time-entry-form.js (feature 035) so the modal module and its
// view module both stay under the 500-LOC guardrail. DOM-free — fully unit-testable.

import { searchIssues } from './redmine-api.js';
import {
  STORAGE_KEY_FAVOURITES,
  STORAGE_KEY_LAST_USED,
  STORAGE_KEY_FAST_MODE,
  STORAGE_KEY_BOOKING_MODAL_SIZE,
} from './config.js';
import { getCentralConfigSync } from './config-store.js';
import { t } from './i18n.js';
import { timeToMins } from './time-utils.js';

const RECENT_CAP = 20;

/**
 * Hours value to send Redmine for a break entry.
 * Returns 0 when the server accepts 0h timelogs, otherwise 0.01 as a sentinel
 * so the entry is not rejected. roundHours() in redmine-api.js preserves the
 * sub-0.25 value and never rounds it up.
 * @returns {number}
 */
export function breakHoursForRedmine() {
  return getCentralConfigSync()?.redmineAcceptsZeroHours ? 0 : 0.01;
}

/**
 * Shared keyboard-navigation state — read and written by both time-entry-form.js
 * (search + keyboard handlers) and time-entry-form-view.js (render functions). A
 * single exported object keeps the state shared by reference across the modules
 * without a `window` global (FR-007 pattern: module state, explicit accessor).
 */
export const nav = {
  /** @type {any[]} */
  visibleRows: [], // flat ticket list for keyboard navigation
  highlightedIndex: -1, // index into visibleRows
  searchMode: false, // true while search results are showing
};

// ── Pure helpers (time math, formatting, validation) ──────────────

/**
 * Format an hours-decimal value as a human-readable duration ("1h 30m").
 * Values under one hour render as "<m>m"; whole hours drop the minute suffix.
 * @param {number} hours
 * @returns {string}
 */
export function formatDuration(hours) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

// timeToMins lives in the pure `time-utils` leaf (imported above for diffMinutes);
// re-exported here for the existing public API (consumers/tests that import it
// from this module).
export { timeToMins };

/** Convert minutes-since-midnight to "HH:MM" (wraps modulo 1440). */
export function minsToTime(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Compute the duration in minutes between two HH:MM stamps, wrapping past midnight. */
export function diffMinutes(startHHMM, endHHMM) {
  return (timeToMins(endHHMM) - timeToMins(startHHMM) + 1440) % 1440;
}

/**
 * Pure validator for the save form's time inputs. Returns an i18n key for the
 * first error encountered, or `null` if the inputs are valid.
 * @param {{ hasTicket:boolean, date:string, startInput:string|null, endInput:string|null }} args
 * @returns {string|null}
 */
export function validateTimeInputs({ hasTicket, date, startInput, endInput }) {
  if (!hasTicket) return 'modal.ticket_required';
  if (!date) return 'modal.date_required';
  if (!startInput) return 'modal.start_required';
  if (!endInput) return 'modal.end_required';
  if (endInput <= startInput) return 'modal.end_before_start';
  return null;
}

/**
 * Pure 8-cap dedup helper for the "last used" list. Pushes the new ticket to
 * the front, removes prior entries with the same id, and trims to `cap`.
 * @param {Array<{id:number}>} list
 * @param {{id:number, subject?:string, projectName?:string, projectIdentifier?:(string|null)}} ticket
 * @param {number} [cap=RECENT_CAP]
 * @returns {Array<{id:number}>}
 */
export function capLastUsed(list, ticket, cap = RECENT_CAP) {
  const filtered = list.filter((entry) => entry.id !== ticket.id);
  filtered.unshift(ticket);
  return filtered.slice(0, cap);
}

/** Returns true when fast mode is on (default). Fast mode auto-closes the modal on ticket selection. */
export function getFastMode() {
  return localStorage.getItem(STORAGE_KEY_FAST_MODE) !== 'false';
}

// ── Booking-modal resize (FR-010) ─────────────────────────────────

/** Minimum resizable modal bounds (px) — must match the CSS `min-width/height`. */
export const MODAL_MIN_W = 780;
export const MODAL_MIN_H = 420;

/**
 * Pure decision for the Suche column's render state.
 * @param {string} query
 * @param {number} minLen  minimum query length before searching
 * @param {Array<unknown>} results  fetched results (ignored until a query is long enough)
 * @returns {'empty'|'no-match'|'results'}
 */
export function searchColumnState(query, minLen, results) {
  if (!query || query.trim().length < minLen) return 'empty';
  return results && results.length ? 'results' : 'no-match';
}

/**
 * Read the persisted booking-modal size, or null when unset/corrupt.
 * @returns {{ w:number, h:number }|null}
 */
export function getModalSize() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKING_MODAL_SIZE) ?? 'null');
    if (v && typeof v.w === 'number' && typeof v.h === 'number') return { w: v.w, h: v.h };
    return null;
  } catch {
    return null;
  }
}

/** Persist a (pre-clamped) booking-modal size. @param {{ w:number, h:number }} size */
export function setModalSize(size) {
  localStorage.setItem(STORAGE_KEY_BOOKING_MODAL_SIZE, JSON.stringify({ w: size.w, h: size.h }));
}

/**
 * Clamp a size to the modal's bounds against a viewport. Floors at
 * MODAL_MIN_W×MODAL_MIN_H; caps at 95% of the viewport in each dimension (but
 * never below the floor). PURE — viewport is passed in for testability.
 * @param {{ w:number, h:number }} size
 * @param {{ w:number, h:number }} viewport
 * @returns {{ w:number, h:number }}
 */
export function clampModalSize(size, viewport) {
  const maxW = Math.max(MODAL_MIN_W, Math.round(viewport.w * 0.95));
  const maxH = Math.max(MODAL_MIN_H, Math.round(viewport.h * 0.95));
  return {
    w: Math.min(Math.max(size.w, MODAL_MIN_W), maxW),
    h: Math.min(Math.max(size.h, MODAL_MIN_H), maxH),
  };
}

// ── Favourites / last-used (localStorage) ─────────────────────────

export function getFavourites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_FAVOURITES) ?? 'null') ?? [];
  } catch {
    return [];
  }
}

export function setFavourites(arr) {
  localStorage.setItem(STORAGE_KEY_FAVOURITES, JSON.stringify(arr));
}

export function getLastUsed() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_LAST_USED) ?? 'null') ?? [];
  } catch {
    return [];
  }
}

export function setLastUsed(arr) {
  localStorage.setItem(STORAGE_KEY_LAST_USED, JSON.stringify(arr));
}

// Minimal ticket reference persisted in the favourites / last-used lists.
function _ticketRef(ticket) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    projectName: ticket.projectName ?? '',
    projectIdentifier: ticket.projectIdentifier ?? null,
  };
}

export function addLastUsed(ticket) {
  setLastUsed(capLastUsed(getLastUsed(), _ticketRef(ticket)));
}

export function toggleFavourite(ticket) {
  const favs = getFavourites();
  const idx = favs.findIndex((f) => f.id === ticket.id);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.unshift(_ticketRef(ticket));
  }
  setFavourites(favs);
}

// ── Stale ticket enrichment (shared by last-used + favourites) ────

const _enrichPromises = new Map();

/**
 * Backfill missing project name / identifier on stored tickets by re-querying
 * Redmine, then invoke `renderer` once if anything changed. De-duplicated per
 * getter so concurrent renders don't fire overlapping fetches.
 */
export async function enrichStaleTickets(entries, getter, setter, renderer) {
  const key = getter.name;
  if (_enrichPromises.has(key)) return;
  const stale = entries.filter((entry) => !entry.projectName || !entry.projectIdentifier);
  if (stale.length === 0) return;
  const promise = (async () => {
    let updated = false;
    for (const ticket of stale) {
      try {
        const results = await searchIssues(String(ticket.id));
        const match = results.find((r) => r.id === ticket.id);
        if (match) {
          const list = getter();
          const entry = list.find((e) => e.id === ticket.id);
          if (entry) {
            if (match.projectName) entry.projectName = match.projectName;
            if (match.projectIdentifier) entry.projectIdentifier = match.projectIdentifier;
            setter(list);
            updated = true;
          }
        }
      } catch {
        /* silent */
      }
    }
    _enrichPromises.delete(key);
    if (updated) renderer();
  })();
  _enrichPromises.set(key, promise);
}

/**
 * Maps an entry or prefill object to a minimal issue descriptor, or null when
 * no issueId is present. Used by time-entry-form.js to populate _selectedIssue.
 * @param {{ issueId?: number|null, issueSubject?: string|null, projectName?: string|null, projectIdentifier?: string|null }|null|undefined} source
 * @returns {{ id:number, subject:string, projectName:string, projectIdentifier:string|null }|null}
 */
export function issueFromSource(source) {
  if (!source?.issueId) return null;
  return {
    id: source.issueId,
    subject: source.issueSubject ?? t('entry.fallback_subject', { id: source.issueId }),
    projectName: source.projectName ?? '',
    projectIdentifier: source.projectIdentifier ?? null,
  };
}
