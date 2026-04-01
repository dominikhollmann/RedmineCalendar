# Tasks: Configurable Working Hours and Calendar View Toggle

**Input**: Design documents from `/specs/005-working-hours-view/`
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

**⚠️ CRITICAL**: Both user stories read from the same localStorage keys. These constants and helper functions must exist first.

- [x] T001 Add `STORAGE_KEY_WORKING_HOURS` (`'redmine_calendar_working_hours'`) and `STORAGE_KEY_VIEW_MODE` (`'redmine_calendar_view_mode'`) exported constants to `js/config.js`
- [x] T002 Add `readWorkingHours()` (returns `{ start: 'HH:MM', end: 'HH:MM' } | null` from localStorage), `writeWorkingHours(start, end)` (writes JSON to localStorage), and `clearWorkingHours()` (removes the key from localStorage — FR-011) exported functions to `js/settings.js`, importing `STORAGE_KEY_WORKING_HOURS` from `js/config.js`

**Checkpoint**: Storage helpers exist and are importable — US1 and US2 can now begin.

---

## Phase 3: User Story 1 — Configure Working Hours in Settings (Priority: P1) 🎯 MVP

**Goal**: User can enter a working-day start and end time in settings. The calendar uses these values to set its initial visible time range on load.

**Independent Test**: Open `settings.html`, enter `08:00`–`18:00`, save, navigate to `index.html`, and verify the calendar grid starts at 08:00 and ends at 18:00 (slots outside this range not visible).

- [x] T003 [US1] Add a "Working hours" section to `settings.html` with two `<input type="time">` fields (`id="workStart"` and `id="workEnd"`) inside a `.modal-row` div, placed after the auth fields and before the submit button
- [x] T004 [US1] In `js/settings.js`: on settings page load, call `readWorkingHours()` (defined in the same file by T002 — no import needed) and pre-fill `#workStart` and `#workEnd` inputs with stored values (if any); wire the existing form submit handler to: (a) if both fields are empty, call `clearWorkingHours()` (removes the localStorage key) and save — FR-011; (b) if only one field is filled, show an inline error; (c) if both fields are filled, validate that `workEnd > workStart` as HH:MM strings (show inline error if not), then call `writeWorkingHours(start, end)` on success
- [x] T005 [US1] In `js/calendar.js`: import `readWorkingHours` from `./settings.js`; after `calendar.render()`, call `getEffectiveTimeRange()` (implemented in T007 — stub it as returning `{ slotMinTime: '00:00', slotMaxTime: '24:00' }` for now) and apply its result via `calendar.setOption('slotMinTime', …)` and `calendar.setOption('slotMaxTime', …)`; note: the first-load "working hours default" logic lives inside `getEffectiveTimeRange()` (T007), not here — this task only wires the post-render call

**Checkpoint**: US1 complete — working hours persist and the calendar reflects them on first load.

---

## Phase 4: User Story 2 — Toggle Between Working Hours and 24h View (Priority: P2)

**Goal**: A toggle button in the calendar header lets the user switch between the configured working hours range and the full 24h view at any time. The chosen state persists across reloads.

**Independent Test**: With working hours configured as `08:00`–`18:00`, click the toggle once → calendar expands to 00:00–24:00. Click again → returns to 08:00–18:00. Reload → view mode is restored. Clear `localStorage` key → toggle is greyed out.

- [x] T006 [P] [US2] Add a `.fc-toggle-disabled` CSS rule to `css/style.css` that greys out the button (`opacity: 0.45`, `cursor: not-allowed`, `pointer-events: none`) for use when the toggle is in the disabled state
- [x] T007 [US2] In `js/calendar.js`: implement `getEffectiveTimeRange()` — reads `readWorkingHours()` and `localStorage.getItem(STORAGE_KEY_VIEW_MODE)`; returns `{ slotMinTime, slotMaxTime }` per these rules: (a) if no working hours configured → `'00:00'`/`'24:00'`; (b) if view mode is `'working'` and working hours exist → use configured start/end; (c) if view mode is `null` (never stored) AND working hours exist → write `'working'` to `STORAGE_KEY_VIEW_MODE` as a side effect and return the configured start/end (this handles the first-load case from FR-004 without a separate post-init correction); (d) otherwise → `'00:00'`/`'24:00'`; import `STORAGE_KEY_VIEW_MODE` from `js/config.js`
- [x] T008 [US2] In `js/calendar.js`: implement `initViewModeToggle(cal)` — adds a `customButtons` entry named `'viewModeToggle'` to the FullCalendar config (add to `headerToolbar.right`); the button click handler: (a) reads current view mode from localStorage; (b) toggles it between `'working'` and `'24h'`; (c) saves new value to `STORAGE_KEY_VIEW_MODE`; (d) calls `cal.setOption('slotMinTime', …)` and `cal.setOption('slotMaxTime', …)` using `getEffectiveTimeRange()`; (e) updates button text to reflect new state (`'24h view'` or `'Working hours'`); button is rendered disabled (add/remove `.fc-toggle-disabled` class) when `readWorkingHours()` returns null
- [x] T009 [US2] In `js/calendar.js`: update the FullCalendar init options to: (a) include `customButtons: { viewModeToggle: { … } }` (wired from `initViewModeToggle`); (b) set `headerToolbar.right: 'viewModeToggle'`; (c) call `getEffectiveTimeRange()` to set the initial `slotMinTime`/`slotMaxTime` at init time (replacing the static `START_HOUR`/`END_HOUR` string construction); (d) remove the now-redundant `START_HOUR`/`END_HOUR` import from `js/config.js` if they are no longer referenced elsewhere; call `initViewModeToggle(calendar)` after `calendar.render()`
- [x] T010 [US2] In `js/calendar.js`: handle the edge case where working hours are `00:00`–`24:00` (midnight-to-midnight) — `getEffectiveTimeRange()` should return `'00:00'`/`'24:00'` for both modes in that case, making the toggle a no-op visually; verify no error is thrown and the toggle remains enabled

**Checkpoint**: US2 complete — toggle works, state persists, disabled state shown correctly when unconfigured.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T011 Run the full `specs/005-working-hours-view/quickstart.md` acceptance checklist manually; tick off each item; note any failures and fix them before marking this task complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Depends on T001 + T002 (Foundational complete)
- **US2 (Phase 4)**: Depends on T001 + T002 (Foundational) AND T005 (US1 calendar integration)
- **Polish (Phase 5)**: Depends on all implementation tasks complete

### Task-Level Dependencies

```
T001 ──→ T002 ──→ T004 (settings form wiring)
T001 ──→ T005 (calendar initial range) ──→ T007 ──→ T008 ──→ T009 ──→ T010
T003 (HTML fields, parallel with T002)
T006 (CSS, parallel with anything)
T011 (after all above)
```

### Parallel Opportunities

- T003 and T002 touch different files — can run in parallel
- T006 (CSS only) can run at any point during Phase 4

---

## Parallel Example: Phase 4 (US2)

```
# Can start in parallel:
Task T006: "Add .fc-toggle-disabled CSS rule to css/style.css"

# Sequential (all in js/calendar.js):
Task T007: "Implement getEffectiveTimeRange()"
  → Task T008: "Implement initViewModeToggle()"
    → Task T009: "Update FullCalendar init options"
      → Task T010: "Handle midnight-to-midnight edge case"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001–T002)
2. Complete Phase 3: US1 (T003–T005)
3. **STOP and VALIDATE**: Open settings, configure working hours, verify calendar reflects them
4. Proceed to US2 if validated

### Incremental Delivery

1. T001–T002 → Foundation ready
2. T003–T005 → Working hours configurable + calendar uses them (MVP)
3. T006–T010 → Toggle works, state persisted, disabled state handled
4. T011 → Full acceptance checklist run — feature complete

---

## Notes

- `START_HOUR` and `END_HOUR` in `js/config.js` are currently `0` and `24` (set by the quick fix on this branch). Task T009 removes the dependency on these constants in `js/calendar.js` — they may be removed from `js/config.js` entirely if nothing else references them after this feature.
- The `readWorkingHours()` function in T002 lives in `js/settings.js` but is also imported by `js/calendar.js` — this cross-import is intentional per the plan (settings.js is the canonical storage accessor).
- No Redmine API calls are involved in this feature — all state is localStorage only.
- Commit after each completed task using message format `T00N: <description>`.
