# Research: Planning View

**Phase**: 0 — Outline & Research  
**Branch**: `038-planning-view`  
**Date**: 2026-06-08

No `NEEDS CLARIFICATION` items exist in the Technical Context — the stack is fully defined. This
document records the key design decisions reached through codebase research before tasks are
generated.

---

## Decision 1 — Bookings Column Implementation

**Decision**: Use a dedicated FullCalendar `timeGridDay` instance mounted in a
`<div id="planning-bookings-calendar">` container inside the Planning View.

**Rationale**: Zero new interaction code needed. FullCalendar handles click-to-create, double-
click-to-edit, drag-to-move, and drag-to-resize identically to the main calendar. The `timeGridDay`
view is already loaded (it's part of the same CDN bundle). The `slotMinTime`/`slotMaxTime` can be
driven from `getEffectiveTimeRange()` (working-hours toggle) and `hiddenDays` from
`getInitialHiddenDays()` (Mo–Fr toggle) — both exported by `js/calendar-toolbar.js`.

**Alternatives considered**: Custom DOM time-grid — rejected because it would require re-implementing
drag-to-create, double-click-to-edit, ArbZG overlays, and all FullCalendar event-rendering logic.

**Key integration details**:

- `headerToolbar: false` — no built-in navigation; Planning View owns day navigation
- `initialDate` set to `_planningDay` when the FullCalendar instance is created
- `openForm` from `js/time-entry-form.js` used for select/click callbacks — same as main calendar
- `overlayHooks` from `js/calendar-overlays.js` applied for ArbZG warnings + anomaly badges (FR-020)
- Instance destroyed (`calendar.destroy()`) and recreated on each Planning Day change (simplest; no
  date-change race condition with the FullCalendar API)

---

## Decision 2 — Drag & Drop (Outlook → Bookings)

**Decision**: HTML5 native DnD. Outlook event cards have `draggable="true"`. `dragstart` writes
selected event IDs to `dataTransfer` as JSON. A transparent drop overlay covers the Bookings column
area and receives `dragover`/`drop` events.

**Rationale**: Supports multi-event drag in one action: all selected event IDs are packed into a
single `dataTransfer.setData('planning/events', JSON.stringify(ids))` call. No per-element library
instances required.

**Alternatives considered**:

- _FullCalendar `Draggable` + `droppable: true`_: The `FullCalendar.Draggable` API wraps one element
  at a time. Wiring multi-select (moving multiple cards together) requires either coordinating
  multiple Draggable instances or faking a single drag with a ghost element — significant complexity
  for no benefit over native DnD.
- _Custom pointer-event drag_: More code, less accessible, no benefit.

**Time-slot resolution on drop**:  
In the `drop` handler, query `.fc-timegrid-slot[data-time]` elements on the bookings FullCalendar
DOM. Find the element whose bounding rect contains the pointer Y. FullCalendar renders slots with
`data-time="HH:MM:SS"` attributes. This is stable across FullCalendar v6 patch releases (the
attribute is part of the public accessibility API). Fall back to slot-grid arithmetic if needed.

**Single-event drag (not pre-selected)**:  
If the user drags a card that is NOT currently in the selection, the selection is cleared and the
dragged card becomes the single selected event for that drag action.

---

## Decision 3 — Day-Column Header Double-Click (FR-003)

**Decision**: Attach a single `dblclick` event listener on the `#calendar` container element,
delegated to `.fc-col-header-cell[data-date]` elements.

**Rationale**: FullCalendar v6 does not expose a `dayHeaderDblClick` callback. Event delegation on
the container is reliable because FullCalendar marks every column header cell with `data-date=
"YYYY-MM-DD"`. The listener is installed once (after `calendar.render()` in `calendar.js`) and
costs nothing between re-renders.

**Code sketch** (in `calendar.js` after `calendar.render()`):

```js
calendarEl.addEventListener('dblclick', (e) => {
  const cell = e.target.closest('.fc-col-header-cell[data-date]');
  if (!cell) return;
  showPlanningView(cell.dataset.date);
});
```

**Month view**: Month view does not render `.fc-col-header-cell[data-date]` elements, so the
listener fires only in `timeGridWeek` / `timeGridDay` views — correct per spec.

---

## Decision 4 — CalendarProposal → Planning View Category Mapping

**Decision**:

| Source                                                                        | `planningCategory` |
| ----------------------------------------------------------------------------- | ------------------ |
| `proposal.status === 'proposed'` AND `proposal.category === 'meeting'`        | `'bookable'`       |
| `proposal.status === 'needs-ticket'` AND `proposal.category === 'meeting'`    | `'needs-ticket'`   |
| `proposal.category` is `'break'`, `'holiday'`, `'vacation'`, `'allday-other'` | `'excluded'`       |
| Entry in `skippedInformational` (birthday, reminder, …)                       | `'excluded'`       |

**Key call-site change**: `parseCalendarProposals` MUST be called with `existingEntries = []` in the
Planning View context. Passing the actual Bookings entries would silently discard already-covered
events (the existing `hasOverlap` filter in `handleTimedEvent`). The Planning View shows ALL events;
coverage greyout is computed separately (Decision 5).

---

## Decision 5 — Coverage Greyout (FR-016)

**Decision**: Pure function `isFullyCovered(eventStartHHMM, eventEndHHMM, bookings)`:

1. Convert the event's `[startHHMM, endHHMM]` and each booking's
   `[booking.startTime, booking.startTime + booking.hours]` to integer minutes.
2. Sort bookings by start minute; merge overlapping intervals.
3. Return `true` if any single merged interval `[lo, hi]` satisfies `lo ≤ eventStart && hi ≥ eventEnd`.
   (Full-interval covering, not partial.)

All-day events: covered if `sum(booking.hours for bookings on that day) ≥ event.hours`. This
matches the all-day event's `hours` field produced by `parseCalendarProposals`.

**Rationale**: Pure logic → 100% unit-testable with no DOM. Re-computed on every render
(FR-016: "no additional storage required").

---

## Decision 6 — Feedback Button Relocation (FR-001b)

**Decision**: Change `initFeedback()` in `js/feedback.js` to inject a `<button
class="feedback-toolbar-btn">` into `.app-header` (before the settings link `<a>`), instead of
appending a `<button class="feedback-fab">` to `document.body`.

**Rationale**: Simple one-line change to the insertion point + one CSS rule change. The FAB class
`.feedback-fab` and its positioning CSS are removed; `.feedback-toolbar-btn` inherits standard
header button styles.

**Impact**: The `feedback-fab` CSS rule in `css/feedback.css` is replaced with a
`.feedback-toolbar-btn` rule that matches other header icon buttons.

---

## Decision 7 — Planning Toggle FAB (FR-001)

**Decision**: Static element in `index.html`: `<button id="planning-view-toggle"
class="planning-toggle-fab" hidden>`, with JavaScript removing the `hidden` attribute on desktop
when `!isMobileView()`. CSS positions it bottom-right (same visual position as the former
feedback FAB); `@media (max-width: 767px)` sets `display: none` as a belt-and-suspenders guard.

**Rationale**: Static HTML avoids the timing dependency of dynamic creation. The `planning-view.js`
module wires the click handler in its init function, which runs at module load time.

---

## Decision 8 — Batch Booking Processing (FR-021b)

**Decision**: Sequential processing (not parallel `Promise.all`) for multi-event drag:

```
for each event in draggedEvents:
  try:
    create entry → mark succeeded
  catch:
    mark failed, keep event in Outlook column
show per-entry outcome toast/dialog
```

**Rationale**: Sequential avoids race conditions on ArbZG warnings (which are per-day and recomputed
after each entry is added). For multi-modal events (`needs-ticket`), sequential is required anyway
because the user must interact with each modal in turn. The spec says "continue all events, report
per-entry outcome at end" (FR-021b clarification).

---

## Decision 9 — All-Day Events in the Outlook Column

**Decision**: All-day events are shown in a fixed-height all-day row at the top of the Outlook
column. They are draggable (if `bookable` or `needs-ticket`). When dropped onto the Bookings
column, the booking is created with:

- `startTime` = the configured work-start time (from `readWorkingHours()` or `'09:00'`)
- `hours` = daily hours (from `parseCalendarProposals`, already in the proposal's `hours` field)

The Bookings FullCalendar has `allDaySlot: false` (matching the main calendar), so the entry is
placed at work-start time with the appropriate duration.

---

## Decision 10 — Module Size Budget

Estimated effective LOC budgets (blank + comment lines excluded):

| Module                         | Estimated LOC | Notes                                                   |
| ------------------------------ | ------------- | ------------------------------------------------------- |
| `js/planning-view.js`          | ~350          | Orchestration, nav, toggle, drag dispatch               |
| `js/planning-view-bookings.js` | ~280          | FullCalendar init/destroy, Redmine data load            |
| `js/planning-view-outlook.js`  | ~370          | Event classification, rendering, selection, drag source |
| `css/planning-view.css`        | ~200          | Layout, card styles, greyout, FAB, mobile hide          |

All within the 500 effective-LOC hard gate.

---

## Decision 11 — Vertical Scroll and Time Alignment

**Problem**: FullCalendar manages its own internal scroll container (`.fc-scroller`). Without
explicit handling, the Bookings column and the Outlook column scroll independently. Worse, Outlook
event cards must be vertically aligned with FullCalendar's time-grid slots for drag-to-book to feel
natural — if their slot heights differ, the visual mapping breaks.

**Decision**: Set `contentHeight: 'auto'` on the Bookings FullCalendar instance and let a single
outer scroll container own the only scrollbar.

```
.planning-view-scroll  { overflow-y: auto; height: 100%; }   ← single scrollbar
  .planning-view-columns { display: flex; align-items: flex-start; }
    .planning-bookings-column → FullCalendar contentHeight:'auto' (no internal scroll)
    .planning-outlook-column  → full natural height, scrolls with outer container
```

With `contentHeight: 'auto'`, FullCalendar expands to its natural full height and disables its own
internal scroll. Both columns live inside the same outer scroll container — they move together
automatically with no JavaScript sync code.

**Time alignment**: After FullCalendar renders, read the height of one `.fc-timegrid-slot` element
(`slotEl.getBoundingClientRect().height`). All slots are uniform. Use this single measurement to
position Outlook event cards absolutely within their column:

```js
const slotH = slotEl.getBoundingClientRect().height; // px per slotDuration (15 min)
const pxPerMin = slotH / 15;
// For an event starting at slotMinTime + offsetMinutes:
const top = (startMin - minMin) * pxPerMin;
const height = (endMin - startMin) * pxPerMin;
```

The measurement is taken once after `calendar.render()` and reused for all cards on that day.
If the viewport resizes (e.g. window resize), re-render both columns.

**Typical heights**:

- Working-hours range (09:00–18:00, 9 h × 4 slots/h × ~24 px/slot) ≈ 864 px — fits most desktop
  viewports with little or no scroll.
- Full 24 h range ≈ 2 304 px — scrolls normally through the outer container.

**Alternatives rejected**:

- _JavaScript scroll-event sync_ (`scroll` listener on `.fc-scroller` + matching `scrollTop` on
  the Outlook container): prone to scroll jitter and infinite-event loops. FullCalendar's internal
  scroll management involves multiple nested scroll containers (header + body), making reliable sync
  fragile without monkey-patching FullCalendar internals.
- _Fixed-height both columns with separate scrollbars_: gives each column an independent scrollbar,
  which is disorienting — scrolling the Bookings side while the Outlook column stays still defeats
  the side-by-side comparison purpose.

---

## Existing Infrastructure Reused

| Asset                     | Module                    | Reuse point                                       |
| ------------------------- | ------------------------- | ------------------------------------------------- |
| `parseCalendarProposals`  | `js/outlook.js`           | Classification + time rounding for Outlook column |
| `fetchCalendarEvents`     | `js/outlook.js`           | Outlook data fetch                                |
| `fetchTimeEntries`        | `js/redmine-api.js`       | Bookings column data                              |
| `createTimeEntry`         | `js/redmine-api.js`       | Booking creation (FR-010)                         |
| `openForm`                | `js/time-entry-form.js`   | Needs-ticket modal (FR-010b)                      |
| `attachOverlayHooks`      | `js/calendar-overlays.js` | ArbZG + anomaly overlays on Bookings column       |
| `getEffectiveTimeRange`   | `js/calendar-toolbar.js`  | Slot min/max time for Bookings FC (FR-017)        |
| `getInitialHiddenDays`    | `js/calendar-toolbar.js`  | Day-range preference (Mo–Fr, FR-018)              |
| `showToast` / `showError` | `js/notify.js`            | Outcome notifications                             |
| `isMsalSignedIn`          | `js/outlook.js`           | Outlook auth state (FR-008, FR-014)               |
| `acquireToken`            | `js/outlook.js`           | Outlook Graph token                               |
| `readWorkingHours`        | `js/settings.js`          | Work-start anchor for all-day events              |
| `DOMPurify`               | CDN (already loaded)      | Sanitize Outlook text before DOM insertion        |
