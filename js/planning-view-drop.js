// @ts-nocheck — DOM-heavy module; pure exports are JSDoc-typed.

/** @typedef {import('./types').PlanningEvent} PlanningEvent */
/** @typedef {import('./types').BookingOutcome} BookingOutcome */

import { t } from './i18n.js';
import { showToast } from './notify.js';
import { openForm } from './time-entry-form.js';
import { buildSourceEventInfo } from './planning-view-column-base.js';
import { breakHoursForRedmine } from './time-entry-form-utils.js';
import { createTimeEntry } from './redmine-api.js';
import { confirmClosedTicket } from './confirm-dialog.js';
import { runDropGuards } from './booking-guard.js';
import { getCentralConfigSync } from './config-store.js';

async function _doBookOne(proposal, planningCategory, planningDay) {
  const hours = planningCategory === 'break' ? breakHoursForRedmine() : proposal.hours;
  const saved = await createTimeEntry({
    spentOn: planningDay,
    hours,
    issueId: proposal.ticketId,
    startTime: proposal.startTimeBooked ?? proposal.startTime,
    endTime: proposal.endTimeBooked ?? proposal.endTime,
    comment: proposal.subject ?? '',
  });
  document.dispatchEvent(
    new CustomEvent('undo:push', {
      detail: { type: 'add', entry: { ...saved, spentOn: saved.spentOn ?? planningDay } },
    })
  );
}

async function _bookOne(planningEvent, planningDay) {
  const { proposal, planningCategory } = planningEvent;
  if (planningCategory === 'bookable' || planningCategory === 'break') {
    if (proposal.is_closed === true) {
      const confirmed = await confirmClosedTicket();
      if (!confirmed) return 'canceled';
    }
    const startTime = proposal.startTimeBooked ?? proposal.startTime ?? null;
    if (
      !(await runDropGuards(
        planningDay,
        startTime,
        planningDay,
        startTime,
        proposal.ticketId,
        getCentralConfigSync()
      ))
    )
      return 'canceled';
    await _doBookOne(proposal, planningCategory, planningDay);
    return 'ok';
  } else if (planningCategory === 'needs-ticket') {
    const result = await new Promise((resolve) => {
      openForm(
        null,
        {
          date: planningDay,
          startTime: proposal.startTimeBooked ?? proposal.startTime,
          endTime: proposal.endTimeBooked ?? proposal.endTime,
          hours: proposal.hours,
          comment: planningEvent.bookingComment ?? proposal.subject,
          sourceEvent: buildSourceEventInfo(planningEvent),
        },
        resolve,
        undefined,
        () => resolve(null)
      );
    });
    return result == null ? 'canceled' : 'ok';
  }
  return 'ok';
}

/**
 * Book a batch of planning events for the given day, then call refreshFn.
 * @param {PlanningEvent[]} planningEvents
 * @param {string} planningDay  YYYY-MM-DD
 * @param {() => Promise<void>} refreshFn  Called after the batch completes.
 */
export async function bookBatch(planningEvents, planningDay, refreshFn) {
  let succeeded = 0;
  let canceled = 0;
  /** @type {BookingOutcome[]} */
  const failed = [];
  // Coalesce every add from this drag into a single undo step (one Ctrl+Z
  // reverses the whole batch). The undo layer buffers `undo:push` adds
  // between batchbegin/batchend into one `bulk-add` action.
  document.dispatchEvent(new CustomEvent('undo:batchbegin'));
  try {
    for (const pe of planningEvents) {
      try {
        const status = await _bookOne(pe, planningDay);
        if (status === 'canceled') canceled++;
        else succeeded++;
      } catch (err) {
        failed.push({ event: pe, ok: false, error: err });
      }
    }
  } finally {
    document.dispatchEvent(new CustomEvent('undo:batchend'));
  }
  const parts = [];
  if (succeeded > 0) parts.push(t('planning.batch_n_succeeded', { n: succeeded }));
  if (canceled > 0) parts.push(t('planning.batch_n_canceled', { n: canceled }));
  if (failed.length > 0) parts.push(t('planning.batch_n_failed', { n: failed.length }));
  if (parts.length > 0) showToast(parts.join(' · '));
  failed.forEach((o) =>
    showToast(
      t('planning.batch_failed_item', {
        subject: o.event.proposal.subject,
        error: o.error?.message ?? '',
      })
    )
  );
  await refreshFn();
}
