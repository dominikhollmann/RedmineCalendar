# Feature Specification: ArbZG Compliance Warnings

**Feature Branch**: `008-arbzg-compliance`
**Created**: 2026-04-12
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Working Hours Act (ArbZG) Compliance Warnings (Priority: P1)

As a user subject to German working hours regulations, I want the application to alert me when my logged time entries appear to violate the Arbeitszeitgesetz (ArbZG), so I can notice and correct potential legal violations before they become a problem.

**Independent Test**: Log more than 10 hours of time entries on a single day and verify a visible warning appears indicating the daily limit of the Arbeitszeitgesetz may be exceeded.

**Acceptance Scenarios**:

1. **Given** the calendar week is loaded, **When** the total logged hours on any single day exceeds 10 hours, **Then** a warning indicator is shown on that day column.
2. **Given** the calendar week is loaded, **When** the total logged hours for the week exceed 48 hours, **Then** a warning is shown at the week level.
3. **Given** start times are recorded, **When** the gap between the last entry of one day and the first entry of the next day is less than 11 hours, **Then** a rest-period warning is shown.
4. **Given** a compliance warning is shown, **When** the user clicks or hovers on the warning, **Then** a tooltip or message explains which rule is violated and the observed vs. allowed value.
5. **Given** the user corrects or deletes entries so the violation no longer exists, **When** the calendar refreshes, **Then** the warning is removed.
6. **Given** start times are not available for entries, **When** checking rest-period compliance, **Then** the rest-period check is skipped and no false warning is shown.

---

### Edge Cases

- **ArbZG — Sunday entries**: The app records time but does not prevent Sunday bookings; ArbZG warnings should note Sunday work (§9 ArbZG) as a potential violation without blocking the entry.
- **ArbZG — public holidays**: Public holidays vary by German federal state; for this version, only Sunday and the universal federal holidays (Neujahr, Tag der Deutschen Einheit, etc.) are checked. State-specific holidays are out of scope.
- **ArbZG — breaks**: Mandatory break deductions (§4 ArbZG: 30 min after 6h, 45 min after 9h) are advisory only and cannot be reliably derived from time entry data alone — these are flagged informally, not enforced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The calendar MUST display a visual warning on any day where the total logged hours exceed 10 hours (ArbZG §3 daily limit).
- **FR-002**: The calendar MUST display a visual warning for the current week when the total logged hours exceed 48 hours (ArbZG §3 weekly limit).
- **FR-003**: When start times are available, the calendar MUST check whether the rest period between consecutive working days is less than 11 hours and show a warning if so (ArbZG §5).
- **FR-004**: Each compliance warning MUST include an explanation of which rule is violated and the measured vs. permitted values.
- **FR-005**: Compliance warnings MUST be informational only — they MUST NOT block saving or editing time entries.
- **FR-006**: ArbZG checks MUST be based solely on data already visible in the current week's calendar view; no additional API calls for out-of-range entries.

### Key Entities

- **Compliance Warning**: A computed advisory message derived from the user's time entries for a given day or week, based on ArbZG thresholds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ArbZG warnings appear on the calendar within 1 second of the week loading, with no additional user action.
- **SC-002**: No ArbZG warning appears when all logged entries are within legal limits (zero false positives in standard scenarios).
- **SC-003**: All compliance warnings include the violated rule name and the measured vs. allowed value.

## Assumptions

- ArbZG checks are based solely on data already visible in the current week's calendar view; no additional Redmine API calls are made to fetch entries outside the visible range.
- Rest-period (11-hour) checks are only performed when start times are available via Easy Redmine native time fields or the legacy `[start:HH:MM]` comment tag.
- ArbZG applicability: this tool is used by employees subject to German law; the app provides advisory warnings and is not a legally binding compliance system.
- Public holiday checks cover only German-wide (federal) holidays; state-specific holidays are out of scope.
- Mobile layout is out of scope, consistent with the overall project constitution.
