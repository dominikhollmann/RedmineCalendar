# Tasks: Calendar UX Improvements

**Input**: Design documents from `specs/043-calendar-ux-improvements/`

**Organization**: Tasks grouped by user story for independent implementation and testing. Stories are independent of each other and can be worked in priority order or in parallel.

**TDD note**: Unit tests for new pure-logic exports (`stampClosedStatus`, `data-refresh.js`) are written first (fail → implement → pass). UI tests are written alongside each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependency on an incomplete sibling)
- **[Story]**: Which user story this belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Create new files, register them in the knowledge graph, and capture a baseline test run before any code changes.

- [x] T001 Run `npm run test:ui` to record the baseline failing-test list (needed by `npm run test:ui:failed` during iteration)
- [x] T002 Create `js/data-refresh.js` with empty export stubs for `startAutoRefresh`, `stopAutoRefresh`, `triggerRefresh`, `getLastRefreshedAt` (no logic yet; establishes the module in the dependency graph)
- [x] T003 Add `js/data-refresh.js` to the calendar-view topic in `js/knowledge.topics.json` (CI gate: `npm run knowledge:check`)

---

## Phase 2: Foundational — `stampClosedStatus` shared helper (blocks US2)

**Purpose**: Extract and ship the shared closed-status batch-fetch helper before any per-source wiring. Both Outlook and Teams stories depend on this.

**⚠️ Write the unit test first (TDD — it must FAIL before T005)**

- [x] T004 Write failing unit tests for `stampClosedStatus` in `tests/unit/redmine-api.test.js`: verify batch deduplication (same ticket ID fetched once across two calls), `is_closed` stamped correctly for open/closed tickets, no warning emitted when API returns null (transient failure)
- [x] T005 Add `export async function stampClosedStatus(proposals)` to `js/redmine-api.js` — wraps `fetchIssueStatuses`; stamps `proposal.is_closed` in-place for each proposal with a non-null `ticketId` (see `research.md` for the 6-line reference implementation)
- [x] T006 Confirm T004 unit tests now pass (`npm test`)

**Checkpoint**: `stampClosedStatus` ships. US2 implementation can begin; US1/US3/US4 can proceed in parallel.

---

## Phase 3: User Story 1 — Data Refresh Without Page Reload (Priority: P1) 🎯 MVP

**Goal**: Toolbar Refresh button re-fetches all active data sources; optional auto-polling. Cache preserved. Toast on completion.

**Independent Test**: Open app → create a Redmine entry in another tab → click Refresh → new entry appears without F5.

**⚠️ Write unit tests first (must FAIL before T009–T010)**

- [x] T007 [US1] Write failing unit tests in `tests/unit/data-refresh.test.js`: `triggerRefresh` is a no-op when already in progress (debounce guard), calls provided refresh callbacks on trigger, resolves after all callbacks settle; `startAutoRefresh(0)` does not set an interval; `stopAutoRefresh` clears the interval handle; `getLastRefreshedAt` returns null before first refresh
- [x] T008 [US1] Add `export function refreshCalendarData()` to `js/calendar.js` — calls `loadWeekEntries(_lastStart, _lastEnd)`; no-op if `_lastStart` is null (guards against pre-load invocation)
- [x] T009 [US1] Implement `triggerRefresh()` in `js/data-refresh.js`: sets `_refreshing` guard; calls `refreshCalendarData()` and (if planning view active) `refreshPlanningView()`; on success shows `showToast(t('calendar.last_refreshed', { time: HH:MM }))`, on partial failure shows `showToast(t('calendar.refresh_failed', { sources }), 'warning')`; clears guard in `finally`
- [x] T010 [P] [US1] Implement `startAutoRefresh(intervalSecs)` / `stopAutoRefresh()` / `getLastRefreshedAt()` in `js/data-refresh.js`: `setInterval` calls `triggerRefresh`; `document.addEventListener('visibilitychange', …)` pauses/resumes when tab is hidden; interval floor 60 s; `intervalSecs === 0` skips `setInterval`
- [x] T011 [US1] Confirm T007 unit tests now pass (`npm test`)
- [x] T012 [P] [US1] Add i18n keys to `js/i18n/en.js` and `js/i18n/de.js`: `calendar.refresh_button` ("Refresh" / "Aktualisieren"), `calendar.last_refreshed` ("Last refreshed at {time}" / "Zuletzt aktualisiert um {time}"), `calendar.refresh_failed` ("Refresh failed for: {sources}" / "Aktualisierung fehlgeschlagen für: {sources}")
- [x] T013 [US1] Add Refresh button to the toolbar in `js/calendar-toolbar.js` (inside the existing `#toolbar-toggles` group); button click calls `triggerRefresh()`; uses `t('calendar.refresh_button')` for label and `aria-label`
- [x] T014 [US1] Wire `startAutoRefresh` in `js/calendar.js` init after `calendar.render()`: reads interval from `localStorage.getItem('redmine_calendar_auto_refresh_interval')` (default `'300'`); import `startAutoRefresh` from `./data-refresh.js`
- [x] T015 [P] [US1] Add auto-refresh interval input to `settings.html` (numeric field, minutes, next to existing settings controls) and wire in `js/settings-page.js`: reads/writes `redmine_calendar_auto_refresh_interval` (stored as seconds = minutes × 60); calls `stopAutoRefresh()` + `startAutoRefresh(newValue)` on change; add i18n key `settings.auto_refresh_interval` to both locale files
- [x] T016 [US1] Write Playwright UI test in `tests/ui/calendar-ux-improvements.spec.ts` — US1 scenarios: Refresh button present and clickable; toast appears after click; calendar does not navigate away; auto-refresh field present in Settings

**Checkpoint**: Refresh button fully functional. Manual + auto-refresh working. US2–US4 independent.

---

## Phase 4: User Story 2 — Closed-Ticket Warning on Teams Events (Priority: P2)

**Goal**: Teams meeting cards with a closed Redmine ticket show the same warning icon already shown for Outlook events. DRY — no duplicated fetch logic.

**Independent Test**: Planning view with a Teams meeting referencing a closed ticket → warning icon visible; Outlook event for same ticket → single Redmine API call (cache deduplication).

- [x] T017 [US2] Refactor `_buildItems` in `js/planning-view-outlook.js`: replace the 12-line inline `closedStatusMap` loop with a single `await stampClosedStatus(proposals)` call; import `stampClosedStatus` from `./redmine-api.js` (net LOC reduction — existing behaviour preserved)
- [x] T018 [P] [US2] Add `_buildTeamsItems(proposals, records)` in `js/planning-view-teams.js`: mirrors the structure of `_buildItems` in outlook — calls `await stampClosedStatus(proposals)` then maps proposals to `{ proposal, displayStartTime, displayEndTime, rawEvent }` items; call `_buildTeamsItems` inside `renderTeamsColumn` before `buildPlanningEvents` (mirrors outlook pattern)
- [x] T019 [P] [US2] Write Playwright UI test in `tests/ui/calendar-ux-improvements.spec.ts` — US2 scenarios: Teams event with open ticket → no warning icon; Teams event with closed ticket → warning icon matches Outlook closed-ticket icon; Teams event with no ticket → no warning icon

**Checkpoint**: Teams closed-ticket warning works. Outlook behaviour unchanged. Both use `stampClosedStatus`.

---

## Phase 5: User Story 3 — Event Source Label in Modal Title (Priority: P3)

**Goal**: The "Quellereignis" / "Source event" label in the time-entry modal includes the source name ("aus Teams" / "from Teams") when the event has a known origin.

**Independent Test**: Open time-entry modal for an unmatched Teams event → modal label reads "Quellereignis aus Teams" / "Source event from Teams".

- [x] T020 [P] [US3] Add i18n key `planning.modal_source_info_from` to `js/i18n/en.js` ("Source event from {source}") and `js/i18n/de.js` ("Quellereignis aus {source}")
- [x] T021 [P] [US3] Add `source: 'Teams'` field to proposal objects returned by `normaliseMeeting` and `normaliseCall` in `js/planning-view-teams.js` (add the field to both return shapes; `normaliseCall` gets `source: 'Teams'` even though calls don't have a ticket — consistent shape)
- [x] T022 [P] [US3] Add `source: 'Outlook'` field to proposal objects in `_buildItems` in `js/planning-view-outlook.js` (stamp each proposal before mapping to items)
- [x] T023 [US3] Pass `source: proposal.source` in the `sourceEvent` object built inside `_bookOne` in `js/planning-view.js` (the `planningCategory === 'needs-ticket'` branch that calls `openForm`); `source` is `undefined` when `proposal.source` is not set — no change to existing fallback path
- [x] T024 [US3] Update `renderSourceEventInfo` in `js/time-entry-form-view.js`: when `sourceEvent.source` is truthy, use `t('planning.modal_source_info_from', { source: sourceEvent.source })` as the label; otherwise keep the existing `t('planning.modal_source_info')` (no change to existing fallback)
- [x] T025 [US3] Write Playwright UI test in `tests/ui/calendar-ux-improvements.spec.ts` — US3 scenarios: Teams event modal shows source label; Outlook event modal shows "from Outlook"; event with no source shows plain fallback label; no overflow

**Checkpoint**: Source label works for Teams and Outlook. Fallback unchanged.

---

## Phase 6: User Story 4 — Planning View Total in Calendar Headline (Priority: P3)

**Goal**: Total booked hours displayed in the Bookings column header (not near the settings icon) in Planning View, styled like day-column totals.

**Independent Test**: Switch to Planning View with entries → total appears in Bookings column header; `#week-total` in app-header is hidden.

- [x] T026 [P] [US4] In `js/calendar-toolbar.js`, update `setPlanningMode(active)`: add `document.body.classList.toggle('planning-mode', active)` so CSS can target `body.planning-mode #week-total`
- [x] T027 [P] [US4] Add CSS to `css/planning-view.css`: `body.planning-mode #week-total { display: none }` (hides header total in planning mode); add base style for `#planning-bookings-total` reusing `.day-total` visual pattern (font-size, colour from CSS variables, right-aligned inside the header)
- [x] T028 [US4] In `js/planning-view.js`, update `_buildColumns`: inject `<span class="day-total" id="planning-bookings-total"></span>` into the Bookings column header element (first child of `colHeaders`) after the header text
- [x] T029 [US4] Add `_updateBookingsTotal(bookings)` helper in `js/planning-view.js`: sums `bookings.reduce((s, b) => s + b.hours, 0)`, formats with `formatDuration` (already imported via `calendar-overlays`), writes to `#planning-bookings-total`; hides element when total is 0 (consistent with `updateWeekTotal` zero-state); call it after `loadBookingsForDay` in `_loadDay` and after `loadBookingsForDay` in `refreshBookings`
- [x] T030 [US4] Write Playwright UI test in `tests/ui/calendar-ux-improvements.spec.ts` — US4 scenarios: Planning View shows total in column header; `#week-total` not visible in planning mode; switching back to calendar view restores `#week-total`; zero-entry state shows no total in header

**Checkpoint**: All four user stories functional and independently verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, final quality gates, regression sweep.

- [x] T031 [P] Update `docs/content.en.md` — add entries for: Refresh button + auto-refresh interval setting, Teams closed-ticket warning, source label in modal, planning view total relocation
- [x] T032 [P] Update `docs/content.de.md` — German equivalents for all four T031 entries
- [x] T033 Run full `npm run test:ui` suite; fix any regressions surfaced by the complete run
- [x] T034 Run `npm run lint` + `npm run typecheck`; fix any issues (JSDoc on `data-refresh.js` public exports; function-length violations if any)
- [x] T035 Run `npm run sqi` and verify composite ≥ 80 GREEN; address any SQI regressions before merge

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)          — no dependencies; start immediately
Phase 2 (Foundational)   — after Phase 1; T005 blocks US2 (T017, T018)
Phase 3 (US1 Refresh)    — after Phase 1; independent of Phase 2 and US2–US4
Phase 4 (US2 Teams warn) — T017 and T018 depend on T005 (stampClosedStatus)
Phase 5 (US3 Source)     — after Phase 1; independent of US1, US2, US4
Phase 6 (US4 Total)      — after Phase 1; independent of US1–US3
Phase 7 (Polish)         — after all user story phases complete
```

### User Story Cross-Dependencies

- **US1** is fully independent of US2–US4 (different files: `data-refresh.js`, `calendar.js`, `calendar-toolbar.js`, `settings.html`)
- **US2** requires `stampClosedStatus` (Phase 2) then touches `planning-view-outlook.js` + `planning-view-teams.js`
- **US3** touches `planning-view-teams.js` (T021) and `planning-view-outlook.js` (T022) — if US2 is in flight simultaneously, coordinate edits to those files to avoid conflicts
- **US4** is fully independent (touches only `planning-view.js`, `calendar-toolbar.js`, `planning-view.css`)

### Within Each Phase

- Unit tests (T004, T007): write → confirm FAIL → implement → confirm PASS
- T002 (module skeleton) before T009–T010 (implementation)
- T008 (`refreshCalendarData` export) before T009 (`triggerRefresh` calls it)
- T005 (`stampClosedStatus`) before T017 and T018
- T021/T022 (`source` on proposals) before T023 (`_bookOne` passes it)
- T023 before T024 (`renderSourceEventInfo` uses it)
- T026 (CSS class on body) can be done in parallel with T027 (CSS rule)
- T028 (inject DOM span) before T029 (update it)

---

## Parallel Opportunities

### US1 can run concurrently with US3, US4 (different files throughout)

```
# US1 parallel tasks within Phase 3:
T010 [P] — auto-refresh timer logic (js/data-refresh.js)
T012 [P] — i18n keys (js/i18n/en.js + de.js)
T015 [P] — settings wiring (settings.html + js/settings-page.js)
```

### US3 parallel tasks within Phase 5

```
T020 [P] — i18n key addition
T021 [P] — source field on Teams proposals
T022 [P] — source field on Outlook proposals
```

### US4 parallel tasks within Phase 6

```
T026 [P] — body.planning-mode toggle (js/calendar-toolbar.js)
T027 [P] — CSS rules (css/planning-view.css)
```

---

## Implementation Strategy

### MVP (US1 only)

1. Complete Phase 1 (Setup)
2. Complete Phase 3 (US1 — Refresh button + auto-poll)
3. **Validate**: Refresh button works, toast shows, auto-poll pauses on tab hide
4. Merge as MVP; remaining stories as follow-ups

### Full Incremental Delivery

1. Setup → Foundation (`stampClosedStatus`) → US1 → validate
2. Add US2 → validate Teams warning
3. Add US3 → validate modal source label
4. Add US4 → validate planning total
5. Polish (T031–T035)

### Parallel Strategy (if splitting work)

With two contributors:

- **A**: Phase 2 + US2 (closes-ticket DRY refactor — `redmine-api.js`, `planning-view-outlook.js`, `planning-view-teams.js`)
- **B**: US1 (all-new `data-refresh.js`, `calendar.js`, `calendar-toolbar.js`, `settings.html`)
- **A** after US2: US3 (continues in `planning-view-teams.js` + `planning-view-outlook.js` — same files, coordinate to avoid conflicts)
- **B** after US1: US4 (`planning-view.js`, `planning-view.css`)

---

## Notes

- `[P]` = different files, no dependency on an incomplete sibling in the same batch
- Each US phase ends with a Playwright UI test task — don't skip
- `js/data-refresh.js` must stay ≤ 500 effective LOC (SQI soft threshold)
- All functions ≤ 60 lines (ESLint `max-lines-per-function`)
- `planning-view-teams.js` is touched by both US2 (T018) and US3 (T021) — serialize those edits or handle in one commit
- `planning-view-outlook.js` is touched by both US2 (T017) and US3 (T022) — same precaution
- Commit after each completed task or logical group; message format: `fix(043): <what>`
