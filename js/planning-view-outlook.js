// @ts-nocheck — DOM-heavy module; pure exports are JSDoc-typed below.

/** @typedef {import('./types').CalendarProposal} CalendarProposal */
/** @typedef {import('./types').PlanningEventCategory} PlanningEventCategory */
/** @typedef {import('./types').PlanningEvent} PlanningEvent */
/** @typedef {import('./types').TimeEntry} TimeEntry */

import { t } from './i18n.js';
import { STORAGE_KEY_PLANNING_SOURCE_OUTLOOK } from './config.js';
import { formatProject, fetchIssueInfo } from './redmine-api.js';
import { formatDuration } from './time-entry-form-utils.js';
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
  if (proposal.category === 'break') return 'break';
  if (proposal.ticketId) return 'bookable';
  return 'needs-ticket';
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
  if (planningEvent.planningCategory === 'excluded') return; // truly non-interactive
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

// ── Mirror the FC time grid in the Outlook column ────────────────
// Clones the data-time attributes from the Bookings FC's slot-lane
// elements so the same alternating-band CSS applies to both columns.

function _renderTimeGrid(container, bookingsContainer) {
  const fcSlots = bookingsContainer?.querySelectorAll('.fc-timegrid-slot-lane[data-time]');
  if (!fcSlots?.length) return;
  const grid = document.createElement('div');
  grid.className = 'planning-time-grid';
  fcSlots.forEach((fcSlot) => {
    const slot = document.createElement('div');
    slot.className =
      'planning-grid-slot' +
      (fcSlot.classList.contains('fc-timegrid-slot-minor') ? ' planning-grid-slot--minor' : '');
    slot.dataset.time = fcSlot.dataset.time;
    grid.appendChild(slot);
  });
  container.appendChild(grid);
}

// ── Column layout algorithm ───────────────────────────────────────
// Assigns col + numCols to each event so overlapping events sit side-by-side.

function _computeLayout(planningEvents, minMin, maxMin) {
  const items = planningEvents.map((pe) => ({
    pe,
    startMin: pe.proposal.isAllDay ? minMin : _toMins(pe.proposal.startTime),
    endMin: pe.proposal.isAllDay ? maxMin : _toMins(pe.proposal.endTime),
    col: 0,
    numCols: 1,
  }));

  items.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  // Greedy column assignment
  const colEnds = [];
  for (const item of items) {
    let col = colEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) col = colEnds.length;
    colEnds[col] = item.endMin;
    item.col = col;
  }

  // Union-Find: merge all directly-overlapping events into the same component
  const parent = items.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) i = parent[i];
    return i;
  };
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].startMin < items[j].endMin && items[j].startMin < items[i].endMin) {
        const pi = find(i),
          pj = find(j);
        if (pi !== pj) parent[pi] = pj;
      }
    }
  }

  // numCols per component = max col in that component + 1
  const compMax = {};
  items.forEach((item, i) => {
    const r = find(i);
    compMax[r] = Math.max(compMax[r] ?? 0, item.col);
  });
  items.forEach((item, i) => {
    item.numCols = compMax[find(i)] + 1;
  });

  return items;
}

// ── Shared card position helper ───────────────────────────────────

function _setCardPosition(card, col, numCols) {
  const INSET = 2; // px gap from edge and between columns
  card.style.left = `calc(${(col / numCols) * 100}% + ${INSET}px)`;
  card.style.right = `calc(${((numCols - col - 1) / numCols) * 100}% + ${INSET}px)`;
}

// ── Card content builder (shared by timed + all-day) ─────────────

function _buildCardContent(proposal, ticketInfo, showDetails) {
  const subjectEl = document.createElement('div');
  subjectEl.className = 'ev-issue';
  subjectEl.textContent = DOMPurify.sanitize(proposal.subject, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  if (!showDetails) return [subjectEl];

  const els = [subjectEl];
  if (proposal.ticketId) {
    const ticketEl = document.createElement('div');
    ticketEl.className = 'ev-project';
    if (ticketInfo?.invalid) {
      ticketEl.textContent = `⚠️ #${proposal.ticketId} ${t('planning.ticket_invalid')}`;
    } else {
      const sub = ticketInfo?.issueSubject;
      ticketEl.textContent = sub ? `#${proposal.ticketId} ${sub}` : `#${proposal.ticketId}`;
    }
    els.push(ticketEl);
  }
  if (ticketInfo?.projectName || ticketInfo?.projectIdentifier) {
    const projEl = document.createElement('div');
    projEl.className = 'ev-project';
    projEl.textContent = formatProject(
      ticketInfo.projectIdentifier ?? null,
      ticketInfo.projectName ?? null
    );
    els.push(projEl);
  }
  if (!proposal.isAllDay) {
    const timeEl = document.createElement('div');
    timeEl.className = 'ev-time';
    timeEl.textContent = `${proposal.startTime}–${proposal.endTime} (${formatDuration(proposal.hours)})`;
    els.push(timeEl);
  }
  return els;
}

// ── Render a single timed card ────────────────────────────────────

function _renderTimedCard(planningEvent, minMin, container, col, numCols) {
  const { proposal, planningCategory, isCovered, id, ticketInfo } = planningEvent;
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
  _setCardPosition(card, col, numCols);

  const isExcluded = planningCategory === 'excluded';
  if (!isExcluded) {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => _handleDragStart(e, planningEvent));
  }
  card.addEventListener('click', (e) => _handleCardClick(e, planningEvent));

  if (isCovered) card.title = t('planning.event_covered');
  const showDetails = height >= 30;
  card.dataset.showDetails = showDetails ? '1' : '0';
  _buildCardContent(proposal, ticketInfo, showDetails).forEach((el) => card.appendChild(el));
  container.appendChild(card);
}

// ── Render all-day event as full-span timed card ──────────────────

function _renderAlldayAsTimed(planningEvent, minMin, maxMin, container, col, numCols) {
  const { proposal, planningCategory, isCovered, id, ticketInfo } = planningEvent;
  const height = Math.max((maxMin - minMin) * _pxPerMin, 18);

  const card = document.createElement('div');
  card.className = `planning-event planning-event--allday planning-event--${planningCategory}`;
  if (isCovered) card.classList.add('planning-event--covered');
  card.dataset.planningId = id;
  card.style.top = '0px';
  card.style.height = `${height}px`;
  _setCardPosition(card, col, numCols);

  const isExcluded = planningCategory === 'excluded';
  if (!isExcluded) {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => _handleDragStart(e, planningEvent));
  }
  card.addEventListener('click', (e) => _handleCardClick(e, planningEvent));

  if (isCovered) card.title = t('planning.event_covered');
  card.dataset.showDetails = '1';
  _buildCardContent(proposal, ticketInfo, true).forEach((el) => card.appendChild(el));
  container.appendChild(card);
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
    _renderPrompt(container, t('planning.outlook_sign_in'), async () => {
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
  const ticketLookup = new Map();
  for (const b of bookings) {
    if (b.issueId != null && !ticketLookup.has(b.issueId)) {
      ticketLookup.set(b.issueId, {
        issueSubject: b.issueSubject ?? null,
        projectName: b.projectName ?? null,
        projectIdentifier: b.projectIdentifier ?? null,
      });
    }
  }
  return proposals.map((proposal, i) => {
    const ticketInfo = proposal.ticketId ? (ticketLookup.get(proposal.ticketId) ?? null) : null;
    const rawCategory = classifyProposal(proposal);
    // Start as needs-ticket until async confirms the ticket exists in Redmine.
    // Exception: ticket already confirmed via same-day bookings (ticketInfo != null).
    const planningCategory =
      rawCategory === 'bookable' && ticketInfo == null ? 'needs-ticket' : rawCategory;
    return {
      id: `${DOMPurify.sanitize(proposal.subject, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })}_${proposal.startTime}_${i}`,
      proposal,
      rawEvent: events[i] ?? {},
      planningCategory,
      isCovered: isFullyCovered(
        proposal.startTime,
        proposal.endTime,
        bookings,
        proposal.isAllDay,
        proposal.hours
      ),
      ticketInfo,
      selected: false,
    };
  });
}

function _renderPlanningEvents(container, planningEvents, bookingsContainer) {
  _pxPerMin = bookingsContainer ? _measurePxPerMin(bookingsContainer) : 0;

  const timedArea = document.createElement('div');
  timedArea.className = 'planning-outlook-timed';

  if (_pxPerMin > 0) {
    const fcSlots = bookingsContainer?.querySelectorAll('.fc-timegrid-slot[data-time]');
    const minMin = _toMins((fcSlots?.[0]?.dataset.time ?? '00:00:00').slice(0, 5));
    const lastSlot = fcSlots?.[fcSlots.length - 1];
    const maxMin = lastSlot ? _toMins(lastSlot.dataset.time.slice(0, 5)) + 15 : 24 * 60;
    const fcBody = bookingsContainer?.querySelector('.fc-timegrid-body');
    if (fcBody) timedArea.style.height = `${fcBody.getBoundingClientRect().height}px`;
    _renderTimeGrid(timedArea, bookingsContainer);
    const layout = _computeLayout(planningEvents, minMin, maxMin);
    layout.forEach(({ pe, col, numCols }) => {
      if (pe.proposal.isAllDay) {
        _renderAlldayAsTimed(pe, minMin, maxMin, timedArea, col, numCols);
      } else {
        _renderTimedCard(pe, minMin, timedArea, col, numCols);
      }
    });
  } else if (planningEvents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'planning-empty-msg';
    empty.textContent = t('planning.outlook_empty');
    timedArea.appendChild(empty);
  }

  container.appendChild(timedArea);
}

// ── Async ticket enrichment ───────────────────────────────────────

function _updateCardContent(planningEvent) {
  document.querySelectorAll(`[data-planning-id="${planningEvent.id}"]`).forEach((card) => {
    const showDetails = card.dataset.showDetails !== '0';
    card.classList.remove('planning-event--bookable', 'planning-event--needs-ticket');
    card.classList.add(`planning-event--${planningEvent.planningCategory}`);
    while (card.firstChild) card.removeChild(card.firstChild);
    _buildCardContent(planningEvent.proposal, planningEvent.ticketInfo, showDetails).forEach((el) =>
      card.appendChild(el)
    );
  });
}

async function _enrichTicketInfoAsync(planningEvents) {
  const byTicket = new Map();
  for (const pe of planningEvents) {
    if (!pe.proposal.ticketId) continue;
    // Already confirmed via same-day bookings — skip the network round-trip.
    if (pe.ticketInfo != null && !pe.ticketInfo.invalid) continue;
    const tid = pe.proposal.ticketId;
    if (!byTicket.has(tid)) byTicket.set(tid, []);
    byTicket.get(tid).push(pe);
  }
  if (!byTicket.size) return;

  await Promise.allSettled(
    [...byTicket.entries()].map(async ([ticketId, events]) => {
      try {
        const info = await fetchIssueInfo(ticketId);
        const ticketInfo = info ?? {
          invalid: true,
          issueSubject: null,
          projectName: null,
          projectIdentifier: null,
        };
        for (const pe of events) {
          pe.ticketInfo = ticketInfo;
          pe.planningCategory = ticketInfo.invalid
            ? 'needs-ticket'
            : pe.proposal.category === 'break'
              ? 'break'
              : 'bookable';
          _updateCardContent(pe);
        }
      } catch {
        /* network error — leave state as-is (stays yellow, safe to drag) */
      }
    })
  );
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

  _enrichTicketInfoAsync(planningEvents).catch(() => {});

  return planningEvents;
}

/**
 * Re-render the Outlook column using already-fetched events (e.g. after a
 * time-range toggle changes the bookings FC's slot geometry).
 * @param {HTMLElement} container
 * @param {PlanningEvent[]} planningEvents
 * @param {HTMLElement} bookingsContainer
 */
export function rerenderOutlookColumn(container, planningEvents, bookingsContainer) {
  container.innerHTML = '';
  _renderPlanningEvents(container, planningEvents, bookingsContainer);
  container.addEventListener('click', (e) => {
    if (!e.target.closest('[data-planning-id]')) clearSelection();
  });
  _syncSelectionClasses();
}
