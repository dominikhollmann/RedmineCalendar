# Feature Specification: ArbZG Compliance Warnings

**Feature Branch**: `010-arbzg-compliance`
**Created**: 2026-04-12
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Working Hours Act (ArbZG) Compliance Warnings (Priority: P1)

As a user subject to German working hours regulations, I want the application to alert me when my logged time entries appear to violate the Arbeitszeitgesetz (ArbZG), so I can notice and correct potential legal violations before they become a problem.

**Independent Test**: Log more than 10 hours of time entries on a single day and verify a visible warning appears indicating the daily limit of the Arbeitszeitgesetz may be exceeded.

**Acceptance Scenarios**:

1. **Given** the calendar week is loaded, **When** the total logged hours on any single day exceeds 10 hours, **Then** a warning icon/badge is shown on that day's column header next to the existing day total.
2. **Given** the calendar week is loaded, **When** the total logged hours for the week exceed 48 hours, **Then** a warning icon/badge is shown on the week total in the app header.
3. **Given** start times are recorded, **When** the gap between the last entry of one day and the first entry of the next day is less than 11 hours, **Then** a rest-period warning icon/badge is shown on the later day's column header.
4. **Given** a compliance warning is shown, **When** the user hovers over the warning, **Then** a tooltip explains which rule is violated and the observed vs. allowed value.
5. **Given** the user corrects or deletes entries so the violation no longer exists, **When** the calendar refreshes, **Then** the warning is removed.
6. **Given** start times are not available for entries, **When** checking rest-period compliance, **Then** the rest-period check is skipped and no false warning is shown.

---

### Edge Cases

- **ArbZG — Sunday entries**: A warning badge is shown on the day column header for any day with time entries logged on a Sunday (§9 ArbZG). The entry is not blocked.
- **ArbZG — public holidays**: A warning badge is shown on the day column header for time entries logged on German federal holidays (Neujahr, Karfreitag, Ostermontag, Tag der Arbeit, Christi Himmelfahrt, Pfingstmontag, Tag der Deutschen Einheit, 1. Weihnachtstag, 2. Weihnachtstag). State-specific holidays are out of scope.
- **ArbZG — breaks**: A warning badge is shown on the day column header when mandatory break time (§4 ArbZG: 30 min after 6h, 45 min after 9h) appears insufficient. Breaks are defined as unbooked time between the first and last time entry of a day: `break = (last_entry_end − first_entry_start) − sum(hours)`. This check is only performed when start times are available. The warning is advisory; no entry is blocked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The calendar MUST display a warning icon/badge on the day column header next to the day total for any day where the total logged hours exceed 10 hours (ArbZG §3 daily limit).
- **FR-002**: The calendar MUST display a warning icon/badge on the week total in the app header when the total logged hours for the week exceed 48 hours (ArbZG §3 weekly limit).
- **FR-003**: When start times are available, the calendar MUST check whether the rest period between consecutive working days is less than 11 hours and show a warning icon/badge on the later day's column header if so (ArbZG §5).
- **FR-004**: Each compliance warning MUST include an explanation of which rule is violated and the measured vs. permitted values, shown on hover.
- **FR-005**: Compliance warnings MUST be informational only — they MUST NOT block saving or editing time entries.
- **FR-006**: ArbZG checks MUST be based solely on data already visible in the current week's calendar view; no additional API calls for out-of-range entries.
- **FR-007**: The calendar MUST display a warning badge on the day column header for any day where time entries are logged on a Sunday (§9 ArbZG) or on a German federal holiday.
- **FR-008**: All user-visible warning text (rule names, tooltip explanations, values) MUST be provided in both German and English via the existing i18n system.
- **FR-009**: When start times are available, the calendar MUST perform two §4 ArbZG break checks and show a warning icon/badge on that day's column header if either is violated:
  - **Break duration**: unbooked time between the first and last entry of a day is less than the legally required break (≥30 min if total hours >6, ≥45 min if total hours >9).
  - **Continuous work limit**: any uninterrupted working stretch (consecutive entries with no gap between them) exceeds 6 hours (§4 ArbZG forbids working more than 6 h without a break).

### Key Entities

- **Compliance Warning**: A computed advisory message derived from the user's time entries for a given day or week, based on ArbZG thresholds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ArbZG warnings appear on the calendar within 1 second of the week loading, with no additional user action.
- **SC-002**: No ArbZG warning appears when all logged entries are within legal limits (zero false positives in standard scenarios).
- **SC-003**: All compliance warnings include the violated rule name and the measured vs. allowed value.

## Assumptions

- ArbZG checks are based solely on data already visible in the current week's calendar view; no additional Redmine API calls are made to fetch entries outside the visible range.
- Rest-period (11-hour) checks and break checks are only performed when start times are available via Easy Redmine native time fields or the legacy `[start:HH:MM]` comment tag.
- Break duration is derived as: `(last_entry_end − first_entry_start) − sum(entry hours)` for a given day. This is an approximation; entries that overlap or are non-contiguous may understate actual break time.
- Continuous work span is derived by sorting entries by start time and merging adjacent/overlapping entries into spans; the longest span is compared to the 6 h limit. Only performed when start times are available.
- ArbZG applicability: this tool is used by employees subject to German law; the app provides advisory warnings and is not a legally binding compliance system.
- Public holiday checks cover only German-wide (federal) holidays; state-specific holidays are out of scope.
- Mobile layout is out of scope, consistent with the overall project constitution.

## Clarifications

### Session 2026-04-12

- Q: Where do compliance warnings appear in the UI? → A: Icon/badge on the day column header next to the existing day total (daily); icon/badge on the week total in the app header (weekly).
- Q: Are Sunday and federal holiday warnings in scope? → A: Yes — show a warning badge on the day header for Sunday work and work on German federal holidays (9 fixed dates, state-specific holidays out of scope).
- Q: Should warning messages be localized? → A: Yes — all warning text uses the existing i18n system, available in German and English.
