# Data Model: Agentic AI Time-Booking — Phase 1

## Entities

### OutlookEvent (from Graph API)

Normalized from Microsoft Graph `calendarView` response.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| subject | string | `event.subject` | Meeting title |
| start | string (ISO 8601) | `event.start.dateTime` | Start time in UTC |
| end | string (ISO 8601) | `event.end.dateTime` | End time in UTC |
| isAllDay | boolean | `event.isAllDay` | True for all-day events |
| sensitivity | string | `event.sensitivity` | "normal", "private", "confidential" |
| showAs | string | `event.showAs` | "busy", "free", "tentative", "oof" |

### CalendarProposal (computed)

Produced by processing OutlookEvents against existing Redmine entries.

| Field | Type | Description |
|-------|------|-------------|
| subject | string | Meeting title (original) |
| startTime | string (HH:MM) | Rounded to quarter hour, local timezone |
| endTime | string (HH:MM) | Rounded to quarter hour, local timezone |
| hours | number | Duration in hours (endTime - startTime) |
| ticketId | number \| null | Extracted from `#<number>` in subject, or null |
| ticketSubject | string \| null | Resolved from Redmine if ticketId present |
| isAllDay | boolean | From OutlookEvent |
| category | string | "meeting", "holiday", "allday-other" |
| status | string | "proposed", "skipped", "booked", "needs-ticket" |

### Settings (localStorage)

New settings added by this feature:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `redmine_calendar_weekly_hours` | number | 40 | Weekly working hours (used for daily hours = weekly / 5) |
| `redmine_calendar_holiday_ticket` | number \| null | null | Redmine ticket ID for holiday/OOO bookings |

### Config Extension (config.json)

New admin-managed field:

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `azureClientId` | string | No | Azure AD app registration client ID. If absent, Outlook features are disabled. |

## Relationships

```
OutlookEvent  ──[parse/round]──▶  CalendarProposal
CalendarProposal  ──[ticketId]──▶  Redmine Issue (existing)
CalendarProposal  ──[confirm]──▶   Redmine TimeEntry (created via existing create_time_entry tool)
```

## State Transitions

### CalendarProposal.status

```
                ┌──── "proposed" ────┐
                │                     │
         user confirms          user skips
                │                     │
                ▼                     ▼
           "booked"              "skipped"
```

For proposals with `ticketId === null`:
```
         "needs-ticket"
                │
         user provides ticket
                │
                ▼
           "proposed" ──── (then follows normal flow)
```
