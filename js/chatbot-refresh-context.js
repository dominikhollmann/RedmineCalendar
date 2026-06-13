// Narrow-interface registry for the chatbot calendar-refresh callback.
// calendar.js imports this module (closure=1) instead of chatbot-tools.js,
// breaking the heavy transitive pull. chatbot-tools.js reads the callback
// here at tool-call time via getCalendarRefreshCallback().

/** @type {(()=>void)|null} */
let _cb = null;

/**
 * Register the callback that refreshes the calendar after a tool mutates data.
 * Called by calendar.js after the FullCalendar instance is ready.
 * @param {(()=>void)|null} cb
 */
export function setCalendarRefreshCallback(cb) {
  _cb = cb;
}

/**
 * Returns the registered refresh callback, or null if none has been set.
 * @returns {(()=>void)|null}
 */
export function getCalendarRefreshCallback() {
  return _cb;
}
