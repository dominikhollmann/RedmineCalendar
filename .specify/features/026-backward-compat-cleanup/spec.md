# Feature Specification: Code Cleanup & Simplification

**Feature Branch**: `026-backward-compat-cleanup`
**Created**: 2026-05-08
**Status**: Draft
**Input**: User description: "026 — remove backward-compatibility shims, drop fallbacks for time entries without start/end times, run the code-simplifier agent, and check for any other refactoring needed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove legacy localStorage migration shims (Priority: P1)

The codebase contains migration logic that scrubs deprecated localStorage keys (e.g. `redmine_calendar_holiday_ticket`) from per-user browser storage on app load. This logic exists to handle users who upgraded from a pre-feature-025 build. Because this app has never been deployed to anyone, no such users exist — the migration code is dead weight that adds noise to settings load and ships ~50 lines of code, tests, and hooks the project does not need.

**Why this priority**: P1 because every page load runs the cleanup, and every settings change triggers a function whose only job is to handle a scenario that cannot occur. Removing it shrinks the boot path and clarifies the data model.

**Independent Test**: After removal, no localStorage key is altered automatically on app start; settings load reads only the current schema. The full unit and Playwright test suites still pass.

**Acceptance Scenarios**:

1. **Given** a developer reads `js/settings.js` to understand settings load, **When** they trace `loadCentralConfig()`, **Then** the function does no automatic key scrubbing and contains no references to deprecated localStorage keys.
2. **Given** the unit-test suite, **When** it runs, **Then** there is no `tests/unit/settings-cleanup.test.js` file (or its equivalent) testing migration behavior — those tests are removed alongside the code.

---

### User Story 2 - Drop fallbacks for time entries missing start/end times (Priority: P2)

Several code paths special-case time entries whose `startTime` and/or `endTime` is `null` — for example, a `'no-start-time'` CSS class on the calendar event, an `addMinutes(start, hours)` end-time computation in the modal's `initTimeInputs`, and `if (entry.startTime)` guards in `eventContent`. These paths were retained to support entries created before the start/end-time feature shipped. Because the app was never deployed and feature 018 made start time mandatory at creation time, no such entries can exist in the wild.

**Why this priority**: P2 because the fallback paths complicate calendar render and modal init, making both harder to reason about. Dropping them lets the calendar code assume `startTime` and `endTime` are always present.

**Independent Test**: After removal, the calendar renderer assumes `entry.startTime` and `entry.endTime` are always set; the `'no-start-time'` className is gone; the modal's `initTimeInputs` reads `endTime` directly without computing a fallback. All tests still pass; the dev calendar still renders all fixture entries.

**Acceptance Scenarios**:

1. **Given** a developer reads `js/calendar.js:toFcEvent`, **When** they trace the function, **Then** there are no `if (!entry.startTime)` or `'no-start-time'` branches.
2. **Given** a developer reads `js/time-entry-form.js:initTimeInputs`, **When** they trace it, **Then** the function uses `prefill.endTime ?? entry.endTime` directly instead of computing `addMinutes(startTime, hours)` as a fallback.
3. **Given** the unit + Playwright suites, **When** they run, **Then** all tests pass.

---

### User Story 3 - Run code-simplifier agent and apply non-controversial findings (Priority: P3)

The project recently installed the `code-simplifier` plugin (`/simplify` skill). It scans changed code for reuse, quality, and efficiency opportunities and reports refactor candidates. Running it across the post-025 codebase will surface other simplifications the team can apply (duplicated logic, unnecessary abstractions, helpers that could be inlined, etc.).

**Why this priority**: P3 because the value depends on what the agent finds; not all suggestions will be worth applying. Treat it as a discovery step that may generate further small refactors.

**Independent Test**: The agent is invoked, its findings are recorded in this feature's notes, and any accepted refactors are applied as separate commits with passing tests.

**Acceptance Scenarios**:

1. **Given** the developer invokes the `/simplify` skill (or `code-simplifier` agent) on the post-025 codebase, **When** it produces findings, **Then** each finding is reviewed and either accepted (refactor applied + tests pass) or rejected with a brief reason.
2. **Given** an accepted simplification, **When** it is applied, **Then** the unit + Playwright suites still pass and no user-visible behavior changes.

---

### User Story 4 - Sweep for additional dead code or "just in case" branches (Priority: P3)

While doing US1 and US2, the developer should grep the codebase for similar patterns: `// migration`, `// legacy`, `// for backward compatibility`, `// safe fallback`, etc. Any code with these markers (or comparable patterns) that exists only because the app *might* have shipped earlier should be removed.

**Why this priority**: P3 — the volume is unknown until a sweep is done. Discovered items become removal candidates.

**Independent Test**: A grep over the codebase for backward-compat / migration / legacy markers returns no remaining hits in production code (`js/`, `css/`, `*.html`); test fixtures and historical commit messages are exempt.

**Acceptance Scenarios**:

1. **Given** a grep `grep -rn "legacy\|migration\|backward\|compatibility\|for now\|just in case" js/ css/ *.html`, **When** run after the cleanup, **Then** the only matches that remain have a clear, current-architecture justification (e.g. comments describing intentional graceful handling of external API quirks).

---

### Edge Cases

- **Removed code is needed again later**: Git history preserves it; if a real backward-compat scenario emerges (e.g. the app actually deploys and users start having pre-026 storage), the team adds a new, scoped migration at that point — not retained "just in case".
- **Simplifier agent suggests behavior change disguised as simplification**: The reviewer rejects it. Pure refactors (rename, inline, deduplicate) are accepted; semantic changes are not.
- **Test relying on the legacy code**: Test is removed alongside the production code.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All localStorage migration / legacy-key-cleanup logic MUST be removed. Specifically: the `cleanupLegacyKeys()` function in `js/settings.js`, its invocation from `loadCentralConfig`, and its dedicated unit test (`tests/unit/settings-cleanup.test.js`).
- **FR-002**: All conditional paths that handle time entries without `startTime` or `endTime` MUST be removed. Specifically: the `'no-start-time'` className path in `js/calendar.js`, the `addMinutes(startTime, hours)` end-time fallback in `js/time-entry-form.js:initTimeInputs`, and any `if (!entry.startTime)` / `if (!entry.endTime)` guards in `eventContent` and similar render paths. After this change, the data model assumes all time entries carry both fields.
- **FR-003**: The `code-simplifier` agent (or equivalent `/simplify` skill) MUST be run across the codebase. Findings MUST be reviewed; non-breaking simplifications MUST be applied as separate, atomic commits.
- **FR-004**: A grep sweep over `js/`, `css/`, and root-level `*.html` files for keywords `legacy`, `migration`, `backward`, `backward-compat`, `for now`, `just in case`, `// removed`, `for migration`, `historical` MUST be done; any code retained only for backward compatibility (and not for legitimate handling of external system quirks) MUST be removed.
- **FR-005**: After every removal, the full unit + Playwright test suites MUST pass. If a test exists only to verify legacy behavior, it is removed alongside the production code; if a test fails for any other reason, the cleanup is reverted or fixed before proceeding.
- **FR-006**: User-visible behavior MUST remain identical. No new feature flags, no UI changes, no message changes (except for translations of removed code's user-facing strings, if any).

### Key Entities

*(No new data entities. The change is structural — removing code that handled hypothetical legacy data shapes.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Production code (`js/`, `css/`, `*.html`) is at least 100 lines shorter after the cleanup (combined `cleanupLegacyKeys` + no-start-time fallbacks + simplifier-agent applications).
- **SC-002**: All unit tests (currently 386) and Playwright tests (currently 52) pass after every step of the cleanup. No test count regression beyond the deletions justified by FR-001 / FR-002.
- **SC-003**: A developer reading `js/calendar.js:toFcEvent`, `js/time-entry-form.js:initTimeInputs`, and `js/settings.js:loadCentralConfig` finds no branches that handle pre-existing-deployment scenarios.
- **SC-004**: A grep for the keywords listed in FR-004 across production code returns no remaining hits whose purpose is backward compatibility for this app's own past versions.

## Assumptions

- The application has never been deployed to any user. Any code labelled "for users upgrading from version X" is therefore dead weight.
- Git history preserves removed code; if a future deployment scenario reintroduces a real need, a fresh migration can be added scoped to that need.
- All time entries currently in any developer's Redmine instance have `easy_time_from` and `easy_time_to` populated (feature 018 made these mandatory at creation; pre-018 entries are not relevant because the app was not in production then either).
- The `code-simplifier` agent is non-destructive — it suggests changes for human review rather than applying them automatically.
- The simplifier-agent run is a discovery step; the volume of accepted refactors is bounded by reviewer judgment, not committed in advance.
