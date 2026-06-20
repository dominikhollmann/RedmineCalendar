# Contract: `createTimegridColumn(el, options)`

**Module**: `js/calendar-config.js`
**Exported as**: named export

## Signature

```js
/**
 * Create and mount a FullCalendar Calendar instance with shared base options.
 * @param {HTMLElement} el
 * @param {object} options
 * @param {'timeGridDay'|'timeGridWeek'} [options.view='timeGridDay']
 * @param {string} options.date  YYYY-MM-DD initial date
 * @param {'interactive'|'readonly'} [options.mode='interactive']
 * @param {false|object} [options.headerToolbar=false]
 * @param {number[]} [options.hiddenDays=[]]
 * @param {object} [options.callbacks={}]  FC event callbacks
 * @returns {{ cal: object, setDate: Function, setEvents: Function, destroy: Function }}
 */
export function createTimegridColumn(el, options) { ... }
```

## Behaviour Contract

1. Calls `sharedTimeGridOptions()` to obtain the base option set.
2. Merges mode overrides:
   - `'readonly'`: `{ editable: false, selectable: false }`
   - `'interactive'`: no overrides (inherits `editable: true, selectable: true` from shared options)
3. Merges `options.callbacks` last (caller overrides take precedence over defaults).
4. Constructs `new FullCalendar.Calendar(el, mergedOptions)` and calls `.render()`.
5. Returns a `TimegridColumnInstance`.

## `TimegridColumnInstance` interface

| Member                         | Behaviour                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cal`                         | The raw `FullCalendar.Calendar` instance. **Treat as advanced escape hatch only** — prefer `setDate`, `setEvents`, `destroy` for standard operations. |
| `.setDate(date: string)`       | Calls `this.cal.gotoDate(date)`.                                                                                                                      |
| `.setEvents(events: object[])` | Calls `this.cal.removeAllEvents()`, then `this.cal.addEvent(e)` for each event in `events`.                                                           |
| `.destroy()`                   | Calls `this.cal.destroy()`.                                                                                                                           |

## Invariants

- A `TimegridColumnInstance` is single-use: once `destroy()` is called, no other methods may be called on it.
- `setEvents()` is idempotent: calling it twice with the same list replaces the previous events entirely.
- `setDate()` does not clear events; the existing events remain on the calendar.
- The factory does NOT store a registry of created instances; callers are responsible for lifecycle management.

## Consumers

| Caller                         | `view`         | `mode`        | Notes                                                                         |
| ------------------------------ | -------------- | ------------- | ----------------------------------------------------------------------------- |
| `js/calendar.js`               | `timeGridWeek` | `interactive` | Passes `headerToolbar: { left, center, right }`, full callback set            |
| `js/planning-view-bookings.js` | `timeGridDay`  | `interactive` | Passes `select`, `eventClick`, `eventDrop`, `eventResize` + overlay callbacks |
| `js/planning-view-outlook.js`  | `timeGridDay`  | `readonly`    | Passes `eventContent`, `eventDidMount`, `eventClick`                          |
| `js/planning-view-teams.js`    | `timeGridDay`  | `readonly`    | Same as Outlook                                                               |
