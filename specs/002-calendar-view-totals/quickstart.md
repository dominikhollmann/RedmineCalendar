# Quickstart & Acceptance Checklist: Calendar View Options and Week Totals

## Prerequisites

- App is running (`npx serve .`) and CORS proxy is running (`npm run proxy`).
- You are logged in (settings page has valid URL + credentials).
- At least two time entries exist in the current week in Redmine.

---

## User Story 1: Switch Between Workweek and Full-Week View

**Setup**: Open `index.html`. Ensure `localStorage` key `redmine_calendar_day_range` is absent or set to `'workweek'`.

- [x] **FR-002 / default** — The calendar loads showing Monday–Friday columns only (5 days visible).
- [x] **FR-001** — A "Only show Mo–Fr" switch is visible in the calendar toolbar. The switch is in the on (blue) position when workweek is active.
- [x] **FR-001 / FR-007 / SC-001** — Click the "Only show Mo–Fr" switch. Verify Saturday and Sunday columns appear within 300 ms, without a page reload.
- [x] **FR-001** — The switch moves to the off (grey) position when full-week view is active.
- [x] **FR-001 / SC-001** — Click the switch again. Verify Saturday and Sunday columns disappear and only Mo–Fr are shown. Switch returns to on (blue).
- [x] **FR-003 / SC-002** — While in full-week view, reload the page. Verify the calendar restores to full-week view (7 days visible) without user action.
- [x] **US1 Scenario 4** — With a time entry on a Saturday: in Mo–Fr view, confirm the Saturday entry is not visible in the grid. Toggle to full-week and confirm the entry is visible. Toggle back and confirm it is hidden again (entry still exists in Redmine — no data deleted).
- [x] **US1 Scenario 3** — Switch to full-week view, navigate to a different week and back. Confirm full-week mode is retained throughout.

---

## User Story 2: Week Total Hours Display

**Setup**: At least two time entries exist in the current week.

- [x] **FR-004 / SC-003** — A weekly total (e.g. "12.5 h") is visible in the page header without scrolling.
- [x] **FR-004 / SC-004** — Verify the displayed total matches the arithmetic sum of all time entries for the week.
- [x] **FR-005** — Add a new time entry. Verify the weekly total increases by the added hours.
- [x] **FR-005** — Delete a time entry. Verify the weekly total decreases accordingly.
- [x] **FR-006** — Navigate to a different week. Verify the weekly total updates to reflect only that week's entries.
- [x] **US2 Scenario 5** — Navigate to a week with no entries. Verify the weekly total shows "0 h" (or equivalent empty state).

---

## Edge Case Checks

- [x] **Edge case — high total** — If possible, verify the weekly total displays correctly for large values (e.g., 50+ hours) without truncation.
- [x] **Edge case — full week, weekday entries only** — In full-week view with no weekend entries, Saturday/Sunday columns are visible but empty. No error.
- [x] **Edge case — week total in Mo–Fr view** — Confirm the week total reflects ALL entries for the Mon–Sun range, not just visible Mo–Fr entries. (Weekend entries, if any, are counted even when hidden.)

---

## Completion Criteria

All checkboxes above must be ticked before this feature is considered complete.
