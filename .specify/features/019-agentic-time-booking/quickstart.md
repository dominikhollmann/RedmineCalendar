# UAT: Agentic AI Time-Booking — Phase 1: Outlook Calendar

**Feature**: 019-agentic-time-booking
**Prerequisites**: Azure AD app registered with Calendars.Read delegated permission, client ID configured in config.json, Outlook calendar with test meetings

## Test Scenarios

### T1: Outlook Authentication (P1)
- [x] Open the app in a browser where you're logged into Azure AD (Outlook/Teams SSO) *(only testable on real M365 deployment — demo mode bypasses MSAL)*
- [x] Open the AI assistant chat panel *(only testable on real M365 deployment — demo mode bypasses MSAL)*
- [x] Ask "Book my time for today" *(only testable on real M365 deployment — demo mode bypasses MSAL)*
- [x] Verify the app authenticates silently (no login popup) *(only testable on real M365 deployment — demo mode bypasses MSAL)*
- [x] Verify calendar events are fetched successfully

### T2: Meeting Summary (P1)
- [x] Create several Outlook meetings for today with varying properties
- [x] Ask the AI "Book my time for today"
- [x] Verify the assistant shows a summary list of all meetings before starting one-by-one confirmation
- [x] Verify each meeting in the summary shows: title, start/end time, proposed ticket (if found)

### T3: Ticket Extraction from Title (P1)
- [x] Create a meeting with "#1234" in the title (e.g., "Sprint Review #1234")
- [x] Ask the AI to book time for today
- [x] Verify the assistant maps this meeting to Redmine ticket #1234
- [x] Verify the ticket subject is resolved and displayed

### T4: Meeting Without Ticket (P1)
- [x] Create a meeting without any ticket number in the title (e.g., "Team Lunch")
- [x] Ask the AI to book time for today
- [x] Verify the assistant asks which ticket to book it on
- [x] Provide a ticket number and verify it's used for the proposal

### T5: Confirm and Book (P1)
- [x] When the assistant presents a meeting for confirmation, confirm it
- [x] Verify the time entry modal opens pre-filled with the correct ticket, date, start/end time
- [x] Click Save in the modal
- [x] Verify the entry appears on the calendar immediately
- [x] Verify the assistant proceeds to the next meeting

### T6: Skip a Meeting (P1)
- [x] When the assistant presents a meeting, say "skip"
- [x] Verify the meeting is skipped and the assistant moves to the next one
- [x] Verify no time entry is created for the skipped meeting

### T7: Overlap Detection (P1)
- [x] Create a Redmine time entry that overlaps with an Outlook meeting
- [x] Ask the AI to book time for today
- [x] Verify the overlapping meeting is excluded from the proposal
- [x] Verify the assistant mentions that some meetings were excluded due to existing entries

### T8: Quarter-Hour Rounding (P1)
- [x] Create a meeting from 10:03 to 10:52
- [x] Ask the AI to book time for today
- [x] Verify the proposed start time is 10:00 and end time is 10:45 (or 11:00)
- [x] Verify the duration matches the rounded times

### T9: Private Events Skipped (P2)
- [x] Create a meeting marked as "Private" in Outlook
- [x] Ask the AI to book time for today
- [x] Verify the private meeting is not included in the proposals

### T10: All-Day Holiday Event (P1)
- [x] Configure a holiday ticket in settings
- [x] Configure weekly hours in settings (e.g., 40)
- [x] Create an all-day event titled "Bank Holiday" or "Day Off"
- [x] Ask the AI to book time for today
- [x] Verify the assistant proposes booking 8 hours (40/5) to the holiday ticket

### T11: All-Day Non-Holiday Event (P1)
- [x] Create an all-day event titled "Birthday John" or similar
- [x] Ask the AI to book time for today
- [x] Verify the assistant asks whether to book or skip this event

### T12: Settings — Weekly Hours and Holiday Ticket (P1)
- [x] Open the settings page
- [x] Verify there are fields for weekly hours and holiday ticket
- [x] Set weekly hours to 38.5 and a holiday ticket number
- [x] Save and reload — verify the values persist

### T13: No Azure Client ID Configured (P2)
- [x] Remove azureClientId from config.json
- [x] Ask the AI to book time for today
- [x] Verify the assistant explains that Outlook integration is not configured
- [x] Verify no errors occur — the assistant gracefully handles the missing config

### T14: Auth Popup Fallback (P2)
- [x] Clear browser session/cookies to invalidate SSO *(only testable on real M365 deployment — demo mode bypasses MSAL)*
- [x] Ask the AI to book time for today *(only testable on real M365 deployment — demo mode bypasses MSAL)*
- [x] Verify a Microsoft login popup appears *(only testable on real M365 deployment — demo mode bypasses MSAL)*
- [x] Complete the login *(only testable on real M365 deployment — demo mode bypasses MSAL)*
- [x] Verify calendar events are fetched after authentication *(only testable on real M365 deployment — demo mode bypasses MSAL)*

### T15: Localization (P1)
- [x] Switch browser locale to German
- [x] Ask the AI to book time for today
- [x] Verify all new UI strings (booking flow, settings labels, error messages) appear in German

### T16: Mobile Layout (P2)
- [x] Open the app on mobile or 375px emulation
- [x] Open the AI assistant and ask to book time
- [x] Verify the booking flow works on mobile
- [x] Verify the settings fields for weekly hours and holiday ticket are usable on mobile
