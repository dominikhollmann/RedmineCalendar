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
  renderTimeGrid,
  renderColumnPrompt,
  buildPlanningEvents,
  renderColumnCards,
  createColumnState,
} from './planning-view-column-base.js';

// Re-export pure utils so planning-view.js and existing tests keep working
// without touching their import paths.
export { isFullyCovered, classifyProposal, renderTimeGrid };

// ── Per-column state ──────────────────────────────────────────────

const col = createColumnState();
export const getSelectedEventIds = col.getSelectedEventIds;
export const getSelectedEvents = col.getSelectedEvents;
export const clearSelection = col.clearSelection;

const _handlers = { onCardClick: col.handleCardClick, onDragStart: col.handleDragStart };
const _colOpts = { timedAreaClass: 'planning-outlook-timed', emptyKey: 'planning.outlook_empty' };

// ── Availability guard ────────────────────────────────────────────

async function _checkOutlookAvailability(container, date, bookings, bookingsContainer) {
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
          await renderOutlookColumn(container, date, bookings, bookingsContainer);
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

async function _fetchAndParseProposals(container, date, bookings, bookingsContainer) {
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
      async () => renderOutlookColumn(container, date, bookings, bookingsContainer),
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
    return {
      proposal,
      displayStartTime: rawEvent.start?.slice(11, 16) ?? proposal.startTime,
      displayEndTime: rawEvent.end?.slice(11, 16) ?? proposal.endTime,
      rawEvent,
    };
  });
}

// ── Main render functions ─────────────────────────────────────────

/**
 * Fetch Outlook events, classify them, and render into container.
 * @param {HTMLElement} container
 * @param {string} date  YYYY-MM-DD
 * @param {TimeEntry[]} bookings
 * @param {HTMLElement|null} bookingsContainer
 * @returns {Promise<PlanningEvent[]>}
 */
export async function renderOutlookColumn(container, date, bookings, bookingsContainer) {
  container.innerHTML = '';
  col.setRenderedEvents([]);
  col.clearSelection();

  const ok = await _checkOutlookAvailability(container, date, bookings, bookingsContainer);
  if (!ok) return [];

  const parsed = await _fetchAndParseProposals(container, date, bookings, bookingsContainer);
  if (!parsed) return [];

  const { proposals, events } = parsed;
  const items = await _buildItems(proposals, events);
  const planningEvents = buildPlanningEvents(items, bookings);
  col.setRenderedEvents(planningEvents);
  renderColumnCards(container, planningEvents, bookingsContainer, _handlers, _colOpts);

  container.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-planning-id]')) col.clearSelection();
  });

  col.enrichTicketInfoAsync(planningEvents).catch(() => {});
  return planningEvents;
}

/**
 * Re-render the Outlook column using already-fetched events (e.g. after a
 * time-range toggle changes the Bookings FC's slot geometry).
 * @param {HTMLElement} container
 * @param {PlanningEvent[]} planningEvents
 * @param {HTMLElement|null} bookingsContainer
 */
export function rerenderOutlookColumn(container, planningEvents, bookingsContainer) {
  container.innerHTML = '';
  renderColumnCards(container, planningEvents, bookingsContainer, _handlers, _colOpts);
  container.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-planning-id]')) col.clearSelection();
  });
  col.syncSelectionClasses();
}
