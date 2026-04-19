# Feature Specification: Weekly Calendar Time Tracking

**Feature Branch**: `001-calendar-time-entries`
**Created**: 2026-03-31
**Status**: Draft
**Input**: User description: "Ich benutze Easy Redmine als Ticket-Management-System aber auch zur
Arbeitszeiterfassung, indem ich Arbeitszeiten auf die Tickets buche. Leider hat Redmine dafür
keine sinnvolle Kalenderansicht. Die möchte ich nun selber bauen. Ich stelle mir das ähnlich
wie im Outlook-Kalender vor: Man hat eine viertel-Stunden-genaue Kalenderansicht der Woche und
kann dort Zeiteinträge hinzufügen. Der User muss dann noch ein Ticket aussuchen, auf das die
Zeit gebucht wird."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Weekly Time Entries (Priority: P1)

A user opens the calendar and immediately sees all their logged time entries for the current week
laid out in a week grid. Each entry shows the associated ticket name and its duration. The user
can scroll through the day's hours and navigate to any other week using previous/next controls.
This gives them an at-a-glance overview of how their working week is distributed across tickets —
something Redmine's list-based views do not provide.

**Why this priority**: Without a readable view of existing entries the calendar delivers zero
value. All other user stories build on this foundation.

**Independent Test**: Configure Redmine API credentials, open the app, and verify that entries
logged this week in Redmine appear as visual blocks in the correct day column and time slot. Can
be fully demonstrated without any create/edit functionality.

**Acceptance Scenarios**:

1. **Given** the user has time entries logged in Redmine for the current week,
   **When** they open the calendar,
   **Then** each entry appears as a block in the correct day column and quarter-hour time slot,
   showing the ticket subject and duration.

2. **Given** the calendar is showing the current week,
   **When** the user clicks the "next week" control,
   **Then** the calendar reloads and shows entries for the following week.

3. **Given** no entries exist for a given week,
   **When** the user navigates to that week,
   **Then** the calendar displays an empty grid with no error state.

4. **Given** the Redmine API is unreachable,
   **When** the user loads the calendar,
   **Then** the calendar shows a clear error message and prompts the user to retry.

---

### User Story 2 - Log a New Time Entry (Priority: P2)

A user clicks on an empty slot in the calendar (or drags across multiple quarter-hour slots)
to indicate the time range they want to log. A dialog or side panel opens, pre-filled with the
selected start time and duration. The user searches for and selects the Redmine ticket/issue they
worked on, optionally adds a comment, selects the work activity type, and submits. The new entry
immediately appears in the calendar.

**Why this priority**: This is the core action the application exists to support. Viewing
without being able to log is read-only and covers only partial value.

**Independent Test**: With an empty week (or a test Redmine project), click a slot, fill in a
ticket and activity, submit, and verify the entry appears in the calendar and exists in Redmine's
time entries for that issue.

**Acceptance Scenarios**:

1. **Given** the user clicks a single empty quarter-hour slot,
   **When** the entry form opens,
   **Then** the start time is pre-set to the clicked slot and the duration defaults to
   15 minutes (one slot).

2. **Given** the user drags from 09:00 to 10:30 on a day column,
   **When** they release the drag,
   **Then** the entry form opens with start time 09:00 and duration 90 minutes.

3. **Given** the entry form is open,
   **When** the user types at least 2 characters in the ticket search field,
   **Then** a list of matching Redmine issues (by ID or title) appears within 2 seconds.

4. **Given** a ticket is selected and all required fields are filled,
   **When** the user submits the form,
   **Then** the time entry is created in Redmine, the dialog closes, and the new entry block
   appears in the calendar at the correct position.

5. **Given** the submission fails (e.g., network error, API validation error),
   **When** the user attempts to save,
   **Then** an error message is displayed describing the issue, and the form stays open so the
   user can correct or retry.

---

### User Story 3 - Edit or Delete an Existing Time Entry (Priority: P3)

A user clicks on an existing time entry block in the calendar. The same entry form/dialog opens,
pre-filled with all current values. The user can update the duration, ticket, activity type,
or comment and save changes. Alternatively they can delete the entry. The calendar updates
immediately to reflect the change.

**Why this priority**: Corrections to logged time are a routine workflow need. Without this,
mistakes require the user to go back to the Redmine UI — defeating the purpose of the calendar.

**Independent Test**: Click an existing entry, change its duration or comment, save, and verify
the entry block in the calendar and the record in Redmine both reflect the updated values. Then
delete it and verify it disappears from both.

**Acceptance Scenarios**:

1. **Given** a time entry block is visible in the calendar,
   **When** the user clicks it,
   **Then** the entry form opens pre-filled with the entry's current start time, duration,
   ticket, activity type, and comment.

2. **Given** the entry form is open with an existing entry,
   **When** the user changes the duration and saves,
   **Then** the entry block in the calendar resizes to reflect the new duration, and the change
   is persisted in Redmine.

3. **Given** the entry form is open with an existing entry,
   **When** the user clicks "Delete" and confirms the deletion prompt,
   **Then** the entry block is removed from the calendar and the record is deleted in Redmine.

4. **Given** an existing entry block is visible in the calendar,
   **When** the user drags its bottom edge downward to the next quarter-hour boundary,
   **Then** the block grows to reflect the new duration, the change is saved to Redmine
   immediately, and no form dialog is opened.

---

### Edge Cases

- **Overlapping entries**: Multiple entries logged in the same time range appear side-by-side
  in the same day column, each with reduced width — none are hidden.
- **Very short entries** (< 15 minutes): Entries shorter than one quarter-hour slot are
  displayed at a minimum height of one slot (15 min visual height) to remain clickable.
- **Entries spanning midnight**: Entries that start on one calendar day and end on the next
  are split at midnight and shown as two adjacent blocks on consecutive day columns.
- **Closed/archived tickets**: When a ticket selected during edit is subsequently archived in
  Redmine, it MUST still appear in the read-only view; editing the entry MUST allow re-selection.
- **Large number of entries**: Days with many entries (> 10) MUST remain usable without
  horizontal overflow breaking the layout.
- **Redmine authentication expiry**: If the API session/token expires mid-session, the user
  MUST be informed and prompted to re-authenticate rather than receiving a cryptic error.
- What happens when a time entry spans midnight (e.g., 23:00-01:00)? (Resolved: the calendar splits it into two visual segments, one for each day.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a weekly calendar grid with columns for each day
  (Monday–Sunday) and rows at 15-minute intervals across the working day (default: 07:00–19:00,
  scrollable to show 00:00–23:59).
- **FR-002**: System MUST fetch the authenticated user's time entries from Redmine for the
  displayed week and render each as a positioned block within the grid.
- **FR-003**: System MUST allow the user to navigate to the previous week, the next week, and
  directly to the current week ("Today") using on-screen controls.
- **FR-004**: Users MUST be able to initiate a new time entry by clicking on an empty grid slot
  or by click-and-dragging across multiple quarter-hour slots to set start time and duration.
- **FR-005**: System MUST present an entry form containing: start date/time (editable),
  duration (editable in hours and minutes), ticket search & selection, activity type selection,
  and an optional comment field.
- **FR-006**: Users MUST be able to search for Redmine issues by ID or by title text; search
  results MUST be scoped to projects the authenticated user has access to.
- **FR-007**: System MUST create the time entry in Redmine via the REST API upon form submission
  and display the new entry block in the calendar immediately on success.
- **FR-008**: System MUST display clear success or error feedback after every create, update,
  or delete operation.
- **FR-009**: Users MUST be able to open an existing time entry to view its full details.
- **FR-010**: Users MUST be able to edit all fields of an existing time entry and save changes
  back to Redmine. Users MUST also be able to resize an existing entry by dragging either its
  bottom edge (changes end time / duration) or its top edge (changes start time) to a new
  quarter-hour boundary, which updates the entry and saves immediately. Users MAY also drag an
  existing entry block to a different day column or time slot (drag-to-move) to reschedule it;
  the change is saved immediately without opening the edit form.
- **FR-011**: Users MUST be able to delete an existing time entry, with a confirmation step
  before the deletion is executed.
- **FR-012**: System MUST display the total logged hours per day as a summary in each day
  column header.
- **FR-013**: System MUST authenticate with Redmine using a user-supplied API key. The API
  key and Redmine URL MUST be stored in a encrypted browser storage. On first load (cookie absent), the
  app MUST show a settings screen prompting for these values before any Redmine API call is made.
- **FR-014**: The settings screen MUST allow the user to update the API key or Redmine URL at
  any time (accessible via a settings control in the calendar view).

### Key Entities

- **Time Entry**: A logged work period — attributes: date, start time, duration (hours +
  minutes), associated issue, activity type, optional comment, Redmine entry ID.
- **Issue / Ticket**: A Redmine issue that time is booked to — attributes: ID, subject/title,
  project name. Used for search and association; full issue data is not stored locally.
- **Activity**: A Redmine time-entry activity category (e.g., Development, Meeting,
  Documentation). The list of available activities is fetched from Redmine.
- **Week View**: The current display context — defined by a start date (Monday) and end date
  (Sunday), driving which time entries are fetched and shown.

### Notes

- **Event card content**: Each time entry block on the calendar displays the ticket ID/subject
  (primary, bold) and the time range (secondary, muted). Comments are rendered on the event card
  when present (added by feature 016).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view all their time entries for any given week with no more than one
  navigation action (selecting a week) beyond opening the application.
- **SC-002**: The calendar renders the current week's time entries within 3 seconds of page load
  on a standard broadband connection.
- **SC-003**: Users can complete the full workflow of logging a new time entry — from calendar
  interaction to confirmed submission — in under 60 seconds.
- **SC-004**: Users can find and select any accessible Redmine ticket in the entry form within
  30 seconds using the search field.
- **SC-005**: Time entry durations and dates displayed in the calendar match Redmine's stored
  records exactly (zero data discrepancy).
- **SC-006**: All interactive elements (slot click, drag, entry click) respond with visible
  feedback within 200 ms, regardless of network latency.

## Assumptions

- The application is used by a single user per browser session; multi-user or shared-calendar
  views are out of scope for v1.
- The user's Redmine instance is Easy Redmine (Redmine-compatible REST API); the application
  targets Redmine REST API v1 endpoints available in Redmine 5.x and above.
- Redmine authentication is handled via a static API key, not OAuth or username/password
  (API key auth is standard and does not require plugin support). The API key and the Redmine
  instance URL are entered once via an in-app settings screen and stored in a encrypted browser storage
  (persistent, same-origin). On first load, if no cookie is present, the app MUST redirect
  the user to the settings screen before displaying the calendar.
- The calendar shows Monday as the first day of the week; localization of day order is out of
  scope for v1.
- Mobile support (touch drag-to-create) is out of scope for v1; the primary target is a desktop
  browser environment.
- The Redmine activity type list is relatively small (< 20 entries) and can be loaded once at
  startup and cached for the session.
- Start time is read from the `easy_time_from` field in the Redmine API response.
- The default visible working-hours range is 07:00–19:00; the user can scroll to see earlier
  or later times.
- Internet connectivity is assumed; offline / cached operation is out of scope for v1.
- The application is a local static HTML/JS app (served from `localhost` or opened directly
  as a file). No server-side component is required. Because the app runs locally, the Redmine
  API must either allow CORS from `localhost` / `file://` or the user must configure a local
  CORS proxy. This constraint MUST be documented in the app's setup instructions.

## Clarifications

### Session 2026-03-31

- Q: What is the application hosting/deployment model? → A: Local static HTML/JS app running
  on `localhost` or opened directly as a file — no server required, single-machine use.
- Q: Where should the Redmine API key and instance URL be stored? → A: Browser cookie —
  entered once via an in-app settings screen, persisted as a cookie for subsequent sessions.
- Q: Can users drag existing entry blocks to reschedule or resize them? → A: Yes — drag the
  bottom edge to change duration, drag the top edge to change start time, or drag the entire
  block to a new day/time slot to reschedule (drag-to-move). All three interactions save
  immediately without opening the edit form.
