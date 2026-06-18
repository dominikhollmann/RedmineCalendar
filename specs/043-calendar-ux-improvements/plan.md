# Implementation Plan: Calendar UX Improvements

**Branch**: `043-calendar-ux-improvements` | **Date**: 2026-06-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/043-calendar-ux-improvements/spec.md`

## Summary

Four independent improvements bundled from Issues #206, #225, #226, and #227, in priority order:

1. **P1 — Data Refresh** (#206): Toolbar Refresh button + optional auto-polling re-fetches Redmine, Outlook, and Teams data without a page reload. New `js/data-refresh.js` module. Preserves `_issueInfoCache` and the planning-view ticket cache.
2. **P2 — Closed-Ticket Warning on Teams Events** (#225): Extract the batch closed-status lookup from `planning-view-outlook.js` into a shared `stampClosedStatus(proposals)` helper in `redmine-api.js`; call it from Teams as well, so the same icon/tooltip appears for both sources.
3. **P3 — Event Source in Modal Title** (#226): Add optional `source` field to proposal objects (`"Teams"` / `"Outlook"`); pass it through `sourceEvent`; `renderSourceEventInfo` uses a parameterised i18n key when `source` is present.
4. **P4 — Planning View Total in Column Header** (#227): Display total booked hours in the Bookings column header (consistent with `day-total` style in Full-Week view); hide `#week-total` from the app-header in planning mode via CSS.

No new runtime dependencies. All changes are vanilla JS ES2022 + existing CSS variable system.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation)

**Primary Dependencies**: FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing for Outlook/Teams Graph); Page Visibility API (browser-native, for auto-refresh pause/resume)

**Storage**:

- `localStorage` — new key `redmine_calendar_auto_refresh_interval` (integer seconds, `0` = disabled; default `300`)
- No new IndexedDB or server-side storage

**Testing**: Vitest (unit), Playwright (UI)

**Target Platform**: Desktop browser (Chrome, Firefox, Edge); mobile layout in scope for Refresh button but no mobile-specific UI tests

**Project Type**: Static SPA (calendar + planning view)

**Performance Goals**: Refresh completes within 5 s on broadband (SC-001); no perceptible render blocking during auto-poll

**Constraints**:

- `js/**` max-lines-per-function: 60 (ESLint hard gate)
- Module effective-LOC: soft 500, hard 600 (SQI + `tests/unit/module-size.test.js`)
- `calendar.js` is at 568 LOC → refresh logic MUST go in a new module to avoid hard-limit breach
- `planning-view-column-base.js` is at 532 LOC → shared closed-status helper goes in `redmine-api.js`, not here
- SQI composite must remain ≥ 80 GREEN after all changes

**Scale/Scope**: Single-user per-tab SPA; no multi-tab coordination required

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked post-design._

| Principle                         | Verdict | Evidence                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I — Redmine API Contract**      | ✅ PASS | All data fetches use existing `fetchTimeEntries`, `fetchIssueInfo`, `fetchCalendarEvents` — no direct DB access. Refresh button re-invokes the same REST API paths already in use.                                                                                                                                                           |
| **II — Calendar-First UX**        | ✅ PASS | Refresh is additive (toolbar button, non-blocking). Planning view total moves to a more prominent position. Modal source label adds info without changing form layout. No layout changes to FC itself.                                                                                                                                       |
| **III — Test-First TDD**          | ✅ PASS | Unit tests required for `stampClosedStatus`, auto-refresh timer, source-label logic, and total computation. UI tests for all four user stories before implementation. Tests defined in `quickstart.md` as acceptance gates.                                                                                                                  |
| **IV — Simplicity / YAGNI**       | ✅ PASS | No new runtime libraries. Page Visibility API is browser-native. `data-refresh.js` is needed because `calendar.js` is already at 568 LOC (hard limit 600). `stampClosedStatus` extracts existing logic (net reduction via deduplication).                                                                                                    |
| **V — Security by Default**       | ✅ PASS | Auto-refresh interval stored in `localStorage` (non-sensitive preference). No credentials touched. Refresh re-uses the existing CORS proxy and encrypted API key flow. Source name in modal title goes through `DOMPurify.sanitize` (already applied to `sourceEvent.subject`; `source` is an enum value from our own code, not user input). |
| **VI — Continuous Quality Gates** | ✅ PASS | New module `data-refresh.js` must stay under 500 effective LOC. All functions ≤ 60 lines. Unit coverage ≥ 95% for new pure-logic code. SQI ≥ 80 enforced by CI.                                                                                                                                                                              |

## Project Structure

### Documentation (this feature)

```text
specs/043-calendar-ux-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 — no open unknowns (see below)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
js/
├── data-refresh.js          # NEW — manual + auto-refresh controller
├── redmine-api.js           # MODIFIED — add stampClosedStatus(proposals)
├── planning-view-outlook.js # MODIFIED — _buildItems delegates to stampClosedStatus
├── planning-view-teams.js   # MODIFIED — new _buildTeamsItems calls stampClosedStatus;
│                            #   add source:'Teams' to proposal objects
├── planning-view.js         # MODIFIED — pass source in sourceEvent; update bookings
│                            #   column header with total; wire Refresh callback
├── time-entry-form-view.js  # MODIFIED — renderSourceEventInfo uses source if present
├── calendar.js              # MODIFIED — export refreshCalendarData(); wire data-refresh.js
├── calendar-toolbar.js      # MODIFIED — add Refresh button to toolbar
├── i18n/en.js               # MODIFIED — add planning.modal_source_info_from, refresh keys
├── i18n/de.js               # MODIFIED — same in German
├── knowledge.topics.json    # MODIFIED — add data-refresh.js to calendar topic
└── settings-page.js         # MODIFIED — wire auto-refresh interval setting
settings.html                # MODIFIED — add auto-refresh interval input
css/
└── planning-view.css        # MODIFIED — .planning-bookings-total style; hide
                             #   #week-total in planning mode
tests/
├── unit/
│   ├── data-refresh.test.js      # NEW
│   └── stamp-closed-status.test.js  # NEW (or appended to redmine-api.test.js)
└── ui/
    └── calendar-ux-improvements.spec.ts  # NEW — 4 story UAT flows
```

**Structure Decision**: Single SPA project. New `data-refresh.js` module extracts refresh orchestration from `calendar.js` to stay under the 600-LOC hard limit. No new directories.

## Complexity Tracking

No constitution violations. The new `data-refresh.js` module is justified by the `calendar.js` LOC constraint (Constitution VI + IV: simpler alternative — stuffing refresh into `calendar.js` — would breach the hard gate).

---

## Phase 0: Research

_No open unknowns. All technical questions resolved via codebase reading. Findings below._

### Decision Log

| #    | Decision                                                                                      | Rationale                                                                                                                                                  | Alternatives Rejected                                                                                         |
| ---- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| R-01 | `stampClosedStatus` lives in `redmine-api.js`                                                 | Co-located with `fetchIssueInfo`/`fetchIssueStatuses` which it wraps; keeps `planning-view-column-base.js` under its LOC cap                               | `planning-view-column-base.js` (over LOC limit); new module (overkill for 8 lines)                            |
| R-02 | `data-refresh.js` is a new module                                                             | `calendar.js` at 568 LOC; adding refresh code would breach 600-LOC hard limit                                                                              | Inline in `calendar.js` (hard-limit breach); inline in `calendar-toolbar.js` (wrong responsibility)           |
| R-03 | Auto-refresh uses `setInterval` + Page Visibility API                                         | Browser-native, zero dependencies, matches spec FR-006/FR-007                                                                                              | WebSockets / server-sent events (overkill; no server component)                                               |
| R-04 | Full re-fetch on each Refresh (not incremental)                                               | Redmine's `updated_on` filter is documented but Easy Redmine compatibility is unverified; full re-fetch is safe and correct for the initial implementation | Incremental delta fetch (deferred; complexity not justified yet)                                              |
| R-05 | `source` field added to proposal objects in normalisation functions                           | Clean separation: source is known at normalisation time; avoids runtime lookup through `_currentOutlookEvents` / `_currentTeamsEvents` arrays              | Deriving source at `_bookOne` call time (fragile — requires list membership checks)                           |
| R-06 | Planning total shown in the Bookings column header via an injected `<span class="day-total">` | Reuses existing `.day-total` CSS class for visual consistency (FR-019); no new CSS class needed                                                            | New `.planning-bookings-total` class (duplication); repurposing `#week-total` (breaks non-planning behaviour) |
| R-07 | `#week-total` hidden in planning mode via a `.planning-mode` class on `<body>`                | Single CSS rule; no JS per-element toggling; clean on/off with `setPlanningMode`                                                                           | JS `element.style.display` manipulation (harder to override in tests)                                         |
| R-08 | Auto-refresh interval stored as `redmine_calendar_auto_refresh_interval` in localStorage      | Consistent with existing per-user preference pattern                                                                                                       | `config.json` admin-only (users need individual control)                                                      |

---

## Phase 1: Design & Contracts

### Data Model

See [`data-model.md`](data-model.md).

### Contracts

See [`contracts/`](contracts/).

### Quickstart (UAT)

See [`quickstart.md`](quickstart.md).

---

## Process Reminder

_Dieser Abschnitt wird via Preset-Composition an jeden Plan angehängt. Änderungen: `.specify/preset-sources/redminecalendar/templates/plan-process-appendix.md`_

### Constitution Check Pflicht-Gates

Folgende Constitution-Prinzipien **müssen** im Constitution-Check-Abschnitt dieses Plans explizit adressiert sein:

| Prinzip                           | Leitfrage                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------- |
| **I — Redmine API Contract**      | Wird ausschließlich die offizielle REST API verwendet? Kein direkter DB-Zugriff? |
| **II — Calendar-First UX**        | Wird die Kalender-Nutzbarkeit nicht beeinträchtigt? Rendering < 300 ms?          |
| **III — Test-First TDD**          | Sind Tests vor der Implementierung definiert (Red-Green-Refactor)?               |
| **IV — Simplicity / YAGNI**       | Ist jede neue Abhängigkeit mit konkretem Bedarf begründet?                       |
| **V — Security by Default**       | Sind alle externen Daten validiert? Credentials verschlüsselt? XSS-Escaping?     |
| **VI — Continuous Quality Gates** | Wird das CI-Gate-Protokoll eingehalten? SQI ≥ 80 nach Implementierung?           |

### SQI-Gate Reminder

CI schlägt fehl bei SQI-Composite < 80. Vor dem Merge sicherstellen:

```bash
npm run sqi        # aktuellen Score prüfen
npm run lint       # ESLint: max-lines-per-function 60 (js/**), complexity 20 (scripts/**)
npm run typecheck  # JSDoc + tsc --noEmit
```

### UI-Test-Iteration (Playwright)

Das vollständige UI-Testsuite (`npm run test:ui`, 128 Tests, ~5 min) nur am Anfang und Ende einer Implementierungsphase ausführen. Während der Iteration:

```bash
npm run test:ui             # Einmalig — Baseline-Fehlerliste ermitteln
npm run test:ui:failed      # Wiederholt — nur fehlgeschlagene Tests erneut ausführen (Sekunden)
npm run test:ui             # Einmalig am Ende — volles Suite bestätigen, bevor letzter Commit
```

Der Pre-Push-Hook ist intelligent: Commits, die nur `specs/`, `docs/` oder `*.md`-Dateien berühren (Plan/Spec/Tasks), laufen nur durch lint + format + typecheck (~10 s). Code-Commits (`.js/.css/.html`) laufen durch die vollständige `ci:local`-Pipeline (~1 min).
