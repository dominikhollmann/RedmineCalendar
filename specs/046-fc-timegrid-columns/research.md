# Research: Feature 046 — FC Timegrid Columns + Shared Factory

**Date**: 2026-06-19 | **Plan**: [plan.md](plan.md)

## Finding 1 — `sharedTimeGridOptions()` already exists

**Decision**: Extend `js/calendar-config.js` with the factory; do not create a new module.

**Evidence**: `js/calendar-config.js` already exports `sharedTimeGridOptions()` which provides all shared slot settings (`slotMinTime`, `slotMaxTime`, `slotDuration`, `snapDuration`, `allDaySlot: false`, `locale`, `slotLabelFormat`, `editable: true`, `selectable: true`). Both `planning-view-bookings.js` and `calendar.js` already spread this function's return value into their `FullCalendar.Calendar` constructors.

**Rationale**: Constitution VII — Reuse Before Reimplementation. `calendar-config.js` is the right home for the factory; adding ~40 LOC of factory wrapper avoids a new module, a new dependency edge, and a new `knowledge.topics.json` entry.

---

## Finding 2 — Outer scroll architecture (no JS sync needed)

**Decision**: Keep the single outer scroll container (`.planning-view-scroll`). All FC instances use `contentHeight: 'auto', height: 'auto'`.

**Evidence**: `planning-view-bookings.js` already uses:

```js
cal = new FullCalendar.Calendar(container, {
  ...sharedTimeGridOptions(),
  contentHeight: 'auto',
  height: 'auto',
  ...
});
```

The `.planning-view-scroll` div has `overflow-y: auto` and contains all three columns in a flex row. All three FC instances with the same slot configuration will expand to the same pixel height, making the outer scroll container scroll all three together with zero JavaScript.

**Deleted code**: `measurePxPerMin()`, all references to `.fc-timegrid-body` height measurement, and all code that sets the pixel height of `.planning-outlook-timed` / `.planning-teams-timed`.

**Alternatives rejected**:

- Per-column FC scroll + JS sync: additional complexity (re-entrancy guard, scroll event listeners) with no benefit over the outer-container approach.

---

## Finding 3 — `allDaySlot: false` already in shared options

**Decision**: All-day Outlook events converted to timed at data-mapping layer; no FC config change needed.

**Evidence**: `sharedTimeGridOptions()` already sets `allDaySlot: false`. All FC instances created via the factory inherit this. The existing all-day conversion logic in `planning-view-column-base.js` (`_renderAlldayAsTimed`) is extracted to a standalone utility function `toTimedEvent(proposal, date)` and called when building FC event objects.

---

## Finding 4 — FC `eventContent` reuses `buildCardContent()`

**Decision**: Use FC's `eventContent` callback with `{ domNodes: buildCardContent(pe, showDetails) }`.

**Evidence**: `buildCardContent(pe, showDetails)` in `planning-view-column-base.js` already returns `HTMLElement[]`, which is exactly what FC accepts as `{ domNodes }` in `eventContent`. No rewrite needed.

**Card details display**: The existing `data-show-details` toggle behaviour is preserved via `extendedProps.showDetails` on the FC event object. The `eventContent` callback reads it.

---

## Finding 5 — HTML5 drag via `eventDidMount`

**Decision**: Use FC's `eventDidMount(info)` callback to attach `draggable` attribute and `dragstart` listener to the rendered event element.

**Evidence**: The existing drag protocol uses `dataTransfer.setData('planning/events', JSON.stringify([...ids]))`. The Bookings drop handler (capture-phase on `.planning-bookings-column`) reads this MIME type. Using `eventDidMount` to attach the listener preserves this protocol end-to-end.

```js
eventDidMount: (info) => {
  const pe = info.event.extendedProps.planningEvent;
  if (pe.planningCategory !== 'excluded') {
    info.el.setAttribute('draggable', 'true');
    info.el.addEventListener('dragstart', (e) => col.handleDragStart(e, pe));
  }
};
```

**Alternative rejected**: FC's `ThirdPartyDraggable` — incompatible with the existing MIME-based booking protocol.

---

## Finding 6 — `createColumnState()` adaptation path

**Decision**: Add `setActiveFcInstance(cal)` and `handleFcEventClick(fcEvent, jsEvent)` to the column state interface. `syncSelectionClasses()` updated to call `fcEvent.setProp('classNames', [...])`.

**Evidence**: The shared `_sharedSelectedIds` Set and `_columnInstances` Set in `planning-view-column-base.js` remain unchanged — they are the right abstraction. Only the sync mechanism changes from DOM classList mutation to FC API calls.

**Key**: FC event objects returned by `cal.getEvents()` are live references. Calling `.setProp('classNames', newArray)` on them immediately updates the rendered DOM. No additional re-render needed.

---

## Finding 7 — CSS band rules in `calendar.css` already cover all `.fc` elements

**Decision**: No per-column CSS scoping for FC timegrid bands; `calendar.css` rules apply automatically.

**Evidence**: The `calendar.css` selector `.fc .fc-timegrid-slot-lane[data-time^='00:']` matches any `.fc` element on the page. Since all three planning-view columns are now real FC instances, they inherit the band backgrounds, minor-slot borders, and the `:30` border whitening — the same rules that already applied to the Bookings column. The duplicate `planning-grid-slot[data-time^='...']` bands in `planning-view.css` are pure deletion (not migration).

---

## Finding 8 — Module sizes post-refactor (estimated)

| Module                         | Before         | Delta                                 | After (est.) |
| ------------------------------ | -------------- | ------------------------------------- | ------------ |
| `planning-view-column-base.js` | 532            | −140 (remove div-grid code)           | ~390         |
| `planning-view-outlook.js`     | 184            | −30 (remove rendering calls)          | ~154         |
| `planning-view-teams.js`       | 429            | −25 (remove rendering calls)          | ~404         |
| `planning-view.js`             | 626 (499 eff.) | −30 (remove height measurement)       | ~469 eff.    |
| `planning-view-bookings.js`    | 321            | −5 (delegate to factory)              | ~316         |
| `calendar.js`                  | 539            | −5 (delegate to factory)              | ~534         |
| `calendar-config.js`           | ~30            | +40 (factory)                         | ~70          |
| `css/calendar.css`             | 536            | +20 (modifier rules)                  | ~556         |
| `css/planning-view.css`        | 337            | −120 (remove div-grid + FC event CSS) | ~217         |

All modules stay within the 500 effective LOC soft threshold and well under the 600 hard limit. `planning-view.js` drops from 499 to ~469 effective LOC.

---

## Finding 9 — Tests

**Existing UI tests** (`planning-view.spec.js`, `planning-view-teams.spec.js`): Run as-is as regression baseline. These test end-to-end behaviour (column rendering, click-to-book, scroll position) and are the primary correctness gate. They are browser-based and do not depend on internal rendering mechanism.

**New unit tests** (`tests/unit/planning-column-factory.test.js`):

- `createTimegridColumn()` with `mode: 'readonly'` sets `editable: false` on the constructed FC options
- `createTimegridColumn()` with `mode: 'interactive'` preserves `editable: true`
- `setDate(date)` calls `cal.gotoDate(date)` on the FC instance
- `setEvents(events)` calls `cal.removeAllEvents()` then `cal.addEvent()` for each

Note: FC itself cannot be unit-tested in Node (it requires a real DOM). Factory tests mock the `FullCalendar.Calendar` constructor via jsdom environment + global mock. The integration behaviour (events actually rendered in slots) is covered by Playwright.
