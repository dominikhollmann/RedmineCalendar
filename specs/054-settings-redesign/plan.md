# Implementation Plan: Settings Page Redesign

**Branch**: `054-settings-redesign` | **Date**: 2026-06-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/054-settings-redesign/spec.md`

**Design reference**: `design_handoff_settings_redesign/README.md` (exact tokens, per-component specs, connection state machine, a11y gate, i18n notes, implementation checklist) + `Settings Prototype.dc.html` (clickable reference — NOT ported verbatim; `support.js` NOT ported).

## Summary

Rebuild the Settings page (`settings.html` + `js/settings-page.js`) from a single-column `<form>` with a global save button into a grouped, card-based, responsive Fluent 2 layout with a section nav (desktop rail ↔ mobile chip-bar), instant-apply controls, an explicit status-driven Redmine connection (real `getCurrentUser()` call), reorderable planning sources (#274), a separated danger zone, and a connection-gated sticky footer. Stays vanilla JS/CSS/HTML, reuses the existing Fluent 2 token system, theme provider, i18n layer, credential store, and axe-core gate. The accent stays admin-configurable (purple via `config.json brandPrimary`; blue default in code).

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)

**Primary Dependencies**: None new. FullCalendar v6 (CDN, existing — planning views), MSAL.js v2 (CDN, existing — Outlook). Explicitly NOT adding `@fluentui/web-components` (the README's optional path) — keeps the build-free / OSS-gated stack intact.

**Storage**: `localStorage` (existing keys for prefs + credentials via `js/crypto.js` encrypted store) + one NEW key `redmine_calendar_planning_source_order` (JSON array of source ids). `config.json` read-only (`brandPrimary` etc. via `js/branding.js`). No backend changes.

**Testing**: Vitest (node + jsdom unit) + Playwright (UI, incl. `@axe-core/playwright` gate over 7 surfaces × 2 themes).

**Target Platform**: Modern browsers (desktop + mobile), light + dark theme.

**Project Type**: Static SPA (single web project — no backend/frontend split).

**Performance Goals**: Settings interactions render < 300 ms (Constitution II). Scroll-spy + chip auto-scroll must not jank on scroll.

**Constraints**: WCAG 2.2 AA via axe-core (hard CI gate); SQI composite ≥ 80; module size hard cap 600 effective LOC; `max-lines-per-function` 60 on `js/**`; colors only via `var()` (stylelint `color-no-hex`/`color-named`/`function-disallowed-list`); all UI strings via `t()`; `dup:check` baseline ratchet; `knowledge:check` coverage for new modules.

**Scale/Scope**: One screen, five sections, ~2 planning sources (extensible), two themes, one breakpoint (640px).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Redmine API Contract** — PASS. Connection check reuses `getCurrentUser()` (`/users/current.json`) via the existing REST client; credentials stay encrypted at rest. No new API surface.
- **II. Calendar-First UX** — PASS. Settings feeds the calendar (source order drives planning columns; connection gates app entry). Interactions target < 300 ms.
- **III. Test-First** — PLANNED. Reorder logic and connection state machine are extracted as DOM-light modules with unit tests written first (Red→Green). UI flows (drag, keyboard reorder, state machine, gating, a11y) covered by Playwright.
- **IV. Simplicity & YAGNI** — PASS. No framework, no new dependency. Reuses theme/i18n/branding/credential/redmine-api modules. One new storage key. Hand-built controls over a component library (justified: build-free constraint).
- **V. Security by Default** — PASS. Credentials remain in the encrypted store; show/hide key is view-only; no plaintext persistence; HTTPS-only Redmine target unchanged.
- **VI. Continuous Quality Gates** — PLANNED. New modules sized < 500 LOC, functions ≤ 60 LOC; `knowledge.topics.json` updated; colors via tokens; coverage thresholds met or module stays excluded with rationale.
- **VII. Reuse-First** — PASS. Extend `settings-page.js`/`settings.js`/`config-store.js`/`redmine-api.js`/`outlook.js`/`theme.js`/`branding.js`/i18n rather than fork. Reorder + connection logic are new shared modules (no existing equivalent). Any deliberate duplication recorded in Complexity Tracking (none expected).

**No violations.** Complexity Tracking table left empty.

## Key design decisions (carried from spec FR-022/FR-023 + user agreement)

### D1 — Token unification (no parallel set)

The README token list is a renamed duplicate of the existing Fluent 2 tokens in `css/base.css` (Feature 031). The redesign maps onto the existing tokens; only genuinely-new component tokens are added. Mapping table (README → existing):

| README token              | Light value             | Existing token to use                                           |
| ------------------------- | ----------------------- | --------------------------------------------------------------- |
| `--canvas`                | #f0f0f0                 | `--neutral-background-4`                                        |
| `--card`                  | #ffffff                 | `--color-surface` (`--neutral-background-1`)                    |
| `--cardBorder`            | #e6e6e6                 | `--neutral-background-5`                                        |
| `--rowBg`                 | #fafafa                 | `--neutral-background-2`                                        |
| `--rowBorder`             | #e6e6e6                 | `--neutral-background-5`                                        |
| `--t1/--t2/--t3`          | #242424/#424242/#707070 | `--neutral-foreground-1/2/3`                                    |
| `--stroke`                | #d1d1d1                 | `--neutral-stroke-1`                                            |
| `--strokeStrong`          | #8a8a8a                 | NEW `--neutral-stroke-strong` (Fluent underline-emphasis input) |
| `--inputBg`               | #ffffff                 | `--color-surface`                                               |
| `--brand`                 | #6c2bd9                 | `--color-primary` (admin CI overlay; blue default)              |
| `--brandText`             | #ffffff                 | `--color-on-primary`                                            |
| `--link`                  | #6c2bd9                 | `--color-primary` (see D3 dark safeguard)                       |
| `--navActiveBg`           | #f1eaff                 | NEW `--nav-active-bg` (brand wash via `color-mix`)              |
| `--focus`                 | #6c2bd9                 | `--color-focus-ring` (see D3)                                   |
| `--danger`/`--success*`   | —                       | existing `--danger`/`--success`/`--color-success-*`             |
| `--badgeBg`/`--badgeText` | #ededed/#909090         | `--neutral-background-3` / `--neutral-foreground-3`             |
| `--headerBorder`          | #e0e0e0                 | `--neutral-stroke-2`                                            |
| `--shadow`                | rgba(0,0,0,.07)         | `--shadow-2`                                                    |

**Genuinely new tokens** (added to the central `:root` block in `css/base.css`, light + dark): `--neutral-stroke-strong`, `--nav-active-bg`, switch `--switch-off-border`/`--switch-off-thumb`/`--switch-on-thumb`, status-dot `--status-connected-dot`/`--status-checking-dot`/`--status-disconnected-dot` (mapped to existing success/brand/neutral where possible), `--reorder-grip`. Each via `var()`/`color-mix` so it tracks the CI overlay; raw literals only inside the stylelint-disabled token block.

### D2 — Accent via config only

Purple is set by admins through `config.json brandPrimary: "#6c2bd9"` → `js/branding.js` → `--ci-primary` → `--color-primary`/`--color-primary-bg`. The blue `#0f6cbd` default stays in code. No purple literal in tokens. (`README` "RC" monogram + glyphs are placeholders; reuse existing inline-SVG/icon approach and the admin `brandLogoUrl`.)

### D3 — Dark-mode contrast safeguard for a dark CI accent

`--ci-primary` has no dark variant, so a dark accent (e.g. #6c2bd9 on #1f1f1f) would drop link/focus contrast below the axe-core 3:1 gate. In `:root[data-theme='dark']`, when `--ci-primary` is set, lighten the link/focus tokens, e.g. `--color-focus-ring: color-mix(in srgb, var(--color-primary) 55%, white);` and a matching `--color-link-on-dark`. Verified by the existing axe-core dark-theme scans plus an explicit contrast assertion with a purple CI config fixture (`withConfig({ brandPrimary: '#6c2bd9' })`).

### D4 — Theme toggle moves to the settings header

The current page has a `settingDarkMode` checkbox and no header toggle. The redesign removes the checkbox row and adds the header theme toggle (reusing `theme.js` `getTheme`/`setTheme`/`applyTheme`/`subscribeOnChange`). `settings.theme.dark_mode` label becomes the toggle `aria-label`s. The first-paint inline theme script in `settings.html` stays.

### D5 — Instant-apply + explicit Verbinden

Most prefs already persist on `change` in `settings-page.js`. The redesign removes the global `#save-btn`; the only explicit action is **Verbinden** (auth), the only navigation is **Kalender öffnen** (footer). Credential persistence moves from save-button to the connect flow.

### D6 — Connection state machine (real call)

`disconnected → (Verbinden) → checking → connected | error`; `connected → (edit credentials) → disconnected`. `checking` runs `getCurrentUser()`; map errors to `invalid` / `network` / `server` reasons on the pill/inline. Footer CTA enabled only in `connected`.

### D7 — Source reorder (#274)

New stored order `redmine_calendar_planning_source_order` (default `["outlook","teams"]`). Planning views read it where columns are assembled (`js/planning-view.js` — currently hardcoded `[bookings, outlook, teams]` at ~L521/L552); bookings stays first, the outlook/teams columns follow the stored order. Reorder offered via HTML5 drag + keyboard grab/arrows (desktop) and up/down buttons (mobile); every move announced via `aria-live`. Pure ordering logic lives in a DOM-light, unit-tested module.

## Project Structure

### Documentation (this feature)

```text
specs/054-settings-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions + rationale
├── data-model.md        # Phase 1 — entities, storage keys, state
├── quickstart.md        # Phase 1 — UAT scenarios (checkbox format)
├── contracts/
│   ├── connection-state-machine.md   # states, transitions, error mapping
│   ├── source-reorder.md             # reorder module API + a11y contract
│   └── storage-and-tokens.md         # storage keys + token mapping contract
└── checklists/requirements.md        # (from /specify)
```

### Source Code (repository root)

```text
settings.html                  # MODIFY — card/section/nav/footer markup, header w/ theme+help, remove #save-btn + dark-mode row
css/settings.css               # MODIFY — card shell, section nav (rail + chip-bar), switches, segmented control, status pill, source rows, danger zone, sticky footer, responsive @640px
css/base.css                   # MODIFY — add new component tokens (light+dark) + dark CI link/focus safeguard (D1/D3)
js/settings-page.js            # MODIFY — orchestration: nav/scroll-spy wiring, instant-apply bindings, connection flow, footer gating, danger-zone confirms (keep ≤ size/fn limits — split as below)
js/settings-nav.js             # NEW — section nav + scroll-spy + mobile chip auto-scroll (DOM glue; Playwright-tested)
js/settings-connection.js      # NEW — connection state machine (DOM-light core + thin DOM binder); unit-tested core
js/source-order.js             # NEW — pure ordering logic (move up/down, drag reorder, persistence read/write); unit-tested
js/settings-sources.js         # NEW — source list rendering + drag/keyboard/arrow wiring (DOM glue; Playwright-tested)
js/settings.js                 # MODIFY — credential write moves into connect flow; keep helpers
js/config.js                   # MODIFY — add STORAGE_KEY_PLANNING_SOURCE_ORDER + default
js/planning-view.js            # MODIFY — read source order; order outlook/teams columns + headers accordingly
js/i18n/en.js, js/i18n/de.js   # MODIFY — all new strings (sections, switches, 3 connection states, buttons, hints, aria-labels)
js/knowledge.topics.json       # MODIFY — register new js modules
docs/content.en.md, content.de.md  # MODIFY — settings behavior changes (instant-apply, connect, reorder, danger zone)

tests/unit/source-order.test.js          # NEW — node unit (pure ordering)
tests/unit/settings-connection.test.js   # NEW — node/jsdom unit (state machine, error mapping, invalidate-on-edit)
tests/ui/settings-redesign.spec.js       # NEW — Playwright: nav/scroll-spy, switches instant-apply, segmented control, connect flow, footer gating, drag + keyboard + arrow reorder, danger confirms, mobile layout
tests/ui/axe.spec.js (or existing a11y matrix)  # EXTEND — settings surface, both themes, + purple-CI dark contrast assertion
```

**Structure Decision**: Single static-SPA project (matches the repo). `settings-page.js` stays the orchestrator but delegates to three new focused modules (`settings-nav`, `settings-connection`, `settings-sources`) plus one pure module (`source-order`) to respect the 600-LOC / 60-LOC-per-function caps and to make logic unit-testable per the CLAUDE.md test-layer decision rule. New modules are registered in `knowledge.topics.json` to pass `knowledge:check`.

## Complexity Tracking

> No Constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
