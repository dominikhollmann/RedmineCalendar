# Data Model: Dark Mode (Settings-Only Toggle)

**Feature**: 030-dark-mode-settings
**Date**: 2026-05-10
**Phase**: 1 (Design & Contracts)

This feature introduces **one persistent value** and **no new entity types**.

---

## Persistent storage

| Key                      | Type                       | Default                             | Source                               | Read by                                                                                  | Written by                                                                               |
| ------------------------ | -------------------------- | ----------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `redmine_calendar_theme` | string `'light' \| 'dark'` | `'light'` (when missing or invalid) | `localStorage` (per-browser-profile) | inline `<head>` script in `index.html` and `settings.html`; `js/theme.js`'s `getTheme()` | `js/theme.js`'s `setTheme(theme)` (called from `js/settings.js` when the toggle changes) |

### Validation rules

- Allowed values: exactly `'light'` and `'dark'`. Any other value (missing, empty, garbage) is treated as `'light'` (FR-006).
- The value is read on every page load; no caching beyond `localStorage`.
- Cross-tab synchronization: out of scope for v1 (a `storage` event listener could be added but the spec does not require it).

---

## Module contract: `js/theme.js`

### Public API

```ts
type Theme = 'light' | 'dark';

function getTheme(): Theme;
// Reads localStorage. Returns 'light' if missing or invalid.

function setTheme(theme: Theme): void;
// Writes localStorage AND calls applyTheme(document.documentElement, theme).
// Fires onChange listeners.

function applyTheme(root: HTMLElement, theme: Theme): void;
// Sets root.dataset.theme = (theme === 'dark' ? 'dark' : ''); idempotent.

function subscribeOnChange(listener: (theme: Theme) => void): () => void;
// Returns an unsubscribe fn. Multiple listeners supported.
```

### Invariants

- `getTheme()` is **pure-ish** (reads localStorage but has no other side effects).
- `setTheme(theme)` is the only writer of the localStorage key.
- `applyTheme(root, 'light')` removes the `data-theme` attribute (or sets it to empty string); does NOT set it to `'light'`. This keeps the default-styled HTML simple (no attribute when in default state).
- Listeners fire AFTER the localStorage write and AFTER `applyTheme`.

---

## DOM contract

After `applyTheme(documentElement, 'dark')`:

```html
<html data-theme="dark"></html>
```

After `applyTheme(documentElement, 'light')`:

```html
<html>
  <!-- no data-theme attribute -->
</html>
```

CSS selectors:

```css
:root { --color-bg: #f8fafc; ... }                 /* light, default */
:root[data-theme="dark"] { --color-bg: #0f172a; ... }  /* dark override */
```

---

## State transitions

```
[default light]  ──setTheme('dark')──>  [dark]
[dark]           ──setTheme('light')──> [default light]
```

There are no intermediate states. Live switch (FR-004): `setTheme(...)` updates the attribute synchronously; CSS variables re-cascade; modals re-style automatically (FR-010).

---

## i18n keys

See research.md §R7 — four keys added to `js/i18n.js` (EN + DE). No data-model implications.

---

## Cross-feature contract (for feature 031)

The above is also the **public contract that feature 031 inherits**. 031 is bound by:

- The localStorage key MUST remain `redmine_calendar_theme` with values `'light'`/`'dark'`.
- The DOM signal MUST remain `<html data-theme="dark">` for the dark variant.
- The pure helpers in `js/theme.js` are the supported integration surface; 031 calls `setTheme` from its own UI if it adds variants, NOT a parallel persistence key.
- The 10 color tokens listed in research.md §R2 are the minimum guaranteed set; 031 may ADD tokens but MUST NOT remove or rename these.
