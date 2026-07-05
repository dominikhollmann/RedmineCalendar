# Phase 0 Research: Settings Page Redesign

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION`.

## R1 — Token system: reuse vs. parallel set

**Decision**: Reuse the existing Fluent 2 token system in `css/base.css` (Feature 031). Map every README token to an existing `--neutral-*`/`--color-*`/semantic token (see plan D1 mapping table). Add only genuinely-new component tokens (`--neutral-stroke-strong`, `--nav-active-bg`, switch thumb/border, status dots, reorder grip).

**Rationale**: The README values are byte-identical to the existing tokens except the accent. A second token set would violate Reuse-First (Constitution VII), trip `dup:check`, and contradict Feature 052 (route everything through central tokens). Mapping keeps one source of truth and automatic CI-overlay propagation.

**Alternatives rejected**: (a) Drop the README tokens verbatim into `css/settings.css` — creates two competing systems, breaks dark mode/CI overlay for the new surface. (b) Rename existing tokens to README names — massive churn across all CSS for zero benefit.

## R2 — Accent color delivery

**Decision**: Purple is applied only via `config.json brandPrimary` → `js/branding.js` → `--ci-primary` → `--color-primary`. Blue `#0f6cbd` stays the code default. No purple literal in tokens.

**Rationale**: Brand color is already admin-configurable and validated (`isValidHex`) in `branding.js`. Keeps the accent reversible per deployment and avoids baking a corporate choice into shared tokens.

**Alternatives rejected**: Hardcode purple as the new `--brand-primary` default (changes the whole app's accent, not just Settings; not reversible per deployment) — see the AskUserQuestion decision.

## R3 — Dark-mode contrast with a dark CI accent

**Decision**: In `:root[data-theme='dark']`, lighten link + focus tokens derived from the accent via `color-mix(in srgb, var(--color-primary) ~55%, white)`. Verify with axe-core dark scans + an explicit contrast test using a `brandPrimary: '#6c2bd9'` config fixture.

**Rationale**: `--ci-primary` is a single value with no dark variant; a dark purple on `#1f1f1f` falls below WCAG 3:1 for links/focus. `color-mix` lightening keeps ≥3:1 without a second config field. White-text-on-brand-background buttons already pass, so only link/focus need the safeguard.

**Alternatives rejected**: (a) Add a `brandPrimaryDark` config field — more admin surface, more validation, YAGNI for now. (b) Force a fixed light focus ring in dark — loses brand identity and may clash with non-purple CI.

## R4 — Connection verification call

**Decision**: "Verbinden" runs `getCurrentUser()` (`js/redmine-api.js`, `GET /users/current.json`). Success → `connected`; failure mapped to `invalid` (401/403), `network` (fetch/TypeError), or `server` (5xx) using the existing `RedmineError` shape.

**Rationale**: `getCurrentUser()` already exists and is the canonical credential-verification endpoint ("Verify credentials and return current user info"). No new API surface; satisfies Constitution I.

**Alternatives rejected**: A dedicated ping endpoint (none exists; would add API surface). Reusing the old save-button silent write (no real verification, the very gap US3 fixes).

## R5 — Connection state machine location & testability

**Decision**: Implement the state machine as a DOM-light core in `js/settings-connection.js` (pure transitions + error mapping, unit-tested) with a thin DOM binder (pill, button busy/`aria-busy`, hint, footer enable) wired from `settings-page.js`. Editing any credential field while `connected` transitions to `disconnected` and shows the reconnect hint.

**Rationale**: Pure transition logic is node-unit-testable (Constitution III, CLAUDE.md decision rule #1). The DOM binder stays Playwright-covered.

**Alternatives rejected**: Inline everything in `settings-page.js` — untestable without a browser and pushes the orchestrator over the 600-LOC/60-LOC caps.

## R6 — Source reorder: dual modality (#274, WCAG 2.5.7)

**Decision**: Pure ordering in `js/source-order.js` (move-up/down, drag-index reorder, read/write `STORAGE_KEY_PLANNING_SOURCE_ORDER`). UI in `js/settings-sources.js`: HTML5 native row drag (desktop) + grip `<button>` keyboard grab (Space/Enter) → ↑/↓ move (focus retained) → drop (Space/Esc); up/down arrow buttons (mobile, disabled at ends). Every move updates position badges and announces via a visually-hidden `role="status"` `aria-live="polite"` region.

**Rationale**: Two non-pointer paths satisfy SC 2.5.7 and the 44px mobile target rule. HTML5 drag doesn't work on touch, so arrow buttons double as the mobile a11y fallback. Pure ordering is node-unit-testable; DnD/keyboard glue is Playwright-tested.

**Alternatives rejected**: A drag library (new dependency, against build-free constraint). Pointer-only drag (fails SC 2.5.7 and the axe gate).

## R7 — Applying source order to the app

**Decision**: New key `redmine_calendar_planning_source_order` = JSON array of source ids, default `["outlook","teams"]`. `js/planning-view.js` reads it where columns/headers are assembled (currently hardcoded `[bookings, outlook, teams]` near L521/L552): bookings column stays first; the outlook/teams columns and their headers are emitted in stored order. Reordering dispatches the existing `planning:sources-changed` event so the view re-renders.

**Rationale**: Minimal, localized change at the single assembly site; reuses the existing change-event channel. Backwards compatible (absent key → default order).

**Alternatives rejected**: Per-source numeric order keys (harder to keep contiguous/consistent than one ordered array). Re-architecting planning-view column model (out of scope; YAGNI).

## R8 — Theme control on the settings page

**Decision**: Remove the `settingDarkMode` checkbox row; add a header theme-toggle button reusing `theme.js` (`getTheme`/`setTheme`/`applyTheme`/`subscribeOnChange`). Keep the first-paint inline theme script in `settings.html`. Honor `prefers-color-scheme` on first load (existing behavior), persist the explicit toggle.

**Rationale**: Matches the design ("only dark-mode control is the header toggle") and the calendar page's pattern; avoids a redundant settings row.

**Alternatives rejected**: Keep both (duplicate control, contradicts the design and adds a needless settings row).

## R9 — Controls: hand-built vs. Fluent UI Web Components

**Decision**: Hand-built controls styled with the existing tokens. No `@fluentui/web-components`.

**Rationale**: Build-free, no new runtime dependency, no new OSS/SBoM/license entries. The prototype's hand-built controls are a complete reference and axe-core is achievable with semantic vanilla markup (`role="switch"`, `role="group"`, native checkboxes/inputs).

**Alternatives rejected**: Adopt Fluent Web Components (new CDN dependency, SBoM/license-gate churn, against YAGNI/Simplicity).

## R10 — Responsive + scroll-spy mechanics

**Decision**: Single `isMobile` flag at 640px, re-evaluated on resize. Scroll-spy threshold `scrollY + 140` (desktop) / `+120` (mobile). Mobile active chip centered via a manual `scrollTo({left, behavior:'auto'})` on the chip container (NOT `element.scrollIntoView()` which scrolls the page vertically; NOT `behavior:'smooth'` on the container — unreliable). Section click scrolls with offset −96 (desktop) / −104 (mobile).

**Rationale**: Directly from the README's validated prototype behavior; avoids known scroll pitfalls.

**Alternatives rejected**: `IntersectionObserver`-only scroll-spy (viable but the prototype's threshold approach is the validated reference; either is acceptable — implementer may use IO if it passes the same UAT, but must keep the manual chip scroll).
