# Tasks: Multi-Day Planning Event Expansion

**Feature**: 050-long-outlook-events
**Branch**: `claude/long-outlook-events-ey1jkt`
**Input**: Design documents from `specs/050-long-outlook-events/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Unit tests (Vitest) for pure logic per Constitution III + Playwright E2E for the full D&D flow.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in each description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working branch is on latest `main`; no new files or dependencies to scaffold (all existing infra reused).

- [x] T001 Verify `claude/long-outlook-events-ey1jkt` is rebased on `origin/main` and `git log --oneline -5` shows a clean base

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure `expandToWeekdays` function — the date-math core that ALL user stories depend on. Must be green before any story-phase work begins.

**⚠️ CRITICAL**: No user-story implementation can begin until T002 and T003 are complete and all unit tests pass.

- [x] T002 Write failing Vitest unit tests for `expandToWeekdays(startDate, endDate)` covering: basic Mon–Fri expansion, weekend-only event (empty result), cross-month event, single weekday, event starting on Saturday, event starting on Sunday — in `tests/unit/planning-bulk-drop.test.js`
- [x] T003 Create `js/planning-bulk-drop.js` and implement `expandToWeekdays(startDate, endDate) → string[]` (YYYY-MM-DD) using a UTC cursor loop with `getUTCDay()` 1–5 filter — make T002 tests green
- [x] T004 [P] Add 4 toast/guard i18n keys to `js/i18n/en.js` and `js/i18n/de.js`: `outlook.bulk_booked` ("{n} entries booked" / "{n} Einträge gebucht"), `outlook.bulk_none_weekdays` ("No weekday entries in this event — nothing booked" / "Keine Werktage in diesem Ereignis — nichts gebucht"), `outlook.bulk_weekly_hours_missing` ("Configure weekly hours in Settings first" / "Bitte zuerst Wochenstunden in den Einstellungen konfigurieren"), `outlook.bulk_partial` ("{n} of {total} entries booked — {failed} failed" / "{n} von {total} Einträgen gebucht — {failed} fehlgeschlagen") — a 5th key (`outlook.bulk_day_notice`) is added by T005

**Checkpoint**: `npm test` passes; `expandToWeekdays` is fully covered; i18n keys exist in both locales.

---

## Phase 3: User Stories 1 & 2 — Core Multi-Day Drop + Weekend Exclusion (Priority: P1) 🎯 MVP

**Goal**: A multi-day planning event dropped onto the calendar creates one time entry per Mon–Fri (skipping Sat/Sun), asks for ticket info exactly once via the existing modal, shows a banner with the day count, and wraps the entire batch in a single undo step. US1 and US2 share the same implementation path — the `expandToWeekdays` function (T003) already handles weekend exclusion.

**Independent Test (US1)**: Drag a 14-day planning event → confirm exactly 10 entries created, modal opened once, modal banner shows "10 days will be booked", toast shows "10 entries booked", Ctrl+Z removes all 10 in one step.

**Independent Test (US2)**: Drag a Thu–Tue planning event → confirm exactly 4 entries created (Thu, Fri, Mon, Tue); no Sat/Sun entries.

### Implementation for User Stories 1 & 2

- [x] T005 [US1] Extend `openForm` call signature in `js/time-entry-form-view.js` to render a `<p class="bulk-day-notice">` banner (e.g. "10 days will be booked") when `prefill.bulkDayCount` is set; add the `outlook.bulk_day_notice` i18n key (`"{n} days will be booked"` / `"{n} Tage werden gebucht"`) to `js/i18n/en.js` and `js/i18n/de.js`; no-op when `bulkDayCount` is absent or ≤ 1
- [x] T006 [US1] Implement `bookLongPlanningEvent(planningEvent, planningDay, refreshFn)` in `js/planning-bulk-drop.js` — full orchestration: (1) call `expandToWeekdays(rawEvent.start.slice(0,10), rawEvent.end.slice(0,10))`; (2) if zero dates → `showToast(t('outlook.bulk_none_weekdays'))`, return; (3) if `planningCategory === 'needs-ticket'` → `openForm` with `prefill.bulkDayCount` and modal cancel guard; (4) dispatch `undo:batchbegin`; (5) loop `createTimeEntry` for all dates (hours = `readWeeklyHours() / 5`); (6) dispatch `undo:batchend` (coalescing layer collapses pushes into one `bulk-add` step); (7) `showToast(t('outlook.bulk_booked', { n: actualCount }))`; (8) call `refreshFn()`
- [x] T007 [US1] Add weekly-hours guard at entry of `bookLongPlanningEvent` in `js/planning-bulk-drop.js`: if `readWeeklyHours()` returns null → `showToast(t('outlook.bulk_weekly_hours_missing'))`; return immediately without booking
- [x] T008 [US1] Add partial-failure handling inside the `createTimeEntry` loop in `js/planning-bulk-drop.js`: catch per-entry errors, accumulate a `failed` count, emit `t('outlook.bulk_partial', { n: succeeded, total: dates.length, failed })` toast when `failed > 0`; successful entries are still committed to the undo batch
- [x] T009 [US1] Wire multi-day routing in `js/planning-view.js::_onColumnDrop`: import `bookLongPlanningEvent` from `./planning-bulk-drop.js`; add `isMultiDay(rawEvent)` helper (`rawEvent.end.slice(0,10) > rawEvent.start.slice(0,10)`); if any event in the drop is multi-day → call `bookLongPlanningEvent` for it; else fall through to existing `bookBatch`

**Checkpoint**: After T009, drop a 14-day planning event in demo mode → 10 entries appear, 1 modal, correct toast. Drop a Thu–Tue event → 4 entries, no Sat/Sun. Ctrl+Z removes all in one step.

---

## Phase 4: User Story 3 — Pre-Mapped Ticket Path (Priority: P2)

**Goal**: When a multi-day planning event already carries a Redmine ticket/activity mapping (e.g. `holidayTicket`), no modal opens — entries are created immediately and the toast confirms the count.

**Independent Test**: Configure a known-ticket event type in Settings, drop a 5-day planning event from any source column → confirm no modal opens, 5 entries created, toast shows "5 entries booked".

### Implementation for User Story 3

- [x] T010 [US3] Verify `bookLongPlanningEvent` in `js/planning-bulk-drop.js` handles the `planningCategory !== 'needs-ticket'` path correctly: skip the `openForm` call, call `runDropGuards` per day (matching the bookable path in `planning-view-drop.js::_bookOne`), go directly to `undo:batchbegin` + `createTimeEntry` loop using the ticket/activity already present on `planningEvent.proposal`; manual smoke-test in demo mode with a pre-mapped event type

**Checkpoint**: Pre-mapped events create entries silently; needs-ticket events still open exactly one modal.

---

## Phase 5: User Story 4 — Single-Day Passthrough (Priority: P3)

**Goal**: A single-day planning event drops exactly as it did before this feature — the `isMultiDay` guard routes it to the unchanged `bookBatch` path.

**Independent Test**: Drop a single-day planning event from any source column → behaviour is identical to the pre-feature flow; no `bookLongPlanningEvent` invocation.

### Implementation for User Story 4

- [x] T011 [US4] Confirm the `isMultiDay` guard in `js/planning-view.js::_onColumnDrop` (added in T009) returns `false` for single-day events (`rawEvent.end.slice(0,10) === rawEvent.start.slice(0,10)`) and that `bookBatch` is called unchanged; add a unit test asserting `isMultiDay` returns `false` for equal start/end strings in `tests/unit/planning-bulk-drop.test.js`

**Checkpoint**: Existing single-event D&D Playwright tests pass without modification.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E validation, knowledge routing, quality gates.

- [x] T012 Playwright E2E in `tests/ui/planning-bulk-drop.spec.js` (drives the permanent demo multi-day events): (a) needs-ticket "Workshop" (Mon–Thu) → modal once with the bulk notice + locked date, 4 entries, toast "4"; (b) "Company Holiday" spanning two weekends → 6 weekday entries (Sat/Sun excluded); (c) modal cancel → 0 entries; (d) single Ctrl+Z removes all entries in the batch; (e) pre-mapped (holidayTicket) "Company Holiday" → 0 modals, 6 entries, toast "6". Weekend-only → 0 entries (case (c) in the original plan) is covered by the `expandToWeekdays` unit test instead (not reproducible in demo mode). `reuseExistingServer` added to `tests/playwright.config.js` so local runs reuse a running dev server.
- [x] T013 [P] Update `js/knowledge.topics.json` to include `js/planning-bulk-drop.js` in the `"planning"` and `"time-entries"` topics (NOT exclusively under `"outlook"` — the module is source-agnostic)
- [x] T014 [P] Update `docs/content.en.md` and `docs/content.de.md` to document the multi-day D&D behaviour (one sentence under the "Outlook Integration" section)
- [x] T015 Run `npm run test:coverage`, `npm run lint`, `npm run sqi`, `npm run dup:check` — fix any violations before final commit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user-story phases**
  - T002 → T003 (tests must fail before implementation)
  - T004 [P] can run alongside T002/T003 (different files)
- **Phase 3 (US1/US2)**: Depends on Phase 2 completion (T003 must exist)
  - T005, T007, T008 can be written in parallel (different concerns within `js/planning-bulk-drop.js`)
  - T009 depends on T006 being complete (imports `bookLongPlanningEvent`)
- **Phase 4 (US3)**: Depends on T006 (orchestrator must exist)
- **Phase 5 (US4)**: Depends on T009 (routing must be wired)
- **Phase 6 (Polish)**: Depends on all story phases; T013/T014 can run in parallel once T009 is done

### User Story Dependencies

- **US1/US2 (P1)**: Can start after Phase 2 — no cross-story dependencies
- **US3 (P2)**: Can start after T006 (orchestrator) — the pre-mapped path is a branch within the same function
- **US4 (P3)**: Can start after T009 (routing wired) — passthrough is the `else` branch of the `isMultiDay` guard

### Within Each Phase

- T002 (failing tests) MUST exist and fail before T003 (implementation) is written
- T006 (orchestrator) MUST exist before T009 (plumbing/wiring)
- T015 (quality gates) MUST be the final task — fixes any violations surfaced by lint/sqi/dup

---

## Parallel Opportunities

```bash
# Phase 2 — can all start at once (T004 is independent):
T002: Write failing unit tests for expandToWeekdays
T004: Add i18n keys to js/i18n/en.js and js/i18n/de.js   ← [P], different file

# After T002 passes review:
T003: Implement expandToWeekdays (makes T002 green)

# Phase 3 — after T003:
T005: bulkDayCount banner in time-entry-form-view.js        ← [P] different module
T006: Implement bookLongPlanningEvent orchestrator
T007: Weekly-hours guard (edit to js/planning-bulk-drop.js)
T008: Partial-failure handling (edit to js/planning-bulk-drop.js)
# T009 must wait for T006 to be complete

# Phase 6:
T013: knowledge.topics.json update   ← [P]
T014: docs/content.*.md update       ← [P]
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 — single drop, 10 entries)

1. Complete Phase 1 (verify branch)
2. Complete Phase 2 (expandToWeekdays + i18n) — **critical blocker**
3. Complete Phase 3 (bookLongPlanningEvent + routing)
4. **STOP and VALIDATE**: Drop a 14-day event in demo mode → 10 entries, 1 modal, correct toast, single undo
5. This MVP already covers US1 and US2 (weekend exclusion is built into the algorithm)

### Incremental Delivery

1. Phase 2 → Foundation green
2. Phase 3 → US1/US2 working → Demo
3. Phase 4 → US3 verified (pre-mapped path was implicit in T006; manual smoke only)
4. Phase 5 → US4 regression check (single-day passthrough)
5. Phase 6 → E2E tests, docs, quality gates → merge-ready

---

## Notes

- `expandToWeekdays` must be a **pure function** (string in / string-array out) — no DOM, no imports, testable in Node environment
- The `undo:batchbegin` / `undo:batchend` coalescing is already shipped (PR #256) — `bookLongPlanningEvent` is a **consumer**, not an implementor, of that mechanism
- `readWeeklyHours()` always returns a usable number — it falls back to `DEFAULT_WEEKLY_HOURS` (40) when nothing valid is stored, so no null-guard is needed before dividing. (Mandatory-field validation lives on the Settings page.)
- `openForm` resolve callback receives the saved `TimeEntry` or `null` (cancel) — `null` must abort the entire batch
- ESLint gate: `max-lines-per-function: 60` — if `bookLongPlanningEvent` grows past 60 lines, extract helpers within `js/planning-bulk-drop.js`
- Commit after each task using `T0XX: description` prefix per Constitution development workflow
