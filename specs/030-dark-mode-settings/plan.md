# Implementation Plan: Dark Mode (Settings-Only Toggle)

**Branch**: `030-dark-mode-settings` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.specify/features/030-dark-mode-settings/spec.md`

## Summary

Add a strict light/dark theme toggle on the Settings page only (no toolbar shortcut). Persist the choice in `localStorage`, apply it on first paint via an inline `<script>` in `<head>` to prevent flash, and switch live without reload when toggled. Theming uses CSS custom properties scoped under `:root` (light) and `:root[data-theme="dark"]` (dark). The codebase already declares ~9 color tokens; the work is to (a) finish migrating hard-coded color literals to those tokens, (b) define the dark variant of every token, and (c) wire the toggle. No "auto / follow system" mode in v1.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)
**Primary Dependencies**: existing CSS variables in `css/style.css`; no new deps
**Storage**: `localStorage` — new key `redmine_calendar_theme` (`'light'` | `'dark'`)
**Testing**: Vitest (unit — `getTheme()` / `setTheme()` / `applyTheme(root)` pure helpers); Playwright (UI — toggle on Settings, live switch, persistence across reload, no-flash on first paint, no toolbar control, all surfaces readable)
**Target Platform**: modern desktop + mobile browsers; both visible per FR-005
**Project Type**: static SPA (single project)
**Performance Goals**: theme application within 300 ms of toggle (SC-002); zero flash of wrong theme (SC-004)
**Constraints**: must NOT regress any existing user-visible behaviour (SC-007); toolbar must remain unchanged (SC-006); first-time users see light (FR-006)
**Scale/Scope**: ~1 new module (`js/theme.js`), ~1 inline `<head>` script in both `index.html` and `settings.html`, ~1 new control in `settings.html`, ~50 LOC of new CSS for the dark variant, an audit-and-migrate sweep of hard-coded color literals across `css/style.css`, ~4 i18n keys, ~2 unit-test files, ~1 Playwright spec.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle            | Status  | Notes                                                                                                                                                                       |
| --- | -------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Redmine API Contract | ✅ N/A  | No API interaction.                                                                                                                                                         |
| II  | Calendar-First UX    | ✅ Pass | Mobile in scope per FR-005; theme application < 300 ms (SC-002); calendar usability unchanged.                                                                              |
| III | Test-First           | ✅ Pass | Pure helpers (`getTheme`, `setTheme`, `applyTheme`) are Vitest-covered. UI flows (Settings toggle, live switch, persistence, no-flash) covered by Playwright. TDD enforced. |
| IV  | Simplicity & YAGNI   | ✅ Pass | No new dependency. CSS-variable approach is the smallest possible. No "auto" mode (out of scope per spec).                                                                  |
| V   | Security by Default  | ✅ N/A  | No new credentials. The inline `<head>` script reads `localStorage` and sets a data attribute — no untrusted-data injection. The script is short and CSP-safe (no `eval`).  |

No violations. Complexity Tracking section remains empty.

## Project Structure

### Documentation (this feature)

```text
.specify/features/030-dark-mode-settings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/                   # (empty — internal feature, no external interfaces)
└── tasks.md
```

### Source Code (repository root)

```text
js/
├── theme.js                     # NEW — pure helpers: getTheme(): 'light'|'dark'; setTheme(theme): void; applyTheme(root, theme): void; subscribeOnChange(listener). Reads/writes localStorage key redmine_calendar_theme.
├── settings.js                  # MODIFY — wire the new theme select to setTheme(); call applyTheme(document.documentElement, theme) on change.
└── i18n.js                      # MODIFY — add EN+DE keys for 'settings.theme.heading', 'settings.theme.light', 'settings.theme.dark', 'settings.theme.hint'.

index.html, settings.html        # MODIFY — both pages get an inline <head> bootstrap script that runs BEFORE any other module; reads localStorage; applies data-theme to documentElement (FR-008, SC-004).
                                 # settings.html also gets the new theme control (radio group or <select>) inside the existing settings form.

css/
└── style.css                    # MODIFY — (a) audit/migrate hard-coded colors to CSS variables; (b) add a :root[data-theme="dark"] block overriding every color variable; (c) ensure focus states, modal backdrops, and FullCalendar-overridden classes work in both themes.

tests/
├── unit/
│   └── theme.test.js            # NEW — Vitest: getTheme returns 'light' default, setTheme persists, applyTheme writes the data attribute, subscribeOnChange fires on writes, invalid stored values fall back to 'light'.
└── ui/
    └── theme.spec.js            # NEW — Playwright: Settings toggle visible; selecting dark immediately re-styles Settings; navigating to calendar shows dark; reload preserves; no-flash assertion on first paint with dark stored; toolbar has no theme control; all listed FR-005 surfaces are readable in dark (smoke screenshots).
```

**Structure Decision**: Single-project SPA. The pure helper module (`js/theme.js`) keeps storage + apply logic in one place. The inline `<head>` bootstrap script is duplicated across `index.html` and `settings.html` — duplication is acceptable here because the script is tiny (~5 lines) and pulling it into a separate file would defeat the purpose (it has to load before paint, before any module-script).

## Phase 0 Output → research.md

Resolves the touch-points needed for design:

1. **No-flash technique**: an inline `<script>` in `<head>`, before any external CSS or JS, reads `localStorage.getItem('redmine_calendar_theme')` and sets `document.documentElement.dataset.theme`. Browser repaints with the right CSS already cascading. No async, no module imports — has to be inline to run before paint.
2. **Theming primitive**: CSS custom properties already in use at `css/style.css:6–14`; light values stay in `:root`, dark variant lives under `:root[data-theme="dark"]`. No need for a class-based switcher.
3. **Existing color-token coverage**: 9 tokens declared. An audit pass identifies the small number of hard-coded literal colors (e.g., `#7f1d1d` at line 59) that need migration before the dark variant works.
4. **FullCalendar internals**: FC v6 uses its own CSS variables; a small set of override rules under `:root[data-theme="dark"]` re-skins the FC grid, headers, and event blocks.
5. **Modal re-styling on switch**: because the theme is applied via a CSS variable cascade on the root, any open modal automatically inherits the new colors — no JS push needed (FR-010).

## Phase 1 Output → data-model.md, quickstart.md, contracts/

- **data-model.md**: documents the `Theme` value (`'light' | 'dark'`) and the `redmine_calendar_theme` localStorage key.
- **quickstart.md**: step-by-step UAT covering the 7 acceptance scenarios + 6 edge cases.
- **contracts/**: empty directory with a README explaining "no external interfaces — purely visual feature".

## Open Questions

(Per user instruction: collected here rather than asked interactively.)

1. **Toggle UI**: radio buttons (`<input type="radio">`) vs `<select>` vs a custom switch. Plan A is a radio group (a11y-friendly, two clear options, matches the rest of Settings). Resolved during implementation if the radio group disagrees with Settings' visual style.
2. **Audit scope for hard-coded colors**: the migration sweep is bounded by `css/style.css`. Inline `style=` attributes in HTML or JS-set colors (if any) are located via `git grep` and migrated. Tracked as concrete tasks (T010/T011) in tasks.md.
3. **FullCalendar dark skin**: depending on how FC v6's internal CSS variables work, we may need a thin `[data-theme="dark"] .fc-theme-standard` block or a more invasive override sheet. Discovered during implementation; bounded.
4. **Feature 031 dependency direction**: 030 ships first per 031's spec. 031 inherits this toggle and re-skins both variants on Fluent 2 + corporate identity. 030 must define a stable contract (`data-theme="dark"` attribute on `<html>`, plus the documented variable list) so 031 can re-skin without re-architecting.

## Complexity Tracking

_No Constitution violations — no entries._
