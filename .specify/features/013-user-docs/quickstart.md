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

- [ ] **Calendar view**: Verify a "?" or "Help" button/link is visible in the app header **without scrolling** on `index.html`
- [ ] **Settings view**: Verify the same help entry point is visible in the header **without scrolling** on `settings.html`

---

## FR-001 · User Story 1 (P1) — Panel Opens In-Page

- [ ] Click the help entry point on the calendar view
- [ ] Verify a **slide-in panel** opens within the same page (URL does not change)
- [ ] Verify the calendar remains visible behind the panel
- [ ] Verify the panel has a close button (or Escape key closes it)
- [ ] Close the panel; verify the calendar is fully usable

---

## FR-001 · Settings Context — User Story 1 (P1 Scenario 3)

- [ ] Click the help entry point on `settings.html`
- [ ] Verify the documentation panel opens and is readable
- [ ] Verify the panel includes content about configuring Redmine URL and API key

---

## SC-004 — Panel Opens Within 500ms

- [ ] With the app already loaded, open the docs panel
- [ ] Verify the panel content appears immediately (no visible loading delay for a local server)
- [ ] Confirm no new network request is triggered on panel open (check DevTools Network tab — docs fetch should have occurred on page load)

---

## FR-002 — Feature Coverage

Verify the documentation panel contains a readable section for each of the following:

- [ ] Getting started / overview of the application
- [ ] Calendar navigation (week navigation, switching views)
- [ ] Time entries — creating a new entry
- [ ] Time entries — editing an existing entry
- [ ] Time entries — deleting an entry
- [ ] Copy and paste time entries
- [ ] Working hours view toggle
- [ ] Work week / full week toggle
- [ ] Favourite issues
- [ ] ArbZG compliance indicators (what the warnings mean)
- [ ] Settings configuration (Redmine URL and API key)

---

## FR-003 · User Story 2 (P2) — Keyboard Shortcuts

- [ ] Verify the documentation includes a **Keyboard Shortcuts** section
- [ ] Verify it contains a table listing at minimum: Click (select), Double-click/Enter (open), Ctrl+C (copy), Del (delete), Escape (close/deselect)

---

## FR-002 · User Story 2 (P2) — Copy-Paste Documentation

- [ ] Verify the copy-paste section explains: single-click to select, double-click or Enter to open, Ctrl+C to copy, then click or drag an empty slot to paste

---

## FR-004 · FR-005 · User Story 3 (P3) — German Locale

- [ ] Set browser language to German (e.g. in Chrome: Settings → Languages → move Deutsch to top)
- [ ] Reload `http://localhost:3000/index.html`
- [ ] Open the help panel
- [ ] Verify **all documentation content** is displayed in German
- [ ] Verify the panel title, close button, and any UI labels are also in German

---

## FR-004 — Non-DE Locale Fallback

- [ ] Set browser language to a non-DE, non-EN locale (e.g. French)
- [ ] Reload and open the help panel
- [ ] Verify documentation content is displayed in **English**

---

## FR-006 — Works Offline / No External Dependencies

- [ ] Disable network access (or use browser DevTools to throttle to "Offline" after initial page load)
- [ ] Open the help panel
- [ ] Verify the panel is readable (content was prefetched; no external CDN required for docs rendering)

---

## FR-005 — i18n for UI Strings

- [ ] In both English and German locales, verify the help button label, panel title, and close button use translated strings (not hardcoded English)

---

## SC-001 — Discoverability

- [ ] Ask someone unfamiliar with the app (or simulate fresh eyes) to find the help entry point — verify they locate it within 10 seconds without guidance

## SC-002 — Feature Coverage Completeness

- [ ] Verify documentation covers **all** features listed in FR-002 (10 feature areas + keyboard shortcuts)

## SC-003 — No Untranslated Strings

- [ ] In the German locale, verify no English text is visible in either the panel UI elements or the documentation content

---

## Regression: Calendar Unaffected

- [ ] With the docs panel open, verify the calendar still renders and is interactive
- [ ] Create a time entry while the docs panel has been opened and closed — verify it saves correctly
- [ ] Verify no console errors appear when opening or closing the docs panel
