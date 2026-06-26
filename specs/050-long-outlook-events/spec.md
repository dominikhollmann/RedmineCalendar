# Feature Specification: Multi-Day Planning Event Expansion

**Feature Branch**: `claude/long-outlook-events-ey1jkt`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "support long outlook events. sometimes I have very long events, e.g. a 2 week holiday or illness. but could also be a regular ticket, e.g. training or client travel. when I d&d this to the bookings, a full-day event (like 1d holiday with length week-hour/5, use dry principle) event should be created for every mon-fri but not on weekend. if the event needs ticket information, it should open the modal only 1x to ask. this is 1 undo operation. the toast after completion must indicate the number of events created"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Drag multi-day planning event onto calendar (Priority: P1)

A user has a two-week "Training" event in their planning column (Outlook, Teams, or any other source). They drag it onto the Redmine Calendar bookings area. The app asks for the ticket/activity once, then creates 10 time entries — one for each Mon–Fri of those two weeks — each with duration equal to `weeklyHours / 5`. A confirmation toast reads "10 entries booked".

**Why this priority**: This is the core use case. Without it the user must manually book each of the 10 days individually — the main pain point the feature addresses.

**Independent Test**: Can be fully tested by dropping a 10-day-spanning planning event from any source column onto the calendar and confirming 10 entries appear (Mon–Fri only), one modal opened, and the toast shows "10 entries booked".

**Acceptance Scenarios**:

1. **Given** a 14-calendar-day planning event starting Monday, **When** the user drags and drops it from any planning column onto the bookings calendar, **Then** the app opens the time-entry modal exactly once and a notice inside the form indicates "10 days will be booked (Mon–Fri) from the following date", with the date read-only.
2. **Given** the user submits the modal with a ticket and activity, **When** submission completes, **Then** exactly 10 entries are created (Mon–Fri × 2 weeks), each with duration = `weeklyHours / 5`, and a toast shows "10 entries booked".
3. **Given** the 10-day drop completed, **When** the user triggers undo (Ctrl+Z), **Then** all 10 entries are removed in a single undo step and the calendar returns to its prior state.

---

### User Story 2 — Planning event spanning a weekend (Priority: P1)

A user's "Client Travel" planning event runs from Thursday to the following Tuesday (spanning a Saturday and Sunday). They drag it to the calendar from any source column. Only Thu, Fri, Mon, Tue entries are created — Saturday and Sunday are skipped.

**Why this priority**: Weekend exclusion is a hard constraint; without it, entries land on non-working days and create incorrect time records.

**Independent Test**: Drop a Thu–Tue planning event from any source column and confirm exactly 4 entries are created (no Sat/Sun entries).

**Acceptance Scenarios**:

1. **Given** a Thu–Tue planning event, **When** dropped onto the calendar from any source column, **Then** entries are created only for Thu, Fri, Mon, and Tue — the two weekend days are skipped.
2. **Given** a 7-day event starting Saturday, **When** dropped onto the calendar, **Then** only 5 entries are created (Mon–Fri of the overlapping week).

---

### User Story 3 — Planning event whose details already satisfy ticket requirements (Priority: P2)

A "Holiday" planning event is already mapped to a specific Redmine ticket and activity (e.g. via the `holidayTicket` config field). The user drops a 10-day holiday event from any source column. No modal appears; entries are created immediately and the toast confirms the count.

**Why this priority**: Reduces friction for common recurring event types that already have a known ticket mapping.

**Independent Test**: Configure a known-ticket event type, drop it from any source column, confirm no modal and 10 entries appear.

**Acceptance Scenarios**:

1. **Given** a multi-day planning event whose type maps to a known Redmine ticket, **When** dropped onto the calendar from any source column, **Then** no modal opens and entries are created directly.
2. **Given** the silent creation completes, **Then** a toast appears showing the count of created entries.

---

### User Story 4 — Single-day planning event passthrough (Priority: P3)

A user drops a single-day planning event as they do today. The existing single-event D&D flow runs unchanged — no expansion logic is triggered.

**Why this priority**: Single-day events are the existing happy path; the feature must not regress it.

**Independent Test**: Drop a single-day planning event and confirm behaviour is identical to the current flow.

**Acceptance Scenarios**:

1. **Given** a single-day planning event, **When** dropped onto the calendar from any source column, **Then** the existing single-entry creation flow runs with no change to UX.

---

### Edge Cases

- What happens when a multi-day event covers only weekend days (e.g. Saturday–Sunday only)? → No entries are created; a toast informs the user "0 weekday entries found — nothing booked".
- What happens if the user cancels the modal? → No entries are created; the drop is discarded.
- What if `weeklyHours` is not configured (zero or missing)? → Booking always proceeds using a default of 40 weekly hours; there is no drop-time error. Configuration is enforced on the Settings page instead, where the weekly-hours field is mandatory (empty/zero shows an inline error and blocks save).
- What if one or more of the N Redmine API calls fails mid-batch? → Successfully created entries are committed to the undo batch; the toast shows "N of M entries booked — X failed" with the error details.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When the user drops a multi-day planning event (spanning more than one calendar day) from any source column onto the bookings calendar, the system MUST expand it into one time-entry per Mon–Fri within the event's date range, skipping Sat and Sun entirely. The feature MUST be source-agnostic — it applies equally to Outlook, Teams, and any future planning column.
- **FR-002**: Each generated time entry MUST use a duration of `weeklyHours / 5`, where `weeklyHours` is read from the existing weekly-hours setting — no new storage key is introduced. When no value is stored, the system MUST fall back to a default of 40 (see FR-011); it MUST NOT block on a missing value.
- **FR-003**: If the dropped planning event does not carry sufficient information to identify a Redmine ticket and activity, the system MUST open the time-entry modal exactly once. The modal MUST show a notice inside the ticket frame, above the date, indicating the number of weekday entries and that booking runs Mon–Fri from the shown date (e.g. "10 days will be booked (Mon–Fri) from the following date"). The pre-filled date MUST be read-only for a multi-day booking (the run always starts on the event's first day). The pre-filled end time MUST equal start + `weeklyHours / 5` so the first day matches the silently-booked remaining days.
- **FR-004**: Ticket, activity, and comment values MUST be reused identically for all N generated entries. Comment behavior follows the existing per-path convention: (a) when the ticket is pre-mapped (no modal), the planning event subject/title is used as the comment for every entry; (b) when the ticket is unknown (modal path), the modal pre-populates the comment with the event subject/title — the user may override it — and whatever comment value is confirmed in the modal is used for all N entries.
- **FR-005**: All N entries created by a single multi-day drop MUST be grouped into one undo step; a single undo action MUST remove all of them atomically.
- **FR-006**: After all entries are successfully created, a toast notification MUST display the number of entries actually created (e.g. "10 entries booked"), using localised strings for both EN and DE.
- **FR-007**: If the expanded event yields zero weekday entries (e.g. the event falls entirely on a weekend), the system MUST display an informational toast and create no entries.
- **FR-008**: If a Redmine API call fails for one or more entries in the batch, the system MUST commit the successfully created entries to the undo batch and display a toast indicating how many succeeded and how many failed.
- **FR-009**: A single-day planning event (or an event that resolves to exactly one weekday after expansion) MUST follow the existing single-entry D&D flow with no change in UX.
- **FR-010**: The multi-day expansion logic MUST reside in the shared planning-view drop layer (`planning-view.js` / `planning-view-drop.js` / `planning-bulk-drop.js`), not inside any source-specific module (Outlook, Teams, etc.). A source-specific module MUST NOT contain a copy of this logic.
- **FR-011**: `weeklyHours` MUST always resolve to a usable value: when nothing valid is stored, the system MUST fall back to a shared default of 40. The Settings page MUST treat the weekly-hours field as mandatory — an empty, zero, or non-numeric value MUST show an inline error and block save rather than being silently coerced.
- **FR-012**: Multi-day Outlook all-day events MUST surface on every day of their span (mirroring Microsoft Graph `calendarView`). Graph's exclusive all-day end (midnight of the day after the last day) MUST be normalised to an inclusive last day so day counts, weekday expansion, and span display are correct. All-day events MUST display their date span (`start–end (Nd)`, or a single date `(1d)`) instead of a `00:00–23:59` time range, on both the planning card and the modal's source-event card.
- **FR-013**: The modal's source-event card MUST show the original event's `start–end (duration)` (the same string as the planning card) — the un-rounded times for timed events, or the date range for all-day events — rendered on its own line below the subject.

### Key Entities

- **PlanningEvent**: A calendar event from any source column (Outlook, Teams, or other); carries a start date, end date, subject/title, and optionally a pre-mapped Redmine ticket ID and activity. Previously referred to as "OutlookEvent" when the feature was considered Outlook-only.
- **TimeEntryBatch**: A transient group of N time entries produced from one multi-day drop; treated as an atomic unit for undo and UI feedback.
- **WeeklyHours**: The user's configured working hours per week (existing setting); the per-day duration is always derived as `weeklyHours / 5`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A 10-day planning event drop from any source column results in exactly 10 time entries (Mon–Fri only) with no more than one modal dialog appearing.
- **SC-002**: The undo operation for a multi-day drop removes all created entries in a single Ctrl+Z keystroke with no partial undo.
- **SC-003**: The completion toast always states the actual number of entries created, never a planned or estimated count.
- **SC-004**: A single-day planning event drop behaves identically to the pre-feature flow — no regression in UX or performance.
- **SC-005**: Zero weekday entries scenario (weekend-only event) produces a descriptive toast and leaves the calendar unchanged.
- **SC-006**: The multi-day expansion is triggered identically from the Outlook planning column and the Teams planning column — no source-specific code paths for the expansion logic.

## Assumptions

- The existing `weeklyHours` setting is the single source of truth for daily duration — no new per-day or per-entry override is needed for this feature.
- Public holidays are **not** skipped automatically; the user is responsible for removing any entries that fall on public holidays.
- Partial-day planning events (e.g. a 4-hour meeting spanning multiple days) are treated as full-day entries using the `weeklyHours / 5` duration — the event's own hour count is ignored.
- Mobile support is out of scope for v1; the feature targets desktop browsers only.
- All planning source columns (Outlook, Teams, etc.) surface their events as `PlanningEvent` objects with a consistent `rawEvent.start` / `rawEvent.end` date-string shape by the time they reach `_onColumnDrop` in `planning-view.js` — no source-specific date parsing is needed in the shared expansion layer.
- "Multi-day" is defined as a planning event whose end date is strictly more than one calendar day after its start date (i.e. at least two distinct calendar days).
- No loading indicator is shown during the sequential batch API calls; the final toast (FR-006) is the sole completion signal, consistent with the existing `bookBatch` behavior.

## Clarifications

### Session 2026-06-23

- Q: What UX applies while the multi-entry batch is in progress (2–10 s of sequential API calls)? → A: No loading indicator — rely on the final toast only, consistent with existing `bookBatch`.
- Q: What `comment` value should be used for each of the N generated entries? → A: Follow the existing per-path convention — pre-mapped ticket path uses the planning event subject/title as comment for all N entries; needs-ticket path pre-populates the modal comment with the event subject/title (user may override), then reuses the final value for all N entries.
- Q: Should the multi-day expansion be Outlook-specific or apply to all planning columns? → A: Source-agnostic — applies to all planning columns (Outlook, Teams, any future source). The expansion logic MUST live in the shared planning-view drop layer (FR-010), not in source-specific modules. DRY: one implementation, all columns benefit.
