# Feature Specification: Planning View

**Feature Branch**: `038-planning-view`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "I want to add a planning view. Overall this will be a big feature set and a big change of the software. In the planning view, I want to see the current day with several columns of calendar day-views. The first column is the booking already done. Then there are multiple columns for different sources of activities, e.g. a column shows my outlook appointments, a column shows teams calls, a column my github activity, a column windows events (log-in, log-out, locked screen), and so on. Now I can add events from the information column to the calendar column. In some cases, the issue number can automatically be inferred from the event (as in the ai chat feature). For others, the user needs to input the issue number. The user should be able to configure which event sources they want to connect. The first version of the feature will be outlook only."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Bookings and Outlook Side by Side (Priority: P1)

A user opens the Planning View for the current day and immediately sees their existing Redmine time entries in one column and their Outlook calendar appointments in an adjacent column. At a glance, they can spot gaps — time spent in meetings not yet logged — and understand what has and hasn't been booked.

**Why this priority**: This is the fundamental value of the entire feature. Without a working side-by-side view, all other interactions are meaningless. Delivering this alone provides immediate value for daily planning.

**Independent Test**: Can be fully tested by opening the Planning View and verifying that the bookings column shows existing Redmine entries and the Outlook column shows today's appointments — no booking creation is needed.

**Acceptance Scenarios**:

1. **Given** the user has authenticated with Outlook and opens the Planning View, **When** the view loads for the current day, **Then** they see a "Bookings" column (existing Redmine time entries) and an "Outlook" column (today's Outlook calendar appointments) displayed side by side.
2. **Given** the Planning View is open, **When** an Outlook appointment occupies a specific time slot, **Then** it appears in the Outlook column at the correct time, showing its title and duration.
3. **Given** the user has not connected Outlook, **When** they open the Planning View, **Then** the Outlook column displays a prompt to connect their Outlook account rather than events.
4. **Given** the Planning View is open, **When** the Outlook connection has expired or been revoked, **Then** the Outlook column shows an actionable "Reconnect Outlook" prompt and does not crash or show an error page.

---

### User Story 2 - Book Events by Dragging to the Bookings Column (Priority: P1)

A user reviews the Outlook column and drags one or more events to the Bookings column to log them. For events where a Redmine issue was already identified from the event content, the time entry is created immediately — no form needed. For events where no issue could be determined, the booking modal opens showing the event's details alongside the form, letting the user assign a ticket and confirm. Single-event and multi-event drag behave identically: each event in the drag is processed the same way.

**Why this priority**: Drag-and-drop is the primary booking interaction. Getting this right — instant for identified events, one modal step for unidentified ones — is what makes the Planning View feel fast rather than another form-heavy workflow.

**Independent Test**: Can be fully tested by dragging a bookable event (with a known issue reference) to the Bookings column and verifying a Redmine entry appears immediately without a modal.

**Acceptance Scenarios**:

1. **Given** an Outlook event whose issue is identified by pattern matching, **When** the user drags it to the Bookings column, **Then** a Redmine time entry is created immediately using the event's start time, end time, and identified issue — no modal opens.
2. **Given** an Outlook event whose issue cannot be identified, **When** the user drags it to the Bookings column, **Then** the booking modal opens showing the event's title, time, and description alongside the booking form, with the time fields pre-filled and the issue field empty.
3. **Given** the booking modal is open for a needs-ticket event, **When** the user assigns an issue and submits, **Then** a Redmine time entry is created and the modal closes.
4. **Given** the booking modal is open, **When** the user cancels, **Then** no entry is created and the event remains in the Outlook column.
5. **Given** the user has selected multiple events via checkboxes and drags them to the Bookings column, **Then** each event is processed in the same way as a single drag: identified-issue events create immediately, needs-ticket events open the modal sequentially.
6. **Given** a multi-event drag where some events are bookable and some need a ticket, **When** the drag completes, **Then** all bookable entries are created first, then the modal opens for each needs-ticket event in turn.

---

### User Story 2b - Event Classification Guides the Booking Flow (Priority: P1)

Before the user drags anything, the Outlook column already tells them which events are ready to book, which need a ticket, and which are non-work entries that should not be booked. Bookable events are auto-selected; excluded events (breaks, bank holidays, non-work) are de-emphasised and unchecked. This classification comes from the existing proposal engine in `js/outlook.js` and requires no AI.

**Why this priority**: Without visible classification, the user cannot tell at a glance which events will create entries immediately and which will require a modal step. The classification is also what makes batch drag viable — the user can see what they're about to book before dragging.

**Independent Test**: Can be fully tested by opening the Planning View and verifying that events with a "#1234" reference appear as bookable (checked, normal style) and that a meeting titled "Lunch" or a bank holiday appears as excluded (unchecked, de-emphasised).

**Acceptance Scenarios**:

1. **Given** the Planning View loads for a day, **When** the Outlook column renders, **Then** each event is displayed with a visual indicator of its classification: bookable (ticket identified, ready to create), needs-ticket (work event but no issue found), or excluded (break, non-work, bank holiday, vacation, sick leave).
2. **Given** a bookable event, **When** the Outlook column renders, **Then** its checkbox is auto-checked.
3. **Given** a needs-ticket event, **When** the Outlook column renders, **Then** its checkbox is auto-checked but the event is visually marked as needing a ticket (e.g., a warning icon or distinct colour).
4. **Given** an excluded event, **When** the Outlook column renders, **Then** it is shown in a de-emphasised style and its checkbox is NOT auto-checked.
5. **Given** the user has not changed the default selection, **When** they drag the selection to the Bookings column, **Then** only the checked events (bookable + needs-ticket) are processed; excluded events are left in place.

---

### User Story 3 - Switch Between Calendar and Planning View (Priority: P1)

A user working in the classic calendar view wants to jump into the Planning View to review their day in detail. They click a floating action button fixed at the bottom-right corner of the screen to switch. Later, they click the same button to return to the classic calendar. Alternatively, they double-click a specific day column header in the calendar and land directly in the Planning View scoped to that day.

**Why this priority**: Without a clear way to enter and exit the Planning View, the feature is inaccessible. The floating button is always visible regardless of scroll position; the double-click-on-column-header shortcut is the primary bridge when the user already knows which day they want to review.

**Independent Test**: Can be fully tested by clicking the floating toggle button from the classic calendar and verifying the Planning View appears for today, then clicking again and verifying the classic calendar is restored.

**Acceptance Scenarios**:

1. **Given** the user is in the classic calendar view, **When** they click the floating view toggle button (bottom-right), **Then** the Planning View opens for the current day.
2. **Given** the user is in the Planning View, **When** they click the floating view toggle button (bottom-right), **Then** the classic calendar view is restored.
3. **Given** the user is in the classic calendar view, **When** they double-click a day column header, **Then** the Planning View opens scoped to that specific day.
4. **Given** the user entered Planning View via a day column header double-click, **When** the view loads, **Then** the Planning Day is set to the day they clicked — not necessarily today.
5. **Given** the user is in the Planning View, **When** they toggle back to the classic calendar, **Then** the calendar restores its previous state (view type and date range).

---

### User Story 4 - Navigate to a Different Day in Planning View (Priority: P2)

A user in the Planning View wants to review and fill gaps from yesterday or plan bookings for tomorrow by cycling through days without returning to the classic calendar. If they have the Mo–Fr toggle enabled, weekends are skipped automatically so they cycle only through working days.

**Why this priority**: Day navigation within the Planning View makes it useful beyond the immediate "now" without forcing a round-trip through the classic calendar.

**Independent Test**: Can be fully tested by navigating to yesterday within the Planning View and verifying that both columns update to show that date's data.

**Acceptance Scenarios**:

1. **Given** the Planning View is open, **When** the user presses the "previous day" control, **Then** both columns refresh to show the prior day's data.
2. **Given** the Planning View is open, **When** the user presses the "next day" control, **Then** both columns refresh to show the following day's data.
3. **Given** the user has navigated away from today, **When** they use a "Today" shortcut, **Then** the Planning View returns to the current date.
4. **Given** the Mo–Fr toggle is enabled and the Planning View is showing Friday, **When** the user presses "next day", **Then** the view jumps to the following Monday, skipping Saturday and Sunday.
5. **Given** the Mo–Fr toggle is enabled and the Planning View is showing Monday, **When** the user presses "previous day", **Then** the view jumps to the preceding Friday, skipping Sunday and Saturday.

---

### User Story 5 - Configure Event Source Columns (Priority: P2)

A user opens the application settings and toggles event sources on or off. Only enabled sources appear as columns in the Planning View. This allows users who do not use a particular tool (e.g., GitHub, Teams) to keep their Planning View uncluttered.

**Why this priority**: Because future features will add more sources, user control over which columns appear is essential even in v1 — at minimum to allow disabling Outlook entirely for users who do not use it.

**Independent Test**: Can be fully tested by disabling Outlook in settings and verifying the Outlook column no longer appears in the Planning View.

**Acceptance Scenarios**:

1. **Given** the user opens the Settings page, **When** they view the "Planning View sources" section, **Then** Outlook is listed with an enabled/disabled toggle.
2. **Given** the user disables Outlook in settings, **When** they open the Planning View, **Then** no Outlook column is shown.
3. **Given** the user re-enables Outlook in settings, **When** they open the Planning View, **Then** the Outlook column reappears.
4. **Given** the user saves source settings, **When** they close and reopen the application, **Then** the saved source configuration persists.

---

### User Story 6 - Time-Covered Events Are Greyed Out (Priority: P2)

While reviewing the Planning View, the user notices that some Outlook events are shown in a greyed-out style. These are events whose entire duration is already covered by existing Redmine bookings. This helps the user immediately focus on the events that still need to be logged, without manually cross-checking times.

**Why this priority**: This visual filter is computed purely from existing data (Outlook event times vs. booked time ranges) with no additional storage. The implementation cost is low and the cognitive benefit is high — especially for users who already have bookings from other routes (manual entry, chatbot).

**Independent Test**: Can be fully tested by creating a Redmine time entry that spans the full duration of an Outlook event and verifying the Outlook event becomes visually greyed out on the Planning View without any additional action.

**Acceptance Scenarios**:

1. **Given** an existing Redmine booking fully covers the time range of an Outlook event, **When** the Planning View renders, **Then** that Outlook event is displayed in a greyed-out style to indicate its time is already accounted for.
2. **Given** an Outlook event is partially covered by a Redmine booking (e.g., booking covers only the first half), **When** the Planning View renders, **Then** the event is NOT greyed out (only full coverage triggers the visual distinction).
3. **Given** a greyed-out Outlook event, **When** the user drags it to the Bookings column, **Then** it is processed the same as any other event — the user can still explicitly re-book or reassign it to a different issue.
4. **Given** a greyed-out Outlook event, **When** the covering Redmine booking is deleted, **Then** the event reverts to its normal (non-greyed) appearance on the next render.

---

### Edge Cases

- What happens when the Outlook API returns events spanning midnight (e.g., "all-day" events)?
- How are Outlook events longer than the visible day slot (multi-day events) displayed?
- What if the user's Outlook calendar contains hundreds of events on a single day — is there a display limit?
- What happens if the user activates an Outlook event that has already been booked in a previous session?
- What if the inferred issue number from an Outlook event no longer exists in Redmine (deleted or access revoked)?
- How does the view behave on days with zero Redmine bookings and zero Outlook events?
- What if the Outlook API is temporarily unavailable — does the Bookings column still function?
- When the user enters Planning View, navigates to a different day, then toggles back to the calendar: the calendar navigates to the week containing the Planning View's last selected day (not the originally-visible week).
- Month view does not support the double-click-column-header entry point; the Planning View toggle button is the only entry from month view.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application MUST provide a floating action button fixed to the bottom-right corner of the screen that toggles between the classic calendar view and the Planning View. This button takes the position currently occupied by the feedback button.
- **FR-001b**: The feedback button MUST be relocated from its current floating bottom-right position to the application toolbar, so the bottom-right corner is available for the view toggle button.
- **FR-002**: When the user activates the view toggle from the classic calendar, the Planning View MUST open for the current day by default.
- **FR-003**: When the user double-clicks a day column header in the classic calendar view, the application MUST switch to the Planning View scoped to that specific day.
- **FR-004**: When the user clicks the floating toggle button from inside the Planning View, the application MUST return to the classic calendar and restore its previous state (view type and visible date range).
- **FR-005**: The Planning View MUST display one day at a time, with previous-day and next-day navigation controls and a "Today" shortcut to return to the current date.
- **FR-006**: The Planning View MUST display a "Bookings" column showing existing Redmine time entries for the selected day, using the same data source as the main calendar view.
- **FR-007**: When Outlook is connected and enabled, the Planning View MUST display an "Outlook" column showing the user's Outlook calendar appointments for the selected day.
- **FR-008**: When Outlook is not connected or the user has disabled it in settings, the Planning View MUST display an appropriate prompt or empty state in place of the Outlook column.
- **FR-009**: Outlook events MUST be bookable by dragging them to the Bookings column. This applies identically to a single event and to a multi-event drag of selected events. Double-click is not used for booking.
- **FR-009b**: Each event chip in the Outlook column MUST have a checkbox for selection. Bookable and needs-ticket events MUST be auto-checked on load; excluded events MUST NOT be auto-checked. The user may change any checkbox before dragging.
- **FR-010**: When a dragged event has an identified Redmine issue (determined by FR-011 pattern matching), a Redmine time entry MUST be created immediately using the event's start time, end time, and identified issue. No modal opens for this case.
- **FR-010b**: When a dragged event has no identified issue, the booking modal MUST open. The modal MUST display the source event's title, time range, and description alongside the booking form fields, with start time and end time pre-filled and the issue field empty.
- **FR-011**: The application MUST classify each Outlook event using the existing deterministic proposal engine (`parseCalendarProposals` in `js/outlook.js`). Classification categories are: **bookable** (issue identifiable, work event — ready for immediate creation), **needs-ticket** (work event but no issue found — requires modal), and **excluded** (break, non-work, bank holiday, vacation, sick leave, overtime compensation — should not be booked). No AI API call is made; classification MUST work when AI is not configured.
- **FR-011b**: Each classification category MUST be visually distinct in the Outlook column (e.g., different colour or icon per category) so the user understands the booking outcome before dragging.
- **FR-012**: If no issue number can be inferred for a needs-ticket event, the booking modal (FR-010b) MUST require the user to provide one before the form can be submitted.
- **FR-013**: Users MUST be able to enable or disable individual event source columns from the Settings page; the setting MUST persist across sessions.
- **FR-014**: The Planning View MUST handle an expired or revoked Outlook authentication by displaying a clear, actionable reconnect prompt rather than an error state or blank column.
- **FR-015**: Tracking which specific Outlook events have been manually converted into bookings is out of scope for v1 and will be addressed in a follow-up feature.
- **FR-016**: Any Outlook event whose entire time range is fully covered by one or more existing Redmine bookings in the Bookings column MUST be visually distinguished (e.g., greyed out) to indicate the time has already been accounted for. This state is computed at render time from the existing bookings data — no additional storage is required.
- **FR-017**: The existing "show working hours only" toggle MUST remain visible and active in the Planning View. When enabled, it MUST limit the visible time range of all Planning View columns to the configured working hours, identical to its effect on the classic calendar's day view.
- **FR-018**: The existing Mo–Fr (work week) toggle MUST remain visible and active in the Planning View. When enabled, the previous-day and next-day navigation controls MUST skip Saturday and Sunday, cycling only through Monday–Friday.
- **FR-019**: The Planning View and its floating toggle button MUST NOT be shown on mobile-sized viewports. The feature is desktop-only; on mobile the toggle button is hidden and the Planning View is inaccessible.
- **FR-020**: ArbZG compliance warnings for the Planning Day MUST be displayed inline in the Bookings column in exactly the same manner as the standard calendar view — no pre-commit dialog, no batch-specific popup, no difference in behaviour for single vs. batch bookings. Warnings appear on the next render after entries are created.

### Key Entities

- **Planning Day**: The currently selected date shown in the Planning View, defaulting to today. All columns are scoped to this date.
- **Bookings Column**: The read display of existing Redmine time entries for the Planning Day, mirroring the main calendar's day data.
- **Activity Column**: A display of events from one configured external source (Outlook in v1) for the Planning Day. One column per enabled source.
- **Event Source**: A configured integration (e.g., Outlook) that populates an Activity Column. Has an enabled/disabled state persisted per user.
- **Source Event**: An individual item in an Activity Column — e.g., one Outlook appointment — with a title, start time, end time, and optional description.
- **CalendarProposal**: The classified representation of a Source Event produced by the existing `parseCalendarProposals` engine. Carries a `status` of `bookable`, `needs-ticket`, or `excluded`, plus the resolved issue number (if any), rounded time range, and booking metadata.
- **Derived Booking**: A Redmine time entry that was created directly from a Source Event, carrying the originating event's time range.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can see the full picture of their working day — existing bookings alongside Outlook appointments — without switching between applications or tabs.
- **SC-002**: A user can create a Redmine time entry from an Outlook event within 30 seconds of opening the Planning View on a normal broadband connection.
- **SC-003**: Issue number auto-inference from Outlook event content succeeds for at least 60% of events that contain a recognisable Redmine issue reference in the title or description.
- **SC-004**: The Planning View renders all visible columns within 3 seconds of navigation (including data fetch) on a typical broadband connection.
- **SC-005**: Users can configure which event sources are shown without requiring help documentation — task completion in under 60 seconds.
- **SC-006**: Switching between days in the Planning View refreshes both columns within 2 seconds.

## Assumptions

- The Planning View is desktop-only and is explicitly hidden on mobile-sized viewports (see FR-019). This is not a deferred concern — mobile must not show a broken or partial Planning View.
- The existing Outlook (Microsoft Graph) integration in `js/outlook.js` is reused as the data source for the Outlook column; no new OAuth flow is required.
- Only the user's own primary Outlook calendar is shown in v1; shared calendars, room calendars, and secondary mailboxes are out of scope.
- The Planning View shows one day at a time; a multi-day or week overview is out of scope for v1.
- Future event sources (Teams calls, GitHub activity, Windows events) are entirely out of scope for v1 and will be addressed in separate follow-up features.
- Event classification and issue inference are both 100% deterministic. The existing `parseCalendarProposals` engine in `js/outlook.js` already handles event classification, time rounding, issue extraction, and subject routing (non-work, break, holiday, etc.). No AI API calls are made. The Planning View works fully when AI is not configured or unavailable.
- All-day Outlook events are displayed in the Outlook column but with a visual indicator distinguishing them from timed events.
- The time zone handling follows the existing application convention: UTC internally, user-local time for display.
- The Planning View is a view mode toggled within the same page as the classic calendar — not a separate page or route. The toggle button replaces the calendar with the Planning View columns in the same layout area.
