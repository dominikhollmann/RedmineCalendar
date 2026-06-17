// @ts-nocheck — DOM-heavy module; pure exports are JSDoc-typed.

/** @typedef {import('./types.d.ts').PlanningEvent} PlanningEvent */
/** @typedef {import('./types.d.ts').CalendarProposal} CalendarProposal */
/** @typedef {import('./types.d.ts').PlanningEventCategory} PlanningEventCategory */
/** @typedef {import('./types.d.ts').TimeEntry} TimeEntry */

import { t } from './i18n.js';
import { formatProject, fetchIssueInfo } from './redmine-api.js';
import { formatDuration, diffMinutes } from './time-entry-form-utils.js';
import { computeLayout, setCardPosition } from './planning-view-layout.js';
import { roundToQuarter } from './outlook.js';

// ── Layer 1: Pure utilities ───────────────────────────────────────

/**
 * @param {string} hhmm
 * @returns {number}
 */
export function toMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * @param {Element|null} bookingsContainer
 * @returns {number}  pixels per minute, or 0 if grid is not yet mounted
 */
export function measurePxPerMin(bookingsContainer) {
  const slotEl = bookingsContainer?.querySelector('.fc-timegrid-slot');
  if (!slotEl) return 0;
  return slotEl.getBoundingClientRect().height / 15;
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
    return bookings.reduce((sum, b) => sum + (b.hours ?? 0), 0) >= hours;
  }
  const eventStart = toMins(startHHMM);
  const eventEnd = toMins(endHHMM);
  const intervals = bookings
    .filter((b) => b.startTime)
    .map((b) => {
      const s = toMins(b.startTime);
      return [s, s + Math.round(b.hours * 60)];
    })
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [lo, hi] of intervals) {
    if (merged.length === 0 || lo > merged[merged.length - 1][1]) merged.push([lo, hi]);
    else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], hi);
  }
  return merged.some(([lo, hi]) => lo <= eventStart && hi >= eventEnd);
}

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

// ── Layer 2: Shared prompt / time-grid rendering ──────────────────

/**
 * Clone the Bookings FC slot-lane elements into container so alternating-band
 * CSS aligns across both the Bookings column and a planning column.
 * @param {HTMLElement} container
 * @param {HTMLElement|null} bookingsContainer
 */
export function renderTimeGrid(container, bookingsContainer) {
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

/**
 * Render a prompt / unavailable notice with an optional retry button.
 * @param {HTMLElement} container
 * @param {string} message
 * @param {(() => void)|null} retryFn
 * @param {string} cssClass  e.g. 'planning-column-prompt'
 * @param {string} [retryKey]  i18n key for the retry button label
 */
export function renderColumnPrompt(container, message, retryFn, cssClass, retryKey) {
  const div = document.createElement('div');
  div.className = cssClass;
  div.textContent = message;
  if (retryFn) {
    const btn = document.createElement('button');
    btn.textContent = t(retryKey ?? 'planning.outlook_retry');
    btn.addEventListener('click', retryFn);
    div.appendChild(document.createElement('br'));
    div.appendChild(btn);
  }
  container.appendChild(div);
}

// ── Layer 3: Planning event construction ──────────────────────────

/** @param {TimeEntry[]} bookings */
function _buildTicketLookup(bookings) {
  const map = new Map();
  for (const b of bookings) {
    if (b.issueId != null && !map.has(b.issueId)) {
      map.set(b.issueId, {
        issueSubject: b.issueSubject ?? null,
        projectName: b.projectName ?? null,
        projectIdentifier: b.projectIdentifier ?? null,
      });
    }
  }
  return map;
}

/**
 * Convert an array of normalised column items into PlanningEvent objects.
 * Each item must carry a fully-constructed CalendarProposal plus display times.
 * @param {Array<{proposal: CalendarProposal, displayStartTime: string, displayEndTime: string, rawEvent: object, bookingComment?: string, idPrefix?: string}>} items
 * @param {TimeEntry[]} bookings
 * @returns {PlanningEvent[]}
 */
export function buildPlanningEvents(items, bookings) {
  const ticketLookup = _buildTicketLookup(bookings);
  return items.map((item, i) => {
    const {
      proposal,
      displayStartTime,
      displayEndTime,
      rawEvent,
      bookingComment,
      idPrefix = '',
    } = item;
    const ticketInfo = proposal.ticketId ? (ticketLookup.get(proposal.ticketId) ?? null) : null;
    const rawCategory = classifyProposal(proposal);
    const planningCategory =
      rawCategory === 'bookable' && ticketInfo == null ? 'needs-ticket' : rawCategory;
    const sanitised = DOMPurify.sanitize(proposal.subject, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    return {
      id: `${idPrefix}${sanitised}_${proposal.startTime}_${i}`,
      proposal,
      rawEvent,
      planningCategory,
      isCovered: isFullyCovered(
        roundToQuarter(displayStartTime),
        roundToQuarter(displayEndTime),
        bookings,
        proposal.isAllDay,
        proposal.hours
      ),
      ticketInfo,
      selected: false,
      displayStartTime,
      displayEndTime,
      bookingComment,
    };
  });
}

// ── Layer 4: Card content + rendering ────────────────────────────

function _warningIcon(titleKey) {
  const icon = document.createElement('span');
  icon.className = 'closed-ticket-icon';
  icon.textContent = '⚠';
  icon.title = t(titleKey);
  icon.setAttribute('aria-label', t(titleKey));
  return icon;
}

function _ticketAndProjectEls(proposal, ticketInfo) {
  const els = [];
  if (proposal.ticketId && !ticketInfo?.invalid) {
    const ticketEl = document.createElement('div');
    ticketEl.className = 'ev-project';
    const sub = ticketInfo?.issueSubject;
    ticketEl.textContent = sub ? `#${proposal.ticketId} ${sub}` : `#${proposal.ticketId}`;
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
  return els;
}

/**
 * Build the child elements for a planning card.
 * @param {PlanningEvent} planningEvent
 * @param {boolean} showDetails
 * @returns {HTMLElement[]}
 */
export function buildCardContent(planningEvent, showDetails) {
  const { proposal, ticketInfo, displayStartTime, displayEndTime } = planningEvent;
  const subjectEl = document.createElement('div');
  subjectEl.className = 'ev-issue';
  subjectEl.textContent = DOMPurify.sanitize(proposal.subject, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  if (!showDetails) return [subjectEl];

  if (proposal.is_closed === true) subjectEl.appendChild(_warningIcon('closedTicket.tooltip'));
  if (proposal.ticketId && ticketInfo?.invalid)
    subjectEl.appendChild(_warningIcon('planning.ticket_invalid'));

  const els = [subjectEl, ..._ticketAndProjectEls(proposal, ticketInfo)];
  if (!proposal.isAllDay) {
    const timeEl = document.createElement('div');
    timeEl.className = 'ev-time';
    const start = displayStartTime ?? proposal.startTime;
    const end = displayEndTime ?? proposal.endTime;
    // Breaks are booked at 0h in Redmine — use stored hours, not display range.
    const durationHours =
      proposal.category === 'break'
        ? proposal.hours
        : start && end
          ? diffMinutes(start, end) / 60
          : proposal.hours;
    timeEl.textContent = `${start}–${end} (${formatDuration(durationHours)})`;
    els.push(timeEl);
  }
  return els;
}

function _createCard(pe, top, height, handlers) {
  const card = document.createElement('div');
  card.className = `planning-event planning-event--${pe.planningCategory}`;
  if (pe.isCovered) card.classList.add('planning-event--covered');
  card.dataset.planningId = pe.id;
  card.style.top = `${top}px`;
  card.style.height = `${height}px`;
  const isExcluded = pe.planningCategory === 'excluded';
  if (!isExcluded) {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => handlers.onDragStart(e, pe));
  }
  card.addEventListener('click', (e) => handlers.onCardClick(e, pe));
  if (pe.isCovered) card.title = t('planning.event_covered');
  const showDetails = height >= 30;
  card.dataset.showDetails = showDetails ? '1' : '0';
  const content = document.createElement('div');
  content.className = 'ev-content';
  buildCardContent(pe, showDetails).forEach((el) => content.appendChild(el));
  card.appendChild(content);
  return card;
}

function _renderTimedCard(pe, minMin, container, col, numCols, pxPerMin, handlers) {
  const startMin = toMins(pe.displayStartTime ?? pe.proposal.startTime);
  const endMin = toMins(pe.displayEndTime ?? pe.proposal.endTime);
  const top = (startMin - minMin) * pxPerMin;
  const height = Math.max((endMin - startMin) * pxPerMin, 18);
  const card = _createCard(pe, top, height, handlers);
  setCardPosition(card, col, numCols);
  container.appendChild(card);
}

function _renderAlldayCard(pe, minMin, maxMin, container, col, numCols, pxPerMin, handlers) {
  const height = Math.max((maxMin - minMin) * pxPerMin, 18);
  const card = document.createElement('div');
  card.className = `planning-event planning-event--allday planning-event--${pe.planningCategory}`;
  if (pe.isCovered) card.classList.add('planning-event--covered');
  card.dataset.planningId = pe.id;
  card.style.top = '0px';
  card.style.height = `${height}px`;
  setCardPosition(card, col, numCols);
  const isExcluded = pe.planningCategory === 'excluded';
  if (!isExcluded) {
    card.draggable = true;
    card.addEventListener('dragstart', (e) => handlers.onDragStart(e, pe));
  }
  card.addEventListener('click', (e) => handlers.onCardClick(e, pe));
  if (pe.isCovered) card.title = t('planning.event_covered');
  card.dataset.showDetails = '1';
  const content = document.createElement('div');
  content.className = 'ev-content';
  buildCardContent(pe, true).forEach((el) => content.appendChild(el));
  card.appendChild(content);
  container.appendChild(card);
}

/**
 * Render PlanningEvent cards into a column container using the shared time grid
 * and computeLayout overlap algorithm.
 * @param {HTMLElement} container
 * @param {PlanningEvent[]} planningEvents
 * @param {HTMLElement|null} bookingsContainer
 * @param {{ onCardClick: Function, onDragStart: Function }} handlers
 * @param {{ timedAreaClass?: string, emptyKey?: string }} [options]
 */
export function renderColumnCards(
  container,
  planningEvents,
  bookingsContainer,
  handlers,
  options = {}
) {
  const { timedAreaClass = 'planning-column-timed', emptyKey = 'planning.outlook_empty' } = options;
  const pxPerMin = measurePxPerMin(bookingsContainer);
  const timedArea = document.createElement('div');
  timedArea.className = timedAreaClass;
  renderTimeGrid(timedArea, bookingsContainer);

  if (pxPerMin > 0) {
    const fcSlots = bookingsContainer?.querySelectorAll('.fc-timegrid-slot[data-time]');
    const minMin = toMins((fcSlots?.[0]?.dataset.time ?? '00:00:00').slice(0, 5));
    const lastSlot = fcSlots?.[fcSlots.length - 1];
    const maxMin = lastSlot ? toMins(lastSlot.dataset.time.slice(0, 5)) + 15 : 24 * 60;
    const fcBody = bookingsContainer?.querySelector('.fc-timegrid-body');
    if (fcBody) timedArea.style.height = `${fcBody.getBoundingClientRect().height}px`;
    const layout = computeLayout(planningEvents, minMin, maxMin);
    layout.forEach(({ pe, col, numCols }) => {
      if (pe.proposal.isAllDay)
        _renderAlldayCard(pe, minMin, maxMin, timedArea, col, numCols, pxPerMin, handlers);
      else _renderTimedCard(pe, minMin, timedArea, col, numCols, pxPerMin, handlers);
    });
  } else if (planningEvents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'planning-empty-msg';
    empty.textContent = t(emptyKey);
    timedArea.appendChild(empty);
  }
  container.appendChild(timedArea);
}

// ── Layer 5: Per-column state factory ────────────────────────────
// Selection is shared across all column instances so the Outlook and Teams
// columns behave as one unified pool: a plain click anywhere deselects
// everything; drag from either column carries all selected IDs.

const _sharedSelectedIds = new Set();

/** @type {Set<{ _syncMyClasses: Function, _clearMyEvents: Function }>} */
const _columnInstances = new Set();

/** Fires on ANY click/drag in a planning column — used to clear the Bookings pool. */
let _onPlanningInteraction = null;

/** @param {Function|null} fn */
export function onAnyPlanningInteraction(fn) {
  _onPlanningInteraction = fn;
}

function _clearAllSelections() {
  _sharedSelectedIds.clear();
  for (const inst of _columnInstances) inst._clearMyEvents();
}

function _syncAllClasses() {
  for (const inst of _columnInstances) inst._syncMyClasses();
}

function _createSelectionState() {
  let _renderedEvents = [];

  function _syncMyClasses() {
    _renderedEvents.forEach((pe) => {
      const sel = _sharedSelectedIds.has(pe.id);
      document.querySelectorAll(`[data-planning-id="${CSS.escape(pe.id)}"]`).forEach((el) => {
        el.classList.toggle(
          'planning-event--selected',
          sel && el.classList.contains('planning-event')
        );
        el.classList.toggle(
          'planning-event-chip--selected',
          sel && el.classList.contains('planning-event-chip')
        );
      });
    });
  }

  function _clearMyEvents() {
    _renderedEvents.forEach((e) => {
      e.selected = false;
      document.querySelectorAll(`[data-planning-id="${CSS.escape(e.id)}"]`).forEach((el) => {
        el.classList.remove('planning-event--selected', 'planning-event-chip--selected');
      });
    });
  }

  _columnInstances.add({ _syncMyClasses, _clearMyEvents });

  function clearSelection() {
    _clearAllSelections();
  }
  function getSelectedEventIds() {
    return new Set(_sharedSelectedIds);
  }

  function handleCardClick(e, pe) {
    if (pe.planningCategory === 'excluded') return;
    _onPlanningInteraction?.();
    if (e.shiftKey) {
      if (_sharedSelectedIds.has(pe.id)) {
        _sharedSelectedIds.delete(pe.id);
        pe.selected = false;
      } else {
        _sharedSelectedIds.add(pe.id);
        pe.selected = true;
      }
    } else {
      _clearAllSelections();
      _sharedSelectedIds.add(pe.id);
      pe.selected = true;
    }
    _syncAllClasses();
  }

  function handleDragStart(e, pe) {
    _onPlanningInteraction?.();
    if (!_sharedSelectedIds.has(pe.id)) {
      _clearAllSelections();
      _sharedSelectedIds.add(pe.id);
      pe.selected = true;
      _syncAllClasses();
    }
    e.dataTransfer.setData('planning/events', JSON.stringify([..._sharedSelectedIds]));
    e.dataTransfer.effectAllowed = 'copy';
  }

  return {
    getSelectedEventIds,
    getSelectedEvents: () => _renderedEvents.filter((e) => _sharedSelectedIds.has(e.id)),
    clearSelection,
    syncSelectionClasses: _syncAllClasses,
    setRenderedEvents: (events) => {
      _renderedEvents = events;
    },
    handleCardClick,
    handleDragStart,
  };
}

function _createEnrichment() {
  function _updateCardContent(pe) {
    document.querySelectorAll(`[data-planning-id="${pe.id}"]`).forEach((card) => {
      const showDetails = card.dataset.showDetails !== '0';
      card.classList.remove('planning-event--bookable', 'planning-event--needs-ticket');
      card.classList.add(`planning-event--${pe.planningCategory}`);
      const wrapper = card.querySelector('.ev-content') ?? card;
      while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
      buildCardContent(pe, showDetails).forEach((el) => wrapper.appendChild(el));
    });
  }

  return {
    async enrichTicketInfoAsync(planningEvents) {
      const byTicket = new Map();
      for (const pe of planningEvents) {
        if (!pe.proposal.ticketId) continue;
        if (
          pe.ticketInfo != null &&
          !pe.ticketInfo.invalid &&
          pe.ticketInfo.projectIdentifier != null
        )
          continue;
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
              if (!ticketInfo.invalid && typeof info?.is_closed === 'boolean')
                pe.proposal.is_closed = info.is_closed;
              pe.planningCategory = ticketInfo.invalid
                ? 'needs-ticket'
                : classifyProposal(pe.proposal);
              _updateCardContent(pe);
            }
          } catch {
            /* network error — leave state as-is */
          }
        })
      );
    },
  };
}

/**
 * Create an isolated per-column state: selection, drag, and async enrichment.
 * Call once per column module at module level.
 * @returns {{ getSelectedEventIds: Function, getSelectedEvents: Function, clearSelection: Function, syncSelectionClasses: Function, setRenderedEvents: Function, handleCardClick: Function, handleDragStart: Function, enrichTicketInfoAsync: Function }}
 */
export function createColumnState() {
  const state = _createSelectionState();
  const enrichment = _createEnrichment();
  return {
    getSelectedEventIds: state.getSelectedEventIds,
    getSelectedEvents: state.getSelectedEvents,
    clearSelection: state.clearSelection,
    syncSelectionClasses: state.syncSelectionClasses,
    setRenderedEvents: state.setRenderedEvents,
    handleCardClick: state.handleCardClick,
    handleDragStart: state.handleDragStart,
    enrichTicketInfoAsync: enrichment.enrichTicketInfoAsync,
  };
}
