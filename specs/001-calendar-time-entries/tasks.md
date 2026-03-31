---

description: "Task list for weekly calendar time tracking feature"
---

# Tasks: Weekly Calendar Time Tracking

**Input**: Design documents from `/specs/001-calendar-time-entries/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/redmine-api.md ✅, quickstart.md ✅

**Tests**: Not included — personal single-user tool; manual acceptance via quickstart.md checklist.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are relative to repository root

## Path Conventions

All source files live at the repository root (static web app, no `src/` subdirectory):
- `index.html`, `settings.html`, `css/style.css`, `js/*.js`

---

## Phase 1: Setup

**Purpose**: Project scaffolding, dependencies, and development environment

- [ ] T001 Create `package.json` with `proxy` script (`lcp --proxyUrl <placeholder> --port 8010`) and `serve` script (`npx serve .`) at repository root
- [ ] T002 [P] Create `index.html` skeleton: HTML5 boilerplate, FullCalendar v6 CDN `<link>` and `<script>` tags, `<div id="calendar">` mount point, import `js/calendar.js` as ES module
- [ ] T003 [P] Create `settings.html` skeleton: HTML5 boilerplate, form with fields for Redmine URL and API key, Save button, import `js/settings.js` as ES module
- [ ] T004 [P] Create `css/style.css`: base reset, calendar container sizing (full viewport height), slot/event colour variables, loading spinner style, error banner style
- [ ] T005 [P] Create `js/config.js`: export constants — `SLOT_DURATION = '00:15:00'`, `SNAP_DURATION = '00:15:00'`, `START_HOUR = 7`, `END_HOUR = 19`, `START_TAG_REGEX = /\[start:(\d{2}:\d{2})\]$/`, `PROXY_PORT = 8010`, `COOKIE_NAME = 'redmine_calendar_config'`

---

## Phase 2: Foundational

**Purpose**: Shared infrastructure required by all three user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create `js/settings.js`: implement `readConfig()` — parse `COOKIE_NAME` cookie, return `{ redmineUrl, apiKey }` or `null`; implement `writeConfig(redmineUrl, apiKey)` — JSON-encode and write cookie with 1-year expiry; implement `redirectToSettingsIfMissing()` — call on every page load, redirect to `settings.html` if `readConfig()` returns null
- [ ] T007 [P] Wire `settings.html` form: on DOMContentLoaded pre-fill fields from `readConfig()` if present; on Save click call `writeConfig()` then verify credentials via `GET /users/current.json` — on success redirect to `index.html`, on failure show inline error
- [ ] T008 Create `js/redmine-api.js`: implement base `request(path, options)` function — reads config via `readConfig()`, prepends `redmineUrl` to `path`, adds `X-Redmine-API-Key` header, calls `fetch()`, throws typed errors for 401 / 403 / 404 / 422 / network failure with human-readable messages; all other API functions in this file call `request()`
- [ ] T009 [P] Add to `js/redmine-api.js`: `getCurrentUser()` — `GET /users/current.json`, return `{ id, login, firstname, lastname }`
- [ ] T010 [P] Add to `js/redmine-api.js`: `getTimeEntryActivities()` — `GET /enumerations/time_entry_activities.json`, return array of `{ id, name, isDefault }`
- [ ] T011 Add to `js/redmine-api.js`: `fetchTimeEntries(from, to)` — `GET /time_entries.json?user_id=me&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=100`, return raw Redmine array (depends on T008)
- [ ] T012 [P] Create start-time tag helpers in `js/config.js`: `parseStartTag(rawComment)` → `{ startTime: 'HH:MM'|null, comment: string }`; `applyStartTag(comment, startTime)` → string with `[start:HH:MM]` appended (strips existing tag first)
- [ ] T013 Create `js/redmine-api.js` data-mapping function `mapTimeEntry(raw)`: converts raw Redmine JSON to `TimeEntry` object per data-model.md — calls `parseStartTag` on `comments` field, sets `startTime`, `comment`, `_rawComment`; resolves `issueSubject` from `raw.issue.subject` if present (depends on T011, T012)

**Checkpoint**: Foundation complete — all user stories can now begin

---

## Phase 3: User Story 1 — View Weekly Time Entries (Priority: P1) 🎯 MVP

**Goal**: Display the authenticated user's Redmine time entries for the current week in a
quarter-hour week grid; navigate between weeks; show daily hour totals.

**Independent Test**: Run `npm run proxy`, then `npx serve .`, open `http://localhost:3000`,
log in via settings, and verify existing Redmine entries appear as blocks in the correct
day/time slot. No create or edit functionality needed.

### Implementation for User Story 1

- [ ] T014 [US1] Add to `js/redmine-api.js`: `resolveIssueSubject(issueId)` — `GET /issues/{id}.json`, return subject string; cache results in a module-level `Map` to avoid duplicate requests; return `"Issue #id"` on 404
- [ ] T015 [US1] Create `js/calendar.js` — initialise FullCalendar with `timeGridWeek` view, `slotDuration: SLOT_DURATION`, `snapDuration: SNAP_DURATION`, `slotMinTime: START_HOUR + ':00'`, `slotMaxTime: END_HOUR + ':00'`, `firstDay: 1` (Monday), `headerToolbar` with prev/next/today buttons, `allDaySlot: false`, mount to `#calendar`
- [ ] T016 [US1] In `js/calendar.js`: implement `loadWeekEntries(startDate, endDate)` — calls `fetchTimeEntries()`, maps each with `mapTimeEntry()`, resolves missing issue subjects via `resolveIssueSubject()`, returns FullCalendar event objects with `title` (issue subject + duration), `start` (ISO datetime using `date` + `startTime` or `00:00` fallback), `end` (computed from `hours`), `extendedProps: { timeEntry }` (depends on T013, T014, T015)
- [ ] T017 [US1] In `js/calendar.js`: register FullCalendar `datesSet` callback — on every week navigation call `loadWeekEntries()` with new date range, show loading indicator on calendar while fetching, replace events on success, show error banner on failure with Retry button (depends on T016)
- [ ] T018 [US1] In `js/calendar.js`: implement daily totals — after loading entries compute sum of `hours` per day; update each day column header via FullCalendar `dayCellContent` callback to append `(Xh Ym)` total; recompute after every create / update / delete (depends on T017)
- [ ] T019 [US1] In `js/calendar.js`: style entries without `startTime` (no `[start:...]` tag) — render with a `?` badge via FullCalendar `eventContent` callback and a distinct background colour to distinguish from positioned entries (depends on T016)
- [ ] T020 [US1] Add settings icon to `index.html` (top-right corner) linking to `settings.html`; call `redirectToSettingsIfMissing()` on DOMContentLoaded in `calendar.js` (depends on T006, T015)

**Checkpoint**: User Story 1 independently functional — open the app, see this week's Redmine entries in the calendar. Navigate weeks. Daily totals shown in column headers.

---

## Phase 4: User Story 2 — Log a New Time Entry (Priority: P2)

**Goal**: Click an empty slot or drag across slots to open a form; search for a ticket;
select activity; submit to create the entry in Redmine and show it in the calendar.

**Independent Test**: Click an empty Monday 09:00 slot → form opens with date/time pre-filled →
search "fix" → select an issue → pick activity → submit → entry appears in calendar and exists
in Redmine. No edit or resize functionality needed.

### Implementation for User Story 2

- [ ] T021 [P] [US2] Add to `js/redmine-api.js`: `searchIssues(query)` — if `query` is all digits use `GET /issues/{id}.json` and wrap result; otherwise `GET /issues.json?subject=~{query}&status_id=open&limit=25&sort=updated_on:desc`; return array of `{ id, subject, projectName, status }` (depends on T008)
- [ ] T022 [P] [US2] Add to `js/redmine-api.js`: `createTimeEntry({ issueId, spentOn, hours, activityId, comment, startTime })` — builds comment via `applyStartTag(comment, startTime)`, `POST /time_entries.json`, returns mapped `TimeEntry` (depends on T008, T012)
- [ ] T023 [US2] Create `js/time-entry-form.js`: implement `openForm(timeEntry?)` function — builds and shows a modal dialog containing: date field (pre-filled), start-time field (pre-filled, 15-min step), duration field (hours + minutes, snapped to 15 min), issue search input with debounced `searchIssues()` call and result dropdown, activity type `<select>` (populated from cached `getTimeEntryActivities()`), comment `<textarea>`, Save / Cancel buttons; if `timeEntry` is passed, pre-fill all fields for edit mode (depends on T010, T021)
- [ ] T024 [US2] In `js/time-entry-form.js`: implement issue search interaction — on input (≥ 2 chars, 300 ms debounce) call `searchIssues()`, render results as a listbox below the input showing `#ID subject (project)`; on selection populate hidden `issueId` field and display selected issue; show "Search unavailable" on error without closing form (depends on T021, T023)
- [ ] T025 [US2] In `js/time-entry-form.js`: implement form Save for create mode — validate required fields (issue, activity, duration > 0), call `createTimeEntry()`, on success call `calendar.addEvent()` with returned entry, close modal, show brief success toast; on failure show inline error and keep form open (depends on T022, T023)
- [ ] T026 [US2] In `js/calendar.js`: register FullCalendar `select` callback (fires on click or drag on empty slot) — extract `startStr` and `endStr`, compute duration in minutes, call `openForm()` with pre-filled start date/time and duration; register `unselect` to close form on outside click (depends on T015, T023)

**Checkpoint**: User Story 2 independently functional — click or drag to create, search ticket, submit. Entry appears in calendar and in Redmine.

---

## Phase 5: User Story 3 — Edit or Delete an Existing Time Entry (Priority: P3)

**Goal**: Click an existing entry to open the pre-filled form; save changes or delete the entry;
drag the bottom edge to resize (update duration) without opening a form.

**Independent Test**: Click an existing entry → form opens pre-filled → change duration → save →
block resizes and Redmine record updated. Delete an entry with confirmation → block gone from
calendar and Redmine. Drag bottom edge → block resizes → Redmine updated without form.

### Implementation for User Story 3

- [ ] T027 [P] [US3] Add to `js/redmine-api.js`: `updateTimeEntry(id, { hours, activityId, comment, startTime })` — builds comment via `applyStartTag(comment, startTime)`, `PUT /time_entries/{id}.json`, returns mapped `TimeEntry` (depends on T008, T012)
- [ ] T028 [P] [US3] Add to `js/redmine-api.js`: `deleteTimeEntry(id)` — `DELETE /time_entries/{id}.json`; treat 404 as success (depends on T008)
- [ ] T029 [US3] In `js/time-entry-form.js`: implement form Save for edit mode — call `updateTimeEntry()` with changed fields, on success update the FullCalendar event via `event.setProp()` / `event.setExtendedProp()`, close modal, show success toast; on failure show inline error (depends on T023, T027)
- [ ] T030 [US3] In `js/time-entry-form.js`: implement Delete button — visible only in edit mode; on click show a confirmation dialog ("Delete this time entry?"); on confirm call `deleteTimeEntry()`, on success call `event.remove()` to remove from calendar, close modal; on failure show inline error (depends on T028, T029)
- [ ] T031 [US3] In `js/calendar.js`: register FullCalendar `eventClick` callback — extract `timeEntry` from `event.extendedProps`, call `openForm(timeEntry)` to open in edit mode (depends on T015, T023)
- [ ] T032 [US3] In `js/calendar.js`: register FullCalendar `eventResize` callback (`editable: true`) — extract new end datetime, compute updated `hours` (rounded to 0.25), call `updateTimeEntry()` with new hours and existing other fields; on success update `event.extendedProps.timeEntry.hours`; on failure call `revertFunc()` to snap back and show error banner (depends on T015, T027)
- [ ] T033 [US3] In `js/calendar.js`: update daily totals after edit/delete — call the totals-recompute function from T018 after every `updateTimeEntry` or `deleteTimeEntry` success (depends on T018, T027, T028)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, UX consistency, and setup documentation

- [ ] T034 [P] Update `package.json`: add `"proxy"` script comment instructing user to replace `<placeholder>` with their Redmine URL; add `README` stub pointing to `quickstart.md`
- [ ] T035 [P] Add global error handling in `js/redmine-api.js`: on 401 response from any request, automatically redirect to `settings.html` with a `?expired=1` query param; in `settings.js` detect this param and show "Session expired — please re-enter your API key" message
- [ ] T036 [P] Add loading state to `js/calendar.js`: show a spinner overlay on the calendar grid while `loadWeekEntries()` is in-flight; disable create-interaction (unset `selectable`) during loading to prevent duplicate requests
- [ ] T037 [P] In `css/style.css`: style the time entry form modal (overlay, card, responsive width); style issue search dropdown (max-height, scroll, hover highlight); style success toast (bottom-right, auto-dismiss after 3s); style error banner (top of calendar, dismissible)
- [ ] T038 Run the full `quickstart.md` acceptance checklist manually — verify all 13 checklist items pass end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; all T001–T005 are parallel
- **Foundational (Phase 2)**: Depends on Phase 1 — T006 → T007; T008 → T009/T010/T011; T012 → T013
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion — T014 → T016 → T017 → T018/T019; T015 must precede T016
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion — T021/T022 parallel; T023 → T024 → T025; T026 depends on T015 and T023
- **User Story 3 (Phase 5)**: Depends on Phase 2 and Phase 4 (form reuse) — T027/T028 parallel; T029 → T030; T031/T032/T033 depend on T015 and T027/T028
- **Polish (Phase 6)**: Depends on all user stories — all T034–T037 are parallel; T038 is final

### User Story Dependencies

- **US1**: Depends on Foundational only — no dependency on US2 or US3
- **US2**: Depends on Foundational + T015 (calendar init from US1)
- **US3**: Depends on Foundational + T015 (calendar init) + T023 (form from US2)

### Within Each User Story

- Models/helpers before services (`config.js` helpers before API functions)
- API functions before calendar callbacks
- Form module before calendar event registration that opens the form
- Commit after each completed task or logical group

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005 all parallel (different files)
- **Phase 2**: T009, T010 parallel after T008; T012 parallel with T008 chain
- **Phase 4**: T021, T022 parallel (different API functions, same file — coordinate merge)
- **Phase 5**: T027, T028 parallel (same caveat)
- **Phase 6**: T034, T035, T036, T037 all parallel

---

## Parallel Example: Phase 1

```
Task: "T002 Create index.html skeleton"           # js/calendar.js consumer
Task: "T003 Create settings.html skeleton"        # js/settings.js consumer
Task: "T004 Create css/style.css"                 # independent
Task: "T005 Create js/config.js constants"        # depended on by many
→ All four launch together; T001 (package.json) can run alongside them
```

## Parallel Example: User Story 2

```
Task: "T021 Add searchIssues() to js/redmine-api.js"   # API function
Task: "T022 Add createTimeEntry() to js/redmine-api.js" # API function
→ Both touch js/redmine-api.js — coordinate to avoid conflicts
  (write T021 first, then T022 appends to same file, OR write both in one task)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T013) — blocks all stories
3. Complete Phase 3: User Story 1 (T014–T020)
4. **STOP and VALIDATE**: Open app, verify entries display, navigate weeks, check daily totals
5. Commit MVP — calendar is read-only but fully functional

### Incremental Delivery

1. MVP → User Story 1 (view entries) → Validate independently
2. Add User Story 2 (create entries) → Validate independently
3. Add User Story 3 (edit/delete/resize) → Validate independently
4. Polish phase → Run full quickstart.md checklist

### Notes

- `js/redmine-api.js` grows across phases — coordinate carefully when multiple tasks touch it
- `[P]` tasks = different files or non-conflicting sections of same file
- Each user story produces a demonstrable increment before the next begins
- Avoid starting Phase 4 before Phase 3 is checkpointed (form reuses calendar init)
