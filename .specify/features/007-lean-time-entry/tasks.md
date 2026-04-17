# Tasks: Super Lean Time Entry UX (007)

**Input**: Design documents from `/specs/007-lean-time-entry/`  
**Branch**: `007-lean-time-entry`  
**Stack**: Vanilla JS ES2022, FullCalendar v6, localStorage  
**Tests**: No automated tests — manual acceptance checklist in `quickstart.md` (Constitution III exception)

---

## Phase 1: Setup

**Purpose**: Prepare the existing file for a clean rewrite without breaking the calendar.

- [x] T001 Read and understand the current `js/time-entry-form.js` in full — note the `openForm(entry, prefill, onSave, onDelete)` export signature which MUST be preserved
- [x] T002 Strip `js/time-entry-form.js` down to an empty module that still exports a no-op `openForm()` — verify the calendar loads without JS errors after the change

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required by all three user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Inject the lean modal HTML into `js/time-entry-form.js`: a single card with a search `<input>`, an empty results/list `<div>`, an inline error `<div>` (hidden by default), and Cancel/Save buttons — no hours, no activity, no comment fields
- [x] T004 Wire Escape key and outside-click to close the form without saving in `js/time-entry-form.js`
- [x] T005 Implement silent default-activity fetch: call `getTimeEntryActivities()` once on first form open, cache the default `activity_id` in a module-level variable, use it for all saves — never expose to UI in `js/time-entry-form.js`
- [x] T006 Implement keyboard navigation in `js/time-entry-form.js`: ArrowDown/ArrowUp move highlight through the visible list rows; Enter selects the highlighted row (or triggers save if a ticket is already selected); highlight wraps at list boundaries
- [x] T007 [P] Add base CSS for the lean form card, search input, results list, highlighted row state, and inline error area in `css/style.css`

**Checkpoint**: Form opens on calendar drag, closes on Escape/outside-click, keyboard moves through an (empty) list — calendar loads without errors.

---

## Phase 3: User Story 1 — Quick Time Entry (Priority: P1) 🎯 MVP

**Goal**: Drag on calendar → type to search → press Enter → entry saved, form closes.

**Independent Test**: Drag a slot, type 2 chars, arrow-select a result, press Enter — verify entry appears on calendar at the correct time with the correct ticket.

- [x] T008 [US1] Implement real-time ticket search in `js/time-entry-form.js`: on input, debounce 300 ms, call `searchIssues(q)`, render results as rows in the results div; show "No results" message when empty; show inline error on network failure
- [x] T009 [US1] Implement save on Enter/click in `js/time-entry-form.js`: call `createTimeEntry({ issueId, spentOn: date, hours, activityId: cachedDefault, startTime })` using the date/time/duration from the calendar `select` prefill; on success call `onSave(saved)` and close the form
- [x] T010 [US1] Implement FR-011 — save failure handling in `js/time-entry-form.js`: on API error, display the error message in the inline error div and keep the form open; re-enable the Save button for retry
- [x] T011 [US1] Implement lean edit form in `js/time-entry-form.js`: when `entry` is non-null, pre-populate with the existing ticket display, show a Delete button; save calls `updateTimeEntry()`; delete calls `deleteTimeEntry()` then `onDelete(id)`; same keyboard + error behaviour as create
- [x] T012 [P] [US1] Polish search result rows in `css/style.css`: ticket ID + subject + project name on one line, highlighted row has distinct background, row height comfortable for click targets

**Checkpoint**: Full create and edit flow works keyboard-only. Save failure shows error without losing form state.

---

## Phase 4: User Story 2 — Favourites (Priority: P2)

**Goal**: Pin tickets for instant access — visible before typing, persisted across sessions.

**Independent Test**: Pin a ticket, reload the page, open the form — pinned ticket appears in the Favourites section before any typing. Unpin it — it disappears on next open.

- [x] T013 [US2] Implement Favourite storage helpers in `js/time-entry-form.js`: `getFavourites()` reads `redmine_calendar_favourites` from localStorage (returns `[]` on missing/corrupt); `setFavourites(arr)` writes the array; each entry shape: `{id, subject, projectName}`
- [x] T014 [US2] Render Favourites section in `js/time-entry-form.js`: when the search field is empty on form open, show a "Favourites" heading followed by all pinned tickets as selectable rows using the same keyboard navigation as search results; hide the section if the favourites list is empty
- [x] T015 [US2] Add favourite toggle to each search result row in `js/time-entry-form.js`: a star/pin button that calls `setFavourites()` to add or remove the ticket; button icon/label reflects current state; re-renders the Favourites section immediately
- [x] T016 [P] [US2] Add CSS for the Favourites section heading, rows, and star toggle button in `css/style.css`

**Checkpoint**: Favourites section appears on empty-state open, survives reload, toggling from search results updates the list immediately.

---

## Phase 5: User Story 3 — Last Used Tickets (Priority: P3)

**Goal**: Automatically surface the 5 most recently used tickets — no user action required.

**Independent Test**: Save an entry, reopen the form — the ticket appears in Last Used before any typing. Save 6 different tickets — only the 5 most recent appear.

- [x] T017 [US3] Implement Last Used storage helpers in `js/time-entry-form.js`: `getLastUsed()` reads `redmine_calendar_last_used` (returns `[]` on missing/corrupt); `addLastUsed(ticket)` prepends the ticket, removes any existing entry with the same `id`, and truncates to 5; `setLastUsed(arr)` writes back
- [x] T018 [US3] Call `addLastUsed(ticket)` on every successful save in `js/time-entry-form.js` (both create and edit paths), using the saved entry's issue id/subject/projectName
- [x] T019 [US3] Render Last Used section in `js/time-entry-form.js`: when the search field is empty, show a "Last used" heading followed by up to 5 rows below the Favourites section; a ticket may appear in both sections simultaneously (no deduplication); hide if list is empty
- [x] T020 [P] [US3] Add CSS for the Last Used section heading and rows in `css/style.css`

**Checkpoint**: Last Used section appears after first save, capped at 5 entries, persists across reloads, shown independently of Favourites.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T021 Verify all empty states in `js/time-entry-form.js`: no favourites + no last used → form opens with only the search field visible and focused; both lists hidden cleanly
- [x] T022 Verify search replaces both lists in `js/time-entry-form.js`: when the user starts typing, Favourites and Last Used sections are hidden and the live search results are shown; clearing the input restores both sections
- [x] T023 [P] Final CSS review in `css/style.css`: consistent spacing between Favourites, Last Used, and search result sections; form card width appropriate for the reduced content
- [x] T024 Update `BACKLOG.md`: set the `implement` column for feature 007 to ✅
- [x] T025 Run the full `specs/007-lean-time-entry/quickstart.md` acceptance checklist manually and verify all items pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — MVP deliverable
- **Phase 4 (US2)**: Depends on Phase 2; integrates with Phase 3 search rows (T015 adds toggle to search results)
- **Phase 5 (US3)**: Depends on Phase 2; T018 hooks into the save path established in Phase 3
- **Phase 6 (Polish)**: Depends on Phases 3–5

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational
- **US2 (P2)**: Independent after Foundational; T015 adds UI to search result rows built in US1 (minor touch)
- **US3 (P3)**: Independent after Foundational; T018 adds a call in the save path built in US1 (one line)

### Parallel Opportunities

- All tasks marked `[P]` touch only `css/style.css` — they can run alongside any JS task in the same phase
- T007, T012, T016, T020, T023 (all CSS) can be batched and done together at any point

---

## Implementation Strategy

### MVP (Phase 1–3 only)

1. Complete Phase 1: Strip old form
2. Complete Phase 2: Lean shell + keyboard + activity fetch
3. Complete Phase 3: Search + save + edit + error handling
4. **Validate**: Run quickstart.md sections 1, 2, and 5 only
5. Core lean UX is fully usable at this point

### Incremental Delivery

1. Phases 1–3 → MVP: lean create/edit working
2. Phase 4 → add Favourites
3. Phase 5 → add Last Used
4. Phase 6 → polish + full acceptance checklist

---

## Notes

- `openForm(entry, prefill, onSave, onDelete)` export signature is immutable — `calendar.js` must require zero changes
- All localStorage reads must handle missing/corrupt JSON gracefully (try/catch returning `[]`)
- Issue titles are rendered via `textContent` (never `innerHTML`) to prevent XSS
- Commit message format: `T00X: <description>` per constitution
