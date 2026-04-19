# Feature Specification: Mandatory Time Entry Fields

**Feature Branch**: `018-mandatory-time-fields`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "start/end/date are mandatory when saving time entries"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Time Entries Always Have Complete Time Data (Priority: P1)

Every time entry saved in Redmine must have a date, start time, and end time (or duration). This ensures all calendar entries display correctly with proper positioning and that time tracking data is complete and accurate.

**Why this priority**: Incomplete time entries (missing start/end) display poorly on the calendar and make time tracking unreliable. Enforcing completeness at save time prevents data quality issues.

**Independent Test**: Try to save a time entry with missing date, start time, or end time — verify the form shows a validation error and prevents saving.

**Acceptance Scenarios**:

1. **Given** a user fills in a ticket and hours but leaves start time empty, **When** they click Save, **Then** the form shows a validation error and does not save.
2. **Given** a user fills in a ticket and start time but leaves end time empty, **When** they click Save, **Then** the form shows a validation error and does not save.
3. **Given** a user fills in all fields (ticket, date, start time, end time/duration), **When** they click Save, **Then** the entry is saved successfully.
4. **Given** a user creates an entry by clicking a calendar slot, **When** the form opens, **Then** the date and start time are pre-filled from the click position.
5. **Given** the AI chatbot creates a time entry, **When** it opens the modal, **Then** all required fields (date, start time, hours) are pre-filled.
6. **Given** a user drags to create an entry on the calendar, **When** the form opens, **Then** date, start time, and end time are all pre-filled from the drag range.

---

### Edge Cases

- What about existing entries in Redmine that have no start/end time? (Assumed: existing entries can still be displayed and edited; validation only applies when saving new or modified entries.)
- What if the Redmine API accepts entries without start time? (Assumed: the validation is client-side in the form; the app enforces it regardless of what Redmine allows.)
- Two of three values (start, end, duration) are sufficient — the third can be computed. (Assumed: the form auto-computes the missing value as it does today.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-000**: The time entry form MUST NOT allow saving when no ticket is selected — show a clear error message.
- **FR-001**: The time entry form MUST NOT allow saving when the date field is empty.
- **FR-002**: The time entry form MUST NOT allow saving when the start time field is empty.
- **FR-003**: The time entry form MUST NOT allow saving when both end time and duration are missing (at least one must be present to compute the other).
- **FR-004**: Validation errors MUST be shown inline with a clear message indicating which field is missing.
- **FR-005**: The validation MUST apply to all save paths: manual form submission, AI chatbot-initiated saves, and any programmatic saves.
- **FR-006**: Existing time entries without start/end time MUST still be viewable and editable — validation applies only on save.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero time entries can be saved without a date, start time, and duration/end time.
- **SC-002**: Users see a clear error message within 1 second when attempting to save an incomplete entry.
- **SC-003**: All pre-fill paths (calendar click, calendar drag, AI chatbot) populate mandatory fields automatically.

## Assumptions

- The existing form already computes end time from start + duration and vice versa. This feature adds validation that at least start + one of (end, duration) are present.
- The date field was added to the modal in feature 015/016. It defaults to today or the clicked calendar date.
- This is client-side validation only — no changes to the Redmine API integration.
- The AI chatbot already defaults start_time to working hours start (feature 015). This validation ensures that default is always applied.
