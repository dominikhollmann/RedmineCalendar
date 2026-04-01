# Tasks: Calendar View Options and Week Totals

**Input**: Design documents from `/specs/002-calendar-view-totals/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to
- All file paths are relative to the repository root

---

## Phase 1: Setup

*No setup required — this is an extension of an existing vanilla JS project with no new dependencies or build tools.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that both user stories depend on. MUST be complete before US1 or US2 implementation begins.

- [x] T001 Add `STORAGE_KEY_DAY_RANGE` (`'redmine_calendar_day_range'`) exported constant to `js/config.js`

**Checkpoint**: Storage key constant exists and is importable — US1 and US2 can begin.

---

## Phase 3: User Story 1 — Switch Between Workweek and Full-Week View (Priority: P1) 🎯 MVP

**Goal**: A "Full week" pill switch in the calendar toolbar lets the user toggle between 5-day (Mo–Fr) and 7-day (Mo–Sun) views. The chosen state persists across reloads.

**Independent Test**: Open `index.html`, confirm only Mo–Fr columns are shown. Click the "Full week" switch → Sat and Sun columns appear. Click again → back to Mo–Fr. Reload → full-week view is restored. Verify `hiddenDays` in DevTools FullCalendar state.

- [x] T002 [US1] In `js/calendar.js`: import `STORAGE_KEY_DAY_RANGE` from `./config.js`; implement `getInitialHiddenDays()` — reads `localStorage.getItem(STORAGE_KEY_DAY_RANGE)`; returns `[0, 6]` if value is `null` or `'workweek'` (default Mo–Fr), returns `[]` if value is `'full-week'`
- [x] T003 [US1] In `js/calendar.js`: implement `initDayRangeToggle(cal)` — called after `calendar.render()`; queries `.fc-fullWeekToggle-button`; replaces its content with `<span class="wh-switch-label">Full week</span><span class="wh-switch-track [is-on if full-week]"><span class="wh-switch-thumb"></span></span>` (reusing existing CSS from feature 005); click handler: (a) reads current state from `localStorage.getItem(STORAGE_KEY_DAY_RANGE)`; (b) toggles between `'workweek'` and `'full-week'`; (c) writes new value to `STORAGE_KEY_DAY_RANGE`; (d) calls `cal.setOption('hiddenDays', [0,6])` for workweek or `cal.setOption('hiddenDays', [])` for full-week; (e) toggles `.is-on` class on `.fc-fullWeekToggle-button .wh-switch-track`
- [x] T004 [US1] In `js/calendar.js`: update FullCalendar init options to: (a) add `hiddenDays: getInitialHiddenDays()` to the init config; (b) add `customButtons: { fullWeekToggle: { text: '…', click() {} } }` — the real click handler is wired in `initDayRangeToggle`, this is just a placeholder to register the button; (c) update `headerToolbar.right` from `'viewModeToggle'` to `'viewModeToggle fullWeekToggle'`; (d) call `initDayRangeToggle(calendar)` immediately after the existing `initViewModeToggle(calendar)` call

**Checkpoint**: US1 complete — day-range toggle works, state persists across reloads.

---

## Phase 4: User Story 2 — Week Total Hours Display (Priority: P2)

**Goal**: A weekly hours total is always visible in the app header and updates automatically as entries are added, edited, or deleted.

**Independent Test**: With two entries totalling 6h and 2.5h, verify the header shows "8.5 h". Add a 1h entry → "9.5 h". Delete the 2.5h entry → "7 h". Navigate to an empty week → "0 h".

- [x] T005 [P] [US2] In `index.html`: add `<span id="week-total" class="week-total"></span>` to the `.app-header`, between the `<h1 class="app-title">` and the `<a class="settings-link">` elements
- [x] T006 [P] [US2] In `css/style.css`: add `.week-total { font-size: 0.85rem; color: var(--color-muted); font-weight: 500; }` in the app header section
- [x] T007 [US2] In `js/calendar.js`: implement `updateWeekTotal(events)` — sums `ev.extendedProps?.timeEntry?.hours ?? 0` for all events (excluding `_isMidnightContinuation` clones to avoid double-counting); formats the result using the existing `formatHours()` function; sets `document.getElementById('week-total').textContent` to the formatted string (e.g., `"8.5 h"` or `"0 h"`); call `updateWeekTotal(fcEvents)` inside `updateDayTotals(events)` so it is triggered on both initial load and after add/edit/delete operations (which already call `recomputeDayTotals()`)

**Checkpoint**: US2 complete — week total visible, accurate, and updates on every mutation.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T008 Run the full `specs/002-calendar-view-totals/quickstart.md` acceptance checklist manually; tick off each item; note any failures and fix them before marking this task complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Depends on T001 (Foundational complete)
- **US2 (Phase 4)**: Depends on T001 (Foundational); T005 and T006 can start immediately after T001; T007 depends on T005 (needs `#week-total` in DOM)
- **Polish (Phase 5)**: Depends on all implementation tasks complete

### Task-Level Dependencies

```
T001 ──→ T002 ──→ T003 ──→ T004
T001 ──→ T005 [P] (index.html, parallel with T002)
T001 ──→ T006 [P] (css, parallel with anything)
T005 ──→ T007
T004 + T007 ──→ T008
```

### Parallel Opportunities

- T005 (index.html) and T006 (css) touch different files — can run in parallel with each other and with T002
- T006 (CSS only) can run at any point

---

## Parallel Example: Phase 4 (US2)

```
# Can start in parallel after T001:
Task T005: "Add #week-total span to index.html"
Task T006: "Add .week-total CSS rule to css/style.css"

# Sequential after T005:
Task T007: "Implement updateWeekTotal() in js/calendar.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001)
2. Complete Phase 3: US1 (T002–T004)
3. **STOP and VALIDATE**: Open calendar, verify toggle works and state persists
4. Proceed to US2 if validated

### Incremental Delivery

1. T001 → Foundation ready
2. T002–T004 → Day-range toggle works (MVP)
3. T005–T007 → Week total visible and accurate
4. T008 → Full acceptance checklist — feature complete

---

## Notes

- The "Full week" switch reuses `.wh-switch-track` / `.wh-switch-thumb` CSS from feature 005 — no new switch CSS needed.
- `customButtons.fullWeekToggle.click()` in the FullCalendar init is a no-op placeholder. The real handler is attached via `initDayRangeToggle()` after render, matching the pattern from feature 005's `initViewModeToggle()`.
- `updateWeekTotal` must exclude `_isMidnightContinuation` event clones (entries split at midnight) to avoid counting their hours twice.
- Week total covers the full Mon–Sun range regardless of whether Mo–Fr or full-week view is active — it reflects all loaded entries, not just visible ones.
- Commit after each completed task using message format `T00N: <description>`.
