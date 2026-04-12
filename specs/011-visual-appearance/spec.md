# Feature Specification: Visual Appearance Improvements

**Feature Branch**: `011-visual-appearance`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Improve appearance: make ticket id and text bigger in time entries, increase row height, try if banded per hour instead of half hour is better"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Readable Time Entry Content (Priority: P1)

As a user glancing at the calendar, I want the ticket ID and subject to be the most visually prominent text in each entry card, while the time range becomes a quieter secondary detail — so the information I care about most is instantly readable.

The desired visual hierarchy is a swap of the current two middle lines:
- **Ticket ID + subject** adopts the style currently used for the time line (start – end, hours) — becoming the dominant text in the card.
- **Time line (start – end, hours)** adopts the style currently used for the project name — becoming a smaller, secondary detail.

**Why this priority**: The ticket is what users need to identify at a glance. The time range is already encoded in the card's vertical position and size on the grid, so it matters less visually.

**Independent Test**: Open the calendar with at least three time entries visible. The ticket ID and subject are the most prominent text in each card; the time range is visibly smaller and less prominent than before; the project name remains the least prominent.

**Acceptance Scenarios**:

1. **Given** the calendar is displaying time entries, **When** the user views the weekly calendar, **Then** the ticket ID and subject text is displayed in the style previously used for the time line, making it the visually dominant element in the card.
2. **Given** the calendar is displaying time entries, **When** the user views the weekly calendar, **Then** the time range (start – end, hours) is displayed in the style previously used for the project name, making it a quiet secondary detail.
3. **Given** a time entry with a long subject, **When** it is displayed on the calendar, **Then** the text truncates gracefully without overflowing the event card boundary.

---

### User Story 2 — Comfortable Row Height (Priority: P2)

As a user reading the calendar, I want the time slot rows to be taller so that event cards have more vertical space and the calendar feels less cramped.

**Why this priority**: Row height directly affects how much content is visible per event and how easy it is to click and drag entries. Increasing it improves both readability and interaction comfort.

**Independent Test**: Open the calendar. Each time slot row is visibly taller than before, giving event cards more breathing room.

**Acceptance Scenarios**:

1. **Given** the calendar is displayed in week view, **When** the user scrolls through the day, **Then** each time slot row is noticeably taller, giving entries more vertical space.
2. **Given** taller rows are applied, **When** the user drags or resizes an entry, **Then** drag and resize interactions still work correctly without regression.

---

### User Story 3 — Per-Hour Banding (Priority: P3)

As a user scanning the calendar, I want alternating shading applied per full hour rather than per half-hour so that the visual rhythm is less busy and easier to read.

**Why this priority**: Banding at the half-hour level creates a dense striped pattern. Switching to hourly banding reduces visual noise. This is a subjective improvement that will be evaluated by inspection during UAT.

**Independent Test**: Open the calendar. Alternating background shading changes every full hour rather than every 30 minutes, producing a calmer stripe pattern.

**Acceptance Scenarios**:

1. **Given** the calendar is displayed, **When** the user views the time grid, **Then** the alternating row background changes every full hour, not every 30 minutes.
2. **Given** hourly banding is applied, **When** the user is in either work-week or full-week view, **Then** banding is consistent across all day columns.

---

### Edge Cases

- What happens when an entry spans only 15 minutes? Text should not overflow the card even at the larger font size.
- With taller rows, does the initial scroll position still bring working hours into view without requiring excessive extra scrolling?
- Does hourly banding remain visually consistent when the calendar renders midnight-continuation segments on the following day?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The ticket ID and subject line MUST adopt the visual style (size, weight, or prominence) currently used for the time line; the time line MUST adopt the visual style currently used for the project name line. The result is a hierarchy swap: ticket > time > project.
- **FR-002**: Time slot row height MUST be increased to give event cards more vertical space.
- **FR-003**: Alternating background banding MUST change every full hour rather than every 30 minutes.
- **FR-004**: All existing interactions (drag-to-move, drag-to-resize, click-to-select, double-click-to-edit) MUST continue to work correctly after the visual changes.
- **FR-005**: Text in event cards MUST truncate gracefully when it exceeds the available card width or height.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In each event card, the ticket ID and subject is the most visually prominent text element; the time range is less prominent than the ticket but more prominent than the project name (which remains the least prominent).
- **SC-002**: A 30-minute entry card contains at least two legible lines of text without clipping at the new row height.
- **SC-003**: The calendar grid shows alternating shading that changes every 60 minutes across all day columns.
- **SC-004**: All drag, resize, select, and edit interactions pass the regression checklist without failures after the visual changes are applied.

## Assumptions

- Changes apply to the weekly calendar view only; settings and other pages are out of scope.
- The visual style of three lines is affected by a hierarchy swap: ticket ID/subject takes the style of the current time line; the time line takes the style of the current project name line; the project name style is unchanged.
- Row height is increased uniformly across all time slots; no per-entry or per-day variation is required.
- Hourly banding is a visual-only change; no data or API changes are needed.
- If hourly banding looks worse than half-hour banding during UAT, it can be reverted without affecting other improvements.
