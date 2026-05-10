---

description: "Task list for feature 027 — Weekly Hours Target Tracking"
---

# Tasks: Weekly Hours Target Tracking

**Input**: Design documents from `.specify/features/027-weekly-target-tracking/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ (empty by design) · quickstart.md ✅

**Tests**: Every implementation task that adds or changes behavior includes its own unit and/or UI tests. TDD per Constitution Principle III: tests are written first, fail first, then implementation makes them pass.

**Organization**: Tasks are grouped by user story. The spec defines one user story (US1 / P1), so the bulk of the work lives in Phase 3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on incomplete tasks)
- **[Story]**: maps to user stories from spec.md (US1)
- File paths are absolute from repo root.

## Path Conventions

Single project, static SPA. New code in `js/`; tests in `tests/unit/` and `tests/ui/`. Styles in `css/style.css`. i18n in `js/i18n.js`.

---

## Phase 1: Setup

**Purpose**: scaffold the empty files the rest of the work needs.

- [ ] T001 [P] Create empty stub `js/week-target.js` exporting a placeholder `computeWeekProgress()` that throws `'not implemented'` — gives the test file an import target.
- [ ] T002 [P] Create empty stub `tests/unit/week-target.test.js` containing a single `describe('computeWeekProgress', () => { … })` block.
- [ ] T003 [P] Create empty stub `tests/ui/week-target.spec.js` containing a single `test.describe('weekly target indicator', () => { … })` block.

**Checkpoint**: All file paths referenced in plan.md exist (even if empty). Vitest and Playwright can discover them.

---

## Phase 2: Foundational

**Purpose**: blocking prerequisites for all user stories.

This feature has no foundational work — it adds one isolated module plus rendering glue inside an existing function. Skip directly to Phase 3.

---

## Phase 3: User Story 1 — At-a-Glance Progress Toward Weekly Target (Priority: P1) 🎯 MVP

**Goal**: when `weeklyHours > 0`, render `booked / target`, `remaining hours`, and `remaining workdays` in `.app-header`, updating live after every entry CRUD.

**Independent Test**: with weeklyHours = 40 and Mon+Tue at 8h each, opening the calendar on Wed shows `16 / 40h · 24h left · 3d`. Removing the setting hides the indicator. Verified by quickstart.md scenarios S1–S16.

### TDD: i18n strings first (no logic, no tests)

- [ ] T004 [US1] Add the six EN+DE i18n keys from research.md §R6 to `js/i18n.js`: `weekTarget.bookedOfTarget`, `weekTarget.remaining`, `weekTarget.remainingDays`, `weekTarget.metSuffix`, `weekTarget.tooltip`, plus any aria-label key needed for screen readers (`weekTarget.aria`).

### TDD: pure-module unit tests

- [ ] T005 [US1] In `tests/unit/week-target.test.js` write Vitest cases (initially failing) covering every spec requirement. Required cases (one `test()` per bullet, name them descriptively):
  - Returns `{ booked: 16, target: 40, remaining: 24, remainingWorkdays: 3, isPastWeek: false, state: 'under' }` for Mon+Tue at 8h, today = Wed (FR-001/2/3).
  - `state: 'met'` when booked === target (FR-005).
  - `state: 'over'` when booked > target; `remaining` is still `0`, not negative (FR-005).
  - `remaining` clamped at `0` when booked > target (FR-002).
  - Indicator hidden semantics: when `weeklyHours` is `null`/`0`/`NaN`, function returns the same shape but caller is responsible for hiding (FR-006). Test that the function does not throw.
  - Past week: `isPastWeek: true`, `remainingWorkdays: 0` (FR-004).
  - Future week: `booked: 0`, `remainingWorkdays: 5` (S11).
  - Sat/Sun bookings count toward `booked` but not toward `remainingWorkdays` (S12).
  - Holiday-ticket entry on a workday → that day counts as filled, NOT in `remainingWorkdays` (S13).
  - Break-ticket entry → contributes 0 to `booked`; alone does NOT fill the day (S14).
  - Past day with 0h booked → not counted as remaining (S15).
  - `_isMidnightContinuation` entries are ignored when summing booked.
  - `today === weekStart` (Monday): all 5 weekdays counted as remaining if all empty.
  - `today === weekEnd + 1ms`: `isPastWeek: true`.
  - Negative / `NaN` `entry.hours` → treated as 0 (defensive — should not crash).
  - Empty entries array → `booked: 0`, all 5 weekdays remaining (current/future) or 0 (past).
- [ ] T006 [US1] Run `npx vitest run tests/unit/week-target.test.js` — confirm all tests fail (Red phase).

### Implementation: pure module

- [ ] T007 [US1] Implement `computeWeekProgress({entries, weekStart, weekEnd, today, weeklyHours, holidayTicket, breakTicket})` in `js/week-target.js` per the data-model.md contract. Pure function — no DOM, no `Date.now()`, no `localStorage`. Use a single pass over entries.
- [ ] T008 [US1] Run `npx vitest run tests/unit/week-target.test.js` — confirm all tests pass (Green phase). If any test fails, fix the implementation, not the test.

### Implementation: rendering glue in `js/calendar.js`

- [ ] T009 [US1] Modify `updateWeekTotal(events)` in `js/calendar.js:303` to:
  1. Read `weeklyHours` via `readWeeklyHours()` (import from `js/settings.js`).
  2. Read `cfg.holidayTicket` and `cfg.breakTicket` from the existing config getter (same call site as `js/calendar.js:53`).
  3. Compute `weekStart`, `weekEnd` from `calendar.view.currentStart` / `currentEnd`; compute `today` as local-midnight.
  4. Convert `events` to the entry shape `computeWeekProgress` expects (extract `extendedProps.timeEntry` already used at `js/calendar.js:305`).
  5. Call `computeWeekProgress(...)` and render the indicator into a new sibling element `<span id="week-target" class="week-target">`. When `weeklyHours` is unset (null/0), do NOT render the span.
  6. Apply `.week-target--success` modifier when `state === 'met'`, `.week-target--over` when `state === 'over'`.
  7. Suppress the `Yd` segment when `isPastWeek === true`.

### Implementation: styling

- [ ] T010 [US1] Add `.week-target` rules to `css/style.css` near the existing `.week-total` block (around line 35): same font scale, slightly subdued colour by default, success modifier in a non-negative tone (e.g., the existing brand-success/green token), over modifier subdued (no red, no warning glyph).
- [ ] T011 [US1] In the existing `< 768px` media block (`css/style.css:835`), add a `.week-target` override so the indicator fits without overflow on a 360-px-wide viewport. Render the three segments separated by middle dots (`·`).

### UI tests: Playwright

- [ ] T012 [US1] In `tests/ui/week-target.spec.js` add Playwright tests (initially failing) covering quickstart scenarios S1, S2, S3, S4 (visibility/state under different settings), S5 (CRUD reactivity — add), S10 (past week), S11 (future week), S16 (mobile compact). Use the existing test fixtures' approach for seeding entries (consult `tests/ui/` for an existing spec to copy the harness from). Include a `screenshot` assertion against the pre-feature baseline for S4 (per SC-004) — capture the baseline first if one does not exist.
- [ ] T013 [US1] Run `npx playwright test tests/ui/week-target.spec.js` — confirm tests fail (Red), then iterate on T009–T011 until they pass (Green).

**Checkpoint US1**: feature works end-to-end. spec.md acceptance scenarios 1–7 verified manually via quickstart.md S1–S11. Edge cases verified via quickstart.md S12–S16.

---

## Phase 4: Polish & Cross-Cutting

- [ ] T014 [P] Run `npx vitest` (full unit suite) — confirm no regressions in other tests.
- [ ] T015 [P] Run `npx playwright test` (full UI suite) — confirm no regressions in other UI specs (especially the existing week-total baseline).
- [ ] T016 [P] Manually walk through quickstart.md S1–S16 in a browser; check the dev-tools console for errors (SC-005 requires zero).
- [ ] T017 [P] Verify SC-002 timing: open the calendar with target = 40 and an entry to add. Time from `mouseup` on the new entry's create button to the indicator updating must be `< 300 ms`. Capture the timing in a comment or commit message; if exceeded, file a follow-up.
- [ ] T018 Resolve open question 1 from plan.md (holidayTicket admin-field availability): confirm whether `cfg.holidayTicket` is populated in the dev/test `config.json`. If not, add a one-line entry. Document the resolution in this tasks file or in the PR description.
- [ ] T019 Resolve open question 3 (mobile compact layout): if T011 reveals overflow on `< 480 px`, drop the `Yd` segment via the same media query. Otherwise, mark the open question resolved as "Plan A holds — no fallback needed".
- [ ] T020 Update BACKLOG.md row for 027 to mark `plan: ✅` and `tasks: ✅`. Status text becomes `tasks done — ready for implement`.

---

## Dependencies

- T001/T002/T003 are independent (different files) — fully parallel.
- T004 (i18n) is independent of T005–T013 — can run in parallel with the unit-test phase.
- T005 → T006 → T007 → T008 must be sequential (Red → impl → Green).
- T009 depends on T008 (calls into `computeWeekProgress`).
- T010, T011 depend on T009 (selector class names settle in T009).
- T012 depends on T009/T010/T011 (DOM exists to query).
- T013 depends on T012.
- T014–T017 are independent — fully parallel after T013.
- T018, T019, T020 are bookkeeping — sequential at the end.

## Parallel Execution Opportunities

- **Setup parallel batch (P)**: T001, T002, T003 in one go.
- **TDD parallel batch (P)**: T004 (i18n) can start any time during T005–T008.
- **Polish parallel batch (P)**: T014, T015, T016, T017.

## Implementation Strategy

- **MVP scope** = US1 (it is the only user story). Phase 3 deliverables alone constitute the shipping feature.
- **Incremental increments inside US1**: ship the pure module first (T001–T008), then the rendering glue (T009), then styling (T010/T011), then UI tests (T012/T013). Each increment is a reviewable, atomic commit.
- **Suggested commit boundaries**: (a) i18n + scaffolds, (b) unit tests + impl, (c) rendering + CSS, (d) Playwright, (e) polish/bookkeeping.

## Format Validation

All 20 tasks above conform to the `- [ ] [TaskID] [P?] [Story?] Description with file path` checklist format. Setup/Polish tasks have no story label; Phase-3 tasks all carry `[US1]`.

## Open Questions Carry-Over

The three open questions raised in plan.md remain open until resolved by T018 (Q1), T011 (Q3), and the implementer's discretion (Q2). Q2 has no blocking action — it is documented in quickstart.md S15 and left for reviewer feedback.
