# Feature Specification: Booking Guard Warnings

**Feature Branch**: `042-booking-guard-warnings`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "GitHub issues #216 and #201 — create a new GitHub issue for the combined retirement. Link and close the previous issues."

**Consolidates**: Closes #216 (future-date booking warning) and #201 (reporting-deadline booking warning)

## Clarifications

### Session 2026-06-17

- Q: Does an entry starting exactly at the deadline moment (e.g. 22:00) also trigger the warning? → A: Yes — the check is inclusive (`reference start ≤ deadline`); entries at exactly the cutoff are within the reported period.
- Q: Does the deadline warning also apply to delete operations, and what exactly triggers it? → A: Yes — the warning fires on create, edit, and delete. The goal is to catch any mutation that would make a resubmitted report differ: for create, check new start ≤ deadline; for edit/move, check original start ≤ deadline OR new start ≤ deadline; for delete, check original start ≤ deadline. Check is always on start time only, never end time.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Future-Date Booking Warning (Priority: P1)

A user accidentally selects a date in the future when creating a time entry. Before the entry is saved, the system shows a soft-warning dialog so the user can catch the mistake and correct the date without losing their form data.

**Why this priority**: Future-date bookings are almost always user error. A prompt before submit prevents bad data from entering Redmine with minimal friction (soft gate — user can still proceed).

**Independent Test**: Open the time-entry form, pick any date after today, fill in the remaining fields, and submit. Verify the warning dialog appears. Confirm through it and verify the entry saves successfully.

**Acceptance Scenarios**:

1. **Given** the time-entry form is open with a date set to tomorrow, **When** the user submits the form, **Then** a warning dialog appears before the entry is saved.
2. **Given** the time-entry form is open with today's date, **When** the user submits the form, **Then** no warning dialog appears and the entry saves immediately.
3. **Given** the time-entry form is open with a future date and a vacation/holiday ticket, **When** the user submits the form, **Then** no warning dialog appears (exempt ticket type).
4. **Given** the warning dialog is shown, **When** the user clicks "Continue anyway", **Then** the entry is saved normally.
5. **Given** the warning dialog is shown, **When** the user clicks "Cancel", **Then** the dialog closes and the form remains open with all data intact.

---

### User Story 2 — Reporting-Deadline Booking Warning (Priority: P2)

A user creates, edits, or deletes a time entry after the company's weekly reporting cutoff (Friday 22:00) in a way that would change what the report would show if resubmitted. The system warns the user before the mutation is applied so they can decide whether to proceed.

**Why this priority**: Any mutation that touches the reported period — adding, changing, or removing an entry — can cause a discrepancy between what was reported and what Redmine now contains. A warning at the point of action lets users catch this with minimal friction (soft gate — they can always confirm and proceed).

**Independent Test**: With the feature enabled in `config.json`, simulate a save after the Friday 22:00 cutoff for a date in the previous week, and verify the deadline warning dialog appears.

**Acceptance Scenarios**:

1. **Given** it is Saturday and the user creates a new entry with start time last Thursday 14:00 (≤ Friday 22:00), **When** the form is submitted, **Then** the deadline warning appears (add: new start ≤ deadline).
2. **Given** it is Saturday and the user creates a new entry with start time next Monday 09:00 (> Friday 22:00), **When** the form is submitted, **Then** no deadline warning appears (but the future-date warning from Story 1 applies).
3. **Given** the `bookingDeadline.enabled` flag is `false` in `config.json`, **When** any entry is saved, **Then** no deadline warning appears regardless of date.
4. **Given** the deadline warning dialog is shown, **When** the user confirms, **Then** the action proceeds.
5. **Given** the deadline warning dialog is shown, **When** the user cancels, **Then** the form stays open with all data intact.
6. **Given** it is Friday 23:00 and the user edits an existing entry whose original start is Friday 19:00, **When** the form is submitted, **Then** the deadline warning appears (edit: original start ≤ deadline).
7. **Given** it is Friday 23:00 and the user moves an entry from Saturday 09:00 to Friday 18:00, **When** the form is submitted, **Then** the deadline warning appears (edit: new start ≤ deadline, even though original start was after the deadline).
8. **Given** it is Friday 23:00 and the user moves an entry from Friday 19:00 to Saturday 09:00, **When** the form is submitted, **Then** the deadline warning appears (edit: original start ≤ deadline, even though the destination is after the deadline).
9. **Given** it is Saturday and the user deletes an existing entry with start time last Thursday 14:00 (≤ Friday 22:00), **When** the user confirms deletion, **Then** the deadline warning appears before the deletion is executed (delete: original start ≤ deadline).
10. **Given** it is Saturday and the user deletes an entry with start time next Monday 09:00, **When** the user confirms deletion, **Then** no deadline warning appears (delete: original start > deadline).

---

### User Story 3 — Admin Configuration of Reporting Deadline (Priority: P3)

An admin can configure the weekly reporting cutoff day and time via `config.json`. This allows organisations with a different reporting schedule (e.g. Monday morning instead of Friday night) to adapt the feature without code changes.

**Why this priority**: Necessary for multi-company deployments, but the feature delivers value with default Friday/22:00 configuration even before an admin customises it.

**Independent Test**: Change `bookingDeadline.dayOfWeek` and `bookingDeadline.hour` in `config.json`, reload the app, and verify the warning fires at the new cutoff.

**Acceptance Scenarios**:

1. **Given** `bookingDeadline` is absent from `config.json`, **When** the app loads, **Then** the deadline-warning feature is disabled (safe default).
2. **Given** `bookingDeadline.enabled: true` with `dayOfWeek: 5, hour: 22`, **When** a late booking is saved, **Then** the warning uses "Friday 22:00" as the threshold.
3. **Given** `bookingDeadline.enabled: true` with a custom `dayOfWeek: 1, hour: 8`, **When** the admin changes this, **Then** the warning fires relative to the new Monday 08:00 cutoff.

---

### Edge Cases

- What happens when both warnings apply simultaneously (future date AND past deadline)? The future-date warning takes priority; after the user confirms, the deadline warning is checked next so both can fire in sequence.
- How does the system handle entries exactly on today's date with a time in the past? No future-date warning is shown (same calendar day regardless of hour).
- What happens if `config.json` cannot be loaded? Both warnings default to off — no false positives.
- What if the user's device clock is wrong? The warnings are based on the client clock; no server-side validation is added (out of scope).
- What about bulk-move operations (feature 028)? The same guard logic applies when entries are moved to a future date or past the deadline.
- **Same-day deadline case**: An entry starting at 19:00 (or at exactly 22:00) on the deadline day is within the reported period (reference start ≤ deadline moment). Editing it after 22:00 triggers the warning even though the calendar date matches the deadline date.
- **Pre-edit start time for edits**: When a user drags/moves an existing entry, the check uses the entry's original start time (before the drag), not the destination. This ensures that moving a reported entry to a future slot still triggers the warning.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST display a warning dialog before saving a time entry when the entry's date is strictly after today's calendar date.
- **FR-002**: The future-date warning MUST NOT appear when the entry's date equals today's date, regardless of the entry's start/end time.
- **FR-003**: The future-date warning MUST NOT appear for entries assigned to tickets configured as vacation, public holiday, or holiday (matching the `holidayTicket` / `vacationTicket` exemption already used by ArbZG checks in `config.json`).
- **FR-004**: The warning dialog MUST match the visual design of the existing closed-ticket booking gate (feature 040): same modal, same button layout, same visual treatment.
- **FR-005**: The warning dialog MUST offer two actions: "Continue anyway" (saves the entry) and "Cancel" (returns to the open form with all data intact).
- **FR-006**: The system MUST display a deadline warning before any time-entry mutation (create, edit, delete) when the current time is past the most recent admin-configured deadline moment AND the mutation touches the reported period as defined by FR-015. The check is always on **start time only** — end time is never considered.
- **FR-007**: The deadline warning MUST NOT appear when no start time involved in the mutation falls at or before the deadline moment.
- **FR-015**: A mutation **touches the reported period** when any of the following holds (all comparisons use start time only, inclusive boundary `≤`):
  - **Create**: the new entry's start time ≤ deadline moment.
  - **Edit / move**: the entry's original start time ≤ deadline moment, OR the proposed new start time ≤ deadline moment (either position touching the reported period is sufficient to warn).
  - **Delete**: the entry's original start time ≤ deadline moment.
- **FR-008**: The deadline warning MUST NOT appear when `bookingDeadline.enabled` is `false` or the `bookingDeadline` key is absent from `config.json`.
- **FR-009**: Admin MUST be able to configure the cutoff via `config.json` fields: `bookingDeadline.enabled` (boolean), `bookingDeadline.dayOfWeek` (0–6, Sunday = 0), `bookingDeadline.hour` (0–23), `bookingDeadline.minute` (0–59).
- **FR-010**: When both warnings are applicable, the future-date warning MUST be shown first; if the user confirms, the deadline warning is shown next.
- **FR-011**: All user-visible strings (dialog titles, body text, button labels) MUST be added to `js/i18n/en.js` and `js/i18n/de.js` and accessed via `t()`. No hardcoded English strings in UI code.
- **FR-012**: The guard logic MUST also apply to the bulk-move operation (feature 028) when entries are moved to a future date or into a past reporting period.
- **FR-013**: `docs/content.en.md` and `docs/content.de.md` MUST be updated to describe both warnings before the feature is marked done.
- **FR-014**: A unit test MUST cover the future-date detection logic and the deadline calculation logic independently.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Future-date entries are intercepted 100% of the time before save; exempt ticket types (vacation/holiday) are never intercepted.
- **SC-002**: Deadline warnings appear for any create, edit, or delete that touches the reported period (at least one start time involved ≤ deadline moment); mutations that touch only the current or future period never trigger the warning.
- **SC-003**: Both warning dialogs are visually indistinguishable from the existing closed-ticket warning in layout, button placement, and modal size.
- **SC-004**: Disabling `bookingDeadline` in `config.json` results in zero deadline warnings across all test scenarios.
- **SC-005**: All user-visible strings render correctly in both English and German with no untranslated keys.
- **SC-006**: Existing unit tests and UI tests remain fully green after the feature lands.

## Assumptions

- The exemption ticket IDs for vacation/holiday are already present in `config.json` (`holidayTicket`, `vacationTicket`) and can be read by the same mechanism used in ArbZG checks — no new config schema is needed for the future-date exemption.
- The `bookingDeadline` feature defaults to **disabled** when the key is absent, preserving backward compatibility for deployments that have not yet added the key.
- The warning dialogs are soft gates (user can always confirm and proceed); hard blocking is explicitly out of scope.
- Per-user configuration of the deadline is out of scope; the deadline is admin-managed only.
- Server-side validation of booking dates is out of scope; the guards are client-side only.
- The client device clock is trusted as the source of truth for "now".
