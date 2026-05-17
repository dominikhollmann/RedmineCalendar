# Implementation Plan: Small UX & Accessibility Fixes

**Branch**: `033-small-ux-a11y-fixes` | **Date**: 2026-05-17 | **Spec**: [`spec.md`](spec.md)
**Input**: Feature specification from `/specs/033-small-ux-a11y-fixes/spec.md`

## Summary

Bundle of four independent improvements: (1) remove the outside-click dismiss handler on the time-entry modal — Escape, the X button, and Cancel remain the only close paths; (2) filter entries booked to the admin-configured `holidayTicket` and `vacationTicket` at the **input** of `computeArbzgWarnings` so every ArbZG category (daily / weekly / restPeriod / sunday / holiday / breaks) sees them as if they did not exist; (3) delete the `renderAdminInfo` block, the `#admin-info` markup, the `.admin-info` CSS, and the four `admin.*` i18n keys; (4) audit the full app to WCAG 2.2 Level AA, remediate every user-facing surface, and add `@axe-core/playwright` as a CI regression gate over the seven surface × two-theme matrix (14 scans).

Stories 1–3 are surgical edits to existing modules. Story 4 dominates the feature cost: it introduces a new dev dependency, a new Playwright UI test file, and per-surface remediation work — including dialog-pattern conversion for the chatbot and docs panels, which were not built with a11y in mind.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged
**Primary Dependencies**: FullCalendar v6 (CDN, existing); MSAL.js v2 (CDN, existing); `@axe-core/playwright` (NEW, dev-only)
**Storage**: existing `localStorage` keys + admin-managed `config.json` (existing `holidayTicket`, `vacationTicket` fields — no schema change)
**Testing**: Vitest (unit, existing) + Playwright (UI, existing) + `@axe-core/playwright` (new, plugged into the existing UI test pipeline)
**Target Platform**: Modern evergreen browsers (Chromium, Firefox, Safari) on desktop and mobile viewports
**Project Type**: Static SPA — unchanged
**Performance Goals**: Calendar render perceived in <300 ms (constitution II — unchanged); per-surface axe scan budget ~1–2 s in CI; 14 scans total adds ~15–25 s to `npm run test:ui`
**Constraints**: No build step; vanilla ES modules; no new runtime dependencies (axe is build-time only); SQI score MUST remain in the GREEN band (≥60) post-feature
**Scale/Scope**: 4 user stories, ~6 source files touched for stories 1–3, ~10–15 source files touched for story 4 remediation, 1 new test file (`tests/ui/a11y.spec.js`), 1 new audit artefact (`a11y-audit.md`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                        | Status                                                                                                                                                                                                                                                                                                                         | Notes |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| **I. Redmine API Contract**      | ✅ N/A — no API client changes; `holidayTicket`/`vacationTicket` are read-only from existing `config.json`.                                                                                                                                                                                                                    |
| **II. Calendar-First UX**        | ✅ Compliant — Story 2 _improves_ calendar correctness by removing false warnings. Story 4 explicitly covers the calendar's mobile day-view (FR-013, AC-6). No regression to <300 ms render.                                                                                                                                   |
| **III. Test-First**              | ✅ Plan enforces TDD: Story 2 (pure logic) gets Vitest tests **before** the input filter is added. Stories 1, 3, 4 get Playwright UI tests **before** the source change; the axe-scan harness _is itself_ the regression test for Story 4. See `quickstart.md` for the red→green sequence.                                     |
| **IV. Simplicity & YAGNI**       | ✅ One new dev dependency (`@axe-core/playwright`) — justified by FR-015a (constitution-level CI gate). No new layers, no caching, no plugin architecture. Stories 1–3 are deletions or single-call-site filters.                                                                                                              |
| **V. Security by Default**       | ✅ N/A — no new credential handling, no new XSS surfaces, no new external endpoints.                                                                                                                                                                                                                                           |
| **VI. Continuous Quality Gates** | ✅ All six pipeline steps remain green: `audit` + `lint`/`format`/`htmlhint`/`typecheck` + `test:coverage` ≥95% + `sqi:json` ≥60 GREEN + `test:ui` (now including 14 axe scans). The axe step is added to step 5 (`test:ui`); the SQI metrics are not touched. Coverage of new ArbZG filter code MUST hit ≥95% line in Vitest. |

**Gate result**: PASS. No violations to track in Complexity Tracking. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/033-small-ux-a11y-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions on tooling/approach per story
├── data-model.md        # Phase 1 output — config field semantics + audit-report schema
├── quickstart.md        # Phase 1 output — TDD walkthrough + manual UAT recipes
├── contracts/
│   └── a11y-contract.md # Phase 1 output — dialog ARIA pattern + axe-scan surface matrix
├── a11y-audit.md        # Phase 3 (implement) output — the audit findings + triage
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
├── spec.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
js/
├── time-entry-form.js   # Story 1: remove _outsideClickHandler (lines 35, 787-790, 801-804, 859-870). Add dialog-pattern ARIA from story 4.
├── arbzg.js             # Story 2: extend computeArbzgWarnings signature to accept cfg; add holidayTicket/vacationTicket input filter.
├── calendar.js          # Story 2: pass cfg through to computeArbzgWarnings call sites (currently invoked without cfg). Story 4: ARIA live region for anomaly-tag updates.
├── settings.js          # Story 3: delete renderAdminInfo + the call site at line 151. Story 4: ARIA roles on settings form/landmarks.
├── settings-page.js     # Story 3: no direct change expected; remove if it references admin-info.
├── chatbot.js           # Story 4: convert panel-open into dialog ARIA pattern (role=dialog or appropriate landmark, focus trap, focus return).
├── docs.js              # Story 4: same dialog pattern as chatbot.
├── voice-input.js       # Story 4: aria-live region for recording state + transcript updates; accessible label that reflects state.
├── i18n/en.js           # Story 3: remove admin.heading, admin.redmine_url, admin.ai_provider, admin.ai_model keys. Story 4: add a11y labels (e.g. close-button names, voice state strings).
└── i18n/de.js           # mirror of en.js

settings.html            # Story 3: remove <div id="admin-info"> block. Story 4: ensure lang attribute is set dynamically; ensure landmarks (main, header).
index.html               # Story 4: ensure lang attribute, landmarks, decorative-icon hiding.
css/style.css            # Story 3: delete .admin-info rules (currently around line 754 and 1795). Story 4: focus indicators (≥3:1 contrast), target-size adjustments for mobile day-view.

tests/
├── unit/
│   └── arbzg.test.js    # Story 2: NEW or EXTEND — TDD tests for the input filter (single-day, mixed day, missing cfg).
└── ui/
    ├── modal.spec.js    # Story 1: NEW or EXTEND — outside click does nothing; Escape closes; drag-from-inside-to-outside does nothing.
    ├── settings.spec.js # Story 3: NEW or EXTEND — admin-info block is absent from settings.html.
    └── a11y.spec.js     # Story 4: NEW — axe-playwright scan over the 7-surface × 2-theme matrix (14 scans). Wired into npm run test:ui.

package.json             # Story 4: add @axe-core/playwright as a devDependency.
```

**Structure Decision**: This is an in-place modification of the existing static-SPA codebase. No new directories beyond the standard feature spec dir. The `a11y-audit.md` artefact is produced _during_ implementation (not at plan time) because it depends on running the audit against the actual built code — Phase 0/1 cannot pre-compute findings without running axe + manual checks on the live app.

## Complexity Tracking

| Violation                                                                                                                                    | Why Needed                                                                                                                                                                                          | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New dev dependency `@axe-core/playwright`                                                                                                    | FR-015a mandates a permanent CI regression gate over WCAG 2.2 AA. axe-core is the industry-standard scanner; the `@axe-core/playwright` adapter is its officially-supported Playwright integration. | Writing custom rule checks in raw JS would (a) cover only a small fraction of WCAG, (b) be a constitutional violation of "Simplicity & YAGNI" by reinventing axe, and (c) couple our test suite to in-house heuristics that miss real failures.                                                                           |
| Two clarifying decisions in spec (C2 widens to full-app; C3 widens CI gate to full-app) bumps Story 4 from "small fix" to "feature-dominant" | User direction (2026-05-17 clarification session, recorded in spec § Clarifications).                                                                                                               | The Option-2 audit-wide / fix-narrow trade was explicitly rejected by the user in favour of one complete pass. No simpler in-feature alternative exists; the only smaller alternative is to defer specific surfaces via FR-014's documented-exception mechanism — kept available as an escape valve, not used by default. |

---

## Phase 0 — Research (deliverable: `research.md`)

All `NEEDS CLARIFICATION` markers from the Technical Context above are resolved against the spec's `## Clarifications` section. The remaining open decisions for Phase 0 are tooling/approach choices, not feature ambiguities:

1. **axe integration mechanism** — `@axe-core/playwright` (officially supported adapter) vs. a custom Playwright fixture using `axe-core` directly.
2. **ArbZG cfg propagation** — extend `computeArbzgWarnings(entries, year)` to `(entries, year, cfg)` and filter inside, vs. filter at the call site in `calendar.js` before passing entries in.
3. **Dialog pattern for chatbot/docs panels** — `role="dialog"` with `aria-modal="true"` (full focus trap) vs. `role="complementary"` (sidebar pattern, no trap).
4. **Audit-report schema** — single Markdown file with a flat finding table vs. one section per surface.
5. **Focus-restoration mechanism** — track opener element manually, vs. rely on browser default after close.

These are answered in `research.md`.

## Phase 1 — Design & Contracts

### `data-model.md`

No new persisted entities. The document captures two minor data-shape decisions: (a) the cfg argument shape passed into `computeArbzgWarnings` and (b) the schema of the `a11y-audit.md` finding records.

### `contracts/a11y-contract.md`

This feature has no HTTP / API contracts. It does have **two UI contracts** worth pinning down before implementation:

- **Dialog ARIA contract** — the exact role/attribute set every "modal-like" overlay (time-entry modal, chatbot panel, docs panel) must satisfy. Stops each remediation from diverging.
- **Axe-scan surface matrix** — the 7 surfaces × 2 themes × set of WCAG rules the CI gate enforces. This is the contract the test asserts against.

### `quickstart.md`

Step-by-step TDD walkthrough for each story (Red → Green → Refactor), plus the manual UAT checklist for `/speckit-uat-run` to follow. Covers: how to reproduce each story's bug locally, how to confirm the fix, and how to run the full a11y scan locally with `npm run test:ui`.

### Agent context update

`CLAUDE.md` already lists the relevant active technologies. The plan reference in the SPECKIT-managed block will be updated to point at this `plan.md` at end of Phase 1.

## Phase 2 — Tasks (not produced here)

`/speckit-tasks` will generate the dependency-ordered task list from this plan, the research, the data-model, and the contracts. Each story (1, 2, 3, 4) maps to an independent track in the task list per the spec's prioritisation; story 4 will produce the bulk of the tasks.
