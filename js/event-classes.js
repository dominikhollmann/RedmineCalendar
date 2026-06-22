// Leaf module — CSS class helpers for FullCalendar events.
// Kept separate from calendar-overlays.js so that entry-selection.js can
// import baseClasses without pulling in calendar-overlays.js's heavy closure.
import { getCentralConfigSync, resolveConfigTicket } from './config-store.js';

/**
 * Returns the base CSS class list for a FullCalendar event, derived from the
 * time entry it wraps.
 * @param {object} fcEvent
 * @returns {string[]}
 */
export function baseClasses(fcEvent) {
  const entry = fcEvent.extendedProps?.timeEntry;
  if (!entry) return [];
  const breakTicket = resolveConfigTicket(getCentralConfigSync(), 'breakTicket');
  const classes = [];
  if (breakTicket && Number(entry.issueId) === Number(breakTicket)) {
    classes.push('fc-event--break');
  }
  return classes;
}
