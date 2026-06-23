// @ts-nocheck — DOM-heavy orchestration module; pure exports (expandToWeekdays, isMultiDay) are JSDoc-typed.
/**
 * Multi-day planning event expansion and orchestration.
 *
 * Source-agnostic — works with Outlook, Teams, and any future planning column.
 * The single entry-point for the shared `_onColumnDrop` handler in planning-view.js.
 */

import { t } from './i18n.js';
import { showToast } from './notify.js';
import { openForm } from './time-entry-form.js';
import { createTimeEntry } from './redmine-api.js';
import { runDropGuards } from './booking-guard.js';
import { readWeeklyHours } from './working-hours.js';
import { getCentralConfigSync } from './config-store.js';

// ── Pure helpers ──────────────────────────────────────────────────

/**
 * Expand a date range into an array of weekday (Mon–Fri) date strings.
 * Both dates are treated as YYYY-MM-DD UTC strings; the range is inclusive.
 * @param {string} startDate  YYYY-MM-DD
 * @param {string} endDate    YYYY-MM-DD
 * @returns {string[]}  Array of YYYY-MM-DD strings for Mon–Fri within the range.
 */
export function expandToWeekdays(startDate, endDate) {
  const result = [];
  const end = new Date(endDate + 'T00:00:00Z');
  const cursor = new Date(startDate + 'T00:00:00Z');
  while (cursor <= end) {
    const day = cursor.getUTCDay(); // 0=Sun … 6=Sat
    if (day >= 1 && day <= 5) result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

/**
 * Returns true when a rawEvent spans more than one calendar day.
 * Uses `rawEvent.start` and `rawEvent.end` date strings (slice 0-10).
 * Returns false for Teams events which use different field names (startDateTime/scheduledStart).
 * @param {{ start?: string; end?: string }} rawEvent
 * @returns {boolean}
 */
export function isMultiDay(rawEvent) {
  if (!rawEvent.start || !rawEvent.end) return false;
  return rawEvent.end.slice(0, 10) > rawEvent.start.slice(0, 10);
}

// ── Internal helpers ──────────────────────────────────────────────

/**
 * Create one time entry for a specific date and push it onto the undo stack.
 * @param {string} spentOn  YYYY-MM-DD
 * @param {number|null|undefined} issueId
 * @param {number} hours
 * @param {number|null|undefined} activityId
 * @param {string} comment
 * @param {string|null|undefined} startTime  HH:MM or null
 * @param {string|null|undefined} endTime    HH:MM or null
 * @returns {Promise<object>}  Saved TimeEntry
 */
async function _createEntry(spentOn, issueId, hours, activityId, comment, startTime, endTime) {
  const saved = await createTimeEntry({
    spentOn,
    hours,
    issueId,
    activityId: activityId ?? undefined,
    comment: comment ?? '',
    startTime: startTime ?? undefined,
    endTime: endTime ?? undefined,
  });
  document.dispatchEvent(
    new CustomEvent('undo:push', {
      detail: { type: 'add', entry: { ...saved, spentOn: saved.spentOn ?? spentOn } },
    })
  );
  return saved;
}

/**
 * Orchestrate booking for a multi-day planning event.
 *
 * @param {import('./types.d.ts').PlanningEvent} planningEvent
 * @param {string} planningDay  YYYY-MM-DD of the planning-view day the user was viewing.
 * @param {() => Promise<void>} refreshFn  Called after batch completes.
 */
export async function bookLongPlanningEvent(planningEvent, planningDay, refreshFn) {
  const weeklyHours = readWeeklyHours();
  if (weeklyHours == null) {
    showToast(t('outlook.bulk_weekly_hours_missing'));
    return;
  }

  const { proposal, planningCategory, rawEvent } = planningEvent;
  const startDate = rawEvent.start.slice(0, 10);
  const endDate = rawEvent.end.slice(0, 10);
  const dates = expandToWeekdays(startDate, endDate);

  if (dates.length === 0) {
    showToast(t('outlook.bulk_none_weekdays'));
    return;
  }

  const dailyHours = weeklyHours / 5;

  document.dispatchEvent(new CustomEvent('undo:batchbegin'));
  let succeeded = 0;
  let failed = 0;

  try {
    if (planningCategory === 'needs-ticket') {
      await _bookNeedsTicketBatch(planningEvent, dates, dailyHours);
      // fall through — refreshFn called below; _bookNeedsTicketBatch handles toast
    } else {
      // bookable / break path — create entries directly for each weekday
      const cfg = getCentralConfigSync();
      for (const date of dates) {
        const startTime = proposal.startTimeBooked ?? proposal.startTime ?? null;
        const guardOk = await runDropGuards(
          date,
          startTime,
          date,
          startTime,
          proposal.ticketId,
          cfg
        );
        if (!guardOk) break; // user cancelled a guard dialog — stop the batch
        try {
          await _createEntry(
            date,
            proposal.ticketId,
            dailyHours,
            null,
            proposal.subject ?? '',
            startTime,
            proposal.endTimeBooked ?? proposal.endTime ?? null
          );
          succeeded++;
        } catch {
          failed++;
        }
      }
      _emitToast(succeeded, dates.length, failed);
    }
  } finally {
    document.dispatchEvent(new CustomEvent('undo:batchend'));
  }

  await refreshFn();
}

/**
 * Needs-ticket path: open modal once for dates[0], then book remaining dates silently.
 * @param {import('./types.d.ts').PlanningEvent} planningEvent
 * @param {string[]} dates
 * @param {number} dailyHours
 */
async function _bookNeedsTicketBatch(planningEvent, dates, dailyHours) {
  const { proposal } = planningEvent;

  const firstEntry = await new Promise((resolve) => {
    openForm(
      null,
      {
        date: dates[0],
        startTime: proposal.startTimeBooked ?? proposal.startTime,
        endTime: proposal.endTimeBooked ?? proposal.endTime,
        hours: dailyHours,
        comment: planningEvent.bookingComment ?? proposal.subject,
        bulkDayCount: dates.length,
        sourceEvent: {
          subject: proposal.subject,
          startTime: proposal.startTimeBooked ?? proposal.startTime,
          endTime: proposal.endTimeBooked ?? proposal.endTime,
          source: proposal.source,
        },
      },
      resolve,
      undefined,
      () => resolve(null)
    );
  });

  if (firstEntry == null) {
    // user cancelled — undo:batchend fires in finally, buffer is empty → no-op
    return;
  }

  // Book remaining dates using ticket/activity/comment from the saved first entry.
  let succeeded = 1; // day 0 was created by the form
  let failed = 0;
  for (const date of dates.slice(1)) {
    try {
      await _createEntry(
        date,
        firstEntry.issueId,
        dailyHours,
        firstEntry.activityId ?? null,
        firstEntry.comment ?? '',
        firstEntry.startTime ?? null,
        firstEntry.endTime ?? null
      );
      succeeded++;
    } catch {
      failed++;
    }
  }

  _emitToast(succeeded, dates.length, failed);
  // refreshFn is called by the outer function after finally block
}

/**
 * Show the appropriate toast based on booking outcome.
 * @param {number} succeeded
 * @param {number} total
 * @param {number} failed
 */
function _emitToast(succeeded, total, failed) {
  if (failed > 0) {
    showToast(t('outlook.bulk_partial', { n: succeeded, total, failed }));
  } else if (succeeded > 0) {
    showToast(t('outlook.bulk_booked', { n: succeeded }));
  }
}
