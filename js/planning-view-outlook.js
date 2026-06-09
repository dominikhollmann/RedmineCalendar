// @ts-nocheck — DOM-heavy module; pure exports are JSDoc-typed below.

/** @typedef {import('./types').CalendarProposal} CalendarProposal */
/** @typedef {import('./types').PlanningEventCategory} PlanningEventCategory */
/** @typedef {import('./types').PlanningEvent} PlanningEvent */
/** @typedef {import('./types').TimeEntry} TimeEntry */

import { t } from './i18n.js';
import { STORAGE_KEY_PLANNING_SOURCE_OUTLOOK } from './config.js';
import {
  isOutlookConfigured,
  isMsalSignedIn,
  fetchCalendarEvents,
  parseCalendarProposals,
  acquireToken,
} from './outlook.js';
import { getCentralConfigSync } from './config-store.js';
import { readWorkingHours } from './settings.js';

// ── Module state ──────────────────────────────────────────────────

/** @type {PlanningEvent[]} */
let _renderedEvents = [];
/** @type {Set<string>} */
const _selectedIds = new Set();
let _pxPerMin = 0;

// ── Pure: classifyProposal ────────────────────────────────────────

/**
 * Classify a CalendarProposal into a PlanningEventCategory.
 * @param {CalendarProposal} proposal
 * @returns {PlanningEventCategory}
 */
export function classifyProposal(proposal) {
  const EXCLUDED_CATEGORIES = ['break', 'holiday', 'vacation', 'allday-other'];
  if (EXCLUDED_CATEGORIES.includes(proposal.category)) return 'excluded';
  if (proposal.category === 'meeting' && proposal.status === 'proposed') return 'bookable';
  if (proposal.category === 'meeting' && proposal.status === 'needs-ticket') return 'needs-ticket';
  return 'excluded';
}

// ── Pure: isFullyCovered ──────────────────────────────────────────

/**
 * @param {string} hhmm
 * @returns {number}
 */
function _toMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Determine whether an event's full time range is covered by existing bookings.
 * @param {string} startHHMM
 * @param {string} endHHMM
 * @param {TimeEntry[]} bookings
 * @param {boolean} [isAllDay]
 * @param {number} [hours]
 * @returns {boolean}
 */
export function isFullyCovered(startHHMM, endHHMM, bookings, isAllDay = false, hours = 0) {
  if (isAllDay) {
    const total = bookings.reduce((sum, b) => sum + (b.hours ?? 0), 0);
    return total >= hours;
  }
  const eventStart = _toMins(startHHMM);
  const eventEnd = _toMins(endHHMM);
  const intervals = bookings
    .filter((b) => b.startTime)
    .map((b) => {
      const s = _toMins(b.startTime);
      return [s, s + Math.round(b.hours * 60)];
    })
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [lo, hi] of intervals) {
    if (merged.length === 0 || lo > merged[merged.length - 1][1]) {
      merged.push([lo, hi]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], hi);
    }
  }
  return merged.some(([lo, hi]) => lo <= eventStart && hi >= eventEnd);
}

// ── Selection state ───────────────────────────────────────────────

/** @returns {Set<string>} */
export function getSelectedEventIds() {
  return new Set(_selectedIds);
}

/** @returns {PlanningEvent[]} */
export function getSelectedEvents() {
  return _renderedEvents.filter((e) => _selectedIds.has(e.id));
}

export function clearSelection() {
  _selectedIds.clear();
  _renderedEvents.forEach((e) => (e.selected = false));
  document
    .querySelectorAll('.planning-event--selected, .planning-event-chip--selected')
    .forEach((el) => {
      el.classList.remove('planning-event--selected', 'planning-event-chip--selected');
    });
}

// ── Card click selection ──────────────────────────────────────────

function _handleCardClick(e, planningEvent) {
  if (planningEvent.planningCategory === 'excluded') return;
  if (e.shiftKey) {
    if (_selectedIds.has(planningEvent.id)) {
      _selectedIds.delete(planningEvent.id);
      planningEvent.selected = false;
    } else {
      _selectedIds.add(planningEvent.id);
      planningEvent.selected = true;
    }
  } else {
    clearSelection();
    _selectedIds.add(planningEvent.id);
    planningEvent.selected = true;
  }
  _syncSelectionClasses();
}

function _syncSelectionClasses() {
  document.querySelectorAll('[data-planning-id]').forEach((el) => {
    const id = el.dataset.planningId;
    const isSelected = _selectedIds.has(id);
    el.classList.toggle(
      'planning-event--selected',
      isSelected && el.classList.contains('planning-event')
    );
    el.classList.toggle(
      'planning-event-chip--selected',
      isSelected && el.classList.contains('planning-event-chip')
    );
  });
}

// ── Card drag source ──────────────────────────────────────────────

function _handleDragStart(e, planningEvent) {
  if (!_selectedIds.has(planningEvent.id)) {
    clearSelection();
    _selectedIds.add(planningEvent.id);
    planningEvent.selected = true;
    _syncSelectionClasses();
  }
  e.dataTransfer.setData('planning/events', JSON.stringify([...getSelectedEventIds()]));
  e.dataTransfer.effectAllowed = 'copy';
}

// ── Measure slot height from the Bookings FC ─────────────────────

function _measurePxPerMin(bookingsContainer) {
  const slotEl = bookingsContainer.querySelector('.fc-timegrid-slot');
  if (!slotEl) return 0;
  return slotEl.getBoundingClientRect().height / 15;
}

// ── Render a single timed card ────────────────────────────────────

function _renderTimedCard(planningEvent, minMin, container) {
  const { proposal, planningCategory, isCovered, id } = planningEvent;
  const startMin = _toMins(proposal.startTime);
  const endMin = _toMins(proposal.endTime);
  const top = (startMin - minMin) * _pxPerMin;
  const height = Math.max((endMin - startMin) * _pxPerMin, 18);

  const card = document.createElement('div');
  card.className = `planning-event planning-event--${planningCategory}`;
  if (isCovered) card.classList.add('planning-event--covered');
  card.dataset.planningId = id;
  card.style.top = `${top}px`;
  card.style.height = `${height}px`;

  const isExcluded = planningCategory === 'excluded';
  if (!isExcluded) {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => _handleDragStart(e, planningEvent));
  }
  card.addEventListener('click', (e) => _handleCardClick(e, planningEvent));

  const subjectEl = document.createElement('span');
  subjectEl.className = 'planning-event__subject';
  subjectEl.textContent = DOMPurify.sanitize(proposal.subject, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  const timeEl = document.createElement('span');
  timeEl.className = 'planning-event__time';
  timeEl.textContent = `${proposal.startTime}–${proposal.endTime}`;

  if (isCovered) card.title = t('planning.event_covered');
  card.appendChild(subjectEl);
  if (height >= 30) card.appendChild(timeEl);
  container.appendChild(card);
}

// ── Render all-day chip ───────────────────────────────────────────

function _renderAlldayChip(planningEvent, container) {
  const { proposal, planningCategory, isCovered, id } = planningEvent;
  const chip = document.createElement('div');
  chip.className = `planning-event-chip planning-event-chip--${planningCategory}`;
  if (isCovered) chip.classList.add('planning-event-chip--covered');
  chip.dataset.planningId = id;

  const isExcluded = planningCategory === 'excluded';
  if (!isExcluded) {
    chip.draggable = true;
    chip.addEventListener('dragstart', (e) => _handleDragStart(e, planningEvent));
  }
  chip.addEventListener('click', (e) => _handleCardClick(e, planningEvent));

  chip.textContent = DOMPurify.sanitize(proposal.subject, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  if (isCovered) chip.title = t('planning.event_covered');
  container.appendChild(chip);
}

// ── Prompt helpers ────────────────────────────────────────────────

function _renderPrompt(container, message, retryFn) {
  const div = document.createElement('div');
  div.className = 'planning-outlook-prompt';
  div.textContent = message;
  if (retryFn) {
    const btn = document.createElement('button');
    btn.textContent = t('planning.outlook_retry');
    btn.addEventListener('click', retryFn);
    div.appendChild(document.createElement('br'));
    div.appendChild(btn);
  }
  container.appendChild(div);
}

// ── Render helpers (split from renderOutlookColumn for ≤60 LOC) ───

async function _checkOutlookAvailability(container, date, bookings, bookingsContainer) {
  const sourceEnabled = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_OUTLOOK) !== '0';
  if (!sourceEnabled) {
    _renderPrompt(container, t('planning.outlook_disabled'));
    return false;
  }
  if (!isOutlookConfigured()) {
    _renderPrompt(container, t('planning.outlook_not_connected'));
    return false;
  }
  const inDemoMode = getCentralConfigSync()?.azureClientId === 'demo';
  if (!inDemoMode && !isMsalSignedIn()) {
    _renderPrompt(container, t('planning.outlook_reconnect'), async () => {
      try {
        await acquireToken();
        await renderOutlookColumn(container, date, bookings, bookingsContainer);
      } catch {
        /* handled by acquireToken popup */
      }
    });
    return false;
  }
  return true;
}

async function _fetchAndParseProposals(container, date, bookings, bookingsContainer) {
  const spinner = document.createElement('div');
  spinner.className = 'planning-column-spinner';
  container.appendChild(spinner);

  let events;
  try {
    events = await fetchCalendarEvents(date);
  } catch (err) {
    container.innerHTML = '';
    _renderPrompt(container, t('planning.outlook_error', { message: err.message }), async () =>
      renderOutlookColumn(container, date, bookings, bookingsContainer)
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

function _buildPlanningEvents(proposals, events, bookings) {
  return proposals.map((proposal, i) => ({
    id: `${DOMPurify.sanitize(proposal.subject, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })}_${proposal.startTime}_${i}`,
    proposal,
    rawEvent: events[i] ?? {},
    planningCategory: classifyProposal(proposal),
    isCovered: isFullyCovered(
      proposal.startTime,
      proposal.endTime,
      bookings,
      proposal.isAllDay,
      proposal.hours
    ),
    selected: false,
  }));
}

function _renderPlanningEvents(container, planningEvents, bookingsContainer) {
  _pxPerMin = bookingsContainer ? _measurePxPerMin(bookingsContainer) : 0;

  const alldayRow = document.createElement('div');
  alldayRow.className = 'planning-outlook-allday';
  planningEvents
    .filter((pe) => pe.proposal.isAllDay)
    .forEach((pe) => _renderAlldayChip(pe, alldayRow));
  container.appendChild(alldayRow);

  const timedArea = document.createElement('div');
  timedArea.className = 'planning-outlook-timed';
  const timedEvents = planningEvents.filter((pe) => !pe.proposal.isAllDay);

  if (timedEvents.length > 0 && _pxPerMin > 0) {
    const fcSlotEl = bookingsContainer?.querySelector('.fc-timegrid-slot[data-time]');
    const minMin = _toMins((fcSlotEl?.dataset.time ?? '00:00:00').slice(0, 5));
    const fcBody = bookingsContainer?.querySelector('.fc-timegrid-body');
    if (fcBody) timedArea.style.height = `${fcBody.getBoundingClientRect().height}px`;
    timedEvents.forEach((pe) => _renderTimedCard(pe, minMin, timedArea));
  } else if (timedEvents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'planning-empty-msg';
    empty.textContent = t('planning.outlook_empty');
    timedArea.appendChild(empty);
  }

  container.appendChild(timedArea);
}

// ── Main render function ──────────────────────────────────────────

/**
 * Fetch Outlook events, classify them, and render into container.
 * @param {HTMLElement} container
 * @param {string} date  YYYY-MM-DD
 * @param {TimeEntry[]} bookings
 * @param {HTMLElement} bookingsContainer  Used to measure slot heights.
 * @returns {Promise<PlanningEvent[]>}
 */
export async function renderOutlookColumn(container, date, bookings, bookingsContainer) {
  container.innerHTML = '';
  _renderedEvents = [];
  _selectedIds.clear();

  const ok = await _checkOutlookAvailability(container, date, bookings, bookingsContainer);
  if (!ok) return [];

  const parsed = await _fetchAndParseProposals(container, date, bookings, bookingsContainer);
  if (!parsed) return [];

  const { proposals, events, skippedInformational } = parsed;
  if (proposals.length === 0 && skippedInformational.length === 0) {
    _renderPrompt(container, t('planning.outlook_empty'));
    return [];
  }

  const planningEvents = _buildPlanningEvents(proposals, events, bookings);
  _renderedEvents = planningEvents;
  _renderPlanningEvents(container, planningEvents, bookingsContainer);

  container.addEventListener('click', (e) => {
    if (!e.target.closest('[data-planning-id]')) clearSelection();
  });

  return planningEvents;
}
