# Feature Spec: Settings Redesign

> Paste into speckit `/specify`. Implements issue #275 (depends on #274).
> Full visual/token/behavior detail lives in `README.md` in this same folder — reference it from `/plan`.

## Summary
Redesign the RedmineCalendar Settings page from a long, narrow, single-column list into a
grouped, card-based, responsive layout using the project's Fluent 2 design language with the
purple corporate accent. Use the correct control per setting, make settings instant-apply,
make the Redmine connection an explicit status-driven action, and meet the WCAG 2.2 AA / axe-core
CI gate.

## Goals
- Replace the flat list with **cards grouped by topic** and a **section nav** (vertical rail on
  desktop, sticky horizontal chip-bar on mobile with the active chip auto-scrolled into view).
- Apply **Fluent 2** styling and the **purple brand accent** consistently; full **dark-mode**
  support via the existing theme provider (single theme toggle in the header — no settings row).
- Use **Switches** for on/off preferences; reserve **checkboxes** for the multi-select source list.
- Make all preferences **instant-apply** (no global save). The only explicit action is **Verbinden**
  (Redmine auth); the only navigation action is **Kalender öffnen** in a sticky footer, gated on a
  live connection.
- Make the **planning sources reorderable**, with the order reflected in the app, via **both**
  pointer drag **and** a keyboard/touch alternative.
- Separate **destructive actions** into a danger zone and surface the **privacy link** there.

## Non-goals
- Backend/API changes beyond what's needed to persist settings and run the real auth call.
- Redesigning the calendar/app screens themselves (out of scope; this is Settings only).

## User stories & acceptance criteria

### US1 — Find and change a setting quickly
As a user, I can scan grouped sections and jump to one via the nav.
- **AC:** Five sections (Anzeige, Arbeitszeiten, Authentifizierung, Quellen, Daten & Datenschutz)
  render as cards; nav reflects the active section on scroll and scrolls to a section on click;
  on mobile the nav is a chip-bar and the active chip is always visible.

### US2 — Toggle display preferences with immediate effect
As a user, on/off preferences apply instantly.
- **AC:** "Nur Arbeitszeit", "Nur Mo–Fr", "Schnellmodus" are `role="switch"` toggles that persist
  on change with no save button.

### US3 — Connect to Redmine deliberately, with clear status
As a user, I enter credentials and explicitly connect, and I always know the connection state.
- **AC:** Status pill shows `Nicht verbunden | Verbindung wird geprüft… | Verbunden` inside the
  auth card. "Verbinden" runs the real auth call with real success/error states. Editing
  credentials invalidates a live connection and re-disables downstream actions.

### US4 — Enter the app only when connected
As a user, I open the calendar from Settings.
- **AC:** Sticky footer "Kalender öffnen →" is enabled only when connected; otherwise disabled with
  an explanatory hint.

### US5 — Choose and order planning sources
As a user, I enable sources and set their order; the order is used by the app.
- **AC:** Each source has an enable checkbox and a position; order persists and drives the app.
  Reordering works via pointer drag **and** a non-drag path (keyboard grab+arrows on desktop,
  up/down buttons on mobile); every move is announced via `aria-live`.

### US6 — Manage data & privacy safely
As a user, I can reach the privacy policy and perform destructive actions without doing so by accident.
- **AC:** Privacy link present; "Planungsdaten löschen" and "Einwilligung widerrufen" are
  danger-styled, separated from everyday settings, and confirmed before acting.

### US7 — Use it on mobile
As a user on a phone, the page is comfortable and fully functional.
- **AC:** At <640px the layout is single-column with a chip-bar, ≥44px hit targets, split working-
  hours fields, full-width auth/footer buttons, and arrow-button source reordering.

## Cross-cutting requirements
- **Accessibility (hard CI gate, Feature 033):** passes axe-core / WCAG 2.2 AA, including SC 2.5.7
  (dragging alternative), `aria-live` announcements, `role="switch"`/`group` semantics, focus-
  visible ≥3:1 in both themes, 44px mobile targets.
- **i18n:** all copy via the existing DE/EN layer.
- **Stack:** vanilla **JS / CSS / HTML** — no framework. Implement tokens as CSS custom properties
  and theme via a `data-theme` attribute on a root element (optionally use Fluent UI Web Components
  for form controls). Honor `prefers-color-scheme` on first load and persist the toggle.
- **State:** validated inputs whose values are read/written on change; load settings on open (with a
  loading state); persist on change.

## References
- Issue #275 (this feature), #274 (cross-dependency).
- `README.md` (same folder): exact tokens, per-component specs, state table, interaction details,
  and an implementation checklist.
- `Settings Prototype.dc.html` (same folder): clickable reference prototype.
