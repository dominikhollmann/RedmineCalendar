# Feature Specification: Super Lean Time Entry UX

**Feature Branch**: `007-lean-time-entry`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Super Lean UX - Super fast entry of time entries. 1. Select time range 2. Enter text to search for ticket 3. Press enter. No Comment, no Activity. Extensions: Favourites and Last used"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Time Entry (Priority: P1)

A user wants to log time against a Redmine ticket as fast as possible. They select a time range on the calendar, type a few characters to find the right ticket, and press Enter. The entry is saved immediately — no comment or activity field required.

**Why this priority**: This is the entire purpose of the feature — removing all friction from the most frequent user action. Every other story depends on this core flow working first.

**Independent Test**: Can be fully tested by selecting a time slot, searching for a ticket by name or ID, pressing Enter, and verifying the time entry appears on the calendar.

**Acceptance Scenarios**:

1. **Given** the calendar is open, **When** the user drags to select a time range, **Then** a minimal entry form appears immediately with focus on the ticket search field.
2. **Given** the entry form is open, **When** the user types a partial ticket name or number, **Then** matching tickets appear in a dropdown within 1 second.
3. **Given** a ticket is highlighted in the dropdown, **When** the user presses Enter, **Then** the time entry is saved and the form closes without requiring any further input.
4. **Given** the entry form is open, **When** the user presses Escape, **Then** the form closes without saving.

---

### User Story 2 - Favourites (Priority: P2)

A user regularly logs time to the same set of tickets. They want to access their most-used tickets instantly, without typing, so that repeated entries take just two actions: select time range, pick favourite, Enter.

**Why this priority**: Favourites dramatically speed up the workflow for power users who log to recurring tickets daily, but the core flow (Story 1) must work first.

**Independent Test**: Can be fully tested by marking a ticket as a favourite, then opening the entry form and selecting that ticket from the favourites list without typing.

**Acceptance Scenarios**:

1. **Given** the entry form is open, **When** the user has not typed anything, **Then** a list of favourited tickets is displayed immediately.
2. **Given** a ticket is shown in the favourites list, **When** the user selects it and presses Enter, **Then** the time entry is saved without any additional input.
3. **Given** a ticket is shown in search results, **When** the user marks it as a favourite, **Then** it appears at the top of the favourites list on subsequent form opens.
4. **Given** a ticket is in the favourites list, **When** the user removes it from favourites, **Then** it no longer appears in the favourites list.

---

### User Story 3 - Last Used Tickets (Priority: P3)

A user wants to quickly re-log time to tickets they worked on recently, without having to remember or type the ticket name again.

**Why this priority**: Last used provides convenience without requiring any explicit user action (unlike favourites), but it adds less value than favourites for habitual users.

**Independent Test**: Can be fully tested by logging a time entry, reopening the form, and verifying the previously-used ticket appears in the "last used" section.

**Acceptance Scenarios**:

1. **Given** the entry form is open, **When** no search text has been entered, **Then** the most recently used tickets are shown below or alongside the favourites list.
2. **Given** the user saved a time entry against a ticket, **When** they open the form again, **Then** that ticket appears in the last used list.
3. **Given** the last used list is displayed, **When** the user selects a ticket and presses Enter, **Then** the time entry is saved immediately.

---

### Edge Cases

- What happens when the ticket search returns no results? (Assumed: "No results" message shown in dropdown)
- What happens if the user selects a time range that overlaps an existing entry? (Assumed: allowed — no overlap check performed)
- How many favourites can a user have? (Assumed: no hard limit, scrollable list)
- How many "last used" tickets are shown? (Assumed: 8 most recent)
- What happens if the Redmine connection is unavailable when searching? (Assumed: inline error shown in dropdown)
- A ticket may appear in both Favourites and Last Used simultaneously — the two lists are independent with no deduplication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to initiate a time entry by selecting a time range on the calendar.
- **FR-002**: The system MUST display a minimal entry form with a ticket search field as the only required input.
- **FR-003**: The system MUST search Redmine tickets in real time as the user types, showing results within 1 second.
- **FR-004**: The system MUST save the time entry when the user presses Enter with a ticket selected, without requiring a comment or activity.
- **FR-005**: The system MUST close the entry form after a successful save.
- **FR-011**: If the save API call fails, the system MUST display an inline error message inside the form and keep the form open so the user can retry without re-selecting a time range.
- **FR-006**: The system MUST display the user's favourited tickets when the search field is empty.
- **FR-007**: The system MUST allow users to add and remove tickets from their favourites list.
- **FR-008**: The system MUST display the most recently used tickets (up to 8) when the search field is empty.
- **FR-009**: The system MUST persist favourites and last used tickets across sessions.
- **FR-010**: The system MUST allow the user to dismiss the entry form without saving by pressing Escape.

### Key Entities

- **Time Entry**: A record of time spent, linked to a Redmine ticket, defined by start time and end time (derived from the selected range). No comment or activity required.
- **Ticket**: A Redmine issue identified by ID and title, searchable by partial name or number.
- **Favourite**: A user-defined shortlist of tickets for rapid re-selection, persisted locally.
- **Last Used**: An automatically maintained list of the 8 most recently logged-against tickets, persisted locally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a time entry from calendar selection to saved entry in under 10 seconds.
- **SC-002**: Ticket search results appear within 1 second of the user stopping typing.
- **SC-003**: A user can log a repeat entry against a favourite ticket in under 5 seconds (select range → pick favourite → Enter).
- **SC-004**: The entry form requires zero mandatory fields beyond ticket selection (no comment, no activity).
- **SC-005**: Favourites and last used tickets persist correctly across browser sessions.

## Clarifications

### Session 2026-04-12

- Q: What happens when the API call to save a time entry fails? → A: Show inline error inside the form; form stays open for retry.
- Q: If a ticket appears in both Favourites and Last Used, is it shown once or twice? → A: Shown in both sections independently — duplication is allowed.

## Assumptions

- The existing Redmine API integration and authentication setup are reused without changes.
- Comment and activity fields are completely absent from this form (not hidden, not optional — not present).
- Favourites and last used are stored in `localStorage`, consistent with existing preferences in this project.
- This feature fully replaces the existing time entry form. The old form is removed.
- Mobile support is out of scope for this feature.
- The time range is initially set by selecting on the calendar. The form exposes editable start time and end time (or duration) inputs so the user can fine-tune the range after the slot selection — manual time adjustment within the open form is supported.
- The form uses a three-column layout (search + ticket info | last used | favourites). The Last Used and Favourites columns remain visible during search — they are not hidden when the user types. This differs from the original single-column concept but is the implemented and accepted design.
