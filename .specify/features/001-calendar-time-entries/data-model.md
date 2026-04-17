# Data Model: Weekly Calendar Time Tracking

**Branch**: `001-calendar-time-entries` | **Date**: 2026-03-31

All entities below are in-memory JavaScript objects. There is no local database.
Redmine is the source of truth; the app reads from and writes to Redmine via REST API.
The only local persistence is the browser cookie storing the user's configuration.

---

## Entity: Config

Persisted as a browser cookie (`redmine_calendar_config`). Set once via the settings screen.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `redmineUrl` | string | Required, valid URL, no trailing slash | Base URL of the Redmine instance (via proxy: `http://localhost:8010`) |
| `apiKey` | string | Required, non-empty | Redmine API key for the authenticated user |

**Lifecycle**: Created on first-run settings screen. User can update via settings icon
in calendar view. Deleted only if user manually clears cookies.

**Validation**: Before any API call, the app MUST verify that both fields are non-empty
and that `redmineUrl` is a parseable URL.

---

## Entity: TimeEntry

Represents a single logged work period. Constructed from a Redmine API response plus
the start-time metadata extracted from the comment field.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | number | Required, unique (Redmine ID) | Redmine time entry ID; `null` for unsaved entries |
| `date` | string | Required, `YYYY-MM-DD` | Calendar date of the entry |
| `startTime` | string\|null | `HH:MM` (24h) or `null` | Parsed from `[start:HH:MM]` tag in comment; `null` if tag absent |
| `hours` | number | Required, > 0 | Duration in decimal hours (e.g., `1.5` = 1h 30m) |
| `issueId` | number | Required | Redmine issue ID |
| `issueSubject` | string | Required | Issue title, fetched with the entry or from search cache |
| `projectName` | string | Optional | Project name of the issue |
| `activityId` | number | Required | Redmine time entry activity ID |
| `activityName` | string | Required | Human-readable activity label |
| `comment` | string | Optional | Comment text with `[start:HH:MM]` tag **stripped** |
| `_rawComment` | string | Internal | Original comment as stored in Redmine (with tag) |

**Derived values** (computed, not stored):
- `endTime`: `startTime` + `hours` converted to `HH:MM`
- `durationMinutes`: `hours * 60` rounded to nearest 15
- `hasStartTime`: `startTime !== null`

**Start-time tag rules**:
- On **read**: parse `/\[start:(\d{2}:\d{2})\]$/` from raw comment → populate `startTime`;
  strip tag → populate `comment`.
- On **write**: strip any existing tag from `comment`, then append ` [start:HH:MM]` before
  sending to Redmine API.
- Entries without tag: `startTime = null`; displayed at top of their day column with a
  "?" badge.

**State transitions**:

```
[new / unsaved]
     │ user submits form
     ▼
[saved] ──── user edits + saves ──▶ [saved] (updated)
     │
     │ user deletes + confirms
     ▼
[deleted] (removed from calendar, gone from Redmine)
```

---

## Entity: Issue

Lightweight representation used for search results and display in the time entry form.
Not persisted locally beyond the current session.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | number | Required, unique | Redmine issue ID |
| `subject` | string | Required | Issue title |
| `projectName` | string | Required | Parent project name |
| `status` | string | Optional | e.g., "Open", "Closed" — shown in search results |

**Search behaviour**: Results are fetched live from Redmine when the user types ≥ 2 characters.
Results are scoped to issues accessible by the authenticated user. Cache: last 25 results held
in memory for the form's lifetime; cache is discarded when form closes.

---

## Entity: Activity

Represents a Redmine time entry activity type (e.g., Development, Meeting).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | number | Required, unique | Redmine enumeration ID |
| `name` | string | Required | Display name |
| `isDefault` | boolean | Optional | Whether Redmine marks this as the default activity |

**Lifecycle**: Fetched once at app startup from
`GET /enumerations/time_entry_activities.json`. Cached for the session.
Ordering: display as returned by Redmine API (Redmine orders by position).

---

## Entity: WeekView

Represents the currently displayed week. Computed from the user's navigation; not persisted.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `startDate` | string | `YYYY-MM-DD`, Monday | First day of the displayed week |
| `endDate` | string | `YYYY-MM-DD`, Sunday | Last day of the displayed week |
| `entries` | TimeEntry[] | — | All time entries fetched for this week |
| `dailyTotals` | object | `{ "YYYY-MM-DD": number }` | Hours sum per day, displayed in column headers |

**Navigation rules**:
- "Previous week": `startDate -= 7 days`
- "Next week": `startDate += 7 days`
- "Today": `startDate = Monday of current week`
- On navigation: re-fetch entries from Redmine for new date range; replace `entries` array.

---

## Relationships

```
Config ──(1:1)──▶ session context (one user, one Redmine instance)

WeekView ──(1:N)──▶ TimeEntry
TimeEntry ──(N:1)──▶ Issue      (by issueId; subject cached in TimeEntry.issueSubject)
TimeEntry ──(N:1)──▶ Activity   (by activityId; name cached in TimeEntry.activityName)
Activity[]  ──  loaded once at startup, referenced by id in form dropdowns
```

---

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| TimeEntry | `hours` | Must be > 0 and ≤ 24 |
| TimeEntry | `hours` | Rounded to nearest 0.25 (15 min) on save |
| TimeEntry | `startTime` | If provided, must be valid `HH:MM` (00:00–23:45) |
| TimeEntry | `issueId` | Must correspond to a valid, accessible Redmine issue |
| TimeEntry | `activityId` | Must be a value from the loaded Activity list |
| Config | `redmineUrl` | Must be a parseable absolute URL |
| Config | `apiKey` | Must be non-empty string |
