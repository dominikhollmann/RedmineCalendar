# Implementation Plan: Real FullCalendar Columns for Planning View + Shared Factory

**Branch**: `046-fc-timegrid-columns` | **Date**: 2026-06-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/046-fc-timegrid-columns/spec.md`

## Summary

Replace the hand-rolled div timegrid in the Outlook and Teams planning-view columns with real FullCalendar `timeGridDay` instances. Extend the existing `js/calendar-config.js` module with a `createTimegridColumn()` factory that all four FC surfaces (classic calendar, Bookings, Outlook, Teams) consume, ensuring shared slot configuration, theme tokens, and visual parity by construction. Eliminate all duplicate FC timegrid and FC event CSS between `calendar.css` and `planning-view.css` (DRY).

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation)

**Primary Dependencies**: FullCalendar v6 (CDN, already present) — no new runtime dependencies

**Storage**: No new storage; existing `localStorage` keys unchanged

**Testing**: Vitest (unit), Playwright (UI tests)

**Target Platform**: Desktop browser (mobile out of scope per spec)

**Project Type**: Static SPA

**Performance Goals**: Perceived calendar render < 300 ms (Constitution II). Three simultaneous FC `timeGridDay` instances sharing the CDN bundle is acceptable; FC v6 is lazy and all instances share the already-loaded bundle.

**Constraints**: All `js/**` functions ≤ 60 effective LOC (ESLint gate). All `js/**` + `css/**` files ≤ 600 total LOC (hard CI test). SQI composite ≥ 80 after implementation. No new runtime dependencies.

**Scale/Scope**: Four FC surfaces; three planning-view columns; ~3 700 LOC planning-view subtree; ~870 LOC CSS affected.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                               | Assessment                                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I — Redmine API Contract**            | ✓ No new API calls; Redmine data flow unchanged. Outlook/Teams Graph calls remain in `planning-view-outlook.js` / `planning-view-teams.js`.                                                                                              |
| **II — Calendar-First UX**              | ✓ All three planning-view columns use the same FC rendering engine after the refactor — visual parity is guaranteed structurally, not patched. Scroll handled by the existing single outer container; no layout regressions expected.    |
| **III — Test-First TDD**                | ✓ Playwright tests for planning-view exist (`tests/ui/planning-view.spec.js`, `planning-view-teams.spec.js`). New unit tests for `createTimegridColumn()` (factory) and the adapted `createColumnState()` written before implementation. |
| **IV — Simplicity / YAGNI**             | ✓ Factory is an extension of the already-present `sharedTimeGridOptions()` in `calendar-config.js` — not a new module. No new dependencies. `planning-view-bookings.js` remains a thin wrapper; its Redmine data logic is untouched.     |
| **V — Security by Default**             | ✓ All event titles (Outlook subject, Teams call title) rendered via FC's built-in text rendering (XSS-safe). No raw HTML injection into FC event content beyond what `buildCardContent()` already does (unchanged).                      |
| **VI — Continuous Quality Gates**       | ✓ SQI currently 97.75/100. Removing ~200 LOC of div-grid code from `planning-view-column-base.js` and CSS from `planning-view.css` will reduce module sizes. Must verify no function exceeds 60 LOC after factory additions.             |
| **VII — Reuse Before Reimplementation** | ✓ `sharedTimeGridOptions()` already exists and is already used by `planning-view-bookings.js` and `calendar.js`. Factory extends it, does not duplicate it. `createColumnState()` is adapted, not forked per column.                     |

## Project Structure

### Documentation (this feature)

```text
specs/046-fc-timegrid-columns/
├── plan.md              # This file
├── research.md          # Phase 0 — architectural decisions
├── data-model.md        # Phase 1 — entity mapping
├── quickstart.md        # Phase 1 — UAT validation guide
├── contracts/           # Phase 1 — factory interface contract
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (affected files)

```text
js/
├── calendar-config.js        # EXTEND: add createTimegridColumn() factory (~40 LOC)
├── planning-view-column-base.js  # MODIFY: remove div-grid renderers; adapt createColumnState()
├── planning-view-outlook.js  # MODIFY: replace div rendering with FC instance + event mapping
├── planning-view-teams.js    # MODIFY: same
├── planning-view-bookings.js # MODIFY: delegate FC creation to factory
├── calendar.js               # MODIFY: delegate FC creation to factory
├── planning-view.js          # MODIFY: remove height-measurement code
├── knowledge.topics.json     # UPDATE: add createTimegridColumn to calendar-config topic

css/
├── calendar.css              # EXTEND: add .fc-event.planning-event--* modifier rules
├── planning-view.css         # SHRINK: remove div-grid classes + FC event styles

tests/
├── unit/planning-column-factory.test.js  # NEW: factory unit tests
└── ui/planning-view.spec.js             # EXISTING: regression baseline
```

## Wiederverwendungs-Audit (Constitution VII)

**Berührte Module (existing):**

| Module                            | What changes                                                                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `js/calendar-config.js`           | Extended with `createTimegridColumn()` — the natural home since it already owns `sharedTimeGridOptions()`                                                                                               |
| `js/planning-view-column-base.js` | `renderTimeGrid()`, `renderColumnCards()`, `measurePxPerMin()`, `_renderTimedCard()`, `_renderAlldayAsTimed()` removed; `createColumnState()` adapted to track FC event objects instead of DOM div refs |
| `js/planning-view-bookings.js`    | `initBookingsCalendar()` delegates `new FullCalendar.Calendar(...)` to factory                                                                                                                          |
| `js/calendar.js`                  | Main calendar construction delegates to factory                                                                                                                                                         |
| `js/planning-view-outlook.js`     | Data fetch unchanged; rendering switched from `renderColumnCards()` to FC event objects                                                                                                                 |
| `js/planning-view-teams.js`       | Same                                                                                                                                                                                                    |
| `js/planning-view.js`             | Height-measurement JS (`.fc-timegrid-body` query) removed                                                                                                                                               |

**Wiederverwendet vs. Neu:**

- `createTimegridColumn()` is NEW code, but lives in the existing `calendar-config.js` — no new module needed. This satisfies Constitution VII: the second, third, and fourth consumers of the same `sharedTimeGridOptions()` base are extracted once rather than copied.
- `createColumnState()` is ADAPTED (not forked): Outlook and Teams continue to share one pool via the existing `_sharedSelectedIds` Set. The adaptation changes the state sync target from div DOM nodes to FC API calls (`fcEvent.setProp('classNames', [...])`).
- `buildCardContent()` in `planning-view-column-base.js` is REUSED as the FC `eventContent` renderer — the function is not changed, only the call site moves from `renderColumnCards()` to the FC `eventContent` callback.

**Parallel-Capability:** No new parallel capability created. Outlook and Teams continue to share `createColumnState()` from `planning-view-column-base.js`. The factory is the single shared creation path for all four FC surfaces.

**Deliberate duplication:** None. The `.planning-event--*` modifier CSS classes are moved from `planning-view.css` to `calendar.css` rather than duplicated.

## Complexity Tracking

No constitution violations requiring justification. The refactor reduces complexity (removes ~200 LOC of div-grid code) and eliminates duplication (CSS unification).

---

## Phase 0: Research

_See [research.md](research.md) for full findings. Key decisions summarised here._

### Decision 1 — Scroll Architecture: Outer Container (No JS Sync Needed)

**Decision**: Keep the existing single outer scroll container (`.planning-view-scroll`). All three FC instances use `contentHeight: 'auto'` and `height: 'auto'`.

**Rationale**: `planning-view-bookings.js` already uses `contentHeight: 'auto', height: 'auto'`. All three FC instances with identical slot configs (`slotMinTime`, `slotMaxTime`, `slotDuration`) expand to the same pixel height naturally. The outer `overflow-y: auto` scroll container scrolls all three in lock-step with zero JS. The current JS height-measurement code (`measurePxPerMin`, measuring `.fc-timegrid-body` height, setting `.planning-outlook-timed` pixel height) is entirely deleted.

**Alternative rejected**: Per-column FC scrollers with JS `scroll` event sync — adds complexity (re-entrancy guards, feedback loop risk) without benefit, since the outer container already solves the problem.

### Decision 2 — Factory Location: Extend `calendar-config.js`

**Decision**: Add `createTimegridColumn(el, options)` to the existing `js/calendar-config.js`, not a new module.

**Rationale**: `calendar-config.js` already owns `sharedTimeGridOptions()`, which is the factory's core. Adding ~40 LOC of factory wrapper there avoids a new module, a new `knowledge.topics.json` entry, and a new dependency edge in the module graph. `calendar-config.js` stays well under 500 effective LOC.

**Alternative rejected**: New `js/timegrid-column.js` — creates a new module node and a new dependency on `calendar-config.js` with no architectural benefit.

### Decision 3 — Event Card Rendering: FC `eventContent` + `eventDidMount`

**Decision**: Reuse `buildCardContent()` from `planning-view-column-base.js` as the FC `eventContent` callback. Wire HTML5 drag via `eventDidMount`.

**Rationale**: `buildCardContent(pe, showDetails)` already returns `HTMLElement[]` — exactly what FC's `eventContent` callback accepts as `{ domNodes }`. No rewrite needed; the function moves from being called in `renderColumnCards()` to being called in the `eventContent` hook.

For drag-drop: `eventDidMount` fires after FC inserts the event element. Attaching `el.draggable = true` and `el.addEventListener('dragstart', ...)` there preserves the existing `dataTransfer.setData('planning/events', ...)` protocol. The Bookings drop handlers (capture-phase on the bookings container) are unchanged.

**Alternative rejected**: Repurposing FC's own drag system (`ThirdPartyDraggable`) — incompatible with the existing MIME-type-based booking protocol and would require rewriting `planning-view.js`'s drop handler.

### Decision 4 — Selection State: Adapt `createColumnState()`

**Decision**: Adapt `createColumnState()` in `planning-view-column-base.js` to accept a reference-setter for the active FC instance. `syncSelectionClasses()` calls `fcEvent.setProp('classNames', [...])` instead of toggling DOM class on `.planning-event` divs.

**Rationale**: The shared `_sharedSelectedIds` Set (cross-Outlook + cross-Teams) is preserved unchanged. Only the sync mechanism changes — from DOM classList to FC API. `handleFcEventClick(fcEvent, jsEvent)` replaces `handleCardClick(e, pe)` and extracts the `PlanningEvent` from `fcEvent.extendedProps.planningEvent`.

### Decision 5 — CSS Unification Strategy

**Decision**: Move `.planning-event--*` modifier rules from `planning-view.css` to `calendar.css`. Delete div-grid classes (`.planning-time-grid`, `.planning-grid-slot`, `.planning-outlook-timed`, `.planning-teams-timed`). The FC band-background and slot-border rules in `calendar.css` already apply to all `.fc` instances by selector — no duplication needed.

**Rationale**: The `calendar.css` selector `.fc .fc-timegrid-slot-lane[data-time^='...']` already applies to any `.fc` element on the page, including the three planning-view FC instances. No per-column CSS scoping is needed for the grid itself. The `.planning-event--*` modifiers apply on top of FC's `.fc-event` base via combined selector `.fc-event.planning-event--bookable { ... }`.

**All-day handling**: `allDaySlot: false` is already in `sharedTimeGridOptions()`. All-day Outlook events are converted to timed at the data-mapping layer using the existing conversion logic (extracted to a standalone utility from `_renderAlldayAsTimed`).

---

## Phase 1: Design

_See [data-model.md](data-model.md) and [contracts/](contracts/) for full details._

### Factory Interface (`createTimegridColumn`)

Location: `js/calendar-config.js`

```
createTimegridColumn(el, options) → TimegridColumnInstance

options {
  view:          'timeGridDay' | 'timeGridWeek'    // default 'timeGridDay'
  date:          string                             // YYYY-MM-DD initial date
  mode:          'interactive' | 'readonly'         // interactive = editable+selectable; readonly = not
  headerToolbar: false | { left, center, right }   // default false (hide FC toolbar)
  hiddenDays:    number[]                           // default []
  callbacks:     {                                  // FC event callbacks (merged in)
    eventClick?, eventDrop?, eventResize?,
    select?, eventContent?, eventDidMount?, ...
  }
}

TimegridColumnInstance {
  cal:         FullCalendar.Calendar   // raw FC instance for advanced callers
  setDate(date: string): void          // gotoDate() on FC instance
  setEvents(events: FCEvent[]): void   // removeAllEvents() + addEvent() for each
  destroy(): void                      // cal.destroy()
}
```

`mode: 'readonly'` adds `editable: false, selectable: false` overrides on top of `sharedTimeGridOptions()`.
`mode: 'interactive'` uses `sharedTimeGridOptions()` defaults (`editable: true, selectable: true`).

### FC Event Object for Outlook/Teams Events

```
FCEvent {
  id:            string              // pe.id
  title:         string              // pe.proposal.subject or ticketId or ''
  start:         string              // ISO: `${date}T${pe.displayStartTime}:00`
  end:           string              // ISO: `${date}T${pe.displayEndTime}:00`
  classNames:    string[]            // ['planning-event--bookable'] etc.
  editable:      false               // never drag/resize planning events within column
  extendedProps: { planningEvent: PlanningEvent }
}
```

`classNames` is computed from:

1. `planning-event--${pe.planningCategory}` (bookable / needs-ticket / break / excluded)
2. `planning-event--covered` if `pe.isCovered`
3. `planning-event--selected` if in `_sharedSelectedIds`

### `createColumnState()` Adapted Interface

```
createColumnState() → ColumnState {
  // Selection pool (unchanged)
  getSelectedEventIds(): Set<string>
  getSelectedEvents(): PlanningEvent[]
  clearSelection(): void

  // FC-aware sync (NEW)
  setActiveFcInstance(cal: FullCalendar.Calendar): void
  setRenderedPlanningEvents(events: PlanningEvent[]): void
  syncSelectionClasses(): void        // calls fcEvent.setProp('classNames', ...) per event

  // FC callback adapters (NEW names; same logic)
  handleFcEventClick(fcEvent, jsEvent): void
  handleFcEventDidMount(info): void   // attaches draggable + dragstart listener

  // Async enrichment (unchanged)
  enrichTicketInfoAsync(events): Promise<void>
}
```

### CSS Rules Summary

**Added to `calendar.css`:**

```css
/* Planning-event state modifiers — applied to .fc-event via classNames */
.fc-event.planning-event--bookable {
  background: var(--color-bookable-bg);
  color: var(--color-text);
}
.fc-event.planning-event--needs-ticket {
  background: var(--color-needs-ticket-bg);
  color: var(--color-text);
}
.fc-event.planning-event--break {
  background: var(--color-text-muted);
  color: var(--color-surface);
}
.fc-event.planning-event--excluded {
  background: var(--color-surface);
  color: var(--color-muted);
  cursor: not-allowed;
}
.fc-event.planning-event--selected {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 1px;
}
.fc-event.planning-event--covered {
  opacity: 0.45;
}
```

**Removed from `planning-view.css`:**

- `.planning-time-grid` (entire block)
- `.planning-grid-slot` (entire block)
- `.planning-grid-slot--minor`
- `.planning-grid-slot[data-time^='...']` (band-background duplication)
- `.planning-outlook-timed`, `.planning-teams-timed`
- `.planning-event` (base card + positioning)
- All `.planning-event--*` blocks (moved to `calendar.css`)

**Retained in `planning-view.css`** (layout-only):

- Column structure (`.planning-view-scroll`, `.planning-view-columns`, `.planning-bookings-column`, `.planning-outlook-column`, `.planning-teams-column`)
- Column headers (`.planning-view-column-headers`, `.planning-view-column-header`)
- Spinner (`.planning-column-spinner`)
- Prompt (`.planning-column-prompt`)
- Drop overlay (`.planning-drop-overlay`, `.drag-active`)
- FC header-section overrides (`.planning-bookings-column .fc-scrollgrid-section-header` etc.)
