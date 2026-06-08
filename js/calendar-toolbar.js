// @ts-nocheck — DOM-heavy module; runtime checks suffice. Extracted from
// js/calendar.js (feature 035) — owns the toolbar toggles, the view-mode /
// day-range switches, the overflow + weekend indicators, and the mobile
// date label. Imports only settings / i18n / config so it never participates
// in a circular import with calendar.js or calendar-overlays.js.

import { readWorkingHours } from './settings.js';
import { t, locale } from './i18n.js';
import { STORAGE_KEY_VIEW_MODE, STORAGE_KEY_DAY_RANGE } from './config.js';

// ── Module state ──────────────────────────────────────────────────
let _calendar = null; // FullCalendar instance (set by installToolbarButtons)
let _currentEntries = []; // mapped entries for overflow-indicator recalculation
const _suppressNextSelectFlag = { value: false }; // shared with calendar.js select handler

// ── Mobile detection ──────────────────────────────────────────────
const MOBILE_BREAKPOINT = 768;

/** Returns true when the viewport is below the mobile breakpoint. */
export function isMobileView() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// ── Pure time helpers ─────────────────────────────────────────────
function timeStrToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(totalMin) {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/**
 * Pure: given mapped entries plus a [minMin, maxMin] minute window, returns
 * the set of dates with entries starting before the window (`overflowUp`),
 * ending after it (`overflowDown`), and the earliest such start minute.
 */
export function computeOverflowSets(entries, minMin, maxMin) {
  const overflowUp = new Set();
  const overflowDown = new Set();
  let earliestUpMin = Infinity;
  for (const entry of entries) {
    if (!entry.startTime) continue;
    const startMin = timeStrToMinutes(entry.startTime);
    const endMin = startMin + Math.round(entry.hours * 60);
    if (startMin < minMin) {
      overflowUp.add(entry.date);
      if (startMin < earliestUpMin) earliestUpMin = startMin;
    }
    if (endMin > maxMin) overflowDown.add(entry.date);
  }
  return { overflowUp, overflowDown, earliestUpMin };
}

/**
 * Returns { slotMinTime, slotMaxTime } based on stored working hours and view mode.
 * Cases:
 *   (a) No working hours configured → full 24h
 *   (b) View mode 'working' + hours exist → configured range
 *   (c) View mode null (never stored) + hours exist → write 'working', return configured range (FR-004)
 *   (d) Otherwise (view mode '24h') → full 24h
 */
export function getEffectiveTimeRange() {
  const wh = readWorkingHours();
  if (!wh) return { slotMinTime: '00:00', slotMaxTime: '24:00' };

  const viewMode = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
  if (viewMode === null) {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, 'working');
    return { slotMinTime: wh.start, slotMaxTime: wh.end };
  }
  if (viewMode === 'working') {
    return { slotMinTime: wh.start, slotMaxTime: wh.end };
  }
  return { slotMinTime: '00:00', slotMaxTime: '24:00' };
}

/** Returns hiddenDays array based on stored day-range preference. */
export function getInitialHiddenDays() {
  const stored = localStorage.getItem(STORAGE_KEY_DAY_RANGE);
  return stored === 'full-week' ? [] : [0, 6]; // default: workweek (hide Sun=0, Sat=6)
}

// ── Overflow + weekend indicators ─────────────────────────────────
function createOverflowIndicator(modifier, glyph, titleKey, onClick) {
  const ind = document.createElement('button');
  ind.className = `overflow-indicator overflow-indicator--${modifier}`;
  ind.title = t(titleKey);
  ind.textContent = glyph;
  addIndicatorListeners(ind, onClick);
  return ind;
}

function addIndicatorListeners(el, onClick) {
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    _suppressNextSelectFlag.value = true;
  });
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
}

function updateOverflowIndicators(entries) {
  document.querySelectorAll('.overflow-indicator').forEach((el) => el.remove());

  const range = getEffectiveTimeRange();
  if (range.slotMinTime === '00:00' && range.slotMaxTime === '24:00') return;

  const minMin = timeStrToMinutes(range.slotMinTime);
  const maxMin = timeStrToMinutes(range.slotMaxTime);
  const { overflowUp, overflowDown, earliestUpMin } = computeOverflowSets(entries, minMin, maxMin);

  const scrollUp =
    earliestUpMin < Infinity ? minutesToTimeStr(Math.max(0, earliestUpMin - 15)) : null;
  const scrollDown = overflowDown.size > 0 ? '23:59:00' : null;

  // FC v6 internal DOM — .fc-timegrid-col[data-date] and .fc-timegrid-col-frame may
  // not survive a major FullCalendar version bump; verify overflow indicators after
  // any major FC upgrade.
  for (const date of new Set([...overflowUp, ...overflowDown])) {
    const col = document.querySelector(`.fc-timegrid-col[data-date="${date}"]`);
    const frame = col?.querySelector('.fc-timegrid-col-frame');
    if (!frame) continue;
    if (overflowUp.has(date)) {
      frame.appendChild(
        createOverflowIndicator('up', '▲', 'calendar.overflow_before', () =>
          switchTo24hView(scrollUp)
        )
      );
    }
    if (overflowDown.has(date)) {
      frame.appendChild(
        createOverflowIndicator('down', '▼', 'calendar.overflow_after', () =>
          switchTo24hView(scrollDown)
        )
      );
    }
  }
}

function updateWeekendIndicator(entries) {
  document.querySelectorAll('.overflow-indicator--right').forEach((el) => el.remove());

  const isWorkweek = (localStorage.getItem(STORAGE_KEY_DAY_RANGE) ?? 'workweek') === 'workweek';
  if (!isWorkweek) return;

  const hasWeekendEntry = entries.some((entry) => {
    const dow = new Date(entry.date + 'T00:00:00').getDay();
    return dow === 0 || dow === 6; // Sunday or Saturday
  });
  if (!hasWeekendEntry) return;

  const headers = document.querySelectorAll('.fc-col-header-cell[data-date]');
  const lastHeader = headers[headers.length - 1];
  if (!lastHeader) return;

  const ind = document.createElement('button');
  ind.className = 'overflow-indicator overflow-indicator--right';
  ind.title = t('calendar.overflow_weekend');
  ind.textContent = '▶';
  addIndicatorListeners(ind, switchToFullWeekView);
  lastHeader.appendChild(ind);
}

function updateAllIndicators() {
  updateOverflowIndicators(_currentEntries);
  updateWeekendIndicator(_currentEntries);
}

/**
 * Re-runs the overflow + weekend indicators against the supplied mapped
 * entries (stored for later toggle-driven recomputation).
 */
export function updateIndicators(entries) {
  _currentEntries = entries;
  updateAllIndicators();
}

// ── View-mode + workweek toggles ──────────────────────────────────
function switchTo24hView(scrollTime) {
  localStorage.setItem(STORAGE_KEY_VIEW_MODE, '24h');
  _calendar.setOption('slotMinTime', '00:00');
  _calendar.setOption('slotMaxTime', '24:00');
  const track = document.querySelector('.fc-viewModeToggle-button .wh-switch-track');
  if (track) track.classList.remove('is-on');
  updateAllIndicators();
  if (scrollTime) {
    setTimeout(() => _calendar.scrollToTime(scrollTime), 50);
  }
}

function switchToFullWeekView() {
  localStorage.setItem(STORAGE_KEY_DAY_RANGE, 'full-week');
  _calendar.setOption('hiddenDays', []);
  const track = document.querySelector('.fc-fullWeekToggle-button .wh-switch-track');
  if (track) track.classList.remove('is-on');
  updateAllIndicators();
}

/**
 * Registers the view mode toggle customButton and wires its click handler.
 * Must be called after calendar.render().
 */
function initViewModeToggle() {
  const wh = readWorkingHours();
  const viewMode = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
  const isWorking = viewMode === 'working';

  const btnEl = document.querySelector('.fc-viewModeToggle-button');
  if (!btnEl) return;

  // Replace placeholder text with switch HTML
  btnEl.innerHTML = `
    <span class="wh-switch-label">${t('calendar.toggle_working_hours')}</span>
    <span class="wh-switch-track${isWorking ? ' is-on' : ''}">
      <span class="wh-switch-thumb"></span>
    </span>
  `;

  // Disable if no working hours configured
  if (!wh) {
    btnEl.classList.add('fc-toggle-disabled');
    btnEl.title = t('calendar.working_hours_hint');
  }
}

/**
 * Renders the "Full week" pill switch in the toolbar and wires its click handler.
 * Must be called after calendar.render().
 */
function initDayRangeToggle(cal) {
  const btnEl = document.querySelector('.fc-fullWeekToggle-button');
  if (!btnEl) return;

  const isWorkweek = (localStorage.getItem(STORAGE_KEY_DAY_RANGE) ?? 'workweek') === 'workweek';

  btnEl.innerHTML = `
    <span class="wh-switch-label">${t('calendar.toggle_workweek')}</span>
    <span class="wh-switch-track${isWorkweek ? ' is-on' : ''}">
      <span class="wh-switch-thumb"></span>
    </span>
  `;

  btnEl.addEventListener('click', () => {
    const current = localStorage.getItem(STORAGE_KEY_DAY_RANGE) ?? 'workweek';
    const next = current === 'workweek' ? 'full-week' : 'workweek';
    localStorage.setItem(STORAGE_KEY_DAY_RANGE, next);

    cal.setOption('hiddenDays', next === 'workweek' ? [0, 6] : []);

    const track = btnEl.querySelector('.wh-switch-track');
    if (track) track.classList.toggle('is-on', next === 'workweek');
    updateAllIndicators();
  });
}

/**
 * Returns the FullCalendar `customButtons` config object. Both click handlers
 * reference the module-scope `_calendar` set by installToolbarButtons before
 * any user interaction can occur.
 */
export function buildCustomButtons() {
  return {
    fullWeekToggle: {
      text: '',
      click() {},
    },
    viewModeToggle: {
      text: '',
      click() {
        const wh = readWorkingHours();
        if (!wh) return; // disabled — no-op (pointer-events:none should prevent this)

        const current = localStorage.getItem(STORAGE_KEY_VIEW_MODE) ?? '24h';
        const next = current === 'working' ? '24h' : 'working';
        localStorage.setItem(STORAGE_KEY_VIEW_MODE, next);

        const range = getEffectiveTimeRange();
        _calendar.setOption('slotMinTime', range.slotMinTime);
        _calendar.setOption('slotMaxTime', range.slotMaxTime);

        const track = document.querySelector('.fc-viewModeToggle-button .wh-switch-track');
        if (track) track.classList.toggle('is-on', next === 'working');
        updateAllIndicators();
      },
    },
  };
}

// ── Mobile date label ─────────────────────────────────────────────
/** Updates the mobile date label and wires a click-to-today handler once. */
export function updateMobileDate(info) {
  const el = document.getElementById('mobile-date');
  if (!el) return;
  const d = info.view.currentStart;
  el.textContent = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (!el._wired) {
    el.addEventListener('click', () => _calendar.today());
    el._wired = true;
  }
}

// ── Suppress-select bridge ────────────────────────────────────────
/**
 * Returns the shared `_suppressNextSelect` flag object. The calendar.js
 * `select` handler reads `.value` and resets it; overflow-indicator
 * pointerdown sets it. Sharing a single object reference keeps the flag
 * coherent across both modules without a global.
 */
export function getSuppressSelectFlag() {
  return _suppressNextSelectFlag;
}

/**
 * Stores the calendar instance and wires the toolbar toggles. Must be called
 * after `calendar.render()`.
 */
export function installToolbarButtons(calendar) {
  _calendar = calendar;
  initViewModeToggle(calendar);
  initDayRangeToggle(calendar);
}

// ── Mobile resize / swipe navigation ──────────────────────────────
/**
 * Wires viewport-resize view switching (day ↔ week) and touch-swipe week
 * navigation. Extracted from calendar.js (feature 035) — both are mobile
 * concerns owned by this module.
 */
export function installMobileNavigation(calendarEl, calendar) {
  let lastMobileState = isMobileView();
  window.addEventListener('resize', () => {
    const mobile = isMobileView();
    if (mobile === lastMobileState) return;
    lastMobileState = mobile;
    calendar.changeView(mobile ? 'timeGridDay' : 'timeGridWeek');
  });

  let swipeStartX = 0;
  let swipeStartY = 0;
  const SWIPE_THRESHOLD = 50;
  calendarEl.addEventListener(
    'touchstart',
    (e) => {
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  calendarEl.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - swipeStartX;
      const dy = e.changedTouches[0].clientY - swipeStartY;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) calendar.next();
      else calendar.prev();
    },
    { passive: true }
  );
}
