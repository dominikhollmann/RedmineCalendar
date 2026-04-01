# Implementation Plan: Configurable Working Hours and Calendar View Toggle

**Branch**: `005-working-hours-view` | **Date**: 2026-04-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-working-hours-view/spec.md`

## Summary

Allow the user to configure a working-day start and end time in the settings page. The calendar defaults to showing the full 24-hour view when no working hours are set, and to the configured working hours range once they are saved. A toggle button in the calendar header switches between the working hours view and the full 24-hour view at any time. All preferences are persisted in `localStorage` and survive page reloads.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)
**Primary Dependencies**: FullCalendar v6 (CDN) — `calendar.setOption('slotMinTime', …)` / `setOption('slotMaxTime', …)` for dynamic range switching; `customButtons` for the toolbar toggle
**Storage**: `localStorage` — keys `redmine_calendar_working_hours` (JSON) and `redmine_calendar_view_mode` (string). Credentials remain in cookie (unchanged).
**Testing**: Manual acceptance checklist via `quickstart.md` (III. Test-First exception — personal single-user tool, no CI)
**Target Platform**: Modern desktop browser (Chrome, Firefox, Edge); served via `npx serve .`
**Project Type**: Static single-page web application
**Performance Goals**: Toggle takes effect within 300 ms (Principle II — perceived rendering threshold)
**Constraints**: No new npm dependencies; no build step; must work with existing FullCalendar v6 CDN load
**Scale/Scope**: Single-user, local tool

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | ✅ Pass | No Redmine API changes; feature is purely client-side UI/localStorage |
| II. Calendar-First UX | ✅ Pass | Feature directly improves calendar usability; toggle uses `setOption()` for sub-300ms response |
| III. Test-First | ✅ Pass (exception) | Personal single-user tool; Red-Green-Refactor replaced by `quickstart.md` checklist covering all FRs and acceptance scenarios — see Complexity Tracking |
| IV. Simplicity & YAGNI | ✅ Pass | No new dependencies; uses existing FullCalendar APIs and native localStorage; two new localStorage keys only |
| V. Security by Default | ✅ Pass | No credentials stored in localStorage; working hours are non-sensitive UI preferences. Cookie exception not applicable here (no credentials). |

## Project Structure

### Documentation (this feature)

```text
specs/005-working-hours-view/
├── plan.md          ← this file
├── research.md      ← Phase 0 output
├── data-model.md    ← Phase 1 output
├── quickstart.md    ← Phase 1 output (manual acceptance checklist)
└── tasks.md         ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code Changes

```text
js/config.js            ← add STORAGE_KEY_WORKING_HOURS, STORAGE_KEY_VIEW_MODE constants
js/settings.js          ← add readWorkingHours(), writeWorkingHours(); wire up form fields
js/calendar.js          ← add getEffectiveTimeRange(), initViewModeToggle(); use dynamic slotMin/MaxTime
settings.html           ← add working hours start/end time inputs to the settings form
css/style.css           ← add disabled-toggle style (greyed out when unconfigured)
```

No new files required. No new npm packages. No changes to `redmine-api.js` or `time-entry-form.js`.

### Key Implementation Details

**`js/config.js`** — two new exported constants:
```
STORAGE_KEY_WORKING_HOURS = 'redmine_calendar_working_hours'
STORAGE_KEY_VIEW_MODE     = 'redmine_calendar_view_mode'
```

**`js/settings.js`** — two new helper functions:
- `readWorkingHours()` → `{ start: 'HH:MM', end: 'HH:MM' } | null`
- `writeWorkingHours(start, end)` → writes JSON to localStorage
- Settings form wiring: two `<input type="time">` fields, validation (end > start), save on submit

**`js/calendar.js`** — two additions:
- `getEffectiveTimeRange()` → reads `readWorkingHours()` and `viewMode` from localStorage; returns `{ slotMinTime, slotMaxTime }` per the rules in data-model.md
- `initViewModeToggle(calendar)` → registers a FullCalendar `customButton` in `headerToolbar.right`; on click: toggles localStorage view mode, calls `calendar.setOption()` twice, updates button label; disables button if no working hours configured

**`settings.html`** — new section below the existing auth fields:
```html
<label>Working hours</label>
<div class="modal-row">
  <div>
    <label for="workStart">Start</label>
    <input type="time" id="workStart" />
  </div>
  <div>
    <label for="workEnd">End</label>
    <input type="time" id="workEnd" />
  </div>
</div>
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| III. Test-First exception | No CI pipeline; single user; no shared contributors | Automated tests require test runner setup (Jest/Vitest) — adding a build toolchain violates Principle IV (YAGNI). The `quickstart.md` checklist covers all 12 acceptance scenarios and all 10 FRs. |
