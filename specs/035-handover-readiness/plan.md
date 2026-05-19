# Implementation Plan: Pre-Handover Cleanup and Quality-Bar Tightening

**Branch**: `035-handover-readiness` | **Date**: 2026-05-19 | **Spec**: [`spec.md`](spec.md)
**Input**: Feature specification from `specs/035-handover-readiness/spec.md`

## Summary

Eleven concrete cleanup items surfaced by the handover-readiness audit, plus four permanent quality-bar tightenings. The cleanups span three risk tiers: visible-cruft (stale comments referencing deleted helpers, CLAUDE.md / CI drift, dead `scope === 'excluded'` branches, CI gate duplication decision), structural (split the 1199-LOC `calendar.js` god-module into ≤500-LOC siblings, eliminate `window._calendar*` cross-callback globals, throw `RedmineError` from `fetchTimeEntryById` instead of silent-null, internal-sanitize chatbot `renderMessage`, remove `@ts-ignore` from `js/knowledge.js`), and housekeeping (regenerate coverage artifacts). The tightenings raise the bar permanently: `max-lines-per-function: 80 → 60` on `js/**`, add `max-lines` and `complexity` warnings to `scripts/**` (currently unrestricted), redesign the SQI `moduleSize` band so a 2× oversized file actually shows up in the score, and raise the composite SQI gate from `≥ 60` to `≥ 80` as a hard CI failure. No new runtime dependencies; one dev-only dep (`@types/node`) to retire the last `@ts-ignore`.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged
**Primary Dependencies**: FullCalendar v6 (CDN), MSAL.js v2 (CDN), DOMPurify (CDN), marked (CDN) — all unchanged. Dev-side: ESLint v9 flat config, Prettier, Vitest, Playwright, `@cyclonedx/cyclonedx-npm`, `spdx-expression-parse` — all unchanged. **NEW**: `@types/node` (devDependency only, enables removal of `@ts-ignore` in `js/knowledge.js`).
**Storage**: N/A — internal-quality work, no storage changes.
**Testing**: Vitest (unit), Playwright (UI) — existing infrastructure. All existing test suites MUST stay green; new tests required for the split modules' public surface and for the SQI threshold behavior (FR-015 acceptance #5).
**Target Platform**: Browser SPA (existing) + Node-side tooling (`scripts/sqi.mjs`, ESLint, SBoM generators) — unchanged.
**Project Type**: Static SPA (single project layout, no build step).
**Performance Goals**: Preserve current calendar render performance (FR-006 — splitting `calendar.js` must not introduce import-order or initialization regressions). No new perf targets.
**Constraints**:

- SQI composite score MUST be ≥ 80 on this branch _before_ the threshold raise lands (FR-017).
- ESLint `max-lines-per-function` tightened to 60 on `js/**` — no silent re-raise (FR-014, FR-019).
- No `window._calendar*` properties may remain after the refactor (FR-007, verified by grep).
- No `|| true` / `continue-on-error: true` suppression on the SQI step (FR-016).
  **Scale/Scope**: 11 cleanup items + 4 tooling tightenings + documentation updates across CLAUDE.md and the constitution. Estimated 2–3 new sibling modules under `js/`. Single dev-dep addition. ~1 SQI band redesign in `scripts/sqi.mjs`. Exactly 1 line of code changes for `fetchTimeEntryById` (single caller in `js/chatbot-tools.js:306` confirmed by grep at planning time).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

This feature is evaluated against the six Core Principles of `.specify/memory/constitution.md` v1.5.0.

| Principle                        | Status                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Redmine API Contract**      | ✅ Pass                             | FR-008 _strengthens_ the contract — `fetchTimeEntryById` shifts from silent-null to typed `RedmineError`, matching every other method in `js/redmine-api.js`. Surface remains REST-only; no DB access.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **II. Calendar-First UX**        | ✅ Pass                             | FR-006 requires the `calendar.js` split to preserve UI behavior; Playwright UI tests gate the refactor. No view, navigation, or render-perf changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **III. Test-First**              | ✅ Pass with note                   | Most cleanups touch already-tested surface; existing tests must stay green. **New tests required** for: (a) the split modules' public surface (TDD applies — write tests against the planned API _before_ moving code), (b) `fetchTimeEntryById` throwing behavior (update the existing test that currently asserts `null`), (c) SQI script's new threshold behavior (verify exit code 1 below 80). Tasks phase will enumerate these.                                                                                                                                                                                                                                                                                            |
| **IV. Simplicity & YAGNI**       | ✅ Pass                             | Every change has a concrete present need from the audit; no speculative additions. The single dependency change (`@types/node`, devDep) is documented in FR-010 with rationale (retire `@ts-ignore`). Splitting `calendar.js` reduces complexity; tightening lint rules trims surface, not expands it.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **V. Security by Default**       | ✅ Pass — net improvement           | FR-009 (`renderMessage` internal sanitization) tightens the XSS posture: a future caller cannot accidentally inject unsanitized model output. No new credential or storage surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **VI. Continuous Quality Gates** | ⚠️ Pass with constitution amendment | FR-015 raises the SQI GREEN band from `≥ 60` to `≥ 80`. The constitution explicitly permits this: _"Weights and band anchor points are tunable constants in `scripts/sqi.mjs`; changing them is a deliberate, code-reviewed act — not a silent knob."_ This change is the **opposite** of the anti-gaming rule — it _raises_ the bar, not lowers it, and FR-017 requires the actual composite to clear 80 before the threshold change merges. **Constitution text update required**: the `≥ 60 GREEN` value cited in Principle VI must be updated to `≥ 80 GREEN`. Treated as a PATCH version bump (1.5.0 → 1.5.1) — the principle itself is unchanged, only its threshold value. Captured in the post-merge Sync Impact Report. |

**Gate decision**: PASS. The Principle VI constitution-text update is an integral part of FR-018 (documentation alignment) and is not a violation but a deliberate, code-reviewed tightening as the constitution itself anticipates.

**Post-design re-check (after Phase 1 artifacts)**: PASS. The Phase 1 outputs (research decisions 1–10, the `redmine-api-error-surface` contract, the 14-step quickstart UAT) do not introduce new constitution concerns. Each of the four design choices that could have raised flags was deliberately scoped narrowly: the `calendar.js` split is bounded at two siblings (Decision 1, justified in Complexity Tracking); the `moduleSize` band redesign is bounded to the metric's own internal scoring (Decision 3, no new constants or knobs surface outside `scripts/sqi.mjs`); the `fetchTimeEntryById` change is verified single-caller (Decision 6, no API knob added per YAGNI); and the constitution PATCH bump (Decision 10) is the smallest version increment that captures the threshold change as the constitution itself requires. No items moved into Complexity Tracking during Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/035-handover-readiness/
├── plan.md                # This file
├── research.md            # Phase 0 design decisions (split strategy, SQI band shape, etc.)
├── data-model.md          # Phase 1 — N/A note (no new entities)
├── quickstart.md          # Phase 1 UAT walkthrough (one checklist item per success criterion)
├── contracts/
│   └── redmine-api-error-surface.md  # The fetchTimeEntryById contract change
└── tasks.md               # Phase 2 output (created by /speckit-tasks, not /speckit-plan)
```

### Source Code (repository root)

Existing layout retained. Touchpoints for this feature:

```text
js/
├── calendar.js                   # SPLIT — reduced from 1199 LOC to <500 LOC
├── calendar-toolbar.js           # NEW (extracted from calendar.js — toolbar toggles)
├── calendar-overlays.js          # NEW (extracted from calendar.js — ArbZG / anomaly / totals decoration)
├── redmine-api.js                # MODIFIED — fetchTimeEntryById throws RedmineError (FR-008)
├── chatbot.js                    # MODIFIED — renderMessage internal sanitization (FR-009)
├── chatbot-tools.js              # MODIFIED — update single fetchTimeEntryById caller (line 306)
├── knowledge.js                  # MODIFIED — drop @ts-ignore once @types/node lands (FR-010)
└── (no other js/ changes)

scripts/
├── sqi.mjs                       # MODIFIED — moduleSize band + composite gate threshold (FR-012, FR-015)
├── oss-generate.mjs              # MODIFIED — line 45-46 comment refresh (FR-001)
└── oss-check-licenses.mjs        # MODIFIED — drop scope=='excluded' dead branches (FR-004)

eslint.config.js                  # MODIFIED — max-lines-per-function: 60 on js/**, max-lines+complexity on scripts/** (FR-013, FR-014)

.github/workflows/
├── ci.yml                        # MODIFIED — add npm audit OR justify duplication; SQI hard-fail confirmed (FR-003, FR-005, FR-016)
├── deploy.yml                    # MODIFIED — duplication justified or trimmed (FR-005)
└── release.yml                   # MODIFIED — stale comment fix at line 80 (FR-002)

package.json                      # MODIFIED — add @types/node to devDependencies (FR-010)
sbom.json + attributions.json     # REGENERATED — devDep change requires npm run oss:generate (CLAUDE.md policy)

CLAUDE.md                         # MODIFIED — SQI threshold + audit step location + Active Technologies entry (FR-018)
.specify/memory/constitution.md   # MODIFIED — Principle VI threshold ≥ 60 → ≥ 80 + Sync Impact Report (PATCH 1.5.0 → 1.5.1)

tests/
├── unit/
│   ├── calendar-toolbar.test.js       # NEW — TDD for split module's public surface
│   ├── calendar-overlays.test.js      # NEW — TDD for split module's public surface
│   ├── redmine-api.test.js            # MODIFIED — update fetchTimeEntryById assertion (null → throws)
│   └── sqi-threshold.test.js          # NEW — verify exit code 1 below composite 80 (FR-015 acceptance #5)
└── ui/                                 # UNCHANGED but must stay green (regression gate for calendar.js split)
```

**Structure Decision**: Single-project static SPA (no build step), retained. Two new sibling modules under `js/` are created as part of the `calendar.js` split — both follow the established single-purpose / module-scope-state pattern (no `window` globals, no DOM grabs at module top-level beyond what `calendar.js` already does). All `tests/unit/*.test.js` additions are co-located in the existing test tree.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

| Violation                                                                           | Why Needed                                                                                                                                                                                                                                                             | Simpler Alternative Rejected Because                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Constitution-text update for Principle VI threshold (`≥ 60` → `≥ 80`)               | The codebase value diverges from the constitution-stated value once FR-015 lands; allowing the drift would itself violate the principle's "deliberate, code-reviewed act — not a silent knob" requirement.                                                             | "Leave the constitution text alone and let CLAUDE.md drift" — rejected because the constitution is the authoritative source; a stale band number there is exactly the kind of "looks unprofessional" signal this whole feature exists to remove.                         |
| Two new sibling modules under `js/` (`calendar-toolbar.js`, `calendar-overlays.js`) | `js/calendar.js` is currently 1199 LOC — far over the 500 LOC threshold. A single split into one sibling would still leave the parent above the threshold given the spread of responsibilities (toolbar, overlays, copy/paste, range toggles, ArbZG, anomaly, totals). | "Split into one sibling" — rejected by file-size math: ~1200 LOC across two roughly-equal modules still leaves one near or over 500 LOC. Two extractions (toolbar + overlays) reliably get all three modules under 500 LOC each. Validated empirically during the audit. |
