// @ts-nocheck — DOM-heavy module; runtime checks suffice. Extracted from
// js/calendar.js (feature 035). OWNS the former cross-callback calendar
// globals as module-scope `let` bindings (FR-007). Provides the FullCalendar
// event-rendering callbacks plus the totals / ArbZG / anomaly recomputation.

import { computeArbzgWarnings } from './arbzg.js';
import { detectAnomalies } from './anomalies.js';
import { attachAnomalyBadge } from './anomaly-render.js';
import { t } from './i18n.js';
import { getCentralConfigSync } from './config-store.js';
import { formatProject } from './redmine-api.js';
import { isMobileView } from './calendar-toolbar.js';

// ── Module-scope state (former cross-callback calendar globals) ───
let _arbzgWarnings = {
  daily: {},
  weekly: [],
  restPeriod: {},
  sunday: [],
  holiday: {},
  breaks: {},
};
let _anomalies = new Map();
let _dayTotals = {};

// FullCalendar instance — set by attachOverlayHooks.
let _calendar = null;
let _listenersWired = false;

// Feature 029: tracks the rendered DOM node for each entry id so live CRUD
// can re-attach/remove anomaly badges without re-fetching from Redmine.
const _eventElements = new Map();

// ── State accessors ───────────────────────────────────────────────
/** Returns the current ArbZG warnings shape. */
export function getArbzgWarnings() {
  return _arbzgWarnings;
}

/** Returns the current anomaly Map<entryId, AnomalyTag>. */
export function getAnomalies() {
  return _anomalies;
}

/** Returns the current per-day totals map. */
export function getDayTotals() {
  return _dayTotals;
}

// ── Pure helpers (DOM-free; exported for unit tests) ──────────────
// Resolves a positive-integer ticket id from central config; null otherwise.
function resolveTicket(cfg, field) {
  const id = cfg?.[field];
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function formatHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function computeDailyTotals(events) {
  const totals = {};
  for (const ev of events) {
    const day = ev.extendedProps?.timeEntry?.date;
    if (day) totals[day] = (totals[day] ?? 0) + (ev.extendedProps.timeEntry.hours ?? 0);
  }
  return totals;
}

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Splits an entry that crosses midnight into two segments (one per day).
export function splitMidnightEntries(timeEntries) {
  const result = [];
  for (const entry of timeEntries) {
    if (!entry.startTime) {
      result.push(entry);
      continue;
    }
    const [h, m] = entry.startTime.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes = startMinutes + Math.round(entry.hours * 60);

    if (endMinutes <= 24 * 60) {
      result.push(entry);
    } else {
      // First segment: start to midnight
      result.push({ ...entry, hours: (24 * 60 - startMinutes) / 60 });
      // Second segment: midnight to end on next day (UTC to avoid TZ date shift)
      const [y, mo, d] = entry.date.split('-').map(Number);
      const nextDateStr = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
      result.push({
        ...entry,
        id: null,
        date: nextDateStr,
        startTime: '00:00',
        hours: (endMinutes - 24 * 60) / 60,
        _isMidnightContinuation: true,
      });
    }
  }
  return result;
}

export function baseClasses(fcEvent) {
  const entry = fcEvent.extendedProps?.timeEntry;
  if (!entry) return [];
  const breakTicket = resolveTicket(getCentralConfigSync(), 'breakTicket');
  const classes = [];
  if (breakTicket && Number(entry.issueId) === Number(breakTicket)) {
    classes.push('fc-event--break');
  }
  return classes;
}

/**
 * Pure tooltip-line builder. Given the ArbZG warnings shape and a YYYY-MM-DD
 * date string, returns the list of localized tooltip lines for that day.
 */
export function buildDayWarningLines(warnings, dateStr) {
  if (!warnings) return [];
  const lines = [];
  for (const warn of warnings.daily[dateStr] ?? []) {
    lines.push(t(warn.messageKey, { observed: warn.observed, allowed: warn.allowed }));
  }
  if (warnings.restPeriod[dateStr]) {
    const warn = warnings.restPeriod[dateStr];
    lines.push(t(warn.messageKey, { observed: warn.observed, allowed: warn.allowed }));
  }
  if (warnings.sunday.includes(dateStr)) lines.push(t('arbzg.sunday'));
  if (warnings.holiday[dateStr])
    lines.push(t('arbzg.holiday', { name: warnings.holiday[dateStr] }));
  for (const warn of warnings.breaks[dateStr] ?? []) {
    if (warn.rule === 'BREAK_INSUFFICIENT') {
      lines.push(t(warn.messageKey, { observed: warn.observed, required: warn.required }));
    } else {
      lines.push(t(warn.messageKey, { observed: warn.observed, allowed: warn.allowed }));
    }
  }
  return lines;
}

// ── FullCalendar event mapping ────────────────────────────────────
export function toFcEvent(entry) {
  // Entries without a clock time (Redmine `easy_time_from` missing) render
  // as all-day so the hours still surface in day totals.
  if (!entry.startTime) {
    const title = entry.issueSubject ?? t('entry.fallback_subject', { id: entry.issueId });
    return {
      id: entry.id ? String(entry.id) : undefined,
      title,
      start: entry.date,
      allDay: true,
      classNames: [],
      extendedProps: { timeEntry: entry },
    };
  }

  const [h, m] = entry.startTime.split(':').map(Number);
  const dateBase = entry.date + 'T';
  const start = dateBase + toHHMM(h * 60 + m);
  const startMin = h * 60 + m;
  // Feature 025: break entries are identified by ticket ID (centralCfg.breakTicket).
  // Saved hours may be 0 or 0.01 placeholder; display block uses easy_time_to.
  const breakTicket = resolveTicket(getCentralConfigSync(), 'breakTicket');
  const isBreakEntry = breakTicket && Number(entry.issueId) === Number(breakTicket);
  let totalEndMin;
  if (isBreakEntry && entry.endTime) {
    const [eh, em] = entry.endTime.split(':').map(Number);
    const realEnd = eh * 60 + em;
    totalEndMin = realEnd > startMin ? realEnd : startMin + 15;
  } else if (isBreakEntry) {
    totalEndMin = startMin + 15;
  } else {
    totalEndMin = startMin + Math.round(entry.hours * 60);
  }
  let end;
  if (totalEndMin >= 24 * 60) {
    const [y, mo, d] = entry.date.split('-').map(Number);
    const nextDay = new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
    end = nextDay + 'T' + toHHMM(totalEndMin - 24 * 60);
  } else {
    end = dateBase + toHHMM(totalEndMin);
  }

  const title = entry.issueSubject ?? t('entry.fallback_subject', { id: entry.issueId });
  const classNames = [];
  if (isBreakEntry) classNames.push('fc-event--break');

  return {
    id: entry.id ? String(entry.id) : undefined,
    title,
    start,
    end,
    classNames,
    extendedProps: { timeEntry: entry },
  };
}

// ── ArbZG tooltip rendering ───────────────────────────────────────
function positionArbzgTooltip(event) {
  const tooltip = document.getElementById('arbzg-tooltip');
  if (!tooltip) return;
  let x = event.clientX + 14;
  let y = event.clientY + 14;
  const tw = tooltip.offsetWidth || 340;
  const th = tooltip.offsetHeight || 60;
  if (x + tw > window.innerWidth) x = event.clientX - tw - 4;
  if (y + th > window.innerHeight) y = event.clientY - th - 4;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function showArbzgTooltip(event, dateStr) {
  const tooltip = document.getElementById('arbzg-tooltip');
  if (!tooltip) return;
  const lines = buildDayWarningLines(_arbzgWarnings, dateStr);
  if (!lines.length) return;
  tooltip.textContent = lines.join('\n');
  tooltip.classList.add('visible');
  positionArbzgTooltip(event);
}

function showArbzgWeekTooltip(event) {
  const tooltip = document.getElementById('arbzg-tooltip');
  if (!tooltip) return;
  const warnings = _arbzgWarnings?.weekly ?? [];
  const lines = warnings.map((w) => t(w.messageKey, { observed: w.observed, allowed: w.allowed }));
  if (!lines.length) return;
  tooltip.textContent = lines.join('\n');
  tooltip.classList.add('visible');
  positionArbzgTooltip(event);
}

function hideArbzgTooltip() {
  document.getElementById('arbzg-tooltip')?.classList.remove('visible');
}

// Installed once on the FullCalendar container — avoids per-badge listeners on
// DOM nodes that FullCalendar replaces on every render cycle.
function installDelegatedListeners(container) {
  container.addEventListener('mouseover', (e) => {
    const badge = e.target.closest('.arbzg-badge');
    if (!badge) return;
    if (badge.dataset.date) showArbzgTooltip(e, badge.dataset.date);
    else if (badge.dataset.week) showArbzgWeekTooltip(e);
  });
  container.addEventListener('mouseout', (e) => {
    const badge = e.target.closest('.arbzg-badge');
    if (badge && !badge.contains(e.relatedTarget)) hideArbzgTooltip();
  });
  container.addEventListener('click', (e) => {
    if (isMobileView() && e.target.closest('[data-mobile-nav]')) _calendar.today();
  });
}

// ── Totals (week + per-day) ───────────────────────────────────────
function updateWeekTotal(events) {
  const total = events.reduce((sum, ev) => {
    if (ev.extendedProps?.timeEntry?._isMidnightContinuation) return sum;
    return sum + (ev.extendedProps?.timeEntry?.hours ?? 0);
  }, 0);
  const el = document.getElementById('week-total');
  if (!el) return;
  el.textContent = '';

  // ArbZG weekly badge — prepended so it appears left of the total text
  if (_arbzgWarnings?.weekly?.length > 0) {
    const badge = document.createElement('span');
    badge.className = 'arbzg-badge';
    badge.textContent = '⚠';
    badge.dataset.week = 'true';
    el.appendChild(badge);
  }

  if (total > 0)
    el.appendChild(document.createTextNode(`${formatHours(total)}${t('calendar.total_suffix')}`));
}

function updateDayTotals(events) {
  // Stored in module state and read by the dayHeaderContent callback.
  _dayTotals = computeDailyTotals(events);

  // Compute ArbZG warnings from current week's entries
  const entries = events.map((ev) => ev.extendedProps?.timeEntry).filter(Boolean);
  const year = _calendar.view.currentStart.getFullYear();
  const arbzgCfg = getCentralConfigSync();
  try {
    _arbzgWarnings = computeArbzgWarnings(entries, year, {
      holidayTicket: arbzgCfg?.holidayTicket,
      vacationTicket: arbzgCfg?.vacationTicket,
    });
  } catch (e) {
    console.error('ArbZG computation failed:', e);
    _arbzgWarnings = {
      daily: {},
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    };
  }

  _calendar.render(); // triggers dayHeaderContent re-evaluation
  updateWeekTotal(events);
}

// Re-runs anomaly detection over `entries`, then re-attaches badges.
function redetectAnomalies(entries) {
  const cfg = getCentralConfigSync();
  const breakTicket = resolveTicket(cfg, 'breakTicket');
  const holidayTicket = resolveTicket(cfg, 'holidayTicket');
  _anomalies = detectAnomalies(entries, { breakTicket, holidayTicket }, t);
  reattachAnomalyBadges();
}

// Feature 029: re-derive the anomaly Map from currently-rendered FC events
// (no network), then re-attach/remove badges. Skips midnight continuations.
function recomputeAnomalies() {
  const seen = new Set();
  const entries = [];
  for (const ev of _calendar.getEvents()) {
    const entry = ev.extendedProps?.timeEntry;
    if (!entry || entry.id == null) continue;
    if (entry._isMidnightContinuation) continue;
    const key = String(entry.id);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }
  redetectAnomalies(entries);
}

// Removes every rendered anomaly badge + tooltip, then re-attaches a badge to
// each live DOM element from the current `_anomalies` map. Resolves elements via
// the fc-entry-<id> class (FC v6 may skip eventDidMount after a property change,
// leaving _eventElements stale). Also covers the initial loadWeekEntries path:
// there eventDidMount fires — with an as-yet-empty `_anomalies` — before
// updateOverlays has populated the map, so the badges must be attached here.
function reattachAnomalyBadges() {
  document
    .querySelectorAll('.fc-event__anomaly-badge, .anomaly-tooltip')
    .forEach((n) => n.remove());
  for (const [id, tag] of _anomalies) {
    document.querySelectorAll(`.fc-entry-${id}`).forEach((el) => {
      attachAnomalyBadge(el, tag, t, id);
    });
  }
}

// loadWeekEntries path: re-derive anomalies from the freshly mapped entries,
// then recompute totals + ArbZG warnings from the FC events.
function updateOverlays(fcEvents, mappedEntries) {
  if (mappedEntries) redetectAnomalies(mappedEntries);
  updateDayTotals(fcEvents);
}

// recomputeDayTotals path: refresh the anomaly map BEFORE calendar.render()
// (a remount firing eventDidMount during render reads `_anomalies`), then
// recompute totals from currently-rendered events.
function recompute() {
  const events = _calendar.getEvents().map((ev) => ({ extendedProps: ev.extendedProps }));
  recomputeAnomalies();
  updateDayTotals(events);
}

// ── FullCalendar rendering callbacks ──────────────────────────────
function dayHeaderContent(arg) {
  const d = arg.date;
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const total = _dayTotals?.[dateStr];
  const el = document.createElement('div');
  el.className = 'day-header-cell';
  const label = document.createElement('span');
  if (isMobileView()) {
    label.textContent = arg.text;
    el.style.cursor = 'pointer';
    el.dataset.mobileNav = 'true';
  } else {
    label.textContent = arg.text;
  }
  el.appendChild(label);
  // Right-side cell (column 3): optional ArbZG badge + day total
  const right = document.createElement('span');
  right.className = 'day-total';
  el.appendChild(right);

  // ArbZG daily badge — prepended so it appears left of the total text
  const w = _arbzgWarnings;
  if (w) {
    const hasWarning =
      w.daily[dateStr]?.length > 0 ||
      w.restPeriod[dateStr] ||
      w.sunday.includes(dateStr) ||
      w.holiday[dateStr] ||
      w.breaks[dateStr]?.length > 0;
    if (hasWarning) {
      const badge = document.createElement('span');
      badge.className = 'arbzg-badge';
      badge.textContent = '⚠';
      badge.dataset.date = dateStr;
      right.appendChild(badge);
    }
  }

  if (total) right.appendChild(document.createTextNode(formatHours(total)));

  return { domNodes: [el] };
}

function eventContent(arg) {
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
  const issueText = `#${entry.issueId ?? ''} ${entry.issueSubject ?? ''}`;
  const issueDiv = document.createElement('div');
  issueDiv.className = 'ev-issue';
  issueDiv.title = issueText;
  if (entry.issueId && cfg?.redmineServerUrl) {
    const a = document.createElement('a');
    a.href = `${cfg.redmineServerUrl}/issues/${entry.issueId}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = issueText;
    issueDiv.appendChild(a);
  } else {
    issueDiv.textContent = issueText;
  }
  wrapper.appendChild(issueDiv);

  // Line 2: project (with identifier if available)
  if (entry.projectName || entry.projectIdentifier) {
    const projText = formatProject(entry.projectIdentifier, entry.projectName);
    const projDiv = document.createElement('div');
    projDiv.className = 'ev-project';
    projDiv.textContent = projText;
    projDiv.title = projText;
    wrapper.appendChild(projDiv);
  }

  // Line 3: time range + duration (hidden on mobile)
  if (!isMobileView()) {
    const durationLabel = formatHours(entry.hours);
    line('ev-time', `${entry.startTime} – ${entry.endTime} (${durationLabel})`);
  }

  // Line 4: comment (hidden on mobile)
  if (entry.comment && !isMobileView()) line('ev-comment', entry.comment);

  return { domNodes: [wrapper] };
}

// Mirror the entry id onto a class so recomputeAnomalies can find the live
// DOM element even when FC v6 skips eventDidMount after a property change.
function eventClassNames(arg) {
  const id = arg.event.extendedProps?.timeEntry?.id;
  return id != null ? [`fc-entry-${id}`] : [];
}

function eventDidMount(info) {
  const entry = info.event.extendedProps?.timeEntry;
  if (!entry || entry.id == null) return;
  _eventElements.set(String(entry.id), info.el);
  const tag = _anomalies?.get(String(entry.id));
  if (!tag) return;
  attachAnomalyBadge(info.el, tag, t, entry.id);
}

function eventWillUnmount(info) {
  const entry = info.event.extendedProps?.timeEntry;
  if (!entry || entry.id == null) return;
  _eventElements.delete(String(entry.id));
}

// Stable callbacks object — spread into the FullCalendar config; each
// callback reads module-scope `_calendar` at call time (assigned afterwards).
const _calendarCallbacks = {
  dayHeaderContent,
  eventContent,
  eventClassNames,
  eventDidMount,
  eventWillUnmount,
};

/**
 * Stores the calendar instance (may be omitted on the pre-construction call)
 * and returns the overlay surface: `calendarCallbacks` (FC rendering hooks),
 * `updateOverlays` (loadWeekEntries path), `recompute` (recomputeDayTotals).
 */
export function attachOverlayHooks(calendar) {
  if (calendar) {
    _calendar = calendar;
    if (!_listenersWired) {
      installDelegatedListeners(calendar.el);
      _listenersWired = true;
    }
  }
  return {
    calendarCallbacks: _calendarCallbacks,
    updateOverlays,
    recompute,
  };
}
