# Tasks: Automated Testing & CI/CD Pipeline

**Input**: Design documents from `.specify/features/009-automated-testing/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: This feature IS the test infrastructure — validation via quickstart.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install test frameworks and create project structure

- [x] T001 Add Vitest and Playwright as dev dependencies in `package.json`. Add npm scripts: `test` (vitest), `test:ui` (playwright), `test:all` (both)
- [x] T002 Create `tests/vitest.config.js` — configure Vitest for ES modules, set test file pattern `tests/unit/**/*.test.js`
- [x] T003 Create `tests/playwright.config.js` — configure Playwright for headless Chromium, base URL `http://localhost:3000`, set test pattern `tests/ui/**/*.spec.js`
- [x] T004 Create test fixture `tests/fixtures/config.json` with stubbed URLs (redmineUrl, redmineServerUrl, aiProxyUrl, aiApiKey, aiModel)
- [x] T005 [P] Create API response fixtures in `tests/fixtures/api-responses/`: `current-user.json`, `time-entries.json`, `activities.json`, `issues.json` — realistic sample data from Redmine API format

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared test utilities needed by all test files

- [x] T006 Create `tests/unit/setup.js` — shared setup for unit tests: mock `fetch`, mock `crypto.subtle`, mock `indexedDB`, provide `localStorage` polyfill for Node.js environment
- [x] T007 Create `tests/ui/helpers.js` — shared Playwright helpers: `mockRedmineApi(page)` function that intercepts all `/proxy/*` routes and returns fixture responses, `setupConfig(page)` that serves the fixture config.json

**Checkpoint**: Foundation ready — test frameworks installed, fixtures and helpers in place

---

## Phase 3: User Story 1 — Developer Runs Unit Tests (Priority: P1) 🎯 MVP

**Goal**: Unit test suite covering all core business logic, runnable with `npm test`.

**Independent Test**: Run `npm test` — all tests pass in under 30 seconds.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create `tests/unit/config.test.js` — test exported constants (SLOT_DURATION, SNAP_DURATION, storage keys)
- [x] T009 [P] [US1] Create `tests/unit/i18n.test.js` — test `t()` translation lookup, `t()` with variables, missing key fallback, `formatDate()` for both locales
- [x] T010 [P] [US1] Create `tests/unit/crypto.test.js` — test encrypt/decrypt round-trip, test that encrypted output differs from input, test decrypt with wrong key fails
- [x] T011 [P] [US1] Create `tests/unit/settings.test.js` — test `loadCentralConfig()` (success, 404, malformed), `readCredentials()`/`writeCredentials()` round-trip, `readWorkingHours()`/`writeWorkingHours()`
- [x] T012 [P] [US1] Create `tests/unit/redmine-api.test.js` — test `request()` builds correct URL and headers, test `mapTimeEntry()` mapping, test `searchIssues()` with ID and text queries, test `createTimeEntry()`/`updateTimeEntry()` request bodies, test error handling (401, 404, 422, 503)
- [x] T013 [P] [US1] Create `tests/unit/arbzg.test.js` — test `computeArbzgWarnings()` for daily limit, weekly limit, rest period, break requirements, Sunday/holiday detection

**Checkpoint**: `npm test` runs all unit tests, all pass, completes in under 30 seconds

---

## Phase 4: User Story 2 — Developer Runs Automated UI Tests (Priority: P2)

**Goal**: UI test suite covering all user-facing features, runnable with `npm run test:ui`.

**Independent Test**: Run `npm run test:ui` — browser launches headlessly, all scenarios pass.

### Implementation for User Story 2

- [x] T014 [US2] Create `tests/ui/settings.spec.js` — test first-time setup flow (welcome banner, enter API key, save, redirect to calendar), test returning user (credentials pre-filled), test config error display, test auth type toggle
- [x] T015 [US2] Create `tests/ui/calendar.spec.js` — test calendar loads with time entries from fixture, test week navigation (prev/next/today), test week total display
- [x] T016 [US2] Create `tests/ui/time-entry.spec.js` — test create entry (click slot, fill form, save), test edit entry (double-click, modify, save), test delete entry (select, press Del, confirm)
- [x] T017 [P] [US2] Create `tests/ui/copy-paste.spec.js` — test select entry, Ctrl+C, click slot to paste, verify clipboard banner
- [x] T018 [P] [US2] Create `tests/ui/working-hours.spec.js` — test toggle working hours view, verify slot range changes
- [x] T019 [P] [US2] Create `tests/ui/workweek.spec.js` — test toggle Mo-Fr vs full week, verify day columns change
- [x] T020 [P] [US2] Create `tests/ui/favourites.spec.js` — test add/remove favourite, verify favourites section in form
- [x] T021 [P] [US2] Create `tests/ui/arbzg.spec.js` — test ArbZG warning indicators appear on day headers for overtime scenarios
- [x] T022 [P] [US2] Create `tests/ui/chatbot.spec.js` — test open chat panel, send message (stubbed AI response), verify response renders
- [x] T023 [P] [US2] Create `tests/ui/docs.spec.js` — test open docs panel, verify content loads

**Checkpoint**: `npm run test:ui` runs all UI tests headlessly, all pass

---

## Phase 5: User Story 3 — CI Pipeline (Priority: P3)

**Goal**: GitHub Actions runs tests automatically on every push.

**Independent Test**: Push a commit — verify GitHub Actions runs and reports status on the PR.

### Implementation for User Story 3

- [x] T024 [US3] Create `.github/workflows/ci.yml` — trigger on push to any branch, run `npm ci`, run `npm test` (unit tests), install Playwright browsers, run `npm run test:ui`, report results
- [x] T025 [US3] Configure branch protection rules in README: document that main branch should require CI status checks to pass before merging

**Checkpoint**: Push to any branch triggers CI; test results visible on PRs

---

## Phase 6: User Story 4 — Automated Deployment (Priority: P4)

**Goal**: Merge to main auto-deploys to GitHub Pages.

**Independent Test**: Merge a PR to main — verify the deployed app updates.

### Implementation for User Story 4

- [x] T026 [US4] Create `.github/workflows/deploy.yml` — trigger on push to `main` only, run tests first, on success deploy to GitHub Pages using `peaceiris/actions-gh-pages`, generate `config.json` from GitHub Actions variables/secrets
- [x] T027 [US4] Update `README.md` — add CI/CD badge, document GitHub Pages staging URL, document how to configure GitHub Actions secrets for deployment

**Checkpoint**: Merge to main triggers deployment; app accessible on GitHub Pages

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T028 [P] Add `tests/` and `.github/` to `.gitignore` patterns if needed (node_modules in tests, playwright report artifacts)
- [x] T029 Run quickstart.md acceptance tests: execute all checklist items in `.specify/features/009-automated-testing/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Unit Tests (Phase 3)**: Depends on Phase 2
- **US2 UI Tests (Phase 4)**: Depends on Phase 2, partially on Phase 3 (shared fixtures)
- **US3 CI (Phase 5)**: Depends on Phase 3 + 4 (needs working tests to run in CI)
- **US4 CD (Phase 6)**: Depends on Phase 5 (needs CI passing)
- **Polish (Phase 7)**: Depends on all user stories

### Parallel Opportunities

- T004 and T005 can run in parallel (Phase 1, different files)
- All T008–T013 can run in parallel (Phase 3, independent test files)
- T017–T023 can run in parallel (Phase 4, independent test files)
- T028 can run in parallel with T029

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001–T005)
2. Phase 2: Foundational (T006–T007)
3. Phase 3: Unit Tests (T008–T013)
4. **STOP and VALIDATE**: `npm test` passes

### Incremental Delivery

1. Setup + Foundational → Framework ready
2. US1 → `npm test` works → MVP
3. US2 → `npm run test:ui` works
4. US3 → CI runs automatically
5. US4 → Auto-deploy on merge
6. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- All tests must be deterministic — no flaky timing-based assertions
- API responses stubbed from `tests/fixtures/api-responses/`
- Commit after each task: `T0XX: <description>`
