# Data Model: Calendar View Options and Week Totals

**Feature**: `002-calendar-view-totals` | **Date**: 2026-04-01

## Entities

### DayRangeState

Controls which day columns are visible in the calendar. Stored as a plain string in `localStorage` under the key `redmine_calendar_day_range`.

| Field | Type | Values | Default |
|-------|------|--------|---------|
| value | string | `'workweek'` \| `'full-week'` | `'workweek'` (absent key = workweek) |

**Lifecycle**:
- Absent / null → default workweek (`hiddenDays: [0, 6]`)
- `'workweek'` → Saturday and Sunday hidden (`hiddenDays: [0, 6]`)
- `'full-week'` → all days visible (`hiddenDays: []`)

**Written by**: `initDayRangeToggle()` click handler in `js/calendar.js`
**Read by**: `initDayRangeToggle()` on page load in `js/calendar.js`

---

### WeekTotal

A computed, ephemeral value — never stored. Derived from the FullCalendar event set currently loaded for the displayed week.

| Field | Type | Notes |
|-------|------|-------|
| value | number | Sum of `ev.extendedProps.timeEntry.hours` for all events in the current view |
| displayStr | string | Formatted as `"8.5 h"` or `"0 h"` |

**Computed by**: `updateWeekTotal(events)` in `js/calendar.js`
**Displayed in**: `#week-total` span in `.app-header` (index.html)
**Updated when**: events loaded, entry added, entry edited, entry deleted

---

## localStorage Layout

```
localStorage
└── redmine_calendar_day_range   →  string: "workweek" | "full-week"
```

Note: `redmine_calendar_working_hours` and `redmine_calendar_view_mode` (feature 005) are independent keys — no overlap.
