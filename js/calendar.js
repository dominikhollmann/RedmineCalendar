// @ts-nocheck — DOM-heavy module; runtime checks suffice. Tag pure helpers per-export with /** @type */ when they grow.
// ── Module imports ────────────────────────────────────────────────
import { loadCentralConfig, readCredentials, getCentralConfigSync } from './config-store.js';
import { showPlanningView, setCalendarRef } from './planning-view.js';
import { setCalendarRefreshCallback } from './chatbot-tools.js';
import { t, locale } from './i18n.js';
import {
  fetchTimeEntries,
  enrichEntry,
  enrichEntries,
  mapTimeEntry,
  updateTimeEntry,
  loadCredentials,
} from './redmine-api.js';
import { SLOT_DURATION, SNAP_DURATION } from './config.js';
import { openForm } from './time-entry-form.js';
import { showToast } from './notify.js';
import {
  installToolbarButtons,
  installMobileNavigation,
  getInitialHiddenDays,
  getEffectiveTimeRange,
  updateIndicators,
  updateMobileDate,
  getSuppressSelectFlag,
  isMobileView,
} from './calendar-toolbar.js';
import { attachOverlayHooks, toFcEvent, splitMidnightEntries } from './calendar-overlays.js';
import { selectEntry, deselectAll } from './entry-selection.js';
import { activate as activateCommands } from './entry-commands.js';

// Re-export showToast + toFcEvent so existing consumers/tests importing them
// from './calendar.js' keep working after the notify.js + 035 extractions.
export { showToast } from './notify.js';
export { toFcEvent } from './calendar-overlays.js';

// ── Bootstrap ─────────────────────────────────────────────────────
try {
  await loadCentralConfig();
  // Feature 031: apply admin-managed corporate-identity overlay (no-op when unset)
  const { applyCorporateIdentity } = await import('./branding.js');
  applyCorporateIdentity(document.documentElement, getCentralConfigSync() ?? {});
  const creds = await readCredentials();
  if (!creds) {
    window.location.href = 'settings.html';
  } else {
    await loadCredentials();
  }
} catch {
  window.location.href = 'settings.html';
}

// ── Module state + DOM refs ───────────────────────────────────────
const calendarEl = document.getElementById('calendar');
const loadingOverlay = document.getElementById('loading-overlay');
const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const errorRetry = document.getElementById('error-retry');
const errorDismiss = document.getElementById('error-dismiss');
const errorSettingsLink = document.getElementById('error-settings-link');

let calendar; // FullCalendar instance
let overlayHooks; // surface returned by attachOverlayHooks
let _lastStart = null; // last fetched week start (for retry)
let _lastEnd = null;
const _suppressSelect = getSuppressSelectFlag(); // shared flag with overflow indicators
// Double-click detection state
let _lastClickId = null; // event id of last eventClick
let _lastClickTime = 0;
let _clipboard = null; // copied entry payload | null

// ── Error banner ──────────────────────────────────────────────────
function showError(message, retryFn, { showSettingsLink = false } = {}) {
  errorMessage.textContent = message;
  errorSettingsLink.classList.toggle('hidden', !showSettingsLink);
  errorBanner.classList.remove('hidden');
  errorRetry.onclick = () => {
    errorBanner.classList.add('hidden');
    retryFn?.();
  };
}

function hideError() {
  errorBanner.classList.add('hidden');
  errorSettingsLink.classList.add('hidden');
}

// ── Loading overlay ───────────────────────────────────────────────
function setLoading(on) {
  loadingOverlay.classList.toggle('hidden', !on);
  if (calendar) calendar.setOption('selectable', !on);
}

// ── Data loading ──────────────────────────────────────────────────
async function loadWeekEntries(startDate, endDate) {
  _lastStart = startDate;
  _lastEnd = endDate;
  setLoading(true);
  hideError();

  try {
    const rawEntries = await fetchTimeEntries(startDate, endDate);
    const mapped = rawEntries.map(mapTimeEntry).filter(Boolean);

    await enrichEntries(mapped);

    const split = splitMidnightEntries(mapped);
    const fcEvents = split.map(toFcEvent);

    calendar.removeAllEvents();
    fcEvents.forEach((ev) => calendar.addEvent(ev));
    overlayHooks.updateOverlays(fcEvents, mapped);
    updateIndicators(mapped);
  } catch (err) {
    const isConfigError =
      err.status === 0 || err.status === 401 || err.status === 404 || err.status === 503;
    showError(
      isConfigError ? `${err.message}${t('calendar.check_settings_suffix')}` : err.message,
      () => loadWeekEntries(startDate, endDate),
      { showSettingsLink: isConfigError }
    );
  } finally {
    setLoading(false);
  }
}

/**
 * Recomputes day totals + ArbZG warnings + anomalies from the currently
 * rendered FC events. Delegates to the overlays module.
 */
export function recomputeDayTotals() {
  overlayHooks.recompute();
}

/**
 * Returns the current FullCalendar view state for feedback context collection.
 * @returns {{ view: string, start: string, end: string } | null}
 */
export function getCalendarViewState() {
  if (!calendar) return null;
  return {
    view: calendar.view.type,
    start: calendar.view.activeStart.toISOString().slice(0, 10),
    end: calendar.view.activeEnd.toISOString().slice(0, 10),
  };
}

// ── Clipboard banner ──────────────────────────────────────────────
function copyToClipboard(entry) {
  _clipboard = {
    issueId: entry.issueId,
    issueSubject: entry.issueSubject,
    projectName: entry.projectName,
    activityId: entry.activityId,
    hours: entry.hours,
    comment: entry.comment,
    startTime: entry.startTime,
  };
  deselectAll();
  document.getElementById('clipboard-banner-text').textContent = t('calendar.clipboard_banner', {
    id: String(entry.issueId),
    subject: entry.issueSubject ?? '',
  });
  document.getElementById('clipboard-banner').classList.remove('hidden');
}

function clearClipboard() {
  _clipboard = null;
  document.getElementById('clipboard-banner').classList.add('hidden');
}

// ── Edit/update callbacks (shared by eventClick + keydown) ────────
async function applyUpdatedEntry(updatedEntry) {
  await enrichEntry(updatedEntry);
  const ev = calendar.getEventById(String(updatedEntry.id));
  if (ev) {
    const updated = toFcEvent(updatedEntry);
    ev.setProp('title', updated.title);
    ev.setProp('classNames', updated.classNames);
    ev.setStart(updated.start);
    ev.setEnd(updated.end);
    ev.setExtendedProp('timeEntry', updatedEntry);
  }
  recomputeDayTotals();
  showToast(t('calendar.entry_updated'));
}

function handleEntryDeleted(deletedId) {
  const ev = calendar.getEventById(String(deletedId));
  if (ev) ev.remove();
  recomputeDayTotals();
  showToast(t('calendar.entry_deleted'));
}

function openEditForm(entry) {
  openForm(entry, {}, applyUpdatedEntry, handleEntryDeleted);
}

// ── FullCalendar config + handlers ────────────────────────────────
const _initialRange = getEffectiveTimeRange();

// Grab the overlay rendering callbacks before construction; attachOverlayHooks
// is called again below with the live instance (callbacks object is stable).
overlayHooks = attachOverlayHooks();

calendar = new FullCalendar.Calendar(calendarEl, {
  locale: locale,
  slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  initialView: isMobileView() ? 'timeGridDay' : 'timeGridWeek',
  dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric' },
  firstDay: 1, // Monday
  slotDuration: SLOT_DURATION,
  snapDuration: SNAP_DURATION,
  slotMinTime: _initialRange.slotMinTime,
  slotMaxTime: _initialRange.slotMaxTime,
  allDaySlot: false,
  selectable: true,
  selectLongPressDelay: 300,
  selectAllow: (span) => span.start.toDateString() === new Date(span.end - 1).toDateString(),
  editable: true,
  eventMinHeight: 20,
  hiddenDays: getInitialHiddenDays(),
  headerToolbar: false,

  // ── Overlay rendering callbacks (dayHeaderContent, eventContent, …) ──
  ...overlayHooks.calendarCallbacks,

  // ── Week navigation → load entries ───────────────────────────
  datesSet(info) {
    const start = info.startStr.slice(0, 10);
    const end = info.endStr.slice(0, 10);
    loadWeekEntries(start, end);
    updateMobileDate(info);
    const titleEl = document.getElementById('toolbar-title');
    if (titleEl) titleEl.textContent = info.view.title;
  },

  // ── Tap on empty slot (mobile) ─────────────────────────────────
  dateClick(info) {
    if (!isMobileView()) return;
    deselectAll();
    const date = info.dateStr.slice(0, 10);
    const time = info.dateStr.slice(11, 16) || null;
    const hours = 0.25;
    // Compute end time inline so the prefill carries both startTime + endTime.
    let endTime = null;
    if (time) {
      const [h, m] = time.split(':').map(Number);
      const total = h * 60 + m + Math.round(hours * 60);
      endTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
    const prefill = _clipboard
      ? { date, ..._clipboard, startTime: time, endTime, hours }
      : { date, startTime: time, endTime, hours };
    openForm(null, prefill, async (newEntry) => {
      await enrichEntry(newEntry);
      calendar.addEvent(toFcEvent(newEntry));
      recomputeDayTotals();
      showToast(t('calendar.entry_saved'));
    });
  },

  // ── Create entry by click / drag on empty slot ────────────────
  select(info) {
    if (_suppressSelect.value) {
      _suppressSelect.value = false;
      calendar.unselect();
      return;
    }
    deselectAll();

    const startStr = info.startStr;
    const endStr = info.endStr;
    const durationHours = (new Date(endStr) - new Date(startStr)) / 3600000;
    const date = startStr.slice(0, 10);
    const time = startStr.slice(11, 16) || null;
    const endTime = endStr.slice(11, 16) || null;

    const prefill = _clipboard
      ? { date, ..._clipboard, startTime: time, endTime, hours: durationHours }
      : { date, startTime: time, endTime, hours: durationHours };

    openForm(null, prefill, async (newEntry) => {
      await enrichEntry(newEntry);
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

    const now = Date.now();
    const isDouble = _lastClickId === info.event.id && now - _lastClickTime < 300;
    _lastClickId = info.event.id;
    _lastClickTime = now;

    if (isDouble || isMobileView()) {
      deselectAll();
      openEditForm(entry);
    } else {
      selectEntry(info.event, info.jsEvent?.shiftKey);
    }
  },

  // ── Drag-to-move ──────────────────────────────────────────────
  async eventDrop(info) {
    const entry = info.event.extendedProps?.timeEntry;
    if (!entry || !entry.id) {
      info.revert();
      return;
    }

    const newStart = info.event.start;
    const newEnd = info.event.end;
    const newDate = `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, '0')}-${String(newStart.getDate()).padStart(2, '0')}`;
    const newTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
    const newEndTime = newEnd
      ? `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`
      : entry.endTime;

    try {
      await updateTimeEntry(entry.id, {
        hours: entry.hours,
        activityId: entry.activityId,
        comment: entry.comment,
        startTime: newTime,
        spentOn: newDate,
      });
      info.event.setExtendedProp('timeEntry', {
        ...entry,
        startTime: newTime,
        endTime: newEndTime,
        date: newDate,
      });
      recomputeDayTotals();
    } catch (err) {
      info.revert();
      showError(t('calendar.move_failed', { message: err.message }), null);
    }
  },

  // ── Drag-to-resize (bottom edge) ─────────────────────────────
  eventResizableFromStart: true,

  async eventResize(info) {
    const entry = info.event.extendedProps?.timeEntry;
    if (!entry || !entry.id) {
      info.revert();
      return;
    }

    const newEnd = info.event.end;
    const newStart = info.event.start;
    const newHours = (newEnd - newStart) / 3600000;
    const newStartTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
    const newEndTime = `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`;
    const newDate = newStart.toISOString().slice(0, 10);

    try {
      await updateTimeEntry(entry.id, {
        hours: newHours,
        activityId: entry.activityId,
        comment: entry.comment,
        startTime: newStartTime,
        spentOn: newDate,
      });
      info.event.setExtendedProp('timeEntry', {
        ...entry,
        hours: newHours,
        startTime: newStartTime,
        endTime: newEndTime,
        date: newDate,
      });
      recomputeDayTotals();
    } catch (err) {
      info.revert();
      showError(t('calendar.resize_failed', { message: err.message }), null);
    }
  },
});

// Hand the live calendar instance to the overlays module now that it exists.
overlayHooks = attachOverlayHooks(calendar);

// ── Init wiring (DOM listeners + chatbot refresh hook) ────────────
calendar.render();
installToolbarButtons(calendar);
installMobileNavigation(calendarEl, calendar);

errorDismiss.addEventListener('click', hideError);

document.getElementById('clipboard-banner-clear').addEventListener('click', clearClipboard);

activateCommands({
  onAfterDelete: recomputeDayTotals,
  onDeleteError: (msg) => showError(msg, null),
  onEdit: (entry) => openEditForm(entry),
  onCopy: (entry) => copyToClipboard(entry),
});

errorRetry.addEventListener('click', () => {
  if (_lastStart && _lastEnd) loadWeekEntries(_lastStart, _lastEnd);
});

setCalendarRefreshCallback(() => {
  if (_lastStart && _lastEnd) loadWeekEntries(_lastStart, _lastEnd);
});

// Wire Planning View: double-click on day column headers (FR-003)
calendarEl.addEventListener('dblclick', (e) => {
  const cell = e.target.closest('.fc-col-header-cell[data-date]');
  if (!cell) return;
  showPlanningView(cell.dataset.date);
});

// Give Planning View a reference to this calendar for state-restore on toggle-back
setCalendarRef(calendar);
