# Feature Specification: Sensible First-Launch Defaults

**Feature Branch**: `051-default-settings`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "review default settings: only working times true, mo-fr true, dark mode false, quick mode true, working time 8-18, weekly hours 40, planning sources all active, default view on first load planning view not calendar view"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — First-time user sees a useful app immediately (Priority: P1)

A new user opens RedmineCalendar for the first time after entering their credentials. Without changing any settings, the app opens to the Planning View showing today's date, the Teams and Outlook planning columns are both active, and the working-hours window and contracted hours are pre-populated at sensible values. The user can immediately start booking time without visiting Settings.

**Why this priority**: This is the core value of the feature — eliminating the "cold start" friction where users must configure 6–8 preferences before the app is useful.

**Independent Test**: Can be fully tested by a fresh browser profile (no localStorage keys set), completing credential entry, and verifying the landing view and all initial preference states.

**Acceptance Scenarios**:

1. **Given** no preference keys exist in storage, **When** the user completes credential entry and lands on the main screen, **Then** the Planning View is displayed (not the calendar).
2. **Given** no preference keys exist in storage, **When** the user switches to the calendar view, **Then** the calendar shows Monday–Friday columns and the 08:00–18:00 time band (working-hours mode), without the user touching Settings.
3. **Given** no preference keys exist in storage, **When** the user opens Settings, **Then** the "Only working hours" toggle is ON, the "Monday–Friday" toggle is ON, the "Dark mode" toggle is OFF, the "Fast mode" toggle is ON, the working-hours fields show 08:00–18:00, the weekly-hours field shows 40, and both planning-source checkboxes (Outlook and Teams) are checked.

---

### User Story 2 — Existing user's saved settings are never overwritten (Priority: P2)

A returning user who has previously saved their own preferences (e.g. 24-hour view, full-week, dark mode, 35 weekly hours) reopens the app. Their saved values are displayed exactly as before; the new defaults are completely invisible to them.

**Why this priority**: Backwards-compatibility is a hard requirement — the feature must not silently change the behaviour of any existing user.

**Independent Test**: Can be fully tested by seeding specific localStorage values, reloading the app, and verifying none of them were overwritten.

**Acceptance Scenarios**:

1. **Given** the user has `redmine_calendar_view_mode = '24h'` stored, **When** the calendar loads, **Then** the full 24-hour time band is shown (not 08:00–18:00).
2. **Given** the user has `redmine_calendar_day_range = 'full-week'` stored, **When** the calendar loads, **Then** all seven days are shown.
3. **Given** the user has `redmine_calendar_planning_source_teams = '0'` stored, **When** the Planning View loads, **Then** the Teams column is hidden.
4. **Given** the user has `redmine_calendar_active_view = 'calendar'` stored, **When** the main screen loads, **Then** the calendar view is shown (not the Planning View).

---

### User Story 3 — First-time user can override every default through Settings (Priority: P3)

A first-time user who prefers different values can open Settings and change any preference. After saving, the new value is persisted and takes effect immediately, just as it would for an existing user.

**Why this priority**: Defaults are a starting point, not a lock-in. Full override capability is required for the feature to be acceptable in diverse team environments.

**Independent Test**: Can be fully tested by starting with no stored keys, changing each toggle/input in Settings, and verifying the new value persists across a page reload.

**Acceptance Scenarios**:

1. **Given** the app opened with default settings, **When** the user disables the "Monday–Friday" toggle and saves, **Then** the calendar shows all seven days and `redmine_calendar_day_range = 'full-week'` is stored.
2. **Given** the app opened with default Planning View, **When** the user switches to Calendar View and reloads, **Then** the calendar view is shown (the explicit user action is remembered).

---

### Edge Cases

- What happens when localStorage is unavailable (private-browsing mode)? The effective defaults must still be applied at render time; the app must not crash or show an inconsistent state.
- What happens if only some keys are present? Each preference reads its own key independently — keys that are absent receive their default; keys that are present use their stored value.
- What happens when Teams and Outlook columns show defaults but no account is connected? The columns display their existing "not configured" prompt; the feature does not change that flow.
- What happens when the user has completed first-time setup in the past but clears localStorage manually? The app treats the cleared state identically to a true first launch — all defaults apply.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When `redmine_calendar_active_view` is absent from storage, the app MUST open to the Planning View on the main screen instead of the calendar view.
- **FR-002**: When `redmine_calendar_view_mode` is absent from storage, the calendar MUST display only the working-hours time band (equivalent to the "Only working hours" toggle being ON).
- **FR-003**: When `redmine_calendar_day_range` is absent from storage, the calendar MUST display only Monday–Friday columns (equivalent to the "Monday–Friday" toggle being ON).
- **FR-004**: When `redmine_calendar_theme` is absent from storage, the app MUST use light mode. *(No behaviour change — documents and validates the existing default.)*
- **FR-005**: When `redmine_calendar_fast_mode` is absent from storage, fast mode (auto-close on ticket selection) MUST be active. *(No behaviour change — documents and validates the existing default.)*
- **FR-006**: When `redmine_calendar_working_hours` is absent from storage, the effective working-hours window MUST be 08:00–18:00 across **all consumers**: calendar display, Settings form pre-population, ArbZG daily-hours compliance calculations, and the AI chatbot planning context. No consumer may use a different fallback (e.g. `'09:00'` or `null`).
- **FR-007**: When `redmine_calendar_weekly_hours` is absent from storage, the effective weekly contracted hours MUST be 40, and the Settings form MUST pre-populate that value on first open.
- **FR-008**: When `redmine_calendar_planning_source_teams` is absent from storage, the Teams planning source MUST be active (column visible in Planning View and checkbox checked in Settings). *(Behaviour change: currently Teams is OFF when the key is absent.)*
- **FR-009**: When `redmine_calendar_planning_source_outlook` is absent from storage, the Outlook planning source MUST remain active. *(No behaviour change — documents and validates the existing default.)*
- **FR-010**: The Settings page MUST reflect the effective default state for every preference listed above when the corresponding storage key is absent, so the UI accurately represents what the user will experience without requiring them to save first.

### Key Entities

- **User Preference**: A single named setting stored per-browser in local storage. Has a key, a stored value (may be absent), and an effective value (stored value when present; default value otherwise).
- **Effective Default**: The value applied at runtime when no stored preference exists. The set of effective defaults defined by this feature constitutes the "factory settings" of the application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user (no prior storage) who completes credential entry arrives at the Planning View without visiting Settings — verifiable by automated UI test with a clean browser profile.
- **SC-002**: All eight preferences listed in FR-001 through FR-009 reflect the correct default state on the Settings page when no storage keys are present — verifiable by automated UI test checking each toggle/input value.
- **SC-003**: Zero existing Playwright UI tests regress after the change — the full suite passes green.
- **SC-004**: Users who already have explicit preferences stored see no change in any preference value after the update is deployed — verifiable by unit tests that seed specific stored values and confirm the read functions return those values unchanged.
- **SC-005**: The Settings page pre-populates the working-hours fields with 08:00 and 18:00, and the weekly-hours field with 40, when no storage keys are present — verifiable by automated UI test.

## Clarifications

### Session 2026-06-25

- Q: Should the factory defaults be hard-coded in application source code, or should admins be able to override them via `config.json`? → A: Hard-coded in source code — admin cannot change values without a code change. No new `config.json` fields are introduced.
- Q: Should FR-006's 08:00–18:00 working-hours default apply only to calendar display and Settings pre-population, or to all consumers (ArbZG compliance, AI chatbot planning context)? → A: All consumers — a single consistent fallback across the whole codebase; ArbZG and the chatbot also use 08:00–18:00 when no key is stored.

## Assumptions

- "Quick mode" in the user description refers to the existing "Fast mode" (`redmine_calendar_fast_mode`) feature, which already defaults to enabled. This feature documents and validates that default but makes no code change for it.
- "Dark mode = false" confirms the existing default (light mode when the theme key is absent). No code change is required.
- The "working time 8-18" default applies to all consumers of working hours (calendar display, Settings form, ArbZG compliance, AI chatbot planning context — per FR-006). It does not auto-write the key to storage on first load; instead, the value is applied at read-time as an effective default and written only when the user explicitly saves Settings.
- "Planning sources: all active" means both Outlook and Teams. Outlook is already on by default; only Teams requires a code change (FR-008).
- The default active view (FR-001) is applied only when the `redmine_calendar_active_view` key is entirely absent. If the user navigates away from the Planning View during a session, the `calendar` value is written; on the next load that stored value takes precedence (US2 AC4 above), which is the correct behaviour.
- Mobile support is out of scope for this feature. The Planning View is already desktop-only per the constitution; the calendar defaults (view mode, day range) apply only on desktop-appropriate screen sizes.
- The feature does not introduce any new localStorage keys; it only changes the effective fallback values when existing keys are absent.
- All factory default values are hard-coded in application source code. No new `config.json` fields are introduced. Admins who need different company-wide defaults must deploy a custom build.
