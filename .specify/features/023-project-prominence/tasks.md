# Tasks: Enhanced Project Display and Search

**Input**: Design documents from `.specify/features/023-project-prominence/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, quickstart.md

**Tests**: Every implementation task that adds or changes behavior MUST include its own unit and/or UI tests. Tests are not a separate phase — they are part of completing each task. A task is not done until its tests exist and pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add project identifier to data layer and fixtures

- [ ] T001 Add `projectIdentifier` field to `mapTimeEntry()` return object in js/redmine-api.js — extract from associated issue data; return `null` when unavailable (with unit test in tests/unit/project-search.test.js)
- [ ] T002 [P] Add `projectIdentifier` field to `searchIssues()` return objects in js/redmine-api.js — extract `issue.project?.identifier` (with unit test)
- [ ] T003 [P] Add `project.identifier` field to test fixtures tests/fixtures/api-responses/time-entries.json and tests/fixtures/api-responses/issues.json
- [ ] T004 [P] Add project-related i18n keys to js/i18n.js (en + de): `project.identifier_label`, `project.no_identifier` (with unit test verifying keys exist)
- [ ] T005 [P] Create `formatProject(identifier, name)` utility function — returns `"ID — Name"` with truncation at 20 chars + `…` suffix; falls back to name-only when identifier is null. Export from js/redmine-api.js or new helper (with unit test in tests/unit/project-search.test.js)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ensure project identifier flows through the entire data pipeline

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Propagate `projectIdentifier` through the calendar event data flow: ensure `extendedProps.timeEntry` includes `projectIdentifier` when events are created in js/calendar.js (verify with existing calendar UI tests — no regressions)
- [ ] T007 [P] Propagate `projectIdentifier` into favourites and last-used localStorage entries in js/time-entry-form.js — add field when saving, read when loading; gracefully handle stored entries without the field (with unit test)

**Checkpoint**: Project identifier available in all data objects throughout the app

---

## Phase 3: User Story 1 — Project ID and Name in Calendar and Modal (Priority: P1) 🎯 MVP

**Goal**: Display "PROJ — My Project" on calendar events, in the modal, and in search results

**Independent Test**: Create time entries on tickets from different projects, verify events and modal show project identifier and name

- [ ] T008 [US1] Update `eventContent` callback in js/calendar.js to use `formatProject()` for the `ev-project` line — replace current `entry.projectName` display with formatted "ID — Name" (with UI test in tests/ui/project-display.spec.js)
- [ ] T009 [US1] Add CSS for project identifier truncation and tooltip in css/style.css — truncated text gets `title` attribute with full identifier (with UI test verifying tooltip)
- [ ] T010 [US1] Update time entry modal project display in js/time-entry-form.js to show "ID — Name" format when viewing/editing an entry (with UI test)
- [ ] T011 [US1] Update search result rows in js/time-entry-form.js `renderSearchResults()` to show "ID — Name" in the `.lean-row-project` span (with UI test)
- [ ] T012 [US1] Handle graceful fallback: when `projectIdentifier` is null, display project name only — verify no "null" or empty prefix appears (with unit test)
- [ ] T013 [US1] Verify mobile display at 375px viewport — project identifier and name visible on events (with UI test in tests/ui/project-display.spec.js)

**Checkpoint**: All project displays show "PROJ — My Project" format with graceful fallback

---

## Phase 4: User Story 2 — Search Tickets by Project (Priority: P2)

**Goal**: Users can search tickets by project identifier or name, with any-position token matching

**Independent Test**: Type a project identifier in search field, verify results are filtered to that project's tickets

- [ ] T014 [US2] Implement any-position token matching function in js/time-entry-form.js: each search token is independently matched against project identifiers, project names, and ticket titles; results ranked by relevance score (with unit tests in tests/unit/project-search.test.js)
- [ ] T015 [US2] Integrate project search matching into `onSearchInput()` in js/time-entry-form.js — apply matching to API search results (with UI test)
- [ ] T016 [US2] Filter favourites and last-used lists by project when a search term matches a project — in js/time-entry-form.js (with UI test)
- [ ] T017 [US2] Handle search term matching both project and ticket: show both matches, with project-filtered results ranked higher — in js/time-entry-form.js (with unit test)

**Checkpoint**: Users can find tickets by typing project identifier, project name, or combined terms

---

## Phase 5: User Story 3 — AI Assistant Knows About Projects (Priority: P3)

**Goal**: AI assistant includes project info in responses and can resolve project references

**Independent Test**: Ask the assistant "what did I book today?" and verify project identifiers appear in the response

- [ ] T018 [US3] Update `query_time_entries` result formatting in js/chatbot-tools.js to include "PROJ — My Project" per entry (with unit test in tests/unit/chatbot-tools.test.js)
- [ ] T019 [US3] Update tool schemas in js/chatbot-tools.js to document project identifier and name fields in input/output descriptions (with unit test verifying schema)
- [ ] T020 [US3] Update `create_time_entry` and `edit_time_entry` tool result formatting to include project identifier when reporting results — in js/chatbot-tools.js (with unit test)
- [ ] T021 [US3] Verify AI assistant handles ambiguous project references — when multiple projects match, the assistant should present options (with UI test in tests/ui/project-display.spec.js)

**Checkpoint**: AI assistant displays and resolves project references correctly

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and final validation

- [ ] T022 [P] Update user documentation in docs/content.en.md and docs/content.de.md with project identifier display and search features
- [ ] T023 Run quickstart.md UAT scenarios (T1–T13) and verify all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001, T002 (data layer changes) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs project identifier in data to search against)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (uses data layer directly); independent of US1/US2
- **Polish (Phase 6)**: Depends on all user stories complete

### Within Each User Story

- Data formatting before UI display
- Core display before search logic
- Each task includes its own tests

### Parallel Opportunities

- T001 ∥ T003 ∥ T004 ∥ T005 (different files)
- T006 ∥ T007 (different files)
- US1 and US3 could run in parallel after Phase 2 (independent data paths)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T007)
3. Complete Phase 3: User Story 1 (T008–T013)
4. **STOP and VALIDATE**: Test display in calendar, modal, and search results
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Project identifier flows through data
2. User Story 1 → Display enriched everywhere → MVP!
3. User Story 2 → Project-based search works
4. User Story 3 → AI assistant project-aware
5. Polish → Documentation + final validation
