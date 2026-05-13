# Implementation Plan: Code Cleanup & Simplification

**Branch**: `main` (specs land on main per project policy) | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/.specify/features/026-backward-compat-cleanup/spec.md`

## Summary

Pure refactor / cleanup feature. Three independently-testable removal slices, plus a discovery slice driven by the `code-simplifier` agent. No user-visible behavior changes; the goal is a smaller, clearer codebase. The work is essentially three `grep`-driven sweeps: legacy localStorage cleanup, time-entry start/end-time fallbacks, and a generic backward-compat / "just in case" search. The final slice runs the `/simplify` skill on the post-025 codebase and applies non-controversial findings as separate commits.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged
**Primary Dependencies**: FullCalendar v6 (CDN), MSAL.js v2 (CDN) — unchanged. No new dependencies.
**Storage**: N/A — the cleanup itself touches `js/settings.js`'s localStorage key handling but does not introduce new storage.
**Testing**: Vitest (unit), Playwright (UI). All 386 unit + 52 Playwright tests must pass after every step. Test deletions only when removing the production code they exclusively cover (FR-005).
**Target Platform**: Browser (existing). Same.
**Project Type**: Single SPA (existing layout under repo root).
**Performance Goals**: No regression. Settings-load path slightly faster after removing `cleanupLegacyKeys()` invocation; calendar render unchanged or marginally faster after removing `'no-start-time'` branches.
**Constraints**: User-visible behavior MUST remain identical (FR-006). Zero new feature flags; zero new UI strings (some i18n keys may be removed if their only consumers are removed code).
**Scale/Scope**: ≥100 lines of production code removed (SC-001). Estimated 3–5 commits: one per slice, plus 0–N commits for accepted simplifier-agent findings.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle               | Compliance | Notes                                                                                                                                                                                                                   |
| ----------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Redmine API Contract | ✅         | No API surface changes.                                                                                                                                                                                                 |
| II. Calendar-First UX   | ✅         | Calendar render simplifies (fewer null-fallback branches). No interaction or perf regression.                                                                                                                           |
| III. Test-First         | ✅         | Existing test suites are the gate. No production code is removed without first verifying that all tests still pass. Tests dedicated to legacy behaviour are removed alongside the production code; no new tests needed. |
| IV. Simplicity & YAGNI  | ✅✅       | This feature _is_ the YAGNI principle applied retroactively — removing code that exists for speculative future needs. Direct alignment.                                                                                 |
| V. Security by Default  | ✅         | No credential / authentication / encryption changes.                                                                                                                                                                    |

**Re-evaluation post-design**: Identical (the design phase produces no new abstractions; it produces a subtractive change list).

## Project Structure

### Documentation (this feature)

```text
.specify/features/026-backward-compat-cleanup/
├── plan.md              # This file
├── research.md          # Phase 0 — enumerate the removal targets via grep
├── data-model.md        # Phase 1 — clarifies the post-cleanup TimeEntry shape (startTime/endTime now required)
├── quickstart.md        # Phase 1 — UAT script (manual smoke-test + grep verification)
├── contracts/           # Phase 1 — N/A; this feature exposes no external interfaces
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created here)
```

### Source Code (repository root) — affected paths only

```text
js/
├── settings.js          # remove cleanupLegacyKeys() + its invocation
├── calendar.js          # remove 'no-start-time' className path + null-startTime guards
├── time-entry-form.js   # initTimeInputs: drop addMinutes(start, hours) end-time fallback
└── (others)             # any files surfaced by simplifier agent or grep sweep

tests/
├── unit/
│   ├── settings-cleanup.test.js   # delete (covers removed migration logic)
│   ├── calendar-render.test.js    # adjust if it asserted the no-start-time class behaviour
│   └── (others)                   # update only if a test exclusively covers removed legacy code
└── ui/
    └── (no expected changes)
```

**Structure Decision**: No structural change. This feature is subtractive against the existing single-project layout; no new directories, modules, or files are introduced (only the `.specify/features/026-…/` planning artifacts).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No violations. This feature reduces complexity rather than adding it._
