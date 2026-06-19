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
import { readWorkingHours } from './settings.js';
import {
  isFullyCovered,
  classifyProposal,
  renderColumnPrompt,
  buildPlanningEvents,
  toTimedEvent,
  createColumnState,
  buildFcEventsForColumn,
  createReadonlyFcColumn,
} from './planning-view-column-base.js';

// Re-export pure utils so planning-view.js keeps working without touching its imports.
export { isFullyCovered, classifyProposal };

// ── Per-column state ──────────────────────────────────────────────

const col = createColumnState();
export const getSelectedEventIds = col.getSelectedEventIds;
export const getSelectedEvents = col.getSelectedEvents;
export const clearSelection = col.clearSelection;

// ── Active FC instance (module-level, destroyed+recreated per day) ────────────
let _fcInst = null;
let _currentDate = null;

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
  const spinner = document.createElement('div');
  spinner.className = 'planning-column-spinner';
  container.appendChild(spinner);

  let events;
  try {
    events = await fetchCalendarEvents(date);
  } catch (err) {
    container.innerHTML = '';
    renderColumnPrompt(
      container,
      t('planning.outlook_error', { message: err.message }),
      async () => renderOutlookColumn(container, date, bookings, null),
      'planning-column-prompt',
      'planning.outlook_retry'
    );
    return null;
  }

  container.innerHTML = '';
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
  if (_fcInst) {
    _fcInst.destroy();
    _fcInst = null;
  }
  container.innerHTML = '';
  col.setRenderedPlanningEvents([]);
  col.clearSelection();
  _currentDate = date;

  const ok = await _checkOutlookAvailability(container, date, bookings);
  if (!ok) return [];

  const parsed = await _fetchAndParseProposals(container, date, bookings);
  if (!parsed) return [];

  const { proposals, events } = parsed;
  const items = await _buildItems(proposals, events);
  const planningEvents = buildPlanningEvents(items, bookings);
  col.setRenderedPlanningEvents(planningEvents);

  _fcInst = createReadonlyFcColumn(container, date, col);
  col.setActiveFcInstance(_fcInst.cal);
  _fcInst.setEvents(buildFcEventsForColumn(planningEvents, date, col));

  container.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-planning-id]')) col.clearSelection();
  });

  col.enrichTicketInfoAsync(planningEvents).catch(() => {});
  return planningEvents;
}

/**
 * Re-render the Outlook column using already-fetched events (e.g. after
 * a time-range toggle or booking change updates coverage state).
 * @param {HTMLElement} container
 * @param {PlanningEvent[]} planningEvents
 * @param {HTMLElement|null} _bookingsContainer  unused
 */
export function rerenderOutlookColumn(container, planningEvents, _bookingsContainer) {
  if (_fcInst) {
    _fcInst.destroy();
    _fcInst = null;
  }
  container.innerHTML = '';
  col.setRenderedPlanningEvents(planningEvents);
  _fcInst = createReadonlyFcColumn(container, _currentDate, col);
  col.setActiveFcInstance(_fcInst.cal);
  _fcInst.setEvents(buildFcEventsForColumn(planningEvents, _currentDate, col));
  col.syncSelectionClasses();

  container.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-planning-id]')) col.clearSelection();
  });
}
