# Data Model: Long Outlook Event Expansion (050)

## Entities

### PlanningEvent _(existing — Graph API, read-only)_

| Field         | Type      | Description                                       |
| ------------- | --------- | ------------------------------------------------- |
| `subject`     | `string`  | Event title (may contain `#ticketId`)             |
| `start`       | `string`  | ISO 8601 date-time (e.g. `"2026-06-23T00:00:00"`) |
| `end`         | `string`  | ISO 8601 date-time (e.g. `"2026-07-04T23:59:59"`) |
| `isAllDay`    | `boolean` | True for all-day / multi-day events               |
| `sensitivity` | `string`  | `"normal"` \| `"private"`                         |
| `showAs`      | `string`  | `"busy"` \| `"oof"` \| `"free"` …                 |

No new fields added. The existing shape carries the full event range — `start` / `end` span the entire holiday / training period, not just the single planning-view day.

---

### CalendarProposal _(existing — `js/outlook.js`)_

| Field       | Type                           | Description                                       |
| ----------- | ------------------------------ | ------------------------------------------------- |
| `subject`   | `string`                       | Display title                                     |
| `startTime` | `string`                       | HH:MM (single-day anchor)                         |
| `endTime`   | `string`                       | HH:MM                                             |
| `hours`     | `number`                       | `weeklyHours / 5` for all-day events              |
| `ticketId`  | `number \| null`               | Redmine issue ID (null → needs-ticket)            |
| `isAllDay`  | `boolean`                      |                                                   |
| `status`    | `'proposed' \| 'needs-ticket'` |                                                   |
| `category`  | `string`                       | `'holiday'` \| `'vacation'` \| `'allday-other'` … |

No structural change. `hours` already uses `weeklyHours / 5` (DRY — `outlook.js:575`).

---

### PlanningEvent _(existing — `js/planning-view-column-base.js`)_

| Field              | Type               | Description                                                   |
| ------------------ | ------------------ | ------------------------------------------------------------- |
| `id`               | `string`           | Unique render ID                                              |
| `proposal`         | `CalendarProposal` |                                                               |
| `planningCategory` | `string`           | `'bookable'` \| `'needs-ticket'` \| `'break'` \| `'excluded'` |
| `rawEvent`         | `PlanningEvent`    | Original Graph event — carries full multi-day `start`/`end`   |
| `displayStartTime` | `string`           | HH:MM for FC rendering                                        |
| `displayEndTime`   | `string`           | HH:MM for FC rendering                                        |
| `isCovered`        | `boolean`          | True if already booked                                        |

No structural change. `rawEvent` already carries the multi-day date range — the expansion logic reads `rawEvent.start.slice(0,10)` and `rawEvent.end.slice(0,10)`.

---

### BulkAddAction _(NEW — undo stack entry)_

Stored in the undo stack when a multi-day Outlook drop creates N entries.

| Field     | Type          | Description                                                            |
| --------- | ------------- | ---------------------------------------------------------------------- |
| `type`    | `'bulk-add'`  | Action type constant (`ACTION_BULK_ADD`)                               |
| `entries` | `TimeEntry[]` | All N successfully created Redmine entries (with their assigned `id`s) |

**Validation rules**:

- `entries.length ≥ 1` (zero-entry drops never push to undo)
- Each entry must carry a valid `id` (returned by `createTimeEntry`) and `spentOn`

**State transitions**:

```
created (N entries in Redmine)
  → undo → deleted (all N removed via deleteTimeEntry in parallel)
  → redo → recreated (all N via createTimeEntry in parallel)
```

---

### WeeklyHours _(existing — `localStorage`, `js/working-hours.js`)_

| Key                             | Value                        |
| ------------------------------- | ---------------------------- |
| `redmine_calendar_weekly_hours` | numeric string (e.g. `"40"`) |

No new storage. `dailyHours = weeklyHours / 5` is computed at runtime from the existing value.

---

## Relationships

```
PlanningEvent (Graph)
  └─► parsed into CalendarProposal (outlook.js::parseCalendarProposals)
        └─► wrapped into PlanningEvent (planning-view-column-base.js::buildPlanningEvents)
              └─► multi-day? yes → expandToWeekdays() → N date strings
                    └─► N createTimeEntry() calls → N TimeEntry (Redmine)
                          └─► pushed as single BulkAddAction onto undo stack
```
