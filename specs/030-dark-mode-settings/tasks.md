---
description: 'Task list for feature 030 — Dark Mode (Settings-Only Toggle)'
---

# Tasks: Dark Mode (Settings-Only Toggle)

**Input**: Design documents from `specs/030-dark-mode-settings/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ (empty by design) · quickstart.md ✅

**Tests**: Every implementation task that adds or changes behavior includes its own unit and/or UI tests. TDD per Constitution Principle III: tests are written first, fail first, then implementation makes them pass.

**Organization**: tasks are grouped by user story. Spec defines a single user story (US1, P1) — switch the app to dark from Settings. The bulk of work lives in Phase 3.

## Format: `[ID] [P?] [Story?] Description with file path`

## Path Conventions

Single-project static SPA. New code in `js/`; tests in `tests/unit/` and `tests/ui/`. Styles in `css/style.css`. i18n in `js/i18n.js`. HTML in `index.html`, `settings.html`.

---

## Phase 1: Setup

- [ ] T001 [P] Create empty stub `js/theme.js` exporting `getTheme`, `setTheme`, `applyTheme`, `subscribeOnChange` placeholders that throw `'not implemented'`.
- [ ] T002 [P] Create empty test files: `tests/unit/theme.test.js`, `tests/ui/theme.spec.js`.

---

## Phase 2: Foundational

**Purpose**: shared helpers + i18n that the rest of the work needs.

- [ ] T003 [US1] Add the four EN+DE i18n keys from research.md §R7 to `js/i18n.js`.

---

## Phase 3: User Story 1 — Switch the App to Dark Mode (Priority: P1) 🎯 MVP

**Goal**: a Settings-page-only theme toggle that persists, applies on first paint without flash, and re-styles every existing surface live.

**Independent Test**: open Settings → select Dark → Settings re-styles → navigate to calendar → calendar dark → reload → still dark with no flash. quickstart.md S1–S14.

### TDD: pure helpers

- [ ] T004 [US1] In `tests/unit/theme.test.js` write Vitest cases:
  - `getTheme()` returns `'light'` when `localStorage` key is missing.
  - `getTheme()` returns `'light'` for invalid stored values (`''`, `'foo'`, `null`, `123`).
  - `getTheme()` returns `'dark'` when stored value is `'dark'`.
  - `getTheme()` returns `'light'` when stored value is `'light'`.
  - `setTheme('dark')` writes `'dark'` to `localStorage` AND sets `documentElement.dataset.theme === 'dark'`.
  - `setTheme('light')` writes `'light'` to `localStorage` AND removes the `data-theme` attribute (or sets it to empty).
  - `applyTheme(rootEl, 'dark')` sets `rootEl.dataset.theme === 'dark'`; idempotent.
  - `applyTheme(rootEl, 'light')` removes the attribute.
  - `subscribeOnChange(listener)` fires the listener after every `setTheme` write; multiple listeners supported; unsubscribe works.
  - `try/catch` around `localStorage` so a throwing storage (private browsing) does NOT crash `getTheme`/`setTheme` — both no-op gracefully.
- [ ] T005 [US1] Run `npx vitest run tests/unit/theme.test.js` — Red.
- [ ] T006 [US1] Implement `js/theme.js` per data-model.md. Module-level subscriber array. Use `try/catch` around all `localStorage` access.
- [ ] T007 [US1] Run vitest — Green.

### Implementation: inline `<head>` bootstrap script

- [ ] T008 [US1] Add the inline `<head>` snippet from research.md §R1 to `index.html` BEFORE any `<link rel="stylesheet">` or `<script>` (module or otherwise). Same snippet to `settings.html`. Verify by viewing source that the script is the FIRST executable thing in `<head>`.

### Implementation: CSS migration + dark variant

- [ ] T009 [US1] In `css/style.css` audit hard-coded color literals: run `grep -nE '#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(' css/style.css` and inspect every hit OUTSIDE the existing `:root` block. Migrate any meaningful color literal to a `var(--…)` token (introduce new tokens to `:root` if needed — e.g., `--color-danger-text`).
- [ ] T010 [US1] Run `git grep -nE 'style\\.color|style\\s*=\\s*"[^"]*color' js/ index.html settings.html` to find any JS-set or HTML-inline colors. Migrate to CSS classes resolved via tokens.
- [ ] T011 [US1] Add the `:root[data-theme="dark"]` block to `css/style.css` with dark values for every token (use the table in research.md §R2 as a starting point). Tune by eye for contrast.
- [ ] T012 [US1] Add a `:root[data-theme="dark"]` block specifically targeting FullCalendar's CSS variables (`--fc-border-color`, `--fc-page-bg-color`, `--fc-neutral-bg-color`, `--fc-event-bg-color`, `--fc-event-border-color`, `--fc-event-text-color`, `--fc-today-bg-color`).

### Implementation: Settings page wiring

- [ ] T013 [US1] In `settings.html` add the new theme control inside the existing settings form: a fieldset with a legend (`t('settings.theme.heading')`), two radio inputs (Light, Dark), and a small hint paragraph (`t('settings.theme.hint')`). Pre-select the current theme via `getTheme()`.
- [ ] T014 [US1] In `js/settings.js` wire the radio-group `change` event to `setTheme(value)`. Re-read on initial load to set the radio's checked state.

### UI tests

- [ ] T015 [US1] In `tests/ui/theme.spec.js` add Playwright tests covering quickstart S1–S14:
  - Settings shows the toggle (S1).
  - Selecting Dark re-styles Settings within 300 ms (S2, SC-002).
  - Navigating to calendar shows dark (S3).
  - Modal/panel inheritance (S4) — assert computed `background-color` of an open modal flips when theme changes.
  - Persistence across reload (S5) — verify `<html data-theme="dark">` is set BEFORE network requests fire by intercepting the page render.
  - No toolbar control (S6) — assert `.fc-toolbar` and `.app-header` contain no theme-related elements.
  - Switching back to light (S7).
  - First-time user defaults to light (S8) — clear localStorage in test, reload, assert light.
  - No-flash test (S9, SC-004) — set theme to dark, reload, take a screenshot at the FIRST possible moment (`page.goto` returns), assert pixel sample at a known background location matches dark.
  - Theme changed while modal open (S10).
  - Per-profile isolation (S12) — Playwright contexts are isolated by default; spec uses two contexts to verify.
  - Other settings unaffected (S13).
  - Existing flows work (S14) — add a smoke check: create an entry, edit it, delete it, all in dark mode; assert no console errors.
- [ ] T016 [US1] Run `npx playwright test tests/ui/theme.spec.js` — Red, then iterate T008–T014 until Green.

**Checkpoint US1**: dark mode works end-to-end on both pages, persists, no flash, no toolbar control, modals re-style, all existing flows unaffected.

---

## Phase 4: Polish & Cross-Cutting

- [ ] T017 [P] Run full Vitest suite (`npx vitest`) — no regressions.
- [ ] T018 [P] Run full Playwright suite (`npx playwright test`) in BOTH light and dark themes — no regressions, especially in entry CRUD, copy-paste, working-hours toggle, ArbZG warnings, AI assistant, Outlook import (SC-007). Use a Playwright fixture to set the theme via `localStorage` before each test in a "dark" project, mirror the existing project for "light".
- [ ] T019 [P] Manually walk every quickstart scenario S1–S14 on desktop and on mobile (`< 768 px`); check the dev-tools console for errors (must be zero).
- [ ] T020 [P] Visual audit: take screenshots of every surface listed in FR-005 in BOTH themes (calendar grid, time entries, app header, entry-form modal, chatbot panel, docs panel, ArbZG banner, error banner, version display, settings form). Inspect contrast (SC-003).
- [ ] T021 [P] Verify SC-002 timing: from `change` event on the Dark radio to the page background actually being dark, < 300 ms.
- [ ] T022 [P] Verify SC-004: with theme = dark stored, run a Playwright `page.goto` with a `route` that delays all stylesheets by 1 s, then assert the document background was dark from frame 0 (not light then dark).
- [ ] T023 Resolve open question 1 (toggle UI): document the chosen control style in this file or in the PR description.
- [ ] T024 Resolve open question 3 (FC dark-skin depth): document which FC variables ended up overridden, and whether any per-class overrides were needed.
- [ ] T025 Update BACKLOG.md row for 030: `plan ✅`, `tasks ✅`, status `tasks done — ready for implement`.

---

## Dependencies

- T001/T002 [P]: parallel.
- T003 (i18n) is independent and `[P]`.
- T004→T005→T006→T007: sequential TDD chain for `js/theme.js`.
- T008 (HTML bootstrap) depends on a stable storage key (T006).
- T009/T010 (audit) precede T011/T012 (so dark variant has all tokens to override).
- T011/T012 depend on T009/T010.
- T013/T014 (Settings UI) depend on T003 (i18n) and T006 (theme.js).
- T015→T016 (Playwright) depend on T008–T014.
- Polish (T017–T025) runs after T016.

## Parallel Execution Opportunities

- **Setup [P]**: T001, T002.
- **i18n [P]**: T003 can run any time during T004–T012.
- **CSS audit & migration [P]**: T009 and T010 can run in parallel (different file scopes — CSS vs JS/HTML).
- **Polish [P]**: T017, T018, T019, T020, T021, T022 fully parallel.

## Implementation Strategy

- **MVP scope** = US1 (the only story). Phase 3 deliverables are the shipping feature.
- **Incremental commits**:
  - (a) i18n + scaffolds (T001–T003)
  - (b) `js/theme.js` TDD (T004–T007)
  - (c) `<head>` bootstrap + CSS migration + dark variant (T008–T012)
  - (d) Settings UI (T013–T014)
  - (e) Playwright (T015–T016)
  - (f) Polish & visual audit (T017–T025)

## Format Validation

All 25 tasks above use the canonical `- [ ] Tnnn [P?] [Story?] description with file path` checklist format. Setup/Foundational/Polish tasks have no story label; Phase-3 tasks carry `[US1]`.

## Open Questions Carry-Over

The 4 open questions in plan.md remain as documentation tasks (T023, T024). Q4 (031 dependency) is resolved by the cross-feature contract documented in data-model.md.

## Note for feature 031

This feature freezes the cross-feature contract that 031 inherits (see data-model.md §"Cross-feature contract"). 031's plan must NOT add a parallel persistence key, parallel toggle UI, or rename any of the 10 baseline color tokens.
