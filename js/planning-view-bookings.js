// @ts-nocheck — DOM-heavy module; public exports are JSDoc-typed.

/** @typedef {import('./types').TimeEntry} TimeEntry */

import {
  fetchTimeEntries,
  mapTimeEntry,
  enrichEntries,
  enrichEntry,
  updateTimeEntry,
} from './redmine-api.js';
import { formatDuration } from './time-entry-form-utils.js';
import { createTimegridColumn } from './calendar-config.js';
import {
  attachOverlayHooks,
  toFcEvent,
  splitMidnightEntries,
  recomputeAnomaliesOnly,
  applyUndoHighlight,
} from './calendar-overlays.js';
import { selectEntry, deselectAll } from './entry-selection.js';
import { openForm } from './time-entry-form.js';
import { getClipboard } from './clipboard.js';
import { runDropGuards } from './booking-guard.js';
import { getCentralConfigSync } from './config-store.js';
import { getSuppressSelectFlag } from './calendar-toolbar.js';
import { DBLCLICK_MS } from './config.js';

// ── Per-instance click state (used for dblclick detection) ────────
let _lastClickId = null;
let _lastClickTime = 0;

// ── Active bookings calendar reference for undo:* listeners ──────
let _activeCal = null;

// ── Event handlers extracted to keep initBookingsCalendar ≤ 60 LOC ─

const _suppressSelect = getSuppressSelectFlag();

function _onSelect(info, getCalendar, overlayHooks, onBookingChange) {
  if (_suppressSelect.value) {
    _suppressSelect.value = false;
    getCalendar().unselect();
    return;
  }
  const date = info.startStr.slice(0, 10);
  const startTime = info.startStr.slice(11, 16) || null;
  const endTime = info.endStr.slice(11, 16) || null;
  const hours = (info.end - info.start) / 3_600_000;
  const clip = getClipboard();
  const wasPaste = clip !== null;
  const prefill = clip
    ? { date, ...clip, startTime, endTime, hours }
    : { date, startTime, endTime, hours };
  openForm(null, prefill, async (saved) => {
    if (saved) {
      getCalendar().addEvent(toFcEvent(saved));
      overlayHooks.recompute();
      onBookingChange?.();
      if (wasPaste) {
        document.dispatchEvent(new CustomEvent('undo:replacetop', { detail: { type: 'paste' } }));
      }
    }
  });
  getCalendar().unselect();
}

function _onEventClick(info, getCalendar, overlayHooks, onBookingChange) {
  const entry = info.event.extendedProps?.timeEntry;
  if (!entry) return;
  const now = Date.now();
  const sameId = _lastClickId === info.event.id;
  const doubleClick = sameId && now - _lastClickTime < DBLCLICK_MS;
  _lastClickId = info.event.id;
  _lastClickTime = now;
  if (doubleClick) {
    openForm(
      entry,
      {},
      async (updated) => {
        if (updated) {
          info.event.remove();
          getCalendar().addEvent(toFcEvent(updated));
          overlayHooks.recompute();
          onBookingChange?.();
        }
      },
      () => {
        info.event.remove();
        overlayHooks.recompute();
        onBookingChange?.();
      }
    );
    return;
  }
  selectEntry(info.event, info.jsEvent?.shiftKey);
}

async function _rescheduleEntry(info, eventType, overlayHooks, onBookingChange) {
  const entry = info.event.extendedProps?.timeEntry;
  if (!entry) return;
  const newDate = info.event.startStr.slice(0, 10);
  const newTime = info.event.startStr.slice(11, 16);
  const origDate = entry.date ?? entry.spentOn;
  if (
    !(await runDropGuards(
      origDate,
      entry.startTime,
      newDate,
      newTime,
      entry.issueId,
      getCentralConfigSync()
    ))
  ) {
    info.revert();
    return;
  }
  const before = {
    issueId: entry.issueId,
    spentOn: origDate,
    hours: entry.hours,
    activityId: entry.activityId,
    comment: entry.comment,
    startTime: entry.startTime,
  };
  const after = {
    issueId: entry.issueId,
    spentOn: newDate,
    startTime: newTime,
    hours: (info.event.end - info.event.start) / 3_600_000,
    activityId: entry.activityId,
    comment: entry.comment,
  };
  updateTimeEntry(entry.id, after)
    .then(() => {
      document.dispatchEvent(
        new CustomEvent('undo:push', { detail: { type: eventType, id: entry.id, before, after } })
      );
      overlayHooks.recompute();
      onBookingChange?.();
    })
    .catch(() => {
      info.revert();
    });
}

// ── Bookings total display ────────────────────────────────────────

/** @param {import('./types').TimeEntry[]} bookings */
export function updateBookingsTotal(bookings) {
  const el = document.getElementById('planning-bookings-total');
  if (!el) return;
  const total = bookings.reduce((s, b) => s + (b.hours ?? 0), 0);
  el.textContent = total ? formatDuration(total) : '';
  el.hidden = !total;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Create and mount a FullCalendar timeGridDay instance.
 * @param {HTMLElement} container
 * @param {string} date  YYYY-MM-DD
 * @param {() => void} onBookingChange  Called after any create/update/delete
 * @returns {object}  FullCalendar.Calendar instance
 */
export function initBookingsCalendar(container, date, onBookingChange) {
  const overlayHooks = attachOverlayHooks(null);

  // Capture the calendar in a closure for callbacks that need it; the reference
  // is set immediately after construction, before any user interaction can fire.
  let cal;
  const getCalendar = () => cal;

  const instance = createTimegridColumn(container, {
    view: 'timeGridDay',
    date,
    mode: 'interactive',
    callbacks: {
      ...overlayHooks.calendarCallbacks,
      select: (info) => _onSelect(info, getCalendar, overlayHooks, onBookingChange),
      eventClick: (info) => _onEventClick(info, getCalendar, overlayHooks, onBookingChange),
      eventDrop: (info) => _rescheduleEntry(info, 'move', overlayHooks, onBookingChange),
      eventResize: (info) => _rescheduleEntry(info, 'resize', overlayHooks, onBookingChange),
    },
  });
  cal = instance.cal;

  _activeCal = cal;
  attachOverlayHooks(cal);
  return cal;
}

/**
 * Load Redmine time entries for date into the bookings calendar.
 * @param {object} calendar  FullCalendar instance
 * @param {string} date  YYYY-MM-DD
 * @returns {Promise<TimeEntry[]>}
 */
export async function loadBookingsForDay(calendar, date) {
  deselectAll();
  const rawEntries = await fetchTimeEntries(date, date);
  const mapped = rawEntries.map(mapTimeEntry).filter(Boolean);
  await enrichEntries(mapped);
  const split = splitMidnightEntries(mapped);
  calendar.removeAllEvents();
  split.forEach((entry) => calendar.addEvent(toFcEvent(entry)));
  recomputeAnomaliesOnly();
  return mapped;
}

/**
 * Destroy the FullCalendar instance.
 * @param {object} calendar
 */
export function destroyBookingsCalendar(calendar) {
  _activeCal = null;
  calendar.destroy();
}

// ── Undo / redo DOM event listeners (planning bookings calendar) ──

document.addEventListener('undo:navigate', ({ detail }) => {
  if (!_activeCal) return;
  const target = new Date(detail.date + 'T00:00:00');
  const { activeStart, activeEnd } = _activeCal.view;
  if (target < activeStart || target >= activeEnd) {
    _activeCal.gotoDate(detail.date);
  }
});

document.addEventListener('undo:preAnimate', ({ detail }) => {
  if (!_activeCal) return;
  const fcEvent = _activeCal.getEventById(detail.entryId);
  if (!fcEvent) return;
  if (detail.animationType === 'fade-delete') {
    fcEvent.setProp('classNames', [...(fcEvent.classNames ?? []), 'fc-event--undo-add-fade']);
  } else {
    applyUndoHighlight(fcEvent);
  }
});

document.addEventListener('undo:eventChanged', async ({ detail }) => {
  if (!_activeCal) return;
  const fcEvent = _activeCal.getEventById(detail.entryId);
  if (!fcEvent) return;
  await enrichEntry(detail.updatedEntry);
  const updated = toFcEvent(detail.updatedEntry);
  fcEvent.setProp('title', updated.title);
  fcEvent.setStart(updated.start);
  fcEvent.setEnd(updated.end);
  fcEvent.setExtendedProp('timeEntry', detail.updatedEntry);
  applyUndoHighlight(fcEvent);
});

document.addEventListener('undo:eventDeleted', ({ detail }) => {
  if (!_activeCal) return;
  const fcEvent = _activeCal.getEventById(detail.entryId);
  if (fcEvent) fcEvent.remove();
});

document.addEventListener('undo:eventAdded', ({ detail }) => {
  if (!_activeCal) return;
  const cal = _activeCal;
  enrichEntry(detail.entry).then(() => {
    const fcEvent = cal?.addEvent(toFcEvent(detail.entry));
    if (fcEvent) {
      requestAnimationFrame(() => applyUndoHighlight(fcEvent));
    }
  });
});
