# Quickstart / UAT: Settings Page Redesign

**Prerequisites**: `npm install`; run the app with `npm run dev` (HTTPS + proxies). Open `settings.html`. Have a valid Redmine API key (and an invalid one) ready. Test in both light and dark theme, and at desktop (>640px) and mobile (<640px) widths.

Each scenario is a checkbox so `/speckit-uat-run` can track it.

## Scenario 1 — Grouped layout + section nav (US1)

- [x] On desktop, the page shows five cards (Anzeige, Arbeitszeiten, Authentifizierung, Quellen, Daten & Datenschutz) and a vertical section-nav rail.
- [x] Clicking a nav entry scrolls to that section and marks the entry active.
- [x] Scrolling updates the active nav entry to match the visible section (scroll-spy).
- [x] On mobile, the nav is a sticky chip-bar under the header and the active chip auto-scrolls into view on tap and on scroll.

## Scenario 2 — Display switches, instant-apply (US4)

- [x] "Nur Arbeitszeit anzeigen", "Nur Mo–Fr anzeigen", "Schnellmodus" render as switch controls (`role="switch"`).
- [x] Toggling each persists immediately (reload keeps the value); there is no global save button.
- [x] The calendar reflects each toggle's new value.

## Scenario 3 — Working hours (US1/validation)

- [x] Start, Ende, Wochenstunden are editable; Wochenstunden is constrained to 0–60.
- [x] Changing a field persists on change (no save button); invalid input shows an inline error.
- [x] On mobile, Start+Ende are a 2-up row and Wochenstunden is its own row.

## Scenario 4 — Explicit Redmine connection (US2)

- [x] With no live connection the status pill shows "Nicht verbunden".
- [x] Entering a valid key and clicking "Verbinden" shows "Verbindung wird geprüft…" (button disabled/busy), then "Verbunden".
- [x] Entering an invalid key and clicking "Verbinden" shows a specific error (invalid credentials), not a generic/silent failure.
- [x] Simulating a network/server failure shows the corresponding distinct error reason.
- [x] After a successful connection, editing the key/username/password returns the pill to "Nicht verbunden" and shows "Zugangsdaten geändert — erneut verbinden."
- [x] Switching between "API-Schlüssel" and "Benutzername & Passwort" shows the right fields and resets the connection.
- [x] The show/hide toggle reveals/hides the API key without persisting it in plain text.
- [x] Reopening Settings with a credential already stored auto-verifies the connection (no click on "Verbinden" needed) — the pill reaches "Verbunden" on its own.

## Scenario 5 — App entry gated on connection (US5)

- [x] While disconnected, "Kalender öffnen →" in the sticky footer is disabled with the hint "Zuerst mit Redmine verbinden, um den Kalender zu öffnen."
- [x] After connecting, "Kalender öffnen →" is enabled and navigates to the calendar.
- [x] Invalidating the connection (editing credentials) disables the footer action again.
- [x] Reopening Settings with a stored credential enables "Kalender öffnen →" automatically, without any manual reconnect step.

## Scenario 6 — Choose & order planning sources (US3 / #274)

- [x] Each source row has an enable checkbox, label, reorder affordance, and position badge.
- [x] Toggling enable persists immediately.
- [x] Desktop: dragging a row reorders it; badges renumber; order persists across reload.
- [x] Desktop keyboard: focus the grip, Space/Enter grabs, ↑/↓ moves (focus stays on the grip), Space/Esc drops; order persists.
- [x] Mobile: up/down arrow buttons reorder; buttons are disabled at the first/last row.
- [x] Each move is announced via the screen-reader live region ("… verschoben — Position X von N").
- [x] Opening the calendar planning view shows the source columns in the chosen order.

## Scenario 7 — Data & privacy danger zone (US6)

- [x] The Daten & Datenschutz card is visually distinct (danger styling) and separated from everyday settings.
- [x] A privacy-policy link is present and opens the policy.
- [x] "Planungsdaten löschen" and "Einwilligung widerrufen" each require confirmation before acting and actually clear the data/consent on confirm.

## Scenario 8 — Theme (US1/D4)

- [x] The header theme toggle switches light/dark; there is no dark-mode row in the settings list.
- [x] On first visit the OS `prefers-color-scheme` is honored; the explicit toggle persists across reloads.

## Scenario 9 — Mobile quality (US7)

- [x] At <640px the layout is single-column with the chip-bar; switches, chips, arrow buttons, and primary buttons have ≥44px hit targets; auth/footer buttons are full-width.

## Scenario 10 — Accessibility gate (cross-cutting / FR-021)

- [x] `npm run test:ui` axe-core scans pass on the settings surface in both light and dark themes.
- [x] With a purple CI accent (`brandPrimary: '#6c2bd9'`) configured, link and focus-ring contrast still pass ≥3:1 in dark mode.

## Automated checks

- [x] `npm run lint && npm run format:check && npm run typecheck` pass.
- [x] `npm test` (unit: `source-order`, `settings-connection`) passes.
- [x] `npm run test:ui` (Playwright: nav/scroll-spy, switches, connect flow, footer gating, reorder × 3 modalities, danger confirms, mobile, axe) passes.
- [x] `npm run knowledge:check`, `npm run dup:check`, `npm run sqi` (≥80) pass.
