# Data Model: Teams Calls & Meetings Column (Feature 041)

**Phase**: 1 — Design & Contracts
**Branch**: `041-teams-calls-meetings`
**Date**: 2026-06-14

---

## New Entities

### TeamsCall

An ad-hoc peer-to-peer or group call retrieved from the Microsoft Graph call records API
(`/communications/callRecords`). Requires `CallRecords.Read.All` (admin consent — see FR-015).

| Field             | Type       | Description                                                     |
| ----------------- | ---------- | --------------------------------------------------------------- |
| `id`              | `string`   | Graph call record ID                                            |
| `startDateTime`   | `string`   | ISO 8601 — actual call start (UTC)                              |
| `endDateTime`     | `string`   | ISO 8601 — actual call end (UTC)                                |
| `durationMinutes` | `number`   | Computed: `(endDateTime - startDateTime)` in minutes            |
| `participants`    | `string[]` | Display names of all participants **except** the signed-in user |
| `type`            | `'call'`   | Discriminator tag                                               |

**Invariants**:

- `durationMinutes < 1` → event is `excluded` (never shown in the column, FR-009)
- `participants` never contains the signed-in user's display name (FR-006)
- If `participants` is empty → display localised fallback label (FR-006 solo-call case)

---

### TeamsMeeting

A scheduled Teams meeting with actual join/leave times from the Graph attendance reports API.

| Field            | Type        | Description                                                      |
| ---------------- | ----------- | ---------------------------------------------------------------- |
| `id`             | `string`    | Graph online meeting ID                                          |
| `subject`        | `string`    | Meeting title (defaults to localised fallback if blank, FR-007)  |
| `joinUrl`        | `string`    | Used to resolve online meeting ID from the calendarView response |
| `scheduledStart` | `string`    | ISO 8601 — scheduled start (from `calendarView`)                 |
| `scheduledEnd`   | `string`    | ISO 8601 — scheduled end (from `calendarView`)                   |
| `actualStart`    | `string`    | ISO 8601 — user's earliest join time (from attendance report)    |
| `actualEnd`      | `string`    | ISO 8601 — user's latest leave time (from attendance report)     |
| `participants`   | `string[]`  | All participant display names (optional, for future use)         |
| `type`           | `'meeting'` | Discriminator tag                                                |

**Invariants**:

- If `actualStart` / `actualEnd` are absent, the event is omitted (FR-005 — no fallback to
  scheduled times)
- `subject` defaults to `t('planning.teams_meeting_fallback')` if blank

---

### TeamsActivityRecord

Union type returned by the Teams fetch layer after normalisation. The column renderer
processes this union, not the raw Graph response.

```typescript
type TeamsActivityRecord = TeamsCall | TeamsMeeting;
```

---

### RedmineLookupCache

Session-scoped, in-memory memoisation cache for Redmine issue lookups. Lives in
`js/planning-view-cache.js` as a module-level singleton. Shared across all Planning View
event-source columns (Outlook, Teams, and future sources).

| Aspect             | Detail                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| **Storage**        | `Map<number, IssueInfo>` (module-level, never persisted)                   |
| **Key**            | Redmine issue number (`number`)                                            |
| **Value**          | `IssueInfo` — `{ issueSubject, projectName, projectIdentifier, invalid? }` |
| **Scope**          | Session (page lifetime) — discarded on page unload                         |
| **Failure policy** | Failed fetches are NOT stored (FR-017); next call retries                  |
| **Eviction**       | None — small per-session size makes LRU unnecessary                        |

**Public interface** (see [`contracts/planning-view-teams-api.md`](contracts/planning-view-teams-api.md)):

```javascript
// Returns cached result or calls fetchFn() and stores it on success.
export async function cachedLookupIssue(ticketId, fetchFn);

// Resets the cache. Used in unit tests only.
export function clearCache();
```

---

## Modified Entities

### PlanningEvent (extended for Teams + display-time fix)

Previously defined in feature 038. Extended by this feature.

| Field              | Type                                  | Change    | Description                                                    |
| ------------------ | ------------------------------------- | --------- | -------------------------------------------------------------- |
| `id`               | `string`                              | unchanged | Derived unique ID                                              |
| `proposal`         | `CalendarProposal`                    | unchanged | Classified proposal (start/end = rounded for booking/coverage) |
| `rawEvent`         | `TeamsActivityRecord \| OutlookEvent` | widened   | Raw source event (Teams or Outlook)                            |
| `planningCategory` | `PlanningEventCategory`               | unchanged | `'bookable'` \| `'needs-ticket'` \| `'excluded'`               |
| `isCovered`        | `boolean`                             | unchanged | True if rounded time range fully covered by bookings           |
| `ticketInfo`       | `IssueInfo \| null`                   | unchanged | Fetched via memoisation cache (NEW path)                       |
| `selected`         | `boolean`                             | unchanged | Selection state for multi-select drag                          |
| `displayStartTime` | `string` (HH:MM)                      | **NEW**   | Raw (un-rounded) time for card display                         |
| `displayEndTime`   | `string` (HH:MM)                      | **NEW**   | Raw (un-rounded) time for card display                         |

**Note on `displayStartTime`/`displayEndTime`**:

- For **Outlook** events: extracted from the raw Graph event ISO strings before
  `parseCalendarProposals` rounds them. Used only in `_buildCardContent` to show the original
  scheduled times (FR-013: "displayed with their raw scheduled times").
- For **Teams** events: the raw actual times (minute-precise) from the attendance report or
  call record (FR-005: "Times MUST be displayed to the minute — no rounding in the display").
- `proposal.startTime` / `proposal.endTime` remain the rounded values used for coverage
  checks and booking creation.

---

### PlanningSourceConfig (conceptual, from feature 038)

| Source key                                 | Storage constant                      | Default                            |
| ------------------------------------------ | ------------------------------------- | ---------------------------------- |
| `redmine_calendar_planning_source_outlook` | `STORAGE_KEY_PLANNING_SOURCE_OUTLOOK` | `'1'`                              |
| `redmine_calendar_planning_source_teams`   | `STORAGE_KEY_PLANNING_SOURCE_TEAMS`   | **`'0'`** (off by default, FR-002) |

---

## Storage Keys

| Key                                      | Owner          | Default | Notes                             |
| ---------------------------------------- | -------------- | ------- | --------------------------------- |
| `redmine_calendar_planning_source_teams` | `js/config.js` | `'0'`   | `'0'` = disabled, `'1'` = enabled |

See [`contracts/storage-keys.md`](contracts/storage-keys.md) for the authoritative definition.

---

## State Transitions

### Teams Column Lifecycle

```
[hidden]
  │ user enables in Settings
  ▼
[loading]  ←──── retry on error
  │                    ▲
  ▼         error      │
[populated] ─────────► [error state]
                        │
              permissions missing
                        │
                        ▼
               [unavailable state]
               (no events shown;
                user uses Outlook column)
```

### Call Classification (FR-009)

```
durationMinutes < 1  →  excluded  (not shown)
durationMinutes ≥ 1  →  needs-ticket
```

### Meeting Classification (via parseCalendarProposals, same as Outlook)

```
subject matches issue # pattern  →  bookable
subject matches non-work keyword →  excluded
otherwise                        →  needs-ticket
```

### Memoisation Cache Lookup (FR-016, FR-017)

```
ticketId in cache?
  yes  →  return IssueInfo  (no network call)
  no   →  call fetchFn()
              success  →  store IssueInfo in cache  →  return IssueInfo
              failure  →  do NOT cache              →  return null
                          (next call retries)
```

### Cross-Column Selection Clear (FR-010)

```
User clicks in column A
  │
  ├── clearOtherColumnsSelection('A')  [called via orchestrator]
  │     └── column B: clearSelection()
  │
  └── column A: update _selectedIds
```
