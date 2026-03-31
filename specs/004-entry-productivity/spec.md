# Feature Specification: Entry Productivity and Compliance Features

**Feature Branch**: `004-entry-productivity`
**Created**: 2026-04-01
**Status**: Draft
**Input**: User description: "Check German Arbeitszeitgesetz rules and warn user on violations. Copy and paste of time entries. Configurable default activity in settings. Quick-add entries: select time range, enter ticket number, press Enter to save."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick-Add Time Entries (Priority: P1)

As a user, I want to select a time range on the calendar, type a ticket number, and press Enter to immediately log the time entry, so I can record time as fast as possible without opening the full entry form for simple bookings.

**Why this priority**: This is the highest-frequency action in the app. Reducing a multi-step form interaction to a three-step keyboard flow (select → type → Enter) has the greatest daily impact on the user's productivity.

**Independent Test**: Select a 1-hour slot on the calendar, type a valid ticket number in the quick-add field that appears, press Enter, and verify the entry is saved to Redmine without the full form ever opening.

**Acceptance Scenarios**:

1. **Given** the calendar is open, **When** the user selects a time range by dragging, **Then** a compact quick-add bar appears (instead of or alongside the full form) with the time range pre-filled.
2. **Given** the quick-add bar is visible, **When** the user types a valid ticket number and presses Enter, **Then** the time entry is saved to Redmine using the default activity and the entry appears on the calendar.
3. **Given** the quick-add bar is visible, **When** the user presses Escape or clicks elsewhere, **Then** the quick-add bar is dismissed without saving.
4. **Given** the quick-add bar is active, **When** the user types a non-existent ticket number and presses Enter, **Then** an inline error is shown and the entry is not saved.
5. **Given** the quick-add bar is active, **When** the user wants to set a comment or override the activity, **Then** an option to "open full form" is available from the quick-add bar.
6. **Given** no default activity is configured, **When** the user submits a quick-add entry, **Then** the user is prompted to select an activity or the first available activity is used as fallback.

---

### User Story 2 - Configurable Default Activity in Settings (Priority: P2)

As a user, I want to configure a default time entry activity in the settings, so the activity field is pre-selected whenever I open the entry form or use quick-add, and I do not have to select it manually every time.

**Why this priority**: The activity field must be set on every entry. Most users book predominantly to one activity (e.g., "Development"). Pre-selecting it eliminates a repetitive mandatory step that adds no value for the common case.

**Independent Test**: Set a default activity in settings, open the time entry form for a new entry, and verify the activity dropdown is already set to the configured default.

**Acceptance Scenarios**:

1. **Given** the settings page is open, **When** the user selects an activity from the available Redmine activities, **Then** it is saved as the default activity.
2. **Given** a default activity is configured, **When** the user opens the new-entry form, **Then** the activity field is pre-filled with the default activity.
3. **Given** a default activity is configured, **When** the user uses quick-add, **Then** the entry is saved with the default activity without any additional input.
4. **Given** a default activity is configured, **When** the user opens an existing entry for editing, **Then** the activity field shows the entry's actual activity (not overridden by the default).
5. **Given** the configured default activity no longer exists in Redmine (e.g., it was deleted), **When** the entry form opens, **Then** no default is pre-selected and the user must choose manually.

---

### User Story 3 - Copy and Paste Time Entries (Priority: P3)

As a user, I want to copy an existing time entry and paste it to another day, so I can quickly replicate recurring bookings without re-entering all the details.

**Why this priority**: Many users work on the same tickets across multiple days. Copy-paste eliminates repetitive data entry for predictable, recurring work patterns.

**Independent Test**: Right-click (or use a copy action on) a time entry, navigate to a different day on the calendar, paste, and verify a new entry appears with the same ticket, activity, hours, and comment as the original, on the target day.

**Acceptance Scenarios**:

1. **Given** a time entry is visible on the calendar, **When** the user invokes the copy action on it, **Then** the entry is marked as copied (visual indicator).
2. **Given** an entry has been copied, **When** the user clicks on a different day in the calendar, **Then** a paste action becomes available for that day.
3. **Given** the user invokes the paste action on a target day, **When** confirmed, **Then** a new time entry is created in Redmine on the target date with the same ticket, activity, hours, and comment as the original.
4. **Given** a paste is performed, **When** the new entry is saved, **Then** the calendar refreshes and the pasted entry appears on the target day.
5. **Given** an entry is pasted, **When** it carries a `[start:HH:MM]` start-time tag, **Then** the pasted entry retains the same start time on the new day.
6. **Given** the user copies an entry and navigates to a different week, **When** they paste, **Then** the entry is created on the correct day in the target week.

---

### User Story 4 - Working Hours Act (ArbZG) Compliance Warnings (Priority: P4)

As a user subject to German working hours regulations, I want the application to alert me when my logged time entries appear to violate the Arbeitszeitgesetz (ArbZG), so I can notice and correct potential legal violations before they become a problem.

**Why this priority**: Legal compliance is important but is a passive/advisory feature — it does not block any workflow and runs as a background check. The core logging features (P1–P3) deliver direct daily value and are prerequisites for meaningful compliance data.

**Independent Test**: Log more than 10 hours of time entries on a single day and verify a visible warning appears indicating the daily limit of the Arbeitszeitgesetz may be exceeded.

**Acceptance Scenarios**:

1. **Given** the calendar week is loaded, **When** the total logged hours on any single day exceeds 10 hours, **Then** a warning indicator is shown on that day column.
2. **Given** the calendar week is loaded, **When** the total logged hours for the week exceed 48 hours, **Then** a warning is shown at the week level.
3. **Given** start times are recorded (via the `[start:HH:MM]` tag), **When** the gap between the last entry of one day and the first entry of the next day is less than 11 hours, **Then** a rest-period warning is shown.
4. **Given** a compliance warning is shown, **When** the user clicks or hovers on the warning, **Then** a tooltip or message explains which rule is violated and the observed vs. allowed value.
5. **Given** the user corrects or deletes entries so the violation no longer exists, **When** the calendar refreshes, **Then** the warning is removed.
6. **Given** start times are not available for entries (no `[start:HH:MM]` tag), **When** checking rest-period compliance, **Then** the rest-period check is skipped and no false warning is shown.

---

### Edge Cases

- **Quick-add with no default activity**: If no default is set and no Redmine activity is marked as default by the server, the quick-add must prompt the user or fall back gracefully rather than silently saving with a wrong activity.
- **Copy entry to same day**: Should be allowed — results in a duplicate entry on the same day (useful for splitting a block of work).
- **Paste with no copied entry**: The paste action must not be available if nothing has been copied.
- **ArbZG — Sunday entries**: The app records time but does not prevent Sunday bookings; ArbZG warnings should note Sunday work (§9 ArbZG) as a potential violation without blocking the entry.
- **ArbZG — public holidays**: Public holidays vary by German federal state; for this version, only Sunday and the universal federal holidays (Neujahr, Tag der Deutschen Einheit, etc.) are checked. State-specific holidays are out of scope.
- **ArbZG — breaks**: Mandatory break deductions (§4 ArbZG: 30 min after 6h, 45 min after 9h) are advisory only and cannot be reliably derived from time entry data alone — these are flagged informally, not enforced.
- **Default activity deleted in Redmine**: Handled gracefully (no pre-selection, user prompted).
- **Quick-add with ticket number that is not a number** (e.g., user types a partial title): Show an error; ticket lookup by title is not in scope for quick-add (only by ID).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The calendar MUST support a quick-add interaction where the user selects a time range, enters a ticket number, and presses Enter to save the entry without opening the full form.
- **FR-002**: The quick-add flow MUST pre-fill the time range from the calendar selection and use the configured default activity.
- **FR-003**: The quick-add flow MUST validate the ticket ID and show an inline error if the ticket does not exist or is inaccessible.
- **FR-004**: The quick-add flow MUST provide a visible option to open the full entry form for entries requiring additional detail.
- **FR-005**: The settings page MUST allow the user to select and save a default time entry activity from the list of activities available in Redmine.
- **FR-006**: The selected default activity MUST be pre-filled in the activity field whenever a new time entry form is opened.
- **FR-007**: The default activity setting MUST be persisted locally and survive page reloads.
- **FR-008**: Editing an existing entry MUST NOT override the entry's actual activity with the configured default.
- **FR-009**: The user MUST be able to copy any visible time entry on the calendar.
- **FR-010**: After copying an entry, the user MUST be able to paste it onto any day visible in the current or any navigated-to week.
- **FR-011**: A pasted entry MUST be created as a new Redmine time entry on the target date, with the same ticket, activity, hours, and comment as the original.
- **FR-012**: The calendar MUST display a visual warning on any day where the total logged hours exceed 10 hours (ArbZG §3 daily limit).
- **FR-013**: The calendar MUST display a visual warning for the current week when the total logged hours exceed 48 hours (ArbZG §3 weekly limit).
- **FR-014**: When start times are available, the calendar MUST check whether the rest period between consecutive working days is less than 11 hours and show a warning if so (ArbZG §5).
- **FR-015**: Each compliance warning MUST include an explanation of which rule is violated and the measured vs. permitted values.
- **FR-016**: Compliance warnings MUST be informational only — they MUST NOT block saving or editing time entries.

### Key Entities

- **Default Activity**: A user preference (activity ID + name) persisted locally; applied automatically to new entries.
- **Copied Entry**: A transient clipboard state holding a reference to a time entry; exists only within the current browser session.
- **Compliance Warning**: A computed advisory message derived from the user's time entries for a given day or week, based on ArbZG thresholds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a simple time entry via quick-add in 3 interactions or fewer (select range → type ticket → Enter).
- **SC-002**: The default activity is applied automatically in 100% of new-entry form openings when configured.
- **SC-003**: A user can duplicate an entry to another day in 2 interactions or fewer (copy → paste on target day).
- **SC-004**: ArbZG warnings appear on the calendar within 1 second of the week loading, with no additional user action.
- **SC-005**: No ArbZG warning appears when all logged entries are within legal limits (zero false positives in standard scenarios).
- **SC-006**: All compliance warnings include the violated rule name and the measured vs. allowed value.

## Assumptions

- The existing calendar (feature 001) is the foundation; this feature extends the calendar and settings views.
- Quick-add requires a valid numeric Redmine ticket ID; title-based lookup is not in scope for the quick-add shortcut (only the full form supports text search).
- The default activity list is fetched from Redmine's `/enumerations/time_entry_activities.json` endpoint (already used in feature 001) — no new API is needed.
- ArbZG checks are based solely on data already visible in the current week's calendar view; no additional Redmine API calls are made to fetch entries outside the visible range.
- Rest-period (11-hour) checks are only performed when start times are available via the `[start:HH:MM]` comment tag (feature 001 / feature 003).
- Copy-paste clipboard state is in-memory only (current browser tab session); no cross-tab or cross-device clipboard is required.
- ArbZG applicability: this tool is used by employees subject to German law; the app provides advisory warnings and is not a legally binding compliance system.
- Public holiday checks cover only German-wide (federal) holidays; state-specific holidays are out of scope.
- Mobile layout is out of scope, consistent with the overall project constitution.
