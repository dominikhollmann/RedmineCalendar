---
description: "Implementation tasks for feature 025 — Break-Ticket Booking for Non-Work Calendar Events"
---

# Tasks: Break-Ticket Booking for Non-Work Calendar Events

**Input**: Design documents from `/.specify/features/025-break-ticket-booking/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Each implementation task includes its own unit and/or UI tests. A task is not done until its tests exist and pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to a user story in `spec.md` (US1, US2, US3); Setup / Foundational / Polish phases carry no story label
- File paths are absolute or relative to repo root

## Path Conventions

Single project (static SPA). Source under `js/`, `css/`, root HTML files; tests under `tests/unit/` (Vitest) and `tests/ui/` (Playwright).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared scaffolding all stories will rely on (CSS, i18n keys, config schema doc).

- [x] T001 Add CSS rules in `css/style.css`: `.input--locked` (reduced opacity + `cursor: not-allowed`) and `.fc-event--break` (muted gray background + small "0h" badge per FR-010 / research R3). Include a Playwright visual snapshot in `tests/ui/break-styling.spec.js` to lock the appearance.
- [x] T002 [P] Add new i18n keys in `js/i18n.js` (EN + DE): `modal.hours_locked_break`, `chatbot.break_routing_disabled`, `calendar.break_label` (the "Break (0h)" label per FR-010), `outlook.break_proposal_with_subject` (proposal-line format showing ticket number + title per FR-011), `outlook.proposal_with_subject` (same enrichment for non-break proposals). Include a Vitest unit test in `tests/unit/i18n.test.js` (or extend existing) asserting both locales return non-empty strings for each new key.
- [x] T003 [P] Document the `breakTicket` field in `config.json` deployment docs: update the example/template `config.json` (or `README.md` / `CLAUDE.md` if no example file) to include `"breakTicket": <id>` and re-state that `holidayTicket` is now admin-managed. No tests; documentation only.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core wiring every user story depends on. **No user-story work may start until this phase is complete.**

**⚠️ CRITICAL**: T004 + T005 BLOCK all of US1, US2, US3.

- [x] T004 In `js/chatbot-tools.js`, replace the `import { readHolidayTicket }` from `./settings.js` with `getCentralConfigSync` and read both `holidayTicket` AND `breakTicket` from the central config object. Pass both into the `parseCalendarProposals(events, existingEntries, weeklyHours, holidayTicket, breakTicket)` call signature (data-model.md §1) and the day-summary context the AI sees (`contracts/classifier.md` — emit a `break ticket: <id>` header line when configured). Include Vitest unit tests in `tests/unit/chatbot-tools.test.js` asserting (a) holidayTicket and breakTicket are sourced from central config, (b) the day-summary text includes the break-ticket line iff `breakTicket` is set.
- [x] T005 In `js/settings.js`, extend `loadCentralConfig()` to call a new internal helper `cleanupLegacyKeys()` after a successful config fetch; the helper does `localStorage.removeItem(STORAGE_KEY_HOLIDAY_TICKET)` (FR-007). Include Vitest unit test in `tests/unit/settings-cleanup.test.js` asserting (a) the legacy key is removed on app init even if Settings page is never opened, (b) cleanup is a no-op when the key is absent (no error).

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Non-work events appear on the calendar (Priority: P1) 🎯 MVP

**Goal**: AI classifies subject-based non-work events and routes them to the break ticket at 0h; sensitivity flag is fully ignored; ticket extraction wins when both signals fire (Q5).

**Independent Test**: With `breakTicket` configured, run "Book my time for today" on a day containing "Doctor Appointment" — the proposal lists it as a Break (0h) on the configured ticket; confirming creates a 0h Redmine entry and the day's work-hour total is unchanged. Sensitivity-Private events with a work title are also visible (UAT-4).

- [x] T006 [P] [US1] Update Vitest unit tests in `tests/unit/outlook.test.js`: drop the existing "private events are filtered" assertions; add cases asserting (a) a sensitivity:'private' event with extracted ticket `#2097` appears as a work proposal on 2097, (b) a sensitivity:'private' event without a ticket falls into `'needs-ticket'` (per research R6), (c) the `skippedPrivate` array is removed from the parser's return value.
- [x] T007 [P] [US1] Add Vitest unit test in `tests/unit/outlook.test.js` for the holiday all-day shape: with `redmine_calendar_working_hours = {start: '08:00', end: '16:00'}`, a "Bank Holiday" all-day event MUST yield `startTime: '08:00'`, `endTime: startTime + dailyHours`, `hours = dailyHours`. Include the fallback case (working hours unset → `startTime: '09:00'`).
- [x] T008 [US1] In `js/outlook.js`, remove the sensitivity filter block at line 118 and the `skippedPrivate` accumulator. Update the function's return shape to drop `skippedPrivate`. T006 should now pass. Update the `parseCalendarProposals` JSDoc and signature to accept `breakTicket` (currently unused inside the parser; reserved for future enhancement, presence-only check OK).
- [x] T009 [US1] In `js/outlook.js`, change the holiday all-day branch (currently at lines 126-136) so that when `isHoliday && holidayTicket`, the proposal carries `startTime = workingHours.start || '09:00'`, `endTime = startTime + dailyHours` (FR-013). Read working hours via `readWorkingHours()` (already imported via the chatbot-tools.js context — pass through as a parameter). T007 should now pass.
- [x] T010 [US1] In `js/chatbot-tools.js`, extend the booking-flow system prompt with the non-work classification paragraph verbatim from `contracts/classifier.md` (multilingual EN+DE vocabulary, conditional on `breakTicket` in context, "don't re-ask after user correction" rule). Include a Vitest unit test that snapshots the assembled system prompt to detect accidental drift.
- [x] T011 [US1] In `js/chatbot-tools.js`, in the proposal-rendering loop (currently lines 376-387), enrich every proposal line to include the proposed ticket's NUMBER AND TITLE (FR-011). For events with `ticketId` already set, fetch the ticket subject via `redmine-api.js` (use existing `fetchIssueSummary` or equivalent; cache lookups within the call to avoid N+1). For the AI-classified-as-break case, the title comes from the central config / a known constant. Include a Vitest test asserting that proposal text contains both number and title for each line.
- [x] T012 [P] [US1] Add Vitest unit test in `tests/unit/chatbot-break.test.js` (NEW) with a mocked AI tool-call layer: simulate the AI emitting `create_time_entry({issueId: breakTicket, hours: 0, startTime: '14:00', spentOn: '2026-05-07', comment: 'Doctor Appointment'})` after seeing a needs-ticket proposal. Assert that (a) the chatbot orchestration calls `redmine-api.createTimeEntry` with those exact arguments, (b) the modal's hours-lock invariant (FR-012) is honored if the modal opens, (c) the success message references the break ticket.
- [x] T013 [P] [US1] Add Vitest unit test in `tests/unit/calendar-render.test.js` (NEW): a Redmine time entry with `hours: 0` and `startTime: '14:00'` MUST be mapped to a FullCalendar event with `start = "<date>T14:00"`, `end = "<date>T14:15"` (synthetic 15-min display per research R3), `classNames` containing `'fc-event--break'`, and `extendedProps.timeEntry.hours === 0` preserved.
- [x] T014 [US1] In `js/calendar.js`, modify the time-entry → FullCalendar event mapper so that when `entry.hours === 0`, the FC event's `end` is computed as start + 15 minutes (display-only) and `classNames` includes `'fc-event--break'`. The original `entry.hours = 0` MUST remain in `extendedProps.timeEntry` so totals (calendar.js:160) stay correct. T013 should now pass.
- [x] T015 [US1] In `js/chatbot.js`, when the booking flow starts and `getCentralConfigSync().breakTicket` is unset, emit a one-time-per-session chat notice using the `chatbot.break_routing_disabled` i18n key (FR-004). Track "already shown" state in a session-scoped variable so the notice doesn't repeat. Include a Vitest unit test asserting the notice fires once on first booking and is suppressed on second.
- [ ] T016 [P] [US1] Add Playwright UI test in `tests/ui/booking-flow-break.spec.js` (NEW): with mocked Outlook events (one "Doctor Appointment 14:00–15:00", one "Sprint Planning #2097 09:00–10:00") and a mocked AI that classifies "Doctor Appointment" as non-work, run the booking flow. Assert (a) proposal summary shows both events with ticket number AND title, (b) confirming the doctor entry creates a Redmine POST with `hours: 0` and `issueId: breakTicket`, (c) the calendar after refresh shows the 0h entry with `.fc-event--break` class and the synthetic 15-min display.
- [ ] T017 [US1] In `js/chatbot.js`, ensure that when an AI-classified non-work event is created, the modal does NOT open for it (the AI directly calls `create_time_entry` per `contracts/classifier.md`). Confirm via the existing tool-call flow; if the modal currently always opens for confirmation, branch on whether the AI's tool call already specifies all required fields (it will for break entries). Include a Vitest assertion in the existing chatbot orchestration tests.
- [ ] T018 [US1] Manual UAT: run `quickstart.md` UAT-3 (AI classifies a non-work event) and UAT-4 (sensitivity ignored). Both must pass.

**Checkpoint**: User Story 1 fully functional. The MVP can ship at this point with US1 alone — non-work events become visible without inflating hours.

---

## Phase 4: User Story 2 — User can re-route any event to the break ticket (Priority: P2)

**Goal**: Manual override path — the modal hours-lock invariant (FR-012) holds in all cases. User can pick the break ticket in any modal context and hours auto-zero and lock; switching back restores prior hours.

**Independent Test**: Open the time-entry modal from any path (calendar empty-slot click, or per-event confirmation), pick the break ticket, assert hours = 0 and disabled. Switch back to a work ticket, assert hours editable and prior value restored. UAT-7 covers this end-to-end.

- [x] T019 [P] [US2] Add Vitest unit tests in `tests/unit/time-entry-modal.test.js` (NEW) for the modal hours-lock state machine, covering every case in `contracts/modal-lock.md` §"Conformance checks": (a) open with break prefilled → locked, (b) work → break → locked + previous hours stored, (c) break → work → unlocked + restored, (d) work → break → work → cycle preserves original, (e) no central config → lock never engages.
- [x] T020 [US2] In `js/time-entry-form.js`, implement the `applyHoursLock(newTicketId, hoursInput, startInput, endInput)` function per `contracts/modal-lock.md` §"Public surface". Wire it to (a) modal-open initial state, (b) the existing ticket-change handler, (c) modal-reset/cancel. Aria-label uses the `modal.hours_locked_break` i18n key from T002. T019 cases must pass.
- [ ] T021 [P] [US2] Add Playwright UI test in `tests/ui/modal-hours-lock.spec.js` (NEW): click an empty calendar slot at 10:00 (30-min duration), assert hours-input shows 0.5 and is enabled. Search and select the configured break ticket. Assert hours-input value === "0" AND `disabled` attribute present AND has `.input--locked` class. Click Save, intercept the POST, assert `hours: 0`. Reopen, switch back to a work ticket, assert hours-input is editable and reads 0.5 (restored).

**Checkpoint**: User Story 2 fully functional. Manual override path works in addition to AI flow.

---

## Phase 5: User Story 3 — Tickets configured centrally in config.json (Priority: P1)

**Goal**: Settings page no longer exposes ticket-number inputs; `holidayTicket` and `breakTicket` are admin-only via `config.json`. Legacy localStorage cleanup happens on every app init (covered by T005 in foundational).

**Independent Test**: Open the Settings page; confirm zero ticket-number inputs. UAT-1 + UAT-2 cover the user-visible behavior.

- [x] T022 [US3] In `settings.html`, remove the holiday-ticket label (`<label for="holidayTicket">` at line ~63) and the corresponding `<input type="number" id="holidayTicket">` (line ~64) from the form. Remove any related markup (helper text, surrounding `<div>` if it becomes empty) and the i18n key `settings.holiday_ticket` from `js/i18n.js` (both EN + DE). FR-006.
- [x] T023 [US3] In `js/settings.js`, remove the exports `readHolidayTicket()` (lines ~42-46) and `writeHolidayTicket()` (lines ~48-54). Remove the holiday-ticket form-handling code at lines ~232 (`document.getElementById('holidayTicket')`), ~234 (`readHolidayTicket()` call), ~236 (DOM populate), ~285-288 (form submit handling). Sanity-grep the codebase to confirm no other consumers (research R7 says only `chatbot-tools.js` consumed these, and T004 already migrated it). Include a Vitest assertion that `readHolidayTicket` and `writeHolidayTicket` are no longer exported.
- [ ] T024 [P] [US3] Add Playwright UI test in `tests/ui/settings-page-no-tickets.spec.js` (NEW): load `/settings.html`, assert the page contains an input for "Weekly hours" but NO element matching `[id="holidayTicket"]` or `[id="breakTicket"]`, no label whose text contains "Holiday ticket" or "Break ticket" (in either EN or DE per i18n).
- [x] T025 [US3] Verification step: grep the codebase for remaining `STORAGE_KEY_HOLIDAY_TICKET`, `readHolidayTicket`, `writeHolidayTicket`, and `holidayTicket` references. Confirm only the cleanup helper in `js/settings.js` (T005) and the central-config consumer in `js/chatbot-tools.js` (T004) remain. The constant `STORAGE_KEY_HOLIDAY_TICKET` in `js/config.js` is retained for the cleanup helper. No other consumers. Document any lingering references in plan.md follow-up if found.

**Checkpoint**: User Story 3 fully functional. Settings page is clean; admins control both ticket IDs via `config.json`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: User docs, UAT, visual review, and pruning.

- [x] T026 Update user documentation in `docs/content.en.md` AND `docs/content.de.md` (REQUIRED for user-facing features per template): explain that non-work events (lunch, doctor, etc.) are now booked to a configured break ticket at 0 hours and stay visible on the calendar; explain that admins now configure the break and holiday tickets in `config.json` (the Settings page no longer asks the user); explain the modal's locked-hours behavior when the break ticket is selected. Bilingual content per existing convention.
- [ ] T027 Run the full `quickstart.md` UAT script against the dev server (UAT-1 through UAT-10). Record pass/fail in the document and resolve any failures before declaring the feature done.
- [ ] T028 [P] Visual review: open `index.html` and exercise the booking flow end-to-end. Confirm `.fc-event--break` is visually distinct from work entries (color, badge), the synthetic 15-min display block is clickable, the modal's `.input--locked` treatment is unambiguous, and the "Break (0h)" label is legible at typical zoom levels. Note any tweaks in a follow-up issue rather than blocking this feature.

<!-- T029 (delete orphaned `outlook.skipped_private_item` i18n key) is intentionally deferred to a follow-up release per research.md R6 — leave the unused key in place for one release as defense in depth. -->

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **BLOCKS** all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independent of US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational. Modal-lock invariant uses `getCentralConfigSync().breakTicket` (wired by T004). Independent of US1/US3 — the invariant holds even if US1 is not yet implemented (manual modal-only path).
- **User Story 3 (Phase 5)**: Depends on Foundational (T004 must already read `holidayTicket` from central config so T023 can safely remove the localStorage path). Independent of US1/US2.
- **Polish (Phase 6)**: Depends on US1, US2, US3 all being functionally complete.

### User Story Dependencies

- **US1 (P1, MVP)**: After Foundational. Standalone deliverable.
- **US2 (P2)**: After Foundational. Standalone — exercises modal even if US1 not yet built.
- **US3 (P1)**: After Foundational. Standalone — UI cleanup only.

### Within Each User Story

- Tests precede implementation (T006/T007 before T008/T009; T013 before T014; T019 before T020).
- Models/parsers precede orchestrators (T008 + T009 in `outlook.js` before T010-T012 in `chatbot-tools.js`).
- Each task includes its own tests; a task is not done until tests pass.

### Parallel Opportunities

- **Within Setup**: T002 [P] and T003 [P] in parallel after T001 (shared CSS file) lands.
- **Within Foundational**: T004 and T005 touch different files (`chatbot-tools.js` vs `settings.js`) — can run in parallel.
- **Within US1**: T006 [P] + T007 [P] (test files first, both editing `outlook.test.js` — sequential within the file but independent of T012/T013/T016 which are different files).
- **Across stories**: After Foundational, US1 + US2 + US3 can proceed in parallel by different developers. The only file-level overlap is `js/settings.js` (T005, T023) and `js/i18n.js` (T002, T022).
- **Polish**: T028 [P] runs alongside T026/T027.

---

## Parallel Example: User Story 1 starter

```bash
# After Phase 2 completes, kick off these test-first tasks together:
Task: "T006 update outlook.test.js to drop sensitivity-filter cases and add ticket-extraction-precedence cases"
Task: "T007 add holiday all-day shape test with workStart anchor in outlook.test.js"
Task: "T013 add calendar-render.test.js with synthetic 15-min display assertion"
```

After all three test files are red, implementation tasks T008/T009/T014 can be picked up in any order (different files).

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (Setup) — T001-T003.
2. Phase 2 (Foundational) — T004-T005.
3. Phase 3 (User Story 1) — T006-T018.
4. **STOP & VALIDATE**: UAT-3 + UAT-4 + UAT-6 (the US1 acceptance scenarios). Demo: non-work events now appear on the calendar at 0h, sensitivity flag has no effect, ticket extraction wins.
5. Ship the MVP if appetite is met. US2 and US3 follow as enhancements.

### Incremental Delivery

1. Setup + Foundational → enabled config wiring.
2. + US1 (MVP) → demo non-work-event visibility.
3. + US2 → demo manual modal lock for ad-hoc entries (UAT-7).
4. + US3 → demo cleaned-up Settings page (UAT-1, UAT-2).
5. + Polish → docs + UAT pass + visual review.

### Parallel Team Strategy

After Phase 2 lands, three developers can pick up US1 / US2 / US3 in parallel; only file-level overlap is `js/settings.js` (US3 modifies what US2 lock reads, but T004 already exposes the read API). Daily integration on `main` keeps drift low.

---

## Notes

- [P] tasks operate on different files with no incomplete dependencies.
- The MVP is User Story 1. US2 and US3 are independent enhancements and can ship in any order after the MVP.
- Each task's tests are part of its definition-of-done.
- Commit after each task or logical group (auto-commit hooks already enabled in `.specify/extensions.yml`).
- Avoid: scope creep into out-of-scope items (admin-configurable keyword list, sensitivity-as-signal, dark-theme styling — all explicitly deferred or rejected in spec/research).
