# Data Model: Calendar UX Improvements (043)

All changes are to in-memory structures and one new `localStorage` key. No new API resources or database tables.

---

## New localStorage Key

| Key                                      | Type                       | Default | Purpose                                                                                                        |
| ---------------------------------------- | -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `redmine_calendar_auto_refresh_interval` | `string` (integer seconds) | `"300"` | Auto-refresh polling interval. `"0"` disables. User-configurable via Settings. Minimum enforced floor: `60` s. |

---

## Modified In-Memory Structures

### `CalendarProposal` — extended with `source` and `is_closed`

Both fields are optional additions to the existing proposal shape returned by `normaliseCall`, `normaliseMeeting`, and `parseCalendarProposals`.

```text
CalendarProposal {
  subject: string
  startTime: string          // HH:MM (rounded to quarter-hour)
  endTime: string            // HH:MM (rounded to quarter-hour)
  displayStartTime: string   // HH:MM (raw)
  displayEndTime: string     // HH:MM (raw)
  hours: number
  ticketId: number | null
  bookingComment: string
  rawEvent: object           // original API record
  source?: 'Teams' | 'Outlook'   // NEW — set during normalisation
  is_closed?: boolean             // NEW — stamped by stampClosedStatus(); absent until stamped
  isAllDay?: boolean
  startTimeBooked?: string
  endTimeBooked?: string
}
```

### `SourceEvent` — extended with optional `source`

Passed from `planning-view.js` to `openForm()` as part of the prefill object.

```text
SourceEvent {
  subject: string
  startTime: string
  endTime: string
  source?: 'Teams' | 'Outlook'   // NEW — present when proposal.source is set
}
```

### `RefreshState` — new in-module state in `data-refresh.js`

Not exported; managed internally by the refresh controller.

```text
RefreshState {
  _intervalId: number | null    // setInterval handle; null when disabled
  _lastRefreshedAt: Date | null // timestamp of last successful refresh
  _refreshing: boolean          // guard against concurrent manual + auto triggers
}
```

---

## Entities (unchanged)

- **`TicketInfo`** (`js/types.d.ts`): already carries `is_closed: boolean`. No change.
- **`PlanningEvent`**: wraps `proposal` and `displayStartTime`/`displayEndTime`. No structural change; `proposal.source` and `proposal.is_closed` are passed through transparently.
- **`TimeEntry`** (Redmine): unchanged — all refresh paths re-use `fetchTimeEntries`.

---

## State Transitions

### Auto-Refresh Lifecycle

```
IDLE ──[start(interval)]──► POLLING ──[stop()]──► IDLE
         │                     │
         │                [tab hidden]
         │                     ▼
         │               PAUSED ──[tab visible]──► POLLING
         │
         └──[interval=0]──► DISABLED (no interval set)
```

### Ticket Closed-Status Stamping (P2)

```
Proposal (is_closed: undefined)
  ──[stampClosedStatus()]──►
    API hit (fetchIssueStatuses → fetchIssueInfo → _issueInfoCache)
  ──►
    Proposal (is_closed: true | false)
  ──►
    planning-view-column-base renders warning icon if is_closed === true
```
