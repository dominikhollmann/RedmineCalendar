# Feature Specification: Configurable Working Hours and Calendar View Toggle

**Feature Branch**: `005-working-hours-view`
**Created**: 2026-04-01
**Status**: Draft
**Input**: User description: "Let user define default working times in settings and let him toggle between default working time and 24h view in calendar view"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Working Hours in Settings (Priority: P1)

As a user, I want to configure my personal working hours (start and end of day) in the settings, so the calendar focuses on the time range I actually work in rather than always showing a full 24-hour grid.

**Why this priority**: Without this setting, the view toggle (P2) has no meaningful "working hours" range to switch to. This is the prerequisite that gives the toggle its value. It is also useful on its own as it defines how the calendar defaults on first load.

**Independent Test**: Open settings, set working hours to 08:00–18:00, reload the calendar, and verify the visible time range starts at 08:00 and ends at 18:00 without any further action.

**Acceptance Scenarios**:

1. **Given** the settings page is open, **When** the user sets a working-day start time (e.g., 08:00) and end time (e.g., 18:00), **Then** the values are saved and confirmed.
2. **Given** working hours are saved, **When** the calendar loads, **Then** the calendar's visible time grid begins at the configured start time and ends at the configured end time.
3. **Given** working hours are configured, **When** the user reloads the page, **Then** the configured working hours are restored and the calendar reflects them.
4. **Given** the user changes working hours in settings, **When** they return to the calendar, **Then** the calendar immediately reflects the updated range.
5. **Given** an end time earlier than or equal to the start time is entered, **When** the user attempts to save, **Then** an error is shown and the invalid value is not saved.

---

### User Story 2 - Toggle Between Working Hours and Full 24-Hour View (Priority: P2)

As a user, I want to toggle the calendar between my configured working hours view and a full 24-hour view, so I can quickly see entries that fall outside my normal working hours (e.g., very early or late log entries) without permanently changing my settings.

**Why this priority**: The working hours view is the optimal default for daily use, but occasionally entries exist outside that window. A one-click toggle to the full day avoids the need to go into settings just to reveal out-of-range entries.

**Independent Test**: With working hours set to 08:00–18:00, add a time entry at 06:00, then toggle to 24h view and verify the 06:00 entry is visible; toggle back and verify it is hidden again.

**Acceptance Scenarios**:

1. **Given** the calendar is showing the working hours view, **When** the user activates the 24h toggle, **Then** the calendar expands to show the full 00:00–24:00 range and all entries (including those outside working hours) are visible.
2. **Given** the calendar is in 24h view, **When** the user deactivates the toggle, **Then** the calendar returns to the configured working hours range.
3. **Given** the user switches view, **When** they navigate to a different week, **Then** the chosen view mode (working hours or 24h) is retained.
4. **Given** the calendar is in working hours view, **When** there are no entries outside working hours, **Then** the toggle is still available (the user may want to verify this).
5. **Given** no working hours have been configured, **When** the calendar loads, **Then** the calendar defaults to a sensible standard working range (e.g., 07:00–19:00) and the toggle still functions.

---

### Edge Cases

- If the user sets working hours to exactly midnight-to-midnight (00:00–24:00), the working hours view and the 24h view are identical — the toggle has no visible effect but should not cause an error.
- If a time entry's start time (from the `[start:HH:MM]` tag) falls outside the working hours window, it is not visible in the working hours view but is visible in 24h view — no data is lost.
- The toggle state (working hours vs. 24h) should be remembered across page reloads consistently with the view mode preference established in feature 002.
- Working hours configuration is independent of the ArbZG daily limit checks (feature 004) — a user may configure shorter working hours than the legal maximum.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The settings page MUST allow the user to configure a working-day start time and a working-day end time (both in HH:MM, 24-hour format).
- **FR-002**: The configured working hours MUST be persisted locally and restored after a page reload.
- **FR-003**: The settings page MUST reject configurations where the end time is not strictly after the start time, showing a clear error message.
- **FR-004**: The calendar MUST default to showing only the time range between the configured working-day start and end times.
- **FR-005**: The calendar MUST provide a toggle control to switch between the working hours view and a full 24-hour view.
- **FR-006**: In 24-hour view, the calendar MUST show the full 00:00–24:00 time grid.
- **FR-007**: Switching between working hours and 24-hour view MUST take effect immediately without a page reload.
- **FR-008**: The selected view mode (working hours vs. 24h) MUST be persisted locally and restored after a page reload.
- **FR-009**: If no working hours have been configured by the user, the calendar MUST fall back to a sensible default range (07:00–19:00) for the working hours view.
- **FR-010**: All time entries MUST remain accessible regardless of the active view mode — the working hours view only hides parts of the time grid, it does not filter or delete entries.

### Key Entities

- **Working Hours Setting**: A user preference consisting of a start time and an end time (HH:MM), defining the default visible range of the calendar's time grid.
- **Calendar View Mode**: A toggle state (working hours / 24h) controlling how much of the time axis is visible; persisted locally alongside the day-range preference from feature 002.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can configure their working hours in settings in under 1 minute.
- **SC-002**: The calendar reflects the configured working hours immediately on load, with no additional user action.
- **SC-003**: The user can switch between working hours and 24h view with a single interaction (one click/tap).
- **SC-004**: The view mode preference survives a page reload in 100% of cases.
- **SC-005**: No time entries are hidden or lost as a result of switching view modes — all data remains accessible by toggling to 24h view.

## Assumptions

- The existing calendar (feature 001) is the foundation; this feature modifies the visible time-grid range and adds a settings field.
- Working hours are a single global setting (same start/end for all days of the week); per-day variation is out of scope.
- The working hours setting is stored locally in the browser, consistent with the approach used for other settings in this project.
- The feature 002 day-range toggle (Mo–Fr vs. full week) and this feature's time-range toggle (working hours vs. 24h) are independent orthogonal controls — both can be active simultaneously.
- The default fallback range (07:00–19:00) is used only when no working hours have ever been saved; once saved, the user's value is always used.
- Mobile layout is out of scope, consistent with the overall project constitution.
