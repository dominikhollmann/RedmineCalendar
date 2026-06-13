# Feature Specification: Closed Ticket Warning in Time-Entry Modal

**Feature Branch**: `040-closed-ticket-warning`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Warn user when booking time on a closed Redmine ticket"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Warning on Manual Ticket Selection (Priority: P1)

A team member opens the time-entry modal and types in the issue search box. The autocomplete suggests a ticket that is already closed. When the user selects it, a warning badge immediately appears beneath the issue field telling them the ticket is closed. They can still submit the entry — the warning is purely informational.

**Why this priority**: This is the core scenario. Most users discover closed tickets through the autocomplete flow, and without this guard they have no way to know the entry might be rejected by the server.

**Independent Test**: Can be fully tested by opening the time-entry modal, searching for and selecting a known closed ticket, and verifying the warning badge appears. Delivers the primary safety signal without any other story being implemented.

**Acceptance Scenarios**:

1. **Given** the time-entry modal is open with an empty issue field, **When** the user selects a ticket whose Redmine status has `is_closed: true`, **Then** a warning badge appears directly beneath the issue field within 1 second.
2. **Given** the warning badge is visible for a closed ticket, **When** the user clears the issue field, **Then** the warning badge disappears immediately.
3. **Given** the warning badge is visible for a closed ticket, **When** the user replaces it with an open ticket, **Then** the warning badge disappears and the submission proceeds normally.
4. **Given** the warning badge is visible, **When** the user clicks Submit, **Then** the submission is not blocked — the entry is sent to Redmine.

---

### User Story 2 — Warning When Editing an Entry Whose Ticket Is Now Closed (Priority: P2)

A team member re-opens an existing time entry that was booked against a ticket that was open at the time but has since been closed. When the edit modal opens, the closed-ticket warning is already present without requiring the user to re-select the issue.

**Why this priority**: Stale entries are a real pain point — teams close tickets mid-sprint and users unknowingly try to adjust old entries. Checking on open-for-edit is a natural extension of the same guard.

**Independent Test**: Can be tested independently by editing a pre-existing time entry linked to a closed ticket and verifying the warning appears on modal open, without needing Story 1 (both share the same underlying detection logic but Story 2 tests the pre-population path).

**Acceptance Scenarios**:

1. **Given** an existing time entry linked to a ticket that is now closed, **When** the user opens the edit modal for that entry, **Then** the warning badge appears immediately, before any user interaction.
2. **Given** an edit modal is open with the closed-ticket warning visible, **When** the user changes the issue to an open ticket, **Then** the warning disappears.
3. **Given** an edit modal is open with the closed-ticket warning visible, **When** the user submits without changing the issue, **Then** the submission proceeds (non-blocking).

---

### User Story 3 — Warning Badge on Calendar for Outlook Drag-and-Drop (Priority: P3)

A team member drags an Outlook calendar event onto the calendar. Because the event carries an identified ticket, the system books the entry immediately without opening the modal. If the resolved ticket is closed, the system cannot show the warning inside the modal (it never opens) — instead a ⚠️ badge appears directly on the Outlook calendar event, with a tooltip explaining that the ticket is closed. This mirrors the existing overlapping-bookings warning badge behaviour on the calendar.

**Why this priority**: This path is less common than manual selection, and the Outlook drag-and-drop integration is already handled in a separate module. The calendar-badge approach is consistent with existing warning patterns, so it is low-risk to add once the core stories are shipped.

**Independent Test**: Can be tested by dragging an Outlook event that maps to a closed ticket and verifying the ⚠️ badge and tooltip appear on the calendar event without any modal opening.

**Acceptance Scenarios**:

1. **Given** the user drags an Outlook event onto the calendar, **When** the system resolves the ticket to one that is closed (`is_closed: true`), **Then** the entry is created and a ⚠️ badge appears on the calendar event (no modal is opened).
2. **Given** the ⚠️ badge is visible on a calendar event, **When** the user hovers over the badge, **Then** a tooltip appears explaining that the ticket is closed and the entry may be rejected by Redmine.
3. **Given** the status check fails or times out during drag-and-drop, **Then** the entry is created without a badge — no error is shown and the booking flow is not interrupted.

---

### Edge Cases

- What happens when the Redmine API call to check the ticket status fails or times out? The warning is silently skipped; the modal remains functional and submission is not blocked.
- What happens when `is_closed` is already present in the autocomplete response payload? The warning is shown without an additional network request.
- What happens when `is_closed` is absent from the autocomplete payload (partial response)? A lightweight secondary fetch of the full issue detail retrieves the status.
- What happens when the user types directly in the issue field (free-text, no autocomplete selection)? The check runs after the field loses focus or on explicit confirmation, not on every keystroke.
- What happens when the same ticket appears in both an existing entry and the new entry being created simultaneously? Each modal instance maintains its own warning state independently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect when the issue field in the time-entry modal is populated with a Redmine ticket whose status has `is_closed: true`.
- **FR-002**: The system MUST render a non-blocking warning badge directly beneath the issue field when a closed ticket is detected, with localised text available in all supported application languages.
- **FR-003**: The warning badge MUST disappear when the issue field is cleared or when the field is updated to a ticket with `is_closed: false`.
- **FR-004**: Submission of the time-entry form MUST NOT be prevented by the presence of the closed-ticket warning.
- **FR-005**: The closed-ticket check MUST run when an existing time entry is opened for editing, so that entries whose tickets have since been closed surface the warning immediately on modal open.
- **FR-006**: When an Outlook drag-and-drop creates an entry without opening the modal, the system MUST check whether the resolved ticket is closed and, if so, render a ⚠️ badge on the resulting calendar event with a localised tooltip explaining that the ticket is closed. No modal is opened for this path.
- **FR-007**: If `is_closed` status is already present in the issue data returned by the autocomplete flow, the system MUST use that data and MUST NOT make an additional network request solely for this check.
- **FR-008**: If `is_closed` is not available in the autocomplete payload, the system MAY perform a single lightweight fetch of the full issue detail to retrieve the status field.
- **FR-009**: i18n strings for the warning MUST be provided for English (`en`) and German (`de`).
- **FR-010**: If the Redmine API request to check the ticket status fails, the warning MUST be silently skipped; the modal and submission flow MUST remain functional.
- **FR-011**: If Redmine rejects the time-entry submission because the ticket is closed, the server error message MUST be surfaced to the user using the existing error-display mechanism (consistent with how other API errors are handled).

### Key Entities

- **Time Entry**: A record of time spent on a Redmine issue; has an associated issue (ticket). Modified when the user creates or edits an entry in the modal.
- **Redmine Issue (Ticket)**: The work item against which time is booked. Has a `status` object with an `is_closed` boolean that determines whether the ticket accepts new time entries.
- **Modal Warning Badge**: A transient UI element displayed beneath the issue field in the time-entry modal. Appears when `is_closed: true`; disappears when the issue changes or the field is cleared. Applies to Stories 1 and 2.
- **Calendar Event Warning Badge**: A persistent ⚠️ overlay on a calendar event created via Outlook drag-and-drop, shown when the resolved ticket is closed. Includes a hover tooltip. Mirrors the existing overlapping-bookings badge. Applies to Story 3.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The warning appears within 1 second of a closed ticket being detected — as a modal badge for manual selection and editing, and as a calendar event badge for Outlook drag-and-drop — with no additional user action required.
- **SC-002**: 100% of closed-ticket detections surface a warning (modal badge or calendar badge as appropriate); 0% of open-ticket detections show a warning (false-positive rate = 0).
- **SC-003**: Submission success rate for valid time entries is unchanged — the warning introduces no regression in the happy-path flow.
- **SC-004**: No extra network round-trip occurs when the autocomplete payload already contains the `is_closed` field.
- **SC-005**: The warning and all associated labels render correctly in both English and German locales.

## Assumptions

- The autocomplete search in `js/time-entry-form.js` may or may not include `is_closed` in its current response; a plan-phase investigation will confirm which fetch strategy is needed.
- Drag-and-drop from Outlook does not open the time-entry modal; the closed-ticket warning for this path is a ⚠️ badge on the calendar event (with tooltip), consistent with the existing overlapping-bookings badge pattern — not a modal-level badge.
- If Redmine rejects a submission against a closed ticket server-side, the existing API error-display mechanism handles the rejection message verbatim — no custom mapping to the `closedTicketWarning` key is required for server errors.
- Mobile layout is out of scope for this feature; the warning badge is designed for desktop viewport widths consistent with the existing modal layout.
- The warning badge is styled to match the existing amber/yellow ArbZG warning palette in `css/time-entry.css` — no new colour tokens are introduced.
- The target Redmine flavour is Easy Redmine; the `is_closed` field is present in `GET /issues/<id>.json` responses.
