# Data Model: Sensible First-Launch Defaults

**Feature**: 051-default-settings | **Date**: 2026-06-25

## Key Entities

### UserPreference

A single named setting stored per-browser in localStorage.

| Attribute | Type | Stored-value domain | Absent-key effective default |
|-----------|------|---------------------|------------------------------|
| `redmine_calendar_active_view` | string | `'planning'` \| `'calendar'` | `'planning'` (FR-001) |
| `redmine_calendar_view_mode` | string | `'working'` \| `'24h'` | `'working'` (FR-002) |
| `redmine_calendar_day_range` | string | `'workweek'` \| `'full-week'` | `'workweek'` (FR-003) |
| `redmine_calendar_theme` | string | `'light'` \| `'dark'` | `'light'` (FR-004, no code change) |
| `redmine_calendar_fast_mode` | string | `'true'` \| `'false'` | `'true'`/enabled (FR-005, no code change) |
| `redmine_calendar_working_hours` | JSON string | `{"start":"HH:MM","end":"HH:MM"}` | `{start:'08:00',end:'18:00'}` (FR-006) |
| `redmine_calendar_weekly_hours` | string (number) | numeric string > 0 | `40` (FR-007) |
| `redmine_calendar_planning_source_teams` | string | `'1'` \| `'0'` | `'1'`/active (FR-008) |
| `redmine_calendar_planning_source_outlook` | string | `'1'` \| `'0'` | `'1'`/active (FR-009, no code change) |

### EffectiveDefault

The value applied at runtime when no stored preference exists. All defaults in this feature are **hard-coded in application source code** — no admin-configurable override.

## State Transitions

```
ABSENT KEY → read function → effective default value
STORED KEY → read function → stored value (unchanged)
CORRUPT KEY → read function → effective default (working-hours) OR null (weekly-hours)
```

The key is written only when the user explicitly saves Settings. This feature adds no new write paths.

## Validation Rules

- `readWorkingHours()`: valid stored value requires both `start` and `end` string fields in the parsed JSON; anything else → return factory default
- `readWeeklyHours()`: valid stored value must parse to a finite number > 0; anything else (including absent key) → absent key → return `40`; invalid present key → return `null`
- Active-view: absent → `'planning'`; stored `'calendar'` → `'calendar'`; any other stored value → treat as planning
- Teams source: absent → active; stored `'0'` → inactive; any other stored value → active
