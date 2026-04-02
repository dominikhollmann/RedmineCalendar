# Quickstart & Acceptance Checklist: Configurable Working Hours and Calendar View Toggle

## Prerequisites

- App is running (`npx serve .`) and CORS proxy is running (`npm run proxy`).
- You are logged in (settings page has valid URL + credentials).
- At least one time entry exists in the current week in Redmine.

---

## User Story 1: Configure Working Hours in Settings

**Setup**: Open `settings.html`.

- [X] **FR-001 / SC-001** — A "Working hours" section is visible on the settings page with a start time field and an end time field (HH:MM format).
- [X] **FR-001** — Both fields accept valid 24-hour time input (e.g., type `08:00` and `18:00`).
- [X] **FR-003** — Enter an end time earlier than the start time (e.g., start `18:00`, end `08:00`) and click Save. Verify an error message is shown and the values are not persisted.
- [X] **FR-003** — Enter equal start and end times (e.g., both `09:00`) and click Save. Verify an error is shown.
- [X] **FR-001 / FR-002** — Enter valid working hours (e.g., `08:00`–`18:00`) and save. Reload the settings page and verify the saved values are restored.
- [X] **FR-004 / SC-002** — After saving working hours and navigating to `index.html`, verify the calendar's visible time grid starts at `08:00` and ends at `18:00` (slots outside this range are not visible).

---

## User Story 2: Toggle Between Working Hours and 24h View

**Setup**: Working hours are configured as `08:00`–`18:00` (from Story 1 above).

- [X] **FR-005** — A toggle button is visible in the calendar header. Its label (or state) indicates the current view mode.
- [X] **FR-009** — Open the calendar. Verify it loads in **working hours view** (08:00–18:00) by default (since working hours are configured).
- [X] **FR-005 / FR-006 / SC-003** — Click the toggle once. Verify the calendar immediately expands to show the full 00:00–24:00 range.
- [X] **FR-007** — Confirm the switch happened without a page reload.
- [X] **FR-005** — Click the toggle again. Verify the calendar returns to 08:00–18:00.
- [X] **FR-008 / SC-004** — While in 24h view, reload the page. Verify the calendar restores to 24h view (toggle state was persisted).
- [x] **FR-010 / SC-005** — Add a time entry at 06:00 (before working hours). In working hours view (08:00–18:00), verify the 06:00 entry is **not visible** in the grid. Toggle to 24h view and verify the entry **is visible**. Verify the entry still exists in Redmine (no data was deleted).

---

## Edge Case Checks

- [x] **Edge case — no working hours configured** — Clear `localStorage` key `redmine_calendar_working_hours` (via browser DevTools → Application → Local Storage). Reload the calendar. Verify it shows the full 24h view and the toggle button is **disabled or visually inactive** (cannot switch to working hours view without a configured range).
- [x] **Edge case — midnight-to-midnight** — *(nicht testbar — `input[type="time"]` erlaubt max. 23:59; 24:00 wird bewusst nicht unterstützt)*
- [x] **Edge case — navigate weeks** — Switch to 24h view, navigate to the next week and then back. Verify the 24h view mode is retained throughout navigation.

---

## Completion Criteria

All checkboxes above must be ticked before this feature is considered complete.
