# Contract: Redmine REST API Endpoints

**Branch**: `001-calendar-time-entries` | **Date**: 2026-03-31

This document defines the Redmine REST API endpoints consumed by the calendar app.
All requests are routed through the local CORS proxy (`http://localhost:8010`).
Authentication is via the `X-Redmine-API-Key` HTTP header on every request.

Base URL (via proxy): `http://localhost:8010`
Upstream Redmine: configured in `Config.redmineUrl`

---

## Authentication Header (all requests)

```
X-Redmine-API-Key: <apiKey from cookie>
Content-Type: application/json   (POST / PUT only)
```

---

## 1. Verify Authentication & Get Current User

**Purpose**: Validate the stored API key and retrieve the current user's ID.
Called once on app load (after settings are present).

```
GET /users/current.json
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": 42,
    "login": "jdoe",
    "firstname": "John",
    "lastname": "Doe"
  }
}
```

**Error cases**:
- `401 Unauthorized` → API key invalid; redirect user to settings screen.

---

## 2. Fetch Time Entries for a Week

**Purpose**: Load all time entries for the authenticated user within a date range.

```
GET /time_entries.json?user_id=me&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=100
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| `user_id` | `me` | Scoped to the authenticated user |
| `from` | `YYYY-MM-DD` | Monday of the displayed week (inclusive) |
| `to` | `YYYY-MM-DD` | Sunday of the displayed week (inclusive) |
| `limit` | `100` | Max entries; a typical week has < 50 |

**Response (200 OK)**:
```json
{
  "time_entries": [
    {
      "id": 1234,
      "project": { "id": 5, "name": "My Project" },
      "issue": { "id": 99 },
      "user": { "id": 42, "name": "John Doe" },
      "activity": { "id": 8, "name": "Development" },
      "hours": 1.5,
      "comments": "Working on refactor [start:09:00]",
      "spent_on": "2026-03-31"
    }
  ],
  "total_count": 1,
  "offset": 0,
  "limit": 100
}
```

**Notes**:
- `issue.id` is present but `issue` object may lack `subject`; app must resolve issue
  subject separately or cache from prior searches.
- `comments` field contains the raw comment including the `[start:HH:MM]` tag.

**Error cases**:
- `401` → re-authenticate.
- Network failure → show error banner; display empty calendar (do not crash).

---

## 3. Get Issue Subject (by ID)

**Purpose**: Resolve issue subject for display in calendar event blocks.
Called when `issue.subject` is absent in a time entry response.

```
GET /issues/{issue_id}.json
```

**Response (200 OK)**:
```json
{
  "issue": {
    "id": 99,
    "subject": "Fix login bug",
    "project": { "id": 5, "name": "My Project" },
    "status": { "id": 1, "name": "Open" }
  }
}
```

**Error cases**:
- `404` → issue no longer exists or user lacks access; display entry with `"Issue #99"` fallback.
- Cache resolved subjects in memory for the session to avoid duplicate requests.

---

## 4. Search Issues

**Purpose**: Populate the ticket search dropdown in the time entry form.

```
GET /issues.json?subject=~{searchTerm}&status_id=open&limit=25&sort=updated_on:desc
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| `subject` | `~searchTerm` | `~` prefix = partial match / contains search |
| `status_id` | `open` | Default: open issues only |
| `limit` | `25` | Max search results shown |
| `sort` | `updated_on:desc` | Most recently updated first |

**Response (200 OK)**:
```json
{
  "issues": [
    {
      "id": 99,
      "subject": "Fix login bug",
      "project": { "id": 5, "name": "My Project" },
      "status": { "id": 1, "name": "Open" }
    }
  ]
}
```

**Notes**:
- Also support search by numeric ID: if user input is all digits, use
  `GET /issues/{id}.json` and wrap single result.
- Triggered after ≥ 2 characters typed with 300ms debounce.

**Error cases**:
- Network error → show "Search unavailable" in dropdown; do not close form.

---

## 5. Load Activity Types

**Purpose**: Populate the activity dropdown in the time entry form.
Called once at app startup; result cached for the session.

```
GET /enumerations/time_entry_activities.json
```

**Response (200 OK)**:
```json
{
  "time_entry_activities": [
    { "id": 8, "name": "Development", "is_default": true },
    { "id": 9, "name": "Design", "is_default": false },
    { "id": 10, "name": "Meeting", "is_default": false }
  ]
}
```

**Notes**:
- Pre-select the activity where `is_default: true` in the new-entry form.

---

## 6. Create Time Entry

**Purpose**: Save a new time entry to Redmine.

```
POST /time_entries.json
```

**Request body**:
```json
{
  "time_entry": {
    "issue_id": 99,
    "spent_on": "2026-03-31",
    "hours": 1.5,
    "activity_id": 8,
    "comments": "Working on refactor [start:09:00]"
  }
}
```

**Notes**:
- `hours` MUST be rounded to the nearest 0.25 (quarter-hour boundary).
- `comments` MUST include the `[start:HH:MM]` tag appended after any user-supplied text.
- `comments` is optional in Redmine but the tag makes it effectively always present.

**Response (201 Created)**:
```json
{
  "time_entry": {
    "id": 1235,
    "issue": { "id": 99 },
    "activity": { "id": 8, "name": "Development" },
    "hours": 1.5,
    "comments": "Working on refactor [start:09:00]",
    "spent_on": "2026-03-31"
  }
}
```

**Error cases**:
- `422 Unprocessable Entity` → display Redmine validation errors to user.
- `403 Forbidden` → user lacks time-logging permission on this issue; inform user.

---

## 7. Update Time Entry

**Purpose**: Edit an existing time entry in Redmine.

```
PUT /time_entries/{id}.json
```

**Request body** (same structure as create, only changed fields needed):
```json
{
  "time_entry": {
    "hours": 2.0,
    "comments": "Updated comment [start:09:00]"
  }
}
```

**Response**: `200 OK` with updated entry body (same shape as create response).

**Error cases**: Same as create (422, 403).

---

## 8. Delete Time Entry

**Purpose**: Remove a time entry from Redmine.

```
DELETE /time_entries/{id}.json
```

**Response**: `200 OK` (empty body) on success.

**Error cases**:
- `403 Forbidden` → user does not own the entry or lacks permission.
- `404 Not Found` → entry already deleted (treat as success, remove from calendar).

---

## Request / Response Conventions

| Convention | Rule |
|-----------|------|
| All dates | ISO 8601 `YYYY-MM-DD` string |
| All times | 24-hour `HH:MM` string (in comment tag) |
| Duration | Decimal hours, e.g. `1.5` = 1h 30m; rounded to 0.25 |
| Error body | Redmine returns `{ "errors": ["message"] }` — display first error to user |
| Retry | On network error: show retry button; do NOT auto-retry (avoid duplicate creates) |
