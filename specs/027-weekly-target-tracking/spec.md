# Feature Specification: Weekly Hours Target Tracking

**Feature Branch**: `027-weekly-target-tracking`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Target tracking — show progress against the user's configured weekly hours target on the calendar header (next to the existing week total). Indicator should make it obvious how many hours remain in the week and whether unfilled days are coming up. Use the existing weeklyHours setting; do not add new configuration."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - At-a-Glance Progress Toward Weekly Target (Priority: P1)

A user who has set a weekly hours target opens the calendar mid-week and wants to know — without doing mental arithmetic — whether they are on pace to hit it. The existing week total shows total booked hours, but says nothing about whether that is enough, how many more hours are needed, or how many workdays remain to book.

**Why this priority**: Hitting the contractual weekly hours is the single most common reason users open this tool. The information needed to answer "am I on track?" is already in the app (weekly hours target + booked entries) but the user has to compute it. Making the answer instant benefits every user with a target configured and is small in scope.

**Independent Test**: With `weeklyHours` set to 40 in Settings and a partially filled week, opening the calendar shows a target indicator next to the existing week total displaying both the booked hours and the target (e.g., "16h / 40h"), the remaining hours, and the count of remaining unfilled workdays. Removing the weekly hours setting hides the indicator and restores the original header.

**Acceptance Scenarios**:

1. **Given** my weekly hours target is 40h and Mon–Tue are filled with 8h each, **When** I open the calendar on Wednesday, **Then** the header shows the booked total against the target (e.g., "16h / 40h"), a remaining-hours value (24h), and a count of remaining unfilled workdays (3).
2. **Given** my weekly hours target is 40h and the week shows exactly 40h booked, **When** I view the calendar, **Then** the indicator visually conveys that the target has been met (e.g., "40h / 40h ✓") in a non-negative tone.
3. **Given** my weekly hours target is 40h and the week shows 45h booked, **When** I view the calendar, **Then** the indicator shows the over-target state without scolding the user.
4. **Given** I have not configured weekly hours, **When** I view the calendar, **Then** the existing week total displays as it does today and no target indicator is shown.
5. **Given** I add, edit, move, resize, or delete a time entry, **When** the action completes, **Then** the indicator updates immediately to reflect the new totals (no page reload).
6. **Given** I navigate to a past week, **When** I view the calendar, **Then** the indicator shows booked-vs-target for that week but suppresses "remaining workdays" since the week is over.
7. **Given** I navigate to a future week, **When** I view the calendar, **Then** the indicator shows "0 of 40h" with all workdays counted as remaining.

---

### Edge Cases

- Weekly hours target is `0` or unset → the indicator is hidden; the existing week total is unchanged.
- Past weeks → the booked-vs-target portion remains, but "remaining workdays" is suppressed because the week is over.
- Future weeks → booked is 0; all weekday workdays are "remaining".
- Workweek toggle hides Sat/Sun → "remaining workdays" still counts only Mon–Fri regardless of toggle. Saturday/Sunday bookings (if any) still contribute to booked hours.
- Holiday/OOO bookings on a workday (existing holiday-ticket plumbing) → that day counts as filled (not unfilled) for "remaining workdays".
- Break-ticket entries (synthetic zero-duration blocks per feature 025) → contribute 0 to booked hours, consistent with their existing semantics.
- A day that is exactly 0h booked but is in the past → not counted as "remaining" (cannot be filled retroactively from the indicator's perspective).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When the weekly hours target is configured (`weeklyHours > 0`), the calendar header MUST display the visible week's booked total alongside the target (e.g., "16h / 40h").
- **FR-002**: When the weekly hours target is configured, the header MUST display "remaining hours" (target − booked, clamped at 0).
- **FR-003**: When the weekly hours target is configured AND the visible week is the current week or a future week, the header MUST display "remaining workdays" — the count of Mon–Fri days within the visible week that have no booked time and are not in the past, with holiday/OOO entries treated as filled.
- **FR-004**: When the visible week is in the past, "remaining workdays" MUST be suppressed; booked-vs-target MUST still be shown.
- **FR-005**: When the user has met or exceeded the target, the indicator MUST visually convey success in a non-negative tone (no "over budget" warning).
- **FR-006**: When `weeklyHours` is not configured (missing or 0), the header MUST NOT show the target indicator; the existing week total MUST display as it does today.
- **FR-007**: The indicator MUST update without a page reload after any time entry is added, edited, deleted, moved, or resized.
- **FR-008**: All new user-visible strings (labels, hover text, the success/over-target indicator) MUST be added to `js/i18n.js` in both EN and DE per the existing localization rule.
- **FR-009**: The indicator MUST be visually consistent with the existing week-total styling (same row, same font scale) and MUST remain readable on the mobile compact header (`< 768px`).

### Key Entities

- **Weekly Target**: derived value from the existing `weeklyHours` user setting (per-user, browser-local). No new persistent attribute.
- **Week Progress**: aggregate computed at render time from the visible week's loaded time entries — booked hours, remaining hours, remaining workdays.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user with a weekly hours target configured can determine in under 3 seconds whether they are on pace to meet it by glancing at the calendar header.
- **SC-002**: After any entry CRUD operation, the indicator reflects the new totals without a page reload, in under 300 ms (consistent with Constitution Principle II).
- **SC-003**: 0 false-positive "remaining workdays" counts: workdays that are already booked, in the past, or filled with a holiday/OOO entry are never counted as remaining.
- **SC-004**: When `weeklyHours` is not configured, the calendar header is visually unchanged from the current behaviour (verified by Playwright screenshot diff against pre-feature baseline).
- **SC-005**: The indicator is readable on mobile (`< 768px`) without overflowing the compact `.app-header` row.

## Assumptions

- "Workdays" means Monday through Friday in the visible week, regardless of whether the user is currently in workweek or full-week display mode. Sat/Sun bookings still count toward booked hours but do not contribute to "remaining workdays".
- Holiday/OOO entries (booked via the existing holiday-ticket plumbing) treat the booked day as "filled" for the purposes of "remaining workdays".
- "Booked hours" excludes synthetic zero-duration break-ticket blocks (consistent with their existing semantics from feature 025).
- The existing `weeklyHours` setting is reused as-is. No new per-user persistent settings are introduced.
- Target is a single weekly number; per-day or per-project targets are out of scope for this feature.
- "Past day" means before today in the user's local timezone, consistent with how the rest of the calendar handles "today".
- Mobile responsiveness is in scope (the indicator must fit on `< 768px`); no functional differences between mobile and desktop.
- All new business logic (target computation, remaining-workdays computation, holiday/break exclusion) MUST be covered by Vitest unit tests, and the indicator's visible behaviour MUST be covered by Playwright UI tests, per Constitution Principle III.
