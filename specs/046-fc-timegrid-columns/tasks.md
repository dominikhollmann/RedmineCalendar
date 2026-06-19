# Tasks: Real FullCalendar Columns for Planning View + Shared Factory

**Input**: Design documents from `specs/046-fc-timegrid-columns/`

**User Stories**:

- US1 (P1): Visual Parity — all three planning-view columns show the same FC grid
- US2 (P1): Synchronised Vertical Scrolling — delivered by US1 (outer scroll + `contentHeight: 'auto'`)
- US3 (P1): Event Interaction Preserved — click-to-book and drag-to-book on Outlook/Teams events
- US4 (P2): Unified CSS — no duplicated FC rules across CSS files
- US5 (P2): Shared Factory — all four FC surfaces (`calendar.js`, Bookings, Outlook, Teams) created via `createTimegridColumn()`

> Note: US2 is not a separate implementation phase — it emerges automatically when Outlook/Teams columns use `contentHeight: 'auto'` inside the existing single outer scroll container (`.planning-view-scroll`). US1, US2, and US3 are all delivered per column in Phases 3 and 4.

---

## Phase 1: Foundational — Factory + Tests (TDD)

**Purpose**: Implement and verify `createTimegridColumn()` before any consumer is migrated. Constitution III (Test-First) requires tests to be written and red before implementation.

**⚠️ CRITICAL**: All subsequent phases depend on the factory being complete and green.

- [ ] T001 Write jsdom unit tests for `createTimegridColumn()` in `tests/unit/planning-column-factory.test.js` — mock `FullCalendar.Calendar` constructor; assert `mode: 'readonly'` sets `editable: false, selectable: false`; assert `mode: 'interactive'` passes through shared options; assert `setDate(date)` calls `cal.gotoDate(date)`; assert `setEvents(evs)` calls `removeAllEvents()` then `addEvent()` per event; verify tests FAIL (RED) before T002

- [ ] T002 Implement `createTimegridColumn(el, options)` as named export in `js/calendar-config.js` — spread `sharedTimeGridOptions()`; merge mode overrides; merge `options.callbacks` last; call `new FullCalendar.Calendar(el, merged)` + `.render()`; return `{ cal, setDate, setEvents, destroy }` — verify T001 turns GREEN

- [ ] T003 Write jsdom unit tests for adapted `createColumnState()` in `tests/unit/planning-column-state.test.js` — mock a FC instance with `getEvents()` returning objects that have `extendedProps.planningEvent` and a `setProp` spy; assert `setActiveFcInstance(cal)` stores the reference; assert `syncSelectionClasses()` calls `fcEvent.setProp('classNames', [...])` with correct modifier class array; assert `handleFcEventClick` updates `_sharedSelectedIds` and calls `syncSelectionClasses()`; verify tests FAIL (RED) before T006

**Checkpoint**: Factory implemented and unit-tested; column-state tests written and red.

---

## Phase 2: Migrate Existing FC Consumers to Factory

**Purpose**: Route the already-working Bookings calendar and main calendar through the factory so all four FC surfaces share the same creation path. These are safe refactors — behaviour must be identical before and after.

**Dependencies**: T002 complete.

- [ ] T004 [US5] Migrate `js/planning-view-bookings.js` — replace `new FullCalendar.Calendar(container, { ...sharedTimeGridOptions(), ... })` with `const instance = createTimegridColumn(container, { view: 'timeGridDay', date, mode: 'interactive', callbacks: { select, eventClick, eventDrop, eventResize, ...overlayHooks.calendarCallbacks } })` and use `instance.cal` wherever `cal` is referenced; add `import { createTimegridColumn }` from `./calendar-config.js`; remove direct `import { sharedTimeGridOptions }` if no longer needed; verify existing Playwright planning-view tests still pass

- [ ] T005 [US5] Migrate `js/calendar.js` — replace `new FullCalendar.Calendar(el, { ...sharedTimeGridOptions(), ... })` (line ~315) with `const instance = createTimegridColumn(el, { view: 'timeGridWeek', date: initialDate, mode: 'interactive', headerToolbar: { left: ..., center: ..., right: ... }, hiddenDays: [...], callbacks: { ...all existing callbacks } })`; use `instance.cal` for all subsequent `calendar.*` calls; verify existing Playwright calendar tests still pass

- [ ] T006 [P] [US5] Update `js/knowledge.topics.json` — add `createTimegridColumn` to the entry for `calendar-config.js` so the AI knowledge router can locate the factory

**Checkpoint**: Four FC surfaces all created via `createTimegridColumn()`; no behavioural change; all existing Playwright tests green.

---

## Phase 3: US1 + US2 + US3 (P1) — Replace Outlook Column Div Grid with FC Instance

**Goal**: The Outlook column renders as a real `timeGridDay` FC instance with `contentHeight: 'auto'`, visually identical to the Bookings column. Clicking an Outlook event opens the booking modal. Dragging an Outlook event to the Bookings column triggers the booking flow. Scroll sync works via the outer container with zero JS.

**Independent Test**: Open the Planning View on any day with Outlook connected (or demo mode). The Outlook column grid must be visually identical to the Bookings column grid. Clicking an Outlook event must open the booking modal with the correct time pre-filled. Scrolling the view must keep all three columns in sync.

**Dependencies**: T002, T003 complete.

- [ ] T007 Refactor `js/planning-view-column-base.js` — remove the following exports/functions: `renderTimeGrid()`, `measurePxPerMin()`, `renderColumnCards()`, `_renderTimedCard()`, `_renderAlldayAsTimed()`, `buildCardContent()` internal call site in `renderColumnCards` (keep `buildCardContent()` itself as it moves to FC `eventContent`); extract `export function toTimedEvent(proposal, date)` from the logic inside `_renderAlldayAsTimed` (converts all-day CalendarProposal to timed one spanning `slotMinTime`–`slotMaxTime`); adapt `createColumnState()` per data-model.md: add `setActiveFcInstance(cal)`, `handleFcEventClick(fcEvent, jsEvent)` (extracts pe from `fcEvent.extendedProps.planningEvent`; updates `_sharedSelectedIds`; calls `syncSelectionClasses()`), `handleFcEventDidMount(info)` (sets `info.el.draggable = 'true'`; adds `dragstart` listener calling existing `handleDragStart(e, pe)` for non-excluded events), and update `syncSelectionClasses()` to call `cal.getEvents().forEach(e => e.setProp('classNames', recomputeClassNames(e)))` — verify T003 unit tests turn GREEN

- [ ] T008 [US1] [US2] [US3] Refactor `js/planning-view-outlook.js` — replace the `renderTimeGrid(container, bookingsContainer)` + `renderColumnCards(...)` calls inside `renderOutlookColumn()` with: `const inst = createTimegridColumn(container, { date, mode: 'readonly', callbacks: { eventContent: (arg) => ({ domNodes: buildCardContent(arg.event.extendedProps.planningEvent, arg.event.extendedProps.showDetails) }), eventDidMount: (info) => col.handleFcEventDidMount(info), eventClick: (info) => col.handleFcEventClick(info.event, info.jsEvent) } }); col.setActiveFcInstance(inst.cal); inst.setEvents(toFcEvents(planningEvents, date));`; add `toFcEvents(planningEvents, date)` mapping function (converts `PlanningEvent[]` to FC event objects per data-model.md `FCPlanningEvent` schema, using `toTimedEvent()` for all-day proposals); update `rerenderOutlookColumn()` to call `inst.setEvents(toFcEvents(planningEvents, date))` rather than `renderColumnCards()`; remove import of `renderTimeGrid`, `renderColumnCards`, `measurePxPerMin` from `planning-view-column-base.js`; add import of `createTimegridColumn` from `./calendar-config.js` and `toTimedEvent`, `buildCardContent` from `./planning-view-column-base.js`; add import of `toFcEvents` (local)

- [ ] T009 Remove height-measurement code from `js/planning-view.js` — delete all code that queries `.fc-timegrid-body`, measures its `offsetHeight`/`clientHeight`, and sets pixel height on `.planning-outlook-timed` or any equivalent element; delete any `ResizeObserver` or `MutationObserver` watching the Bookings FC height for the purpose of syncing the Outlook column height; verify the outer `.planning-view-scroll` container now provides scroll for all columns without any per-column height JS

**Checkpoint**: Outlook column is a real FC instance. Grid lines are visually identical to Bookings. Scroll sync works via the outer container. Clicking an Outlook event opens the booking modal with correct times.

---

## Phase 4: US1 + US2 + US3 (P1) — Replace Teams Column Div Grid with FC Instance

**Goal**: The Teams column renders identically to the Outlook column (same FC grid, same visual states, same click-to-book, same drag-to-book). No height measurement JS remains.

**Independent Test**: Open the Planning View with Teams connected (or demo mode: `config.azureClientId: "demo"`). Teams events render in the FC grid. Clicking a Teams event opens the booking modal. Visual appearance of Teams column is identical to Outlook and Bookings columns.

**Dependencies**: T007, T008 complete (reuses adapted `createColumnState()` and `toFcEvents` pattern).

- [ ] T010 [US1] [US2] [US3] Refactor `js/planning-view-teams.js` — apply identical pattern as T008: replace `renderTimeGrid()` + `renderColumnCards()` in `renderTeamsColumn()` with `createTimegridColumn(container, { date, mode: 'readonly', callbacks: { eventContent, eventDidMount, eventClick } })`; add `toFcEvents(planningEvents, date)` mapping function (same schema as Outlook, adapted for Teams call/meeting record shape); update `rerenderTeamsColumn()` to use `inst.setEvents(toFcEvents(...))`; remove div-grid imports; add factory + base imports

- [ ] T011 Remove remaining height-measurement code from `js/planning-view.js` for the Teams column — same cleanup as T009 but for `.planning-teams-timed` pixel height assignments; verify `js/planning-view.js` contains no remaining references to `.planning-outlook-timed` or `.planning-teams-timed` class names or to `.fc-timegrid-body` height measurement

**Checkpoint**: All three planning-view columns use real FC instances. Visual parity across all three is confirmed. Full scroll sync works. All P1 user stories delivered.

---

## Phase 5: US4 (P2) — CSS DRY Unification

**Goal**: All FC event modifier rules (`--bookable`, `--needs-ticket`, `--break`, `--excluded`, `--covered`, `--selected`) defined once in `css/calendar.css`. All div-grid CSS deleted from `css/planning-view.css`. No FC event or timegrid rules duplicated across CSS files.

**Independent Test**: In DevTools, confirm `.fc-event.planning-event--bookable` computed styles come from `calendar.css`. Confirm `planning-view.css` contains no `.planning-event`, `.planning-time-grid`, or `.planning-grid-slot` selectors.

**Dependencies**: T008, T010 complete (planning-view.css div-grid classes must have zero consumers before deletion).

- [ ] T012 [P] [US4] Add planning-event state modifier rules to `css/calendar.css` — append a clearly-labelled section with: `.fc-event.planning-event--bookable { background: var(--color-bookable-bg); color: var(--color-text); }`, `.fc-event.planning-event--needs-ticket { background: var(--color-needs-ticket-bg); color: var(--color-text); }`, `.fc-event.planning-event--break { background: var(--color-text-muted); color: var(--color-surface); }`, `.fc-event.planning-event--excluded { background: var(--color-surface); color: var(--color-muted); cursor: not-allowed; }`, `.fc-event.planning-event--selected { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }`, `.fc-event.planning-event--covered { opacity: 0.45; }`; verify event card colours match the existing `planning-view.css` values exactly

- [ ] T013 [US4] Delete div-grid and duplicate event CSS from `css/planning-view.css` — remove: `.planning-time-grid { ... }`, `.planning-grid-slot { ... }`, `.planning-grid-slot--minor { ... }`, all `.planning-grid-slot[data-time^='...'] { ... }` band-background blocks, `.planning-outlook-timed { ... }`, `.planning-teams-timed { ... }`, `.planning-event { position: absolute; ... }` (base positioning block), all `.planning-event--bookable`, `--needs-ticket`, `--break`, `--excluded`, `--selected`, `--covered` blocks; run `npm run lint` to verify stylelint passes (no orphaned selectors); verify visually that event colours are unchanged after T012+T013

**Checkpoint**: US4 complete. Zero duplication of FC event or timegrid rules across CSS files.

---

## Phase 6: Polish & Verification

**Purpose**: Quality gates, documentation check, final SQI verification.

- [ ] T014 Run `npm run lint && npm run format:check && npm run typecheck && npm run htmlhint` — fix all issues; expected: 0 errors and 0 warnings

- [ ] T015 Run `npm run dup:check` — verify the jscpd duplication baseline has not increased; if baseline decreased (likely, given deleted div-grid code), run `node scripts/dup-check.mjs --seed` to lock in the new lower baseline

- [ ] T016 Run `npm run test:coverage` — verify all unit tests pass and per-file coverage thresholds hold; expected: T001 and T003 test files push new functions to coverage

- [ ] T017 Run `npm run sqi` — verify composite score remains ≥ 80 (GREEN); current baseline is 97.75; refactor removes ~200 LOC so score should stay the same or improve

- [ ] T018 Run `npm run test:ui` — full Playwright suite; all existing planning-view and calendar tests must pass; fix any regressions before proceeding

- [ ] T019 [P] Check `docs/content.en.md` and `docs/content.de.md` — this is a pure internal refactor with no UX changes; confirm no documentation update is needed; if any user-visible behaviour changed (e.g. event card layout shift), update both files

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (T001–T003)          No dependencies — start immediately
Phase 2 (T004–T006)          Depends on T002 (factory must exist before consumers)
Phase 3 (T007–T009)          T007 depends on T002+T003 (factory + state tests); T008+T009 depend on T007
Phase 4 (T010–T011)          T010 depends on T007 (reuses adapted column state); T011 depends on T010
Phase 5 (T012–T013)          T012 depends on T008+T010 (div-grid consumers must be gone first)
Phase 6 (T014–T019)          Depends on all prior phases complete
```

### User Story Dependencies

- **US5** (T004–T006): Depends on T002 — can run after factory
- **US1+US2+US3 Outlook** (T007–T009): Depends on T007 (column-base refactor)
- **US1+US2+US3 Teams** (T010–T011): Depends on T007 (reuses same column-state interface)
- **US4** (T012–T013): Depends on T008+T010 (div-grid consumers removed)

### Within Each Phase

- T001, T002, T003 are sequential (RED → GREEN → RED for state tests)
- T004, T005, T006 are parallel within Phase 2 (different files; T004 and T005 depend only on T002)
- T007 must precede T008 and T009 (column-base refactor first)
- T008 can start immediately after T007; T009 can start in parallel with T008 (different files)
- T012 and T013 can run in parallel (T012 adds to calendar.css; T013 deletes from planning-view.css)

### Parallel Opportunities

```bash
# Phase 2 (after T002):
T004  # planning-view-bookings.js migration
T005  # calendar.js migration        — different file, run in parallel with T004
T006  # knowledge.topics.json        — different file, run in parallel with T004+T005

# Phase 3 (after T007):
T008  # planning-view-outlook.js
T009  # planning-view.js (Outlook height cleanup) — run after T008 (same intent, different scope)

# Phase 4 (after T007):
T010  # planning-view-teams.js       — can run parallel with T008 (different file)

# Phase 5 (after T008 + T010):
T012  # calendar.css additions
T013  # planning-view.css deletions  — different file, run in parallel with T012
```

---

## Implementation Strategy

### MVP (P1 User Stories — Phases 1–4)

1. Complete Phase 1 (factory + tests) → factory green
2. Complete T004+T005 (existing consumer migrations) → no regression check
3. Complete Phase 3 (Outlook column replacement) → **US1+US2+US3 delivered for Outlook**
4. Complete Phase 4 (Teams column replacement) → **US1+US2+US3 delivered for Teams**
5. **STOP and VALIDATE**: Run `npm run test:ui`; demo Planning View with both columns as real FC instances

### Incremental Delivery

1. Phase 1–2: Factory + migrations (zero visible change; CI stays green)
2. Phase 3: Outlook column as FC → Visual parity confirmed
3. Phase 4: Teams column as FC → Full visual parity confirmed
4. Phase 5: CSS cleanup → DRY compliance
5. Phase 6: Polish → All gates green, PR ready

---

## Notes

- `[P]` = different files, no dependencies on parallel tasks — safe to run simultaneously
- `[USN]` = traceability to user story N from spec.md
- US2 (scroll sync) is not a separate implementation task — it is a structural consequence of US1 (all FC instances with `contentHeight: 'auto'` in the single outer scroll container)
- Commit after each task or logical group (`T-NNN: <description>` commit message convention)
- Run `npm run test:ui:failed` between tasks during Phase 3+4 for fast iteration; run full suite at Phase 6
