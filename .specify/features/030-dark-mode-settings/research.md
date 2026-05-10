# Research: Dark Mode (Settings-Only Toggle)

**Feature**: 030-dark-mode-settings
**Date**: 2026-05-10
**Phase**: 0 (Outline & Research)

This feature is largely a CSS-variable-and-toggle exercise. The "research" maps the no-flash technique, the existing token coverage, and the integration boundary with feature 031.

---

## R1 — No-flash-on-load technique

**Decision**: an inline `<script>` placed at the top of `<head>`, before any `<link rel="stylesheet">` or module `<script>`, reads `localStorage.getItem('redmine_calendar_theme')`. If the value is `'dark'` it sets `document.documentElement.dataset.theme = 'dark'`. Anything else (missing key, `'light'`, garbage value) leaves the attribute unset → light theme.

**Snippet** (canonical form, ~5 lines):

```html
<head>
  <script>
    try {
      var t = localStorage.getItem('redmine_calendar_theme');
      if (t === 'dark') document.documentElement.dataset.theme = 'dark';
    } catch (e) { /* localStorage unavailable — light theme */ }
  </script>
  <link rel="stylesheet" href="css/style.css">
  ...
</head>
```

**Rationale**:
- The browser parses `<head>` synchronously. Setting `dataset.theme` before the stylesheet loads ensures the variable cascade is correct on first paint (FR-008, SC-004).
- Wrapping in `try/catch` handles environments where `localStorage` is disabled (private browsing on iOS, sandboxed iframes). In those environments the user falls back to light, which is the correct default per FR-006.
- Using `dataset.theme` (= the `data-theme` attribute) means CSS selects with `[data-theme="dark"]`. Cleaner than a class because there's no naming collision risk with FC's internal classes.

**Alternatives considered**:
- **Module-script with `defer`**: rejected — runs after the DOM but before/after styling; not guaranteed to execute before first paint, so causes flash.
- **Server-side rendering with cookie**: rejected — the app is a static SPA; there is no server.
- **`<noscript>` tag for fallback**: rejected — JS-disabled users get the light theme by virtue of `data-theme` not being set, which is fine.
- **`prefers-color-scheme` media query**: rejected — spec explicitly says "no system-preference mode for v1" (FR-006 is "first-time users see light").

---

## R2 — CSS-variable theming primitive

**Decision**: keep all light values in the existing `:root` block (`css/style.css:5–15`). Add a sibling `:root[data-theme="dark"]` block that overrides every variable with its dark equivalent. Because `data-theme` is set on `<html>`, the cascade applies globally and modals/popovers inherit automatically.

**Variable budget** (light → dark):

| Variable | Light | Dark (proposed) |
|---|---|---|
| `--color-primary` | `#3b82f6` | `#60a5fa` |
| `--color-danger` | `#ef4444` | `#f87171` |
| `--color-success` | `#22c55e` | `#4ade80` |
| `--color-bg` | `#f8fafc` | `#0f172a` |
| `--color-surface` | `#ffffff` | `#1e293b` |
| `--color-border` | `#e2e8f0` | `#334155` |
| `--color-text` | `#1e293b` | `#f1f5f9` |
| `--color-muted` | `#64748b` | `#94a3b8` |
| `--color-unknown-bg` | `#fef9c3` | `#3f3a18` |
| `--color-unknown-bd` | `#ca8a04` | `#facc15` |

Exact dark hex values are tunable during implementation — what matters is the contract (every variable has a dark equivalent). Feature 031 may later re-pick these per the corporate-identity palette.

**Rationale**:
- Single declaration block per theme; no JS branching for individual rules; modals and popovers re-style automatically (FR-010).
- Reuses an existing pattern. No new abstraction.

**Alternatives considered**:
- **Class-based switcher (`.theme-dark`)**: works but conflicts mildly with FC class naming; using a data-attribute keeps the namespace tidy.
- **A second stylesheet swapped on toggle**: rejected — causes a brief unstyled flash during the swap; defeats SC-004.

---

## R3 — Hard-coded color literal audit

**Decision**: run `grep -nE '#[0-9a-fA-F]{3,8}' css/style.css` and inspect every match outside the existing `:root` block. Each hit is either (a) a literal that should be migrated to a variable, or (b) a literal whose meaning is theme-agnostic (e.g., a shadow rgba, a logo color we never want to invert).

**Known instance from a quick scan**: `css/style.css:59` uses `#7f1d1d` (dark red for `.btn-retry` text). This should be migrated to a token like `--color-danger-text` or replaced by `var(--color-danger)` on a darker fill.

**Coverage**:
- `js/` files: scan for `style.color = ...`, `el.style = ...`, `\\#[0-9a-f]{3,8}` to find any JS-set colors. Migrate the small set found into CSS classes that resolve via tokens.
- HTML files: scan for inline `style=` attributes setting colors.

**Rationale**:
- Without this audit, the dark variant looks broken on the few surfaces that bypass the variable system. The audit is bounded — the codebase is small.
- Migrating to tokens is also a Principle IV win (centralizes color decisions).

**Alternatives considered**:
- **Skip the audit, ship dark mode as "best effort"**: rejected — fails SC-003 ("contrast and readability checks pass on every interactive surface").

---

## R4 — FullCalendar v6 dark skin

**Decision**: add a small block under `:root[data-theme="dark"]` that overrides FC's own variables (`--fc-border-color`, `--fc-page-bg-color`, `--fc-neutral-bg-color`, `--fc-event-bg-color`, `--fc-event-border-color`, `--fc-event-text-color`, `--fc-today-bg-color`, etc.). FC v6 reads these directly so a token-only block is sufficient.

**Rationale**:
- FC v6 documentation lists its theming variables; targeting them is the supported integration.
- Avoids a custom override sheet that would have to be hand-maintained against FC version bumps.

**Alternatives considered**:
- **Per-class FC override**: rejected — fragile across FC patch releases.

---

## R5 — Modal re-styling on theme switch

**Decision**: no JS push needed. Because the theme attribute is on `<html>` and modals are descendants of `<body>`, the variable cascade applies automatically. FR-010 is satisfied by structure alone.

**Verification**: the Playwright spec opens the entry-form modal, toggles theme via the `setTheme` callable from a test hook, and asserts the modal's `getComputedStyle().backgroundColor` flips immediately.

---

## R6 — Boundary contract for feature 031

**Decision**: this feature freezes the following public contract that 031 will inherit:

1. `<html data-theme="dark">` is the activation signal.
2. The localStorage key is `redmine_calendar_theme` with values `'light'` and `'dark'` (lowercase strings).
3. The pure helpers in `js/theme.js` (`getTheme`, `setTheme`, `applyTheme`, `subscribeOnChange`) are the supported integration surface. 031 must NOT add a parallel persistence key or a parallel toggle UI.
4. The complete set of token names (the 10 listed in §R2) is the contract surface for the design system. 031 may add NEW tokens (Fluent-2-specific) but MUST NOT remove or rename any of these.

**Rationale**:
- 031 explicitly inherits 030 per its FR-010. Without a frozen contract, 031 would risk re-architecting and creating a merge headache.

---

## R7 — i18n keys

**Decision**: add the following keys to `js/i18n.js` in EN+DE:

| Key | EN | DE |
|---|---|---|
| `settings.theme.heading` | `Theme` | `Erscheinungsbild` |
| `settings.theme.light` | `Light` | `Hell` |
| `settings.theme.dark` | `Dark` | `Dunkel` |
| `settings.theme.hint` | `Choose how the app looks. Your choice is saved on this browser only.` | `Wählen Sie das Erscheinungsbild der App. Ihre Wahl wird nur in diesem Browser gespeichert.` |

---

## Outcome

All Phase 0 unknowns resolved. Ready for Phase 1 design (data-model, quickstart).
