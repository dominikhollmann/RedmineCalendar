# Data Model: Feature 046 — FC Timegrid Columns

## Entities

### `TimegridColumnInstance`

Returned by `createTimegridColumn(el, options)`. Wraps a FullCalendar.Calendar instance with a minimal lifecycle interface.

| Field / Method      | Type                    | Notes                                                                                                                                                                              |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cal`               | `FullCalendar.Calendar` | Raw FC instance; exposed for advanced callers (e.g. `calendar.js` which needs `.addEvent`, `.next`, `.prev`, `.getDate`, etc.)                                                     |
| `setDate(date)`     | `(string) → void`       | Calls `cal.gotoDate(date)`. For `timeGridWeek` (classic calendar), navigates to the week containing `date`. For `timeGridDay`, navigates to that exact day.                        |
| `setEvents(events)` | `(FCEvent[]) → void`    | `cal.removeAllEvents()` then `cal.addEvent(e)` for each. Used by Outlook/Teams columns; Bookings column uses its own `loadBookingsForDay()` which calls `cal.addEvent()` directly. |
| `destroy()`         | `() → void`             | `cal.destroy()`                                                                                                                                                                    |

### `createTimegridColumnOptions`

Input to `createTimegridColumn()`.

| Field           | Type                              | Default         | Notes                                                  |
| --------------- | --------------------------------- | --------------- | ------------------------------------------------------ |
| `view`          | `'timeGridDay' \| 'timeGridWeek'` | `'timeGridDay'` | FC `initialView`                                       |
| `date`          | `string`                          | required        | YYYY-MM-DD; FC `initialDate`                           |
| `mode`          | `'interactive' \| 'readonly'`     | `'interactive'` | `'readonly'` adds `editable: false, selectable: false` |
| `headerToolbar` | `false \| object`                 | `false`         | FC `headerToolbar`; false hides toolbar entirely       |
| `hiddenDays`    | `number[]`                        | `[]`            | FC `hiddenDays`                                        |
| `callbacks`     | `object`                          | `{}`            | FC event callbacks merged last (override defaults)     |

### `FCPlanningEvent` (FC event object for Outlook/Teams events)

Passed to `setEvents()` or `cal.addEvent()`. Maps from a `PlanningEvent`.

| Field                         | Type            | Notes                                                                                                                        |
| ----------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | `string`        | `pe.id`                                                                                                                      |
| `title`                       | `string`        | `pe.proposal.subject \|\| pe.proposal.ticketId \|\| ''`                                                                      |
| `start`                       | `string`        | ISO: `` `${date}T${pe.displayStartTime}:00` ``                                                                               |
| `end`                         | `string`        | ISO: `` `${date}T${pe.displayEndTime}:00` ``                                                                                 |
| `classNames`                  | `string[]`      | See modifier class table below                                                                                               |
| `editable`                    | `false`         | Events in Outlook/Teams columns are never individually draggable within the column                                           |
| `extendedProps.planningEvent` | `PlanningEvent` | Full planning event for callbacks; provides access to all fields needed by `eventContent`, `eventClick`, and `eventDidMount` |

**Modifier class computation:**

| Condition                                | CSS class added                |
| ---------------------------------------- | ------------------------------ |
| `pe.planningCategory === 'bookable'`     | `planning-event--bookable`     |
| `pe.planningCategory === 'needs-ticket'` | `planning-event--needs-ticket` |
| `pe.planningCategory === 'break'`        | `planning-event--break`        |
| `pe.planningCategory === 'excluded'`     | `planning-event--excluded`     |
| `pe.isCovered === true`                  | `planning-event--covered`      |
| `pe.id` in `_sharedSelectedIds`          | `planning-event--selected`     |

All modifier classes coexist on the `.fc-event` element; order is: category first, then state modifiers.

### `ColumnState` (returned by `createColumnState()`, adapted)

Lives in `planning-view-column-base.js`. Shared selection pool across Outlook + Teams columns.

| Method                                 | Change from current                          | Notes                                                              |
| -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `getSelectedEventIds()`                | unchanged                                    | Returns `Set<string>`                                              |
| `getSelectedEvents()`                  | unchanged                                    | Returns `PlanningEvent[]`                                          |
| `clearSelection()`                     | unchanged                                    | Clears `_sharedSelectedIds` and syncs classes                      |
| `setActiveFcInstance(cal)`             | NEW                                          | Stores FC instance reference for `syncSelectionClasses()`          |
| `setRenderedPlanningEvents(events)`    | renamed from `setRenderedEvents()`           | Stores current `PlanningEvent[]` for class sync                    |
| `syncSelectionClasses()`               | ADAPTED                                      | Calls `cal.getEvents().forEach(e => e.setProp('classNames', ...))` |
| `handleFcEventClick(fcEvent, jsEvent)` | replaces `handleCardClick(e, pe)`            | Extracts `pe` from `fcEvent.extendedProps.planningEvent`           |
| `handleFcEventDidMount(info)`          | replaces `handleDragStart(e, pe)` attachment | Adds `draggable` + `dragstart` listener via `info.el`              |
| `enrichTicketInfoAsync(events)`        | unchanged                                    | Async ticket info fetch                                            |

### `toTimedEvent(proposal, date)` — new utility

Extracted from `_renderAlldayAsTimed()` in `planning-view-column-base.js`. Converts an all-day `CalendarProposal` to a timed one spanning `slotMinTime`–`slotMaxTime` of `date`.

| Input      | Type               | Notes                               |
| ---------- | ------------------ | ----------------------------------- |
| `proposal` | `CalendarProposal` | Outlook event with no specific time |
| `date`     | `string`           | YYYY-MM-DD                          |

Returns: A `CalendarProposal` with `startTime` / `endTime` set to the effective working-hours range.

## Relationships

```
calendar-config.js
  sharedTimeGridOptions()  ←── used by createTimegridColumn()
  createTimegridColumn()   ←── used by calendar.js, planning-view-bookings.js,
                                 planning-view-outlook.js, planning-view-teams.js

planning-view-column-base.js
  createColumnState()      ←── used by planning-view-outlook.js, planning-view-teams.js
  buildCardContent()       ←── called inside FC eventContent callback (both columns)
  toTimedEvent()           ←── called in Outlook event mapping (all-day → timed)
  buildPlanningEvents()    ←── unchanged; called before setEvents()
  classifyProposal()       ←── unchanged
  isFullyCovered()         ←── unchanged
```

## State Transitions

### Planning event selection (adapted)

```
User click on FC event (Outlook or Teams column)
  → handleFcEventClick(fcEvent, jsEvent)
    → if Shift: add pe.id to _sharedSelectedIds
    → if no Shift: clear _sharedSelectedIds, add only pe.id
    → syncSelectionClasses()
      → cal.getEvents().forEach(e => e.setProp('classNames', recomputeClassNames(e)))
        → DOM updates immediately (FC reactive)

User click on Bookings column
  → planning-view.js deselectAll() listener
    → col.clearSelection() on both Outlook + Teams column states
      → syncSelectionClasses() on each
```

### Planning-view day change

```
navigateToNextDay() / navigateToPrevDay() / navigateToToday()
  → _loadDay(date)
    → outlook/teamsColumnInstance.destroy()         ← destroy old FC instances
    → outlookInstance = createTimegridColumn(el, { ... date, mode: 'readonly' })
    → teamsInstance = createTimegridColumn(el, { ... })
    → renderOutlookColumn() → setEvents(toFCEvents(...))
    → renderTeamsColumn()   → setEvents(toFCEvents(...))
```

Note: Unlike the Bookings calendar (which is also destroyed+recreated per day), the Outlook and Teams columns could potentially reuse their FC instances by calling `setDate(date)` + `setEvents([])`. The destroy+recreate approach is used for consistency and to avoid state leakage. This is the same pattern already used for the Bookings column.
