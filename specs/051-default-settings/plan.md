# Implementation Plan: Sensible First-Launch Defaults

**Branch**: `051-default-settings` | **Date**: 2026-06-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/051-default-settings/spec.md`

## Summary

Change six read-path functions in three JavaScript modules so that every absent localStorage preference returns a sensible factory value instead of `null`/`false`. No new keys are written on first load; the defaults are applied entirely at read-time. The only behavioural changes visible to existing users: the Teams planning source is now ON by default (FR-008) and the Planning View is the landing screen by default (FR-001). All other defaults either were already correct or are newly documented.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)

**Primary Dependencies**: FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing) — no new dependencies

**Storage**: localStorage — existing keys only; no new keys introduced. Effective defaults applied at read-time, not written on first load.

**Testing**: Vitest (unit, Node + jsdom), Playwright (UI, real Chromium); GitHub Actions CI

**Target Platform**: Desktop browser (static SPA on company intranet); mobile out of scope per spec Assumptions

**Project Type**: Desktop web application (static SPA)

**Performance Goals**: N/A — this feature is pure read-path logic with zero network calls or rendering overhead

**Constraints**: Zero new localStorage keys. Must not break any existing stored preferences for returning users. Effective defaults must be consistent across all four consumers of working hours (calendar display, Settings form, ArbZG compliance, chatbot planning context).

**Scale/Scope**: 8 storage keys, 3 modules touched, 3 module test files updated

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                           | Status | Notes                                                                                                                                  |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| I — Single source of truth          | PASS   | Each preference has exactly one read function; defaults live in `js/working-hours.js` and at call sites of `localStorage.getItem(...)` |
| II — Fail fast                      | PASS   | Invalid stored values still return `null` (not a silent wrong default); only absent keys receive the default                           |
| III — Explicit over implicit        | PASS   | Default values are named constants, not magic literals                                                                                 |
| IV — YAGNI                          | PASS   | No admin-configurable defaults, no `config.json` fields — hard-coded by design per spec Clarification Q1                               |
| V — Immutable data                  | N/A    | Preferences are mutable by nature                                                                                                      |
| VI — Quality gate (SQI ≥ 80)        | PASS   | Changes are small (≤ 6 lines per file), no module grows beyond thresholds                                                              |
| VII — Reuse before reimplementation | PASS   | Extending existing `readWorkingHours()` / `readWeeklyHours()` rather than forking                                                      |

Post-design re-check: PASS — no architectural deviation introduced.

## Project Structure

### Documentation (this feature)

```text
specs/051-default-settings/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (affected files only)

```text
js/working-hours.js        # FR-006, FR-007 — readWorkingHours / readWeeklyHours defaults
js/planning-view.js        # FR-001, FR-008 — active-view and Teams-source defaults
js/settings-page.js        # FR-010 — toggle pre-population for view-mode, day-range, Teams

tests/unit/settings.test.js          # Update: readWorkingHours null-absent test
tests/unit/settings-extras.test.js   # Update: readWeeklyHours null-absent test + corrupt-value tests
```

**Structure Decision**: Single project (Option 1). All changes are in `js/` and `tests/unit/`. No new files, no new directories.

## Complexity Tracking

> No Constitution violations to justify.
