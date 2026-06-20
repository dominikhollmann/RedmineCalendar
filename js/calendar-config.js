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

/**
 * Create and mount a FullCalendar Calendar instance with shared base options.
 * All four FC surfaces (classic calendar, Bookings, Outlook, Teams) use this
 * factory so slot config, theme tokens, and visual parity are guaranteed by construction.
 *
 * @param {HTMLElement} el
 * @param {object} options
 * @param {'timeGridDay'|'timeGridWeek'} [options.view='timeGridDay']
 * @param {string} options.date  YYYY-MM-DD initial date
 * @param {'interactive'|'readonly'} [options.mode='interactive']
 * @param {false|object} [options.headerToolbar=false]
 * @param {number[]} [options.hiddenDays=[]]
 * @param {object} [options.callbacks={}]  FC event callbacks merged last
 * @returns {{ cal: object, setDate: Function, setEvents: Function, destroy: Function }}
 */
export function createTimegridColumn(el, options = {}) {
  const {
    view = 'timeGridDay',
    date,
    mode = 'interactive',
    headerToolbar = false,
    hiddenDays = [],
    // '100%' — FC fills the CSS container height and creates an internal scroller
    //   (classic calendar: container is #calendar with height:100% on a fixed parent)
    // 'auto'  — FC expands to full content height; outer container provides scroll
    //   (planning-view columns: outer .planning-view-scroll handles scrolling)
    height = 'auto',
    callbacks = {},
  } = options;

  const modeOverrides = mode === 'readonly' ? { editable: false, selectable: false } : {};
  const heightOpts =
    height === '100%' ? { height: '100%' } : { height: 'auto', contentHeight: 'auto' };

  const cal = new FullCalendar.Calendar(el, {
    ...sharedTimeGridOptions(),
    initialView: view,
    initialDate: date,
    headerToolbar,
    hiddenDays,
    ...heightOpts,
    ...modeOverrides,
    ...callbacks,
  });
  cal.render();

  return {
    cal,
    setDate: (d) => cal.gotoDate(d),
    setEvents: (events) => {
      cal.removeAllEvents();
      events.forEach((e) => cal.addEvent(e));
    },
    destroy: () => cal.destroy(),
  };
}
