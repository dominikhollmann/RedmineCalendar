# Feature Specification: Closed Ticket Booking Gate

**Feature Branch**: `040-closed-ticket-warning`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Warn user when booking time on a closed Redmine ticket; confirm dialog gate on all booking paths (modal, Outlook DnD, copy-paste, AI)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Manual Ticket Selection in Modal (Priority: P1)

A team member opens the time-entry modal and types in the issue search box. The autocomplete suggests a ticket that is already closed. When the user selects it, a warning badge appears beneath the issue field immediately. When the user clicks Submit, a confirmation dialog appears asking them to acknowledge the risk before the entry is sent to Redmine. The user can confirm to proceed or cancel to return to the modal.

**Why this priority**: This is the most common booking path. The inline badge gives early feedback; the confirmation dialog is the gate that ensures no closed-ticket booking happens without explicit intent.

**Independent Test**: Can be fully tested by opening the modal, selecting a known closed ticket, clicking Submit, and verifying the confirmation dialog appears. Confirming saves the entry; cancelling returns to the modal with the form intact.

**Acceptance Scenarios**:

1. **Given** the time-entry modal is open, **When** the user selects a ticket with `is_closed: true`, **Then** a warning badge appears beneath the issue field within 1 second.
2. **Given** a closed ticket is selected in the modal, **When** the user clicks Submit, **Then** a confirmation dialog appears before any API call is made, asking the user to confirm booking on a closed ticket.
3. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the entry is submitted to Redmine and the modal closes normally.
4. **Given** the confirmation dialog is open, **When** the user cancels, **Then** the dialog closes and the user is returned to the modal with all fields intact — no entry is created.
5. **Given** an open ticket is selected, **When** the user clicks Submit, **Then** no confirmation dialog appears — submission proceeds directly.

---

### User Story 2 — Editing an Entry Whose Ticket Is Now Closed (Priority: P2)

A team member re-opens an existing time entry whose ticket has since been closed. The warning badge appears immediately when the edit modal opens. If the user submits without changing the issue, the same confirmation dialog gate appears before the update is sent to Redmine.

**Why this priority**: Stale entries are edited regularly. Without this gate, a user adjusting the hours on an old entry against a closed ticket could trigger a silent Redmine rejection.

**Independent Test**: Can be tested independently by editing a pre-existing time entry on a closed ticket and verifying (a) the badge appears on modal open, and (b) the confirmation dialog appears on submit.

**Acceptance Scenarios**:

1. **Given** an existing time entry is linked to a ticket that is now closed, **When** the user opens the edit modal, **Then** the warning badge appears immediately, before any user interaction.
2. **Given** the edit modal is open with a closed-ticket badge visible, **When** the user clicks Submit, **Then** the confirmation dialog appears.
3. **Given** the edit modal is open, **When** the user changes the issue to an open ticket, **Then** the warning badge disappears and submit no longer triggers the dialog.

---

### User Story 3 — Outlook Drag-and-Drop (Priority: P3)

A team member drags an Outlook calendar event onto the calendar. Because the event has an identified ticket, the system would normally create the entry immediately without opening the modal. If the resolved ticket is closed, the system instead shows the confirmation dialog before committing the entry. The user can confirm to create it or cancel to abandon the drag.

**Why this priority**: DnD is a fast path that skips the modal entirely, making the confirmation dialog the only opportunity to gate a closed-ticket booking on this path.

**Independent Test**: Can be tested by dragging an Outlook event that maps to a closed ticket and verifying the confirmation dialog appears before any entry is created in Redmine.

**Acceptance Scenarios**:

1. **Given** the user drags an Outlook event onto the calendar, **When** the system resolves the ticket to one that is closed, **Then** a confirmation dialog appears before the entry is created.
2. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the entry is created in Redmine.
3. **Given** the confirmation dialog is open, **When** the user cancels, **Then** no entry is created and the calendar remains unchanged.
4. **Given** the status check fails during DnD, **Then** the entry is created without a dialog — the booking flow is not interrupted by a failed check.

---

### User Story 4 — Copy-Paste of a Time Entry (Priority: P3)

A team member copies an existing time entry and pastes it onto a day in the calendar. If the source entry's ticket is closed, the confirmation dialog appears before the new entry is created in Redmine.

**Why this priority**: Copy-paste is another fast path that bypasses the modal. Without a gate here, a user could silently duplicate an old entry on a closed ticket.

**Independent Test**: Can be tested by copying a time entry linked to a closed ticket, pasting it onto a calendar slot, and verifying the confirmation dialog appears before the entry is created.

**Acceptance Scenarios**:

1. **Given** the user pastes a time entry whose ticket is closed, **When** the paste action is triggered, **Then** the confirmation dialog appears before any API call is made.
2. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the new entry is created in Redmine.
3. **Given** the confirmation dialog is open, **When** the user cancels, **Then** no entry is created.

---

### User Story 5 — AI-Assisted Booking (Priority: P3)

The AI assistant proposes a time entry booking on behalf of the user. If the target ticket is closed, the confirmation dialog appears before the AI submits the entry to Redmine — even when the AI is executing a confirmed tool call.

**Why this priority**: AI bookings may operate at higher speed and with less user visibility than manual actions. The confirmation gate ensures the user always has a chance to intercept a closed-ticket booking, regardless of how it was triggered.

**Independent Test**: Can be tested by asking the AI to book time on a known closed ticket and verifying the confirmation dialog appears before any Redmine write occurs.

**Acceptance Scenarios**:

1. **Given** the AI is about to create a time entry on a closed ticket, **When** the booking tool is invoked, **Then** the confirmation dialog appears and the API call is held until the user responds.
2. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the entry is submitted and the AI receives a success response.
3. **Given** the confirmation dialog is open, **When** the user cancels, **Then** no entry is created and the AI receives a cancellation response to surface to the user.

---

### Edge Cases

- What happens when the closed-ticket check fails or times out for any booking path? The confirmation gate is skipped and the booking proceeds — a failed check must never block a legitimate submission.
- What happens when the user books on an open ticket that becomes closed between the check and the API call? Redmine returns a server error; the existing error-display mechanism surfaces it verbatim.
- What happens if the user triggers multiple rapid bookings on the same closed ticket? Each booking produces its own confirmation dialog; they do not collapse.
- What happens when the AI attempts multiple tool calls in a sequence and one involves a closed ticket? The dialog blocks that specific tool call; the others in the sequence are unaffected.
- What happens in the copy-paste path when the clipboard holds an entry whose ticket status cannot be determined before the paste? The gate is skipped (check failed gracefully); the booking proceeds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect when any booking path is about to create or update a time entry against a Redmine ticket whose status has `is_closed: true`.
- **FR-002**: In the time-entry modal (create and edit), the system MUST display a warning badge beneath the issue field as soon as a closed ticket is detected, before the user attempts to submit.
- **FR-003**: The warning badge in the modal MUST disappear when the issue field is cleared or updated to an open ticket.
- **FR-004**: For ALL booking paths (modal submission, Outlook drag-and-drop, copy-paste, AI tool call), the system MUST show a confirmation dialog before committing any entry against a closed ticket to Redmine. No API write may occur until the user explicitly confirms.
- **FR-005**: The confirmation dialog MUST offer two actions: confirm (proceed with the booking) and cancel (abort the booking and leave existing state unchanged).
- **FR-006**: When the user cancels the confirmation dialog in the modal path, the modal MUST remain open with all field values intact so the user can correct the issue field.
- **FR-007**: When the user cancels the confirmation dialog in a fast path (DnD, copy-paste, AI), no entry MUST be created or modified.
- **FR-008**: If the closed-ticket status check fails or times out on any path, the confirmation gate MUST be skipped and the booking MUST proceed without interruption.
- **FR-009**: If `is_closed` status is already present in the data available to the booking path, the system MUST use it and MUST NOT make an additional network request solely for this check.
- **FR-010**: If `is_closed` is not available, the system MAY perform a single lightweight network request to retrieve it before the booking is committed.
- **FR-011**: All user-visible strings in the warning badge, confirmation dialog title, body, and buttons MUST be available in English and German.
- **FR-012**: If Redmine rejects a submission against a closed ticket server-side (e.g., when the check was skipped due to failure), the server error MUST be surfaced using the existing error-display mechanism.

### Key Entities

- **Time Entry**: A record of time spent on a Redmine issue. Created or updated via one of five booking paths: modal create, modal edit, Outlook DnD, copy-paste, or AI tool call.
- **Redmine Issue (Ticket)**: The work item against which time is booked. Has a `status` with an `is_closed` boolean.
- **Modal Warning Badge**: A transient UI element displayed beneath the issue field in the time-entry modal (create and edit). Gives early feedback before the user submits.
- **Closed-Ticket Confirmation Dialog**: A blocking dialog shown on every booking path when the target ticket is closed. The user must explicitly confirm or cancel before any Redmine write occurs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The modal warning badge appears within 1 second of a closed ticket being selected, with no additional user action required.
- **SC-002**: The confirmation dialog appears for 100% of booking attempts on closed tickets across all five paths; 0% of open-ticket bookings trigger the dialog.
- **SC-003**: Cancelling the confirmation dialog results in 0 entries created or modified in Redmine — no partial writes.
- **SC-004**: A failed closed-ticket status check results in 0 blocked bookings — the gate is silently skipped and the flow continues.
- **SC-005**: All warning and dialog text renders correctly in both English and German locales.
- **SC-006**: The confirmation gate introduces no measurable regression in booking success rate for open-ticket entries.

## Assumptions

- The autocomplete search may or may not already include `is_closed` in its payload; a plan-phase investigation will determine the fetch strategy per booking path.
- The confirmation dialog is a shared component reused across all five paths — a single implementation, not one per path.
- The AI path gates the booking at the tool-execution layer, before the Redmine API call, so the dialog is presented in the same UI as other confirmation prompts.
- Mobile layout is out of scope for this feature.
- The warning badge in the modal uses the existing amber/yellow warning palette (consistent with ArbZG warnings) — no new colour tokens are introduced.
- The target Redmine flavour is Easy Redmine; the `is_closed` field is present in issue status responses.
