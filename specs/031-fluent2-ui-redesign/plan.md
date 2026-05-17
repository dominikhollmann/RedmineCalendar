# Implementation Plan: Fluent 2 UI Redesign with Corporate Identity

**Branch**: `031-fluent2-ui-redesign` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/031-fluent2-ui-redesign/spec.md`

## Summary

Re-skin the entire app on the **Microsoft Fluent 2** design system, then layer a **corporate-identity overlay** (primary action color, accent, optional logo, optional brand font) sourced from an admin-managed CI block in `config.json`. Both **light and dark** variants ship together, inheriting the toggle and persistence introduced by feature 030. Three user stories. Mobile in scope. Pure visual/structural change — zero new business logic, zero new persistent settings beyond what 030 introduces, one new admin-managed config block.

## Dependency on feature 030

This feature **strictly inherits** the contract frozen by feature 030:

- The DOM signal is `<html data-theme="dark">` (set by 030's inline `<head>` script). 031 MUST NOT add its own bootstrap script for theming.
- The localStorage key is `redmine_calendar_theme`; 031 MUST NOT add a parallel key.
- The pure helpers in `js/theme.js` (`getTheme`, `setTheme`, `applyTheme`, `subscribeOnChange`) are the only sanctioned theming surface.
- 030's 10 baseline color tokens are the **minimum guaranteed set**; 031 MAY add new tokens (Fluent-2-specific neutrals, primaries, semantic colors) but MUST NOT remove or rename any of those 10.

If 030 has not landed when 031 starts implementation, this feature is blocked. Per the spec's FR-010, 030 ships first.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)
**Primary Dependencies**: existing CSS variables from 030; FullCalendar v6 (CDN, existing); no new runtime deps
**Storage**: existing 030 keys; new admin-managed CI block in `config.json` (`brandPrimary`, `brandAccent`, `brandLogoUrl`, `brandFontFamily` — all strings, all optional)
**Testing**: Vitest (unit — `applyCorporateIdentity(root, ci)` pure helper, default-fallback resolution); Playwright (UI — every-surface visual sanity, light + dark + CI overlay, mobile + desktop, regression of all existing flows)
**Target Platform**: modern desktop + mobile browsers; both visible per spec
**Project Type**: static SPA (single project)
**Performance Goals**: visual change must not regress any of the existing 300 ms / 100 ms perceived-rendering budgets (Constitution Principle II); CI overlay applied with the same first-paint guarantee as the theme attribute
**Constraints**: Constitution Principle II's mobile-deferral escape is explicitly **not** invoked (spec.md Assumptions); SC-007 (existing flows continue to work) is the dominant invariant; no new persistent per-user settings; CI is admin-managed only
**Scale/Scope**: this is the largest feature on the backlog by surface area. Plan-level scope: ~1 new module (`js/branding.js`), ~1 modified `<head>` snippet to read CI from `config.json`, ~10 new design-system token additions to `css/style.css`, a comprehensive `css/style.css` audit-and-rebuild on Fluent 2 spacing/type/elevation/motion tokens, every existing surface re-styled in both themes, ~1 Playwright "visual snapshot" per surface, manual visual review.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle            | Status                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Redmine API Contract | ✅ N/A                         | No API interaction.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| II  | Calendar-First UX    | ✅ Pass                        | Mobile in scope (escape clause **not** invoked per spec). All existing perceived-rendering budgets preserved (SC-002 etc.).                                                                                                                                                                                                                                                                                                                        |
| III | Test-First           | ✅ Pass                        | The pure CI-overlay helper is Vitest-covered. The visual surfaces are Playwright-screenshot-asserted with a baseline that ships in this PR. TDD enforced for the helper module; for visual changes, "test-first" means establishing the baseline before re-skinning.                                                                                                                                                                               |
| IV  | Simplicity & YAGNI   | ⚠️ Pass with documented escape | This feature is intrinsically broad (re-skinning every surface). Simplicity is preserved by (a) reusing 030's theming infrastructure unchanged, (b) introducing only one new module (`js/branding.js`), (c) layering CI as a thin overlay on top of design tokens rather than adding a parallel system. The breadth of CSS work is justified by the spec's Primary Need; no new abstractions are introduced. Tracked in Complexity Tracking below. |
| V   | Security by Default  | ✅ Pass                        | The `brandLogoUrl` is rendered via `<img src>` (not `innerHTML`). The `brandFontFamily` is inserted into a `font-family` declaration; CSS validation is the only sanitization needed. The `brandPrimary` / `brandAccent` hex strings are validated as `/^#[0-9a-fA-F]{3,8}$/` before being injected as CSS variable values. All admin-supplied. No untrusted user data.                                                                            |

No hard violations. The "broad CSS surface" is acknowledged in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/031-fluent2-ui-redesign/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/                   # README explaining no external interfaces; documents the config.json CI schema
└── tasks.md
```

### Source Code (repository root)

```text
js/
├── branding.js                  # NEW — pure module: applyCorporateIdentity(rootEl, ci) sets CSS variables for brandPrimary/brandAccent on the root, sets a font-family override, and exposes the logo URL via a data attribute. Validates hex strings; rejects/falls-back-on invalid values.
├── theme.js                     # UNCHANGED (owned by 030)
├── settings.js                  # UNCHANGED (the toggle is inherited from 030)
└── i18n.js                      # MINOR — only if any new user-visible strings appear (e.g., a logo alt-text key)

index.html, settings.html        # MODIFY — apply CI on load via a small inline-after-config-fetch script. Update logo placeholder to render brandLogoUrl when set.

config.json (admin sample)       # DOCUMENT — new keys: brandPrimary, brandAccent, brandLogoUrl, brandFontFamily. All optional. Documented in contracts/README.md.

css/
└── style.css                    # MAJOR REWRITE — adopt Fluent 2 design tokens (color, type scale, spacing rhythm, elevation, motion). Re-skin every surface in light + dark variants. Add CI override hooks (e.g., the brand-primary token is layered on top of the design-system primary).

tests/
├── unit/
│   └── branding.test.js         # NEW — Vitest: applyCorporateIdentity validates hex; falls back on invalid; idempotent; clears overrides when ci is empty.
└── ui/
    └── visual.spec.js           # NEW — Playwright: visual snapshot of every key surface in light + dark + CI-applied + CI-empty (4 combinations × ~12 surfaces). Existing functional Playwright suites continue to run unchanged (SC-007 invariant).
```

**Structure Decision**: Single-project SPA. The CSS work is large but contained to `css/style.css`. The new JS module is small and pure-functional. No new build step, no new dependency.

## Phase 0 Output → research.md

Resolves the design-system and integration touch-points:

1. **Fluent 2 token surface** — which subset of Fluent 2 tokens we adopt (color ramps, neutral palette, type scale, spacing scale, corner radii, elevation/shadow, motion durations & curves). Mapping from 030's 10 tokens → Fluent equivalents.
2. **CI overlay strategy** — `applyCorporateIdentity` writes `--ci-primary` / `--ci-accent` / `--ci-font` to `:root`. The CI fallback lives **inside** the design-system tokens themselves (`--color-primary: var(--ci-primary, var(--brand-primary))`, ditto for `--color-primary-bg`), so every consumer of `--color-primary*` picks up CI automatically — buttons, links, focus rings, FullCalendar event backgrounds, native form controls via `accent-color`. Consumers do NOT need to wrap each property in their own `var(--ci-primary, …)`.
3. **Dark-mode brand-surface contract** — `--color-primary-bg` is a separate token from `--color-primary` because dark mode needs a darker fill (`#115ea3`) to keep white-on-brand text at WCAG AA (≥4.5:1). `--color-primary` stays as the lighter Fluent foreground accent (`#4cc2ff`) for links/borders/icons. Both tokens consume CI when set; CI contrast is the admin's responsibility (regex validation only, not luminance).
4. **Logo strategy** — a `<img class="brand-logo" alt="">` element exists in the header (HTML); JS sets `src` from `brandLogoUrl` and `hidden` when missing.
5. **Hex/font validation** — small regex + a `try/catch` block that logs once and falls back to the design-system default.
6. **FullCalendar restyling** — already established in 030 via the FC variable overrides; 031 builds on that.
7. **Visual baseline strategy** — Playwright `toHaveScreenshot` with per-locale, per-theme, per-CI variants. Baseline images checked into `tests/ui/__screenshots__/`.

## Phase 1 Output → data-model.md, quickstart.md, contracts/

- **data-model.md**: documents the CI block schema and the layered `--ci-*` / `--color-*` variable system.
- **quickstart.md**: step-by-step UAT covering all 3 user stories + edge cases. Includes a CI-fully-set walkthrough and a CI-fully-empty walkthrough.
- **contracts/README.md**: documents the `config.json` CI block — the only "external interface" this feature exposes (admin contract).

## Open Questions

(Per user instruction: collected here.)

1. **Exact Fluent 2 tokens to adopt**: Microsoft publishes a large token catalog. v1 will adopt a curated subset (≤ ~30 tokens) focused on what the existing UI uses. Tracked as a concrete task in tasks.md (T010). The choice is the implementer's judgement bounded by the existing surfaces.
2. **CI fallback behaviour for partial config**: if only `brandPrimary` is set (no accent / logo / font), the rest fall back to design-system defaults independently. Documented in data-model.md.
3. **Brand font loading**: when `brandFontFamily` is set, the implementation declares it in a CSS `font-family` rule but does NOT add `@font-face` loading. Admins must ensure the font is web-available (system font, hosted by the company, or available via a webfont CDN they configure separately). Documented in contracts/README.md.
4. **Visual baselining workflow**: baselines may differ across operating systems / browser versions. The Playwright `visual.spec.js` uses the project's existing CI Linux baseline; macOS dev runs may show diffs and the spec tolerates small pixel drift via `maxDiffPixelRatio`.
5. **Process note carry-over**: the spec's process preference (use Claude UI capabilities for mockups / CSS synthesis) is NOT a functional requirement. The plan does not encode it; the implementer is free to use whatever tooling helps. Tasks remain implementation-tool-agnostic.

## Complexity Tracking

| Violation / Note                         | Why Needed                                                                                                                                                                                       | Simpler Alternative Rejected Because                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Broad CSS rewrite touching every surface | The feature's spec is intrinsically a broad re-skin (US1 P1 requires consistent Fluent 2 across every surface).                                                                                  | A piecemeal re-skin (one surface per PR) was considered but rejected because the spec's "consistent visual language" outcome cannot be partially validated.      |
| One new JS module (`js/branding.js`)     | The CI overlay is admin-supplied untrusted data; it needs validation before being injected into the CSS variable cascade. Centralizing in one pure module is simpler than scattering validation. | Inlining the helper into `js/settings.js` was considered; rejected because the module is loaded by both pages and Settings is per-user-write, not per-page-load. |
