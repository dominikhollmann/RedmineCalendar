# Feature Specification: Copy and Paste Time Entries

**Feature Branch**: `004-copy-paste-time-entries`
**Created**: 2026-04-01
**Updated**: 2026-04-12
**Status**: Draft

## Clarifications

### Session 2026-04-12

- Q: Which fields does the paste carry over? → A: All fields — ticket, activity, hours, comment, and start time.
- Q: What is the interaction model for copy-paste? → A: Single-click selects an entry (no modal); double-click or Enter opens the edit modal; Ctrl+C copies the selected entry; clicking/dragging an empty slot with an active clipboard opens a pre-filled new entry form with time from the slot.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy and Paste Time Entries (Priority: P1)

As a user, I want to copy an existing time entry and paste it to another day, so I can quickly replicate recurring bookings without re-entering all the details.

**Why this priority**: Many users work on the same tickets across multiple days. Copy-paste eliminates repetitive data entry for predictable, recurring work patterns.

**Independent Test**: Single-click a time entry to select it, press Ctrl+C, click or drag a time slot on another day, verify the new entry form opens pre-filled with the original ticket, activity, hours, comment, and start time, save it, and confirm the entry appears on the target day.

**Acceptance Scenarios**:

1. **Given** a time entry is visible on the calendar, **When** the user single-clicks it, **Then** the entry is visually highlighted as selected and no modal opens.
2. **Given** a time entry is selected, **When** the user double-clicks it or presses Enter, **Then** the edit modal opens.
3. **Given** a time entry is selected, **When** the user presses Ctrl+C, **Then** the entry is copied to the in-session clipboard and a visual indicator confirms the clipboard state.
4. **Given** an entry has been copied, **When** the user clicks or drags an empty time slot on any day, **Then** the new entry form opens pre-filled with the copied ticket, activity, hours, comment, and start time; the time range comes from the selected slot.
5. **Given** the user confirms the pre-filled form, **When** saved, **Then** a new Redmine time entry is created on the target date and the calendar refreshes to show it.
6. **Given** an entry is copied and the user navigates to a different week, **When** they click or drag an empty slot, **Then** the pre-filled form opens and the entry is created on the correct day in the target week.
7. **Given** the user clicks outside any entry or presses Escape, **When** an entry is selected, **Then** the entry is deselected.

---

### Edge Cases

- **Copy entry to same day**: Allowed — results in a duplicate entry on the same day (useful for splitting a block of work).
- **Paste with no copied entry**: Clicking/dragging an empty slot behaves as today (opens empty new entry form); no paste occurs.
- **Copy a second entry while clipboard is active**: The clipboard is replaced with the newly copied entry.
- **Paste after session ends**: Clipboard state is in-memory only; it does not survive page reload or tab close.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Single-clicking a time entry MUST select it (visual highlight) without opening the edit modal.
- **FR-002**: Double-clicking a selected or unselected entry, or pressing Enter while an entry is selected, MUST open the edit modal (existing behaviour preserved for the open action).
- **FR-003**: Pressing Ctrl+C while an entry is selected MUST copy it to the in-session clipboard; a visual indicator MUST confirm the active clipboard state (e.g. a persistent banner or highlighted border).
- **FR-004**: Clicking or dragging an empty time slot while the clipboard is active MUST open the new entry form pre-filled with the copied entry's ticket, activity, hours, comment, and start time; the time range is taken from the selected slot.
- **FR-005**: Confirming the pre-filled form MUST create a new Redmine time entry on the target date; the calendar MUST refresh immediately.
- **FR-006**: Clicking outside any entry or pressing Escape MUST deselect the currently selected entry.
- **FR-007**: Copying a second entry while the clipboard is active MUST replace the previous clipboard contents.
- **FR-008**: Clicking or dragging an empty slot with no active clipboard MUST behave exactly as today (opens an empty new entry form).

### Key Entities

- **Selected Entry**: Transient UI state — one entry at a time may be selected (highlighted); selecting another entry deselects the previous one.
- **Clipboard**: In-memory only; holds all fields of the copied entry (ticket id, ticket subject, project, activity id, hours, comment, start time); cleared on page reload.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can duplicate an entry to another day in 3 interactions or fewer (click to select → Ctrl+C → click/drag target slot → Save).
- **SC-002**: The pasted entry appears on the calendar immediately after saving, with no manual refresh needed.
- **SC-003**: Clipboard state persists across week navigation within the same browser session.
- **SC-004**: Existing edit workflow (open modal) requires no more than 2 interactions (double-click or click + Enter).

## Assumptions

- Clipboard state is in-memory only (current browser tab session); no cross-tab or cross-device clipboard is required.
- Mobile layout is out of scope, consistent with the overall project constitution.
- The shift from single-click-to-open to single-click-to-select is an intentional UX change; the double-click/Enter path preserves edit access with minimal added friction.
