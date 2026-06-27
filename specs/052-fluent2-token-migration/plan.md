# Implementation Plan: Route typography, radii, and modal elevation through design tokens

**Branch**: `052-fluent2-token-migration` (worked on `claude/speckit-specify-issue-271-kjbllg`) | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/052-fluent2-token-migration/spec.md`

## Summary

Migrate every component-level raw literal for **font-size, border-radius, box-shadow, transition-timing, and spacing (padding/margin/gap)** onto the existing Fluent 2 design-token scales in `css/base.css`, adding the minimum new tokens needed (caption-level type sizes, a pill radius, higher-elevation shadows), then enable a `stylelint-declaration-strict-value` gate so future raw literals fail CI — all in one change set so the build is never left red. Fidelity rule: exact-swap where a token already equals the value, else snap to nearest token (small reviewed shifts acceptable). Acceptance is a manual reviewer walkthrough across surfaces × themes × density; no new visual-regression tooling.

## Technical Context

**Language/Version**: CSS3 (custom properties); no JavaScript changes. Config files are JSON (`.stylelintrc.json`, `package.json`, `sbom.json`, `attributions.json`).

**Primary Dependencies**: existing `stylelint` ^17 + `stylelint-config-standard` ^40 (already present). **NEW dev-only**: `stylelint-declaration-strict-value` (the `scale-unlimited/declaration-strict-value` rule from the issue) — MIT-licensed.

**Storage**: N/A (no runtime storage; no localStorage/IndexedDB/config.json behavioral change).

**Testing**: existing Playwright UI suite + `@axe-core/playwright` a11y matrix (regression guard); `npm run lint` (stylelint gate, now extended) as the enforcement proof; a small meta-assertion that a raw literal trips the new rule (red-green for the gate itself); manual reviewer walkthrough for visual acceptance.

**Target Platform**: Static SPA in modern browsers (Chromium/Edge/Firefox/Safari), light + dark themes.

**Project Type**: Single-project static front end (no backend). CSS-only change to `css/*.css` + tooling config.

**Performance Goals**: No change to runtime perf. CSS custom-property indirection has negligible cost; calendar render stays < 300 ms (Constitution II). `npm run lint` adds a few hundred ms.

**Constraints**: Build must be green at completion — gate enabled in the same PR as the cleanup (FR-011). No un-annotated raw literals may remain at use sites (FR-001/003/004/005/008). `sbom.json` + `attributions.json` must be regenerated and `oss:drift` / `oss:licenses` must pass (FR-014).

**Scale/Scope**: ~135 raw `font-size` occurrences (incl. light/dark dupes; the `:root` token block excepted), 5 off-scale radii, modal/panel multi-value shadows, ~3 raw transition timings, ~22 raw spacing values — across 8 component stylesheets (`base.css`, `calendar.css`, `calendar-overlays.css`, `docs.css`, `time-entry.css`, `settings.css`, `feedback.css`, `planning-view.css`). `style.css` has 0 offenders.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                               | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I — Redmine API Contract**            | ✅ N/A. No API calls, no DB access, no credential handling touched. Pure presentation-layer change.                                                                                                                                                                                                                                                                                                                                                       |
| **II — Calendar-First UX**              | ✅ Preserves calendar usability by design — the goal is _no visible change_, verified by manual walkthrough across density levels. CSS-variable indirection does not affect render timing (< 300 ms).                                                                                                                                                                                                                                                     |
| **III — Test-First TDD**                | ✅ Adapted to a CSS/tooling change. No business logic is added. The _enforcement gate_ is the testable artifact: write the strict-value rule + a deliberate raw-literal fixture, confirm `npm run lint` goes **red**, then complete the cleanup to make it **green** (red-green-refactor at the gate level). Existing Playwright + axe suites guard against behavioral/a11y regressions. No new pure-logic JS module → no new Vitest unit suite required. |
| **IV — Simplicity / YAGNI**             | ✅ One new dev-only dependency (`stylelint-declaration-strict-value`), explicitly accepted in the issue, reusing the _existing_ stylelint pipeline rather than building bespoke tooling. New tokens kept to the audited minimum. Rationale recorded in research.md. No Complexity Tracking violation.                                                                                                                                                     |
| **V — Security by Default**             | ✅ No external data, no credentials, no rendered user content, no XSS surface. Dev-only dependency added to `npm audit` / `oss:licenses` scope (MIT).                                                                                                                                                                                                                                                                                                     |
| **VI — Continuous Quality Gates**       | ✅ Extends the existing `npm run lint` gate; keeps SQI ≥ 80 (no JS/scripts size/complexity change — CSS module-size is roughly unchanged; the only LOC delta is a handful of new token lines plus light/dark shadow overrides). `npm audit`, `oss:drift`, `oss:licenses` re-run with the new devDep. The gate makes quality _stricter_, never re-tunes a band to pass.                                                                                    |
| **VII — Reuse Before Reimplementation** | ✅ Reuses the single central token block in `css/base.css` and the existing stylelint mechanism (same `color-no-hex` enforcement pattern, same `/* stylelint-disable-line */` escape hatch). No second variant of any capability; no JS modules added → `knowledge.topics.json` unaffected; `dup:check` baseline unaffected (no token-identical JS clones).                                                                                               |

**Result**: PASS. No violations; Complexity Tracking table omitted (nothing to justify).

### Reuse Audit (Constitution VII)

- **Touched modules**: `css/base.css` (token definitions — add caption/pill/higher-shadow tokens), `css/calendar.css`, `css/calendar-overlays.css`, `css/docs.css`, `css/time-entry.css`, `css/settings.css`, `css/feedback.css`, `css/planning-view.css` (use-site migration), `.stylelintrc.json` (new rule), `package.json` (+ devDep), `sbom.json` + `attributions.json` (regenerated).
- **Reused vs. new**: _Reused_ — the existing `:root` token scales (`--font-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*`), the existing stylelint gate, the existing escape-hatch convention. _New_ — a minimal set of token definitions (caption type sizes, pill radius, `--shadow-16`/`--shadow-28`) and one stylelint rule entry + one devDep. No existing abstraction covers "a token below `--font-base` / above `--shadow-8`", so the new tokens are additive, not duplicative.
- **Parallel capability**: None. No second copy of any pattern is introduced; the central token block remains the single source of truth.

## Project Structure

### Documentation (this feature)

```text
specs/052-fluent2-token-migration/
├── plan.md              # This file
├── research.md          # Phase 0: token-mapping decisions, rule config, new-dep rationale
├── data-model.md        # Phase 1: token additions + literal→token mapping tables
├── quickstart.md        # Phase 1: UAT validation scenarios (checkbox format)
├── contracts/
│   ├── stylelint-rule.contract.md   # The enforcement contract (gated props, ignores, escape hatch)
│   └── design-tokens.contract.md    # The token API: new tokens + their per-theme values
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
css/
├── base.css             # :root token block — ADD caption type token(s), pill radius, --shadow-16/--shadow-28; dark-theme overrides for new shadows
├── calendar.css         # migrate font-size / radius (10px switch track) / shadow / transition / spacing literals
├── calendar-overlays.css# migrate font-size + spacing literals
├── docs.css             # migrate font-size + radius (3px ×2) + shadow + spacing literals
├── time-entry.css       # migrate font-size + shadow + spacing literals
├── settings.css         # migrate font-size + spacing literals
├── feedback.css         # migrate font-size + shadow + spacing literals
├── planning-view.css    # migrate font-size + spacing literals
└── style.css            # no offenders (verify only)

.stylelintrc.json        # ADD scale-unlimited/declaration-strict-value rule (font-size, border-radius, /^transition/, box-shadow, padding, margin, gap)
package.json             # ADD devDependency: stylelint-declaration-strict-value
sbom.json                # regenerated (npm run oss:generate)
attributions.json        # regenerated
```

**Structure Decision**: Single-project static SPA. All changes live in `css/` plus three tooling/config files at repo root and the two generated OSS artifacts. No JS, no HTML, no new directories.

## Phase 0 — Research

See [research.md](./research.md). Resolves: the size→token mapping policy (incl. rem→px reconciliation), how many caption/shadow/radius tokens to add, the exact strict-value rule config (gated properties, `ignoreValues`, `ignoreFunctions`, shorthand handling), the escape-hatch convention, and the new-dependency rationale + OSS regeneration steps. No open NEEDS CLARIFICATION remain (resolved in `/speckit-clarify`).

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md): the new token definitions (name, value, line-height/per-theme variant) and the per-category literal→token mapping tables that drive the migration.
- [contracts/stylelint-rule.contract.md](./contracts/stylelint-rule.contract.md): the enforcement contract — gated property list, allowed values, ignored functions, escape-hatch annotation, and the red→green acceptance behavior.
- [contracts/design-tokens.contract.md](./contracts/design-tokens.contract.md): the token API surface that components consume.
- [quickstart.md](./quickstart.md): runnable + manual validation scenarios in UAT checkbox format.
- Agent context: `CLAUDE.md` Active Feature Plan block updated to point at this plan.

## Complexity Tracking

> No Constitution Check violations — table intentionally empty.
