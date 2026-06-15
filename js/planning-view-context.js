// Narrow-interface registry for planning-view.js.
// calendar.js imports this module (closure=1) instead of planning-view.js
// directly, breaking the heavy transitive pull. planning-view.js self-registers
// at module-eval time via registerPlanningView().

let _show = null;
let _setRef = null;
let _isActive = null;
let _refresh = null;

/**
 * Called once by planning-view.js when its module is evaluated.
 * @param {{ show: Function, setRef: Function, isActive: Function, refresh: Function }} fns
 */
export function registerPlanningView(fns) {
  _show = fns.show;
  _setRef = fns.setRef;
  _isActive = fns.isActive;
  _refresh = fns.refresh;
}

/**
 * Show the planning view for an optional YYYY-MM-DD date.
 * @param {string} [date]
 */
export function showPlanningView(date) {
  _show?.(date);
}

/**
 * Provide the FullCalendar instance to the planning view.
 * @param {object} cal
 */
export function setCalendarRef(cal) {
  _setRef?.(cal);
}

/** Whether the planning view is currently active. */
export function isPlanningViewActive() {
  return _isActive?.() ?? false;
}

/** Refresh the planning-view bookings list (no-op if not registered). */
export function refreshPlanningView() {
  _refresh?.();
}
