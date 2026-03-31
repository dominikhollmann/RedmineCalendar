# Feature Specification: Calendar View Options and Week Totals

**Feature Branch**: `002-calendar-view-totals`
**Created**: 2026-03-31
**Status**: Draft
**Input**: User description: "I want to be able to switch between mo-fr view and full-week view. I want to see the total of the week."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch Between Workweek and Full-Week View (Priority: P1)

As a user, I want to toggle the calendar between a Monday–Friday view and a full Monday–Sunday view, so I can focus on work days by default but see the complete week when needed (e.g., if I logged hours on a weekend).

**Why this priority**: The workweek view is the primary working mode; most users only work Mo–Fr. The toggle makes weekend entries accessible without permanently cluttering the view. This is the more impactful of the two features.

**Independent Test**: Open the calendar, click the toggle, and confirm the visible day columns change between 5 days and 7 days.

**Acceptance Scenarios**:

1. **Given** the calendar is open in default (Mo–Fr) view, **When** the user activates the full-week toggle, **Then** Saturday and Sunday columns appear and the calendar spans 7 days.
2. **Given** the calendar is showing the full-week view, **When** the user deactivates the toggle, **Then** Saturday and Sunday columns disappear and only Mo–Fr are shown.
3. **Given** the user switches view mode, **When** they navigate to a different week, **Then** the chosen view mode is retained.
4. **Given** a time entry exists on a Saturday, **When** the user is in Mo–Fr view, **Then** Saturday entries are not visible; switching to full-week makes them visible.

---

### User Story 2 - Week Total Hours Display (Priority: P2)

As a user, I want to see the total number of hours logged for the entire current week, so I can quickly check whether I have reached my target hours without adding up individual entries manually.

**Why this priority**: The week total is a read-only summary that helps the user track their overall time budget. Useful on its own, but depends on the calendar already showing entries (covered by feature 001).

**Independent Test**: With at least two time entries in the same week, verify that the displayed weekly total matches the sum of their hours.

**Acceptance Scenarios**:

1. **Given** the calendar displays a week with multiple time entries, **When** the week is loaded, **Then** a weekly total (in hours, e.g. "8.5 h") is prominently visible.
2. **Given** a new time entry is added, **When** the calendar refreshes, **Then** the weekly total updates to include the new entry.
3. **Given** a time entry is deleted, **When** the calendar refreshes, **Then** the weekly total decreases accordingly.
4. **Given** the user navigates to a different week, **When** the week loads, **Then** the weekly total reflects only that week's entries.
5. **Given** no entries exist for the week, **When** the week is loaded, **Then** the weekly total shows "0 h" or equivalent empty state.

---

### Edge Cases

- When the user is in full-week view and all entries are on weekdays, Saturday/Sunday columns are empty but still visible.
- If the weekly total exceeds a typical workweek (e.g., 50+ hours), the display must still show the correct value without truncation.
- In Mo–Fr view, Saturday/Sunday entries are hidden from the grid but must not be deleted from Redmine.
- View mode preference must survive page reload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The calendar MUST provide a toggle control that switches between a 5-day (Monday–Friday) and a 7-day (Monday–Sunday) week view.
- **FR-002**: The default view on first load MUST be the 5-day workweek view.
- **FR-003**: The selected view mode MUST be persisted locally and restored after a page reload without user action.
- **FR-004**: The calendar MUST display a weekly total hours value, reflecting the sum of all time entries in the currently displayed week.
- **FR-005**: The weekly total MUST update whenever time entries are added, edited, or deleted within the current view.
- **FR-006**: The weekly total MUST update when the user navigates to a different week.
- **FR-007**: Switching view modes MUST take effect immediately without a page reload.

### Key Entities

- **View Mode**: A user preference (workweek / full-week) controlling which day columns are visible in the calendar.
- **Week Total**: A computed value equal to the sum of hours across all time entries for the currently displayed week range.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The user can switch between workweek and full-week view with a single interaction (one click/tap).
- **SC-002**: The view mode preference is retained across page reloads without additional user action.
- **SC-003**: The weekly total is always visible on the calendar without scrolling.
- **SC-004**: The weekly total is accurate (matches the arithmetic sum of all time entries for the week) in 100% of tested scenarios.
- **SC-005**: Switching view modes takes effect in under 1 second.

## Assumptions

- The existing calendar (feature 001) is already implemented and functional; this feature extends it.
- "Week total" covers the full Mon–Sun range currently displayed, not a rolling 7-day window from today.
- Saturday and Sunday entries are never deleted when the user is in workweek view — they are only hidden from the grid.
- View mode preference is stored in the browser locally without requiring a server round-trip.
- Mobile layout is out of scope, consistent with the overall project constitution.
