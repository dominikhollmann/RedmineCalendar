# Feature Specification: Closed Ticket Booking Gate

**Feature Branch**: `040-closed-ticket-warning`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Warn user when booking time on a closed Redmine ticket; confirm dialog gate on all booking paths (modal, Outlook DnD, copy-paste, AI)"

## Clarifications

### Session 2026-06-13

- Q: During Outlook DnD, if `is_closed` is not already known and a network fetch is required, what does the user see while waiting? → A: Block the drop with a brief loading indicator until the status check resolves; then show the confirmation dialog (if closed) or complete the booking (if open). If the check times out or fails, skip the gate and complete the booking.
- Q: Should the closed-ticket confirmation gate also apply when a user drags an existing time entry to a new slot within the calendar (rescheduling)? → A: Yes — same gate applies. The rescheduling write goes to Redmine regardless of whether the entry is new or existing, so a closed ticket must be gated the same way.

## User Scenarios & Testing _(mandatory)_

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

The planning view shows Outlook events in a panel on the right side of the screen. When an Outlook event has an identified ticket that is already closed, a ⚠️ badge appears on that event in the planning view panel — alerting the user before they even attempt to drag. If the user drags the event onto the calendar anyway, a confirmation dialog appears before the entry is committed to Redmine. There are no badges placed on the resulting time-entry booking.

**Why this priority**: DnD is a fast path that skips the modal entirely. The badge on the Outlook event in the planning view is the early warning (visible before the drag); the confirmation dialog is the booking gate.

**Independent Test**: Can be tested with a known closed-ticket Outlook event in the planning view. Verify (a) the ⚠️ badge appears on the Outlook event in the right panel with a tooltip, (b) dragging it triggers the confirmation dialog before any entry is created, and (c) cancelling leaves the calendar unchanged with no entry created.

**Acceptance Scenarios**:

1. **Given** the planning view is open and an Outlook event resolves to a closed ticket, **When** the panel renders that event, **Then** a ⚠️ badge is shown on the Outlook event in the planning view panel.
2. **Given** the user hovers over the ⚠️ badge on the Outlook event, **Then** a tooltip appears explaining that the ticket is closed.
3. **Given** the user drags an Outlook event onto the calendar, **When** the drop lands and `is_closed` status is already known, **Then** the confirmation dialog appears immediately (if closed) or the booking completes directly (if open).
4. **Given** the user drags an Outlook event onto the calendar, **When** the drop lands and a status fetch is required, **Then** a brief loading indicator is shown and the booking is held until the fetch resolves; then the confirmation dialog appears (if closed) or the booking completes (if open or check failed).
5. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the entry is created in Redmine — no badge is placed on the resulting calendar booking.
6. **Given** the confirmation dialog is open, **When** the user cancels, **Then** no entry is created and the calendar remains unchanged.
7. **Given** the status check fails or times out during the DnD drop, **Then** the loading indicator clears and the booking completes without a dialog.
8. **Given** the status check fails during planning view load, **Then** no badge is shown on the Outlook event and the drag-to-book flow proceeds without a dialog.

---

### User Story 4 — Copy-Paste of a Time Entry (Priority: P3)

A team member copies an existing time entry and pastes it onto a day in the calendar. The modal opens pre-filled with the copied entry's data. If the source ticket is closed, the warning badge appears beneath the issue field immediately — the same as manual selection. When the user clicks Submit, the confirmation dialog appears before any Redmine write occurs.

**Why this priority**: Copy-paste is a common shortcut for recurring bookings. A user pasting an old entry from a sprint that has since closed could unknowingly create an entry on a closed ticket without the badge and gate.

**Independent Test**: Can be tested by copying a time entry linked to a closed ticket, pasting it onto a calendar slot, verifying the warning badge appears in the pre-filled modal, and verifying the confirmation dialog appears on submit.

**Acceptance Scenarios**:

1. **Given** the user pastes a time entry whose ticket is closed, **When** the modal opens pre-filled, **Then** the warning badge appears beneath the issue field immediately.
2. **Given** the pre-filled modal is open with the closed-ticket badge visible, **When** the user clicks Submit, **Then** the confirmation dialog appears before any API call is made.
3. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the new entry is created in Redmine.
4. **Given** the confirmation dialog is open, **When** the user cancels, **Then** the dialog closes and the user is returned to the modal with all fields intact.

---

### User Story 5 — AI-Assisted Booking (Priority: P3)

The AI assistant proposes a time entry and opens the modal pre-filled with the suggested data. If the target ticket is closed, the warning badge appears beneath the issue field — the same as any other modal pre-fill. When the user clicks Submit to accept the AI proposal, the confirmation dialog appears before any Redmine write occurs.

**Why this priority**: AI proposals may suggest tickets the user did not consciously choose. The badge gives the user an early signal while reviewing the pre-filled form; the confirmation dialog is the final gate before the write.

**Independent Test**: Can be tested by asking the AI to book time on a known closed ticket, verifying the badge appears in the pre-filled modal, and verifying the confirmation dialog appears when the user submits.

**Acceptance Scenarios**:

1. **Given** the AI pre-fills the modal with a closed ticket, **When** the modal opens, **Then** the warning badge appears beneath the issue field immediately.
2. **Given** the pre-filled modal is open with the closed-ticket badge visible, **When** the user clicks Submit, **Then** the confirmation dialog appears before any API call is made.
3. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the entry is submitted and the AI flow completes normally.
4. **Given** the confirmation dialog is open, **When** the user cancels, **Then** no entry is created and the user is returned to the modal with all fields intact.

---

### User Story 6 — Rescheduling an Existing Entry by Dragging Within the Calendar (Priority: P3)

A team member drags an existing time entry to a different day or time slot directly on the calendar. Because this is a Redmine update (not a new create), no modal opens. If the entry's ticket is closed, the same gate as Outlook DnD applies: a brief loading indicator holds the drop, then a confirmation dialog appears before the reschedule is committed to Redmine. Cancelling snaps the entry back to its original position.

**Why this priority**: Rescheduling is a common calendar action and writes to Redmine just like any other booking. Without this gate, a user could silently update an entry on a closed ticket.

**Independent Test**: Can be tested by dragging an existing calendar entry whose ticket is closed to a new slot, verifying the confirmation dialog appears before any Redmine write, and verifying cancel restores the original position.

**Acceptance Scenarios**:

1. **Given** the user drags an existing time entry to a new slot, **When** the drop lands and the ticket is closed, **Then** a brief loading indicator appears and the reschedule is held until the status check resolves, then the confirmation dialog appears.
2. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the entry is updated in Redmine at the new time slot.
3. **Given** the confirmation dialog is open, **When** the user cancels, **Then** the entry snaps back to its original position and no Redmine write occurs.
4. **Given** the status check fails or times out during the rescheduling drop, **Then** the reschedule completes without a dialog.

---

### Edge Cases

- What happens when the closed-ticket check fails or times out for any booking path? The confirmation gate is skipped and the booking proceeds — a failed check must never block a legitimate submission. For the planning view, a failed check means no ⚠️ badge is shown on the Outlook event.
- What happens when the user books on an open ticket that becomes closed between the check and the API call? Redmine returns a server error; the existing error-display mechanism surfaces it verbatim.
- What happens if the user triggers multiple rapid bookings on the same closed ticket? Each booking produces its own confirmation dialog; they do not collapse.
- What happens when the AI attempts multiple tool calls in a sequence and one involves a closed ticket? The dialog blocks that specific tool call; the others in the sequence are unaffected.
- What happens in the copy-paste path when the clipboard holds an entry whose ticket status cannot be determined before the paste? The gate is skipped (check failed gracefully); the booking proceeds.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST detect when any booking path is about to create or update a time entry against a Redmine ticket whose status has `is_closed: true`. Booking paths are: modal create, modal edit, Outlook DnD, within-calendar rescheduling DnD, copy-paste, and AI tool call.
- **FR-002**: In the time-entry modal — whether opened for manual create, edit, copy-paste pre-fill, or AI pre-fill — the system MUST display a warning badge beneath the issue field as soon as a closed ticket is detected, before the user attempts to submit.
- **FR-003**: The warning badge in the modal MUST disappear when the issue field is cleared or updated to an open ticket.
- **FR-004**: For ALL booking paths (modal submission, Outlook DnD, within-calendar rescheduling DnD, copy-paste, AI tool call), the system MUST show a confirmation dialog before committing any entry against a closed ticket to Redmine. No API write may occur until the user explicitly confirms.
- **FR-005**: The confirmation dialog MUST offer two actions: confirm (proceed with the booking) and cancel (abort the booking and leave existing state unchanged).
- **FR-006**: When the user cancels the confirmation dialog from any modal path (manual create, edit, copy-paste, AI), the modal MUST remain open with all field values intact so the user can correct the issue field.
- **FR-007**: When the user cancels the confirmation dialog on the Outlook DnD path (which bypasses the modal), no entry MUST be created or modified and the calendar MUST remain unchanged.
- **FR-007a**: In the planning view, Outlook events whose resolved ticket has `is_closed: true` MUST display a ⚠️ badge with a localised tooltip. This badge appears on the source Outlook event in the right-side panel, not on any calendar booking.
- **FR-008**: On the Outlook DnD path, if `is_closed` is not already known when the drop lands, the system MUST display a brief loading indicator and hold the booking until the status check resolves. If the check fails or times out, the indicator MUST clear and the booking MUST proceed without a dialog. On all other paths, a failed or timed-out check MUST similarly be skipped silently.
- **FR-009**: If `is_closed` status is already present in the data available to the booking path, the system MUST use it and MUST NOT make an additional network request solely for this check.
- **FR-010**: If `is_closed` is not available, the system MAY perform a single lightweight network request to retrieve it before the booking is committed.
- **FR-011**: All user-visible strings in the warning badge, confirmation dialog title, body, and buttons MUST be available in English and German.
- **FR-012**: If Redmine rejects a submission against a closed ticket server-side (e.g., when the check was skipped due to failure), the server error MUST be surfaced using the existing error-display mechanism.

### Key Entities

- **Time Entry**: A record of time spent on a Redmine issue. Created or updated via one of six booking paths: modal create, modal edit, Outlook DnD, within-calendar rescheduling DnD, copy-paste, or AI tool call.
- **Redmine Issue (Ticket)**: The work item against which time is booked. Has a `status` with an `is_closed` boolean.
- **Modal Warning Badge**: A transient UI element displayed beneath the issue field in the time-entry modal (create and edit). Gives early feedback before the user submits.
- **Closed-Ticket Confirmation Dialog**: A blocking dialog shown on every booking path when the target ticket is closed. The user must explicitly confirm or cancel before any Redmine write occurs.
- **Planning View Outlook Event Badge**: A ⚠️ badge rendered on an Outlook event in the planning view's right-side panel when its resolved ticket is closed. Includes a hover tooltip. Appears when the panel loads — before any drag gesture. No badge is placed on calendar bookings (time entries) on any path.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The modal warning badge appears within 1 second of a closed ticket being selected, with no additional user action required.
- **SC-002**: The confirmation dialog appears for 100% of booking attempts on closed tickets across all six paths; 0% of open-ticket bookings trigger the dialog.
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
