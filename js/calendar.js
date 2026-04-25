import { loadCentralConfig, readCredentials,
         readWorkingHours, getCentralConfigSync }  from './settings.js';
import { setCalendarRefreshCallback }              from './chatbot-tools.js';
import { t, locale }                                from './i18n.js';
import { computeArbzgWarnings }                     from './arbzg.js';
import { fetchTimeEntries, resolveIssueSubject,
         mapTimeEntry, updateTimeEntry,
         deleteTimeEntry, loadCredentials,
         formatProject }                           from './redmine-api.js';
import { SLOT_DURATION, SNAP_DURATION,
         STORAGE_KEY_VIEW_MODE,
         STORAGE_KEY_DAY_RANGE }                   from './config.js';
import { openForm, showDeleteConfirm }              from './time-entry-form.js';

try {
  await loadCentralConfig();
  const creds = await readCredentials();
  if (!creds) { window.location.href = 'settings.html'; }
  else { await loadCredentials(); }
} catch {
  window.location.href = 'settings.html';
}

// ── DOM refs ──────────────────────────────────────────────────────
const calendarEl     = document.getElementById('calendar');
const loadingOverlay = document.getElementById('loading-overlay');
const errorBanner    = document.getElementById('error-banner');
const errorMessage   = document.getElementById('error-message');
const errorRetry     = document.getElementById('error-retry');
const errorDismiss   = document.getElementById('error-dismiss');
const toastEl        = document.getElementById('toast');

// ── ArbZG warnings global (read by dayHeaderContent render cycle) ─
window._calendarArbzgWarnings = { daily: {}, weekly: [], restPeriod: {}, sunday: [], holiday: {}, breaks: {} };

let calendar;          // FullCalendar instance
let _lastStart = null; // last fetched week start (for retry)
let _lastEnd   = null;
let _currentEntries = []; // mapped entries for overflow indicator recalculation
let _suppressNextSelect = false; // set by overflow indicator click to block select handler

// ── Copy-paste state ──────────────────────────────────────────────
let _selectedEvent  = null; // currently selected FullCalendar Event | null
let _lastClickId    = null; // event id of last eventClick (double-click detection)
let _lastClickTime  = 0;    // timestamp of last eventClick
let _clipboard      = null; // { issueId, issueSubject, projectName, activityId, hours, comment, startTime } | null

// ── Entry selection ───────────────────────────────────────────────
function baseClasses(fcEvent) {
  return fcEvent.extendedProps?.timeEntry?.startTime ? [] : ['no-start-time'];
}

function selectEntry(fcEvent) {
  if (_selectedEvent && _selectedEvent !== fcEvent) deselectEntry();
  _selectedEvent = fcEvent;
  fcEvent.setProp('classNames', [...baseClasses(fcEvent), 'fc-event--selected']);
}

function deselectEntry() {
  if (!_selectedEvent) return;
  _selectedEvent.setProp('classNames', baseClasses(_selectedEvent));
  _selectedEvent = null;
}

// ── Toast ─────────────────────────────────────────────────────────
export function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

// ── Error banner ──────────────────────────────────────────────────
const errorSettingsLink = document.getElementById('error-settings-link');

function showError(message, retryFn, { showSettingsLink = false } = {}) {
  errorMessage.textContent = message;
  errorSettingsLink.classList.toggle('hidden', !showSettingsLink);
  errorBanner.classList.remove('hidden');
  errorRetry.onclick = () => { errorBanner.classList.add('hidden'); retryFn?.(); };
}
function hideError() {
  errorBanner.classList.add('hidden');
  errorSettingsLink.classList.add('hidden');
}
errorDismiss.addEventListener('click', hideError);

// ── ArbZG tooltip ─────────────────────────────────────────────────
function buildDayWarningLines(dateStr) {
  const w = window._calendarArbzgWarnings;
  if (!w) return [];
  const lines = [];
  for (const warn of (w.daily[dateStr] ?? [])) {
    lines.push(t(warn.messageKey, { observed: warn.observed, allowed: warn.allowed }));
  }
  if (w.restPeriod[dateStr]) {
    const warn = w.restPeriod[dateStr];
    lines.push(t(warn.messageKey, { observed: warn.observed, allowed: warn.allowed }));
  }
  if (w.sunday.includes(dateStr)) lines.push(t('arbzg.sunday'));
  if (w.holiday[dateStr])         lines.push(t('arbzg.holiday', { name: w.holiday[dateStr] }));
  for (const warn of (w.breaks[dateStr] ?? [])) {
    if (warn.rule === 'BREAK_INSUFFICIENT') {
      lines.push(t(warn.messageKey, { observed: warn.observed, required: warn.required }));
    } else {
      lines.push(t(warn.messageKey, { observed: warn.observed, allowed: warn.allowed }));
    }
  }
  return lines;
}

function positionArbzgTooltip(event) {
  const tooltip = document.getElementById('arbzg-tooltip');
  if (!tooltip) return;
  let x = event.clientX + 14;
  let y = event.clientY + 14;
  const tw = tooltip.offsetWidth  || 340;
  const th = tooltip.offsetHeight || 60;
  if (x + tw > window.innerWidth)  x = event.clientX - tw - 4;
  if (y + th > window.innerHeight) y = event.clientY - th - 4;
  tooltip.style.left = `${x}px`;
  tooltip.style.top  = `${y}px`;
}

function showArbzgTooltip(event, dateStr) {
  const tooltip = document.getElementById('arbzg-tooltip');
  if (!tooltip) return;
  const lines = buildDayWarningLines(dateStr);
  if (!lines.length) return;
  tooltip.textContent = lines.join('\n');
  tooltip.classList.add('visible');
  positionArbzgTooltip(event);
}

function showArbzgWeekTooltip(event) {
  const tooltip = document.getElementById('arbzg-tooltip');
  if (!tooltip) return;
  const warnings = window._calendarArbzgWarnings?.weekly ?? [];
  const lines = warnings.map(w => t(w.messageKey, { observed: w.observed, allowed: w.allowed }));
  if (!lines.length) return;
  tooltip.textContent = lines.join('\n');
  tooltip.classList.add('visible');
  positionArbzgTooltip(event);
}

function hideArbzgTooltip() {
  document.getElementById('arbzg-tooltip')?.classList.remove('visible');
}

// ── Loading state ─────────────────────────────────────────────────
function setLoading(on) {
  loadingOverlay.classList.toggle('hidden', !on);
  if (calendar) calendar.setOption('selectable', !on);
}

// ── Daily totals ──────────────────────────────────────────────────
function computeDailyTotals(events) {
  const totals = {};
  for (const ev of events) {
    const day = ev.extendedProps?.timeEntry?.date;
    if (day) totals[day] = (totals[day] ?? 0) + (ev.extendedProps.timeEntry.hours ?? 0);
  }
  return totals;
}

function formatHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ── Midnight split ────────────────────────────────────────────────
// Splits an entry that crosses midnight into two segments (one per day).
function splitMidnightEntries(timeEntries) {
  const result = [];
  for (const entry of timeEntries) {
    if (!entry.startTime) { result.push(entry); continue; }
    const [h, m] = entry.startTime.split(':').map(Number);
    const startMinutes    = h * 60 + m;
    const durationMinutes = Math.round(entry.hours * 60);
    const endMinutes      = startMinutes + durationMinutes;

    if (endMinutes <= 24 * 60) {
      result.push(entry);
    } else {
      // First segment: start to midnight
      const firstMins = 24 * 60 - startMinutes;
      result.push({ ...entry, hours: firstMins / 60 });

      // Second segment: midnight to end on next day (UTC to avoid timezone date shift)
      const [y, mo, d] = entry.date.split('-').map(Number);
      const nextDateStr = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
      result.push({
        ...entry,
        id:        null,
        date:      nextDateStr,
        startTime: '00:00',
        hours:     (endMinutes - 24 * 60) / 60,
        _isMidnightContinuation: true,
      });
    }
  }
  return result;
}

// ── Map TimeEntry → FullCalendar event object ─────────────────────
function toFcEvent(entry) {
  const hasStart = !!entry.startTime;
  const [h, m] = hasStart ? entry.startTime.split(':').map(Number) : [0, 0];
  const startMs = (h * 60 + m) * 60000;
  const endMs   = startMs + Math.round(entry.hours * 60) * 60000;

  const dateBase    = entry.date + 'T';
  const start       = dateBase + toHHMM(h * 60 + m);
  const totalEndMin = (h * 60 + m) + Math.round(entry.hours * 60);
  let end;
  if (totalEndMin >= 24 * 60) {
    const [y, mo, d] = entry.date.split('-').map(Number);
    const nextDay = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
    end = nextDay + 'T' + toHHMM(totalEndMin - 24 * 60);
  } else {
    end = dateBase + toHHMM(totalEndMin);
  }

  const title = entry.issueSubject ?? `Issue #${entry.issueId}`;

  return {
    id:    entry.id ? String(entry.id) : undefined,
    title,
    start,
    end,
    classNames: hasStart ? [] : ['no-start-time'],
    extendedProps: { timeEntry: entry },
  };
}

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// ── Load week entries ─────────────────────────────────────────────
async function loadWeekEntries(startDate, endDate) {
  _lastStart = startDate;
  _lastEnd   = endDate;
  setLoading(true);
  hideError();

  try {
    const rawEntries = await fetchTimeEntries(startDate, endDate);
    const mapped = rawEntries.map(mapTimeEntry).filter(Boolean);

    // Resolve missing issue subjects
    await Promise.all(mapped.map(async (entry) => {
      if (!entry.issueSubject && entry.issueId) {
        entry.issueSubject = await resolveIssueSubject(entry.issueId);
      }
    }));

    const split = splitMidnightEntries(mapped);
    const fcEvents = split.map(toFcEvent);

    calendar.removeAllEvents();
    fcEvents.forEach(ev => calendar.addEvent(ev));
    updateDayTotals(fcEvents);
    _currentEntries = mapped;
    updateAllIndicators();
  } catch (err) {
    const isConfigError = err.status === 0 || err.status === 401 || err.status === 404 || err.status === 503;
    showError(
      isConfigError ? `${err.message} → Check your settings.` : err.message,
      () => loadWeekEntries(startDate, endDate),
      { showSettingsLink: isConfigError },
    );
  } finally {
    setLoading(false);
  }
}

// ── Week total display ────────────────────────────────────────────
function updateWeekTotal(events) {
  const total = events.reduce((sum, ev) => {
    if (ev.extendedProps?.timeEntry?._isMidnightContinuation) return sum;
    return sum + (ev.extendedProps?.timeEntry?.hours ?? 0);
  }, 0);
  const el = document.getElementById('week-total');
  if (!el) return;
  el.textContent = '';

  // ArbZG weekly badge — prepended so it appears left of the total text
  if (window._calendarArbzgWarnings?.weekly?.length > 0) {
    const badge = document.createElement('span');
    badge.className = 'arbzg-badge';
    badge.textContent = '⚠';
    badge.addEventListener('mouseenter', showArbzgWeekTooltip);
    badge.addEventListener('mouseleave', hideArbzgTooltip);
    el.appendChild(badge);
  }

  if (total > 0) el.appendChild(document.createTextNode(`${formatHours(total)}${t('calendar.total_suffix')}`));
}

// ── Day totals display ────────────────────────────────────────────
function updateDayTotals(events) {
  const totals = computeDailyTotals(events);
  // FullCalendar re-renders day headers via dayCellContent; store totals globally
  window._calendarDayTotals = totals;

  // Compute ArbZG warnings from current week's entries
  const entries = events.map(ev => ev.extendedProps?.timeEntry).filter(Boolean);
  const year = calendar.view.currentStart.getFullYear();
  try {
    window._calendarArbzgWarnings = computeArbzgWarnings(entries, year);
  } catch (e) {
    console.error('ArbZG computation failed:', e);
    window._calendarArbzgWarnings = { daily: {}, weekly: [], restPeriod: {}, sunday: [], holiday: {}, breaks: {} };
  }

  calendar.render(); // triggers dayHeaderContent re-evaluation
  updateWeekTotal(events);
}

export function recomputeDayTotals() {
  const events = calendar.getEvents().map(ev => ({ extendedProps: ev.extendedProps }));
  updateDayTotals(events);
}

// ── Overflow indicators ───────────────────────────────────────────

function timeStrToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(totalMin) {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function updateOverflowIndicators(entries) {
  document.querySelectorAll('.overflow-indicator').forEach(el => el.remove());

  const range = getEffectiveTimeRange();
  if (range.slotMinTime === '00:00' && range.slotMaxTime === '24:00') return;

  const minMin = timeStrToMinutes(range.slotMinTime);
  const maxMin = timeStrToMinutes(range.slotMaxTime);

  const overflowUp   = new Set();
  const overflowDown = new Set();

  for (const entry of entries) {
    if (!entry.startTime) continue;
    const startMin = timeStrToMinutes(entry.startTime);
    const endMin   = startMin + Math.round(entry.hours * 60);
    if (startMin < minMin) overflowUp.add(entry.date);
    if (endMin   > maxMin) overflowDown.add(entry.date);
  }

  // Compute scroll targets
  // ▲: scroll to earliest entry start before range
  // ▼: scroll to end of day
  let earliestUpMin = Infinity;
  for (const entry of entries) {
    if (!entry.startTime) continue;
    const startMin = timeStrToMinutes(entry.startTime);
    const endMin   = startMin + Math.round(entry.hours * 60);
    if (startMin < minMin && startMin < earliestUpMin) earliestUpMin = startMin;
  }
  const scrollUp   = earliestUpMin < Infinity
    ? minutesToTimeStr(Math.max(0, earliestUpMin - 15))
    : null;
  const scrollDown = overflowDown.size > 0 ? '23:59:00' : null;

  const allDates = new Set([...overflowUp, ...overflowDown]);
  for (const date of allDates) {
    const col   = document.querySelector(`.fc-timegrid-col[data-date="${date}"]`);
    const frame = col?.querySelector('.fc-timegrid-col-frame');
    if (!frame) continue;

    if (overflowUp.has(date)) {
      const ind = document.createElement('button');
      ind.className = 'overflow-indicator overflow-indicator--up';
      ind.title     = t('calendar.overflow_before');
      ind.textContent = '▲';
      addIndicatorListeners(ind, () => switchTo24hView(scrollUp));
      frame.appendChild(ind);
    }
    if (overflowDown.has(date)) {
      const ind = document.createElement('button');
      ind.className = 'overflow-indicator overflow-indicator--down';
      ind.title     = t('calendar.overflow_after');
      ind.textContent = '▼';
      addIndicatorListeners(ind, () => switchTo24hView(scrollDown));
      frame.appendChild(ind);
    }
  }
}

function addIndicatorListeners(el, onClick) {
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    _suppressNextSelect = true;
  });
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
}

function switchTo24hView(scrollTime) {
  localStorage.setItem(STORAGE_KEY_VIEW_MODE, '24h');
  calendar.setOption('slotMinTime', '00:00');
  calendar.setOption('slotMaxTime', '24:00');
  const track = document.querySelector('.fc-viewModeToggle-button .wh-switch-track');
  if (track) track.classList.remove('is-on');
  updateAllIndicators();
  if (scrollTime) {
    setTimeout(() => calendar.scrollToTime(scrollTime), 50);
  }
}

function switchToFullWeekView() {
  localStorage.setItem(STORAGE_KEY_DAY_RANGE, 'full-week');
  calendar.setOption('hiddenDays', []);
  const track = document.querySelector('.fc-fullWeekToggle-button .wh-switch-track');
  if (track) track.classList.remove('is-on');
  updateAllIndicators();
}

function updateWeekendIndicator(entries) {
  document.querySelectorAll('.overflow-indicator--right').forEach(el => el.remove());

  const isWorkweek = (localStorage.getItem(STORAGE_KEY_DAY_RANGE) ?? 'workweek') === 'workweek';
  if (!isWorkweek) return;

  const hasWeekendEntry = entries.some(entry => {
    const dow = new Date(entry.date + 'T00:00:00').getDay();
    return dow === 0 || dow === 6; // Sunday or Saturday
  });
  if (!hasWeekendEntry) return;

  const headers    = document.querySelectorAll('.fc-col-header-cell[data-date]');
  const lastHeader = headers[headers.length - 1];
  if (!lastHeader) return;

  const ind = document.createElement('button');
  ind.className   = 'overflow-indicator overflow-indicator--right';
  ind.title       = t('calendar.overflow_weekend');
  ind.textContent = '▶';
  addIndicatorListeners(ind, switchToFullWeekView);
  lastHeader.appendChild(ind);
}

function updateAllIndicators() {
  updateOverflowIndicators(_currentEntries);
  updateWeekendIndicator(_currentEntries);
}

// ── View mode helpers ─────────────────────────────────────────────

/**
 * Returns { slotMinTime, slotMaxTime } based on stored working hours and view mode.
 * Cases:
 *   (a) No working hours configured → full 24h
 *   (b) View mode 'working' + hours exist → configured range
 *   (c) View mode null (never stored) + hours exist → write 'working', return configured range (FR-004)
 *   (d) Otherwise (view mode '24h') → full 24h
 */
function getEffectiveTimeRange() {
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

/**
 * Registers the view mode toggle customButton and wires its click handler.
 * Must be called after calendar.render().
 */
function initViewModeToggle(cal) {
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

// ── Day range helpers ─────────────────────────────────────────────

/** Returns hiddenDays array based on stored day-range preference. */
function getInitialHiddenDays() {
  const stored = localStorage.getItem(STORAGE_KEY_DAY_RANGE);
  return stored === 'full-week' ? [] : [0, 6]; // default: workweek (hide Sun=0, Sat=6)
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

// ── Mobile detection ─────────────────────────────────────────────
const MOBILE_BREAKPOINT = 768;
function isMobileView() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function updateMobileDate(info) {
  const el = document.getElementById('mobile-date');
  if (!el) return;
  const d = info.view.currentStart;
  el.textContent = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (!el._wired) {
    el.addEventListener('click', () => calendar.today());
    el._wired = true;
  }
}

// ── FullCalendar init ─────────────────────────────────────────────
const _initialRange = getEffectiveTimeRange();

calendar = new FullCalendar.Calendar(calendarEl, {
  locale:        locale,
  slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  initialView:   isMobileView() ? 'timeGridDay' : 'timeGridWeek',
  dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric' },
  firstDay:      1, // Monday
  slotDuration:  SLOT_DURATION,
  snapDuration:  SNAP_DURATION,
  slotMinTime:   _initialRange.slotMinTime,
  slotMaxTime:   _initialRange.slotMaxTime,
  allDaySlot:    false,
  selectable:    true,
  selectLongPressDelay: 300,
  selectAllow:   (span) => span.start.toDateString() === new Date(span.end - 1).toDateString(),
  editable:      true,
  eventMinHeight: 20,
  hiddenDays: getInitialHiddenDays(),
  headerToolbar: {
    left:   'prev,next today',
    center: 'title',
    right:  'viewModeToggle fullWeekToggle',
  },
  customButtons: {
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
        calendar.setOption('slotMinTime', range.slotMinTime);
        calendar.setOption('slotMaxTime', range.slotMaxTime);

        const track = document.querySelector('.fc-viewModeToggle-button .wh-switch-track');
        if (track) track.classList.toggle('is-on', next === 'working');
        updateAllIndicators();
      },
    },
  },

  // ── Week navigation → load entries ───────────────────────────
  datesSet(info) {
    const start = info.startStr.slice(0, 10);
    const end   = info.endStr.slice(0, 10);
    loadWeekEntries(start, end);
    updateMobileDate(info);
  },

  // ── Daily totals in column headers ────────────────────────────
  dayHeaderContent(arg) {
    const d       = arg.date;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const total   = window._calendarDayTotals?.[dateStr];
    const el      = document.createElement('div');
    el.className  = 'day-header-cell';
    const label   = document.createElement('span');
    if (isMobileView()) {
      label.textContent = arg.text;
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => calendar.today());
    } else {
      label.textContent = arg.text;
    }
    el.appendChild(label);
    // Right-side cell (column 3): optional ArbZG badge + day total
    const right = document.createElement('span');
    right.className = 'day-total';
    el.appendChild(right);

    // ArbZG daily badge — prepended so it appears left of the total text
    const w = window._calendarArbzgWarnings;
    if (w) {
      const hasWarning = (w.daily[dateStr]?.length > 0)
        || w.restPeriod[dateStr]
        || w.sunday.includes(dateStr)
        || w.holiday[dateStr]
        || (w.breaks[dateStr]?.length > 0);
      if (hasWarning) {
        const badge = document.createElement('span');
        badge.className = 'arbzg-badge';
        badge.textContent = '⚠';
        badge.addEventListener('mouseenter', (e) => showArbzgTooltip(e, dateStr));
        badge.addEventListener('mouseleave', hideArbzgTooltip);
        right.appendChild(badge);
      }
    }

    if (total) right.appendChild(document.createTextNode(formatHours(total)));

    return { domNodes: [el] };
  },

  // ── Event content: multi-line display ────────────────────────
  eventContent(arg) {
    const entry = arg.event.extendedProps?.timeEntry;
    if (!entry) return true;

    const wrapper = document.createElement('div');
    wrapper.className = 'ev-content';

    function line(cls, text) {
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = text;
      wrapper.appendChild(el);
    }

    // Line 1: ticket (as hyperlink if server URL available)
    const cfg = getCentralConfigSync();
    if (entry.issueId && cfg?.redmineServerUrl) {
      const linkDiv = document.createElement('div');
      linkDiv.className = 'ev-issue';
      const a = document.createElement('a');
      a.href = `${cfg.redmineServerUrl}/issues/${entry.issueId}`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = `#${entry.issueId} ${entry.issueSubject ?? ''}`;
      linkDiv.appendChild(a);
      wrapper.appendChild(linkDiv);
    } else {
      line('ev-issue', `#${entry.issueId ?? ''} ${entry.issueSubject ?? ''}`);
    }

    // Line 2: project (with identifier if available)
    if (entry.projectName || entry.projectIdentifier) {
      const projText = formatProject(entry.projectIdentifier, entry.projectName);
      const projDiv = document.createElement('div');
      projDiv.className = 'ev-project';
      projDiv.textContent = projText;
      if (entry.projectIdentifier && entry.projectIdentifier.length > 20) {
        projDiv.title = `${entry.projectIdentifier} \u2014 ${entry.projectName}`;
      }
      wrapper.appendChild(projDiv);
    }

    // Line 3: time range + duration (hidden on mobile)
    if (!isMobileView()) {
      const durationLabel = formatHours(entry.hours);
      if (entry.startTime) {
        const [h, m] = entry.startTime.split(':').map(Number);
        const endTime = toHHMM(h * 60 + m + Math.round(entry.hours * 60));
        line('ev-time', `${entry.startTime} – ${endTime} (${durationLabel})`);
      } else {
        line('ev-time ev-time-unknown', `(${durationLabel})`);
      }
    }

    // Line 4: comment (hidden on mobile)
    if (entry.comment && !isMobileView()) line('ev-comment', entry.comment);

    return { domNodes: [wrapper] };
  },

  // ── Tap on empty slot (mobile) ─────────────────────────────────
  dateClick(info) {
    if (!isMobileView()) return;
    deselectEntry();
    const date = info.dateStr.slice(0, 10);
    const time = info.dateStr.slice(11, 16) || null;
    const hours = 0.25;
    const prefill = _clipboard
      ? { date, ..._clipboard, startTime: time, hours }
      : { date, startTime: time, hours };
    openForm(null, prefill, async (newEntry) => {
      if (!newEntry.issueSubject && newEntry.issueId) {
        newEntry.issueSubject = await resolveIssueSubject(newEntry.issueId);
      }
      calendar.addEvent(toFcEvent(newEntry));
      recomputeDayTotals();
      showToast(t('calendar.entry_saved'));
    });
  },

  // ── Create entry by click / drag on empty slot ────────────────
  select(info) {
    if (_suppressNextSelect) { _suppressNextSelect = false; calendar.unselect(); return; }
    deselectEntry();

    const startStr      = info.startStr;
    const endStr        = info.endStr;
    const durationHours = (new Date(endStr) - new Date(startStr)) / 3600000;
    const date          = startStr.slice(0, 10);
    const time          = startStr.slice(11, 16) || null;

    const prefill = _clipboard
      ? { date, ..._clipboard, startTime: time, hours: durationHours }
      : { date, startTime: time, hours: durationHours };

    openForm(null, prefill, async (newEntry) => {
      if (!newEntry.issueSubject && newEntry.issueId) {
        newEntry.issueSubject = await resolveIssueSubject(newEntry.issueId);
      }
      calendar.addEvent(toFcEvent(newEntry));
      recomputeDayTotals();
      showToast(t('calendar.entry_saved'));
    });

    calendar.unselect();
  },

  // ── Click: select; double-click: open edit modal ─────────────
  eventClick(info) {
    const entry = info.event.extendedProps?.timeEntry;
    if (!entry || entry._isMidnightContinuation) return;

    const now      = Date.now();
    const isDouble = _lastClickId === info.event.id && (now - _lastClickTime) < 300;
    _lastClickId   = info.event.id;
    _lastClickTime = now;

    if (isDouble || isMobileView()) {
      deselectEntry();
      openForm(entry, {}, (updatedEntry) => {
        const ev = calendar.getEventById(String(updatedEntry.id));
        if (ev) {
          const updated = toFcEvent(updatedEntry);
          ev.setProp('title', updated.title);
          ev.setStart(updated.start);
          ev.setEnd(updated.end);
          ev.setExtendedProp('timeEntry', updatedEntry);
        }
        recomputeDayTotals();
        showToast(t('calendar.entry_updated'));
      }, (deletedId) => {
        const ev = calendar.getEventById(String(deletedId));
        if (ev) ev.remove();
        recomputeDayTotals();
        showToast(t('calendar.entry_deleted'));
      });
    } else {
      selectEntry(info.event);
    }
  },

  // ── Drag-to-move ──────────────────────────────────────────────
  async eventDrop(info) {
    const entry = info.event.extendedProps?.timeEntry;
    if (!entry || !entry.id) { info.revert(); return; }

    const newStart = info.event.start;
    const newDate  = `${newStart.getFullYear()}-${String(newStart.getMonth()+1).padStart(2,'0')}-${String(newStart.getDate()).padStart(2,'0')}`;
    const newTime  = `${String(newStart.getHours()).padStart(2,'0')}:${String(newStart.getMinutes()).padStart(2,'0')}`;

    try {
      await updateTimeEntry(entry.id, {
        hours:      entry.hours,
        activityId: entry.activityId,
        comment:    entry.comment,
        startTime:  newTime,
        spentOn:    newDate,
      });
      info.event.setExtendedProp('timeEntry', { ...entry, startTime: newTime, date: newDate });
      recomputeDayTotals();
    } catch (err) {
      info.revert();
      showError(`Move failed: ${err.message}`, null);
    }
  },

  // ── Drag-to-resize (bottom edge) ─────────────────────────────
  eventResizableFromStart: true,

  async eventResize(info) {
    const entry = info.event.extendedProps?.timeEntry;
    if (!entry || !entry.id) { info.revert(); return; }

    const newEnd   = info.event.end;
    const newStart = info.event.start;
    const newHours = (newEnd - newStart) / 3600000;
    const newStartTime = `${String(newStart.getHours()).padStart(2,'0')}:${String(newStart.getMinutes()).padStart(2,'0')}`;
    const newDate = newStart.toISOString().slice(0, 10);

    try {
      await updateTimeEntry(entry.id, {
        hours:      newHours,
        activityId: entry.activityId,
        comment:    entry.comment,
        startTime:  newStartTime,
        spentOn:    newDate,
      });
      info.event.setExtendedProp('timeEntry', { ...entry, hours: newHours, startTime: newStartTime, date: newDate });
      recomputeDayTotals();
    } catch (err) {
      info.revert();
      showError(`Resize failed: ${err.message}`, null);
    }
  },
});

calendar.render();
initViewModeToggle(calendar);
initDayRangeToggle(calendar);

// ── Responsive view switching (portrait=day, landscape=week) ─────
let _lastMobileState = isMobileView();
window.addEventListener('resize', () => {
  const mobile = isMobileView();
  if (mobile === _lastMobileState) return;
  _lastMobileState = mobile;
  calendar.changeView(mobile ? 'timeGridDay' : 'timeGridWeek');
});

// ── Swipe navigation for mobile day view ─────────────────────────
{
  let _swipeStartX = 0;
  let _swipeStartY = 0;
  const SWIPE_THRESHOLD = 50;

  calendarEl.addEventListener('touchstart', (e) => {
    _swipeStartX = e.touches[0].clientX;
    _swipeStartY = e.touches[0].clientY;
  }, { passive: true });

  calendarEl.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - _swipeStartX;
    const dy = e.changedTouches[0].clientY - _swipeStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) calendar.next();
    else calendar.prev();
  }, { passive: true });
}

// ── Clipboard banner helpers (T007) ───────────────────────────────
function copyToClipboard(entry) {
  _clipboard = {
    issueId:      entry.issueId,
    issueSubject: entry.issueSubject,
    projectName:  entry.projectName,
    activityId:   entry.activityId,
    hours:        entry.hours,
    comment:      entry.comment,
    startTime:    entry.startTime,
  };
  deselectEntry();
  document.getElementById('clipboard-banner-text').textContent =
    t('calendar.clipboard_banner', { id: String(entry.issueId), subject: entry.issueSubject ?? '' });
  document.getElementById('clipboard-banner').classList.remove('hidden');
}

function clearClipboard() {
  _clipboard = null;
  document.getElementById('clipboard-banner').classList.add('hidden');
}

// T008 — wire banner clear button
document.getElementById('clipboard-banner-clear').addEventListener('click', clearClipboard);

// T009 — keyboard handler: Ctrl+C copies, Enter opens modal, Escape deselects
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.code === 'KeyC') && _selectedEvent) {
    const entry = _selectedEvent.extendedProps?.timeEntry;
    if (entry && !entry._isMidnightContinuation) {
      copyToClipboard(entry);
      e.preventDefault();
    }
    return;
  }
  if (e.key === 'Enter' && _selectedEvent) {
    const entry = _selectedEvent.extendedProps?.timeEntry;
    if (entry && !entry._isMidnightContinuation) {
      deselectEntry();
      openForm(entry, {}, (updatedEntry) => {
        const ev = calendar.getEventById(String(updatedEntry.id));
        if (ev) {
          const updated = toFcEvent(updatedEntry);
          ev.setProp('title', updated.title);
          ev.setStart(updated.start);
          ev.setEnd(updated.end);
          ev.setExtendedProp('timeEntry', updatedEntry);
        }
        recomputeDayTotals();
        showToast(t('calendar.entry_updated'));
      }, (deletedId) => {
        const ev = calendar.getEventById(String(deletedId));
        if (ev) ev.remove();
        recomputeDayTotals();
        showToast(t('calendar.entry_deleted'));
      });
    }
    return;
  }
  if (e.key === 'Delete' && _selectedEvent) {
    const entry = _selectedEvent.extendedProps?.timeEntry;
    if (entry && !entry._isMidnightContinuation && entry.id) {
      const ev = _selectedEvent;
      deselectEntry();
      showDeleteConfirm(() => {
        deleteTimeEntry(entry.id).then(() => {
          ev.remove();
          recomputeDayTotals();
          showToast(t('calendar.entry_deleted'));
        }).catch((err) => {
          showError(err.message ?? t('modal.delete_failed'), null);
        });
      });
      e.preventDefault();
    }
    return;
  }
  if (e.key === 'Escape') {
    deselectEntry();
  }
});

// Retry button re-loads current week
errorRetry.addEventListener('click', () => {
  if (_lastStart && _lastEnd) loadWeekEntries(_lastStart, _lastEnd);
});

// Wire calendar refresh for chatbot tool actions
setCalendarRefreshCallback(() => {
  if (_lastStart && _lastEnd) loadWeekEntries(_lastStart, _lastEnd);
});
