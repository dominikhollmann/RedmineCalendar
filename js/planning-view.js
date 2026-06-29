// @ts-nocheck — DOM-heavy module; pure exports are JSDoc-typed.

/** @typedef {import('./types').SavedCalendarState} SavedCalendarState */
/** @typedef {import('./types').TimeEntry} TimeEntry */
/** @typedef {import('./types').PlanningEvent} PlanningEvent */
import { registerPlanningView } from './planning-view-context.js';
import { t } from './i18n.js';
import {
  STORAGE_KEY_DAY_RANGE,
  STORAGE_KEY_ACTIVE_VIEW,
  STORAGE_KEY_PLANNING_SOURCE_OUTLOOK,
  STORAGE_KEY_PLANNING_SOURCE_TEAMS,
} from './config.js';
import { showToast } from './notify.js';
import { readOrder } from './source-order.js';
import {
  initBookingsCalendar,
  loadBookingsForDay,
  destroyBookingsCalendar,
  updateBookingsTotal,
} from './planning-view-bookings.js';
import { attachOverlayHooks } from './calendar-overlays.js';
import {
  renderOutlookColumn,
  rerenderOutlookColumn,
  clearSelection,
  getSelectedEvents,
  isFullyCovered,
} from './planning-view-outlook.js';
import {
  renderTeamsColumn,
  rerenderTeamsColumn,
  clearSelection as clearTeamsSelection,
  getSelectedEvents as getTeamsSelectedEvents,
} from './planning-view-teams.js';
import {
  isMobileView,
  setPlanningMode,
  setBookingsCalendarRef,
  setNavCallbacks,
  setPlanningRangeChangeCallback,
  setPlanningScrollToCallback,
  attachColumnOverflowIndicators,
} from './calendar-toolbar.js';
import { roundToQuarter } from './outlook.js';
import { deselectAll, onSelectionChange } from './entry-selection.js';
import {
  onAnyPlanningInteraction,
  isPointerDragActive,
  clearPointerDrag,
} from './planning-view-column-base.js';
import {
  activate as activateCommands,
  deactivate as deactivateCommands,
} from './entry-commands.js';
import { copyToClipboard } from './clipboard.js';
import { prevDay, nextDay, toToday, mondayOf } from './planning-view-dates.js';
import { bookBatch } from './planning-view-drop.js';
import { bookLongPlanningEvent, isMultiDay } from './planning-bulk-drop.js';

// ── Module state ──────────────────────────────────────────────────

let _planningDay = toToday();
let _isActive = false;
let _loadGeneration = 0;
/** @type {SavedCalendarState|null} */
let _previousCalendarState = null;
let _calendar = null;
let _bookingsCalendar = null;
/** @type {PlanningEvent[]} */
let _currentOutlookEvents = [];
/** @type {PlanningEvent[]} */
let _currentTeamsEvents = [];
/** @type {TimeEntry[]} */
let _currentBookings = [];
let _overlayDragHandlers = null;

// DOM refs
let _mainEl = null;
let _bookingsColEl = null;
let _outlookColEl = null;
let _outlookHeaderEl = null;
let _teamsColEl = null;
let _teamsHeaderEl = null;

// ── setCalendarRef ────────────────────────────────────────────────

/**
 * Provide the main FullCalendar instance so Planning View can restore state on toggle-back.
 * @param {object} cal  FullCalendar.Calendar instance
 */
export function setCalendarRef(cal) {
  _calendar = cal;
  // Deferred planning-view restore: only safe here, after calendar.js has
  // finished its bootstrap (loadCentralConfig + loadCredentials) and called
  // calendar.render() — doing it earlier hides calendar-main before FC
  // renders, which corrupts the layout, and fires _loadDay before credentials
  // are available, leaving both columns empty.
  if (!_isActive && localStorage.getItem(STORAGE_KEY_ACTIVE_VIEW) !== 'calendar') {
    showPlanningView();
  }
}

// ── State accessors ───────────────────────────────────────────────

/** @returns {boolean} */
export function isPlanningViewActive() {
  return _isActive;
}

/** @returns {string} */
export function getPlanningDay() {
  return _planningDay;
}

// ── Overflow indicators ───────────────────────────────────────────

function _planningEventsToOverflowEntries(events, date) {
  return events
    .filter(
      (pe) => !pe.proposal.isAllDay && pe.planningCategory !== 'excluded' && pe.proposal.startTime
    )
    .map((pe) => ({ startTime: pe.proposal.startTime, hours: pe.proposal.hours, date }));
}

// Mirrors _calendar.scrollToTime for the planning view's outer scroll container.
// '23:59:00' (▼ click) → scroll to bottom; early time (▲ click) → scroll to top.
setPlanningScrollToCallback((time) => {
  const scrollEl = _mainEl?.querySelector('.planning-view-scroll');
  if (!scrollEl) return;
  scrollEl.scrollTop = time >= '12:00:00' ? scrollEl.scrollHeight : 0;
});

function _updatePlanningOverflowIndicators() {
  if (_outlookColEl && !_outlookColEl.hidden)
    attachColumnOverflowIndicators(
      _outlookColEl,
      _planningDay,
      _planningEventsToOverflowEntries(_currentOutlookEvents, _planningDay)
    );
  if (_teamsColEl && !_teamsColEl.hidden)
    attachColumnOverflowIndicators(
      _teamsColEl,
      _planningDay,
      _planningEventsToOverflowEntries(_currentTeamsEvents, _planningDay)
    );
  if (_bookingsColEl)
    attachColumnOverflowIndicators(_bookingsColEl, _planningDay, _currentBookings);
}

// ── Column load helpers ───────────────────────────────────────────

async function _loadDay(date) {
  if (!_bookingsColEl || !_outlookColEl) return;
  const outlookEnabled = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_OUTLOOK) !== '0';
  _outlookColEl.hidden = !outlookEnabled;
  if (_outlookHeaderEl) _outlookHeaderEl.hidden = !outlookEnabled;
  const teamsEnabled = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_TEAMS) !== '0';
  if (_teamsColEl) _teamsColEl.hidden = !teamsEnabled;
  if (_teamsHeaderEl) _teamsHeaderEl.hidden = !teamsEnabled;
  const gen = ++_loadGeneration;

  // Destroy + recreate the Bookings FC on each day change (simplest — no race)
  if (_bookingsCalendar) destroyBookingsCalendar(_bookingsCalendar);

  _bookingsCalendar = initBookingsCalendar(_bookingsColEl, date, () => {
    if (_loadGeneration === gen) refreshBookings();
  });
  setBookingsCalendarRef(_bookingsCalendar);
  const bookings = await loadBookingsForDay(_bookingsCalendar, date);
  if (gen !== _loadGeneration) return;
  _currentBookings = bookings;
  updateBookingsTotal(bookings);

  clearSelection();
  clearTeamsSelection();
  const [outlookEvents, teamsEvents] = await Promise.all([
    renderOutlookColumn(_outlookColEl, date, bookings, _bookingsColEl),
    teamsEnabled && _teamsColEl
      ? renderTeamsColumn(_teamsColEl, date, bookings, _bookingsColEl)
      : Promise.resolve([]),
  ]);
  if (gen !== _loadGeneration) return;
  _currentOutlookEvents = outlookEvents;
  _currentTeamsEvents = teamsEvents;
  _setupDropOverlay();
  _updatePlanningOverflowIndicators();
}

function _updateDayLabel() {
  const titleEl = document.getElementById('toolbar-title');
  if (!titleEl) return;
  const [y, mo, d] = _planningDay.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  titleEl.textContent = dt.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ── Drop overlay ──────────────────────────────────────────────────

async function _onColumnDrop(e, overlay) {
  overlay.classList.remove('drag-active');
  const raw = e.dataTransfer?.getData('planning/events');
  let events;
  if (raw) {
    let ids;
    try {
      ids = JSON.parse(raw);
    } catch {
      return;
    }
    events = [..._currentOutlookEvents, ..._currentTeamsEvents].filter((pe) => ids.includes(pe.id));
  } else {
    // CDP drag simulation (Playwright) doesn't preserve custom MIME types;
    // fall back to the selection state populated by the dragstart handler.
    events = [...getSelectedEvents(), ...getTeamsSelectedEvents()];
  }
  // Only claim the drop if we have planning events to book.
  // Without this guard, FC's own eventDrop (drag booking to new slot) is intercepted.
  if (events.length === 0) return;
  e.preventDefault();
  e.stopPropagation();

  // Route multi-day events to the expansion orchestrator; single-day events use bookBatch.
  const multiDayEvents = events.filter((pe) => isMultiDay(pe.rawEvent));
  const singleDayEvents = events.filter((pe) => !isMultiDay(pe.rawEvent));

  for (const pe of multiDayEvents) {
    await bookLongPlanningEvent(pe, _planningDay, refreshBookings);
  }
  if (singleDayEvents.length > 0) {
    await bookBatch(singleDayEvents, _planningDay, refreshBookings);
  }
}

async function _refreshPlanningColumn(colEl, currentEvents, bookings, renderFn, rerenderFn) {
  if (!colEl || colEl.hidden) return currentEvents;
  if (currentEvents.length > 0) {
    for (const pe of currentEvents) {
      pe.isCovered = isFullyCovered(
        roundToQuarter(pe.displayStartTime ?? pe.proposal.startTime),
        roundToQuarter(pe.displayEndTime ?? pe.proposal.endTime),
        bookings,
        pe.proposal.isAllDay,
        pe.proposal.hours
      );
    }
    rerenderFn(colEl, currentEvents, _bookingsColEl);
    return currentEvents;
  }
  return renderFn(colEl, _planningDay, bookings, _bookingsColEl);
}

function _rerenderPlanningColumns() {
  // Re-render even when a column has zero events: an available-but-empty column
  // still has a live FC timegrid whose slotMinTime/slotMaxTime must follow the
  // working-hours toggle (issue #278). rerenderOutlookColumn/rerenderTeamsColumn
  // no-op when no FC instance exists (disabled / not-signed-in prompt), so the
  // call is safe regardless of event count.
  if (_outlookColEl && !_outlookColEl.hidden)
    rerenderOutlookColumn(_outlookColEl, _currentOutlookEvents, _bookingsColEl);
  if (_teamsColEl && !_teamsColEl.hidden)
    rerenderTeamsColumn(_teamsColEl, _currentTeamsEvents, _bookingsColEl);
  _setupDropOverlay();
  _updatePlanningOverflowIndicators();
}

// Pointer-based fallback for when FC's interaction plugin blocks HTML5 drag.
// Browsers suppress pointer events during an active HTML5 drag, so these
// handlers only fire on the non-HTML5 path — no deduplication needed.
function _attachPointerDropHandlers(overlay) {
  const onPointerEnter = () => {
    if (isPointerDragActive()) overlay.classList.add('drag-active');
  };
  const onPointerLeave = (e) => {
    if (!_bookingsColEl.contains(e.relatedTarget)) overlay.classList.remove('drag-active');
  };
  const onPointerUp = async (e) => {
    if (!isPointerDragActive()) return;
    clearPointerDrag();
    overlay.classList.remove('drag-active', 'drag-hovered');
    const events = [...getSelectedEvents(), ...getTeamsSelectedEvents()];
    if (events.length === 0) return;
    e.preventDefault();
    const multiDayPe = events.filter((pe) => isMultiDay(pe.rawEvent));
    const singleDayPe = events.filter((pe) => !isMultiDay(pe.rawEvent));
    for (const pe of multiDayPe) {
      await bookLongPlanningEvent(pe, _planningDay, refreshBookings);
    }
    if (singleDayPe.length > 0) {
      await bookBatch(singleDayPe, _planningDay, refreshBookings);
    }
  };
  _bookingsColEl.addEventListener('pointerenter', onPointerEnter);
  _bookingsColEl.addEventListener('pointerleave', onPointerLeave);
  _bookingsColEl.addEventListener('pointerup', onPointerUp, true);
  return { pointerenter: onPointerEnter, pointerleave: onPointerLeave, pointerup: onPointerUp };
}

function _setupDropOverlay() {
  if (!_bookingsColEl) return;
  _bookingsColEl.querySelectorAll('.planning-drop-overlay').forEach((el) => el.remove());
  if (_overlayDragHandlers) {
    document.removeEventListener('dragstart', _overlayDragHandlers.start, true);
    document.removeEventListener('dragend', _overlayDragHandlers.end, true);
    _bookingsColEl.removeEventListener('drop', _overlayDragHandlers.drop, true);
    _bookingsColEl.removeEventListener('dragover', _overlayDragHandlers.dragover, true);
    _bookingsColEl.removeEventListener('dragleave', _overlayDragHandlers.dragleave, true);
    _bookingsColEl.removeEventListener('pointerenter', _overlayDragHandlers.pointerenter);
    _bookingsColEl.removeEventListener('pointerleave', _overlayDragHandlers.pointerleave);
    _bookingsColEl.removeEventListener('pointerup', _overlayDragHandlers.pointerup, true);
    _overlayDragHandlers = null;
  }

  const overlay = document.createElement('div');
  overlay.className = 'planning-drop-overlay';
  _bookingsColEl.style.position = 'relative';
  _bookingsColEl.appendChild(overlay);

  const onDragStart = (e) => {
    if (e.target.closest?.('[data-planning-id]')) overlay.classList.add('drag-hovered');
  };
  const onDragEnd = () => overlay.classList.remove('drag-hovered', 'drag-active');
  document.addEventListener('dragstart', onDragStart, true);
  document.addEventListener('dragend', onDragEnd, true);

  // Capture-phase listeners on the column: fire before FC's own handlers.
  // Overlay stays pointer-events:none so FullCalendar remains clickable.
  const onDrop = (e) => _onColumnDrop(e, overlay);
  const onDragover = (e) => {
    if (
      !e.dataTransfer?.types.includes('planning/events') &&
      getSelectedEvents().length === 0 &&
      getTeamsSelectedEvents().length === 0
    )
      return;
    e.preventDefault();
    overlay.classList.add('drag-active');
  };
  const onDragleave = (e) => {
    if (!_bookingsColEl.contains(e.relatedTarget)) overlay.classList.remove('drag-active');
  };
  _bookingsColEl.addEventListener('drop', onDrop, true);
  _bookingsColEl.addEventListener('dragover', onDragover, true);
  _bookingsColEl.addEventListener('dragleave', onDragleave, true);
  const { pointerenter, pointerleave, pointerup } = _attachPointerDropHandlers(overlay);
  _overlayDragHandlers = {
    start: onDragStart,
    end: onDragEnd,
    drop: onDrop,
    dragover: onDragover,
    dragleave: onDragleave,
    pointerenter,
    pointerleave,
    pointerup,
  };
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Re-load bookings for the current day.
 */
export async function refreshBookings() {
  if (!_bookingsCalendar || !_bookingsColEl) return;
  const bookings = await loadBookingsForDay(_bookingsCalendar, _planningDay);
  _currentBookings = bookings;
  updateBookingsTotal(bookings);
  [_currentOutlookEvents, _currentTeamsEvents] = await Promise.all([
    _refreshPlanningColumn(
      _outlookColEl,
      _currentOutlookEvents,
      bookings,
      renderOutlookColumn,
      rerenderOutlookColumn
    ),
    _refreshPlanningColumn(
      _teamsColEl,
      _currentTeamsEvents,
      bookings,
      renderTeamsColumn,
      rerenderTeamsColumn
    ),
  ]);

  _setupDropOverlay();
  _updatePlanningOverflowIndicators();
}

/**
 * Navigate to the previous day respecting Mo-Fr toggle.
 */
export function navigateToPrevDay() {
  const moFr = localStorage.getItem(STORAGE_KEY_DAY_RANGE) !== 'full-week';
  _planningDay = prevDay(_planningDay, moFr);
  _updateDayLabel();
  _loadDay(_planningDay);
}

/**
 * Navigate to the next day respecting Mo-Fr toggle.
 */
export function navigateToNextDay() {
  const moFr = localStorage.getItem(STORAGE_KEY_DAY_RANGE) !== 'full-week';
  _planningDay = nextDay(_planningDay, moFr);
  _updateDayLabel();
  _loadDay(_planningDay);
}

/**
 * Navigate to today regardless of Mo-Fr toggle.
 */
export function navigateToToday() {
  _planningDay = toToday();
  _updateDayLabel();
  _loadDay(_planningDay);
}

/**
 * Show the Planning View. If date is provided use it, else use today.
 * @param {string} [date]  YYYY-MM-DD
 */
export function showPlanningView(date) {
  if (_isActive) return;
  localStorage.setItem(STORAGE_KEY_ACTIVE_VIEW, 'planning');
  // Save calendar state for restore
  if (_calendar) {
    const view = _calendar.view;
    _previousCalendarState = {
      view: view.type,
      date: view.currentStart.toISOString().slice(0, 10),
    };
  }
  _planningDay = date ?? toToday();

  document.getElementById('calendar-main').hidden = true;
  const mainEl = document.getElementById('planning-view-main');
  mainEl.hidden = false;

  if (!_mainEl) {
    _mainEl = mainEl;
    _buildColumns(mainEl);
    onSelectionChange(clearSelection);
    onAnyPlanningInteraction(deselectAll);
  }
  _isActive = true;
  deselectAll();
  activateCommands({
    onAfterDelete: refreshBookings,
    onDeleteError: (msg) => showToast(msg),
    onCopy: (entry) => copyToClipboard(entry),
  });

  // Rewire the shared toolbar to planning-view navigation
  setPlanningMode(true);
  setNavCallbacks(navigateToPrevDay, navigateToNextDay, navigateToToday);
  setPlanningRangeChangeCallback(_rerenderPlanningColumns);
  _updateDayLabel();

  const toggleBtn = document.getElementById('planning-view-toggle');
  if (toggleBtn) toggleBtn.textContent = t('planning.close_label');

  _loadDay(_planningDay);
}

/**
 * Hide the Planning View and restore the classic calendar.
 */
export function hidePlanningView() {
  if (!_isActive) return;
  _isActive = false;
  deactivateCommands();
  deselectAll();
  localStorage.setItem(STORAGE_KEY_ACTIVE_VIEW, 'calendar');

  // Destroy bookings FC and restore the main calendar as the overlay target.
  if (_bookingsCalendar) {
    destroyBookingsCalendar(_bookingsCalendar);
    _bookingsCalendar = null;
  }
  setBookingsCalendarRef(null);
  setPlanningMode(false);
  setPlanningRangeChangeCallback(null);
  if (_calendar) attachOverlayHooks(_calendar);

  document.getElementById('planning-view-main').hidden = true;
  document.getElementById('calendar-main').hidden = false;

  // Restore calendar to the week of the last Planning Day
  if (_calendar && _previousCalendarState) {
    _calendar.changeView(_previousCalendarState.view);
    _calendar.gotoDate(mondayOf(_planningDay));
    _previousCalendarState = null;
  }
  // FullCalendar can't detect visibility changes — force a layout recalc now
  // that calendar-main is visible again (avoids broken grid on first show-back).
  _calendar?.updateSize();

  // Restore toolbar nav to calendar and update title from FC's current view
  setNavCallbacks(
    () => _calendar?.prev(),
    () => _calendar?.next(),
    () => _calendar?.today()
  );
  const titleEl = document.getElementById('toolbar-title');
  if (titleEl && _calendar) titleEl.textContent = _calendar.view.title;

  const toggleBtn = document.getElementById('planning-view-toggle');
  if (toggleBtn) toggleBtn.textContent = t('planning.toggle_label');
}

// ── DOM construction ──────────────────────────────────────────────

function _buildColumns(mainEl) {
  const colHeaders = document.createElement('div');
  colHeaders.className = 'planning-view-column-headers';
  ['planning.bookings_column', 'planning.outlook_column', 'planning.teams_column'].forEach(
    (key, i) => {
      const h = document.createElement('div');
      h.className = 'planning-view-column-header col-header-label';
      h.textContent = t(key);
      if (i === 0)
        h.insertAdjacentHTML(
          'beforeend',
          '<span class="day-total" id="planning-bookings-total"></span>'
        );
      colHeaders.appendChild(h);
      if (i === 1) {
        _outlookHeaderEl = h;
        h.classList.add('planning-outlook-column-header');
      }
      if (i === 2) _teamsHeaderEl = h;
    }
  );

  const scroll = document.createElement('div');
  scroll.className = 'planning-view-scroll';
  const cols = document.createElement('div');
  cols.className = 'planning-view-columns';

  _bookingsColEl = document.createElement('div');
  _bookingsColEl.className = 'planning-bookings-column';
  _outlookColEl = document.createElement('div');
  _outlookColEl.className = 'planning-outlook-column';
  _teamsColEl = document.createElement('div');
  _teamsColEl.className = 'planning-teams-column';

  [_bookingsColEl, _outlookColEl, _teamsColEl].forEach((c) => cols.appendChild(c));
  scroll.appendChild(cols);
  mainEl.appendChild(colHeaders);
  mainEl.appendChild(scroll);
  _applySourceOrder();
}

// Feature 054 / #274: order the outlook/teams columns + headers per the stored
// planning-source order via flex `order`. Bookings always stays first (order 0).
function _applySourceOrder() {
  const colBySource = { outlook: _outlookColEl, teams: _teamsColEl };
  const headerBySource = { outlook: _outlookHeaderEl, teams: _teamsHeaderEl };
  const order = readOrder();
  order.forEach((id, i) => {
    if (colBySource[id]) colBySource[id].style.order = String(i + 1);
    if (headerBySource[id]) headerBySource[id].style.order = String(i + 1);
  });
}

// ── Undo navigate listener ────────────────────────────────────────

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('undo:navigate', ({ detail }) => {
    if (!_isActive) return;
    if (detail.date === _planningDay) return;
    _planningDay = detail.date;
    _updateDayLabel();
    _loadDay(_planningDay);
  });

  document.addEventListener('planning:sources-changed', () => {
    _applySourceOrder();
    if (_isActive) _loadDay(_planningDay);
  });

  const _onUndoBookingChange = () => _isActive && refreshBookings();
  document.addEventListener('undo:eventDeleted', _onUndoBookingChange);
  document.addEventListener('undo:eventAdded', _onUndoBookingChange);
}

// ── Init on module load ───────────────────────────────────────────

if (typeof document !== 'undefined' && !isMobileView()) {
  const toggleBtn = document.getElementById('planning-view-toggle');
  if (toggleBtn) {
    toggleBtn.removeAttribute('hidden');
    toggleBtn.textContent = t('planning.toggle_label');
    toggleBtn.addEventListener('click', () => {
      if (_isActive) hidePlanningView();
      else showPlanningView();
    });
  }
  // NOTE: the localStorage restore that used to live here was moved into
  // setCalendarRef() — see comment there for why.
}

registerPlanningView({
  show: showPlanningView,
  setRef: setCalendarRef,
  isActive: isPlanningViewActive,
  refresh: refreshBookings,
});
