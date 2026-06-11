# Contract: Storage Keys

**Branch**: `038-planning-view`  
**Date**: 2026-06-08

---

## New localStorage Keys

| Key                                        | Constant                              | Values                              | Default | Feature                              |
| ------------------------------------------ | ------------------------------------- | ----------------------------------- | ------- | ------------------------------------ |
| `redmine_calendar_planning_source_outlook` | `STORAGE_KEY_PLANNING_SOURCE_OUTLOOK` | `'1'` (enabled) \| `'0'` (disabled) | `'1'`   | FR-013: Outlook source column toggle |

---

## Existing Keys Used (read-only by Planning View)

| Key                              | Constant                    | Used for                                         |
| -------------------------------- | --------------------------- | ------------------------------------------------ |
| `redmine_calendar_view_mode`     | `STORAGE_KEY_VIEW_MODE`     | Slot min/max time for Bookings column (FR-017)   |
| `redmine_calendar_day_range`     | `STORAGE_KEY_DAY_RANGE`     | Mo–Fr toggle for day navigation (FR-018)         |
| `redmine_calendar_working_hours` | `STORAGE_KEY_WORKING_HOURS` | Work-start anchor for all-day event booking time |
| `redmine_calendar_weekly_hours`  | `STORAGE_KEY_WEEKLY_HOURS`  | Daily hours for `parseCalendarProposals`         |

---

## No New IndexedDB or sessionStorage Usage

The Planning View uses no new persistent storage beyond the single `localStorage` key above.
Classification state, selection state, and coverage greyout are all in-memory and recomputed on
each render.
