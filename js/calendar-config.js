// @ts-nocheck
import { SLOT_DURATION, SNAP_DURATION } from './config.js';
import { getEffectiveTimeRange } from './calendar-toolbar.js';
import { locale } from './i18n.js';

/**
 * Options that must be identical across every FullCalendar timeGrid instance
 * in the app. Spread into each Calendar constructor and only override what
 * genuinely differs between instances (view type, initial date, hidden days,
 * instance-specific event handlers).
 *
 * @returns {object}
 */
export function sharedTimeGridOptions() {
  const { slotMinTime, slotMaxTime } = getEffectiveTimeRange();
  return {
    allDaySlot: false,
    headerToolbar: false,
    selectable: true,
    selectLongPressDelay: 300,
    editable: true,
    eventMinHeight: 20,
    eventResizableFromStart: true,
    slotDuration: SLOT_DURATION,
    snapDuration: SNAP_DURATION,
    slotMinTime,
    slotMaxTime,
    locale,
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  };
}
