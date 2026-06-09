// @ts-nocheck — DOM-heavy module; public exports are JSDoc-typed.

/** @typedef {import('./types').TimeEntry} TimeEntry */

import {
  fetchTimeEntries,
  mapTimeEntry,
  enrichEntries,
  deleteTimeEntry,
  updateTimeEntry,
} from './redmine-api.js';
import { getEffectiveTimeRange } from './calendar-toolbar.js';
import { attachOverlayHooks, toFcEvent, splitMidnightEntries } from './calendar-overlays.js';
import { openForm, showDeleteConfirm } from './time-entry-form.js';

// ── Constants ─────────────────────────────────────────────────────
const DBLCLICK_MS = 400;

// ── Per-instance click state (used for dblclick detection) ────────
let _lastClickId = null;
let _lastClickTime = 0;

// ── Event handlers extracted to keep initBookingsCalendar ≤ 60 LOC ─

function _onSelect(info, getCalendar, overlayHooks, onBookingChange) {
  const prefill = {
    date: info.startStr.slice(0, 10),
    startTime: info.startStr.slice(11, 16),
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
  if (!doubleClick) return;
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
      showDeleteConfirm(() => {
        deleteTimeEntry(entry.id)
          .then(() => {
            info.event.remove();
            overlayHooks.recompute();
            onBookingChange?.();
          })
          .catch(() => {});
      });
    }
  );
}

function _onEventDrop(info, overlayHooks, onBookingChange) {
  const entry = info.event.extendedProps?.timeEntry;
  if (!entry) return;
  updateTimeEntry(entry.id, {
    spentOn: info.event.startStr.slice(0, 10),
    startTime: info.event.startStr.slice(11, 16),
    endTime: info.event.endStr.slice(11, 16),
    hours: (info.event.end - info.event.start) / 3_600_000,
  })
    .then(() => {
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
  updateTimeEntry(entry.id, {
    endTime: info.event.endStr.slice(11, 16),
    hours: (info.event.end - info.event.start) / 3_600_000,
  })
    .then(() => {
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
  const { slotMinTime, slotMaxTime } = getEffectiveTimeRange();
  const overlayHooks = attachOverlayHooks(null);

  // Capture the calendar in a closure for callbacks that need it; the reference
  // is set immediately after construction, before any user interaction can fire.
  let cal;
  const getCalendar = () => cal;

  cal = new FullCalendar.Calendar(container, {
    initialView: 'timeGridDay',
    headerToolbar: false,
    contentHeight: 'auto',
    initialDate: date,
    slotMinTime,
    slotMaxTime,
    hiddenDays: [],
    allDaySlot: false,
    selectable: true,
    editable: true,
    height: 'auto',
    ...overlayHooks.calendarCallbacks,
    select: (info) => _onSelect(info, getCalendar, overlayHooks, onBookingChange),
    eventClick: (info) => _onEventClick(info, getCalendar, overlayHooks, onBookingChange),
    eventDrop: (info) => _onEventDrop(info, overlayHooks, onBookingChange),
    eventResize: (info) => _onEventResize(info, overlayHooks, onBookingChange),
  });

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
  const rawEntries = await fetchTimeEntries(date, date);
  const mapped = rawEntries.map(mapTimeEntry).filter(Boolean);
  await enrichEntries(mapped);
  const split = splitMidnightEntries(mapped);
  calendar.removeAllEvents();
  split.forEach((entry) => calendar.addEvent(toFcEvent(entry)));
  attachOverlayHooks(null).recompute();
  return mapped;
}

/**
 * Destroy the FullCalendar instance.
 * @param {object} calendar
 */
export function destroyBookingsCalendar(calendar) {
  calendar.destroy();
}
