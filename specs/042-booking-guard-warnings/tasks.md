---
description: 'Task list for Feature 042 — Booking Guard Warnings'
---

# Tasks: Booking Guard Warnings (042)

**Input**: Design documents from `specs/042-booking-guard-warnings/`

**References**: [plan.md](plan.md) · [spec.md](spec.md) · [data-model.md](data-model.md) · [contracts/booking-guard-api.md](contracts/booking-guard-api.md) · [quickstart.md](quickstart.md)

**TDD**: Unit tests for `js/booking-guard.js` are written **before** the corresponding implementation tasks per Constitution Principle III. Tests must fail before implementation is written.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1 = future-date warning, US2 = deadline warning, US3 = admin config)

---

## Phase 1: Setup

**Purpose**: Create the new module skeleton so all subsequent tasks have a file to write into.

- [ ] T001 Create `js/booking-guard.js` with module-level JSDoc header, empty export stubs for `runSaveGuards`, `runDeleteGuard`, and `deadlineTriggeredForMove`, and a `// @ts-check` pragma (no `@ts-nocheck` — this module carries full JSDoc)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, i18n keys, and knowledge routing that every implementation task depends on.

**⚠️ CRITICAL**: All three stories require these to compile and render correctly.

- [ ] T002 [P] Add `BookingDeadlineConfig` interface to `js/types.d.ts` (`enabled: boolean; dayOfWeek?: number; hour?: number; minute?: number`) and add `bookingDeadline?: BookingDeadlineConfig` to the `CentralConfig` interface
- [ ] T003 [P] Add 6 new i18n keys to `js/i18n/en.js`: `bookingGuard.futureDateTitle`, `bookingGuard.futureDateBody`, `bookingGuard.deadlineTitle`, `bookingGuard.deadlineBody`, `bookingGuard.deadlineDeleteBody`, `bookingGuard.continueAnyway` (English values from plan.md i18n table)
- [ ] T004 [P] Add the same 6 keys with German translations to `js/i18n/de.js`
- [ ] T005 Register `js/booking-guard.js` in `js/knowledge.topics.json` under the `timeEntry` or `validation` topic (whichever best fits the existing topic taxonomy)

**Checkpoint**: `npm run typecheck` and `npm run lint` pass — types and i18n keys are valid.

---

## Phase 3: User Story 1 — Future-Date Booking Warning (Priority: P1) 🎯 MVP

**Goal**: A user submitting a time entry for a future calendar date sees a soft-warning dialog before the entry is saved. Vacation/holiday tickets are exempt. Dialog matches feature 040 visually.

**Independent Test**: Quickstart scenarios 1–4 (create on future date → warning; create on today → no warning; holiday ticket → no warning; cancel → form intact).

### Tests for User Story 1 (TDD — write before implementation)

- [ ] T006 Write unit tests in `tests/unit/booking-guard.test.js` for: `isExempt()` with matching/non-matching holidayTicket and vacationTicket; future-date condition (`date > today` → true, `date === today` → false, `date < today` → false); exempt ticket skips future-date dialog. Tests must fail with the current empty stubs.

### Implementation for User Story 1

- [ ] T007 [US1] Implement private `isExempt(issueId, cfg)` helper in `js/booking-guard.js` — returns true when `issueId` matches `cfg.holidayTicket` or `cfg.vacationTicket`
- [ ] T008 [US1] Implement the future-date guard portion of `runSaveGuards(opts)` in `js/booking-guard.js`: compare `opts.date` to today's ISO date string; if `date > today` and ticket not exempt, call `showConfirmDialog` via a Promise and return false on cancel
- [ ] T009 [US1] Integrate `runSaveGuards()` into `doSave()` in `js/time-entry-form.js`: after the closed-ticket check block (line ~348), call `runSaveGuards({ date: payload.spentOn, startTime: payload.startTime, originalDate: _currentEntry?.date ?? null, originalStartTime: _currentEntry?.startTime ?? null, issueId: _selectedIssue?.id ?? null, cfg: getCentralConfigSync() })`; if result is false call `setSaveButtonBusy(false)` and return; otherwise fall through to `_executeSave(payload)`
- [ ] T010 [US1] Write Playwright UI tests in `tests/ui/booking-guard.spec.js` for quickstart scenarios 1–4 (future-date warning appears; today no warning; holiday ticket exempt; cancel keeps form open)

**Checkpoint**: `npm test` passes T006. Quickstart scenarios 1–4 pass manually. `npm run test:ui:failed` passes T010.

---

## Phase 4: User Story 2 — Reporting-Deadline Booking Warning (Priority: P2)

**Goal**: Any time-entry mutation (create, edit, delete, drag-move, resize) that touches the reported period (start ≤ last deadline moment) triggers a soft-warning dialog. Applies to all three operations per FR-015 trigger matrix.

**Independent Test**: Quickstart scenarios 5–13 (deadline warning on create, edit, delete, drag; no warning when disabled or entry outside period).

### Tests for User Story 2 (TDD — write before implementation)

- [ ] T011 [P] [US2] Write unit tests in `tests/unit/booking-guard.test.js` for `lastDeadlineBefore(now, cfg)`: disabled config → null; past cutoff today → correct Date; before cutoff today → go back 7 days; exact cutoff moment (now === deadline) → go back 7 days; default dayOfWeek/hour/minute applied when fields absent
- [ ] T012 [P] [US2] Write unit tests in `tests/unit/booking-guard.test.js` for `toDatetime(date, time)`: null time → 00:00; valid HH:MM → correct local Date; and for `deadlineTriggered(op, origDt, newDt, deadline)`: create with newDt ≤ deadline → true; create with newDt > deadline → false; edit with origDt ≤ deadline → true; edit with newDt ≤ deadline and orig > deadline → true; edit with both > deadline → false; delete with origDt ≤ deadline → true; delete with origDt > deadline → false; boundary: newDt === deadline (inclusive) → true

### Implementation for User Story 2 — pure logic layer

- [ ] T013 [US2] Implement `lastDeadlineBefore(now, cfg)` in `js/booking-guard.js` using the algorithm from data-model.md: start at `hour:minute` on the most recent `dayOfWeek`, subtract 7 days if still ≥ now; return null when `cfg?.bookingDeadline?.enabled` is falsy
- [ ] T014 [US2] Implement `toDatetime(date, time)` in `js/booking-guard.js`: split YYYY-MM-DD and HH:MM (default 00:00 when time is null) into a local `Date`
- [ ] T015 [US2] Implement `deadlineTriggered(op, origDt, newDt, deadline)` in `js/booking-guard.js` applying the FR-015 trigger matrix: create → `newDt <= deadline`; edit → `origDt <= deadline || newDt <= deadline`; delete → `origDt <= deadline`
- [ ] T016 [US2] Implement exported `deadlineTriggeredForMove(origDate, origTime, newDate, newTime, cfg)` in `js/booking-guard.js`: calls `lastDeadlineBefore`, `toDatetime` for both positions, then `deadlineTriggered('edit', …)` — synchronous, returns boolean
- [ ] T017 [US2] Complete `runSaveGuards(opts)` in `js/booking-guard.js`: after the future-date guard, call `lastDeadlineBefore`, determine operation (`'create'` when `opts.originalDate` is null, else `'edit'`), check `deadlineTriggered`, show `showConfirmDialog` wrapped in a Promise if triggered, return false on cancel
- [ ] T018 [US2] Implement exported `runDeleteGuard(date, startTime, cfg)` in `js/booking-guard.js`: calls `lastDeadlineBefore`, `toDatetime`, `deadlineTriggered('delete', …)`, shows dialog if triggered, returns Promise<boolean>

### Implementation for User Story 2 — integration

- [ ] T019 [US2] Integrate deadline guard into `doSave()` in `js/time-entry-form.js`: T009 already calls `runSaveGuards` — confirm the deadline portion flows through correctly after the future-date portion (no additional change needed if T017 is complete; verify by running unit tests)
- [ ] T020 [US2] Integrate deadline guard into `onDeleteClick()` in `js/time-entry-form.js`: make `onDeleteClick` async; before the `openConfirmOverlay(...)` call add `const ok = await runDeleteGuard(_currentEntry.date, _currentEntry.startTime, getCentralConfigSync()); if (!ok) return;`
- [ ] T021 [US2] Integrate deadline guard into `eventDrop()` in `js/calendar.js`: after the `_checkClosedAndConfirm` block (line ~334), call `deadlineTriggeredForMove(entry.date, entry.startTime, newDate, newTime, getCentralConfigSync())` — if true, show `showConfirmDialog` via a Promise; on cancel call `info.revert()` and return
- [ ] T022 [US2] Integrate deadline guard into `eventResize()` in `js/calendar.js`: same pattern as T021 but pass `entry.date`/`entry.startTime` for both orig and new positions (start is unchanged by resize); show dialog and revert on cancel
- [ ] T023 [US2] Integrate deadline guard into `_handleDelete()` in `js/entry-commands.js`: make `_handleDelete` async; before `showDeleteConfirm(...)`, check whether any deletable item's start touches the deadline using `deadlineTriggeredForMove(entry.date, entry.startTime, entry.date, entry.startTime, cfg)` — if any match, show a single grouped `showConfirmDialog` via Promise; return early on cancel
- [ ] T024 [US2] Write Playwright UI tests in `tests/ui/booking-guard.spec.js` for quickstart scenarios 5–9 (deadline warning on create, same-day, no warning outside period, delete with and without deadline trigger) and scenario 13 (feature disabled → no warning)

**Checkpoint**: `npm test` passes all booking-guard unit tests. `npm run test:ui:failed` passes T024. Quickstart scenarios 5–9 and 13 pass manually.

---

## Phase 5: User Story 3 — Admin Configuration (Priority: P3)

**Goal**: Admin can control the cutoff day/time via `config.json` or disable the feature entirely. Feature is safely off by default when `bookingDeadline` key is absent.

**Independent Test**: Quickstart scenario 13 (disabled), and manual verification that changing `dayOfWeek`/`hour` in `config.json` shifts which entries trigger the warning.

### Tests for User Story 3 (TDD)

- [ ] T025 [US3] Write unit tests in `tests/unit/booking-guard.test.js` for admin config scenarios: `bookingDeadline` absent → `lastDeadlineBefore` returns null; `enabled: false` → null; custom `dayOfWeek: 1, hour: 8` → correct past-Monday-08:00 deadline; `minute: 30` applied correctly in deadline moment

### Implementation for User Story 3

- [ ] T026 [US3] Verify `lastDeadlineBefore` (already implemented in T013) correctly handles: absent `bookingDeadline` key → null; `enabled: false` → null; optional `dayOfWeek`/`hour`/`minute` fields use defaults (5/22/0) when absent. Add any missing default-handling branches in `js/booking-guard.js` if the unit tests from T025 expose gaps.
- [ ] T027 [P] [US3] Write Playwright UI tests in `tests/ui/booking-guard.spec.js` for quickstart scenarios 10–12 (drag-move warnings: original in period, new position in period, resize in period)

**Checkpoint**: All unit tests pass. `npm run test:ui:failed` passes T027. Quickstart scenarios 10–13 pass manually.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T028 [P] Update `docs/content.en.md`: add a section describing the future-date booking warning (what triggers it, how to proceed, which tickets are exempt) and the reporting-deadline warning (what triggers it, create/edit/delete/drag scope, admin config, how to disable)
- [ ] T029 [P] Update `docs/content.de.md` with the German equivalent of T028
- [ ] T030 Run `npm run lint && npm run format:check && npm run typecheck && npm test` and fix any issues across all changed files (`js/booking-guard.js`, `js/time-entry-form.js`, `js/calendar.js`, `js/entry-commands.js`, `js/types.d.ts`, `js/i18n/en.js`, `js/i18n/de.js`)
- [ ] T031 Run `npm run test:ui` (full suite) and fix any regressions in existing tests caused by the new guard dialogs appearing in scenarios they shouldn't

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001 must exist before imports compile)
- **Phase 3 (US1)**: Depends on Phase 2 complete — T006 tests, then T007–T009 implementation
- **Phase 4 (US2)**: Depends on Phase 2 complete; T011/T012 tests can run in parallel with Phase 3 implementation; T013–T018 logic can start after T011/T012 fail; T019–T023 integrations depend on T017/T018
- **Phase 5 (US3)**: Depends on T013 complete (config reading already implemented)
- **Phase 6 (Polish)**: Depends on all story phases complete

### Within User Story 2

```
T011, T012 (tests, parallel) → must fail
    ↓
T013, T014 (parallel) → T015 → T016, T017, T018 (parallel)
    ↓
T019, T020, T021, T022, T023 (parallel — different files)
    ↓
T024 (Playwright)
```

### Parallel Opportunities

- T002, T003, T004, T005 (Phase 2) — all different files
- T011, T012 (US2 unit tests) — independent test groups
- T013, T014 (logic helpers) — no interdependency
- T016, T017, T018 (exports) — depend on T013–T015 but not each other
- T019, T020, T021, T022, T023 (integrations) — all different files
- T025, T027 (US3) — different test files
- T028, T029 (docs) — different files

---

## Parallel Example: User Story 2 integrations

```
# Once T017 + T018 are complete, all 5 integration tasks can run in parallel:
T019 — js/time-entry-form.js doSave() deadline portion (verify T017 flows through)
T020 — js/time-entry-form.js onDeleteClick() + runDeleteGuard
T021 — js/calendar.js eventDrop()
T022 — js/calendar.js eventResize()
T023 — js/entry-commands.js _handleDelete()
```

---

## Implementation Strategy

### MVP First (US1 only — future-date warning)

1. Phase 1 + Phase 2 (T001–T005)
2. T006 (tests, must fail) → T007 → T008 → T009 → T010
3. **STOP**: Quickstart scenarios 1–4 pass. Future-date warning is live.

### Incremental Delivery

1. MVP (above) → future-date warning live
2. Phase 4 (US2) → deadline warning for all mutation types live
3. Phase 5 (US3) → admin config verified and tested
4. Phase 6 → docs updated, full CI green

---

## Notes

- All `showConfirmDialog` calls use `confirmLabel: t('bookingGuard.continueAnyway')` and `cancelLabel: t('cancel')` (existing key)
- `_handleDelete` in `js/entry-commands.js` must become `async` to support `await` on the dialog Promise
- `onDeleteClick` in `js/time-entry-form.js` must become `async` for the same reason
- `getCentralConfigSync()` is always available synchronously after app init — no async needed for config access
- The `[P]` marker on integration tasks (T019–T023) is valid because they touch different files with no shared in-progress dependency
