# Tasks: Planning View — Teams Calls & Meetings Column

**Branch**: `041-teams-calls-meetings`
**Input**: Design documents from `specs/041-teams-calls-meetings/`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelisable — different files, no dependency on an incomplete sibling task
- **[Story]**: User story label (US1–US5)
- Exact file paths required in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Config constants, i18n strings, type definitions, knowledge routing, and the
mandatory FR-015 feasibility spike — all required before any story implementation can begin.

- [x] T001 Document FR-015 feasibility spike: attempt `OnlineMeetingArtifact.Read.All` (delegated) and `CallRecords.Read.All` (application) in the dev Microsoft 365 tenant; record which permissions succeed without admin consent; commit findings as a spike note in `specs/041-teams-calls-meetings/research.md` under a new "## Spike Results" section
- [x] T002 Add `STORAGE_KEY_PLANNING_SOURCE_TEAMS = 'redmine_calendar_planning_source_teams'` constant to `js/config.js` alongside the existing `STORAGE_KEY_PLANNING_SOURCE_OUTLOOK` constant
- [x] T003 [P] Add all Teams column i18n strings to `js/i18n/en.js`: `planning.teams_column` (column header), `planning.teams_disabled`, `planning.teams_not_connected`, `planning.teams_sign_in`, `planning.teams_error`, `planning.teams_empty`, `planning.teams_unavailable_permissions`, `planning.teams_participants` (e.g. "with {names}"), `planning.teams_solo_call`, `planning.teams_meeting_fallback` ("Teams Meeting"), `planning.teams_participants_truncated` (e.g. "{first} + {n} more"), `planning.teams_retry`
- [x] T004 [P] Add German translations for all strings from T003 to `js/i18n/de.js`
- [x] T005 [P] Extend `js/types.d.ts` with: `TeamsCall` (id, startDateTime, endDateTime, durationMinutes, participants, type:'call'), `TeamsMeeting` (id, subject, joinUrl, scheduledStart, scheduledEnd, actualStart, actualEnd, participants, type:'meeting'), `TeamsActivityRecord = TeamsCall | TeamsMeeting`; extend `PlanningEvent` typedef with `displayStartTime: string`, `displayEndTime: string`, `bookingComment?: string`
- [x] T006 [P] Add `'js/planning-view-teams.js'` and `'js/planning-view-cache.js'` to the appropriate topic entry in `js/knowledge.topics.json` (same topic as `planning-view-outlook.js` and `planning-view.js`)

**Checkpoint**: Config, i18n, types, and knowledge routing ready. Spike findings documented.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Session-scoped memoisation cache and Outlook coverage-rounding fix. Both must be
complete before any Teams column work can begin — the Teams column depends on the cache, and the
coverage-rounding fix must be consistent across both columns (FR-013).

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [x] T007 Write failing unit tests for `js/planning-view-cache.js` in `tests/unit/planning-view-cache.test.js`: (a) cache hit returns stored value without calling fetchFn; (b) cache miss calls fetchFn and stores result; (c) fetchFn throwing does NOT cache the failure — second call retries; (d) `clearCache()` empties the cache; (e) concurrent requests for the same ticketId call fetchFn only once (if implementing deduplication) — confirm tests FAIL before T008
- [x] T008 Implement `js/planning-view-cache.js`: module-level `Map<number, IssueInfo>`, `export async function cachedLookupIssue(ticketId, fetchFn)` (cache-hit fast path; store on success; do NOT store on throw), `export function clearCache()` (tests only) — make T007 tests pass; module must stay under 80 effective LOC
- [x] T009 Write failing unit tests for the Outlook coverage-rounding fix in `tests/unit/planning-view-outlook.test.js`: (a) `isFullyCovered` is called with `roundToQuarter`-ed times even when the event's raw times are non-quarter-aligned (e.g. 10:05–10:55 must be passed as 10:00–11:00); (b) `_buildCardContent` time line shows raw (un-rounded) display times (10:05–10:55), not rounded — confirm tests FAIL before T010
- [x] T010 Apply coverage-rounding and display-time fix in `js/planning-view-outlook.js`: (a) add `roundToQuarter` to the import from `./outlook.js`; (b) in `_buildPlanningEvents`, extract `displayStartTime = rawEvent.start?.slice(11, 16) ?? proposal.startTime` and `displayEndTime = rawEvent.end?.slice(11, 16) ?? proposal.endTime`, store on the returned PlanningEvent object, and pass `roundToQuarter(displayStartTime)` / `roundToQuarter(displayEndTime)` to `isFullyCovered`; (c) add `displayStartTime` and `displayEndTime` params to `_buildCardContent` and use them in the time line instead of `proposal.startTime`/`proposal.endTime`; (d) update all `_buildCardContent` call sites (`_renderTimedCard`, `_renderAlldayAsTimed`, `_updateCardContent`) to pass the display times through — make T009 tests pass
- [x] T011 Replace direct `fetchIssueInfo` calls in `_enrichTicketInfoAsync` inside `js/planning-view-outlook.js` with `cachedLookupIssue(ticketId, () => fetchIssueInfo(ticketId))` from `./planning-view-cache.js`; update `refreshBookings` in `js/planning-view.js` to use `roundToQuarter(pe.displayStartTime)` / `roundToQuarter(pe.displayEndTime)` when recalculating `pe.isCovered` for the Outlook column (lines ~381–387)
- [x] T012 Add cross-column clear registration to `js/planning-view-outlook.js`: export `export function registerClearOtherColumns(fn)` that stores `fn` in a module-level `_clearOtherColumns` variable; in `_handleCardClick`, call `_clearOtherColumns?.()` at the start of every non-shift-key click branch before updating `_selectedIds`; in `_handleDragStart`, call `_clearOtherColumns?.()` when the dragged event was not previously selected

**Checkpoint**: Cache, Outlook rounding fix, and cross-column clear hook are complete. All T007 and T009 tests pass.

---

## Phase 3: User Story 1 + 3 — View Teams Activity & Display Right Information (Priority: P1)

**Goal**: The Teams column appears, shows actual times for calls and meetings, and displays
participant names (calls) or meeting titles (meetings) with correct visual classification badges.

**Independent Test**: Open the Planning View for a day with Teams meetings. Confirm the Teams
column header is visible, events appear with minute-precise actual (not scheduled) times, calls
show participant names, meetings show the meeting title, and events carry the correct colour badge
(bookable/needs-ticket/excluded).

- [x] T013 Write failing unit tests for Teams classification and normalisation logic in `tests/unit/planning-view-teams.test.js`: (a) call with durationMinutes < 1 → excluded, not shown; (b) call ≥ 1 min → needs-ticket; (c) participant list excludes signed-in user display name; (d) empty participant list → solo-call fallback label; (e) meeting normalisation: displayStartTime/displayEndTime = raw actual times; startTime/endTime = roundToQuarter(actual); (f) meeting classification delegates to parseCalendarProposals keyword logic; (g) isCovered uses rounded times, not raw — confirm tests FAIL before T015–T020
- [x] T014 [P] [US1] Create `js/planning-view-teams.js` skeleton: module-level `_renderedEvents = []`, `_selectedIds = new Set()`, `_pxPerMin = 0`, `_clearOtherColumns = null`; scaffold all exported functions (`renderTeamsColumn`, `rerenderTeamsColumn`, `getSelectedEventIds`, `getSelectedEvents`, `clearSelection`, `registerClearOtherColumns`) as stubs returning empty/void; add `_checkTeamsAvailability(container)` that checks `STORAGE_KEY_PLANNING_SOURCE_TEAMS`, `isOutlookConfigured()`, `isMsalSignedIn()`, renders appropriate prompts, and returns false if unavailable; add `_renderUnavailableState(container, message, retryFn)` helper
- [x] T015 [US1] Implement `fetchTeamsActivity(date)` in `js/planning-view-teams.js`: Track A — call `fetchCalendarEvents(date)` filtered to `isOnlineMeeting eq true`; for each meeting resolve actual times via `/me/onlineMeetings?$filter=joinUrl eq '...'` then `/me/onlineMeetings/{id}/attendanceReports` (first report, signed-in user's earliestJoinTime / latestLeaveDateTime); omit meeting if attendance report unavailable (FR-005); Track B — call `/communications/callRecords?$filter=startDateTime ge {date}T00:00:00Z and startDateTime lt {date+1}T00:00:00Z` with `CallRecords.Read.All`; on HTTP 403 render permissions-unavailable state and return `[]` for calls (FR-015); return `TeamsActivityRecord[]`
- [x] T016 [US3] Implement call normalisation in `js/planning-view-teams.js`: `function _normaliseCall(record, signedInUserId)` — skip if `durationMinutes < 1` (return null); filter `record.participants` to exclude `signedInUserId`; set `displayStartTime` / `displayEndTime` = raw ISO sliced to HH:MM; set `startTime` / `endTime` = `roundToQuarter(displayStartTime/End)`; set `subject` = participant names joined by ', ', with truncation if > 3 names (use `t('planning.teams_participants_truncated', {...})`); use `t('planning.teams_solo_call')` for empty list
- [x] T017 [US3] Implement meeting normalisation in `js/planning-view-teams.js`: `function _normaliseMeeting(record)` — if `record.actualStart` / `record.actualEnd` absent, return null (FR-005); set `displayStartTime` / `displayEndTime` = raw actual times (HH:MM); set `startTime` / `endTime` = `roundToQuarter()`; `subject` = `record.subject || t('planning.teams_meeting_fallback')`; `bookingComment` = `record.subject || t('planning.teams_meeting_fallback')` (pre-fills modal comment per FR-012)
- [x] T018 [US3] Implement `_buildTeamsProposals(activities, weeklyHours, holidayTicket, vacationTicket, breakTicket, workStart)` in `js/planning-view-teams.js`: for `TeamsCall` records → create CalendarProposal shape with `category: 'other'`, `subject: displayParticipantNames`, and `bookingComment: ''` (empty — FR-012 no-personal-data); for `TeamsMeeting` records → pass normalised proposals through `parseCalendarProposals`; return `{ proposals, activities }` paired arrays
- [x] T019 [US1] Implement `_buildPlanningEvents(proposals, activities, bookings)` in `js/planning-view-teams.js`: same structure as `planning-view-outlook.js` `_buildPlanningEvents`; use `cachedLookupIssue` for ticket lookup; set `displayStartTime`/`displayEndTime` from the normalised activity; compute `isCovered` with `roundToQuarter(displayStartTime)` / `roundToQuarter(displayEndTime)` passed to the imported `isFullyCovered`; set `bookingComment` from the normalised activity's `bookingComment` field
- [x] T020 [US1] Implement `renderTeamsColumn(container, date, bookings, bookingsContainer)` in `js/planning-view-teams.js`: (1) clear container + reset state; (2) call `_checkTeamsAvailability` — return `[]` if false; (3) show loading spinner; (4) `await fetchTeamsActivity(date)`; (5) clear spinner; (6) normalise activities; (7) build proposals + planning events; (8) store in `_renderedEvents`; (9) call `_renderPlanningEvents` (reuse the same layout/card logic as outlook column, extracted to shared helpers or duplicated per 500-LOC budget); attach column click handler to clear selection; (10) call `_enrichTicketInfoAsync` with `cachedLookupIssue`; catch all errors → show error prompt (FR-014)
- [x] T021 [US1] Implement `rerenderTeamsColumn`, `getSelectedEventIds`, `getSelectedEvents`, `clearSelection`, and `registerClearOtherColumns` exports in `js/planning-view-teams.js` — mirror the identical exports from `planning-view-outlook.js`
- [x] T022 [US1] Mount Teams column in `js/planning-view.js`: (a) import `renderTeamsColumn`, `rerenderTeamsColumn`, `clearSelection as clearTeamsSelection`, `getSelectedEvents as getTeamsSelectedEvents`, `registerClearOtherColumns as registerTeamsClear` from `./planning-view-teams.js`; (b) add `_teamsColEl`, `_teamsHeaderEl`, `_currentTeamsEvents = []` module state; (c) in `_buildColumns`, create Teams column header `t('planning.teams_column')` and `_teamsColEl = div.planning-teams-column` after the Outlook column, hidden when disabled; (d) in `_loadDay`, read `STORAGE_KEY_PLANNING_SOURCE_TEAMS`, set `_teamsColEl.hidden`, and `await renderTeamsColumn(...)` in parallel with the Outlook render; (e) in `refreshBookings`, update `_currentTeamsEvents` isCovered and call `rerenderTeamsColumn`

**Checkpoint**: Teams column visible with actual times and correct classification badges. Column renders independently from Bookings and Outlook columns.

---

## Phase 4: User Story 2 — Book a Teams Event by Dragging to Bookings (Priority: P1)

**Goal**: Teams events are draggable to the Bookings column; auto-book if issue found; modal
opens with correct source-event box and comment pre-fill (empty for calls, meeting title for
meetings); multi-select shift-click is column-scoped.

**Independent Test**: Drag a Teams meeting with "#NNN" in the title to the Bookings column —
a time entry is created immediately with rounded times and no modal. Drag a Teams call — modal
opens with participant names in the source-event box and an empty comment field.

- [x] T023 [US2] Implement `_handleCardClick` and `_handleDragStart` in `js/planning-view-teams.js`: `_handleCardClick` — on non-shift click, call `_clearOtherColumns?.()` before clearing `_selectedIds` (column-scoped selection, FR-010); on shift-click, toggle within this column only; `_handleDragStart` — if dragged event not in `_selectedIds`, single-select it first; pack `[...getSelectedEventIds()]` as JSON into `e.dataTransfer.setData('planning/events', ...)` with `effectAllowed = 'copy'`; wire both to card DOM in `renderTeamsColumn`
- [x] T024 [US2] Register mutual cross-column clear in `js/planning-view.js`: after both columns are rendered, call `registerClearOtherColumns` (Outlook) passing `clearTeamsSelection`, and call `registerTeamsClear` (Teams) passing `clearSelection` (Outlook); ensure these registrations survive day navigation (re-register after each `_loadDay`)
- [x] T025 [US2] Update `_onColumnDrop` in `js/planning-view.js` to resolve both Outlook and Teams events: when IDs are parsed from `dataTransfer`, search `[..._currentOutlookEvents, ..._currentTeamsEvents]`; in the Playwright fallback path (`!raw`), use `[...getSelectedEvents(), ...getTeamsSelectedEvents()]`; update the `dragover` guard to also check `getTeamsSelectedEvents().length > 0`
- [x] T026 [US2] Update `_bookOne` in `js/planning-view.js` for Teams-specific comment behavior (FR-012): when building the `openForm` prefill object, use `planningEvent.bookingComment ?? proposal.subject` as the `comment` field — Teams calls have `bookingComment = ''` (empty, no personal data), Teams meetings have `bookingComment = meetingTitle`, Outlook events have `bookingComment = undefined` (falls back to `proposal.subject`)

**Checkpoint**: Full drag-to-book flow works for Teams events. Modal shows correct source-event box content and pre-filled comment. Column-scoped selection prevents cross-column multi-select.

---

## Phase 5: User Story 4 — Memoisation Cache Cross-Column Deduplication (Priority: P2)

**Goal**: When the same Redmine issue appears in both the Outlook and Teams columns, only one
API call is made per unique issue number per session.

**Independent Test**: Open browser DevTools Network tab, filter to Redmine host GET requests.
Load a Planning View day where the same issue appears in both columns. Confirm exactly one
`/issues/NNN.json` request, not two.

- [x] T027 [US4] Add a cross-column deduplication integration test to `tests/unit/planning-view-cache.test.js`: mock `fetchIssueInfo` to count invocations; simulate two separate `cachedLookupIssue(42, mockFetch)` calls (representing Outlook and Teams both resolving issue #42); assert `mockFetch` was called exactly once; assert both calls return the same `IssueInfo` object

**Checkpoint**: Cache deduplication confirmed by automated test. Manual browser verification documents in PR that network inspector shows single Redmine request per issue.

---

## Phase 6: User Story 5 — Configure Teams Column On/Off (Priority: P2)

**Goal**: Teams toggle appears in Settings alongside the Outlook toggle, off by default,
persists across sessions, and takes effect in the Planning View within 2 seconds of saving
without a page reload (SC-005).

**Independent Test**: Enable the Teams column in Settings → open Planning View → Teams
column appears. Disable → Teams column disappears. Reload → setting persists.

- [x] T028 [US5] Add Teams source toggle to `settings.html` in the Planning View Sources section: add a `<div class="settings-row">` with `<label for="teams-source-toggle">` (i18n key `settings.teams_source_label`) and `<input type="checkbox" id="teams-source-toggle" data-testid="teams-source-toggle">`; position it after the existing Outlook toggle row
- [x] T029 [US5] Add Teams toggle logic to `js/settings-page.js`: on Settings page load, read `STORAGE_KEY_PLANNING_SOURCE_TEAMS` and set `#teams-source-toggle` checked state (`'1'` = checked, default unchecked); on `change` event, write `'0'` or `'1'` to `localStorage`; after save, if Planning View is active dispatch a `CustomEvent('planning:sources-changed')` so `planning-view.js` can react
- [x] T030 [US5] Handle dynamic Teams column mount/unmount in `js/planning-view.js`: listen for `planning:sources-changed` CustomEvent; in the handler, read `STORAGE_KEY_PLANNING_SOURCE_TEAMS` and toggle `_teamsColEl.hidden` + `_teamsHeaderEl.hidden`; if Teams was just enabled, call `renderTeamsColumn(_teamsColEl, _planningDay, currentBookings, _bookingsColEl)` and re-run `_setupDropOverlay`; if disabled, clear `_teamsColEl.innerHTML` and reset `_currentTeamsEvents = []`

**Checkpoint**: Settings toggle persists, Planning View reacts within 2 seconds of save, Outlook column unaffected.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: UI tests, documentation, and final quality-gate verification.

- [x] T031 [P] Write Playwright UI tests in `tests/ui/planning-view-teams.spec.js` covering: (a) Teams column appears when enabled (Scenario 1); (b) direct call card shows participant names, not own name (Scenario 2); (c) drag meeting with issue ref → immediate booking, no modal (Scenario 3); (d) drag call → modal opens, source-event box has names, comment is empty (Scenario 4); (e) drag meeting without issue → modal opens, comment pre-filled with title (Scenario 5); (f) Teams column error state does not affect Outlook or Bookings columns (Scenario 8); (g) column toggle persists across reload (Scenario 9); (h) shift-click column-scoped selection (Scenario 10)
- [x] T032 [P] Update `docs/content.en.md` with Teams column documentation: section explaining how to enable the column, what it shows (actual call times vs scheduled), the required Microsoft permissions, and the memoisation cache behavior
- [x] T033 [P] Update `docs/content.de.md` with German translation of the Teams column documentation from T032
- [x] T034 Run full Playwright UI test suite: `npm run test:ui`; fix any regressions in existing tests caused by the Outlook display-time change (cards now show raw scheduled times instead of rounded times) or the cross-column clear behavior
- [x] T035 Run `npm run sqi` — verify composite ≥ 80 GREEN; if RED/YELLOW, fix the specific metric(s) identified (extract helpers if `planning-view-teams.js` approaches 500 effective LOC; add tests if coverage drops; eliminate any new cyclic import)
- [x] T036 Run `npm run lint && npm run typecheck && npm run format:check` — fix any new warnings or type errors introduced by the new modules
- [x] T037 Run `npm run test:coverage` — verify `js/planning-view-cache.js` and `js/planning-view-teams.js` each reach ≥ 95% line coverage; add targeted unit tests for any uncovered branches

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately; all T002–T006 run in parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 completion (needs STORAGE_KEY_PLANNING_SOURCE_TEAMS, types); T007 → T008 (TDD); T009 → T010; T011 and T012 depend on T010
- **Phase 3 (US1+US3)**: Depends on Phase 2 completion; T013 (tests) → T014–T021 (implementation); T022 depends on T021
- **Phase 4 (US2)**: Depends on Phase 3 completion (cards must render before DnD); T023 → T024 → T025 → T026
- **Phase 5 (US4)**: Depends on Phase 2 (cache) and Phase 3 (Teams use of cache); T027 can run after T008
- **Phase 6 (US5)**: Depends on Phase 1 (STORAGE_KEY constant) and Phase 3 (Teams column exists in DOM); T028–T030 sequential
- **Phase 7 (Polish)**: Depends on all prior phases complete; T031–T033 run in parallel

### User Story Dependencies

- **US1 (P1)**: Core — must complete before US2 (needs rendered cards to drag)
- **US3 (P1)**: Implemented within Phase 3 alongside US1 (normalisation is required for US1)
- **US2 (P1)**: Depends on US1 (Phase 3) completion
- **US4 (P2)**: Cache (Phase 2) is foundational; verification (T027) can run after Phase 2+3
- **US5 (P2)**: Can run after Phase 1 constants + Phase 3 DOM structure; independent of US2 and US4

### Within Each Phase

- Constitution Principle III (Test-First) is mandatory: T007 before T008, T009 before T010, T013 before T014–T020
- Models/types (T005) before implementation tasks that type-check them
- i18n strings (T003, T004) before any module that calls `t()` with the new keys

---

## Parallel Opportunities

```bash
# Phase 1 — run in parallel (all different files):
T003  js/i18n/en.js
T004  js/i18n/de.js
T005  js/types.d.ts
T006  js/knowledge.topics.json

# Phase 3 after T013 — run in parallel (different files, same module structure):
T016  _normaliseCall   (in planning-view-teams.js)
T017  _normaliseMeeting (in planning-view-teams.js)
# Note: T016 and T017 edit the same file — run sequentially within the file

# Phase 7 — run in parallel:
T031  tests/ui/planning-view-teams.spec.js
T032  docs/content.en.md
T033  docs/content.de.md
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 + US3 (Teams column visible with actual times and correct display)
4. **STOP and VALIDATE**: Teams column renders independently; Scenarios 1 and 2 from quickstart.md pass
5. Confirm failure isolation: disconnect MSAL, verify Outlook + Bookings unaffected (Scenario 8)

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (cache + Outlook fix)
2. Phase 3 → Teams column visible (MVP — most user value)
3. Phase 4 → Drag-to-book working (completes the core workflow)
4. Phase 5 → Cache deduplication verified (correctness guarantee)
5. Phase 6 → Settings toggle (proper opt-in control)
6. Phase 7 → Full test suite + docs

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete siblings
- Constitution Principle III mandates tests FAIL before implementation — do not skip this
- Max 500 effective LOC per module (`planning-view-teams.js`); if approaching limit, extract card-rendering helpers into a shared `planning-view-column-shared.js` module
- Teams event data (participant names, call times) must never appear in `console.log`, error reports, or AI context — sanitise all content with `DOMPurify.sanitize` before inserting into the DOM
- The feasibility spike (T001) determines whether Track B (ad-hoc calls) is available in the deployment — if admin consent is unavailable, implement the permissions-unavailable state gracefully per FR-015 and document this in the PR body
- Commit after each completed task or logical group with message format `feat(041): TXXXDescription` per constitution Development Workflow guidelines
