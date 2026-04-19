# Feature Specification: Entry UX Improvements

**Feature Branch**: `016-entry-ux-improvements`  
**Created**: 2026-04-18  
**Status**: Draft  
**Input**: User description: "small ux improvements: add comment field to time entries, but optional. not integrated in lean ux flow (hitting enter). add link to redmine ticket in time entries, e.g. make ticket id/title a hyperlink. allow searching for tickets with #<ticket number>"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Tickets by Number (Priority: P1)

A user wants to quickly find a specific Redmine ticket by its number. They type `#123` into the issue search field and the system filters results to show the matching ticket. This is the fastest path to selecting a known ticket and provides the highest daily-use value.

**Why this priority**: Users frequently know the ticket number from standup, a Redmine notification, or a conversation. Searching by number is faster than scanning by title and removes friction from the most common workflow.

**Independent Test**: Can be fully tested by typing `#` followed by a ticket number into the issue search field and verifying the correct ticket appears in results.

**Acceptance Scenarios**:

1. **Given** the time entry form is open, **When** the user types `#142` into the issue search field, **Then** the search results show ticket 142 filtered by issue ID only (no subject search fallback). If the ticket does not exist, no results are shown.
2. **Given** the time entry form is open, **When** the user types `#99999` (a non-existent ticket), **Then** the search results show no matches (empty list, no fallback to subject search)
3. **Given** the time entry form is open, **When** the user types `#14` (partial number), **Then** the search results show the ticket with ID 14 if it exists (exact ID match, not prefix search)
4. **Given** the time entry form is open, **When** the user types a plain number like `142` (without `#`), **Then** the existing behaviour is preserved: try ID lookup first, fall back to subject search if not found
5. **Given** the time entry form is open, **When** the user types a search term without `#` (e.g., `login page`), **Then** search behaviour remains unchanged (text-based search by subject)

---

### User Story 2 - Ticket Hyperlink in Calendar Entries (Priority: P2)

A user sees a time entry on the calendar and wants to quickly navigate to the corresponding Redmine ticket for more context. The ticket ID and title displayed on the calendar entry are clickable and open the Redmine ticket in a new browser tab.

**Why this priority**: Navigating between the calendar and Redmine is a frequent context switch. A direct link eliminates the need to manually search for the ticket in Redmine and saves significant time across many daily interactions.

**Independent Test**: Can be fully tested by hovering over a calendar entry, clicking the ticket ID or title, and verifying that the correct Redmine ticket page opens in a new tab.

**Acceptance Scenarios**:

1. **Given** a time entry is displayed on the calendar, **When** the user clicks the ticket ID or title text, **Then** the corresponding Redmine ticket page opens in a new browser tab
2. **Given** a time entry is displayed on the calendar, **When** the user hovers over the ticket ID or title, **Then** the cursor changes to indicate a clickable link
3. **Given** a time entry is displayed on the calendar, **When** the user clicks the ticket link, **Then** the Redmine ticket opens in a new tab (the entry may also be selected — this is an acceptable usability tradeoff)

---

### User Story 3 - Optional Comment Field (Priority: P3)

A user wants to add a note to a time entry (e.g., "code review for PR #45" or "meeting notes sent"). The time entry form includes an optional comment field placed below the ticket information box (after start time and end time fields). The comment field participates in the lean UX flow — pressing Enter submits the form.

**Why this priority**: Comments add context to time entries and are already displayed on the calendar when present. Exposing the field in the form completes an existing capability. Lower priority because it is optional and does not block core time-tracking workflows.

**Independent Test**: Can be fully tested by opening the time entry form, typing a comment, saving, and verifying the comment appears on the calendar entry and is persisted to Redmine.

**Acceptance Scenarios**:

1. **Given** the time entry form is open, **When** the user types text into the comment field and saves, **Then** the comment is stored with the time entry and displayed on the calendar
2. **Given** the time entry form is open, **When** the user leaves the comment field empty and saves, **Then** the time entry is saved without a comment (field is fully optional)
3. **Given** the user is in the comment field, **When** the user presses Enter, **Then** the form is submitted (consistent with lean UX flow)
4. **Given** the user is editing an existing time entry that has a comment, **When** the form opens, **Then** the comment field is pre-filled with the existing comment
5. **Given** the user is editing an existing time entry, **When** the user clears the comment field and saves, **Then** the comment is removed from the time entry

---

### Edge Cases

- What happens when the user types only `#` without a number? The search field should show no special behaviour (treat as empty or show all results, matching current empty-search behaviour).
- What happens when the Redmine base URL is not configured? Ticket hyperlinks should not be rendered if the Redmine URL is unavailable.
- What happens when a time entry has no associated ticket (e.g., a general time entry)? No hyperlink is shown; the entry displays as it does today.
- What happens when the user pastes a comment with very long text? The comment field should accept the text without truncation; display on the calendar may be truncated visually.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The issue search field MUST support `#<number>` syntax to filter results by ticket ID
- **FR-002**: When search input starts with `#`, the system MUST match against ticket IDs rather than (or in addition to) ticket subjects
- **FR-003**: The `#` search MUST perform an exact ticket ID lookup (e.g., `#14` fetches ticket 14 only).
- **FR-004**: Calendar time entries MUST display the ticket ID and title as a clickable hyperlink pointing to the Redmine ticket page
- **FR-005**: Ticket hyperlinks MUST open in a new browser tab
- **FR-006**: Clicking a ticket hyperlink MUST open the Redmine ticket in a new tab. The entry MAY also be selected (acceptable tradeoff for usability)
- **FR-007**: The time entry form MUST include an optional comment text field, placed below the ticket information box (after start/end time fields)
- **FR-008**: The comment field MUST participate in the lean UX flow (pressing Enter in the comment field submits the form, consistent with other fields)
- **FR-009**: Comments MUST be persisted to Redmine when saving time entries
- **FR-010**: When editing an existing time entry, the comment field MUST be pre-filled with the current comment value
- **FR-011**: Ticket hyperlinks MUST NOT be rendered when the Redmine base URL is not configured

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate a known ticket by number in under 3 seconds using `#<number>` search
- **SC-002**: Users can navigate from a calendar entry to the corresponding Redmine ticket in a single click
- **SC-003**: Users can add or edit a comment on a time entry without disrupting the existing keyboard-driven save workflow
- **SC-004**: All three improvements work independently -- each can be used without the others being present

## Assumptions

- The Redmine API already returns ticket IDs in search/list responses (confirmed: issue ID is available in current API responses)
- The Redmine ticket URL follows the pattern `{baseUrl}/issues/{id}` which is the standard Redmine URL scheme
- The comment field maps to the existing `comments` field in the Redmine time entry API (already sent as empty string today)
- The existing lean UX Enter-key flow is scoped to the issue search field and activity selector; adding a new field that ignores Enter does not break existing behaviour
- The clipboard/paste feature (004) should carry over comments when copying time entries (already includes comment in clipboard data)
