# Phase 1 Data Model: Code Cleanup & Simplification

**Feature**: 026 | **Date**: 2026-05-08

This feature removes code paths, not entities. The only data-model change is a tightening of an existing invariant.

---

## TimeEntry — invariant tightening

Before this feature, the in-memory `TimeEntry` shape (returned by `mapTimeEntry`, consumed by `calendar.js`, `time-entry-form.js`, `outlook.js`) tolerated `startTime: null` and `endTime: null` in many code paths. After this feature:

| Field | Before | After |
|-------|--------|-------|
| `startTime` | `string \| null` (`HH:MM` or null) | `string` (`HH:MM`, always populated) |
| `endTime`   | `string \| null` (`HH:MM` or null) | `string` (`HH:MM`, always populated) |
| `hours`     | `number` (≥ 0) | `number` (≥ 0) — unchanged |

**How the invariant is enforced**:

- `createTimeEntry` and `updateTimeEntry` already require `startTime` (non-null) at the API boundary; the post-feature-025 fallback in those functions populates `endTime` from `endTime ?? calcEndTime(startTime, hours)` when the Redmine response omits `easy_time_to`. So entries returned from the API always have both.
- `fetchTimeEntries` filters rows missing `id` / `hours` / `spent_on`; combined with the API-level requirement, it's not possible for a `null`-time entry to enter the in-memory state.
- The modal's `doSave` requires both start and end before allowing save (validators at `js/time-entry-form.js`).

**Removed branches** (now unreachable per the tightened invariant):

- `if (!entry.startTime)` guards in `js/calendar.js` (lines 55, 185, 216, 250, 376, 388)
- `if (!entry.startTime)` in `js/outlook.js:309` (overlap detection)
- `endTime ?? addMinutes(startTime, hours)` fallback in `js/time-entry-form.js:244`
- `'no-start-time'` className path + corresponding CSS rule

**Migration**: None. No persistent storage changes; the invariant was already true at runtime, just defensively unenforced.

---

## Other entities

No changes to:

- `CalendarEventProposal` (feature 025's Outlook proposal shape)
- `Issue` (Redmine search result)
- `Project`, `Activity` — unchanged
- localStorage keys — `redmine_calendar_holiday_ticket` migration code is removed but the key was already obsolete (feature 025 removed its writers)
