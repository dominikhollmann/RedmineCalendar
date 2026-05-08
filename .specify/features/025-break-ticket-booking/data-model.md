# Phase 1 Data Model: Break-Ticket Booking

**Feature**: 025 | **Date**: 2026-05-07 (revised during UAT 2026-05-08)

> **Updated during UAT (2026-05-08)**: `CalendarEventProposal.category` now includes `'vacation'` (UAT FR-016) in addition to the original `'meeting' | 'holiday' | 'allday-other' | 'break'`. The `TimeEntry` shape gained an `endTime: string | null` field (parsed from `easy_time_to`) so break entries can preserve the real Outlook event duration on the calendar (FR-019, FR-021). `mapTimeEntry` and `fetchTimeEntries` no longer filter `hours: 0` — entries persist through page reload. See spec.md FR-015 through FR-021.

This feature does not introduce persistent storage of new entity types. The data model below describes the in-memory shapes that change and the storage-key inventory.

---

## 1. CalendarEventProposal (in-memory, transient)

Returned by `parseCalendarProposals(events, existingEntries, weeklyHours, holidayTicket, breakTicket)`. Used by `chatbot-tools.js` and the AI booking flow. **Not persisted.**

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `subject` | string | yes | Original Outlook event subject (also used as time-entry comment per FR-008) |
| `startTime` | string ("HH:mm") \| null | conditional | `null` only for legacy callers; new behavior anchors to workStart for all-day events (FR-013) |
| `endTime` | string ("HH:mm") \| null | conditional | Equals `startTime` for break entries (duration 0); `startTime + dailyHours` for holidays |
| `hours` | number | yes | `0` for break entries (FR-002), `dailyHours` for holidays, computed from slot for meetings |
| `ticketId` | number \| null | yes | Extracted from title (precedence per Q5), holiday ticket, or break ticket; `null` only when event needs user input |
| `ticketSubject` | string \| null | yes | NEW — populated for proposals; the proposed ticket's title (for FR-011 verification in summary). For tickets extracted at parse time the parser MAY leave this null and the chatbot resolves it via `fetchIssueSummary` before rendering. |
| `isAllDay` | boolean | yes | True when the source event was all-day |
| `category` | string enum | yes | One of: `'meeting'`, `'holiday'`, `'allday-other'`, `'break'` (NEW). `break` is set ONLY when the AI routes; the parser never emits `'break'` directly. |
| `status` | string enum | yes | One of: `'proposed'` (ready), `'needs-ticket'` (no ticket extracted, AI must classify or ask user), `'needs-classification'` (NEW — reserved; v1 uses `'needs-ticket'` and lets the AI infer). v1 uses `'proposed'` and `'needs-ticket'`. |

### Removed fields

None. The shape is additive — `ticketSubject` is new, the rest are unchanged.

### Validation rules

- `hours === 0` ⟺ `ticketId === breakTicket` AND `category === 'break'`.
- `category === 'holiday'` ⟹ `ticketId === holidayTicket || null` AND `isAllDay === true` AND `startTime` anchored to workStart (post-FR-013).
- For meetings (non-all-day): `endTime > startTime`, `hours = (endMins - startMins) / 60` rounded to 0.25.

### State transitions

```
                 ┌─ category: 'meeting'    (ticket extracted from title — Q5 precedence)
parser emit ────┼─ category: 'holiday'    (regex match on subject + isAllDay)
                ├─ category: 'allday-other' (all-day, no holiday match)
                └─ status: 'needs-ticket'  (timed event, no ticket extracted)
                                  │
                                  │ AI inspects in chatbot loop
                                  ▼
                  ┌──────────────┴──────────────┐
                  │ subject → non-work?          │
                  │   AND breakTicket configured?│
                  └──────────────┬──────────────┘
                       yes │            │ no
                           ▼            ▼
              category='break'    ask user for ticket
              ticketId=breakTicket  (existing 019 flow)
              hours=0
              startTime=event.start
```

---

## 2. CentralConfig (config.json, admin-managed)

Already exists; this feature adds one field and clarifies semantics for an existing one.

### Fields (relevant subset)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `redmineUrl` | string | yes | (existing) |
| `redmineServerUrl` | string | yes | (existing) |
| `aiProvider` | string | yes | (existing) |
| `aiModel` | string | yes | (existing) |
| `aiApiKey` | string | yes | (existing) |
| `aiProxyUrl` | string | yes | (existing) |
| `azureClientId` | string | yes | (existing) |
| `holidayTicket` | number | optional | (NOW READ FROM HERE — was per-user localStorage in 019) Numeric Redmine issue ID. When unset, holiday all-day events fall to `'needs-ticket'` (existing 019 behavior). |
| `breakTicket` | number | optional | NEW — Numeric Redmine issue ID. When unset, AI break-routing is disabled (FR-004). |

### Validation rules

- `breakTicket`, if present, MUST be a positive integer.
- `holidayTicket`, if present, MUST be a positive integer.
- The two MAY be the same value (no enforced uniqueness — admin choice).

### Loading

`loadCentralConfig()` already fetches `/config.json` and caches the result. No new code path; this feature just reads two new fields off the cached object.

---

## 3. Storage key inventory

| Key | Type | Purpose | Status |
|-----|------|---------|--------|
| `redmine_calendar_credentials` | encrypted JSON | Per-user Redmine creds | unchanged |
| `redmine_calendar_working_hours` | JSON `{start, end}` | Per-user working hours | unchanged — read for FR-013 anchoring |
| `redmine_calendar_weekly_hours` | string number | Per-user weekly hours | unchanged |
| `redmine_calendar_view_mode` | string | Per-user view preference | unchanged |
| `redmine_calendar_day_range` | string | Per-user day-range view | unchanged |
| `redmine_calendar_favourites` | JSON | Per-user favorite tickets | unchanged |
| `redmine_calendar_last_used` | JSON | Per-user recent tickets | unchanged |
| `redmine_calendar_voice_privacy_dismissed` | boolean | Voice-input notice dismissal | unchanged |
| `redmine_calendar_holiday_ticket` | string number | Legacy per-user holiday ticket | **REMOVED on app init** (FR-007). Constant `STORAGE_KEY_HOLIDAY_TICKET` retained in `config.js` for the cleanup helper, then deleted in a follow-up. |

No new localStorage keys are added by this feature.

---

## 4. Time entry shape (Redmine REST POST `/time_entries.json`)

Existing shape, no schema change. Two values populated by this feature:

- `hours: 0` — for break entries.
- `easy_time_from: "HH:mm"` — for all-day events (holiday + break) under FR-013, anchored to workStart || "09:00".

The Redmine side accepts these values today (Easy Redmine custom fields handle start/end; standard 0-hour entries are accepted per spec Assumption).

---

## 5. AI tool call: `create_time_entry` (existing, used differently)

Already defined in `js/chatbot-tools.js`. This feature does not change the tool schema — only how the AI is instructed (in the system prompt) to populate it.

When the AI classifies an event as non-work AND `breakTicket` is in context, it emits:

```json
{
  "name": "create_time_entry",
  "input": {
    "issueId": <breakTicket>,
    "spentOn": "<YYYY-MM-DD>",
    "hours": 0,
    "startTime": "<event.startTime>",
    "comment": "<event.subject>",
    "activityId": <default activity>
  }
}
```

No new tool is introduced.
