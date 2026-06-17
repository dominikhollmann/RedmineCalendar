// @ts-nocheck
import { baseClasses } from './event-classes.js';

/** @type {Map<string, object>} id → FullCalendar event for all selected events */
const _selected = new Map();
/** @type {object|null} Anchor event (last non-shift click) — for Enter/Copy */
let _anchor = null;
/** @type {Function|null} Called on active user selection (not on programmatic deselectAll). */
let _onSelectionChange = null;

/**
 * Register a callback that fires whenever the user actively selects a booking.
 * Used by the Planning View to clear its own selection when Bookings gets focus.
 * NOT called by deselectAll (to avoid infinite loops).
 * @param {Function|null} fn
 */
export function onSelectionChange(fn) {
  _onSelectionChange = fn;
}

/**
 * Select an FC time-entry event.
 * Single-click replaces the whole selection; shift-click toggles membership.
 * @param {object} fcEvent  FullCalendar event object
 * @param {boolean} [multi]  true for shift+click
 */
export function selectEntry(fcEvent, multi = false) {
  _onSelectionChange?.();
  if (!multi) {
    _selected.forEach((ev) => ev.setProp('classNames', baseClasses(ev)));
    _selected.clear();
    _anchor = fcEvent;
    _selected.set(fcEvent.id, fcEvent);
    fcEvent.setProp('classNames', [...baseClasses(fcEvent), 'fc-event--selected']);
    return;
  }
  if (_selected.has(fcEvent.id)) {
    fcEvent.setProp('classNames', baseClasses(fcEvent));
    _selected.delete(fcEvent.id);
    if (_anchor?.id === fcEvent.id) _anchor = null;
  } else {
    _selected.set(fcEvent.id, fcEvent);
    fcEvent.setProp('classNames', [...baseClasses(fcEvent), 'fc-event--selected']);
  }
}

/**
 * Clear the entire selection, resetting CSS on every selected event.
 */
export function deselectAll() {
  if (_anchor === null && _selected.size === 0) return;
  _selected.forEach((ev) => ev.setProp('classNames', baseClasses(ev)));
  _selected.clear();
  _anchor = null;
}

/**
 * All currently selected FC events.
 * @returns {object[]}
 */
export function getSelected() {
  return [..._selected.values()];
}

/**
 * The anchor event (last non-shift click). Used for Enter (edit) and Ctrl+C (copy).
 * @returns {object|null}
 */
export function getAnchor() {
  return _anchor;
}

/**
 * Whether at least one event is selected.
 * @returns {boolean}
 */
export function hasSelected() {
  return _selected.size > 0;
}
