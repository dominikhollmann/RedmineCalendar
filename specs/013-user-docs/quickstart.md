# Quickstart & Acceptance Test Checklist: User Documentation (013)

**Branch**: `013-user-docs` | **Date**: 2026-04-17

This checklist is the compensating control for the Test-First exception (Constitution III). It MUST be executed in full before the feature is considered complete. All items must pass.

---

## Prerequisites

1. App is running: `npm run serve` (port 3000)
2. Open `http://localhost:3000/index.html` in a browser
3. Redmine credentials are configured (calendar loads without errors)

---

## FR-001 · FR-007 — Entry Point Visibility

- [x] **Calendar view**: Verify a "?" or "Help" button/link is visible in the app header **without scrolling** on `index.html`
- [x] **Settings view**: Verify the same help entry point is visible in the header **without scrolling** on `settings.html`

---

## FR-001 · User Story 1 (P1) — Panel Opens In-Page

- [x] Click the help entry point on the calendar view
- [x] Verify a **slide-in panel** opens within the same page (URL does not change)
- [x] Verify the calendar remains visible behind the panel
- [x] Verify the panel has a close button (or Escape key closes it)
- [x] Close the panel; verify the calendar is fully usable

---

## FR-001 · Settings Context — User Story 1 (P1 Scenario 3)

- [x] Click the help entry point on `settings.html`
- [x] Verify the documentation panel opens and is readable
- [x] Verify the panel includes content about configuring Redmine URL and API key

---

## SC-004 — Panel Opens Within 500ms

- [x] With the app already loaded, open the docs panel
- [x] Verify the panel content appears immediately (no visible loading delay for a local server)
- [x] Confirm no new network request is triggered on panel open (check DevTools Network tab — docs fetch should have occurred on page load)

---

## FR-002 — Feature Coverage

Verify the documentation panel contains a readable section for each of the following:

- [x] Getting started / overview of the application
- [x] Calendar navigation (week navigation, switching views)
- [x] Time entries — creating a new entry
- [x] Time entries — editing an existing entry
- [x] Time entries — deleting an entry
- [x] Copy and paste time entries
- [x] Working hours view toggle
- [x] Work week / full week toggle
- [x] Favourite issues
- [x] ArbZG compliance indicators (what the warnings mean)
- [x] Settings configuration (Redmine URL and API key)

---

## FR-003 · User Story 2 (P2) — Keyboard Shortcuts

- [x] Verify the documentation includes a **Keyboard Shortcuts** section
- [x] Verify it contains a table listing at minimum: Click (select), Double-click/Enter (open), Ctrl+C (copy), Del (delete), Escape (close/deselect)

---

## FR-002 · User Story 2 (P2) — Copy-Paste Documentation

- [x] Verify the copy-paste section explains: single-click to select, double-click or Enter to open, Ctrl+C to copy, then click or drag an empty slot to paste

---

## FR-004 · FR-005 · User Story 3 (P3) — German Locale

- [x] Set browser language to German (e.g. in Chrome: Settings → Languages → move Deutsch to top)
- [x] Reload `http://localhost:3000/index.html`
- [x] Open the help panel
- [x] Verify **all documentation content** is displayed in German
- [x] Verify the panel title, close button, and any UI labels are also in German

---

## FR-004 — Non-DE Locale Fallback

- [x] Set browser language to a non-DE, non-EN locale (e.g. French)
- [x] Reload and open the help panel
- [x] Verify documentation content is displayed in **English**

---

## FR-006 — Works Offline / No External Dependencies

- [x] Disable network access (or use browser DevTools to throttle to "Offline" after initial page load)
- [x] Open the help panel
- [x] Verify the panel is readable (content was prefetched; no external CDN required for docs rendering)

---

## FR-005 — i18n for UI Strings

- [x] In both English and German locales, verify the help button label, panel title, and close button use translated strings (not hardcoded English)

---

## SC-001 — Discoverability

- [x] Ask someone unfamiliar with the app (or simulate fresh eyes) to find the help entry point — verify they locate it within 10 seconds without guidance

## SC-002 — Feature Coverage Completeness

- [x] Verify documentation covers **all** features listed in FR-002 (10 feature areas + keyboard shortcuts)

## SC-003 — No Untranslated Strings

- [x] In the German locale, verify no English text is visible in either the panel UI elements or the documentation content

---

## Regression: Calendar Unaffected

- [x] With the docs panel open, verify the calendar still renders and is interactive
- [x] Create a time entry while the docs panel has been opened and closed — verify it saves correctly
- [x] Verify no console errors appear when opening or closing the docs panel
