# Feature Specification: Copy and Paste Time Entries

**Feature Branch**: `004-copy-paste-entries`
**Created**: 2026-04-01
**Updated**: 2026-04-12
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy and Paste Time Entries (Priority: P1)

As a user, I want to copy an existing time entry and paste it to another day, so I can quickly replicate recurring bookings without re-entering all the details.

**Why this priority**: Many users work on the same tickets across multiple days. Copy-paste eliminates repetitive data entry for predictable, recurring work patterns.

**Independent Test**: Right-click (or use a copy action on) a time entry, navigate to a different day on the calendar, paste, and verify a new entry appears with the same ticket, activity, hours, and comment as the original, on the target day.

**Acceptance Scenarios**:

1. **Given** a time entry is visible on the calendar, **When** the user invokes the copy action on it, **Then** the entry is marked as copied (visual indicator).
2. **Given** an entry has been copied, **When** the user clicks on a different day in the calendar, **Then** a paste action becomes available for that day.
3. **Given** the user invokes the paste action on a target day, **When** confirmed, **Then** a new time entry is created in Redmine on the target date with the same ticket, activity, hours, and comment as the original.
4. **Given** a paste is performed, **When** the new entry is saved, **Then** the calendar refreshes and the pasted entry appears on the target day.
5. **Given** an entry is pasted, **When** it carries a start time, **Then** the pasted entry retains the same start time on the new day.
6. **Given** the user copies an entry and navigates to a different week, **When** they paste, **Then** the entry is created on the correct day in the target week.

---

### Edge Cases

- **Copy entry to same day**: Should be allowed — results in a duplicate entry on the same day (useful for splitting a block of work).
- **Paste with no copied entry**: The paste action must not be available if nothing has been copied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The user MUST be able to copy any visible time entry on the calendar.
- **FR-002**: After copying an entry, the user MUST be able to paste it onto any day visible in the current or any navigated-to week.
- **FR-003**: A pasted entry MUST be created as a new Redmine time entry on the target date, with the same ticket, activity, hours, and comment as the original.
- **FR-004**: A visual indicator MUST be shown on the copied entry while it is in the clipboard state.
- **FR-005**: The paste action MUST NOT be available if no entry has been copied.

### Key Entities

- **Copied Entry**: A transient clipboard state holding a reference to a time entry; exists only within the current browser session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can duplicate an entry to another day in 2 interactions or fewer (copy → paste on target day).
- **SC-002**: The pasted entry appears on the calendar immediately after saving, with no manual refresh needed.
- **SC-003**: Copy-paste clipboard state persists across week navigation within the same browser session.

## Assumptions

- Clipboard state is in-memory only (current browser tab session); no cross-tab or cross-device clipboard is required.
- Mobile layout is out of scope, consistent with the overall project constitution.
