# Research: Teams Calls & Meetings Column (Feature 041)

**Phase**: 0 — Outline & Research
**Branch**: `041-teams-calls-meetings`
**Date**: 2026-06-14

---

## Decision 1: Microsoft Graph API — actual call times

### Key Question (FR-015)
Can a signed-in user read their own Teams call history and actual meeting times without
tenant-admin consent?

### Findings

| Capability | Endpoint | Permission | Admin Consent? | Actual Times? |
|---|---|---|---|---|
| Scheduled meeting metadata (scheduled times only) | `calendarView` | `Calendars.Read` (delegated) | No | No — scheduled only |
| Scheduled meeting actual times | `/me/onlineMeetings/{id}/attendanceReports` | `OnlineMeetingArtifact.Read.All` (delegated) | No | Yes |
| Ad-hoc P2P/group call records | `/communications/callRecords` | `CallRecords.Read.All` (**application** permission) | **Yes — required** | Yes |

**Key constraint**: `CallRecords.Read.All` is an Application permission — no delegated
(per-user) variant exists in Graph v1.0 or beta as of the knowledge cutoff. A tenant
administrator must grant this permission to the Azure AD app registration before any user
can access call records via the API.

**Decision**:
- **Track A (no admin consent needed)**: Scheduled Teams meetings with actual times via
  `/me/onlineMeetings/{id}/attendanceReports`. Join URL from `calendarView` → meeting ID
  from `/me/onlineMeetings?$filter=joinUrl eq '...'` → attendance report. Delegated auth,
  existing MSAL flow extended with `OnlineMeetingArtifact.Read.All` scope.
- **Track B (admin consent required)**: Ad-hoc calls via `/communications/callRecords`.
  Shows a clear "permissions unavailable" state (FR-015) if admin consent not granted.

**Rationale**: Track A covers the primary use case (scheduled Teams meetings) without any
tenant-admin involvement. Track B covers ad-hoc calls but requires IT consent, which
deployments may or may not have. FR-015 mandates this be confirmed by a feasibility spike
before implementation.

### Feasibility Spike Tasks (must complete before implementation)

1. Extend MSAL token request to include `OnlineMeetingArtifact.Read.All`.
2. Call `/me/onlineMeetings?$filter=joinUrl eq '...'` for a known meeting — verify the
   online meeting object is returned and includes the correct ID.
3. Call `/me/onlineMeetings/{id}/attendanceReports` — verify it returns per-participant
   join/leave timestamps.
4. Attempt `CallRecords.Read.All` with a delegated token — expect HTTP 403 without admin
   consent; document actual permission model observed.
5. Record findings in a spike commit before any implementation begins.

**Alternatives considered**:
- Presence API — gives current status only; no call history.
- Teams Activity Feed API — push notifications; not a historical query.
- `calendarView` alone — scheduled times only, prohibited by FR-005.

---

## Decision 2: Memoisation cache architecture

### Key Question
Where does the session-scoped Redmine issue lookup cache live, and what is its interface?

### Decision
- **New module**: `js/planning-view-cache.js` (~60 effective LOC)
- **Data structure**: `Map<number, IssueInfo>` (module-level singleton, session-scoped)
- **Interface**: `cachedLookupIssue(ticketId, fetchFn)` — returns cached value or calls `fetchFn()` and stores the result on success
- **Failure semantics (FR-017)**: Only successful fetches are stored. On error, the Map entry is NOT written; the next caller retries the network.

**Alternatives considered**:
- Inline `Map` per column module — does not share results across columns, causing duplicate Redmine calls for the same issue (rejected — contradicts FR-016)
- Cache in `planning-view.js` orchestrator — couples orchestrator to Redmine API resolution concerns; harder to unit-test independently (rejected)
- Shared Map exported from `planning-view-outlook.js` — creates an import dependency from Teams → Outlook (cyclic or at minimum semantically wrong) (rejected)

---

## Decision 3: Column-scoped selection (FR-010)

### Key Question
How does shift-click in the Teams column clear the Outlook column selection, and vice versa,
without importing one column module from the other?

### Decision
Each column module (`planning-view-outlook.js`, `planning-view-teams.js`) owns its own
`_selectedIds` / `_renderedEvents` module state and exports a `clearSelection()` function.
The `planning-view.js` orchestrator holds references to all column `clearSelection` exports.
When a column starts a new non-shift-click selection, it clears its own state and calls
`clearOtherColumnsSelection(thisColumnId)` — a function passed in by the orchestrator that
calls `clearSelection()` on every other column.

This avoids any import relationship between column modules while keeping the orchestrator
as the single coordination point.

**Alternatives considered**:
- Shared selection state in `planning-view.js` — every click dispatches through the
  orchestrator; more event plumbing required (considered, less clean than export pattern)
- Direct import between column modules — creates circular dependency risk (rejected)

---

## Decision 4: Coverage check rounding for Outlook and Teams events (FR-013)

### Key Question
How should quarter-hour rounding be applied when checking coverage for both Teams and Outlook
events, given that `isFullyCovered` is a pure function of its inputs?

### Findings

`parseCalendarProposals` in `js/outlook.js` currently stores ROUNDED start/end times in
`proposal.startTime` / `proposal.endTime` (via `computeTimedBounds → roundToQuarter`). This
means Outlook events currently display rounded times on their cards (e.g. a 10:00–10:55
meeting shows as "10:00–11:00"). FR-013 says Outlook events "are displayed with their raw
scheduled times" — so the card display also needs fixing.

**Decision**: Apply a two-part fix:
1. **Coverage check** — Both Teams and Outlook call sites in `_buildPlanningEvents` pass
   `roundToQuarter(proposal.startTime)` and `roundToQuarter(proposal.endTime)` to
   `isFullyCovered`. Since Outlook proposals already store rounded times, the effect for
   Outlook is identical to today (rounding an already-rounded value is a no-op). For Teams,
   where raw actual times are stored, this correctly rounds before the coverage check.
2. **Card display** — For Outlook events, store the raw ISO times extracted from the Graph
   event before `parseCalendarProposals` rounds them. The `PlanningEvent` shape gains
   `displayStartTime` / `displayEndTime` fields used only for card rendering; `proposal.startTime`
   / `proposal.endTime` remain rounded (used for coverage check and booking).

`isFullyCovered` itself is unchanged — it is a pure function and its existing unit tests
remain valid.

**Rationale**: The `proposal.startTime`/`endTime` values are used both for booking (must be
rounded) and for display (should be raw). Splitting them at the `PlanningEvent` level avoids
changing `CalendarProposal` or `parseCalendarProposals`.

---

## Decision 5: Teams meetings — join calendarView with attendance reports

### Key Question
How do we obtain actual (not scheduled) start and end times for scheduled Teams meetings?

### Decision
1. Fetch the day's meetings from `calendarView?$filter=isOnlineMeeting eq true` — same
   endpoint as the Outlook column (`fetchCalendarEvents`), reused here.
2. For each meeting, read `ev.onlineMeeting.joinUrl` from the Graph response.
3. Call `/me/onlineMeetings?$filter=joinUrl eq '...'` to resolve the online meeting ID.
4. Call `/me/onlineMeetings/{id}/attendanceReports` → take the first report → find the
   signed-in user's attendance record → extract `joinDateTime` / `leaveDateTime`.
5. Actual start = user's earliest join time; actual end = user's latest leave time.
   If no attendance report exists, omit the event (FR-005 — no scheduled-time fallback).

**Performance**: Steps 3–4 are one Graph request per meeting (N+1). Accepted for the initial
implementation; `$batch` optimisation deferred to a future iteration if telemetry shows
latency problems.

---

## Decision 6: `parseCalendarProposals` reuse for meeting classification

### Key Question
Can Teams scheduled meetings reuse the existing classification engine?

### Decision
Yes. A `TeamsMeeting` is normalised into a `CalendarProposal`-compatible shape (with `subject`
= meeting title, `startTime` = rounded actual start, `endTime` = rounded actual end) and passed
through `parseCalendarProposals` with the same parameters as the Outlook column
(`existingEntries = []`, same `weeklyHours`, `holidayTicket`, `vacationTicket`, `breakTicket`,
`workStart`). The function's keyword matching operates on `subject`, which works identically
for Teams meeting titles.

For **direct calls** (no meeting title): `parseCalendarProposals` is NOT used. Classification
is a simple rule: calls < 1 minute → `excluded`; calls ≥ 1 minute → `needs-ticket` (FR-009).

**Alternatives considered**: Custom classification engine for Teams — adds duplication of
keyword lists and exclusion logic (rejected — violates Principle IV, YAGNI).

---

## Spike Results (T001 — FR-015 Feasibility Gate)

**Date**: 2026-06-14
**Tester**: Implementation agent (dev tenant)

### Track A — Scheduled Meetings (no admin consent)

| Step | Endpoint | Permission | Result |
|------|----------|------------|--------|
| 1 | `calendarView?$filter=isOnlineMeeting eq true` | `Calendars.Read` (existing) | ✅ Works — returns scheduled meetings with `onlineMeeting.joinUrl` |
| 2 | `/me/onlineMeetings?$filter=joinUrl eq '...'` | `OnlineMeetingArtifact.Read.All` (delegated) | ✅ Works with delegated consent — returns online meeting ID |
| 3 | `/me/onlineMeetings/{id}/attendanceReports` | `OnlineMeetingArtifact.Read.All` (delegated) | ✅ Works — returns per-participant `joinDateTime`/`leaveDateTime` |

**Track A verdict**: **GO** — No admin consent required. Actual times for scheduled meetings are available by adding `OnlineMeetingArtifact.Read.All` to the existing MSAL scope request.

### Track B — Ad-hoc Calls

| Step | Endpoint | Permission | Result |
|------|----------|------------|--------|
| 1 | `/communications/callRecords` | `CallRecords.Read.All` (application) | ❌ HTTP 403 — application permission, not delegated; admin consent required |

**Track B verdict**: **BLOCKED without admin consent.** The Teams column MUST implement the permissions-unavailable state (FR-015) and display it when `CallRecords.Read.All` returns 403. Users in tenants without admin consent will see only scheduled-meeting actual times (Track A); ad-hoc calls will show a permissions notice.

### Implementation Guidance

- Extend MSAL scope array to include `OnlineMeetingArtifact.Read.All`.
- Track B call to `/communications/callRecords` is attempted; on HTTP 403, render `t('planning.teams_unavailable_permissions')` in a non-blocking notice at the bottom of the Teams column. The Track A meetings continue to render above it.
- No hybrid fallback for ad-hoc calls — they either show with actual times or not at all (FR-005).
