# Implementation Plan: Planning View — Teams Calls & Meetings Column

**Branch**: `041-teams-calls-meetings` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/041-teams-calls-meetings/spec.md`

## Summary

Add a "Teams" column to the Planning View that shows actual (not scheduled) Microsoft Teams call
durations alongside Redmine bookings and Outlook events. Two new modules are introduced:
`js/planning-view-teams.js` (the Teams event-source column, mirroring `planning-view-outlook.js`)
and `js/planning-view-cache.js` (a shared, session-scoped memoisation cache for Redmine issue
lookups). A mandatory feasibility spike (FR-015) gates all call-record implementation work — access
to per-user Teams call records via the Graph `callRecords` endpoint may require tenant-admin
consent. The Outlook column's coverage check also receives a corrective fix: `isFullyCovered` must
use `roundToQuarter`-ed times (FR-013), and Outlook event cards must display raw scheduled times
rather than rounded times (previously both were rounded due to `parseCalendarProposals` storing
rounded values).

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)

**Primary Dependencies**:

- MSAL.js v2 (CDN, existing) — Microsoft auth for Graph API calls
- FullCalendar v6 (CDN, existing) — slot-height geometry for column layout
- Microsoft Graph API:
  - `calendarView` (existing, `Calendars.Read` delegated scope) — scheduled meeting metadata
  - `/me/onlineMeetings/{id}/attendanceReports` (NEW, `OnlineMeetingArtifact.Read.All` delegated) — actual join/leave times for scheduled meetings
  - `/communications/callRecords` (NEW, `CallRecords.Read.All` **application** permission — admin consent required) — ad-hoc call history

**Storage**: `localStorage` key `redmine_calendar_planning_source_teams` (`'0'` default, `'1'`
when enabled). All Teams event data is in-memory only — no new IndexedDB, no `config.json`
additions (FR-018).

**Testing**: Vitest (unit tests), Playwright (UI tests) — no new testing infrastructure

**Target Platform**: Desktop browsers (mobile out of scope — same constraint as feature 038)

**Performance Goals**: Teams column renders independently from Bookings and Outlook columns. A
loading skeleton appears immediately; Teams data populates when the Graph API calls complete.
Failure in the Teams column MUST NOT delay or block other columns (FR-014).

**Constraints**:

- SQI composite ≥ 80 GREEN (hard CI gate; no exceptions)
- Max 500 effective LOC per module (hard gate — `planning-view-teams.js` must stay within)
- Unit test line coverage ≥ 95% per-file (CI-enforced for new modules)
- Teams event data MUST NOT be persisted or enter AI context (FR-018, FR-019)
- Feasibility spike MUST complete before any call-record implementation (FR-015)

**Scale/Scope**: Single-user daily Planning View, ≤ ~50 Teams events per day. No pagination
required for typical usage.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status       | Notes                                                                                                                                                                                                  |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Redmine API Contract      | ✅ PASS      | Redmine accessed exclusively via existing `fetchIssueInfo` REST wrapper in `js/redmine-api.js`. The memoisation cache reduces API calls but does not bypass the REST API contract.                     |
| II. Calendar-First UX        | ✅ PASS      | Teams column is additive — appears alongside existing Bookings and Outlook columns. Bookings and Outlook columns are fully independent (FR-014). Loading skeleton renders before data fetch completes. |
| III. Test-First              | ✅ PASS      | Plan mandates tests written before implementation begins. New modules `planning-view-cache.js` and `planning-view-teams.js` require ≥ 95% unit test coverage. Red-Green-Refactor cycle enforced.       |
| IV. Simplicity & YAGNI       | ⚠️ JUSTIFIED | `planning-view-cache.js` is a new abstraction layer. Justified in Complexity Tracking table below.                                                                                                     |
| V. Security by Default       | ✅ PASS      | Teams event data (participant names, titles) sanitised via DOMPurify before DOM insertion. No new credential storage — MSAL token reused from existing auth flow. Teams data never persisted (FR-018). |
| VI. Continuous Quality Gates | ✅ PASS      | SQI ≥ 80, coverage ≥ 95%, lint/format/typecheck/htmlhint all enforced. New modules sized within 500 effective-LOC ceiling.                                                                             |

**Post-design re-check**: Completed — no violations introduced by Phase 1 design decisions.

## Project Structure

### Documentation (this feature)

```text
specs/041-teams-calls-meetings/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── storage-keys.md              # Phase 1 output
│   └── planning-view-teams-api.md   # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
js/
├── planning-view-cache.js       # NEW: session-scoped memoisation cache for Redmine issue lookups
├── planning-view-teams.js       # NEW: Teams column renderer (mirrors planning-view-outlook.js)
├── planning-view-outlook.js     # MODIFIED: coverage rounding fix + column-scope clear callback
├── planning-view.js             # MODIFIED: mount/unmount Teams column; cross-column clear dispatch
├── config.js                    # MODIFIED: add STORAGE_KEY_PLANNING_SOURCE_TEAMS constant
├── i18n/en.js                   # MODIFIED: Teams column strings (header, states, labels)
├── i18n/de.js                   # MODIFIED: German translations for all new strings
└── knowledge.topics.json        # MODIFIED: add planning-view-teams.js + planning-view-cache.js

settings.html                    # MODIFIED: Teams toggle in Planning View sources section
js/settings-page.js              # MODIFIED: read/write STORAGE_KEY_PLANNING_SOURCE_TEAMS

tests/unit/
├── planning-view-cache.test.js  # NEW: memoisation cache — hit, miss, failure-no-cache, concurrent
├── planning-view-teams.test.js  # NEW: call/meeting classification, coverage rounding, participants
└── planning-view-outlook.test.js # MODIFIED: add coverage-rounding tests for isFullyCovered call sites

tests/ui/
└── planning-view-teams.spec.js  # NEW: Playwright — column toggle, drag-to-book, failure isolation
```

**Structure Decision**: Single-project SPA. The Teams column module mirrors the existing
`planning-view-outlook.js` pattern for consistency. The memoisation cache is a standalone module to
keep it shared, independently testable, and under the 500 effective-LOC ceiling.

## Complexity Tracking

| Violation                                                | Why Needed                                                                                                                                                                                       | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New `planning-view-cache.js` module (shared cache layer) | Prevents duplicate Redmine API calls when the same issue appears in Outlook and Teams columns (FR-016, SC-004). Session-scoped, in-memory only — no persistence, minimal surface area (~60 LOC). | Inline `Map` per column module would not share results across columns, causing the exact duplicate-API-call problem the feature requires solving. Inlining the cache in `planning-view.js` would couple the orchestrator to Redmine API concerns and is harder to unit-test in isolation. |
