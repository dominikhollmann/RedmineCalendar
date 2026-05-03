# UAT: Agentic AI Time-Booking — Phase 1: Outlook Calendar

**Feature**: 019-agentic-time-booking
**Prerequisites**: Azure AD app registered with Calendars.Read delegated permission, client ID configured in config.json, Outlook calendar with test meetings

## Test Scenarios

### T1: Outlook Authentication (P1)
- [ ] Open the app in a browser where you're logged into Azure AD (Outlook/Teams SSO)
- [ ] Open the AI assistant chat panel
- [ ] Ask "Book my time for today"
- [ ] Verify the app authenticates silently (no login popup)
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
- [ ] Create a meeting without any ticket number in the title (e.g., "Team Lunch")
- [ ] Ask the AI to book time for today
- [ ] Verify the assistant asks which ticket to book it on
- [ ] Provide a ticket number and verify it's used for the proposal

### T5: Confirm and Book (P1)
- [ ] When the assistant presents a meeting for confirmation, confirm it
- [ ] Verify the time entry modal opens pre-filled with the correct ticket, date, start/end time
- [ ] Click Save in the modal
- [ ] Verify the entry appears on the calendar immediately
- [ ] Verify the assistant proceeds to the next meeting

### T6: Skip a Meeting (P1)
- [ ] When the assistant presents a meeting, say "skip"
- [ ] Verify the meeting is skipped and the assistant moves to the next one
- [ ] Verify no time entry is created for the skipped meeting

### T7: Overlap Detection (P1)
- [ ] Create a Redmine time entry that overlaps with an Outlook meeting
- [ ] Ask the AI to book time for today
- [ ] Verify the overlapping meeting is excluded from the proposal
- [ ] Verify the assistant mentions that some meetings were excluded due to existing entries

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
- [ ] Configure a holiday ticket in settings
- [ ] Configure weekly hours in settings (e.g., 40)
- [ ] Create an all-day event titled "Bank Holiday" or "Day Off"
- [ ] Ask the AI to book time for today
- [ ] Verify the assistant proposes booking 8 hours (40/5) to the holiday ticket

### T11: All-Day Non-Holiday Event (P1)
- [ ] Create an all-day event titled "Birthday John" or similar
- [ ] Ask the AI to book time for today
- [ ] Verify the assistant asks whether to book or skip this event

### T12: Settings — Weekly Hours and Holiday Ticket (P1)
- [ ] Open the settings page
- [ ] Verify there are fields for weekly hours and holiday ticket
- [ ] Set weekly hours to 38.5 and a holiday ticket number
- [ ] Save and reload — verify the values persist

### T13: No Azure Client ID Configured (P2)
- [ ] Remove azureClientId from config.json
- [ ] Ask the AI to book time for today
- [ ] Verify the assistant explains that Outlook integration is not configured
- [ ] Verify no errors occur — the assistant gracefully handles the missing config

### T14: Auth Popup Fallback (P2)
- [ ] Clear browser session/cookies to invalidate SSO
- [ ] Ask the AI to book time for today
- [ ] Verify a Microsoft login popup appears
- [ ] Complete the login
- [ ] Verify calendar events are fetched after authentication

### T15: Localization (P1)
- [ ] Switch browser locale to German
- [ ] Ask the AI to book time for today
- [x] Verify all new UI strings (booking flow, settings labels, error messages) appear in German

### T16: Mobile Layout (P2)
- [ ] Open the app on mobile or 375px emulation
- [ ] Open the AI assistant and ask to book time
- [ ] Verify the booking flow works on mobile
- [ ] Verify the settings fields for weekly hours and holiday ticket are usable on mobile
