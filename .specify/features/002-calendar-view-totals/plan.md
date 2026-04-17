# Implementation Plan: Calendar View Options and Week Totals

**Branch**: `002-calendar-view-totals` | **Date**: 2026-04-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-calendar-view-totals/spec.md`

## Summary

Add a "Full week" pill switch to the calendar toolbar that toggles the visible day columns between Monday–Friday (default) and Monday–Sunday. Display a weekly total hours summary that is always visible without scrolling and updates automatically as entries are added, edited, or deleted.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)
**Primary Dependencies**: FullCalendar v6 (CDN) — `calendar.setOption('hiddenDays', […])` for dynamic day-column switching; `customButtons` for the toolbar switch (same pattern as feature 005)
**Storage**: `localStorage` — key `redmine_calendar_day_range` (string: `'workweek'` | `'full-week'`). Credentials remain in cookie (unchanged).
**Testing**: Manual acceptance checklist via `quickstart.md` (III. Test-First exception — personal single-user tool, no CI)
**Target Platform**: Modern desktop browser (Chrome, Firefox, Edge); served via `npx serve .`
**Project Type**: Static single-page web application
**Performance Goals**: Switch takes effect within 300 ms (Principle II — perceived rendering threshold)
**Constraints**: No new npm dependencies; no build step; must work with existing FullCalendar v6 CDN load
**Scale/Scope**: Single-user, local tool

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | ✅ Pass | No Redmine API changes; feature is purely client-side UI/localStorage |
| II. Calendar-First UX | ✅ Pass | Feature directly improves calendar usability; `hiddenDays` setOption is sub-300ms |
| III. Test-First | ✅ Pass (exception) | Personal single-user tool; Red-Green-Refactor replaced by `quickstart.md` checklist covering all FRs and acceptance scenarios |
| IV. Simplicity & YAGNI | ✅ Pass | Uses existing FullCalendar `hiddenDays` option; reuses feature 005 switch CSS; one new localStorage key only |
| V. Security by Default | ✅ Pass | No credentials in localStorage; day-range preference is non-sensitive UI state |

## Project Structure

### Documentation (this feature)

```text
specs/002-calendar-view-totals/
├── plan.md          ← this file
├── research.md      ← Phase 0 output
├── data-model.md    ← Phase 1 output
└── quickstart.md    ← Phase 1 output (manual acceptance checklist)
```

### Source Code Changes

```text
js/config.js        ← add STORAGE_KEY_DAY_RANGE constant
js/calendar.js      ← add initDayRangeToggle(); update headerToolbar.right; add week total
index.html          ← add #week-total element in .app-header
css/style.css       ← add #week-total display style (switch CSS already exists from feature 005)
```

No new files required. No new npm packages. No changes to `settings.js`, `redmine-api.js`, or `time-entry-form.js`.

### Key Implementation Details

**`js/config.js`** — one new exported constant:
```
STORAGE_KEY_DAY_RANGE = 'redmine_calendar_day_range'
```

**`js/calendar.js`** — two additions:
- `initDayRangeToggle(calendar)` — registers a `customButton` named `'fullWeekToggle'` in `headerToolbar.right` (to the right of `viewModeToggle`); after render, replaces button content with "Only show Mo–Fr" label + pill switch (switch is ON in workweek mode, OFF in full-week mode); click handler toggles `hiddenDays` between `[0, 6]` (workweek) and `[]` (full week) and updates switch state
- Week total: after events load, compute sum of all event hours and display in `#week-total`

**`index.html`** — new `#week-total` span in `.app-header`:
```html
<span id="week-total" class="week-total"></span>
```

**`css/style.css`** — styling for `.week-total`:
```css
.week-total { font-size: 0.85rem; color: var(--color-muted); font-weight: 500; }
```

**`headerToolbar.right`** — updated from feature 005's `'viewModeToggle'` to `'viewModeToggle fullWeekToggle'`

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| III. Test-First exception | No CI pipeline; single user; no shared contributors | Automated tests require test runner setup (Jest/Vitest) — adding a build toolchain violates Principle IV (YAGNI). The `quickstart.md` checklist covers all 7 FRs and 9 acceptance scenarios. |
