# Phase 0 Research: Pre-Handover Cleanup and Quality-Bar Tightening

**Feature**: 035-handover-readiness
**Date**: 2026-05-19
**Status**: All open design decisions resolved; no `[NEEDS CLARIFICATION]` markers remain.

The spec.md is concrete on _what_ and _why_; this document records the _how_ decisions that need to be settled before tasks can be enumerated.

---

## Decision 1 — How to split `js/calendar.js` (FR-006)

**Decision**: Two extractions: `js/calendar-toolbar.js` (custom buttons + view-toggle wiring) and `js/calendar-overlays.js` (ArbZG warnings, anomaly tags, day/week totals decoration). `calendar.js` retains FullCalendar init, event fetching, and the main `loadEntries`/`reloadAllEvents` orchestration.

**Rationale**:

- The audit measured 1199 LOC. A single sibling split would still leave one half around 600 LOC. Two extractions, with the toolbar and overlay concerns being the most clearly separable, brings all three modules under 500 LOC reliably.
- Toolbar toggles (workhours toggle at lines ~577–680, day-range toggle nearby) have a clean public surface: `installToolbarButtons(calendar, deps)` — they don't read calendar state, they write toolbar state and call `calendar.setOption(...)`.
- Overlay decoration (ArbZG warning lines, anomaly badges, totals strip) is read-only against calendar event data and writes into DOM. Public surface: `attachOverlayHooks(calendar, deps)` returning `{ updateOverlays(entries) }`.
- The orchestration (init, fetch, error redirect, range navigation, copy/paste) stays in `calendar.js` because it's the bootstrap entry point loaded from `index.html`.

**Alternatives considered**:

- _One sibling only._ Rejected: file-size math leaves the parent ≥ 500 LOC.
- _Three or more siblings (e.g., separate copy/paste, separate range toggle)._ Rejected: YAGNI — copy/paste and range toggle are <100 LOC each, splitting them is overhead with no maintainability gain.
- _Class-based refactor (CalendarController class)._ Rejected: introduces an abstraction the rest of the codebase doesn't use. CLAUDE.md style is plain ES modules with function-level exports.

**Migration order** (TDD-respecting):

1. Write `tests/unit/calendar-toolbar.test.js` against the planned public surface of `installToolbarButtons` — tests fail (module doesn't exist).
2. Create `js/calendar-toolbar.js`, move the toolbar code, satisfy the tests.
3. Update `js/calendar.js` to call `installToolbarButtons(calendar, deps)` at the existing init point.
4. Run UI tests — must stay green.
5. Repeat for `calendar-overlays.js`.

---

## Decision 2 — How to eliminate `window._calendar*` globals (FR-007)

**Decision**: Convert the three properties (`_calendarArbzgWarnings`, `_calendarAnomalies`, `_calendarDayTotals`) into module-scope `let` bindings inside `js/calendar.js`, exposed via three named exports: `getArbzgWarnings()`, `getAnomalies()`, `getDayTotals()`. The new `calendar-overlays.js` module receives these accessors via dependency-injection in `attachOverlayHooks(calendar, { getArbzgWarnings, getAnomalies, getDayTotals })`.

**Rationale**:

- Grep at planning time confirmed 13 read/write sites, all within `js/calendar.js` itself. No cross-module reader exists — the globals are essentially a roundabout way to share state between callbacks defined in the same file. Module-scope `let` plus closure is the idiomatic JS pattern for this.
- Accessor functions (`getX()`) are preferable to direct named exports because event callbacks run _after_ the module-scope variable is reassigned — exporting the binding directly would freeze the reference at the wrong moment.
- Once the data flows out via `calendar-overlays.js`, the accessor pattern lets the new module read fresh state on every render without needing to subscribe to updates.

**Alternatives considered**:

- _Pass the state into each callback as a parameter._ Rejected: FullCalendar's `eventDidMount`, `dayCellDidMount`, etc., don't accept user-data parameters. Closure or accessor is the only practical option.
- _Single accessor returning `{ warnings, anomalies, totals }`._ Rejected: forces every consumer to take a dependency on the whole bundle even if it only needs one field; minor coupling smell.
- _Event-emitter pattern (subscribe to update events)._ Rejected: YAGNI — no consumer needs change notifications; they just need fresh values at render time.

---

## Decision 3 — SQI `moduleSize` band redesign (FR-012)

**Decision**: Replace the current violation-count-only band with a **two-input scorer**: take the worst-file LOC-overage ratio (`worstFile.loc / 500`) AND clip by the count of violations. Specifically:

```js
moduleSize: {
  // primary signal: worst-file overage ratio (1.0 = exactly at threshold; 2.0 = double)
  worstFileOverage: [
    [1.0, 100],
    [1.2, 80],
    [1.5, 50],
    [2.0, 20],
    [3.0, 0],
  ],
  // secondary penalty: more than one file over threshold is itself bad
  // multiplier on the overage score: 1.0 (one violation) / 0.8 (2-3) / 0.5 (4+)
}
```

Composite moduleSize = `worstFileOverage_score × violation_count_multiplier`.

**Rationale**:

- The audit identified the lenience clearly: the current band gives one violation = 80/100 regardless of the file's actual size. With the worst-file dominant input, `calendar.js` at 1199 LOC scores ~20 instead of 80 _before_ the cleanup, and ~100 once the split lands. The score now actually reflects the underlying maintainability state.
- The violation-count multiplier preserves the "two oversized files is worse than one oversized file" signal without dominating the score.
- The 500-LOC reference is taken from `eslint.config.js:68` (already the `max-lines` warning threshold) — no new magic number introduced.

**Alternatives considered**:

- _Pure worst-file overage (no count)._ Rejected: a 600-LOC file + ten 510-LOC files would score the same as just one 600-LOC file, which is the wrong incentive.
- _Pure violation count, tightened._ Rejected: still doesn't distinguish 501 LOC from 1500 LOC — the headline problem the audit raised.
- _Sum of overages._ Considered. Easier to reason about (`(L1-500)+(L2-500)+...`) but produces awkward bands (where does the threshold sit?). The worst-file × multiplier shape is more interpretable on a dashboard.

**Validation**: Before merging FR-015 (the threshold raise to 80), run `npm run sqi` and confirm:

- With current `calendar.js` (1199 LOC) and the new band: moduleSize score ≈ 20.
- After the split (largest file <500 LOC): moduleSize score = 100.
- The composite delta from this band redesign is recorded in the PR description so reviewers can see exactly what changed.

---

## Decision 4 — `scripts/**` ESLint limits (FR-013)

**Decision**: Add `max-lines: ['warn', { max: 600 }]` and `complexity: ['warn', { max: 20 }]` to the `scripts/**/*.{js,mjs}` override in `eslint.config.js`. More generous than `js/**` (`max: 500` and `15` respectively) because CLI tooling legitimately tends to have larger main functions and higher branching for command-line option parsing.

**Rationale**:

- `scripts/sqi.mjs` is 541 LOC; `scripts/oss-generate.mjs` is similar. The 600-LOC threshold is just above current state, so it warns on regression but doesn't fail on current code.
- `complexity: 20` matches the existing test-file complexity ceiling (`eslint.config.js:117`) — internally consistent, distinguishing "tooling" from "application code."
- An inline comment in the override block justifies the more-generous limits.

**Alternatives considered**:

- _Same limits as `js/**`._ Rejected: would fire on existing files and require an immediate scripts refactor outside this feature's scope.
- _Leave scripts unrestricted._ Rejected by the audit finding (FR-013).

---

## Decision 5 — `max-lines-per-function: 60` impact assessment (FR-014)

**Decision**: Tighten the rule to 60 in `eslint.config.js:69`. The implementer MUST first run `npm run lint` to enumerate the impacted functions, then either refactor each one or add a per-file override with a justifying comment per FR-019. **Up to 3 per-file exceptions** are allowed without escalation; more than 3 means the cleanup scope expanded and the implementer should flag in the PR description.

**Rationale**:

- The audit flagged 80 as generous for the project's stated values. 60 is the industry "modern" default for pure-logic modules.
- A budget of "up to 3 exceptions, document each" prevents the cleanup ballooning into a 30-function refactor. Anything beyond that warrants a follow-up issue, per the YAGNI principle.
- The exceptions are explicit (per-file comments naming the constraint) — no silent re-raising of the global limit.

**Alternatives considered**:

- _Tighten to 50._ Rejected: more aggressive than the user requested; risk of expanding scope unnecessarily.
- _Phase the tightening (apply per-file, not globally)._ Rejected: violates the audit's "permanent guardrail" intent — leaves the global at 80 indefinitely.

---

## Decision 6 — `fetchTimeEntryById` error-surface change (FR-008)

**Decision**: Replace the silent `try { ... return null } catch { ... }` with a direct `request(...)` call that propagates `RedmineError`. The sole caller (`js/chatbot-tools.js:306`) catches `RedmineError` and translates 404 into the existing "entry not found" tool-response path; any other status surfaces as a tool error.

**Rationale**:

- Grep at planning time found exactly one caller. The fallback path in the spec assumptions ("if many callers, document instead of throw") does not apply.
- The chatbot-tools caller is the only consumer that ever needed the "is this entry missing?" semantics. After the change, the distinction becomes "no entry with that ID" (404, recoverable) vs "everything else" (server error, surface) — which is the _correct_ semantics the audit asked for.
- Match the rest of `js/redmine-api.js` — every other public method throws `RedmineError` and call-sites catch as needed.

**Alternatives considered**:

- _Status-code parameter (e.g., `fetchTimeEntryById(id, { silentNotFound: true })`)._ Rejected: introduces an API knob to preserve a one-caller wart. YAGNI.
- _Return a discriminated union (`{ found: true, entry } | { found: false }`)._ Rejected: inconsistent with the rest of the API, adds a type for one call-site.

---

## Decision 7 — `renderMessage` HTML sanitization (FR-009)

**Decision**: Make `renderMessage` _internally_ call `DOMPurify.sanitize(html)` before assigning to `innerHTML`. Existing caller `renderText` (which already calls `marked.parse(text)` and `DOMPurify.sanitize(...)`) becomes a thin convenience wrapper: `renderMessage(role, DOMPurify.sanitize(marked.parse(text)))` simplifies to `renderMessage(role, marked.parse(text))` because sanitization is now in the renderer.

**Rationale**:

- Defense-in-depth: even after the cleanup, a future caller adding markdown rendering elsewhere cannot bypass the sanitizer.
- DOMPurify is already loaded as a CDN global (`eslint.config.js:42` declares it as a project global). No new dependency.
- Idempotent: `DOMPurify.sanitize(DOMPurify.sanitize(x))` is safe and cheap; double-sanitizing the markdown path is fine.

**Alternatives considered**:

- _Signature change to accept DOM nodes._ Rejected: forces every caller to rewrite their markdown-rendering plumbing, larger blast radius for one safety improvement.
- _Strict-typed signature with a "trusted HTML" marker._ Rejected: introduces a tagging system the codebase doesn't use; YAGNI.

---

## Decision 8 — CI gate duplication between `ci.yml` and `deploy.yml` (FR-005)

**Decision**: Justify the duplication with an in-file comment in `deploy.yml` describing the post-merge backstop role. Keep both runs.

**Rationale**:

- The audit explicitly noted that the post-merge run is "a legitimate defence-in-depth choice." With branch protection requiring `ci.yml` green, the post-merge re-run catches only a narrow class of issues (e.g., the merge commit introducing something that wasn't in either parent — rare, but real for octopus merges or evaluations that depend on `HEAD` rather than the diff).
- Trimming would save CI minutes (~5 minutes per merge) but eliminate the only check that runs against the merged code. The audit verdict supports either resolution — choosing the more conservative one for a project nearing handover.
- Cost of being wrong: keep-and-justify costs 5 CI-minutes per merge; trim-and-regret means a regression slips to production before the next PR runs.

**Alternatives considered**:

- _Trim deploy.yml duplicates._ Rejected: see above — the safety margin is cheap.
- _Split: keep some in both (security gates), trim others (style gates)._ Considered. Rejected as scope creep; a clean in-file comment covers the rationale for the existing whole-set duplication without inventing a new partitioning that future readers must decode.

---

## Decision 9 — CI step: `npm audit` location (FR-003)

**Decision**: Add `npm audit --audit-level=high` as the first step of `ci.yml`'s `lint-and-format` job. Match the CLAUDE.md and constitution-stated order.

**Rationale**:

- CLAUDE.md and the constitution (Principle VI) both list audit as step 1 of the pipeline. Aligning `ci.yml` with the documented order is cheaper than rewriting both documents.
- PR-time audit is the right placement — a high-severity advisory should block the PR, not just the deploy.
- Run time impact: ~3–5 seconds for a clean tree; negligible.

**Alternatives considered**:

- _Remove the step from CLAUDE.md / constitution instead of adding to `ci.yml`._ Rejected: would weaken the security posture per Principle V/VI.
- _Keep audit deploy-only._ Rejected: same — Principle VI explicitly lists it as the first CI step.

---

## Decision 10 — Constitution version bump for Principle VI threshold change (Plan Constitution Check)

**Decision**: PATCH bump 1.5.0 → 1.5.1. Update the Sync Impact Report at the top of `constitution.md`. No principle text rewording beyond the band number itself.

**Rationale**:

- Versioning policy in `constitution.md` Governance section: PATCH = "clarifications, wording fixes, or non-semantic refinements." Raising a tunable threshold value the constitution itself describes as a "tunable constant" is closer to a clarification of current state than an expanded mandate.
- MINOR (1.6.0) would be appropriate if we were adding a new metric or a new mandate. We're not — we're tightening one existing knob.
- The Sync Impact Report at the top of `constitution.md` becomes the audit trail: the deliberate, code-reviewed act the constitution itself requires.

**Alternatives considered**:

- _MINOR 1.6.0 bump._ Rejected as overkill for a threshold-value update.
- _No constitution change; only update CLAUDE.md._ Rejected: leaves constitution.md describing a stale band number, exactly the kind of drift this feature exists to eliminate.

---

## Open questions for the implementer (deferred to tasks phase, not blockers)

- **Initial SQI composite score on this branch.** Phase 1 quickstart includes a step to measure this _before_ any cleanup begins, so the FR-017 "PR description records the value" claim has a baseline. If the initial composite is already ≥ 80, FR-015 can land independently; if not, the threshold raise blocks until cleanups close the gap.
- **Exact list of functions over 60 lines after FR-014.** Enumerated during Tasks phase by running `npm run lint` with the rule set tighter.
- **Whether `js/calendar.js` test coverage drops below 95% during the split.** Tracked by the existing `npm run test:coverage` per-file thresholds; if any new module falls below, additional tests are added before the split lands.
