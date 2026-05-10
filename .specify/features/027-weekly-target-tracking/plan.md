# Implementation Plan: Weekly Hours Target Tracking

**Branch**: `027-weekly-target-tracking` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.specify/features/027-weekly-target-tracking/spec.md`

## Summary

Display progress against the user's configured `weeklyHours` target in the calendar header next to the existing week total: booked-vs-target (e.g., `16h / 40h`), remaining hours, and remaining unfilled workdays. Pure-UI feature on top of existing data — no new persistent settings, no new API calls. The header indicator is hidden when `weeklyHours` is unset, preserving today's appearance.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)
**Primary Dependencies**: FullCalendar v6 (CDN, existing); no new dependencies
**Storage**: existing `localStorage` key `redmine_calendar_weekly_hours` (read-only for this feature); admin-managed `config.json` for `holidayTicket`
**Testing**: Vitest (unit — pure progress computation); Playwright (UI — header rendering, mobile, CRUD reactivity)
**Target Platform**: modern browsers (Chrome/Firefox/Safari current); responsive down to ~360 px wide
**Project Type**: static SPA (single project; no backend changes)
**Performance Goals**: header re-render under 300 ms after any entry CRUD, per Constitution Principle II
**Constraints**: must not regress today's header layout when `weeklyHours` is unset (Playwright screenshot baseline); strings must be EN+DE in `js/i18n.js`
**Scale/Scope**: ~1 new pure JS module (~80 LOC), ~1 modified function in `js/calendar.js`, ~6 i18n keys, ~30 lines of CSS, ~2 unit-test files, ~1 Playwright spec

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|---|---|---|
| I | Redmine API Contract | ✅ N/A | No new API calls; reads only already-loaded entries. |
| II | Calendar-First UX | ✅ Pass | Indicator lives in the existing `.app-header` row alongside the week total. Mobile responsive (FR-009, SC-005). Updates within 300 ms after CRUD (SC-002). |
| III | Test-First | ✅ Pass | All progress arithmetic is a pure function with Vitest coverage; UI behaviour covered by Playwright. Tests written before implementation (TDD). |
| IV | Simplicity & YAGNI | ✅ Pass | One new module, one modified function. No new dependencies, no new persistent settings, no new abstraction. |
| V | Security by Default | ✅ N/A | No new credentials, no new untrusted input, no new rendered user content beyond integers and existing translated strings. |

No Constitution violations. Complexity Tracking section below remains empty.

## Project Structure

### Documentation (this feature)

```text
.specify/features/027-weekly-target-tracking/
├── plan.md                      # This file
├── research.md                  # Phase 0 — codebase touch-points, edge-case decisions
├── data-model.md                # Phase 1 — derived WeekProgress shape
├── quickstart.md                # Phase 1 — UAT walk-through (also seeds Playwright)
├── contracts/                   # (intentionally empty — no external interfaces)
└── tasks.md                     # Created by /speckit.tasks
```

### Source Code (repository root)

```text
js/
├── week-target.js               # NEW — pure module: computeWeekProgress({entries, weekStart, weekEnd, today, holidayTicket, breakTicket, weeklyHours}) → WeekProgress
├── calendar.js                  # MODIFY — updateWeekTotal() now also renders the target indicator when weeklyHours > 0
├── i18n.js                      # MODIFY — add EN+DE keys for indicator labels and tooltip
└── config.js                    # UNCHANGED — existing STORAGE_KEY_WEEKLY_HOURS reused

css/
└── style.css                    # MODIFY — `.week-target` rules for desktop + < 768 px breakpoint; `.week-target--success` and `.week-target--over` modifiers

tests/
├── unit/
│   └── week-target.test.js      # NEW — Vitest unit tests for computeWeekProgress (24+ cases including all edge cases from the spec)
└── ui/
    └── week-target.spec.js      # NEW — Playwright: indicator visibility, content, success state, hidden-when-unset, mobile, CRUD-reactivity
```

**Structure Decision**: Single-project static SPA (existing). The new logic is isolated in `js/week-target.js` so it can be unit-tested without DOM/FullCalendar dependencies. `js/calendar.js` only gains the rendering glue inside `updateWeekTotal()`.

## Phase 0 Output → research.md

Resolves the small number of touch-point questions needed before design:
1. Where the existing week total renders (`updateWeekTotal()` in `js/calendar.js`, called from `loadWeekEntries()` after each fetch and via `updateAllIndicators()`).
2. How `weeklyHours` is read (`readWeeklyHours()` from `js/settings.js`, key `redmine_calendar_weekly_hours`).
3. How holiday-ticket and break-ticket entries are currently identified (admin-managed `cfg.holidayTicket` / `cfg.breakTicket` from `config.json`; `js/calendar.js:53` shows the break-ticket pattern).
4. How "today" is determined consistently with the rest of the app (local-timezone day boundary; same as `splitMidnightEntries`).
5. Re-render trigger after entry CRUD: existing `loadWeekEntries()` → `updateWeekTotal()` chain already fires; the new indicator piggybacks on that.

## Phase 1 Output → data-model.md, quickstart.md, contracts/

- **data-model.md**: documents the `WeekProgress` derived value (booked, target, remaining, remainingWorkdays, isPastWeek, state). No persistent storage.
- **quickstart.md**: step-by-step UAT covering all 7 acceptance scenarios + the 7 edge cases. Doubles as the Playwright test plan.
- **contracts/**: directory is created empty with a README explaining "no external interfaces — pure UI feature".

## Open Questions

(Per user instruction: collect uncertainties here rather than asking interactively. None of these block planning, but each should be resolved during implementation or by reviewer feedback.)

1. **Holiday-ticket admin field availability** — **MUST BE RE-VERIFIED before implementation begins**: Today `js/config.js` exports `STORAGE_KEY_HOLIDAY_TICKET` but no source file appears to read it. Per user clarification, feature 026 (Code Cleanup & Simplification — currently `implement done · UAT pending`) may have changed how `cfg.holidayTicket` is plumbed. Before implementing 027, the implementer MUST re-survey the codebase post-026-merge state to confirm: (a) which path reads `cfg.holidayTicket` today, (b) whether the legacy `STORAGE_KEY_HOLIDAY_TICKET` is gone, (c) what name 026 settled on if any rename happened. Tracked as the first action in T018. Spec assumption ("Holiday/OOO entries treat the booked day as filled") is unchanged either way; only the *integration point* may shift.
2. **"Past day" boundary on the current day itself**: Spec says past-day workdays cannot be retroactively counted as remaining. Today is always treated as "remaining" if unfilled, even if the user's workday is over. This matches the spirit of FR-003 ("not in the past") and the UAT in quickstart.md will document the behaviour.
3. **Mobile compact layout**: SC-005 requires fitting on `< 768 px`. Plan A is to render the indicator on a single line as `16/40h · 24h left · 3d`; Plan B (fallback) is to drop the day-count on `< 480 px`. Implementation will adopt Plan A first and only fall back to Plan B if width testing shows overflow.

## Complexity Tracking

*No Constitution violations — no entries.*
