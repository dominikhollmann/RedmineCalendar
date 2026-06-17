// @ts-check
/**
 * Booking Guard — soft-warning dialogs for time-entry mutations.
 *
 * Exported functions:
 *   runSaveGuards(opts)                              → Promise<boolean>
 *   runDeleteGuard(date, startTime, cfg)             → Promise<boolean>
 *   deadlineTriggeredForMove(oDate, oTime, nDate, nTime, cfg) → boolean
 */
import { showConfirmDialog } from './confirm-dialog.js';
import { t } from './i18n.js';

/**
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function _dialog(title, message) {
  return new Promise((resolve) => {
    showConfirmDialog({
      title,
      message,
      confirmLabel: t('bookingGuard.continueAnyway'),
      cancelLabel: t('cancel'),
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

/**
 * @param {number|null|undefined} issueId
 * @param {import('./types.d.ts').CentralConfig} cfg
 * @returns {boolean}
 */
function isExempt(issueId, cfg) {
  if (issueId == null) return false;
  return issueId === cfg.holidayTicket || issueId === cfg.vacationTicket;
}

/**
 * Returns the most recent past deadline Date before `now`, or null when the feature is disabled.
 * @param {Date} now
 * @param {import('./types.d.ts').CentralConfig} cfg
 * @returns {Date|null}
 */
function lastDeadlineBefore(now, cfg) {
  if (!cfg?.bookingDeadline?.enabled) return null;
  const { dayOfWeek = 5, hour = 22, minute = 0 } = cfg.bookingDeadline;
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  const dayDiff = (candidate.getDay() - dayOfWeek + 7) % 7;
  candidate.setDate(candidate.getDate() - dayDiff);
  if (candidate >= now) candidate.setDate(candidate.getDate() - 7);
  return candidate;
}

/**
 * Combines a YYYY-MM-DD date string and an HH:MM time string (null → "00:00") into a local Date.
 * @param {string} date
 * @param {string|null|undefined} time
 * @returns {Date}
 */
function toDatetime(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = (time ?? '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * Applies the FR-015 trigger matrix.
 * @param {'create'|'edit'|'delete'} op
 * @param {Date} origDt
 * @param {Date} newDt
 * @param {Date} deadline
 * @returns {boolean}
 */
function deadlineTriggered(op, origDt, newDt, deadline) {
  if (op === 'create') return newDt <= deadline;
  if (op === 'edit') return origDt <= deadline || newDt <= deadline;
  return origDt <= deadline;
}

/**
 * Runs the full booking-guard chain for a create or edit operation.
 * Returns true if the operation should proceed, false if the user cancelled any dialog.
 * @param {{ date: string, startTime?: string|null, originalDate?: string|null, originalStartTime?: string|null, issueId?: number|null, cfg: import('./types.d.ts').CentralConfig }} opts
 * @returns {Promise<boolean>}
 */
export async function runSaveGuards(opts) {
  const { date, startTime, originalDate, originalStartTime, issueId, cfg } = opts;
  const today = new Date().toISOString().slice(0, 10);

  if (date > today && !isExempt(issueId, cfg)) {
    const ok = await _dialog(t('bookingGuard.futureDateTitle'), t('bookingGuard.futureDateBody'));
    if (!ok) return false;
  }

  const deadline = lastDeadlineBefore(new Date(), cfg);
  if (deadline) {
    const op = originalDate == null ? 'create' : 'edit';
    const origDt = toDatetime(originalDate ?? date, originalStartTime ?? startTime);
    const newDt = toDatetime(date, startTime);
    if (deadlineTriggered(op, origDt, newDt, deadline)) {
      const ok = await _dialog(t('bookingGuard.deadlineTitle'), t('bookingGuard.deadlineBody'));
      if (!ok) return false;
    }
  }

  return true;
}

/**
 * Runs the deadline guard only for a delete operation (single entry).
 * Returns true if the deletion should proceed, false if the user cancelled.
 * @param {string} date
 * @param {string|null|undefined} startTime
 * @param {import('./types.d.ts').CentralConfig} cfg
 * @returns {Promise<boolean>}
 */
export async function runDeleteGuard(date, startTime, cfg) {
  const deadline = lastDeadlineBefore(new Date(), cfg);
  if (!deadline) return true;
  const origDt = toDatetime(date, startTime);
  if (deadlineTriggered('delete', origDt, origDt, deadline)) {
    const ok = await _dialog(t('bookingGuard.deadlineTitle'), t('bookingGuard.deadlineDeleteBody'));
    if (!ok) return false;
  }
  return true;
}

/**
 * Convenience wrapper used by time-entry-form.js — assembles runSaveGuards opts
 * from the payload object and the current-entry context so the call site stays short.
 * @param {{ spentOn: string, startTime?: string|null }} payload
 * @param {{ date?: string, startTime?: string|null }|null} currentEntry
 * @param {number|null|undefined} issueId
 * @param {import('./types.d.ts').CentralConfig} cfg
 * @returns {Promise<boolean>}
 */
export function guardSave(payload, currentEntry, issueId, cfg) {
  return runSaveGuards({
    date: payload.spentOn,
    startTime: payload.startTime,
    originalDate: currentEntry?.date ?? null,
    originalStartTime: currentEntry?.startTime ?? null,
    issueId,
    cfg,
  });
}

/**
 * Synchronous helper for eventDrop/eventResize drag handlers.
 * Returns true if the move touches the reported period.
 * @param {string} origDate
 * @param {string|null|undefined} origTime
 * @param {string} newDate
 * @param {string|null|undefined} newTime
 * @param {import('./types.d.ts').CentralConfig} cfg
 * @returns {boolean}
 */
export function deadlineTriggeredForMove(origDate, origTime, newDate, newTime, cfg) {
  const deadline = lastDeadlineBefore(new Date(), cfg);
  if (!deadline) return false;
  const origDt = toDatetime(origDate, origTime);
  const newDt = toDatetime(newDate, newTime);
  return deadlineTriggered('edit', origDt, newDt, deadline);
}

/**
 * Synchronous helper for eventDrop: returns true when the drop target is a
 * future date and the ticket is not exempt. Used alongside deadlineTriggeredForMove
 * so both guards can fire in the same drag handler.
 * @param {string} newDate  YYYY-MM-DD of the drop target
 * @param {number|null|undefined} issueId
 * @param {import('./types.d.ts').CentralConfig} cfg
 * @returns {boolean}
 */
export function futureDateTriggeredForMove(newDate, issueId, cfg) {
  const today = new Date().toISOString().slice(0, 10);
  return newDate > today && !isExempt(issueId, cfg);
}
