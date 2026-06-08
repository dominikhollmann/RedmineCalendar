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

### User Story 2 - Create a Time Entry from an Outlook Event (Priority: P1)

A user sees an Outlook meeting in the Planning View and wants to log the time against it in Redmine. They activate the event, and the booking form opens pre-filled with the correct time range. If the event title contains a Redmine issue reference, the issue field is also pre-filled. The user confirms (adjusting if needed) and the booking is created.

**Why this priority**: This is the core workflow the feature is designed for — reducing friction when converting calendar activities into Redmine bookings.

**Independent Test**: Can be fully tested by activating an Outlook event and verifying that the booking modal opens with the correct time pre-filled, regardless of issue inference.

**Acceptance Scenarios**:

1. **Given** the user activates an Outlook event in the Planning View, **When** the booking form opens, **Then** the start time and end time fields are pre-populated from the Outlook event's schedule.
2. **Given** an Outlook event's title or description contains a recognisable Redmine issue reference (e.g., "#1234" or issue URL), **When** the booking form opens, **Then** the issue field is pre-populated with that issue number (and the user may still change it).
3. **Given** no issue number can be inferred from the Outlook event, **When** the booking form opens, **Then** the issue field is empty and the user is required to select or type one before submitting.
4. **Given** the booking form is pre-filled from an Outlook event and the user submits without changes, **Then** a Redmine time entry is created with the event's exact time range and the selected issue.
5. **Given** the booking form is open, **When** the user cancels, **Then** no time entry is created and the Planning View is restored to its previous state.

---

### User Story 3 - Switch Between Calendar and Planning View (Priority: P1)

A user working in the classic calendar view wants to jump into the Planning View to review their day in detail. They click a prominent toggle button in the toolbar to switch. Later, they click the same toggle to return to the classic calendar. Alternatively, they double-click a specific day column header in the calendar and land directly in the Planning View scoped to that day.

**Why this priority**: Without a clear way to enter and exit the Planning View, the feature is inaccessible. The double-click-on-column-header shortcut is also the primary bridge between the two views during normal use.

**Independent Test**: Can be fully tested by clicking the view toggle from the classic calendar and verifying the Planning View appears for today, then clicking again and verifying the classic calendar is restored.

**Acceptance Scenarios**:

1. **Given** the user is in the classic calendar view, **When** they click the view toggle button, **Then** the Planning View opens for the current day.
2. **Given** the user is in the Planning View, **When** they click the view toggle button, **Then** the classic calendar view is restored.
3. **Given** the user is in the classic calendar view, **When** they double-click a day column header, **Then** the Planning View opens scoped to that specific day.
4. **Given** the user entered Planning View via a day column header double-click, **When** the view loads, **Then** the Planning Day is set to the day they clicked — not necessarily today.
5. **Given** the user is in the Planning View, **When** they toggle back to the classic calendar, **Then** the calendar restores its previous state (view type and date range).

---

### User Story 4 - Navigate to a Different Day in Planning View (Priority: P2)

A user in the Planning View wants to review and fill gaps from yesterday or plan bookings for tomorrow by cycling through days without returning to the classic calendar.

**Why this priority**: Day navigation within the Planning View makes it useful beyond the immediate "now" without forcing a round-trip through the classic calendar.

**Independent Test**: Can be fully tested by navigating to yesterday within the Planning View and verifying that both columns update to show that date's data.

**Acceptance Scenarios**:

1. **Given** the Planning View is open, **When** the user presses the "previous day" control, **Then** both columns refresh to show the prior day's data.
2. **Given** the Planning View is open, **When** the user presses the "next day" control, **Then** both columns refresh to show the following day's data.
3. **Given** the user has navigated away from today, **When** they use a "Today" shortcut, **Then** the Planning View returns to the current date.

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
3. **Given** a greyed-out Outlook event, **When** the user double-clicks it, **Then** the booking form still opens (with time pre-filled) so the user can still explicitly re-book or reassign it to a different issue.
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
- When the user double-clicks a column header and enters Planning View, then navigates to other days and toggles back to calendar — does the calendar restore to the originally-visible week, or to the Planning View's last selected day?
- What if the user double-clicks a column header in a month view (where there are no day columns) — is the double-click ignored, or does the Planning View open for that day?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application MUST provide a prominent view toggle control in the calendar toolbar that switches between the classic calendar view and the Planning View. The toggle MUST be visible and reachable without scrolling on a standard desktop screen.
- **FR-002**: When the user activates the view toggle from the classic calendar, the Planning View MUST open for the current day by default.
- **FR-003**: When the user double-clicks a day column header in the classic calendar view, the application MUST switch to the Planning View scoped to that specific day.
- **FR-004**: When the user activates the view toggle from inside the Planning View, the application MUST return to the classic calendar and restore its previous state (view type and visible date range).
- **FR-005**: The Planning View MUST display one day at a time, with previous-day and next-day navigation controls and a "Today" shortcut to return to the current date.
- **FR-006**: The Planning View MUST display a "Bookings" column showing existing Redmine time entries for the selected day, using the same data source as the main calendar view.
- **FR-007**: When Outlook is connected and enabled, the Planning View MUST display an "Outlook" column showing the user's Outlook calendar appointments for the selected day.
- **FR-008**: When Outlook is not connected or the user has disabled it in settings, the Planning View MUST display an appropriate prompt or empty state in place of the Outlook column.
- **FR-009**: The user MUST be able to initiate a Redmine time entry booking from any Outlook event displayed in the Planning View by double-clicking the event, consistent with the existing calendar's double-click-to-edit interaction pattern.
- **FR-010**: When a booking is initiated from an Outlook event, the time entry form MUST be pre-filled with the event's start time and end time.
- **FR-011**: The application MUST attempt to infer the Redmine issue number from the Outlook event's title and description using the same pattern-matching and AI logic already used in the chatbot feature; if inference succeeds, the issue field in the booking form MUST be pre-populated (user may override).
- **FR-012**: If no issue number can be inferred, the booking form MUST open with the time pre-filled but the issue field empty, requiring the user to provide it before submitting.
- **FR-013**: Users MUST be able to enable or disable individual event source columns from the Settings page; the setting MUST persist across sessions.
- **FR-014**: The Planning View MUST handle an expired or revoked Outlook authentication by displaying a clear, actionable reconnect prompt rather than an error state or blank column.
- **FR-015**: Tracking which specific Outlook events have been manually converted into bookings is out of scope for v1 and will be addressed in a follow-up feature.
- **FR-016**: Any Outlook event whose entire time range is fully covered by one or more existing Redmine bookings in the Bookings column MUST be visually distinguished (e.g., greyed out) to indicate the time has already been accounted for. This state is computed at render time from the existing bookings data — no additional storage is required.

### Key Entities

- **Planning Day**: The currently selected date shown in the Planning View, defaulting to today. All columns are scoped to this date.
- **Bookings Column**: The read display of existing Redmine time entries for the Planning Day, mirroring the main calendar's day data.
- **Activity Column**: A display of events from one configured external source (Outlook in v1) for the Planning Day. One column per enabled source.
- **Event Source**: A configured integration (e.g., Outlook) that populates an Activity Column. Has an enabled/disabled state persisted per user.
- **Source Event**: An individual item in an Activity Column — e.g., one Outlook appointment — with a title, start time, end time, and optional description.
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

- Mobile support is out of scope for v1; the Planning View is designed for desktop-sized screens. This MUST be declared in the plan's Assumptions section.
- The existing Outlook (Microsoft Graph) integration in `js/outlook.js` is reused as the data source for the Outlook column; no new OAuth flow is required.
- Only the user's own primary Outlook calendar is shown in v1; shared calendars, room calendars, and secondary mailboxes are out of scope.
- The Planning View shows one day at a time; a multi-day or week overview is out of scope for v1.
- Future event sources (Teams calls, GitHub activity, Windows events) are entirely out of scope for v1 and will be addressed in separate follow-up features.
- Issue number inference reuses the existing AI/pattern-matching logic from the chatbot feature; no new AI API subscription or external API calls are required solely for this feature.
- All-day Outlook events are displayed in the Outlook column but with a visual indicator distinguishing them from timed events.
- The time zone handling follows the existing application convention: UTC internally, user-local time for display.
- The Planning View is a view mode toggled within the same page as the classic calendar — not a separate page or route. The toggle button replaces the calendar with the Planning View columns in the same layout area.
