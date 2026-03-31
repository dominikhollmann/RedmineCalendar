# Feature Specification: Entry Form UX Enhancements and Localization

**Feature Branch**: `003-entry-form-ux`
**Created**: 2026-03-31
**Status**: Draft
**Input**: User description: "Support localization for german and english dependent on the browser settings. In the view to add a time entry: Show a list of frequently used tickets in the last 15 days. Add a feature to save favourites of tickets (stored in cookie). In Log-View: Let the user input start and end time. Duration is calculated but not editable."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start/End Time Input with Auto-Calculated Duration (Priority: P1)

As a user logging a time entry, I want to enter a start time and an end time, and have the duration automatically calculated for me, so I do not have to compute hours manually and cannot accidentally enter an inconsistent value.

**Why this priority**: This directly improves the core time-logging workflow. Currently the user must calculate duration themselves; entering start/end times is a more natural and error-resistant workflow. It is the highest-impact UX improvement in this batch.

**Independent Test**: Open the time entry form, enter a start time of 09:00 and an end time of 11:30, and verify the duration field shows 2.5 hours and cannot be manually edited.

**Acceptance Scenarios**:

1. **Given** the time entry form is open, **When** the user enters a start time and an end time, **Then** the duration field is automatically populated with the difference (in hours, rounded to 0.25h).
2. **Given** a start and end time are set, **When** the user changes either value, **Then** the duration updates immediately.
3. **Given** a start and end time are set, **When** the user attempts to edit the duration field directly, **Then** the field is read-only and rejects direct input.
4. **Given** an end time earlier than the start time is entered, **When** the user submits or moves focus, **Then** an inline error is shown and submission is prevented.
5. **Given** the entry form is pre-filled from a calendar drag, **When** the form opens, **Then** start time and end time are pre-populated from the dragged range and duration is shown.

---

### User Story 2 - Frequently Used Tickets in the Entry Form (Priority: P2)

As a user logging a time entry, I want to see a list of the tickets I have used most frequently in the past 15 days, so I can quickly select a common ticket without searching for it every time.

**Why this priority**: Repeated booking to the same tickets is the dominant use case for daily time tracking. A "recents/frequent" list eliminates the most common repetitive search step.

**Independent Test**: Log time to the same ticket three times over two days, then open a new entry form and verify that ticket appears prominently in the suggestion list before any search is typed.

**Acceptance Scenarios**:

1. **Given** the time entry form opens, **When** the issue field is focused or the form loads, **Then** a list of up to 5 frequently used tickets from the last 15 days is shown.
2. **Given** the frequent-tickets list is visible, **When** the user clicks a ticket from it, **Then** the issue field is populated with that ticket and the list closes.
3. **Given** the user starts typing in the issue search field, **When** input is detected, **Then** the frequent-tickets list is replaced by the live search results.
4. **Given** no time entries exist in the last 15 days, **When** the form opens, **Then** the frequent-tickets section is hidden or shows an empty state message.
5. **Given** a ticket appears in the frequent list, **When** the user has also marked it as a favourite, **Then** it is still shown (no deduplication confusion).

---

### User Story 3 - Favourite Tickets (Priority: P3)

As a user, I want to mark tickets as favourites so I can access them instantly in the entry form, independent of how recently I used them.

**Why this priority**: Frequent-use lists are session- and date-dependent; favourites give the user a persistent, curated shortlist for tickets they use regularly but perhaps not every two weeks (e.g., recurring project or overhead).

**Independent Test**: Mark a ticket as a favourite, clear browsing history or wait 16 days, open the entry form, and verify the ticket still appears in the favourites section.

**Acceptance Scenarios**:

1. **Given** a ticket is shown in the entry form (search result or frequent list), **When** the user activates the "Add to favourites" action, **Then** the ticket is added to the favourites list and the action changes to "Remove from favourites".
2. **Given** the time entry form opens, **When** the form loads, **Then** a "Favourites" section shows all saved favourite tickets.
3. **Given** a ticket is in the favourites list, **When** the user clicks it, **Then** the issue field is populated with that ticket.
4. **Given** a ticket is in the favourites list, **When** the user removes it from favourites, **Then** it no longer appears in the favourites section on subsequent form opens.
5. **Given** favourites are stored locally, **When** the user reloads the page, **Then** all favourites are still present.
6. **Given** a favourite ticket is deleted or closed in Redmine, **When** the favourites list is shown, **Then** the stale entry is visible but labelled as unavailable (graceful degradation).

---

### User Story 4 - German/English Localization Based on Browser Language (Priority: P4)

As a user, I want the application's interface to automatically appear in German or English based on my browser's language setting, so I do not have to configure the language manually.

**Why this priority**: Localization improves accessibility for German-speaking users (the primary target audience) but does not block any core workflow — it is a quality-of-life improvement that can be delivered independently.

**Independent Test**: Set the browser language to German (`de`), reload the application, and verify all UI labels, button text, and error messages appear in German. Switch browser language to English (`en`) and verify the interface switches accordingly.

**Acceptance Scenarios**:

1. **Given** the browser language is set to German (`de` or `de-*`), **When** the application loads, **Then** all UI text (labels, buttons, placeholders, error messages, date formats) is displayed in German.
2. **Given** the browser language is set to English or any unsupported language, **When** the application loads, **Then** all UI text is displayed in English (fallback).
3. **Given** the application is displayed in German, **When** date and time values are shown, **Then** they follow German conventions (e.g., 24-hour clock, DD.MM.YYYY date format).
4. **Given** the application is displayed in English, **When** date and time values are shown, **Then** they follow English/ISO conventions.
5. **Given** a new UI string is added in a future update, **When** the locale is German, **Then** the string must have a German translation (no untranslated English strings leak through in German mode).

---

### Edge Cases

- If the end time equals the start time, the duration is 0 — show an error rather than accepting a zero-hour entry.
- If the browser reports a language other than `de` or `en` (e.g., `fr`), fall back to English.
- If a user has more than 5 distinct frequently used tickets in the last 15 days, show only the top 5 by usage count.
- If the favourites list grows very large (e.g., 50+ items), the section should remain usable (scrollable or capped with a note).
- Favourite ticket IDs stored locally may reference tickets the user no longer has access to — handle gracefully without blocking form use.
- Duration rounding: a 1h 7min range should round to 1.25h (nearest 0.25), not 1.0h or 1.5h.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The time entry form MUST include a start time field and an end time field (both HH:MM, 24-hour format).
- **FR-002**: The duration field MUST be automatically calculated from start and end time and MUST be read-only (not directly editable by the user).
- **FR-003**: Duration MUST be rounded to the nearest 0.25 hours (15-minute precision).
- **FR-004**: The form MUST display an inline error and prevent submission when end time is not later than start time.
- **FR-005**: The time entry form MUST show a "Frequently Used" section listing up to 5 tickets the user has booked time to in the last 15 days, ordered by usage frequency descending.
- **FR-006**: The frequently-used list MUST be hidden when no qualifying entries exist in the last 15 days.
- **FR-007**: Users MUST be able to mark any ticket as a favourite from within the time entry form.
- **FR-008**: Favourites MUST be persisted locally in the browser and survive page reloads.
- **FR-009**: The time entry form MUST display a "Favourites" section listing all saved favourite tickets.
- **FR-010**: Users MUST be able to remove a ticket from favourites from within the form.
- **FR-011**: The application MUST detect the browser's preferred language on load and apply the matching locale (German for `de`/`de-*`, English otherwise).
- **FR-012**: All user-facing strings, labels, error messages, placeholders, and date/time formats MUST be localized for both German and English.
- **FR-013**: Language selection MUST be automatic (no manual language toggle required).

### Key Entities

- **Favourite**: A user-saved reference to a Redmine ticket (by ID and last-known subject), persisted locally in the browser.
- **Frequent Ticket**: A computed list derived from the user's time entries in the last 15 days, not separately stored — recalculated each time the form opens.
- **Locale**: The active language/region setting (German or English) derived from the browser at application load time.
- **Time Range**: A pair of (start time, end time) from which duration is derived; start and end are stored on the time entry alongside the calculated duration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can log a time entry using start/end time input without manually computing duration in 100% of cases.
- **SC-002**: The frequently-used ticket list appears in the entry form within 1 second of the form opening, with no additional user action.
- **SC-003**: A user can select a favourite or frequent ticket and have the issue field populated with a single click.
- **SC-004**: Favourite tickets are available in the form after a full page reload in 100% of cases.
- **SC-005**: The application displays fully in the correct language (German or English) based on browser settings, with 0 untranslated strings visible to the user.
- **SC-006**: Duration is always consistent with the entered start/end time — no manual overrides possible.

## Assumptions

- The existing time entry form (feature 001) is the base; this feature modifies and extends it.
- The "last 15 days" window for frequently-used tickets is based on the `spent_on` date of existing Redmine time entries already fetched by the app — no additional API calls are required solely for this calculation.
- Favourite ticket data is stored in the browser (consistent with the cookie approach established in feature 001 for config) and is device-specific; no cross-device sync is required.
- Only two locales are in scope: German (`de`) and English (`en`). No other languages are planned for this feature.
- Date format in German mode: DD.MM.YYYY. Date format in English mode: YYYY-MM-DD (ISO) or MM/DD/YYYY — ISO preferred for consistency with Redmine.
- The start time pre-fill from calendar drag (feature 001 `[start:HH:MM]` tag) integrates naturally: start time populates from the drag anchor and end time from drag end.
- Mobile layout is out of scope, consistent with the overall project constitution.
