# Feature Specification: Dark Mode (Settings-Only Toggle)

**Feature Branch**: `030-dark-mode-settings`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Dark mode — add a light/dark theme toggle on the Settings page only (no toolbar shortcut). Persist choice in localStorage. Should respect the choice across both index.html and settings.html. No 'auto' / system-preference mode for v1 — explicit user choice only."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Switch the App to Dark Mode from Settings (Priority: P1)

A user who works long hours in low-light conditions or simply prefers a dark UI wants to put the entire app into a dark theme. They expect the toggle to live on the Settings page (not cluttering the calendar toolbar), to take effect immediately on switching, and to persist across sessions so they only set it once.

**Why this priority**: This is the single user journey that defines the feature. Everything else (persistence, cross-page application, no-flash-on-load) follows from this story.

**Independent Test**: On the Settings page, the user finds a theme control with two options (light, dark). Selecting "dark" immediately re-styles the Settings page. Navigating to the calendar shows the calendar in dark theme. Reloading either page preserves the choice. Selecting "light" again reverses everything.

**Acceptance Scenarios**:

1. **Given** I am on the Settings page in light mode (default), **When** I select the dark theme option, **Then** the Settings page immediately switches to dark colors without a reload.
2. **Given** I have selected dark mode on Settings, **When** I navigate to the main calendar, **Then** the calendar (grid, headers, time entries, app header) uses the dark theme.
3. **Given** I have selected dark mode on Settings, **When** I open the entry form, the chatbot panel, the docs panel, an ArbZG warning banner, or any error banner, **Then** all of these surfaces use the dark theme and remain readable.
4. **Given** I have selected dark mode and I close the browser, **When** I reopen the app later, **Then** dark mode is still active on first paint.
5. **Given** I am on the calendar in dark mode, **When** I look at the calendar toolbar, **Then** there is no theme toggle there (the toggle is exposed on Settings only).
6. **Given** I am in dark mode, **When** I open Settings and switch back to light, **Then** Settings re-styles immediately and navigating back to the calendar shows it in light theme.
7. **Given** I am a first-time user with no theme preference saved, **When** I open the app, **Then** the light theme is shown.

---

### Edge Cases

- **No flash of the wrong theme on load**: If the user has chosen dark mode, the app MUST NOT briefly show the light theme on first paint and then "snap" to dark. The chosen theme must be applied before the page becomes visible.
- **Theme switched while a modal is open**: changing the theme must immediately re-style the open modal (entry form, confirmation dialog), the underlying page, and any visible toolbar/panel — not require closing and reopening.
- **Browser-level forced colors / OS high-contrast mode**: when the user agent applies forced colors, the user agent's colors win. The app does not override forced-color rendering.
- **Custom user CSS or accessibility extensions**: out of scope; the app does not attempt to detect or interact with them.
- **Per-user theme on shared devices**: theme is per-browser-profile (localStorage); two users sharing a device but using different browser profiles each get their own choice. Users sharing a single browser profile share the choice (no per-Redmine-user theme).
- **Server-side rendering / first-paint timing**: the app is a static SPA; "first paint" means before FullCalendar or any other module renders content into the DOM.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Settings page MUST expose a theme control with at least two values: light and dark.
- **FR-002**: The chosen theme MUST be persisted across sessions in browser local storage so the choice survives reload, browser restart, and navigation between `index.html` and `settings.html`.
- **FR-003**: Both pages — the calendar (`index.html`) and Settings (`settings.html`) — MUST apply the chosen theme on load.
- **FR-004**: Changing the theme on the Settings page MUST take effect immediately, without requiring a page reload.
- **FR-005**: All interactive UI surfaces MUST be readable in dark mode: calendar grid and headers, time-entry blocks, week total, app header, modals (entry form, confirmation dialogs), chatbot panel, docs panel, ArbZG warning banners, error/info banners, version display, settings form fields and labels.
- **FR-006**: First-time users (no theme preference stored) MUST see the light theme.
- **FR-007**: The theme toggle MUST NOT appear in the calendar toolbar or anywhere outside the Settings page.
- **FR-008**: The chosen theme MUST be applied before the page becomes visible to the user, to prevent a flash of the wrong theme.
- **FR-009**: All new user-visible strings (theme section heading, light/dark labels, optional hint copy) MUST be added to `js/i18n.js` in both EN and DE.
- **FR-010**: Switching the theme while a modal is open MUST re-style the open modal in addition to the underlying page.
- **FR-011**: The theme choice MUST NOT depend on or interact with the existing `weeklyHours`, `redmine_calendar_view_mode`, `redmine_calendar_day_range`, or any other functional setting; it is purely visual.

### Key Entities

- **Theme Preference**: a single user choice persisted in browser local storage. Possible values: `light`, `dark`. Default when missing: `light`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can switch the app to dark mode in 3 or fewer interactions starting from the calendar (open Settings, locate toggle, select dark).
- **SC-002**: After switching themes on Settings, the new theme is visible on screen in under 300 ms without a page reload (consistent with Constitution Principle II).
- **SC-003**: A visual audit of every interactive surface — calendar grid, time entries, headers, modals, chatbot panel, docs panel, ArbZG banners, error banners, settings form — passes contrast and readability checks in both light and dark themes.
- **SC-004**: 0 flashes of the wrong theme on page load when dark is the chosen theme (verified by a UI test that asserts the dark theme class is present before the calendar renders).
- **SC-005**: The chosen theme persists across reload and across navigation between `index.html` and `settings.html` (verified by a Playwright test).
- **SC-006**: The calendar toolbar contains no new theme controls (verified by snapshot of the toolbar contents pre- and post-feature).
- **SC-007**: All previously existing user-visible behaviour (entry CRUD, copy-paste, working-hours toggle, ArbZG warnings, AI assistant, Outlook import) continues to work identically in both themes — verified by the existing test suites continuing to pass with the dark theme applied.

## Assumptions

- Theme is a strict user choice (`light` or `dark`). v1 does not provide an "auto / follow system preference" mode. Users who want to follow the OS preference will have to toggle manually for v1; an "auto" mode may be added in a follow-up.
- Theme preference is stored per browser (localStorage), not per Redmine user. Users sharing a browser profile share the choice.
- The project's existing CSS already uses some color tokens / variables (e.g. `var(--color-text)`, `var(--color-border)` per `css/style.css`), making a CSS-variable-based theming approach the natural fit. Surfaces that hard-code colors will need to be migrated to variables; this is an implementation detail handled at planning time.
- A toolbar shortcut for theme switching is **explicitly out of scope** for v1; the toggle lives on Settings only.
- Animated transitions between themes (e.g., a fade) are out of scope; an instant swap is acceptable for v1.
- Custom theme colors (user-pickable accent colors, multiple dark variants like AMOLED, etc.) are out of scope for v1.
- All theme-application logic and the persistence helper MUST be covered by Vitest unit tests, and the toggle's effect on a representative page (Settings + calendar) MUST be covered by Playwright UI tests, per Constitution Principle III.
