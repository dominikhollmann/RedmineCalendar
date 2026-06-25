# Quickstart / Validation Guide: Sensible First-Launch Defaults

**Feature**: 051-default-settings | **Date**: 2026-06-25

## Prerequisites

- Node.js ≥ 18 installed
- `npm install` completed
- Dev server available via `npm run dev`

## Unit-test validation (fastest)

```bash
npm test -- tests/unit/settings.test.js tests/unit/settings-extras.test.js
```

Expected: all tests pass. Key assertions:

- `readWorkingHours()` with absent key → `{start:'08:00', end:'18:00'}`
- `readWeeklyHours()` with absent key → `40`
- Corrupt working-hours value → factory default (not `null`)
- Stored valid values → unchanged (existing tests remain green)

## UI-test validation

```bash
npm run test:ui -- --grep "default settings"
```

Or run the full suite:

```bash
npm run test:ui
```

## Manual validation scenarios (clean browser profile)

Use an incognito window or clear `localStorage` via DevTools > Application > Storage > Clear site data.

- [ ] Open the app with no localStorage keys set. Verify the Planning View is shown (not the calendar). (FR-001, SC-001)
- [ ] Switch to the calendar view. Verify only Mon–Fri columns are visible and the time band is 08:00–18:00. (FR-002, FR-003)
- [ ] Open Settings with no localStorage keys set. Verify: "Only working hours" toggle is ON, "Monday–Friday" toggle is ON, "Dark mode" toggle is OFF, "Fast mode" toggle is ON. (FR-010, SC-002)
- [ ] Open Settings. Verify the working-hours fields show 08:00 and 18:00. Verify the weekly-hours field shows 40. (FR-006, FR-007, SC-005)
- [ ] Open Settings. Verify both planning-source checkboxes (Outlook and Teams) are checked. (FR-008, FR-009)
- [ ] Seed `localStorage.setItem('redmine_calendar_active_view', 'calendar')` and reload. Verify the calendar view is shown — stored preference respected. (US2 AC4)
- [ ] Seed `localStorage.setItem('redmine_calendar_planning_source_teams', '0')` and reload. Open Planning View. Verify the Teams column is hidden. (US2 AC3)
- [ ] Seed `localStorage.setItem('redmine_calendar_working_hours', JSON.stringify({start:'09:00',end:'17:00'}))` and reload. Verify the calendar shows 09:00–17:00 (not the default 08:00–18:00). (US2 AC1)
- [ ] Change the "Monday–Friday" toggle to OFF in Settings and save. Reload. Verify all 7 days are visible and `redmine_calendar_day_range = 'full-week'` is in localStorage. (US3 AC1)
- [ ] Verify `npm run test:coverage` passes with per-file ≥95% line threshold. (SC-003)
- [ ] Verify `npm run sqi` reports GREEN (≥ 80 composite). (Constitution VI)

## Rollback check

If a regression is introduced, the change is isolated to 3 files with ≤ 6 changed lines each. Reverting to the previous commit restores all original behaviour.
