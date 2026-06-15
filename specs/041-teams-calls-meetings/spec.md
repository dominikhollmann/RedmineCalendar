# Feature Specification: Planning View — Teams Calls & Meetings Column

**Feature Branch**: `041-teams-calls-meetings`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "this is a column that should be added to the planning view. same drag& drop behavior, same styling as outlook events. it should show all direct calls but also all teams meetings with their actual length. i.e. a meeting planned 1000-1100 that actually went from 1005-1123 should be shown with the actual times (minute precise). on DnD, times are rounded to 15 minutes (as for outlook). for calls we show the participants in the event information/title (everyone except the user himself). for meetings we show the meeting title. in this case, we try to retrieve the issue number from the title, same as outlook. note: meetings will often appear on outlook and teams calendar, which is fine. but for efficiency, we should store the redmine information fetched for events across event types to reduce duplicate calls to redmine. my idea: have a local list of fetched items. whenever something tries to fetch info from redmine, check if it is already in the list. store there after fetch."

## Clarifications

### Session 2026-06-14

- Q: In meetings-only fallback mode (calendarView, no call-record access), what should the Teams column show when only scheduled times are available? → A: Nothing — the Teams column MUST only show events with confirmed actual time data from call records. If call-record access is unavailable, the column shows an unavailable/permissions state and the user falls back to the Outlook column for calendar events. There is no hybrid "scheduled times" fallback mode for the Teams column.
- Q: Can a direct call ever be classified as `excluded`, or are all calls always `needs-ticket`? → A: Calls under 1 minute are automatically `excluded` (not shown in the column — likely misdials or dropped connections). All calls of 1 minute or longer are classified as `needs-ticket`.
- Q: When checking whether a Teams event is covered by Redmine bookings (FR-013 greyed-out), should the actual times be rounded before the comparison? → A: Yes — apply the same quarter-hour rounding to the Teams event's actual times before checking full coverage against bookings. This makes greying symmetric with booking creation. The same rounding logic MUST also be applied consistently when checking coverage for Outlook events (Outlook column, feature 038 FR-016): an Outlook event at 10:00–10:55 is displayed as-is, but its quarter-hour-rounded range (10:00–11:00) is used for the coverage check — not the raw 10:55 end time.
- Q: When the Teams column shows no events for a day older than the Teams API retention window, should it show a notice or a silent empty state? → A: Silent empty state — same display as a genuinely empty day; no notice or special message shown.
- Q: Is event selection scoped to one column at a time, or can the user shift-click across the Teams and Outlook columns to create a mixed-source drag? → A: Selection is column-scoped. Shift-click only selects within the active column; starting a click in a different column clears the existing selection. Cross-column multi-select is not supported.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Teams Activity Alongside Bookings and Outlook (Priority: P1)

A user opens the Planning View for the current day and sees a "Teams" column next to the Bookings and Outlook columns. The column shows all their Teams calls and meetings for that day with the actual start and end times recorded by Teams — not the originally scheduled times. At a glance, they can spot communication activity that has not yet been booked, and immediately understand what was actually happening versus what was planned.

**Why this priority**: This is the core value of the feature — surfacing actual Teams activity with real durations in the same planning surface as bookings and Outlook events. Without a working column, all other interactions are meaningless.

**Independent Test**: Can be fully tested by opening the Planning View and verifying that the Teams column appears showing the day's calls and meetings with actual (not scheduled) times — no booking creation needed.

**Acceptance Scenarios**:

1. **Given** the user has connected Teams and the Teams column is enabled, **When** the Planning View loads for a day, **Then** a "Teams" column appears displaying both direct calls and scheduled meetings for that day, each with its actual start time, end time, and duration.
2. **Given** a Teams meeting was scheduled for 10:00–11:00 but the call actually ran from 10:05 to 11:23, **When** the Planning View renders, **Then** the event in the Teams column shows 10:05–11:23 (minute-precise actual times), not 10:00–11:00.
3. **Given** the user has not connected Teams or has disabled the Teams column, **When** they open the Planning View, **Then** no Teams column is shown and the Outlook and Bookings columns are unaffected.
4. **Given** the Teams data fetch is in progress, **When** the Planning View renders, **Then** the Teams column shows a loading skeleton; the Bookings and Outlook columns remain independently usable and do not wait for the Teams fetch.
5. **Given** the Teams connection has expired or is unavailable, **When** the Planning View renders, **Then** the Teams column shows a clear, actionable reconnect prompt rather than an error page; the Outlook and Bookings columns continue to function normally.

---

### User Story 2 - Book a Teams Event by Dragging to the Bookings Column (Priority: P1)

A user reviews the Teams column and drags a call or meeting to the Bookings column. For meetings whose title contains a recognisable Redmine issue reference, a time entry is created immediately with the quarter-hour-rounded times. For calls and for meetings whose issue cannot be determined, the booking modal opens with all available information pre-filled — participant list (for calls) or meeting title (for meetings) — so the user only needs to assign a ticket. The booking flow is identical to the existing Outlook drag-to-book flow.

**Why this priority**: Drag-to-book is the primary interaction. Reusing the exact Outlook booking flow keeps the UX consistent and makes the feature instantly learnable by anyone who already uses the Outlook column.

**Independent Test**: Can be fully tested by dragging a Teams meeting whose title contains a Redmine issue number to the Bookings column and verifying that a time entry is created immediately at the rounded times, without a modal opening.

**Acceptance Scenarios**:

1. **Given** a Teams meeting whose title contains a recognisable Redmine issue reference (e.g. "#1234"), **When** the user drags it to the Bookings column, **Then** a Redmine time entry is created immediately using the quarter-hour-rounded actual start and end times, and the identified issue number — no modal opens.
2. **Given** a Teams call (direct call, no issue inferable), **When** the user drags it to the Bookings column, **Then** the booking modal opens pre-filled with the rounded actual times; the participant names appear in the highlighted source-event box; the comment field is left empty (participants are not copied there).
3. **Given** a Teams meeting whose title contains no issue reference, **When** the user drags it to the Bookings column, **Then** the booking modal opens with the rounded actual times; the meeting title appears in the highlighted source-event box and is also pre-filled into the comment field; the user must provide an issue number before submitting.
4. **Given** the booking modal is open for a Teams event, **When** the user assigns an issue and submits, **Then** a Redmine time entry is created and the modal closes.
5. **Given** the booking modal is open, **When** the user cancels, **Then** no entry is created and the event remains in the Teams column.
6. **Given** a multi-event drag from the Teams column, **When** the drag lands on the Bookings column, **Then** each event is processed in the same order as the Outlook multi-drag: issue-identified events create immediately, then the booking modal opens for each remaining event in turn.

---

### User Story 3 - Teams Events Display the Right Information (Priority: P1)

A user glances at the Teams column and immediately reads relevant context from each event without opening it. Direct calls show the names of the other participants (everyone except the user). Scheduled meetings show the meeting title. Each event is visually classified — bookable (issue found), needs-ticket (work, no issue), or excluded — matching the same visual language already used for Outlook events. The user understands at a glance which events will book immediately and which will open a modal.

**Why this priority**: Correct information display is foundational; a Teams column that shows the wrong participants or hides the meeting title provides no planning value.

**Independent Test**: Can be fully tested by verifying that a direct call shows participant names (not the caller's own name) and a scheduled meeting shows the meeting title, and that their classification badges match those of comparable Outlook events.

**Acceptance Scenarios**:

1. **Given** a direct Teams call with participants Alice, Bob, and the signed-in user, **When** the Teams column renders the event, **Then** the event card title shows "Alice, Bob" (or equivalent participant summary), not the user's own name.
2. **Given** a scheduled Teams meeting titled "Sprint Planning #1234", **When** the Teams column renders the event, **Then** it displays the title "Sprint Planning #1234" and classifies the event as **bookable** because issue 1234 is inferable from the title.
3. **Given** a scheduled Teams meeting titled "Kickoff Discussion" (no issue reference), **When** the Teams column renders, **Then** it displays the title and classifies the event as **needs-ticket**.
4. **Given** a Teams event that is a break, non-work, or otherwise excluded by the existing classification rules, **When** the Teams column renders it, **Then** it is shown as **excluded** and cannot be selected or dragged to the Bookings column.
5. **Given** a Teams event classified as bookable or needs-ticket, **When** its full time range is already covered by existing Redmine bookings, **Then** it is visually greyed out in the same manner as covered Outlook events.

---

### User Story 4 - Redmine Issue Lookups Are Not Duplicated Across Event Types (Priority: P2)

A user has the same meeting in both their Outlook column and their Teams column (which is expected and acceptable). When the application resolves the Redmine issue number from the meeting title, it fetches the issue from Redmine once and reuses the result for both columns — it does not make two separate API calls for the same issue number. This session-scoped lookup cache also benefits future event-source columns added to the Planning View.

**Why this priority**: Without caching, a user with the same meeting in Outlook and Teams would trigger two identical Redmine API calls per shared event. As more event-source columns are added (GitHub, Teams, etc.) duplicate lookups will multiply. The cache pattern is a standard engineering solution — often called a "memoisation cache" or "lookup cache" — that eliminates this class of redundancy cleanly.

**Independent Test**: Can be fully tested by inspecting network requests in developer tools while the Planning View loads a day where the same meeting appears in both the Outlook and Teams columns — only one Redmine API call for that issue number should occur.

**Acceptance Scenarios**:

1. **Given** a meeting that appears in both the Outlook and Teams columns with the same inferable issue number, **When** the Planning View loads, **Then** only a single Redmine API request is made for that issue number — not two.
2. **Given** a Redmine issue has been fetched and cached in the current session, **When** any other event in any column needs to resolve the same issue number, **Then** the cached result is used immediately without a network call.
3. **Given** the user navigates to a different day in the Planning View, **When** the new day's events are loaded, **Then** previously cached issue lookups from the earlier day remain available and prevent duplicate fetches for any issue that appears again.
4. **Given** a Redmine issue fetch fails (network error, 404), **When** another event later requests the same issue number, **Then** the cache does NOT return the failure result — the request is retried so transient errors do not permanently suppress valid issue data.

---

### User Story 5 - Configure the Teams Column On/Off (Priority: P2)

A user who does not use Microsoft Teams opens the Settings page and sees no Teams column configuration. A user who has authenticated with Microsoft (via the existing Outlook/MSAL flow) can enable or disable the Teams column independently from the Outlook column. The setting persists across sessions.

**Why this priority**: Not all users have Teams, and the column must not appear for users who have not connected it. Settings control follows the same pattern already established for the Outlook column in feature 038.

**Independent Test**: Can be fully tested by enabling the Teams column in settings and verifying it appears in the Planning View, then disabling it and verifying it disappears — all without affecting the Outlook column.

**Acceptance Scenarios**:

1. **Given** the user opens the Settings page with Microsoft authentication enabled, **When** they view the "Planning View sources" section, **Then** a Teams toggle is listed alongside the Outlook toggle, disabled by default.
2. **Given** the user enables the Teams column in settings, **When** they open the Planning View, **Then** the Teams column appears.
3. **Given** the user disables the Teams column in settings, **When** they open the Planning View, **Then** no Teams column appears and the Outlook column is unaffected.
4. **Given** the user has saved source settings, **When** they close and reopen the application, **Then** the Teams column enabled/disabled state is preserved.

---

### Edge Cases

- **Same meeting in Outlook and Teams columns**: Both columns may show the same scheduled meeting. This is expected — the Outlook column shows the calendar appointment (with scheduled times), the Teams column shows the actual call record (with actual times). The user can choose to book from either source; the Redmine lookup cache prevents duplicate API calls for the same issue number.
- **Call with no other participants** (a self-call or test call): Show a localised label such as "Solo call" or equivalent rather than an empty participant list.
- **Call with many participants**: Truncate the participant list in the event card title with an overflow indicator (e.g. "Alice, Bob + 3 more"); the highlighted source-event box in the booking modal shows the full list.
- **Teams meeting with no title**: Use a localised fallback label (e.g. "Teams Meeting").
- **Teams API temporarily unavailable**: The Bookings and Outlook columns continue to function normally. The Teams column shows an error state with a retry option. Errors in the Teams column MUST NOT affect other columns.
- **Teams call record data not available yet** (call ended seconds ago): Omit the event rather than show incomplete data; the user can refresh to see it once the record is available.
- **Zero Teams events for the selected day**: The Teams column shows an empty-state message, not an error.
- **Actual call times identical to scheduled times**: Show the actual times as-is; there is nothing special to indicate.
- **Call start time before or after calendar working hours**: The event is still shown; the working-hours toggle clips the visible time range as it does for all columns.
- **Issue fetch fails for a meeting title with a recognised reference**: The event is classified as needs-ticket; the booking modal opens so the user can confirm or correct the issue number.
- **Feasibility risk — API permissions**: Access to Teams call records may require tenant-admin consent for the `CallRecords.Read.All` permission. A feasibility spike (FR-015) MUST gate all implementation work. If per-user access without admin consent is unavailable, the Teams column shows a permissions-unavailable state and no events are displayed; the user relies on the Outlook column for calendar events.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Planning View MUST display a "Teams" column when the Teams source is enabled, positioned as an additional Activity Column alongside the existing Bookings and Outlook columns, using the same visual style and interaction model as the Outlook column.
- **FR-002**: The Teams column MUST be **off by default**. It MUST NOT fetch any data until the user has explicitly enabled it in Settings.
- **FR-003**: The Teams column MUST be independently controlled from the Outlook column in the Settings "Planning View sources" section, with an enabled/disabled toggle that persists across sessions.
- **FR-004**: The Teams column MUST authenticate using the existing MSAL.js v2 Microsoft authentication flow already used by the Outlook connector. No additional OAuth flow or separate credential storage is required.
- **FR-005**: The Teams column MUST show all **direct (ad-hoc) calls** and **scheduled meetings** the user participated in for the selected Planning Day, using the **actual start and end times** recorded by Teams — not the originally scheduled times. Times MUST be displayed to the minute (no rounding in the display). Events for which actual time data is not available MUST be omitted; the column MUST NOT show scheduled times as a substitute for actual times.
- **FR-006**: For **direct calls** (ad-hoc, no scheduled meeting behind them), the Teams column MUST display the names of all other participants (everyone except the signed-in user) as the **event card title**. If no other participants exist, a localised fallback label MUST be shown.
- **FR-007**: For **scheduled meetings**, the Teams column MUST display the meeting title as the event label.
- **FR-008**: The application MUST attempt to identify a Redmine issue number from the title of scheduled Teams meetings using the same deterministic pattern-matching already used for Outlook events (`parseCalendarProposals` in `js/outlook.js`). No AI API call is made; issue inference MUST work when AI is not configured.
- **FR-009**: Each Teams event MUST be classified and visually badged using the same three categories as Outlook events: **bookable** (issue identified), **needs-ticket** (work event, no issue found), or **excluded** (break, non-work, holiday — using the same exclusion rules as the Outlook column for scheduled meetings). For **direct calls**: any call with an actual duration of less than 1 minute MUST be classified as `excluded` and MUST NOT be shown in the column (likely a misdial or dropped connection); calls of 1 minute or longer with no inferable issue are classified as `needs-ticket`.
- **FR-010**: Teams events MUST be draggable to the Bookings column using the same drag-and-drop interaction as the Outlook column. Multi-event shift-click selection and drag behaviour MUST be identical to the Outlook column (feature 038, FR-009b). Event selection MUST be column-scoped: shift-click selects only within the currently active column; clicking or shift-clicking in a different column MUST clear the existing selection before starting a new one. Cross-column multi-select (selecting simultaneously from Teams and Outlook columns) is not supported.
- **FR-011**: When a dragged Teams event has an identified Redmine issue, a Redmine time entry MUST be created immediately using the **quarter-hour-rounded** actual times. No modal opens.
- **FR-012**: When a dragged Teams event has no identified issue, the booking modal MUST open pre-filled with the quarter-hour-rounded actual times. The source-event context MUST be displayed in the existing highlighted source-event box (the same UI element already used for Outlook events in the modal): for calls, the participant names; for meetings, the meeting title. Additionally, for **meetings**, the meeting title MUST be pre-filled into the **comment** field so the user does not have to retype it. For **calls**, the participant list MUST NOT be pre-filled into the comment field (personal information minimisation). The user MUST provide an issue number before submitting.
- **FR-013**: A Teams event MUST be visually greyed out when its **quarter-hour-rounded** actual time range is fully covered by one or more existing Redmine bookings. The actual times MUST be rounded to the nearest quarter-hour before performing the coverage check — matching the rounding applied during booking creation. This same rounding logic MUST also be applied when evaluating coverage for Outlook events (aligning with feature 038, FR-016): Outlook events are displayed with their raw scheduled times but their quarter-hour-rounded time range is used for the greyed-out check, not the raw scheduled end time.
- **FR-014**: Failure or unavailability of the Teams column — including auth expiry, API errors, and permission failures — MUST NOT affect the Bookings column or the Outlook column in any way. The Teams column degrades independently, showing an actionable error or reconnect state. A non-blocking notice MAY be shown; no other column is impacted.
- **FR-015**: A feasibility spike MUST be completed and documented before any implementation begins. The spike MUST confirm: (a) whether per-user delegated access to Teams call history is available without tenant-admin consent, and (b) the minimum permission set required. **If actual call-record data is unavailable** (e.g., the required permission requires tenant-admin consent that is not granted), the Teams column MUST show a clear, non-blocking unavailable state explaining that Teams history requires additional permissions. In this state the Teams column shows no events; the user relies on the existing Outlook column for calendar events. There is no hybrid fallback mode that shows scheduled times — the Teams column MUST only ever show confirmed actual-time data or nothing.
- **FR-016**: The application MUST maintain an **in-session, in-memory memoisation cache** for Redmine issue lookups performed during Planning View data resolution. Before making any Redmine API call to look up an issue by number, the cache MUST be checked; if a result is present, it MUST be returned immediately without a network request. Results MUST be stored in the cache after a successful fetch. The cache MUST be keyed by Redmine issue number and MUST be shared across all event-source columns (Outlook, Teams, and future sources). The cache is session-scoped: it is never persisted to `localStorage`, `IndexedDB`, or `config.json`, and is discarded when the page is unloaded.
- **FR-017**: A failed Redmine issue fetch (network error, 404, or other API error) MUST NOT be stored as a positive cache result. A subsequent lookup for the same issue number MUST retry the API call.
- **FR-018**: Teams event data (call records, participant lists, meeting titles) MUST NOT be written to `localStorage`, `IndexedDB`, `config.json`, or any persistent store. It MUST reside in memory only and be discarded when the booking action completes or the Planning View is closed.
- **FR-019**: Teams event data MUST NOT be included in AI context assembly (`js/knowledge.js`), feedback/error reports (`js/feedback.js`), or application logs.
- **FR-020**: New user-visible strings introduced by this feature (column header, empty states, loading states, error/reconnect prompts, participant labels, fallback titles) MUST be added to `js/i18n/en.js` and `js/i18n/de.js` and accessed via `t()`. No hardcoded English strings are permitted.

### Key Entities

- **TeamsCall**: An ad-hoc direct call retrieved from the Microsoft Graph call records API. Has actual start time, actual end time, and a list of participants. Has no meeting title.
- **TeamsMeeting**: A scheduled meeting retrieved from the Microsoft Graph calendar or call records. Has an actual start time, actual end time, a meeting title, and optionally a list of participants.
- **ActualCallRecord**: The Teams-side record of a call or meeting with real (not scheduled) start/end timestamps, measured to the minute.
- **Participant**: A member of a call or meeting other than the signed-in user. Displayed by display name.
- **RedmineLookupCache**: A session-scoped, in-memory map from Redmine issue number → issue details. Shared across all Planning View event-source columns. Never persisted. The formal software pattern is **memoisation** (also called a request-scoped lookup cache).
- **TeamsSource**: The event-source plugin that fetches and normalises Teams calls and meetings into `CalendarProposal` objects compatible with the existing Planning View booking flow.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can see their Teams calls and meetings alongside their Redmine bookings and Outlook appointments in a single view without switching applications.
- **SC-002**: Actual Teams call times (minute-precise) are displayed correctly in the Teams column — verified against the actual call duration visible in the Teams app itself.
- **SC-003**: A user can create a Redmine time entry from a Teams event within 30 seconds of opening the Planning View on a normal broadband connection.
- **SC-004**: When the same meeting appears in both the Outlook and Teams columns, only one Redmine API call is made per unique issue number across both columns — confirmed by network inspection.
- **SC-005**: Enabling or disabling the Teams column in Settings takes effect in the Planning View without a page reload, within 2 seconds of saving the setting.
- **SC-006**: A failure in the Teams data fetch has zero observable impact on the Outlook column and the Bookings column — both columns continue to display and function correctly when the Teams column shows an error state.

## Assumptions

- The existing Outlook authentication flow (MSAL.js v2, `js/outlook.js`) is reused for Microsoft Graph access. The Teams connector shares the same auth token scope where the required Graph permissions overlap; no separate login flow is introduced.
- A feasibility spike (FR-015) gates the call-records sub-feature. If admin-level permissions are required and unavailable in the target deployment, the Teams column shows an unavailable state; users rely on the existing Outlook column for calendar events. There is no meetings-only fallback mode — the Teams column only shows confirmed actual-time call records or nothing.
- The Planning View is desktop-only (inherited from feature 038, FR-019). The Teams column is hidden on mobile-sized viewports and is never accessible from mobile.
- The same meeting appearing in both the Outlook column (scheduled time from calendar) and the Teams column (actual time from call records) is expected and acceptable — it provides complementary information. The user may book from either source; the Redmine lookup cache prevents duplicate API calls.
- Participant display names are available from the Microsoft Graph response. No additional API call is needed to resolve participant names.
- The Teams column shows only calls and meetings in which the signed-in user was a participant. Organisation-wide call records or other users' history are not shown.
- Call records from Teams may have a short delay before they appear in the Graph API (minutes to hours after a call ends). Calls that have not yet appeared in the API are simply absent from the column; no error is shown for this case.
- Mobile support is explicitly out of scope (inherited from feature 038).
- Data retention and privacy: call data is transient (in-memory only, discarded on page close). No consent banner is required beyond the existing Microsoft auth consent already in place, provided the required Graph permissions are included in the existing consent scope.
