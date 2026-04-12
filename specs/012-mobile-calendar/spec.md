# Feature Specification: Mobile Calendar View

**Feature Branch**: `012-mobile-calendar`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Add mobile version of calendar - Add support for smartphones via a mobile version of the website"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Calendar on Smartphone (Priority: P1)

A user opens the calendar on their smartphone. The layout adapts to the small screen: the day/week grid is readable without horizontal scrolling, navigation controls are large enough to tap comfortably, and the current week or day is visible at a glance.

**Why this priority**: Without a usable calendar view on mobile, no other mobile feature has value. This is the foundation.

**Independent Test**: Open the app on a smartphone (or browser with mobile viewport). The calendar renders correctly, all days/events are visible, and no content is cut off or requires pinch-zoom to read.

**Acceptance Scenarios**:

1. **Given** a user opens the calendar on a smartphone, **When** the page loads, **Then** the calendar layout fits the screen width without horizontal scrolling and all navigation controls are visible and tappable.
2. **Given** the user is viewing the calendar, **When** they tap the "next" or "previous" navigation buttons, **Then** the calendar advances or retreats to the correct week or day without layout breakage.
3. **Given** the user is on a narrow screen, **When** the calendar shows multiple days, **Then** each day column is readable and entry titles are not truncated to the point of being unrecognizable.

---

### User Story 2 - Add a Time Entry on Smartphone (Priority: P2)

A user taps on a time slot or an existing entry on their smartphone to open the time entry form. The form is fully usable with touch input: fields are large enough to tap, the keyboard does not obscure required inputs, and the user can submit or cancel without difficulty.

**Why this priority**: Viewing is useful, but the primary action in the app is logging time. Mobile entry is the core workflow.

**Independent Test**: On a smartphone viewport, tap an empty slot. The time entry form opens, all fields are accessible, and a valid entry can be submitted successfully.

**Acceptance Scenarios**:

1. **Given** the user taps an empty time slot, **When** the time entry form opens, **Then** all form fields (issue search, activity, duration, comment) are visible and reachable without scrolling past them.
2. **Given** the form is open and the on-screen keyboard is displayed, **When** the user focuses a text input, **Then** the keyboard does not permanently obscure the submit button or other required fields.
3. **Given** the user has filled in the form, **When** they tap Submit, **Then** the entry is saved and the calendar updates to show the new entry.
4. **Given** the user taps Cancel or closes the form, **Then** no entry is created and the calendar is shown again.

---

### User Story 3 - Navigate Between Views on Smartphone (Priority: P3)

A user can switch between day and week views and navigate between time periods using clearly labeled buttons on their smartphone.

**Why this priority**: Navigation fluency improves the mobile experience, but the app remains functional with tap-based buttons as the baseline.

**Independent Test**: On a smartphone viewport, use the view switcher (day/week) and navigate forward and backward through multiple weeks. All transitions are smooth and the correct dates are shown.

**Acceptance Scenarios**:

1. **Given** the calendar is in week view on a smartphone, **When** the user taps the forward navigation, **Then** the next week is shown correctly.
2. **Given** the calendar is in week view, **When** the user switches to day view, **Then** the calendar shows a single-day layout suitable for narrow screens.
3. **Given** the user is in day view, **When** they navigate to the next day, **Then** the correct day is displayed.

---

### Edge Cases

- What happens when the device is rotated from portrait to landscape? The layout should reflow gracefully without data loss or dismissal of an open form.
- How does the system handle very long issue names in entry titles on narrow columns? Titles should truncate with an ellipsis rather than overflow or break the layout.
- What happens if the user opens the settings page on a smartphone? The settings form must also be usable on small screens.
- How does the app behave on tablets (medium-sized screens)? Tablet-width viewports (768 px and above) use the existing desktop layout, which is already acceptable at that size.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The calendar view MUST display correctly on screen widths from 320 px to 767 px without horizontal scrolling.
- **FR-002**: All interactive controls (navigation buttons, view switchers, event tap targets) MUST have a minimum touch target size of 44×44 px.
- **FR-003**: Users MUST be able to open, fill out, and submit the time entry form entirely with touch input on a smartphone.
- **FR-004**: The time entry form MUST remain accessible when the on-screen keyboard is visible (fields scroll into view or the form adjusts its position).
- **FR-005**: The calendar MUST default to day view when the screen width is below the phone threshold, to avoid cramped multi-column layouts.
- **FR-006**: The settings page MUST be usable on smartphone screen widths — all fields visible and interactive without horizontal scrolling.
- **FR-007**: All existing desktop functionality MUST continue to work unchanged on desktop-width viewports (no regressions).
- **FR-008**: All user-visible strings introduced or modified for mobile MUST use the existing localization system so both German and English are supported.

### Key Entities

- **Viewport breakpoint**: The screen-width threshold below which the mobile layout activates. Assumed to be 768 px (standard phone/tablet boundary).
- **Touch target**: Any interactive element (button, event block, form field) that must meet minimum tap-area requirements for reliable touch input.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The calendar page loads and renders correctly on a 375 px wide viewport (common smartphone size) without any horizontal overflow or unreadable content.
- **SC-002**: A user on a smartphone can log a new time entry (open form → fill fields → submit) in under 2 minutes with no assistance.
- **SC-003**: All interactive controls are operable using only touch input — no mouse or stylus required.
- **SC-004**: Zero regressions on desktop: all existing features work correctly on a 1280 px wide viewport after the mobile changes are applied.
- **SC-005**: The layout reflows correctly when the device is rotated between portrait and landscape orientations.

## Assumptions

- A responsive design approach is used (same URL and codebase, layout adapts to screen size) rather than a separate mobile website or native app.
- Tablet-width screens (768 px and above) use the existing desktop layout, which is already acceptable at that size.
- The mobile layout is optimized for portrait orientation as the primary use case; landscape is a supported secondary orientation.
- Touch-based swipe gestures (e.g., swipe to navigate weeks) are out of scope for the initial version; tap-based navigation buttons are sufficient.
- The app does not require offline capability on mobile; an active network connection is assumed.
- No changes are required to the Redmine API integration or data model — only the presentation layer is affected.
- Cookie-based authentication works the same on mobile browsers as on desktop; no additional login flow is needed.
