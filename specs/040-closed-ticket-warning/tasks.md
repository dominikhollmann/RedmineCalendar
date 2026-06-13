# Tasks: Closed Ticket Booking Gate

**Input**: Design documents from `specs/040-closed-ticket-warning/`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure that all user story phases depend on — `fetchIssueStatus`, the shared confirm dialog, HTML/CSS scaffolding, and i18n keys.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `fetchIssueStatus(issueId)` to `js/redmine-api.js` — `GET /issues/${issueId}.json`, extract `issue.status.is_closed`; return `null` on error (per `contracts/redmine-issue-status-api.md`)
- [x] T002 [P] Add `fetchIssueStatuses(issueIds)` to `js/redmine-api.js` — batch via `GET /issues.json?issue_id=...&limit=100`; return `Map<number, boolean>`; return empty Map on error (per `contracts/redmine-issue-status-api.md`)
- [x] T003 Write unit tests for `fetchIssueStatus` and `fetchIssueStatuses` in `tests/unit/closed-ticket-status.test.js` — cover success, error/null, empty-Map, and missing-key paths
- [x] T004 Create `js/confirm-dialog.js` — implement `showConfirmDialog(opts)` per `contracts/confirm-dialog-api.md`; manage `#confirm-dialog` element; trap focus; replace any open dialog on re-call
- [x] T005 Write unit tests for `showConfirmDialog` in `tests/unit/confirm-dialog.test.js` — cover open, confirm callback, cancel callback, backdrop close, and re-entrant call
- [x] T006 Add `<div id="confirm-dialog">` HTML element to `index.html` at document root per `contracts/confirm-dialog-api.md` (role, aria-modal, aria-labelledby, child elements)
- [x] T007 [P] Add `.closed-ticket-badge` CSS rules to `css/time-entry.css` — amber/yellow badge reusing existing `--color-warning-*` palette tokens; `display:none` by default, `display:inline-flex` when `.visible`
- [x] T008 [P] Add i18n keys to `js/i18n/en.js`: `timeEntry.closedTicketBadge`, `timeEntry.closedTicketConfirmTitle`, `timeEntry.closedTicketConfirmBody`, `planning.closedTicketBadge`; add `confirm` and `cancel` keys if absent
- [x] T009 [P] Add i18n keys to `js/i18n/de.js` — same keys as T008 in German (see `research.md` D-006 for values)
- [x] T010 [P] Register `confirm-dialog.js` in `js/knowledge.topics.json` under the `time-entry` topic

**Checkpoint**: Shared API functions, confirm dialog, HTML shell, CSS, and i18n all in place — user story implementation can now begin.

---

## Phase 2: User Story 1 — Manual Ticket Selection in Modal (Priority: P1) 🎯 MVP

**Goal**: Warning badge appears beneath the issue field as soon as a closed ticket is selected in the modal; confirmation dialog gates the submit.

**Independent Test**: Open the modal, select a known closed ticket, verify the amber badge appears; click Submit, verify the confirmation dialog appears; cancel → modal stays open; confirm → entry created.

- [x] T011 [US1] In `js/time-entry-form.js` `selectAndSave()`, after storing issue data, call `fetchIssueStatus(ticket.id)` and update `_selectedIssue.is_closed` on resolution; call badge refresh helper
- [x] T012 [US1] Add `updateClosedTicketBadge()` helper in `js/time-entry-form.js` — shows badge with `t('timeEntry.closedTicketBadge')` text when `_selectedIssue?.is_closed === true`, hides otherwise; call on issue select, field clear, and form reset
- [x] T013 [US1] Add warning badge DOM element (`.closed-ticket-badge`) below the issue search field in the time-entry form markup in `js/time-entry-form-view.js` (or `index.html`)
- [x] T014 [US1] In `js/time-entry-form.js` `doSave()`, between `validateTimeInputs()` and `persistTimeEntry()`: if `_selectedIssue?.is_closed === true`, call `showConfirmDialog({ title: t('timeEntry.closedTicketConfirmTitle'), message: t('timeEntry.closedTicketConfirmBody'), onConfirm: () => persistTimeEntry(...), onCancel: () => {} })`; skip confirmation and proceed directly for open/unknown tickets
- [x] T015 [US1] Add Playwright UI tests for US1 in `tests/ui/closed-ticket.spec.js`: badge appears on closed-ticket selection; badge absent for open ticket; dialog on submit with closed ticket; cancel keeps modal; confirm creates entry

**Checkpoint**: US1 fully functional — badge + gate working for manual ticket selection.

---

## Phase 3: User Story 2 — Editing / Pre-filling Modal with Closed Ticket (Priority: P2)

**Goal**: Badge appears immediately when the modal opens for an existing entry or any pre-filled form whose ticket is closed. Gate on submit is already in place from Phase 2.

**Independent Test**: Click an existing calendar entry on a closed ticket → edit modal opens → badge visible immediately before any user interaction → submit → dialog appears.

- [x] T016 [US2] In `js/time-entry-form.js` `openForm()`, resolve the `issueId` from edit-mode entry data or from `prefill.issueId`; if present, call `fetchIssueStatus(issueId)` and call `updateClosedTicketBadge()` on resolution (covers US2 edit path and US4/US5 prefill paths simultaneously)
- [x] T017 [US2] Add Playwright UI tests for US2 in `tests/ui/closed-ticket.spec.js`: edit modal opens with badge for closed ticket; badge absent for open ticket; submit triggers dialog

**Checkpoint**: US1 + US2 complete — badge + gate works for both new selections and existing-entry edits.

---

## Phase 4: User Story 4 + 5 — Copy-Paste and AI Pre-fill (Priority: P3)

**Goal**: Copy-paste and AI-pre-filled modals show the badge and gate. T016 already covers both paths via `openForm(null, prefill, ...)` — this phase adds validation tests only.

**Independent Test**: Copy a closed-ticket entry, paste to new slot → modal opens, badge visible → submit → dialog. Ask AI to book on closed ticket → modal opens, badge visible → submit → dialog.

- [x] T018 [P] [US4] Add Playwright UI tests for US4 in `tests/ui/closed-ticket.spec.js`: copy-paste with closed-ticket entry → badge in pre-filled modal → dialog on submit → cancel keeps modal → confirm creates entry
- [x] T019 [P] [US5] Add Playwright UI tests for US5 in `tests/ui/closed-ticket.spec.js`: AI pre-fill with closed ticket → badge in modal → dialog on submit → confirm creates entry

**Checkpoint**: US1, US2, US4, US5 complete — all modal booking paths fully gated.

---

## Phase 5: User Story 3 — Outlook Planning View DnD (Priority: P3)

**Goal**: ⚠️ badge on Outlook event card in planning view when ticket is closed; confirmation dialog before booking on drag-to-calendar.

**Independent Test**: Planning view panel with a closed-ticket Outlook event → ⚠️ badge visible on the card, tooltip on hover. Drag to calendar → dialog → cancel: no entry, calendar unchanged → confirm: entry created.

- [x] T020 [US3] In `js/planning-view-outlook.js` `renderOutlookColumn()`, after building proposals, collect all non-null `ticketId` values; call `fetchIssueStatuses(ticketIds)` and annotate each proposal with `is_closed` from the returned Map (per `data-model.md` PlanningProposal extension)
- [x] T021 [US3] In `js/planning-view-outlook.js` `_buildCardContent()`, when `proposal.is_closed === true`, render a `⚠️` badge element with tooltip text `t('planning.closedTicketBadge')` on the event card
- [x] T022 [US3] In `js/planning-view.js` `_bookOne()`, before calling `createTimeEntry()` for a proposal with a resolved `ticketId`, check `proposal.is_closed`; if true, call `showConfirmDialog()`; proceed with `createTimeEntry()` only on confirm; abort booking on cancel
- [x] T023 [US3] Add Playwright UI tests for US3 in `tests/ui/closed-ticket.spec.js`: planning view badge visible on closed-ticket event; tooltip on hover; drag triggers dialog; cancel leaves calendar unchanged; confirm creates entry; no badge on open-ticket events

**Checkpoint**: US3 complete — planning view badge and DnD gate both working.

---

## Phase 6: User Story 6 — Within-Calendar Rescheduling DnD (Priority: P3)

**Goal**: Confirmation dialog before committing reschedule when ticket is closed; cancel snaps entry back.

**Independent Test**: Drag existing closed-ticket entry to new slot → loading indicator briefly → dialog → cancel: entry snaps back → confirm: entry rescheduled in Redmine.

- [x] T024 [US6] In `js/calendar.js` `eventDrop()`, after extracting `entry`, call `fetchIssueStatus(entry.issueId)`; while fetch is in flight, apply a loading CSS class to the dropped event element via `info.el`
- [x] T025 [US6] After `fetchIssueStatus()` resolves in `eventDrop()`: remove loading class; if `is_closed`, call `showConfirmDialog()` — on confirm proceed with `updateTimeEntry()`; on cancel call `info.revert()`; if status unknown/null, skip dialog and proceed
- [x] T026 [US6] Add Playwright UI tests for US6 in `tests/ui/closed-ticket.spec.js`: drag closed-ticket entry → dialog → cancel reverts position → confirm reschedules; drag open-ticket entry → no dialog, immediate reschedule

**Checkpoint**: All six booking paths gated. Complete feature implementation done.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T027 [P] Update `docs/content.en.md` — document the closed-ticket warning badge (modal) and confirmation dialog behaviour across all six booking paths
- [x] T028 [P] Update `docs/content.de.md` — same content in German
- [x] T029 Run `npm run lint && npm run typecheck` and fix any issues introduced by this feature
- [x] T030 Run `npm run sqi` and confirm composite score ≥ 80 GREEN; if YELLOW, address per constitution Principle VI before marking done

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Requires Phase 1 complete — BLOCKS US2, US4, US5 (all share badge + gate logic)
- **US2 (Phase 3)**: Requires US1 complete (reuses `updateClosedTicketBadge()` and `doSave()` gate)
- **US4+US5 (Phase 4)**: Requires US2 complete (reuses T016 `openForm()` change) — T018 and T019 are parallel
- **US3 (Phase 5)**: Requires Phase 1 complete only — independent of modal phases; can run parallel to Phase 2 once Phase 1 is done
- **US6 (Phase 6)**: Requires Phase 1 complete only — independent; can run parallel to Phases 2–5
- **Polish (Phase 7)**: Requires all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 1 — no story dependencies
- **US2 (P2)**: Starts after US1 (shares `updateClosedTicketBadge()`)
- **US3 (P3)**: Starts after Phase 1 (independent of US1/US2)
- **US4 (P3)**: Starts after US2 (T016 is the shared code change)
- **US5 (P3)**: Starts after US2 — test only, no additional code change
- **US6 (P3)**: Starts after Phase 1 (independent of modal phases)

### Parallel Opportunities Within Phases

**Phase 1**: T002, T007, T008, T009, T010 can all run in parallel after T001.

**Phase 5 (US3)**: T020 → T021 depends on T020 (proposal objects must have `is_closed`); T022 depends on T020; T023 depends on T020–T022.

**Phase 7**: T027 and T028 can run in parallel.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Foundational) — ~10 tasks
2. Complete Phase 2 (US1) — ~5 tasks
3. **STOP and VALIDATE**: Run quickstart.md Scenarios 1–2 and Scenario 8 (regression)
4. Ship if urgent — US1 covers the most common booking path

### Incremental Delivery

1. Phase 1 → Phase 2 (US1) → validate → MVP ready
2. Phase 3 (US2) → validate Scenario 3
3. Phase 4 (US4+US5) → validate Scenarios 4–5
4. Phase 5 (US3) + Phase 6 (US6) in parallel → validate Scenarios 6–7
5. Phase 7 (Polish) → full quickstart.md pass

---

## Notes

- Constitution Principle III (Test-First): unit tests (T003, T005) and Playwright tests (T015, T017–T019, T023, T026) are included per project mandate — CI requires ≥95% line coverage on unit-tested modules.
- All user-visible strings use `t()` — no hardcoded EN strings in JS.
- `confirm-dialog.js` must be added to `knowledge.topics.json` (T010) before the PR merge or `npm run knowledge:check` will fail CI.
- `docs/content.en.md` + `docs/content.de.md` updates (T027–T028) are required per CLAUDE.md housekeeping rules before marking the feature done.
