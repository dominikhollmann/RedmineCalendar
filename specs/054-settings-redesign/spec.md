# Feature Specification: Settings Page Redesign

**Feature Branch**: `054-settings-redesign`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: Redesign the Settings page from a long, narrow single-column list into a grouped, card-based, responsive Fluent 2 layout with the correct control per setting, instant-apply preferences, an explicit status-driven Redmine connection, and reorderable planning sources. Implements GitHub issue #275 (Redesign of Settings) with cross-dependency #274 (Reorder Planning Source Columns).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Find and change a setting quickly (Priority: P1)

A user opens Settings and sees their options organized into labelled, themed cards grouped by topic, with a navigation aid that lets them jump straight to the group they want. Scrolling keeps the nav in sync with the section currently in view.

**Why this priority**: This is the core value of the redesign (issue #275). Replacing the flat, undifferentiated list with grouped cards + navigation is the structural change everything else builds on; without it the page is still "a long, narrow list".

**Independent Test**: Open Settings, confirm five cards render (Anzeige, Arbeitszeiten, Authentifizierung, Quellen, Daten & Datenschutz), click each nav entry and confirm the page scrolls to that section, and scroll manually to confirm the active nav entry follows the visible section.

**Acceptance Scenarios**:

1. **Given** the Settings page is open on a desktop viewport, **When** the page loads, **Then** the five sections render as separate cards and a vertical section-nav rail is visible alongside them.
2. **Given** the desktop nav rail is visible, **When** the user clicks a section entry, **Then** the page scrolls to that section and the clicked entry is marked active.
3. **Given** the user scrolls the page, **When** a different section comes into view, **Then** the active nav entry updates to match the visible section (scroll-spy).
4. **Given** a mobile viewport (<640px), **When** the page loads, **Then** the nav is a sticky horizontal chip-bar under the header and the active chip is always scrolled into view as the active section changes.

---

### User Story 2 - Connect to Redmine deliberately, with clear status (Priority: P1)

A user enters their Redmine credentials and explicitly triggers a connection. The page always shows the current connection state, runs the real authentication call, and reports real success or failure. Editing credentials after a successful connection invalidates that connection so the user knows they must reconnect.

**Why this priority**: The connection state is the gate for entering the app (US4) and is a real behavioral change from the current page (which has no explicit, status-driven connect action). It must exist for the footer entry point to be meaningful.

**Independent Test**: Open Settings, observe the status pill shows "Nicht verbunden", enter valid credentials, click "Verbinden", confirm the pill transitions through "Verbindung wird geprüft…" to "Verbunden"; then edit a credential field and confirm the pill returns to "Nicht verbunden" with a reconnect hint.

**Acceptance Scenarios**:

1. **Given** no live connection, **When** the auth card renders, **Then** a status pill shows "Nicht verbunden".
2. **Given** the user has entered credentials, **When** they click "Verbinden", **Then** the pill shows "Verbindung wird geprüft…", the button is disabled/busy, and the real authentication call runs.
3. **Given** the authentication call succeeds, **When** it returns, **Then** the pill shows "Verbunden".
4. **Given** the authentication call fails, **When** it returns, **Then** the pill returns to a not-connected/error state and a reason is shown (invalid key, network failure, or server error).
5. **Given** a live "Verbunden" connection, **When** the user edits the API key / username / password, **Then** the connection is invalidated, the pill returns to "Nicht verbunden", and a hint "Zugangsdaten geändert — erneut verbinden." appears.
6. **Given** the auth card, **When** the user switches between "API-Schlüssel" and "Benutzername & Passwort" methods, **Then** the relevant fields are shown and the connection reflects the selected method.

---

### User Story 3 - Choose and order planning sources (Priority: P1)

A user enables the planning sources they want and arranges them in the order they prefer; that order is then used by the app's planning views. Reordering is possible both by dragging and by a non-drag path (keyboard on desktop, up/down buttons on mobile), and every move is announced for assistive technology.

**Why this priority**: This is the named cross-dependency (issue #274) and a distinct, independently shippable capability. The dual-modality reorder is also load-bearing for the accessibility gate (WCAG 2.2 SC 2.5.7).

**Independent Test**: Open Settings, toggle a source's enable checkbox and confirm it persists, then move a source up/down via drag and via the keyboard/arrow-button path, confirm the position badges update and the new order persists and is reflected by the app's planning views.

**Acceptance Scenarios**:

1. **Given** the Quellen card, **When** it renders, **Then** each source row shows an enable checkbox, a label, a reorder affordance, and a position badge.
2. **Given** a source row, **When** the user toggles its enable checkbox, **Then** the change persists immediately with no save button.
3. **Given** a desktop viewport, **When** the user drags a source row to a new position, **Then** the order updates, the position badges renumber, and the order persists.
4. **Given** a desktop viewport and keyboard focus on a row's reorder handle, **When** the user grabs (Space/Enter), moves (↑/↓), and drops (Space/Esc), **Then** the row reorders, focus stays on the moved handle, and each step is announced.
5. **Given** a mobile viewport, **When** the user taps a row's up/down arrow button, **Then** the row reorders (buttons disabled at the ends) and the move is announced.
6. **Given** any reorder, **When** the order changes, **Then** an assistive-technology live region announces the moved source and its new position (e.g. "Outlook verschoben — Position 1 von 2").
7. **Given** a new source order, **When** the user returns to the app's planning views, **Then** the columns/sources appear in the chosen order.

---

### User Story 4 - Toggle display preferences with immediate effect (Priority: P2)

A user flips on/off display preferences and they take effect immediately, with no global save step.

**Why this priority**: High everyday value but depends on the redesigned card shell (US1) being present; the underlying preferences already exist, so this is primarily a control + instant-apply behavior change.

**Independent Test**: Open Settings, toggle each of "Nur Arbeitszeit anzeigen", "Nur Mo–Fr anzeigen", "Schnellmodus", confirm each is a switch control, that the change persists without a save button, and that the corresponding app behavior reflects the new value.

**Acceptance Scenarios**:

1. **Given** the Anzeige card, **When** it renders, **Then** the three preferences appear as switch controls reflecting their current values.
2. **Given** a switch, **When** the user toggles it, **Then** the new value persists immediately and there is no save button.

---

### User Story 5 - Enter the app only when connected (Priority: P2)

A user navigates from Settings into the calendar via a sticky footer action that is only enabled when a live Redmine connection exists.

**Why this priority**: Depends on the connection state machine (US2). It is the single navigation action out of Settings and prevents users entering the app in an unusable, unconnected state.

**Independent Test**: With no connection, confirm the footer "Kalender öffnen →" action is disabled and shows an explanatory hint; connect successfully and confirm the action becomes enabled and navigates to the calendar.

**Acceptance Scenarios**:

1. **Given** no live connection, **When** the page renders, **Then** the sticky footer "Kalender öffnen →" action is disabled with the hint "Zuerst mit Redmine verbinden, um den Kalender zu öffnen."
2. **Given** a live "Verbunden" connection, **When** the footer renders, **Then** "Kalender öffnen →" is enabled and navigates to the calendar.
3. **Given** a live connection that is then invalidated by editing credentials, **When** the connection drops, **Then** the footer action returns to disabled.

---

### User Story 6 - Manage data & privacy safely (Priority: P3)

A user can reach the privacy policy and perform destructive actions without triggering them by accident, because those actions are visually separated and require confirmation.

**Why this priority**: Important for safety and compliance but lower-frequency; it reorganizes and confirms existing destructive actions rather than introducing new core capability.

**Independent Test**: Open Settings, confirm the Daten & Datenschutz card is visually distinct (danger styling), confirm the privacy link is present and opens the policy, and confirm each destructive action requires confirmation before it acts.

**Acceptance Scenarios**:

1. **Given** the Daten & Datenschutz card, **When** it renders, **Then** it is styled as a danger zone and contains a privacy-policy link separated from the destructive actions.
2. **Given** a destructive action ("Alle lokal gespeicherten Planungsdaten löschen" / "KI-Planungseinwilligung widerrufen"), **When** the user triggers it, **Then** a confirmation is required before the action is performed.
3. **Given** the user confirms a destructive action, **When** it completes, **Then** the corresponding data/consent is actually cleared.

---

### User Story 7 - Use it comfortably on mobile (Priority: P2)

A user on a phone gets a single-column, touch-comfortable layout that retains every capability of the desktop layout.

**Why this priority**: The app is used on mobile and the accessibility gate requires adequate touch targets; this is a quality bar across all the other stories rather than a standalone feature, hence P2.

**Independent Test**: Open Settings at <640px, confirm single-column cards, a chip-bar nav, ≥44px hit targets on interactive controls, split working-hours fields, full-width auth/footer buttons, and arrow-button source reordering.

**Acceptance Scenarios**:

1. **Given** a viewport <640px, **When** the page renders, **Then** the layout is single-column with the chip-bar nav.
2. **Given** the mobile layout, **When** interactive controls render, **Then** switches, chips, arrow buttons, and primary buttons all have ≥44px hit targets.
3. **Given** the mobile layout, **When** the working-hours and auth/footer areas render, **Then** working-hours fields are split appropriately and auth/footer buttons are full-width.

---

### Edge Cases

- **Authentication failure modes**: invalid API key, wrong username/password, network failure, and server (5xx) error must each produce a distinct, understandable state rather than a generic or silent failure.
- **Editing credentials mid-check**: editing a credential field while a check is in flight must not leave a stale "checking" or "connected" state.
- **Reorder at the ends**: up/down arrow buttons must be disabled (not silently no-op) for the first/last row; keyboard move past an end must not move focus off the list.
- **Single enabled source / all sources disabled**: reordering and the app's consumption of the order must behave sanely when zero or one source is enabled.
- **First load with no saved settings**: the page must show sensible defaults and a loading state while current settings are read, not a flash of empty controls.
- **Theme on first load**: respect the OS `prefers-color-scheme` on first visit, then persist the user's explicit toggle.
- **Dark mode with a custom (purple) corporate accent**: link and focus-indicator contrast must remain within the accessibility gate's threshold in dark mode even when the admin sets a darker brand accent.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Settings page MUST present its options as topic-grouped cards in this order: Anzeige, Arbeitszeiten, Authentifizierung, Quellen, Daten & Datenschutz.
- **FR-002**: The page MUST provide section navigation — a vertical rail on desktop and a sticky horizontal chip-bar on mobile — that scrolls to a section on activation and reflects the section currently in view (scroll-spy).
- **FR-003**: On mobile, the active navigation chip MUST always be scrolled into view when the active section changes (via tap or scroll-spy).
- **FR-004**: Display preferences ("Nur Arbeitszeit anzeigen", "Nur Mo–Fr anzeigen", "Schnellmodus") MUST be switch controls that apply and persist immediately with no global save button.
- **FR-005**: Working-hours settings (start time, end time, weekly hours) MUST be editable, validated, and persisted on change; weekly hours MUST be constrained to a sensible range (0–60).
- **FR-006**: The page MUST offer two authentication methods — API key, and username & password — selectable via a segmented control, showing only the relevant fields for the selected method.
- **FR-007**: The API-key field MUST offer a show/hide toggle for the entered key.
- **FR-008**: The page MUST display a connection status with exactly three primary states — "Nicht verbunden", "Verbindung wird geprüft…", "Verbunden" — plus an error presentation for failed checks.
- **FR-009**: Clicking "Verbinden" MUST run the real Redmine authentication call and surface real outcomes, distinguishing invalid credentials, network failure, and server error.
- **FR-010**: Editing any credential field while a connection is live MUST invalidate that connection, return the status to "Nicht verbunden", disable the app-entry action, and show the hint "Zugangsdaten geändert — erneut verbinden."
- **FR-011**: A sticky footer action "Kalender öffnen →" MUST be enabled only when the connection is "Verbunden"; otherwise it MUST be disabled and show the hint "Zuerst mit Redmine verbinden, um den Kalender zu öffnen."
- **FR-012**: Each planning source MUST have an enable control whose state persists immediately.
- **FR-013**: Planning sources MUST be reorderable, and the resulting order MUST persist and be applied by the app's planning views.
- **FR-014**: Reordering MUST be possible via pointer drag AND via a non-drag path — keyboard grab + arrow keys on desktop, and up/down buttons on mobile — with end positions handled (buttons disabled at ends; focus retained on keyboard move).
- **FR-015**: Every reorder, grab, drop, and connection-state change MUST be announced via an assistive-technology live region, and every move MUST update the visible position badges.
- **FR-016**: The auto-refresh interval MUST be editable as a number (0 = off) and persist on change.
- **FR-017**: The Daten & Datenschutz section MUST be visually separated as a danger zone, contain a link to the privacy policy, and require confirmation before performing either destructive action ("Planungsdaten löschen", "Einwilligung widerrufen").
- **FR-018**: All settings MUST be loaded on open with a loading state, and all preference changes MUST persist on change (the only explicit action is "Verbinden"; the only navigation action is "Kalender öffnen").
- **FR-019**: The page MUST support light and dark themes via the existing theme mechanism, defaulting to the OS preference on first load and persisting the user's explicit toggle; theme is controlled only by the existing header toggle (no settings row for it).
- **FR-020**: All user-visible copy (labels, sublabels, switch labels, the three connection states, button labels, helper texts, hints, and all assistive-technology labels) MUST be provided through the existing DE/EN localization layer.
- **FR-021**: The page MUST satisfy the project's accessibility CI gate (WCAG 2.2 AA via axe-core): switch/group/role semantics, the SC 2.5.7 non-drag reorder path, live-region announcements, focus-visible contrast ≥3:1 in both themes, and ≥44px mobile hit targets.
- **FR-022**: The redesign MUST reuse the project's existing design-token system and theme provider rather than introducing a parallel token set; only genuinely new component-specific tokens (e.g. switch thumb/border, status dot, reorder grip) may be added to the central token block.
- **FR-023**: The corporate accent color MUST remain admin-configurable through the existing configuration mechanism, with the existing default retained in code; the redesign MUST NOT hardcode a new accent color into the tokens.

### Key Entities

- **Display preferences**: the set of on/off view options (work-hours-only, Mon–Fri-only, quick mode), each a boolean applied immediately.
- **Working-hours settings**: start time, end time, and weekly target hours.
- **Credentials & connection**: the chosen auth method, the entered secrets, and the derived connection state (disconnected / checking / connected / error).
- **Planning source**: an item with an identity, a display label, an enabled flag, and a meaningful position; the ordered, enabled set drives the app's planning views.
- **Auto-refresh interval**: a number of minutes (0 = off).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can locate and reach any of the five settings groups in at most one navigation action (one click/tap on the section nav) from the top of the page.
- **SC-002**: 100% of preference changes (switches, working hours, source enable/order, auto-refresh) take effect and persist without any explicit save action.
- **SC-003**: The connection status visible to the user always matches the actual connection state, including after a failed check and after editing credentials (no stale "connected" state).
- **SC-004**: A user can reorder planning sources to any arrangement using only the keyboard (desktop) or only touch arrow buttons (mobile), without using a pointer drag.
- **SC-005**: The page passes the automated accessibility gate (axe-core / WCAG 2.2 AA) across both themes with zero violations.
- **SC-006**: The app-entry action is never enabled while disconnected, so a user cannot enter the calendar without a live Redmine connection.
- **SC-007**: The page is fully usable on a <640px viewport: every action available on desktop is reachable, and all interactive targets are ≥44px.

## Assumptions

- **Cross-dependency on #274**: the planning-source reorder capability (US3) satisfies issue #274; the two issues are delivered together in this feature.
- **Reuse of existing systems**: the existing settings storage/load mechanism, the existing light/dark theme provider, the existing DE/EN i18n layer, the existing Redmine authentication call, and the existing accessibility (axe-core) CI gate are reused as-is; no parallel mechanisms are introduced.
- **Design tokens**: the design prototype's token list is treated as a renamed duplicate of the project's existing Fluent 2 token system; the redesign maps onto the existing tokens and only adds component-specific tokens that genuinely do not yet exist.
- **Accent color**: the purple corporate accent is applied via the existing admin configuration (brand-primary), not by hardcoding; the existing default accent is retained in code. A dark-mode contrast safeguard for link/focus colors is in scope so the accessibility gate holds when a darker accent is configured.
- **Stack constraint**: the implementation stays vanilla JS/CSS/HTML with no new framework or runtime dependency (consistent with the project's build-free, dependency-gated setup); the design prototype and its runtime file are references only and are not ported.
- **Scope boundary**: no backend/API changes beyond what is needed to persist settings and run the real authentication call; the calendar and other app screens are not redesigned.
- **Privacy/DSGVO**: the destructive actions and the privacy link reorganize existing capabilities; any user-facing data-handling change is reflected in the privacy documentation per the project's DSGVO checklist.
