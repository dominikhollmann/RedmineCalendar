# Tasks: Undo for Time-Entry Changes (039-undo-scope)

**Input**: Design documents from `specs/039-undo-scope/`

**Branch**: `039-undo-scope`

**Organization**: Tasks are grouped by user story (US1–US7) to enable independent
implementation and testing of each story. TDD is mandatory (Constitution III): unit tests
and UI tests must be written and confirmed failing before any implementation begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete task dependencies)
- **[Story]**: US1–US7 mapping from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Skeleton modules, test scaffolding (TDD — tests written before implementation),
shared CSS/i18n needed by all stories.

⚠️ **Write tests FIRST and confirm they FAIL before moving to Phase 2.**

- [ ] T001 Create `js/undo-manager.js` skeleton — export `UNDO_STACK_MAX`, all `ACTION_*` constants, and an empty `undoManager` stub (methods exist but do nothing / return null) so unit tests can import the module
- [ ] T002 Write Vitest unit tests in `tests/unit/undo-manager.test.js` — cover: `push` / `undo` / `redo` LIFO behaviour, redo-stack cleared on push, depth-limit eviction at cap (UNDO_STACK_MAX=20), empty-stack returns null, `canUndo` / `canRedo` flags; **verify ALL tests fail with the T001 stub**
- [ ] T003 [P] Write Playwright UI tests in `tests/ui/undo.spec.js` — one describe block per user story: undo delete (US1), undo edit (US2), undo drag-move (US3), undo add with animation (US4), undo bulk delete (US5), undo paste (US6), redo after undo (US7), keyboard guard SC-003 (Ctrl+Z with text input focused has no effect); **verify ALL tests fail** before any instrumentation
- [ ] T004 [P] Add all `undo.*` and `redo.*` i18n keys to `js/i18n/en.js` per `specs/039-undo-scope/contracts/undo-manager-api.md` (including `{{count}}` interpolated keys for bulk variants)
- [ ] T005 [P] Add German translations for all new keys to `js/i18n/de.js`
- [ ] T006 [P] Add `.fc-event--undo-highlight` (yellow flash, 600 ms) and `.fc-event--undo-add-fade` (red tint → fade, 450 ms) CSS keyframe classes to `css/time-entry.css`
- [ ] T007 [P] Update `js/knowledge.topics.json` to route `undo-manager.js` and `undo-actions.js` to relevant topic entries

**Checkpoint**: T002 tests are runnable and failing. T003 Playwright tests exist and fail. All i18n keys and CSS classes are committed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logic + DOM plumbing that all user stories depend on.

⚠️ **CRITICAL**: No story work can begin until this phase is complete.

- [ ] T008 Implement `undoManager` singleton in `js/undo-manager.js` — `push` (clears redo stack, evicts oldest when `_undoStack.length === UNDO_STACK_MAX`), `undo` (pop from undo, push to redo, return action or null), `redo` (pop from redo, push to undo, return action or null), `canUndo`, `canRedo`, `clear`; run `npm test -- undo-manager` and confirm **all T002 tests pass**
- [ ] T009 Create `js/undo-actions.js` — (a) `document.addEventListener('keydown')` handler with the three-step guard: `activeElement` is input/textarea/contenteditable → return; `#entry-modal` not hidden → return; `#chatbot-panel` not hidden → return; otherwise Ctrl+Z calls `performUndo()` and Ctrl+Shift+Z/Ctrl+Y calls `performRedo()`; (b) `performUndo(action)` dispatcher stub (switch on `action.type`, all cases throw "not implemented"); (c) `performRedo(action)` dispatcher stub; (d) `navigateTo(date)` helper that dispatches `undo:navigate` on document; (e) `highlightEntry(entryId, updatedEntry)` helper dispatching `undo:preAnimate` then `undo:eventChanged`; (f) `fadeDeleteEntry(entryId)` helper dispatching `undo:preAnimate` with `animationType:'fade-delete'`
- [ ] T010 Add all `undo:*` event listeners to `js/calendar.js` — `undo:navigate`: navigate FullCalendar to `detail.date`; if date is weekend and calendar is in Mon–Fri `hiddenDays` mode switch to full-week (do not switch back); `undo:preAnimate`: find FC event by `detail.entryId`, add `detail.animationType === 'fade-delete' ? '.fc-event--undo-add-fade' : '.fc-event--undo-highlight'` CSS class; `undo:eventChanged`: update `fcEvent.setExtendedProp('timeEntry', detail.updatedEntry)`, re-apply highlight class; `undo:eventDeleted`: find FC event, call `.remove()`; `undo:eventAdded`: call `calendar.addEvent(mapEntry(detail.entry))`
- [ ] T011 [P] Add all `undo:*` event listeners to `js/planning-view-bookings.js` — mirror of T010 for the planning-view FullCalendar instance: navigate, preAnimate, eventChanged, eventDeleted, eventAdded
- [ ] T012 [P] Add `undo:navigate` listener to `js/planning-view.js` — navigate the planning-view's date range to the target date

**Checkpoint**: Foundation complete. `undoManager` unit tests green. Keyboard handler is live (no-op until stories are implemented). Calendar listeners are registered.

---

## Phase 3: User Story 1 — Undo Delete (Priority: P1) 🎯 MVP

**Goal**: A user who deletes a single time entry via the form can press Ctrl+Z to
re-create it in Redmine and see it reappear with all original field values.

**Independent Test**: Delete one entry, press Ctrl+Z, verify entry reappears at the
original date with the same hours, activity, issue, and comment as before.

- [ ] T013 [US1] Instrument `deleteTimeEntry` in `js/time-entry-form.js` — capture a full `TimeEntry` snapshot from `_currentEntry` before the delete API call; after `deleteTimeEntry` resolves successfully, call `undoManager.push({ type: ACTION_DELETE, entry: snapshot })`
- [ ] T014 [US1] Implement `performUndo` `'delete'` case in `js/undo-actions.js` — dispatch `undo:navigate` to `action.entry.spentOn`; call `createTimeEntry(action.entry)`; on success mutate `action.entry.id` with the new server-assigned ID (stale-ID fix); dispatch `undo:eventAdded`; show `t('undo.delete_restored')` toast
- [ ] T015 [US1] Implement `performRedo` `'delete'` case in `js/undo-actions.js` — dispatch `undo:navigate`; call `deleteTimeEntry(action.entry.id)`; dispatch `undo:eventDeleted`; show `t('redo.delete_reapplied')` toast; wrap both cases in try/catch showing `t('undo.failed')` / `t('redo.failed')` on API error

**Checkpoint**: US1 independently functional. `npm run test:ui:failed` US1 Playwright scenarios pass.

---

## Phase 4: User Story 2 — Undo Entry Edit (Priority: P2)

**Goal**: A user who submits a form edit can press Ctrl+Z to revert all changed fields.

**Independent Test**: Edit one entry (change hours, activity, or comment), submit, press
Ctrl+Z, verify the entry shows its pre-edit values on the calendar.

- [ ] T016 [US2] Instrument `updateTimeEntry` in `js/time-entry-form.js` — capture `before` (`EntryFields` snapshot from `_currentEntry` before the save) and `after` (the submitted payload fields); after `updateTimeEntry` resolves successfully, call `undoManager.push({ type: ACTION_EDIT, id: _currentEntry.id, before, after })`
- [ ] T017 [US2] Implement `performUndo` `'edit'` case in `js/undo-actions.js` — dispatch `undo:navigate` to `action.before.spentOn`; call `updateTimeEntry(action.id, action.before)`; on success dispatch `undo:eventChanged` with the reverted entry; show `t('undo.edit_reversed')` toast; wrap in try/catch
- [ ] T018 [US2] Implement `performRedo` `'edit'` case in `js/undo-actions.js` — dispatch `undo:navigate`; call `updateTimeEntry(action.id, action.after)`; dispatch `undo:eventChanged`; show `t('redo.edit_reapplied')` toast; wrap in try/catch

**Checkpoint**: US2 independently functional. US1 unaffected.

---

## Phase 5: User Story 3 — Undo Drag-Move / Resize (Priority: P3)

**Goal**: A user who drags an entry to the wrong date or resizes it can press Ctrl+Z
to restore the original position and duration.

**Independent Test**: Drag an entry to a new date, press Ctrl+Z, verify it returns
to its original date and start/end times.

- [ ] T019 [US3] Instrument `eventDrop` in `js/calendar.js` — capture `PositionFields` `before` from `oldEvent` and `after` from `event`, plus the full entry snapshot from `event.extendedProps.timeEntry`; after `updateTimeEntry` resolves, call `undoManager.push({ type: ACTION_MOVE, id, entry, before, after })`
- [ ] T020 [US3] Instrument `eventResize` in `js/calendar.js` — capture `PositionFields` `before`/`after`; after `updateTimeEntry` resolves, call `undoManager.push({ type: ACTION_RESIZE, id, entry, before, after })`
- [ ] T021 [P] [US3] Instrument `_onEventDrop` in `js/planning-view-bookings.js` — push `MoveAction` to `undoManager` after `updateTimeEntry` resolves (same pattern as T019)
- [ ] T022 [P] [US3] Instrument `_onEventResize` in `js/planning-view-bookings.js` — push `ResizeAction` to `undoManager` after `updateTimeEntry` resolves (same pattern as T020)
- [ ] T023 [US3] Implement `performUndo` `'move'` and `'resize'` cases in `js/undo-actions.js` — dispatch `undo:navigate` to `action.before.spentOn`; call `updateTimeEntry(action.id, action.before)`; dispatch `undo:eventChanged`; show `t('undo.move_reversed')` / `t('undo.resize_reversed')` toast; wrap in try/catch
- [ ] T024 [P] [US3] Implement `performRedo` `'move'` and `'resize'` cases in `js/undo-actions.js` — dispatch `undo:navigate` to `action.after.spentOn`; call `updateTimeEntry(action.id, action.after)`; dispatch `undo:eventChanged`; show redo toast; wrap in try/catch

**Checkpoint**: US3 independently functional. US1–US2 unaffected.

---

## Phase 6: User Story 4 — Undo Add / New Entry (Priority: P4)

**Goal**: A user who creates a new entry can press Ctrl+Z to delete it; the entry
briefly shows a red-tint fade animation before disappearing.

**Independent Test**: Create a new entry, press Ctrl+Z, verify the entry briefly
red-tints then disappears from the calendar.

- [ ] T025 [US4] Instrument `createTimeEntry` (add path) in `js/time-entry-form.js` — after `createTimeEntry` resolves on the new-entry path (i.e. `_currentEntry` is null at submit time), call `undoManager.push({ type: ACTION_ADD, entry: savedEntry })`; NOTE: paste path is handled separately in US6 (T033)
- [ ] T026 [P] [US4] Instrument `createTimeEntry` in `js/planning-view.js` `_bookOne` — after `createTimeEntry` resolves, call `undoManager.push({ type: ACTION_ADD, entry: savedEntry })`
- [ ] T027 [US4] Implement `performUndo` `'add'` case in `js/undo-actions.js` — dispatch `undo:navigate` to `action.entry.spentOn`; dispatch `undo:preAnimate` with `animationType: 'fade-delete'`; await 500 ms (`setTimeout` wrapped in a `Promise`); call `deleteTimeEntry(action.entry.id)`; on success dispatch `undo:eventDeleted`; show `t('undo.add_removed')` toast; wrap in try/catch
- [ ] T028 [US4] Implement `performRedo` `'add'` case in `js/undo-actions.js` — call `createTimeEntry(action.entry)`; mutate `action.entry.id` with new server ID (stale-ID fix); dispatch `undo:eventAdded`; show `t('redo.add_reapplied')` toast; wrap in try/catch

**Checkpoint**: US4 independently functional. Red-tint animation visible on undo-of-add. US1–US3 unaffected.

---

## Phase 7: User Story 5 — Undo Bulk Delete (Priority: P5)

**Goal**: A user who bulk-deletes multiple entries can press Ctrl+Z once to restore
all of them in a single step.

**Independent Test**: Bulk-select and delete 3 entries, press Ctrl+Z once, verify
all 3 reappear. Success toast says "Undo: 3 entries restored".

- [ ] T029 [US5] Instrument `Promise.all(deleteTimeEntry...)` in `js/entry-commands.js` — capture all `TimeEntry` snapshots (full entry objects) before deletes are dispatched; after all promises resolve, call `undoManager.push({ type: ACTION_BULK_DELETE, entries: snapshots })`; add `// TODO(undo): push bulk-move action here` comment at the appropriate location after the future bulk-move `updateTimeEntry` call (per research.md §1)
- [ ] T030 [US5] Implement `performUndo` `'bulk-delete'` case in `js/undo-actions.js` — dispatch `undo:navigate` to the first entry's `spentOn`; `await Promise.all(entries.map(e => createTimeEntry(e)))` with per-entry `.then(saved => { e.id = saved.id; })` (stale-ID fix); dispatch `undo:eventAdded` for each restored entry; show `t('undo.bulk_delete_restored', { count: entries.length })` toast; surface per-entry errors without aborting sibling restores
- [ ] T031 [US5] Implement `performRedo` `'bulk-delete'` case in `js/undo-actions.js` — `await Promise.all(entries.map(e => deleteTimeEntry(e.id)))`; dispatch `undo:eventDeleted` for each; show `t('redo.bulk_delete_reapplied', { count })` toast; wrap in try/catch

**Checkpoint**: US5 independently functional. One Ctrl+Z reverses the full bulk-delete. US1–US4 unaffected.

---

## Phase 8: User Story 6 — Undo Copy-Paste (Priority: P6)

**Goal**: A user who pastes a copied entry can press Ctrl+Z to remove the pasted
entry, with a distinct "pasted entry removed" toast that differentiates it from
undoing a regular add.

**Independent Test**: Copy an entry, paste it, press Ctrl+Z, verify the pasted entry
disappears and the toast says "Undo: pasted entry removed" (not "new entry removed").

- [ ] T032 [US6] Instrument the `onSave` callback in `js/calendar.js` for the paste path — when `_clipboard` is non-null at the time the form's `onSave` fires, push `{ type: ACTION_PASTE, entry: savedEntry }` instead of `ACTION_ADD`; the form's new-entry `createTimeEntry` instrumentation in T025 must NOT fire in this path
- [ ] T033 [US6] Implement `performUndo` `'paste'` case in `js/undo-actions.js` — same flow as the `'add'` undo case (navigate → `undo:preAnimate` fade-delete → 500 ms delay → `deleteTimeEntry` → `undo:eventDeleted`), but toast shows `t('undo.paste_removed')`
- [ ] T034 [US6] Implement `performRedo` `'paste'` case in `js/undo-actions.js` — call `createTimeEntry(action.entry)`, mutate `action.entry.id`, dispatch `undo:eventAdded`, show `t('redo.paste_reapplied')` toast; wrap in try/catch

**Checkpoint**: US6 independently functional. Paste undo uses distinct toast from add undo. US1–US5 unaffected.

---

## Phase 9: User Story 7 — Redo (Priority: P7)

**Goal**: After undoing any action, the user can press Ctrl+Shift+Z (or Ctrl+Y) to
reapply it. Performing a new data-changing action clears the redo stack.

**Independent Test**: Edit an entry → Ctrl+Z (undo) → Ctrl+Shift+Z (redo) → verify edit
reapplied. Then: perform another edit after undoing → Ctrl+Shift+Z → verify nothing happens.

- [ ] T035 [US7] Verify Ctrl+Shift+Z and Ctrl+Y in the keyboard handler (T009, `js/undo-actions.js`) correctly call `undoManager.redo()` and pass the returned action to `performRedo`; confirm that `undoManager.push()` clears `_redoStack` — run `npm test -- undo-manager` to validate the redo-clear unit tests are green
- [ ] T036 [US7] Implement global error-handling wrapper in `js/undo-actions.js` for both `performUndo` and `performRedo` — any unhandled rejection or thrown error shows `t('undo.failed', { message })` / `t('redo.failed', { message })` toast and leaves the calendar state unchanged; verify SC-005 (error surfaced within 2 s, no silent corruption)

**Checkpoint**: All 7 user stories functional. Run `npm run test:ui:failed` and verify all undo/redo Playwright scenarios pass.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T037 [P] Update `docs/content.en.md` — add a "Keyboard Shortcuts" or "Undo & Redo" section documenting: Ctrl+Z reverses any time-entry write; Ctrl+Shift+Z or Ctrl+Y re-applies the last undo; history is limited to ~20 steps and resets on page reload; shortcuts are inactive while the entry form or AI chat is open
- [ ] T038 [P] Update `docs/content.de.md` — German translation of T037 content
- [ ] T039 Run full Playwright suite `npm run test:ui` and fix any remaining failures; verify all 11 scenarios from `specs/039-undo-scope/quickstart.md` behave as described
- [ ] T040 Run `npm run sqi` and confirm SQI ≥ 80 GREEN; check both `js/undo-manager.js` (≤ 500 effective LOC, all functions ≤ 60 LOC) and `js/undo-actions.js` against the same thresholds; run `npm run lint && npm run typecheck` clean

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. TDD test files must be written and confirmed failing before Phase 2.
- **Foundational (Phase 2)**: Depends on Phase 1 complete. **Blocks all user story phases.**
- **US1–US7 (Phases 3–9)**: All depend on Foundational completion; US stories can be implemented sequentially (P1 → P7) by a single developer or in parallel by multiple developers.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Phase 2. No dependency on other stories.
- **US2 (P2)**: Can start after Phase 2. Shares `js/time-entry-form.js` with US1 — coordinate edits if parallel.
- **US3 (P3)**: Can start after Phase 2. Touches `js/calendar.js` and `js/planning-view-bookings.js`.
- **US4 (P4)**: Can start after Phase 2. Shares `js/time-entry-form.js` with US1/US2 — coordinate if parallel.
- **US5 (P5)**: Can start after Phase 2. Only touches `js/entry-commands.js`.
- **US6 (P6)**: Can start after Phase 2. Shares `js/calendar.js` with US3 — coordinate if parallel.
- **US7 (P7)**: Verifies/wires up the redo keyboard path already built in T009 and the per-type redo cases built in earlier phases; can start after Phase 2 but benefits from US1–US6 complete for full coverage.

### Within Each User Story

1. Instrumentation task (push to undo stack at call site)
2. `performUndo` case
3. `performRedo` case (can run in parallel with step 2)

### Parallel Opportunities

| Group | Tasks | Why parallelisable |
|---|---|---|
| i18n + CSS + knowledge | T004, T005, T006, T007 | Different files, no dependencies |
| Playwright + unit skeleton | T002, T003 | Different test files |
| Planning-view listeners | T011, T012 | Different files from T010 |
| Planning-view instrumentation | T021, T022 | Same file; combine into one edit session |
| Add instrumentation | T025, T026 | Different files |
| Undo + redo for move | T023, T024 | Same file but independent cases |
| Docs | T037, T038 | Different files |

---

## Parallel Example: Phase 1 (Setup)

```bash
# Run all Setup tasks in parallel (all different files):
T001: js/undo-manager.js skeleton
T002: tests/unit/undo-manager.test.js (write tests, confirm failing)
T003: tests/ui/undo.spec.js (write UI tests, confirm failing)
T004: js/i18n/en.js
T005: js/i18n/de.js
T006: css/time-entry.css
T007: js/knowledge.topics.json
```

## Parallel Example: User Story 3

```bash
# After T019 + T020 (calendar.js instrumentation):
Parallel: T021 (planning-view-bookings.js _onEventDrop)
          T022 (planning-view-bookings.js _onEventResize)

# After instrumentation tasks:
Parallel: T023 (performUndo 'move'/'resize')
          T024 (performRedo 'move'/'resize')
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (TDD — write tests first, confirm failing)
2. Complete Phase 2: Foundational (make unit tests pass, listeners registered)
3. Complete Phase 3: US1 — Undo Delete
4. **STOP and VALIDATE**: `npm run test:ui:failed` US1 scenarios; verify entry reappears after Ctrl+Z
5. Demo / checkpoint with stakeholder

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready; unit tests green
2. Phase 3 (US1) → Undo delete working → Validate
3. Phase 4 (US2) → Undo edit working → Validate
4. Phase 5 (US3) → Undo drag-move working → Validate
5. Phase 6 (US4) → Undo add with animation → Validate
6. Phase 7 (US5) → Undo bulk delete → Validate
7. Phase 8 (US6) → Undo paste → Validate
8. Phase 9 (US7) → Full redo pass → Validate
9. Final Phase → `npm run test:ui` full suite; docs; SQI gate

---

## Notes

- `[P]` tasks touch different files and have no outstanding incomplete dependencies
- Each story phase is independently testable: run `npm run test:ui:failed` after each story's Checkpoint
- TDD is mandatory (Constitution III): T002 and T003 must fail before any implementation lands
- The stale-ID mutation pattern (mutating `action.entry.id` after undo-of-delete creates a new entry) is needed in T014, T028, T030, and T034
- Commit after each task or logical group; commit messages reference the task ID (e.g. `T014: implement undo case for delete action`)
- The `ACTION_BULK_MOVE` constant is defined in `js/undo-manager.js` (via T001/T008) but has no call site yet; T029 adds the stub comment marking where instrumentation should be added when bulk-move ships
