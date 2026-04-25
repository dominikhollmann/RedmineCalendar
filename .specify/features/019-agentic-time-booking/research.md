# Research: Agentic AI Time-Booking — Phase 1

## MSAL.js Browser Integration

**Decision**: Use `@azure/msal-browser` v2 via CDN (`https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js`)

**Rationale**: MSAL.js v2 is the current stable library for SPA auth with Azure AD. It supports `acquireTokenSilent()` with SSO, auth code flow with PKCE, and popup/redirect fallback. CDN delivery matches the project's no-bundler pattern (FullCalendar is also CDN-loaded).

**Alternatives considered**:
- MSAL.js v3 (preview): Not yet stable, breaking API changes
- Raw OAuth2 fetch: Would need to reimplement PKCE, token caching, silent refresh — MSAL.js handles all of this

## Microsoft Graph API — Calendar Events

**Decision**: Use `GET /me/calendarView?startDateTime=...&endDateTime=...` endpoint

**Rationale**: `calendarView` expands recurring events into individual occurrences (unlike `/me/events` which returns the series master). This is critical — a weekly standup should appear as today's occurrence, not the original series. The endpoint returns `start`, `end`, `subject`, `isAllDay`, `sensitivity`, and `showAs` fields needed for processing.

**Alternatives considered**:
- `/me/events`: Doesn't expand recurrences; would need client-side expansion logic
- `/me/calendar/events`: Same issue as `/me/events`

**Required scope**: `Calendars.Read` (delegated)

**Response shape** (relevant fields):
```json
{
  "value": [
    {
      "subject": "Sprint Review #2097",
      "start": { "dateTime": "2026-04-25T09:00:00", "timeZone": "UTC" },
      "end": { "dateTime": "2026-04-25T10:00:00", "timeZone": "UTC" },
      "isAllDay": false,
      "sensitivity": "normal",
      "showAs": "busy"
    }
  ]
}
```

## Ticket Number Extraction

**Decision**: Regex `/#(\d+)/g` applied to meeting subject. Multiple matches → first match used (most common pattern: ticket number in title prefix).

**Rationale**: The `#<number>` pattern is the existing convention in the app (used in search, chatbot tools, calendar display). Reusing it for meeting titles is consistent.

**Alternatives considered**:
- Natural language extraction via LLM: Adds latency and cost for a pattern that's already well-defined
- Multiple ticket support per meeting: Deferred — spec says "ask user to split or assign to one"

## Quarter-Hour Rounding

**Decision**: `Math.round(minutes / 15) * 15` — standard rounding to nearest 15-minute boundary.

**Rationale**: Matches the existing `SNAP_DURATION` in the calendar (15 minutes). Consistent with how time entries are already handled in the app.

## Overlap Detection

**Decision**: Fetch existing Redmine time entries for the day, compare start/end times. A meeting overlaps if its rounded time range intersects with an existing entry's time range.

**Rationale**: Simple interval intersection check. The existing `fetchTimeEntries(from, to)` API is already available and returns start times (via `easy_time_from`).

**Edge case**: Meetings that partially overlap existing entries are excluded entirely (not split). This is the conservative approach — the user can always manually book partial time.
