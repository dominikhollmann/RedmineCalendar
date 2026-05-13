---
description: 'Task list for feature 028 — Bulk Multi-Select for Move and Delete'
---

# Tasks: Bulk Multi-Select for Move and Delete

**Input**: Design documents from `specs/028-bulk-select-move-delete/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ (empty by design) · quickstart.md ✅

**Tests**: Every implementation task that adds or changes behavior includes its own unit and/or UI tests. TDD per Constitution Principle III: tests are written first, fail first, then implementation makes them pass.

**Organization**: tasks are grouped by user story. Spec defines two stories: US1 (P1, bulk move) and US2 (P2, bulk delete). US2 depends on the selection model from US1's foundational work but is otherwise independent.

## Format: `[ID] [P?] [Story?] Description with file path`

## Path Conventions

Single-project static SPA. New code in `js/`; tests in `tests/unit/` and `tests/ui/`. Styles in `css/style.css`. i18n in `js/i18n.js`.

---

## Phase 1: Setup

- [ ] T001 [P] Create empty stub `js/selection.js` exporting placeholders for `addToSelection`, `removeFromSelection`, `toggleInSelection`, `clearSelection`, `isSelected`, `getSelection`, `onChange` — each throws `'not implemented'`.
- [ ] T002 [P] Create empty stub `js/bulk-actions.js` exporting placeholders for `shiftEntriesByDays`, `aggregateBatchResults`, `runBulkMove`, `runBulkDelete`.
- [ ] T003 [P] Create empty stub `js/bulk-toolbar.js` exporting `mountBulkToolbar(rootEl)` placeholder.
- [ ] T004 [P] Create empty test files: `tests/unit/selection.test.js`, `tests/unit/bulk-actions.test.js`, `tests/unit/bulk-orchestrator.test.js`, `tests/ui/bulk-actions.spec.js` — each with one empty `describe`/`test.describe` block referencing the imports.

**Checkpoint**: discovery surfaces (Vitest + Playwright) see all the new files.

---

## Phase 2: Foundational

**Purpose**: the selection model generalises the existing singleton `_selectedEvent` (introduced in feature 004) to a `Set<entryId>`. It is the single shared dependency for both US1 and US2.

- [ ] T005 In `tests/unit/selection.test.js` write 12+ Vitest cases covering every public API in `js/selection.js`: add idempotent, remove idempotent, toggle (add then remove), clear empties, isSelected predicate, getSelection returns a fresh Set, onChange listeners called post-mutation, multiple listeners, unsubscribe works, dedup, no notification when clear is called on already-empty set.
- [ ] T006 Run `npx vitest run tests/unit/selection.test.js` — confirm Red.
- [ ] T007 Implement `js/selection.js` per data-model.md. Module-level `Set<string>` plus a listener array. Export the seven functions.
- [ ] T008 Run `npx vitest run tests/unit/selection.test.js` — confirm Green.
- [ ] T008a **Migration: replace the singleton `_selectedEvent` in `js/calendar.js`.** Update `selectEntry(fcEvent)` to clear the selection and add this entry's id (singleton replacement; preserves today's behaviour). Update `deselectEntry()` to call `clearSelection()`. Update keyboard-shortcut callsites (`Ctrl+C` at `js/calendar.js:953`, `Enter` at `:961`, `Delete` at `:987`) to read from `getSelection()` and gate on `selection.size === 1` for `Ctrl+C` / `Enter`. Existing single-entry tests (copy-paste, Enter-to-edit, Delete-to-delete) MUST continue to pass after this change.

**Checkpoint Foundational**: `selection.js` is fully tested and `_selectedEvent` is migrated. All existing single-entry flows still work (singleton selection is just `selection.size === 1`). US1 and US2 can be built on top.

---

## Phase 3: User Story 1 — Bulk Move (Priority: P1) 🎯 MVP

**Goal**: shift-click multiselect with `+1 day` / `−1 day` toolbar actions.

**Independent Test**: shift-click 3 entries on Monday, click `+1 day` → all 3 move to Tuesday with original times. quickstart.md S1–S7 + S13/S14/S16/S17/S18.

### TDD: i18n keys

- [ ] T009 [US1] Add the 12 EN+DE i18n keys from research.md §R8 to `js/i18n.js`.

### TDD: pure helpers

- [ ] T010 [US1] In `tests/unit/bulk-actions.test.js` write Vitest cases for `shiftEntriesByDays(entries, delta)`:
  - 3-entry input shifts +1 → all dates +1, times preserved.
  - −1 day shifts back; entries on Monday shift to Sunday.
  - `delta = 0` returns equivalent entries (idempotent).
  - DST spring-forward: 02:30 entry on the day before DST shifts to 02:30 on the day after (verify the local clock is preserved).
  - DST fall-back: same — local clock preserved.
  - Preserves all non-date fields (`startTime`, `endTime`, `hours`, `comment`, `issueId`, `activityId`).
  - Returns a new array; does not mutate input.
- [ ] T011 [US1] In the same file, add cases for `aggregateBatchResults(promiseSettledResults, ids)`:
  - All `fulfilled` → `succeeded.length === ids.length`, `failed.length === 0`.
  - All `rejected` → `succeeded.length === 0`, `failed.length === ids.length`.
  - Mixed → counts add up to `total`; `error` strings are non-empty and bounded to ≤ 100 chars.
- [ ] T012 [US1] Run `npx vitest run tests/unit/bulk-actions.test.js` — confirm Red.
- [ ] T013 [US1] Implement `shiftEntriesByDays` and `aggregateBatchResults` in `js/bulk-actions.js`. Pure functions; use `Date.setDate(d.getDate() + delta)` for date arithmetic per research.md §R5.
- [ ] T014 [US1] Run `npx vitest run tests/unit/bulk-actions.test.js` — confirm Green.

### TDD: orchestrator

- [ ] T015 [US1] In `tests/unit/bulk-orchestrator.test.js` write Vitest cases for `runBulkMove(ids, delta, redmineApi)` with a mocked `redmineApi.updateTimeEntry`:
  - All succeed → returns `{total, succeeded:[...], failed:[]}`.
  - One rejects (422) → `succeeded.length = total - 1`, `failed[0].error` includes the rejection message (truncated).
  - All reject → `succeeded.length = 0`.
  - Concurrency: all `updateTimeEntry` calls dispatched before any one resolves (verify by counting calls before resolving the mock).
  - Never throws — `runBulkMove` always returns a `BatchResult`, never raises.
- [ ] T016 [US1] Run `npx vitest run tests/unit/bulk-orchestrator.test.js` — confirm Red.
- [ ] T017 [US1] Implement `runBulkMove` in `js/bulk-actions.js` using `Promise.allSettled`. Take a `redmineApi` parameter (dependency injection — the production callsite passes the real module's exports).
- [ ] T018 [US1] Run `npx vitest run tests/unit/bulk-orchestrator.test.js` — confirm Green.

### Implementation: rendering glue

- [ ] T019 [US1] Implement `mountBulkToolbar(rootEl)` in `js/bulk-toolbar.js`: creates a `<div class="bulk-toolbar" role="toolbar">` with three buttons (`+1 day`, `−1 day`, `Delete`) and a `[count] selected` label. Subscribes to `selection.onChange`. Hidden when selection is empty (`hidden` attr) and via CSS on `< 768 px`. Buttons dispatch `runBulkMove(...)` and `runBulkDelete(...)` via injected handlers (Delete handler uses confirm dialog — wired in US2 phase).
- [ ] T020 [US1] Modify `eventClick(info)` at `js/calendar.js:803` to add the **shift-click** branch BEFORE the existing double-click detection. The full logic becomes:
  1. If `entry._isMidnightContinuation` → return (unchanged).
  2. **NEW**: if `info.jsEvent.shiftKey` → call `toggleInSelection(info.event.id)`; `info.jsEvent.preventDefault()`; return without touching `_lastClickId` / `_lastClickTime` (so a subsequent double-click on a different entry still works).
  3. Compute `isDouble` (existing logic at line 808).
  4. If `isDouble || isMobileView()` → existing edit-form flow (lines 812–832), unchanged. Inside, `deselectEntry()` already clears the selection.
  5. Else → existing `selectEntry(info.event)` (line 834), which T008a migrated to do singleton-replace via `clearSelection()` + `addToSelection()`.
- [ ] T021 [US1] Modify `datesSet(info)` at `js/calendar.js:642` to call `clearSelection()` at the top.
- [ ] T022 [US1] Add `dateClick(info)` callback to the FC config that calls `clearSelection()`. (Empty-cell click clears the multi-selection AND the singleton — both via the same mechanism after T008a's migration.)
- [ ] T023 [US1] In the FC `eventClassNames` callback (or by toggling a class in the `selection.onChange` listener), add `.fc-event--selected` to selected entries. The existing single-entry CSS class applied by `selectEntry` becomes the same class — single source of truth.
- [ ] T024 [US1] Wire `runBulkMove` to the `+1 day` and `−1 day` buttons in `bulk-toolbar.js`. On completion, call the existing `loadWeekEntries` to refresh, render the partial-failure banner via `showError(...)`, and update `selection` to retain only failed IDs (FR-010).
- [ ] T024a [US1] Toolbar visibility rule in `js/bulk-toolbar.js`: show whenever `selection.size >= 1` (per FR-003 — "whenever the selection contains at least one entry"). At `size === 1`, the toolbar is the additional path; the existing per-entry interactions (Enter to edit, Delete to delete, Ctrl+C to copy on the singleton) keep working in parallel. This also satisfies US2 acceptance #5 (S12) — single-entry bulk-delete uses the same confirmation flow.
- [ ] T024b [US1] Update the existing `Delete` keyboard-shortcut handler at `js/calendar.js:987` to branch on selection size: if `selection.size > 1`, dispatch the bulk-delete confirm flow from US2 (T032/T033 below); if `selection.size === 1`, the existing single-delete flow runs as today (this is the established path; bulk path only activates on multi-selection).

### Styling

- [ ] T025 [US1] In `css/style.css` add `.fc-event--selected` (visible outline + brightness boost) and `.bulk-toolbar` rules (positioned in `.app-header` or just below it). Add `@media (max-width: 767px) { .bulk-toolbar { display: none !important; } .fc-event--selected { outline: none; } }` per FR-012.

### UI tests

- [ ] T026 [US1] In `tests/ui/bulk-actions.spec.js` add Playwright tests covering quickstart S1–S7 + S13/S14/S16/S17/S18.
- [ ] T027 [US1] Run `npx playwright test tests/ui/bulk-actions.spec.js` — Red, then iterate T019–T025 until Green.

**Checkpoint US1**: bulk move works end-to-end. Single-entry interactions unchanged.

---

## Phase 4: User Story 2 — Bulk Delete with Confirmation (Priority: P2)

**Goal**: a `Delete` toolbar action that runs a confirmation dialog stating the count, then deletes all selected entries with partial-failure reporting.

**Independent Test**: with 5 entries selected, click `Delete` → see `Delete 5 entries?` dialog → confirm → all 5 removed. quickstart.md S8–S12.

- [ ] T028 [US2] Extend `tests/unit/bulk-orchestrator.test.js` with `runBulkDelete` cases mirroring the `runBulkMove` cases (all-succeed, one-fail, all-fail, never-throws).
- [ ] T029 [US2] Run vitest — confirm Red on the new cases.
- [ ] T030 [US2] Implement `runBulkDelete` in `js/bulk-actions.js`.
- [ ] T031 [US2] Run vitest — confirm Green.
- [ ] T032 [US2] In `js/bulk-toolbar.js` wire the `Delete` button to a confirmation dialog. Use the existing dialog/modal helper if one exists in `js/`; otherwise use the simplest possible `<dialog>` element with translated title + body + Cancel/Delete buttons. Body uses `t('bulk.confirmDeleteBody', { count })`.
- [ ] T033 [US2] On confirm, call `runBulkDelete`; on completion, refresh via `loadWeekEntries`, surface the partial-failure banner, retain failed IDs in selection.
- [ ] T034 [US2] Extend `tests/ui/bulk-actions.spec.js` with quickstart scenarios S8–S12. Verify the dialog body text contains the localized count for both EN and DE locales.
- [ ] T035 [US2] Run `npx playwright test tests/ui/bulk-actions.spec.js` — confirm Green.

**Checkpoint US2**: bulk delete works end-to-end with confirmation.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T036 [P] Run full Vitest suite (`npx vitest`) — no regressions.
- [ ] T037 [P] Run full Playwright suite (`npx playwright test`) — no regressions, especially in the existing single-entry click/drag/resize/delete specs (SC-005).
- [ ] T038 [P] Manually walk through every quickstart scenario S1–S18 on desktop; check the dev-tools console for errors (must be zero).
- [ ] T039 [P] Verify SC-001 timing: with 5 entries pre-loaded, time the operation from first shift-click to "moved" banner. Must be < 10 s.
- [ ] T040 [P] Verify SC-002 timing: 5-entry delete < 15 s end-to-end including confirmation.
- [ ] T041 Resolve open question 1 (empty-click mechanism): confirm Plan A (`dateClick`) covers all empty-area click cases. If not, add the capture-phase listener fallback.
- [ ] T042 Resolve open question 2 (notification surface): document in this file or in the PR description which existing helper was reused.
- [ ] T043 Update BACKLOG.md row for 028 to `plan ✅`, `tasks ✅`, status `tasks done — ready for implement`.

---

## Dependencies

- T005 → T006 → T007 → T008 (Foundational selection model is sequential).
- US1 requires the Foundational selection model (T008) to be complete.
- T009 (i18n) is independent and `[P]` parallel with the unit-test phases.
- T010/T011 → T012 → T013 → T014 (pure helpers).
- T015 → T016 → T017 → T018 (orchestrator).
- T019–T024 depend on the orchestrator and selection model (T008, T018).
- T025 (CSS) depends on T019/T023 settling on class names.
- T026 → T027 (UI tests).
- US2 depends on US1's selection model and toolbar (T019). T028–T035 form a TDD chain.
- Polish (T036–T043) runs after both stories are green.

## Parallel Execution Opportunities

- **Setup [P]**: T001/T002/T003/T004 — all four in parallel.
- **i18n [P]**: T009 can run any time during T010–T018.
- **Polish [P]**: T036/T037/T038/T039/T040 — fully parallel.

## Implementation Strategy

- **MVP scope** = US1 (bulk move). Ship that before US2 if scope tightens; the toolbar can ship with `Delete` button greyed out until US2 lands.
- **Incremental commits**: (a) selection foundational, (b) i18n + bulk-actions pure helpers, (c) orchestrator, (d) toolbar + glue + CSS, (e) Playwright US1, (f) US2 (delete + confirm), (g) Playwright US2, (h) polish.

## Format Validation

All 43 tasks above use the canonical `- [ ] Tnnn [P?] [Story?] description with file path` checklist format. Setup/Foundational/Polish tasks have no story label; Phase-3 tasks carry `[US1]`; Phase-4 tasks carry `[US2]`.

## Open Questions Carry-Over

The 4 open questions in plan.md remain open until resolved by T041 (Q1), T042 (Q2), and the implementer's discretion (Q3, Q4).
