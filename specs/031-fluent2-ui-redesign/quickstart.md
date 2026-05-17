# Quickstart / UAT: Fluent 2 UI Redesign with Corporate Identity

**Feature**: 031-fluent2-ui-redesign
**Audience**: implementer + tester signing off UAT.
**Phase**: 1 (Design — partially used as the script for the Playwright visual test).

> **Prerequisite**: feature 030 must be merged. The dark-theme toggle and persistence used by US3 are owned by 030.

---

## Prerequisites

- Working build of the app.
- Two `config.json` files at hand:
  - `config-empty-ci.json`: no `brand*` fields set.
  - `config-full-ci.json`: all four `brand*` fields set with realistic values (e.g., `brandPrimary` = `#0F6CBD`, `brandAccent` = `#1B5BAB`, `brandLogoUrl` = a known-good HTTPS PNG/SVG, `brandFontFamily` = `"Segoe UI", system-ui, sans-serif`).
- Browser with dev-tools open for visual inspection.
- Playwright configured with the visual-baseline directory writable.

---

## US1 — Consistent Fluent 2 visual language across all surfaces (P1)

- [x] S1 — Calendar surface uses Fluent 2 spacing/type/elevation
- [x] S2 — Settings surface uses Fluent 2
- [x] S3 — Modals + panels use Fluent 2
- [x] S4 — Light + Dark variant per surface
- [x] S5 — Mobile parity (`< 768 px`)

### S1. Calendar surface uses Fluent 2 spacing/type/elevation

1. Open the calendar (CI empty, light theme).
2. **Expect**: spacing rhythm follows the 4-px scale (gaps between header items, padding inside event blocks). Type sizes match the documented Fluent scale (body 14/20, title 20/28, etc.). Elevation/shadow visible on the modal and the bulk-action toolbar (if 028 is landed).

### S2. Settings surface uses Fluent 2

1. Open Settings (CI empty, light theme).
2. **Expect**: form labels, field paddings, button colors all follow Fluent. The Theme section (introduced in 030) follows the same look.

### S3. Modals + panels use Fluent 2

1. Open the entry-form modal, the chatbot panel, the docs panel.
2. **Expect**: each surface uses Fluent 2 elevation, neutral background, type scale.

### S4. Light + Dark variant per surface

1. For each of S1–S3, switch to dark mode (via the Settings toggle inherited from 030).
2. **Expect**: every surface re-styles to the dark variant of Fluent 2 neutrals while preserving spacing, type, and elevation. No surface left "stuck" in the old theme.

### S5. Mobile parity (`< 768 px`)

1. At viewport 360 × 640, repeat S1–S4.
2. **Expect**: mobile layout uses the same Fluent token values; no surface breaks.

---

## US2 — Corporate-identity overlay (P2)

- [x] S6 — CI primary/accent applied
- [x] S7 — Logo rendered
- [x] S8 — Brand font applied
- [x] S9 — CI invalid values fall back gracefully (R4 validation)
- [x] S10 — CI fully empty path

### S6. CI primary/accent applied

1. Use `config-full-ci.json` (admin-set CI values). Reload.
2. **Expect**: primary action buttons (Save in entry form, Confirm in dialogs) use the `brandPrimary` color. Accent highlights (selected nav item, focused input border) use `brandAccent`.
3. **Expect**: in dark mode, the same CI colors are applied (CI is theme-independent).

### S7. Logo rendered

1. With `config-full-ci.json` (logo URL set), open any page.
2. **Expect**: the `.brand-logo` `<img>` is visible in the app header with the configured logo. Removing the field (revert to `config-empty-ci.json`) → logo hidden.

### S8. Brand font applied

1. With `config-full-ci.json` (font set), reload.
2. **Expect**: `body { font-family }` resolves to the `brandFontFamily` chain. (Inspect in dev-tools to confirm cascade.) If the font is not actually loaded, the chain falls through to `system-ui` → no broken layout.

### S9. CI invalid values fall back gracefully (R4 validation)

1. Set `brandPrimary` to `'red'` (not a hex).
2. Reload, check console.
3. **Expect**: a single `console.warn` line. Primary remains the design-system default. No CSS injection. No layout break.

### S10. CI fully empty path

1. Use `config-empty-ci.json`. Reload.
2. **Expect**: Fluent 2 design-system defaults are used end-to-end. Logo hidden. UI looks like a "neutral" Fluent 2 app.

---

## US3 — Light + Dark variants aligned with the design system (P3)

- [x] S11 — Inherits 030's toggle, no second toggle anywhere
- [x] S12 — Toggling theme re-styles every surface
- [x] S13 — No-flash on first paint (inherited from 030)
- [x] S14 — Persistence (inherited from 030)

### S11. Inherits 030's toggle, no second toggle anywhere

1. Open Settings.
2. **Expect**: exactly ONE theme toggle (the one introduced by 030). 031 has not added a second one.
3. Inspect the calendar toolbar.
4. **Expect**: NO theme controls there.

### S12. Toggling theme re-styles every surface

1. With CI fully set, toggle theme.
2. **Expect**: every Fluent token swaps to its dark variant. CI colors stay constant (theme-independent overlay).

### S13. No-flash on first paint (inherited from 030)

1. Set theme = dark, reload.
2. **Expect**: dark variant visible from frame 0. (This is 030's contract; 031 inherits it.)

### S14. Persistence (inherited from 030)

1. Toggle to dark, close browser, reopen.
2. **Expect**: dark variant active.

---

## Edge cases

- [x] S15 — CI changed at runtime (admin redeploys `config.json`)
- [x] S16 — Logo URL 404s
- [x] S17 — Brand font fails to load
- [x] S18 — SC-007: existing flows still work

### S15. CI changed at runtime (admin redeploys `config.json`)

1. Update `config.json` between reloads (set `brandPrimary` to a new color).
2. Reload the page.
3. **Expect**: new CI value applied. The system does NOT need a service-worker invalidation; a hard reload is sufficient.

### S16. Logo URL 404s

1. Set `brandLogoUrl` to a URL that returns 404.
2. **Expect**: `<img>` natively shows broken-image fallback (browser default); the layout does not break. (The validation only checks the URL syntax, not reachability.) No dev-tools error worse than the natural 404.

### S17. Brand font fails to load

1. Set `brandFontFamily` to a font name that isn't installed and isn't loaded by `@font-face`.
2. **Expect**: `font-family` cascade falls through; UI uses the next fallback (system-ui). No layout break, no broken text.

### S18. SC-007: existing flows still work

1. With CI set + dark theme, run the standard flows: create entry, edit, delete; copy-paste; toggle workweek; ArbZG warnings; AI assistant; Outlook import.
2. **Expect**: every flow works identically to before this feature. Existing functional Playwright suites pass.

---

## Sign-off criteria

- All 18 scenarios pass on desktop (`≥ 1024 px`) AND mobile-emulation (`< 768 px`).
- Vitest unit suite for `js/branding.js` is green (≥ 12 cases — see tasks.md).
- Playwright visual-baseline suite (`tests/ui/visual.spec.js`) is green: ≥ 12 surfaces × 4 (light/dark × CI-empty/CI-set) = ≥ 48 baselined screenshots.
- Existing functional Playwright suites (entry CRUD, copy-paste, working-hours toggle, ArbZG, AI assistant, Outlook import) pass unchanged (SC-007 invariant).
- A reviewer eyeballs the 12 baseline surfaces in light AND dark for contrast/readability.
- No `[NEEDS CLARIFICATION]` markers anywhere in the spec/plan/research/data-model.
- No console errors in any scenario.
