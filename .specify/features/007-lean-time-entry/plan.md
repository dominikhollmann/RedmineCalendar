# Implementation Plan: Super Lean Time Entry UX

**Branch**: `007-lean-time-entry` | **Date**: 2026-04-12 | **Spec**: [spec.md](spec.md)

## Summary

Replace the existing time entry modal with a minimal keyboard-first form: calendar drag → ticket search → Enter → saved. No comment, no activity field (default activity auto-selected). Favourites and last-used ticket lists shown when search field is empty. Fully rewrites `js/time-entry-form.js`; no other files change.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)  
**Primary Dependencies**: FullCalendar v6 (CDN) — unchanged; no new dependencies  
**Storage**: `localStorage` — keys `redmine_calendar_favourites`, `redmine_calendar_last_used`  
**Testing**: Manual acceptance checklist (`quickstart.md`) — see Constitution Check  
**Target Platform**: Modern desktop browsers (Chrome, Firefox, Safari)  
**Project Type**: Static web application (single-page, no build step)  
**Performance Goals**: Form visible < 300 ms after calendar drag; search results < 1 s  
**Constraints**: No build step, no bundler, vanilla ES2022 modules  
**Scale/Scope**: Single user, local deployment  

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | ✅ Pass | Uses existing `searchIssues()`, `createTimeEntry()`, `getTimeEntryActivities()` — no DB access, credentials unchanged |
| II. Calendar-First UX | ✅ Pass | Entry initiated from calendar drag; form is subordinate. 300 ms render goal maintained. Mobile deferred (spec Assumptions). |
| III. Test-First | ⚠️ Exception | Personal single-user tool, no CI pipeline. Using manual acceptance checklist per constitution exception. See Complexity Tracking. |
| IV. Simplicity & YAGNI | ✅ Pass | One file rewritten, no new files, no new dependencies |
| V. Security by Default | ✅ Pass | API key remains in SameSite=Strict cookie (existing pattern). Issue titles escaped via `textContent` assignment. |

## Project Structure

### Documentation (this feature)

```text
specs/007-lean-time-entry/
├── plan.md          ✅ this file
├── research.md      ✅ generated
├── data-model.md    ✅ generated
├── quickstart.md    ✅ generated
└── tasks.md         ⬜ /speckit.tasks
```

### Source Code

```text
js/
├── time-entry-form.js   ← full rewrite (same export signature)
├── calendar.js          ← no changes needed
├── redmine-api.js       ← no changes needed
├── settings.js          ← no changes needed
└── config.js            ← no changes needed

css/
└── style.css            ← lean form styles added
```

**Structure Decision**: Single-project, existing flat JS module structure. No new files beyond CSS additions.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Test-First exception (Constitution III) | No CI pipeline; personal single-user tool | Manual checklist in `quickstart.md` covers all FR and acceptance scenarios as required by the exception conditions |
