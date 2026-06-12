// @ts-nocheck — DOM-heavy module; public exports are JSDoc-typed.

/** @typedef {import('./types').TimeEntry} TimeEntry */

import {
  fetchTimeEntries,
  mapTimeEntry,
  enrichEntries,
  enrichEntry,
  updateTimeEntry,
} from './redmine-api.js';
import { sharedTimeGridOptions } from './calendar-config.js';
import { attachOverlayHooks, toFcEvent, splitMidnightEntries } from './calendar-overlays.js';
import { selectEntry, deselectAll } from './entry-selection.js';
import { openForm } from './time-entry-form.js';

// ── Constants ─────────────────────────────────────────────────────
const DBLCLICK_MS = 400;

// ── Per-instance click state (used for dblclick detection) ────────
let _lastClickId = null;
let _lastClickTime = 0;

// ── Active bookings calendar reference for undo:* listeners ──────
let _activeCal = null;

// ── Event handlers extracted to keep initBookingsCalendar ≤ 60 LOC ─

function _onSelect(info, getCalendar, overlayHooks, onBookingChange) {
  const prefill = {
    date: info.startStr.slice(0, 10),
    startTime: info.startStr.slice(11, 16) || null,
    endTime: info.endStr.slice(11, 16) || null,
    hours: (info.end - info.start) / 3_600_000,
  };
  openForm(null, prefill, async (saved) => {
    if (saved) {
      getCalendar().addEvent(toFcEvent(saved));
      overlayHooks.recompute();
      onBookingChange?.();
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

function _onEventDrop(info, overlayHooks, onBookingChange) {
  const entry = info.event.extendedProps?.timeEntry;
  if (!entry) return;
  const before = {
    issueId: entry.issueId,
    spentOn: entry.date ?? entry.spentOn,
    hours: entry.hours,
    activityId: entry.activityId,
    comment: entry.comment,
    startTime: entry.startTime,
  };
  const after = {
    issueId: entry.issueId,
    spentOn: info.event.startStr.slice(0, 10),
    startTime: info.event.startStr.slice(11, 16),
    hours: (info.event.end - info.event.start) / 3_600_000,
    activityId: entry.activityId,
    comment: entry.comment,
  };
  updateTimeEntry(entry.id, after)
    .then(() => {
      document.dispatchEvent(
        new CustomEvent('undo:push', { detail: { type: 'move', id: entry.id, before, after } })
      );
      overlayHooks.recompute();
      onBookingChange?.();
    })
    .catch(() => {
      info.revert();
    });
}

function _onEventResize(info, overlayHooks, onBookingChange) {
  const entry = info.event.extendedProps?.timeEntry;
  if (!entry) return;
  const before = {
    issueId: entry.issueId,
    spentOn: entry.date ?? entry.spentOn,
    hours: entry.hours,
    activityId: entry.activityId,
    comment: entry.comment,
    startTime: entry.startTime,
  };
  const after = {
    issueId: entry.issueId,
    spentOn: info.event.startStr.slice(0, 10),
    startTime: info.event.startStr.slice(11, 16),
    hours: (info.event.end - info.event.start) / 3_600_000,
    activityId: entry.activityId,
    comment: entry.comment,
  };
  updateTimeEntry(entry.id, after)
    .then(() => {
      document.dispatchEvent(
        new CustomEvent('undo:push', { detail: { type: 'resize', id: entry.id, before, after } })
      );
      overlayHooks.recompute();
      onBookingChange?.();
    })
    .catch(() => {
      info.revert();
    });
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

  cal = new FullCalendar.Calendar(container, {
    ...sharedTimeGridOptions(),
    initialView: 'timeGridDay',
    contentHeight: 'auto',
    initialDate: date,
    hiddenDays: [],
    height: 'auto',
    ...overlayHooks.calendarCallbacks,
    select: (info) => _onSelect(info, getCalendar, overlayHooks, onBookingChange),
    eventClick: (info) => _onEventClick(info, getCalendar, overlayHooks, onBookingChange),
    eventDrop: (info) => _onEventDrop(info, overlayHooks, onBookingChange),
    eventResize: (info) => _onEventResize(info, overlayHooks, onBookingChange),
  });

  _activeCal = cal;
  attachOverlayHooks(cal);
  cal.render();
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
  attachOverlayHooks(calendar).recompute();
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
  const cls =
    detail.animationType === 'fade-delete' ? 'fc-event--undo-add-fade' : 'fc-event--undo-highlight';
  fcEvent.setProp('classNames', [...(fcEvent.classNames ?? []), cls]);
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
  fcEvent.setProp('classNames', [...(updated.classNames ?? []), 'fc-event--undo-highlight']);
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
      fcEvent.setProp('classNames', [...(fcEvent.classNames ?? []), 'fc-event--undo-highlight']);
    }
  });
});
