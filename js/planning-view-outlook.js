// @ts-nocheck — DOM-heavy module; pure exports are JSDoc-typed below.

/** @typedef {import('./types').CalendarProposal} CalendarProposal */
/** @typedef {import('./types').PlanningEvent} PlanningEvent */
/** @typedef {import('./types').TimeEntry} TimeEntry */

import { t } from './i18n.js';
import { STORAGE_KEY_PLANNING_SOURCE_OUTLOOK } from './config.js';
import { stampClosedStatus } from './redmine-api.js';
import {
  isOutlookConfigured,
  isMsalSignedIn,
  fetchCalendarEvents,
  parseCalendarProposals,
  acquireToken,
} from './outlook.js';
import { getCentralConfigSync } from './config-store.js';
import { readWorkingHours } from './working-hours.js';
import {
  isFullyCovered,
  classifyProposal,
  renderColumnPrompt,
  toTimedEvent,
  createColumnState,
  withSpinnerAndError,
} from './planning-view-column-base.js';
import { renderPlanningColumn, rerenderPlanningColumn } from './planning-view-column-render.js';

// Re-export pure utils so planning-view.js keeps working without touching its imports.
export { isFullyCovered, classifyProposal };

// ── Per-column state ──────────────────────────────────────────────

const col = createColumnState();
export const getSelectedEventIds = col.getSelectedEventIds;
export const getSelectedEvents = col.getSelectedEvents;
export const clearSelection = col.clearSelection;

// ── Active FC instance (boxed so the shared orchestrator can swap it) ─────────
const _fcRef = { current: null };

// ── Availability guard ────────────────────────────────────────────

async function _checkOutlookAvailability(container, date, bookings) {
  const sourceEnabled = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_OUTLOOK) !== '0';
  if (!sourceEnabled) {
    renderColumnPrompt(container, t('planning.outlook_disabled'), null, 'planning-column-prompt');
    return false;
  }
  if (!isOutlookConfigured()) {
    renderColumnPrompt(
      container,
      t('planning.outlook_not_connected'),
      null,
      'planning-column-prompt'
    );
    return false;
  }
  const inDemoMode = getCentralConfigSync()?.azureClientId === 'demo';
  if (!inDemoMode && !isMsalSignedIn()) {
    renderColumnPrompt(
      container,
      t('planning.outlook_sign_in'),
      async () => {
        try {
          await acquireToken();
          await renderOutlookColumn(container, date, bookings, null);
        } catch {
          /* handled by acquireToken popup */
        }
      },
      'planning-column-prompt',
      'planning.outlook_retry'
    );
    return false;
  }
  return true;
}

// ── Data fetch + parse ────────────────────────────────────────────

async function _fetchAndParseProposals(container, date, bookings) {
  const events = await withSpinnerAndError(
    container,
    () => fetchCalendarEvents(date),
    async () => renderOutlookColumn(container, date, bookings, null),
    'planning.outlook_error',
    'planning.outlook_retry'
  );
  if (!events) return null;

  const cfg = getCentralConfigSync() ?? {};
  const wh = readWorkingHours();
  const weeklyHours = Number(localStorage.getItem('redmine_calendar_weekly_hours')) || null;
  const { proposals, skippedInformational } = parseCalendarProposals(
    events,
    [],
    weeklyHours,
    cfg.holidayTicket ?? null,
    cfg.vacationTicket ?? null,
    cfg.breakTicket ?? null,
    wh?.start ?? null
  );
  return { proposals, events, skippedInformational };
}

// ── Outlook-specific adapter: raw events → buildPlanningEvents input ──

async function _buildItems(proposals, events) {
  for (const p of proposals) p.source = 'Outlook';
  await stampClosedStatus(proposals);
  return proposals.map((proposal, i) => {
    const rawEvent = events[i] ?? {};
    const timedProposal = toTimedEvent(proposal, null);
    return {
      proposal: timedProposal,
      displayStartTime: rawEvent.start?.slice(11, 16) ?? timedProposal.startTime,
      displayEndTime: rawEvent.end?.slice(11, 16) ?? timedProposal.endTime,
      rawEvent,
    };
  });
}

// ── Main render functions ─────────────────────────────────────────

/**
 * Fetch Outlook events, classify them, and render into container as FC instance.
 * @param {HTMLElement} container
 * @param {string} date  YYYY-MM-DD
 * @param {TimeEntry[]} bookings
 * @param {HTMLElement|null} _bookingsContainer  unused (kept for call-site compat)
 * @returns {Promise<PlanningEvent[]>}
 */
export async function renderOutlookColumn(container, date, bookings, _bookingsContainer) {
  return renderPlanningColumn({
    container,
    date,
    bookings,
    col,
    fcRef: _fcRef,
    availabilityGuard: _checkOutlookAvailability,
    fetchAndBuildItems: async () => {
      const parsed = await _fetchAndParseProposals(container, date, bookings);
      if (!parsed) return null;
      return _buildItems(parsed.proposals, parsed.events);
    },
  });
}

/**
 * Re-render the Outlook column using already-fetched events (e.g. after
 * a time-range toggle or booking change updates coverage state).
 * @param {HTMLElement} container
 * @param {PlanningEvent[]} planningEvents
 * @param {HTMLElement|null} _bookingsContainer  unused
 */
export function rerenderOutlookColumn(container, planningEvents, _bookingsContainer) {
  rerenderPlanningColumn(col, _fcRef, planningEvents);
}
