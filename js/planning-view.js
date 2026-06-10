// @ts-nocheck — DOM-heavy module; pure exports are JSDoc-typed.

/** @typedef {import('./types').SavedCalendarState} SavedCalendarState */
/** @typedef {import('./types').TimeEntry} TimeEntry */
/** @typedef {import('./types').PlanningEvent} PlanningEvent */
/** @typedef {import('./types').BookingOutcome} BookingOutcome */

import { t } from './i18n.js';
import { STORAGE_KEY_DAY_RANGE, STORAGE_KEY_ACTIVE_VIEW } from './config.js';
import { showToast } from './notify.js';
import {
  initBookingsCalendar,
  loadBookingsForDay,
  destroyBookingsCalendar,
} from './planning-view-bookings.js';
import { attachOverlayHooks } from './calendar-overlays.js';
import {
  renderOutlookColumn,
  rerenderOutlookColumn,
  clearSelection,
  getSelectedEvents,
} from './planning-view-outlook.js';
import {
  isMobileView,
  setPlanningMode,
  setBookingsCalendarRef,
  setNavCallbacks,
  setPlanningRangeChangeCallback,
} from './calendar-toolbar.js';
import { openForm } from './time-entry-form.js';
import { createTimeEntry } from './redmine-api.js';

// ── Pure day-navigation helpers ───────────────────────────────────

/**
 * Add `days` to a YYYY-MM-DD string and return the result.
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
function _addDays(dateStr, days) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Navigate to the previous day. Skips weekends when moFr is true.
 * @param {string} dateStr  YYYY-MM-DD
 * @param {boolean} moFr
 * @returns {string}
 */
export function prevDay(dateStr, moFr) {
  let result = _addDays(dateStr, -1);
  if (moFr) {
    while (true) {
      const dow = new Date(result + 'T00:00:00Z').getUTCDay();
      if (dow !== 0 && dow !== 6) break;
      result = _addDays(result, -1);
    }
  }
  return result;
}

/**
 * Navigate to the next day. Skips weekends when moFr is true.
 * @param {string} dateStr  YYYY-MM-DD
 * @param {boolean} moFr
 * @returns {string}
 */
export function nextDay(dateStr, moFr) {
  let result = _addDays(dateStr, 1);
  if (moFr) {
    while (true) {
      const dow = new Date(result + 'T00:00:00Z').getUTCDay();
      if (dow !== 0 && dow !== 6) break;
      result = _addDays(result, 1);
    }
  }
  return result;
}

/**
 * Returns today's date as YYYY-MM-DD regardless of Mo-Fr toggle.
 * @returns {string}
 */
export function toToday() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the Monday of the week containing dateStr.
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {string}
 */
function _mondayOf(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow; // shift so Mon = day 0
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

// ── Module state ──────────────────────────────────────────────────

let _planningDay = toToday();
let _isActive = false;
/** @type {SavedCalendarState|null} */
let _previousCalendarState = null;
let _calendar = null; // FullCalendar instance set via setCalendarRef
let _bookingsCalendar = null; // dedicated timeGridDay FC instance
/** @type {PlanningEvent[]} */
let _currentOutlookEvents = [];
let _overlayDragHandlers = null; // cleanup refs for document-level drag listeners

// DOM refs
let _mainEl = null;
let _bookingsColEl = null;
let _outlookColEl = null;

// ── setCalendarRef ────────────────────────────────────────────────

/**
 * Provide the main FullCalendar instance so Planning View can restore state on toggle-back.
 * @param {object} cal  FullCalendar.Calendar instance
 */
export function setCalendarRef(cal) {
  _calendar = cal;
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

// ── Column load helpers ───────────────────────────────────────────

async function _loadDay(date) {
  if (!_bookingsColEl || !_outlookColEl) return;

  // Destroy + recreate the Bookings FC on each day change (simplest — no race)
  if (_bookingsCalendar) destroyBookingsCalendar(_bookingsCalendar);

  _bookingsCalendar = initBookingsCalendar(_bookingsColEl, date, () => {
    refreshBookings();
  });
  setBookingsCalendarRef(_bookingsCalendar);
  const bookings = await loadBookingsForDay(_bookingsCalendar, date);

  clearSelection();
  _currentOutlookEvents = await renderOutlookColumn(_outlookColEl, date, bookings, _bookingsColEl);
  _setupDropOverlay();
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

// ── Drop overlay + booking dispatch ──────────────────────────────

function _resolveDropTime(bookingsEl, clientY) {
  const slots = bookingsEl.querySelectorAll('.fc-timegrid-slot[data-time]');
  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    if (clientY >= rect.top && clientY < rect.bottom) {
      return slot.dataset.time?.slice(0, 5) ?? null;
    }
  }
  return null;
}

async function _bookOne(planningEvent, _dropTimeHHMM) {
  const { proposal, planningCategory } = planningEvent;
  if (planningCategory === 'bookable') {
    await createTimeEntry({
      spentOn: _planningDay,
      hours: proposal.hours,
      issueId: proposal.ticketId,
      startTime: proposal.startTime,
      endTime: proposal.endTime,
      comment: '',
    });
  } else if (planningCategory === 'needs-ticket') {
    await new Promise((resolve) => {
      openForm(
        null,
        {
          date: _planningDay,
          startTime: proposal.startTime,
          hours: proposal.hours,
          sourceEvent: {
            subject: proposal.subject,
            startTime: proposal.startTime,
            endTime: proposal.endTime,
          },
        },
        resolve
      );
    });
  }
}

async function _bookBatch(planningEvents) {
  /** @type {BookingOutcome[]} */
  const outcomes = [];
  for (const pe of planningEvents) {
    try {
      await _bookOne(pe, null);
      outcomes.push({ event: pe, ok: true });
    } catch (err) {
      outcomes.push({ event: pe, ok: false, error: err });
    }
  }
  const succeeded = outcomes.filter((o) => o.ok).length;
  const failed = outcomes.filter((o) => !o.ok).length;
  showToast(t('planning.batch_complete', { success: succeeded, failed }));
  outcomes
    .filter((o) => !o.ok)
    .forEach((o) =>
      showToast(
        t('planning.batch_failed_item', {
          subject: o.event.proposal.subject,
          error: o.error?.message ?? '',
        })
      )
    );
  await refreshBookings();
}

async function _onColumnDrop(e, overlay) {
  e.preventDefault();
  e.stopPropagation();
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
    events = _currentOutlookEvents.filter((pe) => ids.includes(pe.id));
  } else {
    // CDP drag simulation (Playwright) doesn't preserve custom MIME types;
    // fall back to the selection state populated by the dragstart handler.
    events = getSelectedEvents();
  }
  if (events.length === 0) return;
  await _bookBatch(events);
}

function _setupDropOverlay() {
  if (!_bookingsColEl) return;
  _bookingsColEl.querySelectorAll('.planning-drop-overlay').forEach((el) => el.remove());
  if (_overlayDragHandlers) {
    document.removeEventListener('dragstart', _overlayDragHandlers.start, true);
    document.removeEventListener('dragend', _overlayDragHandlers.end, true);
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
  _overlayDragHandlers = { start: onDragStart, end: onDragEnd };

  // Capture-phase listeners on the column: fire before FC's own handlers.
  // Overlay stays pointer-events:none so FullCalendar remains clickable.
  _bookingsColEl.addEventListener('drop', (e) => _onColumnDrop(e, overlay), true);
  _bookingsColEl.addEventListener(
    'dragover',
    (e) => {
      e.preventDefault();
      overlay.classList.add('drag-active');
    },
    true
  );
  _bookingsColEl.addEventListener(
    'dragleave',
    (e) => {
      if (!_bookingsColEl.contains(e.relatedTarget)) overlay.classList.remove('drag-active');
    },
    true
  );
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Re-load bookings for the current day.
 */
export async function refreshBookings() {
  if (!_bookingsCalendar || !_bookingsColEl) return;
  const bookings = await loadBookingsForDay(_bookingsCalendar, _planningDay);
  if (_outlookColEl) {
    _currentOutlookEvents = await renderOutlookColumn(
      _outlookColEl,
      _planningDay,
      bookings,
      _bookingsColEl
    );
    _setupDropOverlay();
  }
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
    _buildPlanningViewDOM(mainEl);
  }
  _isActive = true;

  // Rewire the shared toolbar to planning-view navigation
  setPlanningMode(true);
  setNavCallbacks(navigateToPrevDay, navigateToNextDay, navigateToToday);
  setPlanningRangeChangeCallback(() => {
    if (_outlookColEl && _currentOutlookEvents.length > 0) {
      rerenderOutlookColumn(_outlookColEl, _currentOutlookEvents, _bookingsColEl);
      _setupDropOverlay();
    }
  });
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
    _calendar.gotoDate(_mondayOf(_planningDay));
    _previousCalendarState = null;
  }

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
  ['planning.bookings_column', 'planning.outlook_column'].forEach((key) => {
    const h = document.createElement('div');
    h.className = 'planning-view-column-header';
    h.textContent = t(key);
    colHeaders.appendChild(h);
  });

  const scroll = document.createElement('div');
  scroll.className = 'planning-view-scroll';
  const cols = document.createElement('div');
  cols.className = 'planning-view-columns';

  _bookingsColEl = document.createElement('div');
  _bookingsColEl.className = 'planning-bookings-column';
  _outlookColEl = document.createElement('div');
  _outlookColEl.className = 'planning-outlook-column';

  cols.appendChild(_bookingsColEl);
  cols.appendChild(_outlookColEl);
  scroll.appendChild(cols);
  mainEl.appendChild(colHeaders);
  mainEl.appendChild(scroll);
}

function _buildPlanningViewDOM(mainEl) {
  _mainEl = mainEl;
  _buildColumns(mainEl);
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
  if (localStorage.getItem(STORAGE_KEY_ACTIVE_VIEW) === 'planning') {
    showPlanningView();
  }
}
