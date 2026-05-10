# Data Model: Fluent 2 UI Redesign with Corporate Identity

**Feature**: 031-fluent2-ui-redesign
**Date**: 2026-05-10
**Phase**: 1 (Design & Contracts)

This feature introduces **one new admin-managed config block** and a small set of new CSS variable names. No new per-user persistent settings beyond those provided by feature 030.

---

## Persistent storage

| Key | Type | Owner | Notes |
|---|---|---|---|
| `redmine_calendar_theme` | string | 030 | UNCHANGED — inherited as-is |
| `cfg.brandPrimary` | string (hex) | 031 (admin) | optional |
| `cfg.brandAccent` | string (hex) | 031 (admin) | optional |
| `cfg.brandLogoUrl` | string (https URL) | 031 (admin) | optional |
| `cfg.brandFontFamily` | string (CSS font-family) | 031 (admin) | optional |

No new per-user keys.

---

## `config.json` admin schema (new fields)

```json
{
  "redmineUrl": "...",
  "corsProxyUrl": "...",
  "holidayTicket": 12345,
  "breakTicket": 67890,

  "brandPrimary": "#0F6CBD",
  "brandAccent":  "#1B5BAB",
  "brandLogoUrl": "https://example.com/logo.svg",
  "brandFontFamily": "\"Acme Sans\", \"Segoe UI\", system-ui, sans-serif"
}
```

All four new fields are **optional**. Each falls back independently to a Fluent 2 design-system default when absent or invalid (see research.md §R4 for validation).

### Validation rules (mirror research.md §R4)

| Field | Allowed | Behaviour on invalid |
|---|---|---|
| `brandPrimary`, `brandAccent` | `/^#[0-9a-fA-F]{3,8}$/` | logged warning, default kept |
| `brandLogoUrl` | string starting with `https://`, reject `javascript:` / `data:` | logged warning, logo hidden |
| `brandFontFamily` | non-empty string ≤ 200 chars, `/^[\w\s,'"-]+$/` | logged warning, default kept |

---

## Module contract: `js/branding.js`

```ts
type CorporateIdentity = {
  brandPrimary?: string;
  brandAccent?: string;
  brandLogoUrl?: string;
  brandFontFamily?: string;
};

function applyCorporateIdentity(rootEl: HTMLElement, ci: CorporateIdentity): void;
// Validates each field per R4. For each VALID field, sets a CSS variable on rootEl
// (--ci-primary, --ci-accent, --ci-font-family) and updates the .brand-logo element's
// src/hidden state. INVALID fields are skipped silently (no throw); each invalid
// field logs ONE warning to console.warn.

function isValidCi(ci: CorporateIdentity): boolean;
// Returns true if at least one field is present AND valid; false otherwise.
// Useful for the unit test "ci-fully-empty" path.
```

### Invariants

- `applyCorporateIdentity` is **pure** (other than side effects on `rootEl` and the `.brand-logo` element). No `fetch`, no `localStorage`, no `Date.now`.
- Calling with an empty object clears any previously-set `--ci-*` variables and hides the logo (idempotent reset).
- Validation never throws; invalid fields are skipped gracefully.

---

## CSS variable layering

The variable system is **three layers**:

1. **Fluent 2 token layer** (`:root` block — neutrals, type, spacing, radii, elevation, motion, semantic colors).
2. **030 baseline token layer** (`:root` and `:root[data-theme="dark"]` blocks — the 10 tokens 030 froze, redefined to point at Fluent tokens but keeping the same names).
3. **Corporate-identity overlay** (`:root` block, set at runtime by `applyCorporateIdentity`).

Rules consume the layers via the fallback pattern:

```css
.button-primary {
  /* CI wins; design-system primary is the fallback. */
  background: var(--ci-primary, var(--brand-primary));
}
body {
  font-family: var(--ci-font-family, var(--font-base-family));
}
```

### Cross-feature contract (inherited from 030)

030 froze the following; 031 honours them all:

- `<html data-theme="dark">` is the dark-variant signal.
- `redmine_calendar_theme` is the only persistence key for theme.
- `js/theme.js`'s exports are the only sanctioned theming surface.
- The 10 baseline color tokens are guaranteed present (may be re-bound to Fluent tokens internally).

---

## State transitions

There are no new state transitions. Theme transitions are owned by 030. The CI overlay is set once on page load (after `config.json` is fetched) and effectively never changes during a session — admins update `config.json`, deploy, users reload.

---

## i18n keys

See research.md §R7 — one optional key (`branding.logoAlt`) added to `js/i18n.js`. Default values are empty strings.
