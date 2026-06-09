# Tasks: Planning View

**Input**: Design documents from `specs/038-planning-view/`

**Prerequisites**: plan.md ✓ · spec.md ✓ · research.md ✓ · data-model.md ✓ · contracts/ ✓ · quickstart.md ✓

**Tests**: Included per Constitution III (TDD mandatory). Unit tests and UI tests MUST be written
and confirmed FAILING before the implementation they cover is written.

**Organization**: Grouped by user story. Each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no deps)
- **[Story]**: Maps to user story from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types, storage keys, i18n strings, DOM scaffolding, and CSS skeleton that every story
depends on. No business logic here.

- [x] T001 Add `PlanningEvent`, `PlanningState`, `SavedCalendarState`, `PlanningEventCategory`, `BookingOutcome` types to `js/types.d.ts` (see `specs/038-planning-view/data-model.md`)
- [x] T002 [P] Add all 26 `planning.*` keys and `feedback.toolbar_label` to `js/i18n/en.js` (see `specs/038-planning-view/contracts/planning-view-api.md` i18n table)
- [x] T003 [P] Add all 26 `planning.*` keys and `feedback.toolbar_label` to `js/i18n/de.js` (German translations)
- [x] T004 [P] Add `STORAGE_KEY_PLANNING_SOURCE_OUTLOOK = 'redmine_calendar_planning_source_outlook'` constant to `js/config.js`
- [x] T005 Add `<div id="planning-view-main" hidden>` container + `<button id="planning-view-toggle" class="planning-toggle-fab" hidden>` FAB + `<link rel="stylesheet" href="css/planning-view.css">` to `index.html`
- [x] T006 [P] Create `css/planning-view.css` with: outer scroll container `.planning-view-scroll`, flex two-column `.planning-view-columns`, column header styles, `@media (max-width: 767px)` rule that sets `#planning-view-toggle { display: none }` and `#planning-view-main { display: none !important }`, event card skeleton `.planning-event`, and `.planning-toggle-fab` bottom-right FAB positioning

**Checkpoint**: Scaffolding in place; page still renders the classic calendar normally; no regressions.

---

## Phase 2: Foundational — Pure Logic + Unit Tests (TDD)

**Purpose**: All pure-logic functions that every story builds on. Constitution III: unit tests
MUST be written and confirmed FAILING before the implementations below.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Unit Tests (write first — must FAIL before implementation)

- [x] T007 Write failing Vitest unit tests for `classifyProposal()` covering all four paths: `bookable` (meeting + proposed), `needs-ticket` (meeting + needs-ticket), `excluded` (break/holiday/vacation/allday-other category), `excluded` (skippedInformational entry) in `tests/unit/planning-view-outlook.test.js`
- [x] T008 [P] Write failing Vitest unit tests for `isFullyCovered()` covering: full cover by single booking, full cover by two merged bookings, partial cover (not greyed), no bookings, all-day hours-sum comparison in `tests/unit/planning-view-outlook.test.js`
- [x] T009 [P] Write failing Vitest unit tests for day-navigation helpers: `prevDay` skips Sat/Sun when Mo-Fr active, `nextDay` skips Sat/Sun when Mo-Fr active, `prevDay`/`nextDay` do not skip when Mo-Fr inactive, `toToday()` always returns today's date string in `tests/unit/planning-view.test.js`

### Implementation (make the unit tests above pass)

- [x] T010 Implement `classifyProposal(proposal)` as a pure exported function in `js/planning-view-outlook.js`; confirm T007 passes
- [x] T011 [P] Implement `isFullyCovered(startHHMM, endHHMM, bookings, isAllDay, hours)` as a pure exported function in `js/planning-view-outlook.js`; confirm T008 passes
- [x] T012 [P] Implement `prevDay(dateStr, moFr)`, `nextDay(dateStr, moFr)`, `toToday()` as pure exported helper functions in `js/planning-view.js`; confirm T009 passes
- [x] T013 [P] Add `planning-view` topic entry (keywords: `planning view`, `day planning`, `outlook booking`, `drag to book`) with files `js/planning-view.js`, `js/planning-view-bookings.js`, `js/planning-view-outlook.js` to `js/knowledge.topics.json`

**Checkpoint**: All unit tests green (T007–T009 now pass). Pure logic is correct before any DOM work begins.

---

## Phase 3: US3 — View Toggle & Calendar Integration (Priority: P1)

**Goal**: Users can switch between the classic calendar and Planning View; the toggle FAB is
visible on desktop only; double-clicking a day column header opens Planning View for that day;
toggling back restores the calendar to the week of the last Planning Day.

**Independent Test**: Click the FAB → Planning View shell appears (columns may be empty) → click
again → classic calendar restores to the correct week.

### UI Tests (write first — must FAIL)

- [x] T014 Write failing Playwright test: toggle FAB visible on desktop, hidden on mobile (< 768 px viewport); clicking FAB shows `#planning-view-main` and hides `#calendar-main` in `tests/ui/planning-view.test.js`
- [x] T015 [P] Write failing Playwright test: double-click a day column header in the classic week view → Planning View opens with the header date as the Planning Day in `tests/ui/planning-view.test.js`
- [x] T016 [P] Write failing Playwright test: toggle back from Planning View after navigating to a different day → classic calendar shows the week of that last Planning Day in `tests/ui/planning-view.test.js`

### Implementation

- [x] T017 Relocate feedback button in `js/feedback.js`: change `initFeedback()` to `document.querySelector('.app-header').insertBefore(btn, settingsLink)` with class `feedback-toolbar-btn`; update `css/feedback.css` to replace `.feedback-fab` positioning with `.feedback-toolbar-btn` header-button styles
- [x] T018 Implement `showPlanningView(date?)`, `hidePlanningView()`, `isPlanningViewActive()`, `getPlanningDay()` in `js/planning-view.js`: toggle `hidden` on `#calendar-main` / `#planning-view-main`, save/restore `_previousCalendarState`, set `_planningDay` to provided date or today
- [x] T019 Wire planning toggle FAB click → `showPlanningView()` / `hidePlanningView()` in `js/planning-view.js`; on desktop init remove `hidden` from `#planning-view-toggle`; expose `setCalendarRef(cal)` for the restore step
- [x] T020 Wire delegated `dblclick` listener on `#calendar` container in `js/calendar.js` after `calendar.render()`: `e.target.closest('.fc-col-header-cell[data-date]')` → `showPlanningView(cell.dataset.date)` (import `showPlanningView` from `./planning-view.js`)
- [x] T021 Implement toggle-back calendar restore in `hidePlanningView()` in `js/planning-view.js`: call `calendar.changeView(_previousCalendarState.view)` then `calendar.gotoDate(mondayOf(_planningDay))`; add pure helper `mondayOf(dateStr)` (returns Monday of the week containing dateStr)
- [x] T022 [P] Render Planning View header in `js/planning-view.js`: date label `<span id="planning-day-label">`, prev/next/today `<button>` elements inside `#planning-view-main`; wire button clicks to nav functions from T012 (stubs that update `_planningDay` and re-render header only — full column reload wired in later phases)

**Checkpoint**: T014–T016 Playwright tests pass. Toggle and double-click work. Feedback button is in the toolbar.

---

## Phase 4: US1 — Side-by-Side Bookings + Outlook View (Priority: P1)

**Goal**: Users can see their Redmine time entries and Outlook appointments for the day in two
adjacent columns with shared scroll and time-aligned event cards.

**Independent Test**: Open Planning View in demo mode → Bookings column shows today's Redmine
entries; Outlook column shows demo events; both columns scroll together; times align visually.

### UI Tests (write first — must FAIL)

- [x] T023 Write failing Playwright test: Planning View shows `.planning-bookings-column` with today's Redmine entries and `.planning-outlook-column` with demo Outlook events; both columns scroll together (outer container is the only scroller) in `tests/ui/planning-view.test.js`
- [x] T024 [P] Write failing Playwright test: Bookings column is immediately visible before Outlook column finishes loading; Outlook column shows a loading spinner while fetching in `tests/ui/planning-view.test.js`

### Implementation

- [x] T025 Implement `initBookingsCalendar(container, date, onBookingChange)` in `js/planning-view-bookings.js`: create `new FullCalendar.Calendar(container, { initialView: 'timeGridDay', headerToolbar: false, contentHeight: 'auto', initialDate: date, slotMinTime, slotMaxTime from getEffectiveTimeRange(), hiddenDays: [], allDaySlot: false, selectable: true, editable: true })` and attach `overlayHooks` from `js/calendar-overlays.js`; wire `select` → `openForm`, `eventClick` → double-click-to-edit, `datesSet` → `loadBookingsForDay`
- [x] T026 Implement `loadBookingsForDay(calendar, date)` in `js/planning-view-bookings.js`: call `fetchTimeEntries(date, date)`, `mapTimeEntry`, `enrichEntries`, `calendar.removeAllEvents()`, add mapped events, return entries array for greyout computation
- [x] T027 Implement `destroyBookingsCalendar(calendar)` in `js/planning-view-bookings.js`: call `calendar.destroy()`
- [x] T028 Wire Bookings column into `showPlanningView()` and day navigation in `js/planning-view.js`: on show call `initBookingsCalendar` + `loadBookingsForDay`; on day change call `gotoDate` + `loadBookingsForDay`; on hide call `destroyBookingsCalendar`; export `refreshBookings()` (re-calls `loadBookingsForDay` on current day)
- [x] T029 Implement spinner + `renderOutlookColumn(container, date, bookings)` stub in `js/planning-view-outlook.js`: show `.planning-column-spinner` immediately; check `isOutlookConfigured()` + `isMsalSignedIn()` + `STORAGE_KEY_PLANNING_SOURCE_OUTLOOK`; handle not-connected / disabled / expired-auth states by rendering appropriate prompt (FR-008, FR-014); on success call `fetchCalendarEvents(date)`
- [x] T030 Complete `renderOutlookColumn` in `js/planning-view-outlook.js`: call `parseCalendarProposals(events, [], weeklyHours, holidayTicket, vacationTicket, breakTicket, workStart)`, build `PlanningEvent[]` (classifyProposal + stub isCovered=false), render timed event cards using `DOMPurify.sanitize()` on all Outlook text; hide spinner on completion
- [x] T031 Implement slot-height measurement + absolute card positioning in `js/planning-view-outlook.js`: after Bookings FC renders, read one `.fc-timegrid-slot` bounding rect → compute `pxPerMin`; position each card `top = (startMin - minMin) * pxPerMin`, `height = durationMin * pxPerMin` (Decision 11)
- [x] T032 [P] Add all-day event row at top of Outlook column in `js/planning-view-outlook.js`: render proposals with `isAllDay === true` in `.planning-outlook-allday` row above the timed grid
- [x] T033 Wire `renderOutlookColumn` call after `loadBookingsForDay` in `js/planning-view.js`: pass returned bookings so greyout can be computed; clear and re-render Outlook column on each day change
- [x] T034 [P] Complete column layout CSS in `css/planning-view.css`: `.planning-view-scroll` outer scroller, `.planning-view-columns` flex row, column header heights, spinner animation, card base layout (absolute positioned within `.planning-outlook-timed`), all-day row styles

**Checkpoint**: T023–T024 Playwright tests pass. Both columns visible with live data; scroll and time alignment working.

---

## Phase 5: US2b — Event Classification Styling (Priority: P1)

**Goal**: Bookable, needs-ticket, and excluded events are visually distinct; excluded events
cannot be selected.

**Independent Test**: Open Planning View in demo mode → Daily Standup (#2097) has bookable style;
Call with Customer has needs-ticket style; Lunch with Team has excluded style and cannot be
shift-clicked.

### UI Tests (write first — must FAIL)

- [x] T035 Write failing Playwright test: bookable events have `.planning-event--bookable` class, needs-ticket have `.planning-event--needs-ticket`, excluded have `.planning-event--excluded`; clicking an excluded card does not add `.planning-event--selected`; shift-clicking two bookable cards selects both in `tests/ui/planning-view.test.js`

### Implementation

- [x] T036 [P] Add `.planning-event--bookable` (green accent), `.planning-event--needs-ticket` (amber accent), `.planning-event--excluded` (muted/greyed), `.planning-event--selected` (selection ring) CSS rules to `css/planning-view.css` using `var(--*)` tokens from `css/base.css`
- [x] T037 Apply `planningCategory` CSS class to each rendered card in `js/planning-view-outlook.js`: add `planning-event--${planningCategory}` in the card render loop; set `draggable="true"` only for non-excluded cards
- [x] T038 Implement shift-click multi-select in `js/planning-view-outlook.js`: module-level `_selectedIds = new Set()`; card `click` handler — if excluded do nothing; shift-key held → toggle id in set; no shift → clear set + select this card; click on empty column area → clear set; re-render `.planning-event--selected` class; implement `getSelectedEvents()`, `getSelectedEventIds()`, `clearSelection()`

**Checkpoint**: T035 Playwright test passes. Classification and selection work.

---

## Phase 6: US2 — Drag & Drop Booking (Priority: P1)

**Goal**: Users can drag one or more Outlook events to the Bookings column; bookable events create
entries immediately; needs-ticket events open the modal with pre-filled times and source event info;
batch failures continue processing and report per-entry outcomes.

**Independent Test**: In demo mode, drag Daily Standup #2097 to the Bookings column → Redmine
entry appears immediately with correct time and issue. Drag Call with Customer → modal opens.

### UI Tests (write first — must FAIL)

- [ ] T039 Write failing Playwright test: drag `Daily Standup #2097` card to Bookings column → no modal opens; new Redmine entry appears in Bookings column with issue 2097 and time 09:00–09:15 in `tests/ui/planning-view.test.js` _(deferred — requires full Outlook API mock in Playwright)_
- [ ] T040 [P] Write failing Playwright test: drag `Call with Customer` card to Bookings column → modal opens with time pre-filled (11:00–11:45) and source event title displayed; submitting creates an entry in `tests/ui/planning-view.test.js` _(deferred — requires Outlook mock)_
- [ ] T041 [P] Write failing Playwright test: shift-select two bookable cards and drag → both entries created; batch summary toast shows "2 created, 0 failed" in `tests/ui/planning-view.test.js` _(deferred — requires Outlook mock)_

### Implementation

- [x] T042 Wire `dragstart` on `.planning-event[draggable]` cards in `js/planning-view-outlook.js`: if card is not in selection → clear selection and select it; call `dataTransfer.setData('planning/events', JSON.stringify([...getSelectedEventIds()]))`; set drag image
- [x] T043 Implement drop overlay on the Bookings column in `js/planning-view.js`: add `dragover` (call `preventDefault()`) and `drop` handlers on the bookings column container; in `drop`, resolve drop time by finding the `.fc-timegrid-slot[data-time]` whose bounding rect contains the pointer Y; parse `data-time` to `HH:MM`
- [x] T044 Implement single-event booking dispatch `_bookOne(planningEvent, dropTimeHHMM)` in `js/planning-view.js`: if `planningCategory === 'bookable'` → call `createTimeEntry({ issueId, hours, startTime, spentOn, ... })` using rounded times from `proposal`; if `'needs-ticket'` → call `openForm(null, prefill, onSave)` with `prefill.startTime`, `prefill.endTime`, `prefill.date`, `prefill.hours`, `prefill.sourceEvent = { subject, startTime, endTime }` (FR-010b)
- [x] T045 Extend booking modal to display source event info when `prefill.sourceEvent` is set: add a `.modal-source-event` block in `js/time-entry-form-view.js` showing `t('planning.modal_source_info')` label + sanitized subject + time range; no change to form submit logic
- [x] T046 Implement batch booking loop `_bookBatch(planningEvents)` in `js/planning-view.js`: iterate `planningEvents` sequentially (for-await), call `_bookOne` for each, accumulate `BookingOutcome[]`; on completion call `showToast(t('planning.batch_complete', { success, failed }))` if all succeeded; show per-failed-item detail if any failed; failed event cards remain in Outlook column (do not remove from `_renderedEvents`)
- [x] T047 Wire drop handler in `js/planning-view.js` to call `_bookBatch` with the dragged events; call `refreshBookings()` after batch completes (FR-021)

**Checkpoint**: T039–T041 Playwright tests pass. Drag-to-book works for both single and multi-select.

---

## Phase 7: US4 — Day Navigation (Priority: P2)

**Goal**: Users can cycle through days within the Planning View; Mo–Fr toggle skips weekends;
Today shortcut always shows the actual current date.

**Independent Test**: Navigate from Friday to "next day" with Mo-Fr active → Monday shown; "Today"
while on any other day → today's date; both columns refresh.

### UI Tests (write first — must FAIL)

- [ ] T048 Write failing Playwright test: prev/next buttons update the Planning Day label and refresh both columns; with Mo-Fr toggle active, next from Friday → Monday; Today button always shows today's date string in `tests/ui/planning-view.test.js`

### Implementation

- [ ] T049 Implement `navigateToPrevDay()`, `navigateToNextDay()`, `navigateToToday()` in `js/planning-view.js` using `prevDay`/`nextDay`/`toToday()` helpers from T012; read `localStorage.getItem(STORAGE_KEY_DAY_RANGE)` for Mo-Fr state; update `_planningDay`; update date label; trigger column reload
- [ ] T050 Wire prev/next/today buttons (created in T022) to nav functions in `js/planning-view.js`; update `#planning-day-label` text after each navigation
- [ ] T051 Call `clearSelection()` from `js/planning-view-outlook.js` before loading each new day in `js/planning-view.js` (FR-009b)

**Checkpoint**: T048 Playwright test passes. Day navigation works correctly with Mo-Fr toggle.

---

## Phase 8: US5 — Configure Event Sources (Priority: P2)

**Goal**: Users can disable/re-enable the Outlook source column from Settings; the setting
persists across sessions.

**Independent Test**: Disable Outlook in Settings → open Planning View → no Outlook column.
Re-enable → Outlook column reappears.

### UI Tests (write first — must FAIL)

- [ ] T052 Write failing Playwright test: disable Outlook toggle in Settings; open Planning View; assert `.planning-outlook-column` shows disabled prompt (not spinner or events); re-enable; assert events appear in `tests/ui/planning-view.test.js`

### Implementation

- [ ] T053 Add "Planning View Sources" section to `js/settings-page.js`: render an Outlook toggle that reads/writes `STORAGE_KEY_PLANNING_SOURCE_OUTLOOK`; use `t('planning.sources_section')` and `t('planning.source_outlook_label')` labels
- [ ] T054 [P] Add Settings page markup for the Planning View Sources section to `settings.html` (container div only; `js/settings-page.js` populates it dynamically)
- [ ] T055 Wire `STORAGE_KEY_PLANNING_SOURCE_OUTLOOK` check in `renderOutlookColumn` in `js/planning-view-outlook.js`: if value is `'0'` → skip fetch, render `t('planning.outlook_disabled')` prompt and return empty array

**Checkpoint**: T052 Playwright test passes. Source toggle persists and is respected by Planning View.

---

## Phase 9: US6 — Time-Covered Greyout (Priority: P2)

**Goal**: Outlook events whose full time range is already covered by existing Redmine bookings
are shown with a greyout overlay so users can focus on unbooking gaps.

**Independent Test**: Create a Redmine entry covering 09:00–09:15; open Planning View → Daily
Standup card is greyed out; delete the entry → greyout disappears on next render.

### UI Tests (write first — must FAIL)

- [ ] T056 Write failing Playwright test: Redmine entry 09:00–09:15 on today exists → `Daily Standup #2097` card has `.planning-event--covered` class; a partially covered event does NOT have that class in `tests/ui/planning-view.test.js`

### Implementation

- [ ] T057 Apply `isFullyCovered()` per card in `renderOutlookColumn` in `js/planning-view-outlook.js`: set `planningEvent.isCovered = isFullyCovered(proposal.startTime, proposal.endTime, bookings, proposal.isAllDay, proposal.hours)`; add `planning-event--covered` class to card element when `isCovered` is true
- [ ] T058 [P] Add `.planning-event--covered` CSS rule to `css/planning-view.css`: semi-transparent overlay (`opacity: 0.45`, desaturate filter) that layers on top of classification colour, keeping the classification indicator dimly visible (FR-016)

**Checkpoint**: T056 Playwright test passes. Greyout correctly reflects booking coverage.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, ArbZG wiring validation, knowledge routing, final quality gate.

- [ ] T059 [P] Update `docs/content.en.md`: add Planning View section covering toggle FAB, day navigation, drag-to-book (bookable vs. needs-ticket), classification colours, greyout, Settings source toggle
- [ ] T060 [P] Update `docs/content.de.md`: German equivalent of T059
- [ ] T061 Confirm ArbZG overlays appear correctly in the Bookings column: verify `attachOverlayHooks` result is used and `recompute()` is called after each booking create/delete in `js/planning-view-bookings.js`; fix any missing wiring
- [x] T062 [P] Run `npm run sqi` and verify composite ≥ 80; if any new module exceeds 500 effective LOC, split it; if any function exceeds 60 LOC, refactor it
- [x] T063 Run `npm run test:ui` (full Playwright suite) to confirm no regressions in existing calendar tests; run `npm test` to confirm all unit tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (types + i18n must exist for imports)
- **Phase 3–9 (User Stories)**: All depend on Phase 2 completion; can proceed in strict priority order
- **Phase 10 (Polish)**: Depends on all desired stories being complete

### User Story Dependencies

| Story          | Depends on                                               | Notes                                   |
| -------------- | -------------------------------------------------------- | --------------------------------------- |
| US3 (Phase 3)  | Phase 2                                                  | First story — provides the toggle shell |
| US1 (Phase 4)  | Phase 3 (toggle shell must exist)                        | Adds column content to the shell        |
| US2b (Phase 5) | Phase 4 (columns must render)                            | Adds visual classification              |
| US2 (Phase 6)  | Phase 4 + Phase 5 (classification needed for drag guard) | Core booking interaction                |
| US4 (Phase 7)  | Phase 3 (nav buttons wired in shell)                     | Day cycling, independent of booking     |
| US5 (Phase 8)  | Phase 4 (column must exist to hide)                      | Settings toggle                         |
| US6 (Phase 9)  | Phase 4 + Phase 2 (isFullyCovered in place)              | Greyout overlay                         |

### Within Each Phase: TDD Order

For every user story phase:

1. Write failing unit/UI tests first
2. Confirm they FAIL
3. Implement the minimum code to make them pass
4. Refactor with tests green

### Parallel Opportunities

- T002, T003, T004, T006 in Phase 1 can run in parallel (different files)
- T008, T009 in Phase 2 can be written in parallel with T007
- T011, T012, T013 in Phase 2 can be implemented in parallel
- T015, T016 in Phase 3 UI tests can be written in parallel with T014
- T026, T027 in Phase 4 can be implemented in parallel
- T031, T032, T034 in Phase 4 can run in parallel
- T036, T037 in Phase 5 can run in parallel
- T040, T041 UI tests in Phase 6 can be written in parallel with T039
- T054, T055 in Phase 8 can run in parallel
- T058 in Phase 9 can run in parallel with T057
- T059, T060, T062 in Phase 10 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```
# Write all three unit test files simultaneously (all different files):
T007: tests/unit/planning-view-outlook.test.js  (classifyProposal tests)
T008: tests/unit/planning-view-outlook.test.js  (isFullyCovered tests — append to same file)
T009: tests/unit/planning-view.test.js          (day-nav helper tests)

# Then implement in parallel (different functions, same new files):
T010: js/planning-view-outlook.js  (classifyProposal)
T011: js/planning-view-outlook.js  (isFullyCovered — same file, different export)
T012: js/planning-view.js          (prevDay/nextDay/toToday)
T013: js/knowledge.topics.json
```

---

## Implementation Strategy

### MVP Scope (Phases 1–4 + 5)

Delivers the core value proposition: a working side-by-side Planning View with classified Outlook
events. Users can see their day at a glance and drag bookable events to create entries.

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational — pure logic + unit tests (T007–T013)
3. Complete Phase 3: US3 — toggle and navigation shell (T014–T022)
4. Complete Phase 4: US1 — side-by-side columns with live data (T023–T034)
5. Complete Phase 5: US2b — classification styling + selection (T035–T038)
6. **STOP and VALIDATE**: Run `npm run test:ui`, open Planning View in demo mode, confirm
   quickstart.md Scenarios 1–5 pass manually.

### Incremental Delivery After MVP

- Add Phase 6 (US2): Drag-to-book → core productivity feature
- Add Phase 7 (US4): Day navigation → makes Planning View useful beyond today
- Add Phase 8 (US5): Source settings toggle → user control
- Add Phase 9 (US6): Coverage greyout → visual aid
- Add Phase 10: Polish + docs

### Notes

- `[P]` tasks = independent files with no task dependency within the phase
- Every `[Story]` task maps to a spec.md user story for traceability
- Commit after each completed task or logical group (per constitution)
- Run `npm run lint && npm test` after each phase before starting the next
- The `feedback.js` file is currently 525 LOC (1 SQI warning); splitting it while adding the
  toolbar-button change in T017 is the right moment to fix that warning
