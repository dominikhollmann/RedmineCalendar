# Quickstart / UAT: Dark Mode (Settings-Only Toggle)

**Feature**: 030-dark-mode-settings
**Audience**: implementer + tester signing off UAT.
**Phase**: 1 (Design — also used as the script for the Playwright UI test).

---

## Prerequisites

- A working build of the app (no Redmine credentials required for theme tests).
- Two browser profiles for the per-profile-isolation check (S11).

---

## US1 — Switch the App to Dark Mode (P1)

### S1. Find the toggle on Settings (acceptance #1)

1. From the calendar, click the Settings link (gear icon).
2. **Expect**: a localized "Theme" / "Erscheinungsbild" section with two options: Light and Dark, with Light pre-selected (FR-001, FR-006).

### S2. Switching to dark re-styles Settings (acceptance #1, FR-004, SC-002)

1. On Settings, click the Dark option.
2. **Expect**: within 300 ms, the page background turns dark, text becomes light, form fields are readable. No page reload.

### S3. Calendar inherits the theme (acceptance #2)

1. From dark Settings, navigate to the calendar (`index.html`).
2. **Expect**: calendar grid, headers, time entries, app header all use the dark theme. Readable contrast everywhere.

### S4. Modal/panel re-styling (acceptance #3, FR-005, FR-010)

1. In dark mode on the calendar, open the entry form (e.g., click an empty time slot).
2. **Expect**: form modal uses the dark theme.
3. Open the chatbot panel.
4. **Expect**: dark theme.
5. Open the docs panel (if available).
6. **Expect**: dark theme.
7. Trigger an ArbZG warning banner (if any week has one).
8. **Expect**: banner uses dark theme.
9. Trigger an error banner (e.g., disconnect network momentarily and try to refresh).
10. **Expect**: banner uses dark theme.

### S5. Persistence across reload (acceptance #4, FR-002, FR-008, SC-005)

1. With dark active, fully reload the calendar (Cmd-R / F5).
2. **Expect**: dark theme is visible on first paint — no flash of light theme. Inspect the DOM: `<html data-theme="dark">` is present from the moment the page loads.

### S6. No toolbar control (acceptance #5, FR-007, SC-006)

1. On the calendar, inspect the FullCalendar toolbar and the `.app-header`.
2. **Expect**: NO theme toggle, switch, or icon. The toggle exists only on Settings.

### S7. Switch back to light (acceptance #6)

1. Open Settings; select Light.
2. **Expect**: Settings re-styles immediately to light. Navigate back to the calendar — also light. Reload preserves.

### S8. First-time user (acceptance #7, FR-006)

1. Clear `localStorage` (`localStorage.removeItem('redmine_calendar_theme')`).
2. Reload.
3. **Expect**: light theme is shown. The Settings toggle pre-selects Light.

---

## Edge cases

### S9. No flash on first paint (Edge case, SC-004)

1. Set `localStorage.setItem('redmine_calendar_theme', 'dark')` and close the tab.
2. Open a fresh tab and load `index.html` from cold cache.
3. **Expect**: the very first frame is dark. No flicker, no flash. Verified by Playwright with a `page.goto` + `screenshot()` taken before any post-DOMContentLoaded code runs (see test).

### S10. Theme switched while modal is open (FR-010)

1. Open the entry form modal in light mode.
2. Without closing it, switch to dark in another tab (or via `setTheme('dark')` from devtools).
3. **Expect**: the still-open modal re-styles to dark immediately, along with the underlying page. No need to close-reopen.

### S11. Forced colors / OS high-contrast (Edge case)

1. Enable forced-colors mode in the OS / browser (e.g., Windows High Contrast).
2. Open the app.
3. **Expect**: user agent's colors win; the app does not fight them. Some colors may differ from the dark palette — that is correct behaviour.

### S12. Per-browser-profile isolation (Assumption)

1. In Browser Profile A, set theme to dark.
2. Open the app in Browser Profile B (or a private window).
3. **Expect**: Profile B sees light by default — preferences are per-profile localStorage.

### S13. Other settings unaffected (FR-011)

1. With theme = dark, change `weeklyHours`, view mode, day range, and any other setting.
2. **Expect**: no setting interacts with the theme; no setting flips the theme; the theme survives every other change.

### S14. Existing flows still work (SC-007)

1. In dark theme, run through the standard flows: create an entry, edit it, delete it; copy-paste; toggle workweek; trigger an ArbZG warning; ask the AI assistant a question.
2. **Expect**: every flow works identically to light theme. Existing test suites pass with theme = dark.

---

## Sign-off criteria

- All 14 scenarios pass on Chrome desktop AND Chrome mobile-emulation (`< 768 px`).
- Vitest suite for `js/theme.js` passes (≥ 8 cases).
- Playwright spec for this feature passes in CI.
- A visual regression (or manual screenshot review) of the surfaces in S4 shows readable contrast in both themes (SC-003).
- Inline `<head>` script is present in BOTH `index.html` and `settings.html` and runs before any other script (SC-004 verification).
- No `data-theme` attribute appears on `<html>` when theme = light (consistent with the data-model contract).
- No console errors in any scenario.
