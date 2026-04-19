# Feature Specification: Mobile Calendar View

**Feature Branch**: `012-mobile-calendar`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "Mobile version of the calendar for editing/adding/deleting time entries on mobile. Users should be able to log time en route. Standard AI features (014, 015) should work on mobile. Feature 019 (agentic booking) is desktop-only."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Calendar on Mobile (Priority: P1)

A user opens the app on their phone and sees a mobile-optimized calendar view showing their time entries for the current week. The layout adapts to the small screen — no horizontal scrolling, readable text, touch-friendly navigation.

**Why this priority**: Viewing is the foundation. Without a usable mobile layout, editing/adding on mobile is pointless.

**Independent Test**: Open the app on a phone (or browser dev tools in mobile mode). Verify the calendar renders without horizontal scrolling and entries are readable.

**Acceptance Scenarios**:

1. **Given** a user opens the app on a mobile device, **When** the page loads, **Then** the calendar renders in a mobile-optimized layout without horizontal scrolling.
2. **Given** the user is viewing the calendar on mobile, **When** they swipe or tap navigation buttons, **Then** they can move between days/weeks.
3. **Given** the user has time entries, **When** they view the calendar on mobile, **Then** each entry shows the ticket number, subject, and duration in readable text.
4. **Given** the user rotates their phone to landscape, **When** the layout adjusts, **Then** more detail is visible without breaking the layout.

---

### User Story 2 - Create and Edit Time Entries on Mobile (Priority: P2)

A user taps on a time slot or existing entry on their phone to open the time entry form. The form is touch-friendly with appropriately sized inputs and buttons.

**Why this priority**: Creating and editing entries is the core value proposition for mobile — logging time en route without waiting to get back to a desk.

**Independent Test**: On a phone, tap a time slot, fill in the form, and save. Verify the entry appears on the calendar.

**Acceptance Scenarios**:

1. **Given** a user taps an empty time slot on mobile, **When** the form opens, **Then** all fields are touch-friendly (large enough to tap, no tiny inputs).
2. **Given** a user fills in the time entry form on mobile, **When** they tap Save, **Then** the entry is saved and visible on the calendar.
3. **Given** a user taps an existing entry on mobile, **When** the edit form opens, **Then** all current values are pre-filled and editable.
4. **Given** a user wants to delete an entry on mobile, **When** they open the entry and tap Delete, **Then** the entry is removed after confirmation.

---

### User Story 3 - AI Chat on Mobile (Priority: P3)

A user can use the AI chat assistant on their phone to query time entries or create/edit/delete entries via natural language — same as on desktop (features 014 and 015).

**Why this priority**: The AI chat is especially valuable on mobile where typing is slower and form interaction is harder. Voice-to-text input makes chat-based booking faster than form-based on a phone.

**Independent Test**: Open the AI chat panel on a phone, ask "How much did I book this week?", verify a correct response.

**Acceptance Scenarios**:

1. **Given** a user opens the AI chat on mobile, **When** the panel opens, **Then** it fills the screen (not a side panel) and the input is easy to type in.
2. **Given** the user asks a question about time entries, **When** the AI responds, **Then** the response is readable on the small screen.
3. **Given** the user asks the AI to create an entry, **When** the modal opens, **Then** the modal is mobile-optimized (full-screen, touch-friendly).

---

### Edge Cases

- What about network connectivity en route? The app requires a connection to Redmine. Offline mode is out of scope for this feature.
- How does the user access the app on mobile when Redmine is behind the company firewall? (Assumed: user connects via VPN. Network/VPN configuration is an IT concern, not an app concern.)
- What about the working hours toggle and ArbZG warnings on mobile? (Assumed: these features should work on mobile but their visual presentation may be simplified.)
- Feature 019 (agentic time booking) is desktop-only — it requires access to Outlook, Teams, Windows Event Log which are not available on mobile.

## Clarifications

### Session 2026-04-19

- Q: What should the default mobile calendar view be? → A: Day view (single day timegrid, swipe between days). Matches desktop experience and allows tapping time slots to create entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The calendar MUST render in a mobile-optimized layout on screens narrower than 768px.
- **FR-002**: The mobile layout MUST NOT require horizontal scrolling to view or interact with the calendar.
- **FR-003**: All touch targets (buttons, time slots, entries) MUST be at least 44x44 pixels per mobile accessibility guidelines.
- **FR-004**: Navigation between days/weeks MUST work via touch gestures (swipe) or prominently placed buttons.
- **FR-005**: The time entry form MUST be usable on mobile — full-width inputs, appropriately sized buttons, keyboard-optimized input types (date, time, number).
- **FR-006**: Creating, editing, and deleting time entries MUST work identically on mobile as on desktop.
- **FR-007**: The AI chat panel MUST display as a full-screen overlay on mobile (not a side panel).
- **FR-008**: The AI chat assistant features (query, create, edit, delete — features 014 and 015) MUST work on mobile.
- **FR-009**: Feature 019 (agentic time booking with Outlook/Teams/Windows integration) is explicitly OUT OF SCOPE for mobile.
- **FR-010**: The settings page MUST be usable on mobile with the same functionality as desktop.
- **FR-011**: The mobile view MUST be a responsive adaptation of the existing app — NOT a separate mobile app or codebase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view, create, edit, and delete time entries on a phone in under 2 minutes per entry.
- **SC-002**: The calendar renders without horizontal scrolling on screens as narrow as 320px.
- **SC-003**: All touch targets meet the 44x44px minimum size.
- **SC-004**: The AI chat is usable on mobile with the same capabilities as desktop (features 014, 015).
- **SC-005**: No separate codebase or app — single responsive web app serves both desktop and mobile.

## Assumptions

- The app is already a web application served via a URL — mobile users access the same URL on their phone's browser.
- Mobile access requires VPN when Redmine is on the company intranet. VPN setup is an IT responsibility, not an app feature.
- The current FullCalendar library supports responsive/mobile views — the implementation uses FullCalendar's built-in mobile capabilities plus CSS media queries.
- The mobile view defaults to a single-day timegrid view (swipe between days) since a full week doesn't fit on a phone screen. This matches the desktop interaction model (tapping slots to create entries).
- Offline mode is out of scope — the app requires an active connection to Redmine.
- Feature 019 (agentic booking) is desktop-only because it depends on local system integrations (Outlook, Teams, Windows Event Log) that aren't available on mobile.
- The app should be installable as a PWA (Progressive Web App) on mobile for a native-like experience — but this is a stretch goal, not a hard requirement.
