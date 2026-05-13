# Data Model: ArbZG Compliance Warnings

## Entity: Compliance Warning

A computed advisory object derived from the user's time entries for a given day or
week. Not persisted — recomputed on every calendar render.

| Field      | Type    | Description                                                                                                            |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| rule       | string  | Identifier: `DAILY_LIMIT`, `WEEKLY_LIMIT`, `REST_PERIOD`, `SUNDAY`, `HOLIDAY`, `BREAK_INSUFFICIENT`, `CONTINUOUS_WORK` |
| observed   | number  | Measured value (hours worked, rest gap hours, break minutes taken)                                                     |
| allowed    | number  | Permitted threshold per ArbZG (hours or minutes depending on rule)                                                     |
| messageKey | string  | i18n key, e.g. `arbzg.daily_limit`                                                                                     |
| name       | string? | Holiday name (only present for `HOLIDAY` warnings)                                                                     |

## Global State Shape: `window._calendarArbzgWarnings`

```javascript
{
  // Keyed by 'YYYY-MM-DD'; value is array to allow multiple violations per day
  daily: {
    '2026-04-14': [{ rule: 'DAILY_LIMIT', observed: 11.5, allowed: 10, messageKey: 'arbzg.daily_limit' }],
  },

  // Array; empty ([]) when no weekly violation
  weekly: [
    { rule: 'WEEKLY_LIMIT', observed: 52, allowed: 48, messageKey: 'arbzg.weekly_limit' },
  ],

  // Keyed by 'YYYY-MM-DD'; single warning per day (earliest-entry-of-day used as boundary)
  restPeriod: {
    '2026-04-15': { rule: 'REST_PERIOD', observed: 9.5, allowed: 11, messageKey: 'arbzg.rest_period' },
  },

  // Array of 'YYYY-MM-DD' strings for days with Sunday entries
  sunday: ['2026-04-19'],

  // Keyed by 'YYYY-MM-DD'; value is holiday name string
  holiday: { '2026-04-18': 'Karfreitag' },

  // Keyed by 'YYYY-MM-DD'; array — may contain BREAK_INSUFFICIENT and/or CONTINUOUS_WORK
  // Only present when start times are available and at least one sub-check fires
  // BREAK_INSUFFICIENT: observed/required in minutes
  // CONTINUOUS_WORK: observed/allowed in hours
  breaks: {
    '2026-04-14': [
      { rule: 'BREAK_INSUFFICIENT', observed: 20,  required: 30, messageKey: 'arbzg.break' },
      { rule: 'CONTINUOUS_WORK',    observed: 7.5, allowed:  6,  messageKey: 'arbzg.break_continuous' },
    ],
  },
}
```

## Input Shape (from calendar events)

The `computeArbzgWarnings` function receives an array of entry objects extracted from
FullCalendar events via `ev.extendedProps`:

| Field     | Type    | Source                                                                     |
| --------- | ------- | -------------------------------------------------------------------------- |
| date      | string  | `'YYYY-MM-DD'` — calendar event date                                       |
| hours     | number  | Hours logged for this entry                                                |
| startTime | string? | `'HH:MM'` (24h) if available via Easy Redmine field or `[start:HH:MM]` tag |

## Validation Rules

- **Daily limit** (FR-001): sum of `hours` for a date > 10 → `DAILY_LIMIT` warning
- **Weekly limit** (FR-002): sum of all `hours` for the week > 48 → `WEEKLY_LIMIT` warning
- **Rest period** (FR-003): only when `startTime` present; gap between last entry of day N and first entry of day N+1 < 11 h → `REST_PERIOD` warning on day N+1
- **Sunday** (edge case): entry `date` falls on a Sunday → add date to `sunday` array
- **Holiday** (edge case): entry `date` matches a German federal holiday → add to `holiday` map
- **Break duration** (FR-009): only when `startTime` present; `break_min = (last_end_min − first_start_min) − sum(hours × 60)`; if total hours >9 and break_min <45, or total hours >6 and break_min <30 → `BREAK_INSUFFICIENT` warning
- **Continuous work** (FR-009): only when `startTime` present; sort entries by start time, merge overlapping/adjacent entries into continuous spans, find longest span; if longest span > 6 h → `CONTINUOUS_WORK` warning

## Lifecycle / State Transitions

```
Week loads → updateDayTotals() runs →
  computeArbzgWarnings(entries, year) →
  window._calendarArbzgWarnings updated →
  calendar.render() →
  dayHeaderContent renders badges →
  User hovers/clicks badge → tooltip shown →
  User closes tooltip or moves away → tooltip hidden
```

Warnings are cleared and recomputed on every call to `updateDayTotals()` (triggered
by week navigation, entry save, entry delete, entry edit).
