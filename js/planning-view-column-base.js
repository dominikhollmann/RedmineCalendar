// @ts-nocheck — DOM-heavy module; pure exports are JSDoc-typed.

/** @typedef {import('./types.d.ts').PlanningEvent} PlanningEvent */
/** @typedef {import('./types.d.ts').CalendarProposal} CalendarProposal */
/** @typedef {import('./types.d.ts').PlanningEventCategory} PlanningEventCategory */
/** @typedef {import('./types.d.ts').TimeEntry} TimeEntry */

import { t } from './i18n.js';
import { formatProject, fetchIssueInfo } from './redmine-api.js';
import { formatDuration, diffMinutes } from './time-entry-form-utils.js';
import { getEffectiveTimeRange } from './calendar-toolbar.js';
import { roundToQuarter } from './outlook.js';
import { createTimegridColumn } from './calendar-config.js';

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

// ── Layer 2: All-day → timed conversion ──────────────────────────

/**
 * Convert an all-day CalendarProposal to a timed one spanning
 * slotMinTime–slotMaxTime so it can be placed in the FC timegrid.
 * No-op for proposals that already have a time range.
 * @param {CalendarProposal} proposal
 * @param {string} _date  YYYY-MM-DD (reserved for future date-aware conversion)
 * @returns {CalendarProposal}
 */
export function toTimedEvent(proposal, _date) {
  if (!proposal.isAllDay) return proposal;
  const { slotMinTime, slotMaxTime } = getEffectiveTimeRange();
  const startTime = slotMinTime.slice(0, 5);
  const endTime = slotMaxTime.slice(0, 5);
  return { ...proposal, isAllDay: false, startTime, endTime };
}

// ── Layer 3: Shared prompt rendering ─────────────────────────────

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

// ── Layer 4: Planning event construction ──────────────────────────

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

// ── Layer 5: Card content ─────────────────────────────────────────

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
 * Build the child elements for a planning event card (used as FC eventContent).
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

// ── Layer 5b: Shared FC column helpers ───────────────────────────

/**
 * Map PlanningEvent[] to FC event objects for a readonly planning column.
 * Handles all-day proposals by spanning them across slotMinTime–slotMaxTime.
 * @param {PlanningEvent[]} planningEvents
 * @param {string} date  YYYY-MM-DD
 * @param {{ getSelectedEventIds: Function }} col
 * @returns {object[]}
 */
export function buildFcEventsForColumn(planningEvents, date, col) {
  const { slotMinTime, slotMaxTime } = getEffectiveTimeRange();
  return planningEvents.map((pe) => {
    const classes = ['planning-event', `planning-event--${pe.planningCategory}`];
    if (pe.isCovered) classes.push('planning-event--covered');
    if (col.getSelectedEventIds().has(pe.id)) classes.push('planning-event--selected');
    const startTime = pe.proposal.isAllDay
      ? slotMinTime.slice(0, 5)
      : (pe.displayStartTime ?? slotMinTime.slice(0, 5));
    const endTime = pe.proposal.isAllDay
      ? slotMaxTime.slice(0, 5)
      : (pe.displayEndTime ?? slotMaxTime.slice(0, 5));
    return {
      id: pe.id,
      title: pe.proposal.subject ?? String(pe.proposal.ticketId ?? ''),
      start: `${date}T${startTime}:00`,
      end: `${date}T${endTime}:00`,
      classNames: classes,
      editable: false,
      extendedProps: { planningEvent: pe, showDetails: true },
    };
  });
}

/**
 * Create a readonly FullCalendar instance for a planning column.
 * @param {HTMLElement} container
 * @param {string} date  YYYY-MM-DD
 * @param {{ handleFcEventDidMount: Function, handleFcEventClick: Function }} col
 * @returns {{ cal: object, setDate: Function, setEvents: Function, destroy: Function }}
 */
export function createReadonlyFcColumn(container, date, col) {
  return createTimegridColumn(container, {
    view: 'timeGridDay',
    date,
    mode: 'readonly',
    callbacks: {
      eventContent: (arg) => ({
        domNodes: buildCardContent(
          arg.event.extendedProps.planningEvent,
          arg.event.extendedProps.showDetails ?? true
        ),
      }),
      eventDidMount: (info) => col.handleFcEventDidMount(info),
      eventClick: (info) => {
        info.jsEvent.stopPropagation();
        col.handleFcEventClick(info.event, info.jsEvent);
      },
    },
  });
}

// ── Layer 6: Per-column state factory ────────────────────────────
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

function _computeFcClassNames(fcEvent) {
  const pe = fcEvent.extendedProps?.planningEvent;
  if (!pe) return fcEvent.classNames ?? [];
  const classes = ['planning-event', `planning-event--${pe.planningCategory}`];
  if (pe.isCovered) classes.push('planning-event--covered');
  if (_sharedSelectedIds.has(pe.id)) classes.push('planning-event--selected');
  return classes;
}

function _handleDragStart(e, pe) {
  _onPlanningInteraction?.();
  if (!_sharedSelectedIds.has(pe.id)) {
    _clearAllSelections();
    _sharedSelectedIds.add(pe.id);
    _syncAllClasses();
  }
  e.dataTransfer.setData('planning/events', JSON.stringify([..._sharedSelectedIds]));
  e.dataTransfer.effectAllowed = 'copy';
}

function _createSelectionState() {
  let _renderedEvents = [];
  let _activeFcInstance = null;

  function _syncMyClasses() {
    if (!_activeFcInstance) return;
    _activeFcInstance.getEvents().forEach((fcEvent) => {
      fcEvent.setProp('classNames', _computeFcClassNames(fcEvent));
    });
  }

  function _clearMyEvents() {
    _syncMyClasses();
  }

  _columnInstances.add({ _syncMyClasses, _clearMyEvents });

  return {
    getActiveFcInstance: () => _activeFcInstance,
    getSelectedEventIds: () => new Set(_sharedSelectedIds),
    getSelectedEvents: () => _renderedEvents.filter((e) => _sharedSelectedIds.has(e.id)),
    clearSelection: _clearAllSelections,
    syncSelectionClasses: _syncAllClasses,
    setRenderedPlanningEvents: (events) => {
      _renderedEvents = events;
    },
    setActiveFcInstance: (cal) => {
      _activeFcInstance = cal;
    },
    handleFcEventClick: (fcEvent, jsEvent) => {
      const pe = fcEvent.extendedProps?.planningEvent;
      if (!pe || pe.planningCategory === 'excluded') return;
      _onPlanningInteraction?.();
      if (jsEvent?.shiftKey) {
        if (_sharedSelectedIds.has(pe.id)) _sharedSelectedIds.delete(pe.id);
        else _sharedSelectedIds.add(pe.id);
      } else {
        _clearAllSelections();
        _sharedSelectedIds.add(pe.id);
      }
      _syncAllClasses();
    },
    handleFcEventDidMount: (info) => {
      const pe = info.event.extendedProps?.planningEvent;
      if (!pe || pe.planningCategory === 'excluded') return;
      info.el.dataset.planningId = pe.id;
      info.el.setAttribute('draggable', 'true');
      info.el.addEventListener('dragstart', (e) => _handleDragStart(e, pe));
    },
  };
}

function _createEnrichment(getFcInstance) {
  function _updateFcEvent(pe) {
    const cal = getFcInstance();
    if (!cal) return;
    const fcEvent = cal.getEvents().find((e) => e.extendedProps?.planningEvent?.id === pe.id);
    if (!fcEvent) return;
    fcEvent.setExtendedProp('planningEvent', pe);
    fcEvent.setProp('classNames', _computeFcClassNames(fcEvent));
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
              _updateFcEvent(pe);
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
 * Create an isolated per-column state: FC-aware selection, drag, and async enrichment.
 * Call once per column module at module level.
 * @returns {{ getSelectedEventIds: Function, getSelectedEvents: Function, clearSelection: Function, syncSelectionClasses: Function, setRenderedPlanningEvents: Function, setActiveFcInstance: Function, handleFcEventClick: Function, handleFcEventDidMount: Function, enrichTicketInfoAsync: Function }}
 */
export function createColumnState() {
  const state = _createSelectionState();
  const enrichment = _createEnrichment(() => state.getActiveFcInstance());
  return {
    getSelectedEventIds: state.getSelectedEventIds,
    getSelectedEvents: state.getSelectedEvents,
    clearSelection: state.clearSelection,
    syncSelectionClasses: state.syncSelectionClasses,
    setRenderedPlanningEvents: state.setRenderedPlanningEvents,
    setActiveFcInstance: state.setActiveFcInstance,
    handleFcEventClick: state.handleFcEventClick,
    handleFcEventDidMount: state.handleFcEventDidMount,
    enrichTicketInfoAsync: enrichment.enrichTicketInfoAsync,
  };
}
