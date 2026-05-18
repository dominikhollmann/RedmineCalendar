# Implementation Plan: SBoM & Open-Source Attributions

**Branch**: `034-sbom-and-attributions` | **Date**: 2026-05-18 | **Spec**: [`spec.md`](spec.md)
**Input**: Feature specification from `specs/034-sbom-and-attributions/spec.md`

## Summary

Ship two visible artifacts (an in-app Open-Source Licenses page reachable from the Settings footer; a CycloneDX 1.6 JSON SBoM attached to every GitHub Release and served at `/sbom.json`) plus two CI gates that keep them honest (a per-PR drift check that regenerates both and diffs against the committed files; a per-PR license-allowlist check covering npm + CDN + vendored channels). Two npm dev-dependencies added (`@cyclonedx/cyclonedx-npm`, `spdx-expression-parse`). One generator script (`scripts/oss-generate.mjs`) produces both committed files in one pass; the drift check is just "regenerate to tmp + diff." The release pipeline blocks on schema-validation failure (FR-020). Everything else — license parsing, allowlist enforcement — runs in vanilla JS over the SBoM the generator already emits, so there's a single source of truth and no second tool to keep in sync.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged
**Primary Dependencies**: FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing). New dev-only: `@cyclonedx/cyclonedx-npm` (OWASP CycloneDX official npm SBoM generator) + `spdx-expression-parse` (SPDX license-expression parser for the allowlist gate — a few-KB, zero-runtime-dep, tens-of-millions-weekly-downloads npm utility maintained by the SPDX TC).
**Storage**: Static files committed at repo root — `sbom.json` (CycloneDX 1.6 JSON, full tree), `attributions.json` (runtime-only projection for the UI), `oss-manifest.json` (hand-maintained inventory of CDN-loaded + vendored open-source code not covered by `package-lock.json`), `oss-allowlist.json` (SPDX allowlist + per-`name@version` exemptions). No new browser storage (no localStorage, no IndexedDB).
**Testing**: Vitest unit tests for the generator (`tests/unit/oss-generate.test.js`), the license allowlist logic, and the SBoM/attributions projection. Playwright UI test for the Settings → Open-Source Licenses navigation and the rendered list (`tests/ui/oss-licenses.spec.js`). Per-file coverage threshold ≥ 95 % (Constitution VI).
**Target Platform**: Browsers (existing target) for the licenses page; Node 20 (existing CI runtime) for the generator + CI gates.
**Project Type**: Static SPA — Option 1 layout (single tree). New page (`licenses.html`) and module (`js/licenses.js`) follow the existing `settings.html` / `js/settings-page.js` pattern. CI gates live in `.github/workflows/`.
**Performance Goals**: Licenses page first-paint ≤ 300 ms on a typical broadband connection (inherits Constitution II's calendar-page bound — trivially met for a static list of ~200 rows). Generator runtime locally ≤ 30 s (FR-006 plus user expectation of `npm run` script).
**Constraints**: Drift check fully offline (FR-013) — no npm registry or CDN calls at PR time; only release-time validation and on-demand local regeneration may touch the network. `/sbom.json` is a publicly readable static asset (FR-008, Clarification Q1). License-gate scope is unified across npm + CDN-runtime manifest + vendored sources (FR-014, Clarification Q3). Release pipeline MUST block on SBoM generation or schema-validation failure (FR-020, Clarification Q2).
**Scale/Scope**: Current dependency footprint: 0 npm `dependencies`, 16 npm `devDependencies` (transitive tree of a few hundred packages), 2 CDN-loaded runtime libs (FullCalendar, MSAL.js), 1 vendored source tree (`.specify/`). SBoM is expected to land in the low-hundreds-of-components range. Licenses page renders the runtime subset — roughly 5–20 entries today.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                        | Status             | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Redmine API Contract**      | N/A                | No Redmine API surface touched.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **II. Calendar-First UX**        | PASS               | The licenses page is an explicitly _secondary_ surface (spec FR-001 says the link MUST NOT appear on the main calendar page). The calendar's load path is unaffected. 300 ms render bound trivially met for a static list.                                                                                                                                                                                                                                                                                                                |
| **III. Test-First**              | PASS (will comply) | All new behaviour has unit tests (`oss-generate`, license-allowlist parsing, attributions projection) written before the corresponding implementation; UI test for the Settings → licenses page navigation written before the page exists. Tasks (`/speckit-tasks`) MUST order tests-first per the existing convention.                                                                                                                                                                                                                   |
| **IV. Simplicity & YAGNI**       | PASS               | Two new dev dependencies (`@cyclonedx/cyclonedx-npm`, `spdx-expression-parse`) — both have explicit rationale (SBoM correctness is a regulated-artifact obligation; SPDX parsing is non-trivial and the parser is the canonical reference). No new runtime dependency. One new generator script (`scripts/oss-generate.mjs`) follows the existing `scripts/sqi.mjs` / `scripts/coverage-merge.mjs` pattern. No abstraction layers introduced beyond what the spec requires (single generator, two committed output files, two CI checks). |
| **V. Security by Default**       | PASS               | `/sbom.json` is intentionally public per Clarification Q1 (compliance norm; contents derivable from deployed JS anyway). The license-allowlist gate is itself a new security control. No new credential handling; existing AES-GCM credential storage untouched. New deps' npm-audit posture verified in Phase 0 (R1, R2).                                                                                                                                                                                                                |
| **VI. Continuous Quality Gates** | PASS               | The two new CI gates (drift, license allowlist) **add to** the existing pipeline rather than bypass it — they run alongside lint/test:coverage/SQI/UI tests, not in place of any. New generator code carries ≥ 95 % unit-test coverage. Expected SQI delta is small (script is short and pure-functional; UI page is mostly static). SQI must remain in the GREEN band (≥ 60) post-merge.                                                                                                                                                 |

**Verdict**: **PASS** — proceeding to Phase 0. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/034-sbom-and-attributions/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (UAT walkthrough)
├── contracts/           # Phase 1 output
│   ├── oss-manifest.schema.json       # CDN + vendored manifest schema
│   ├── oss-allowlist.schema.json      # SPDX allowlist + exemption file schema
│   ├── attributions.schema.json       # In-app attributions projection schema
│   └── sbom-reference.md              # Pointer to upstream CycloneDX 1.6 JSON schema (external)
├── checklists/
│   └── requirements.md  # Existing (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by this command)
```

### Source Code (repository root)

```text
# New static assets (committed at repo root; served by deploy as-is)
licenses.html                          # NEW — dedicated Open-Source Licenses page
sbom.json                              # NEW — CycloneDX 1.6 JSON, full dep tree
attributions.json                      # NEW — runtime-only projection for licenses.html
oss-manifest.json                      # NEW — hand-maintained CDN + vendored inventory
oss-allowlist.json                     # NEW — SPDX allowlist + per-name@version exemptions

# New JS modules (vanilla ES2022; no transpilation)
js/licenses.js                         # NEW — renders attributions.json into licenses.html

# Edited app surfaces
settings.html                          # EDIT — add discreet "Open-source licenses" footer link
js/settings-page.js                    # EDIT (likely no-op — link is plain <a href>)
js/i18n/en.js                          # EDIT — add `licenses.*` chrome keys
js/i18n/de.js                          # EDIT — add `licenses.*` chrome keys (German)
css/style.css                          # EDIT — minimal styling for the new page (table layout, dark-mode aware via existing CSS variables)

# New generator script + helpers
scripts/oss-generate.mjs               # NEW — reads package-lock + oss-manifest; emits sbom.json + attributions.json
scripts/oss-check-licenses.mjs         # NEW — reads sbom.json + oss-allowlist; exits 1 on disallowed license
scripts/oss-drift-check.mjs            # NEW — regenerates to tmp + diffs against committed files

# Edited tooling
package.json                           # EDIT — add 2 devDeps, 3 new npm scripts (oss:generate, oss:drift, oss:licenses)
.github/workflows/deploy.yml           # EDIT — wire drift + license checks into the existing `test` job
.github/workflows/release.yml          # EDIT — validate sbom.json + upload as Release asset; fail release on schema-validation error (FR-020)
CLAUDE.md                              # EDIT — "Active Technologies" bullet for 034; "Quality + security pipeline" mentions the 2 new gates

# Tests
tests/unit/oss-generate.test.js        # NEW — generator output shape, npm + CDN merge, dual-license handling
tests/unit/oss-check-licenses.test.js  # NEW — allowlist match, SPDX expression handling, exemption resolution
tests/unit/oss-drift-check.test.js     # NEW — clean repo passes, hand-edited generated file fails
tests/ui/oss-licenses.spec.js          # NEW — Playwright: Settings footer link → licenses.html → list renders, both themes, both locales
```

**Structure Decision**: Single-project (Option 1) — extends the existing static-SPA tree with one new dedicated page (`licenses.html` mirrors the `index.html` / `settings.html` pattern), one new JS module (mirrors `js/settings-page.js`), and three new generator/check scripts under `scripts/` (mirrors `scripts/sqi.mjs`, `scripts/coverage-merge.mjs`). No new top-level directories. The decision to use a _dedicated HTML page_ (rather than a tab inside `settings.html` or a markdown article inside the existing docs panel) is driven by the spec's Assumption that the page must be a "dedicated route/view (not a modal), so URL-sharing and right-click-open-in-new-tab work as users expect" — the existing static-SPA pattern delivers that with a separate file and no router.

## Post-Design Constitution Re-Check

_Re-evaluated after Phase 1 design (data-model + contracts + quickstart)._

| Principle                        | Status | Delta from initial check                                                                                                                                                                                      |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Redmine API Contract**      | N/A    | unchanged                                                                                                                                                                                                     |
| **II. Calendar-First UX**        | PASS   | unchanged — page is on a separate static URL, calendar code path untouched                                                                                                                                    |
| **III. Test-First**              | PASS   | strengthened — concrete test files enumerated in R12 + ordered tests-first in upcoming `/speckit-tasks`                                                                                                       |
| **IV. Simplicity & YAGNI**       | PASS   | unchanged — no new abstractions added in Phase 1; the three JSON schemas in `contracts/` codify existing data shapes, they don't introduce new ones                                                           |
| **V. Security by Default**       | PASS   | strengthened — license-allowlist gate is itself a new security control; new deps (`@cyclonedx/cyclonedx-npm`, `spdx-expression-parse`) are both MIT/Apache-2.0 and clean under `npm audit --audit-level=high` |
| **VI. Continuous Quality Gates** | PASS   | strengthened — concrete SQI-impact plan in R13; new gates are additive, not substitutive                                                                                                                      |

**Verdict**: **PASS** — plan is ready for `/speckit-tasks`.

## Complexity Tracking

> Constitution Check passed with no violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| _(none)_  | _(n/a)_    | _(n/a)_                              |
