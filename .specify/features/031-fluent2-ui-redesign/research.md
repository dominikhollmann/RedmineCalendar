# Research: Fluent 2 UI Redesign with Corporate Identity

**Feature**: 031-fluent2-ui-redesign
**Date**: 2026-05-10
**Phase**: 0 (Outline & Research)

This feature is a coordinated re-skin layered on the design infrastructure that feature 030 ships. The "research" maps the Fluent 2 token surface we adopt, the CI overlay mechanism, and the visual-baselining strategy.

---

## R1 — Fluent 2 token surface (curated subset)

**Decision**: adopt a curated ~30-token subset of Fluent 2's design language. Group into:

- **Color (neutral ramp)**: `--neutral-foreground-1`, `--neutral-foreground-2`, `--neutral-background-1` … `--neutral-background-5`, `--neutral-stroke-1`, `--neutral-stroke-2`. Light values per Fluent 2's "neutral lighter" scale; dark values per "neutral darker".
- **Color (semantic)**: `--brand-primary` (= `--ci-primary` ?? Fluent default `#0F6CBD`), `--accent`, `--success`, `--warning`, `--danger`. Each maps to or replaces 030's existing token.
- **Type scale**: `--font-base-size` (14 px), `--font-base-line-height` (20 px), `--font-large` (16 px / 22 px), `--font-title` (20 px / 28 px), `--font-display` (28 px / 36 px). Aligns with Fluent 2's "Caption 1 / Body 1 / Subtitle 1 / Title 1" tiers.
- **Spacing**: `--space-1` (4 px), `--space-2` (8 px), `--space-3` (12 px), `--space-4` (16 px), `--space-5` (20 px), `--space-6` (24 px), `--space-8` (32 px). Aligns with Fluent 2's 4-px rhythm.
- **Radii**: `--radius-small` (2 px), `--radius-medium` (4 px), `--radius-large` (8 px). Aligns with Fluent 2's "Corner Radius Small / Medium / Large".
- **Elevation / shadow**: `--shadow-2`, `--shadow-4`, `--shadow-8` (depth 2 / 4 / 8). The existing `:root` already has shadow tokens; remap.
- **Motion**: `--duration-fast` (100 ms), `--duration-normal` (200 ms), `--duration-slow` (300 ms); `--curve-decelerate-mid` (`cubic-bezier(0.1, 0.9, 0.2, 1)`).

**Rationale**:
- Adopting a curated subset (not the full Fluent catalog) keeps Principle IV (Simplicity & YAGNI) intact. The list above covers everything the existing UI actually uses.
- Naming follows Fluent 2's own conventions so future expansion is mechanical.
- 030's 10 baseline tokens are preserved (per the cross-feature contract); they may be redefined to point at Fluent neutrals (e.g., `--color-bg: var(--neutral-background-1)`) rather than removed.

**Mapping from 030's contract → Fluent tokens** (informative):

| 030 token | Bound to (light) | Bound to (dark) |
|---|---|---|
| `--color-bg` | `var(--neutral-background-1)` | `var(--neutral-background-1)` (via `[data-theme="dark"]` override) |
| `--color-surface` | `var(--neutral-background-2)` | `var(--neutral-background-2)` |
| `--color-border` | `var(--neutral-stroke-1)` | `var(--neutral-stroke-1)` |
| `--color-text` | `var(--neutral-foreground-1)` | `var(--neutral-foreground-1)` |
| `--color-muted` | `var(--neutral-foreground-2)` | `var(--neutral-foreground-2)` |
| `--color-primary` | `var(--brand-primary)` | `var(--brand-primary)` |
| `--color-danger` | `var(--danger)` | `var(--danger)` |
| `--color-success` | `var(--success)` | `var(--success)` |
| `--color-unknown-bg` | `var(--warning-background)` | `var(--warning-background)` |
| `--color-unknown-bd` | `var(--warning)` | `var(--warning)` |

**Alternatives considered**:
- **Adopt the full Fluent token catalog**: rejected — Principle IV. The vast majority of Fluent tokens are unused by this app.
- **Roll a custom design system instead of Fluent 2**: rejected — the spec explicitly chose Fluent 2.

---

## R2 — Corporate-identity overlay strategy

**Decision**: introduce three new variables on `:root`:

- `--ci-primary` (mirrors `brandPrimary`)
- `--ci-accent` (mirrors `brandAccent`)
- `--ci-font-family` (mirrors `brandFontFamily`)

Design-system rules use a fallback pattern:

```css
.button-primary {
  background: var(--ci-primary, var(--brand-primary));
}
body {
  font-family: var(--ci-font-family, var(--font-base-family));
}
```

When the admin sets a value, CI wins. When unset, design-system defaults survive — exactly the FR-006 behaviour ("falls back to a sensible neutral default").

The logo is rendered via a `<img class="brand-logo" alt="">` element inside the app header. `js/branding.js` sets `src` from `brandLogoUrl` and `hidden` when missing.

**Rationale**:
- One-line fallback per rule; no JS branching to know whether CI is set.
- Layered: design-system tokens live underneath; CI is a thin top layer; theme variant affects both layers symmetrically.
- The pattern is tested in `tests/unit/branding.test.js` for idempotency.

**Alternatives considered**:
- **Two parallel variable sets (one CI, one design-system)**: rejected — doubles the surface, makes refactors expensive.
- **JavaScript-pushed inline styles**: rejected — fights the cascade and breaks focus/hover states.

---

## R3 — Logo strategy

**Decision**: the app header in `index.html` and `settings.html` already has (or gains) `<img class="brand-logo" alt="" hidden>`. `js/branding.js`'s `applyCorporateIdentity({ brandLogoUrl, ... })` does:

```js
const logo = document.querySelector('.brand-logo');
if (brandLogoUrl) {
  logo.src = brandLogoUrl;
  logo.hidden = false;
} else {
  logo.removeAttribute('src');
  logo.hidden = true;
}
```

`alt=""` (empty) marks the logo as decorative for screen readers (the app already has its name in a sibling element). If a deploying organization wants a non-empty alt, that's a follow-up.

**Rationale**:
- Avoids `innerHTML` and any XSS risk.
- The `hidden` attribute uses the platform's native semantic + visual hide.

**Alternatives considered**:
- **Render the logo as a CSS `background-image: url(...)` on a div**: rejected — cannot set `alt` for accessibility; CSP `img-src` restrictions apply identically.

---

## R4 — Validation

**Decision** for `applyCorporateIdentity({ brandPrimary, brandAccent, brandLogoUrl, brandFontFamily })`:

| Field | Validation | On invalid |
|---|---|---|
| `brandPrimary` | `/^#[0-9a-fA-F]{3,8}$/` | log warning once; do NOT set `--ci-primary`. |
| `brandAccent` | same regex | same |
| `brandLogoUrl` | must be a string starting with `https://` (HTTPS-only per Constitution Principle V); reject `javascript:` / `data:` | log warning once; logo stays hidden |
| `brandFontFamily` | must be a non-empty string ≤ 200 chars; matches `/^[\w\s,'"-]+$/` (CSS font-family safe characters) | log warning once; do NOT set `--ci-font-family` |

The validation is intentionally strict — admin-supplied values are still untrusted data per Constitution Principle V.

**Rationale**:
- Hex regex prevents CSS injection (`background: red; --evil:`).
- HTTPS-only URL prevents `javascript:` URLs in `<img src>` (which most browsers ignore but still — defensive).
- Font-family regex prevents `font-family: 'foo'; @import url(evil.css);` style escapes.

---

## R5 — FullCalendar restyling

**Decision**: build on 030's FC variable overrides. 031 introduces a Fluent-2-aligned mapping for FC tokens (e.g., `--fc-event-bg-color: var(--brand-primary)`) and applies them in both the light and dark variants. No new FC override sheet.

**Rationale**: 030 already proved the pattern works. 031 just extends the variable values; the integration is unchanged.

---

## R6 — Visual baseline strategy

**Decision**: introduce `tests/ui/visual.spec.js` with `toHaveScreenshot()` assertions. Baselines are captured per surface × per theme × per CI-state (set vs empty). Baselines live under `tests/ui/__screenshots__/visual.spec.js-snapshots/`. Pixel-drift tolerance is `maxDiffPixelRatio: 0.02` to handle font-rendering differences across CI runners.

**Surfaces baselined** (≥ 12):
1. Calendar week view, light, CI empty
2. Calendar week view, dark, CI empty
3. Calendar week view, light, CI set
4. Calendar week view, dark, CI set
5. Settings page, light, CI empty
6. Settings page, dark, CI set
7. Entry-form modal (open over calendar), light
8. Entry-form modal, dark
9. Chatbot panel (open), light
10. Docs panel (open), dark
11. ArbZG warning banner visible, light
12. Mobile (`< 768 px`) calendar, dark, CI set

**Rationale**:
- Visual changes need visual tests; functional Playwright tests don't catch theme regressions.
- Per-CI baseline catches the "CI isn't applied at all" regression class.

**Alternatives considered**:
- **Manual visual review only**: rejected — doesn't scale and misses regressions during refactors.
- **`pixelmatch` outside Playwright**: rejected — Playwright's built-in is sufficient and already wired up via 009.

---

## R7 — i18n keys

**Decision**: introduce one new key, `branding.logoAlt`, EN+DE, used as the alt text for the brand logo when admins want a non-empty alt. Default value (when admin does not set) is empty string (decorative).

| Key | EN | DE |
|---|---|---|
| `branding.logoAlt` | (empty by default — admin override) | (empty by default — admin override) |

**Rationale**:
- The bulk of this feature is visual, not textual; very few new strings.
- Settings UI inherited from 030 already has all the theme-toggle strings.

---

## Outcome

All Phase 0 unknowns resolved. Ready for Phase 1 design (data-model, quickstart).
