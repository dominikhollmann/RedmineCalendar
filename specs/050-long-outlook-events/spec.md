# Feature Specification: Long Outlook Event Expansion

**Feature Branch**: `claude/long-outlook-events-ey1jkt`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "support long outlook events. sometimes I have very long events, e.g. a 2 week holiday or illness. but could also be a regular ticket, e.g. training or client travel. when I d&d this to the bookings, a full-day event (like 1d holiday with length week-hour/5, use dry principle) event should be created for every mon-fri but not on weekend. if the event needs ticket information, it should open the modal only 1x to ask. this is 1 undo operation. the toast after completion must indicate the number of events created"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Drag multi-day Outlook event onto calendar (Priority: P1)

A user has a two-week "Training" event in Outlook. They drag it onto the Redmine Calendar bookings area. The app asks for the ticket/activity once, then creates 10 time entries — one for each Mon–Fri of those two weeks — each with duration equal to `weeklyHours / 5`. A confirmation toast reads "10 entries booked".

**Why this priority**: This is the core use case. Without it the user must manually book each of the 10 days individually — the main pain point the feature addresses.

**Independent Test**: Can be fully tested by dropping a 10-day-spanning Outlook event onto the calendar and confirming 10 entries appear (Mon–Fri only), one modal opened, and the toast shows "10 entries booked".

**Acceptance Scenarios**:

1. **Given** a 14-calendar-day Outlook event starting Monday, **When** the user drags and drops it onto the bookings calendar, **Then** the app opens the time-entry modal exactly once and the modal title indicates "10 days will be booked".
2. **Given** the user submits the modal with a ticket and activity, **When** submission completes, **Then** exactly 10 entries are created (Mon–Fri × 2 weeks), each with duration = `weeklyHours / 5`, and a toast shows "10 entries booked".
3. **Given** the 10-day drop completed, **When** the user triggers undo (Ctrl+Z), **Then** all 10 entries are removed in a single undo step and the calendar returns to its prior state.

---

### User Story 2 — Outlook event spanning a weekend (Priority: P1)

A user's "Client Travel" Outlook event runs from Thursday to the following Tuesday (spanning a Saturday and Sunday). They drag it to the calendar. Only Thu, Fri, Mon, Tue entries are created — Saturday and Sunday are skipped.

**Why this priority**: Weekend exclusion is a hard constraint; without it, entries land on non-working days and create incorrect time records.

**Independent Test**: Drop a Thu–Tue Outlook event and confirm exactly 4 entries are created (no Sat/Sun entries).

**Acceptance Scenarios**:

1. **Given** a Thu–Tue Outlook event, **When** dropped onto the calendar, **Then** entries are created only for Thu, Fri, Mon, and Tue — the two weekend days are skipped.
2. **Given** a 7-day event starting Saturday, **When** dropped onto the calendar, **Then** only 5 entries are created (Mon–Fri of the overlapping week).

---

### User Story 3 — Outlook event whose details already satisfy ticket requirements (Priority: P2)

An Outlook "Holiday" event is already mapped to a specific Redmine ticket and activity via the Outlook→Redmine configuration (e.g. the `holidayTicket` config field). The user drops a 10-day holiday event. No modal appears; entries are created immediately and the toast confirms the count.

**Why this priority**: Reduces friction for common recurring event types that already have a known ticket mapping.

**Independent Test**: Configure a known-ticket Outlook event type, drop it, confirm no modal and 10 entries appear.

**Acceptance Scenarios**:

1. **Given** a multi-day Outlook event whose type maps to a known Redmine ticket, **When** dropped onto the calendar, **Then** no modal opens and entries are created directly.
2. **Given** the silent creation completes, **Then** a toast appears showing the count of created entries.

---

### User Story 4 — Single-day Outlook event passthrough (Priority: P3)

A user drops a single-day Outlook event as they do today. The existing single-event D&D flow runs unchanged — no expansion logic is triggered.

**Why this priority**: Single-day events are the existing happy path; the feature must not regress it.

**Independent Test**: Drop a single-day Outlook event and confirm behaviour is identical to the current flow.

**Acceptance Scenarios**:

1. **Given** a single-day Outlook event, **When** dropped onto the calendar, **Then** the existing single-entry creation flow runs with no change to UX.

---

### Edge Cases

- What happens when a multi-day event covers only weekend days (e.g. Saturday–Sunday only)? → No entries are created; a toast informs the user "0 weekday entries found — nothing booked".
- What happens if the user cancels the modal? → No entries are created; the drop is discarded.
- What if `weeklyHours` is not configured (zero or missing)? → Show an error toast prompting the user to configure their weekly hours in Settings before proceeding.
- What if one or more of the N Redmine API calls fails mid-batch? → Successfully created entries are committed to the undo batch; the toast shows "N of M entries booked — X failed" with the error details.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the user drops a multi-day Outlook event (spanning more than one calendar day) onto the bookings calendar, the system MUST expand it into one time-entry per Mon–Fri within the event's date range, skipping Sat and Sun entirely.
- **FR-002**: Each generated time entry MUST use a duration of `weeklyHours / 5`, where `weeklyHours` is read from the existing weekly-hours setting — no new storage key is introduced.
- **FR-003**: If the dropped Outlook event does not carry sufficient information to identify a Redmine ticket and activity, the system MUST open the time-entry modal exactly once. The modal title MUST indicate the number of days that will be booked (e.g. "Book 10 days").
- **FR-004**: Ticket and activity values entered in the single modal invocation MUST be reused identically for all N generated entries.
- **FR-005**: All N entries created by a single multi-day drop MUST be grouped into one undo step; a single undo action MUST remove all of them atomically.
- **FR-006**: After all entries are successfully created, a toast notification MUST display the number of entries actually created (e.g. "10 entries booked"), using localised strings for both EN and DE.
- **FR-007**: If the expanded event yields zero weekday entries (e.g. the event falls entirely on a weekend), the system MUST display an informational toast and create no entries.
- **FR-008**: If a Redmine API call fails for one or more entries in the batch, the system MUST commit the successfully created entries to the undo batch and display a toast indicating how many succeeded and how many failed.
- **FR-009**: A single-day Outlook event (or an event that resolves to exactly one weekday after expansion) MUST follow the existing single-entry D&D flow with no change in UX.

### Key Entities

- **OutlookEvent**: A calendar event sourced from Microsoft Outlook/Graph; has a start date, end date, title, and optionally a pre-mapped Redmine ticket ID and activity.
- **TimeEntryBatch**: A transient group of N time entries produced from one multi-day drop; treated as an atomic unit for undo and UI feedback.
- **WeeklyHours**: The user's configured working hours per week (existing setting); the per-day duration is always derived as `weeklyHours / 5`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A 10-day Outlook event drop results in exactly 10 time entries (Mon–Fri only) with no more than one modal dialog appearing.
- **SC-002**: The undo operation for a multi-day drop removes all created entries in a single Ctrl+Z keystroke with no partial undo.
- **SC-003**: The completion toast always states the actual number of entries created, never a planned or estimated count.
- **SC-004**: A single-day Outlook event drop behaves identically to the pre-feature flow — no regression in UX or performance.
- **SC-005**: Zero weekday entries scenario (weekend-only event) produces a descriptive toast and leaves the calendar unchanged.

## Assumptions

- The existing `weeklyHours` setting is the single source of truth for daily duration — no new per-day or per-entry override is needed for this feature.
- Public holidays are **not** skipped automatically; the user is responsible for removing any entries that fall on public holidays.
- Partial-day Outlook events (e.g. a 4-hour meeting spanning multiple days) are treated as full-day entries using the `weeklyHours / 5` duration — the Outlook event's own hour count is ignored.
- Mobile support is out of scope for v1; the feature targets desktop browsers only.
- The feature builds on the existing `js/outlook.js` Outlook Graph integration and the existing undo-manager API; both are available and stable.
- "Multi-day" is defined as an Outlook event whose end date is strictly more than one calendar day after its start date (i.e. at least two distinct calendar days).
- No loading indicator is shown during the sequential batch API calls; the final toast (FR-006) is the sole completion signal, consistent with the existing `bookBatch` behavior.

## Clarifications

### Session 2026-06-23

- Q: What UX applies while the multi-entry batch is in progress (2–10 s of sequential API calls)? → A: No loading indicator — rely on the final toast only, consistent with existing `bookBatch`.
