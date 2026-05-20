# Feature Specification: Pre-Handover Cleanup and Quality-Bar Tightening

**Feature Branch**: `035-handover-readiness`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Write a specification for the findings: cleanup 1-11 before handover, the 3 suggested SQI improvements, particularly tighten max lines to 60, also: composite SQI Gate > 80, sqi should fail CI"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Visible-Cruft Cleanup (Priority: P1)

A senior developer who is unfamiliar with the project opens the repository for the first time. Their first few minutes are spent skimming CI workflows, recently changed scripts, and the largest files. Anything stale, inconsistent, or visibly "we ran out of time" lowers their trust before they read any real logic. This story removes the small but highly visible defects surfaced by the handover audit so the first impression is clean.

**Why this priority**: First impressions are formed in the first 5–10 minutes. Stale comments referencing deleted functions, dashboard discrepancies (CLAUDE.md claims `npm audit` runs in CI but it does not), and dead-branch defensive code are the items most likely to make a senior assume the rest of the codebase is also half-finished. These are also the cheapest fixes per credibility point gained.

**Independent Test**: Re-run the audit's "leftover cruft" search (TODO / FIXME / HACK markers, stale comments referencing removed code, claimed-but-missing CI steps, dead branches) on this branch and confirm zero findings remain in the items covered by FR-001 through FR-005.

**Acceptance Scenarios**:

1. **Given** the audit identified a stale comment in `scripts/oss-generate.mjs` pointing at a `enrichLicensesFromNodeModules` helper that was deleted in a recent commit, **When** the cleanup is applied, **Then** the comment accurately describes the current code path (NOASSERTION accepted for components with `scope: optional`).
2. **Given** `.github/workflows/release.yml` references a workflow file (`deploy.yml`) that no longer hosts the PR-time drift check, **When** the cleanup is applied, **Then** the comment points to the workflow that actually runs that check today.
3. **Given** CLAUDE.md documents a CI pipeline starting with `npm audit --audit-level=high` but `.github/workflows/ci.yml` does not run it, **When** the cleanup is applied, **Then** documentation and reality agree (either the step is added to `ci.yml` or CLAUDE.md is updated to reflect that the audit runs only on `deploy.yml`).
4. **Given** `scripts/oss-check-licenses.mjs` contains branches for a `scope === 'excluded'` value that the generator never produces, **When** the cleanup is applied, **Then** those unreachable branches are removed.
5. **Given** `ci.yml` and `deploy.yml` both run the same SBoM, license, coverage, SQI, and UI-test gates, **When** the cleanup is applied, **Then** the duplication is either justified by an in-file comment explaining the post-merge defense-in-depth role, or the duplicate steps are trimmed so each gate runs in exactly one workflow.

---

### User Story 2 — Structural Cleanup of God-Module and API Inconsistencies (Priority: P2)

A senior developer opens `js/calendar.js` and finds 1199 lines covering FullCalendar init, ArbZG rendering, anomaly badges, copy/paste, toolbar toggles, and totals display, all communicating with themselves via `window._calendar*` globals. They open `js/redmine-api.js` and find one method that silently returns `null` on errors while every other method throws a typed `RedmineError`. They notice the chatbot message renderer accepts raw HTML and that a pure-logic module silences a missing-types warning with `@ts-ignore`. None of these is critical; together they read as "effort was high but the author never came back to finish." This story addresses them so the codebase reads as deliberate rather than half-refactored.

**Why this priority**: These are not visible cruft, but they are exactly what a senior will spot once they go beyond the surface. Fixing them is what turns "looks tidy" into "looks like a team-quality codebase one person could pick up."

**Independent Test**: After this story, `js/calendar.js` is below the 500-LOC ESLint threshold (or has been split into siblings whose largest member is below 500 LOC); no `window._calendar*` assignments remain in `js/`; every public method in `js/redmine-api.js` either returns a value or throws `RedmineError` (no silent `null` paths); `js/chatbot.js`'s message renderer cannot be misused to inject unsanitized HTML; `js/knowledge.js` has no `@ts-ignore` directive; and committed coverage artifacts are fresh (regenerated on this branch).

**Acceptance Scenarios**:

1. **Given** `js/calendar.js` exceeds 500 LOC and emits a `max-lines` ESLint warning, **When** the module is split into cohesive siblings (e.g., toolbar toggles, overlay decoration), **Then** the largest of the resulting modules is below 500 LOC, the original UI behavior is preserved, and the calendar test suite remains green.
2. **Given** several callbacks in `js/calendar.js` communicate via `window._calendarArbzgWarnings`, `window._calendarAnomalies`, and `window._calendarDayTotals`, **When** these are converted to module-scope state with explicit accessors, **Then** `grep -r "window._calendar" js/` returns zero matches and the same UI behavior is preserved.
3. **Given** `fetchTimeEntryById` in `js/redmine-api.js` swallows errors and returns `null`, **When** the cleanup is applied, **Then** the function throws `RedmineError` consistent with the rest of the module, and every caller is located and updated to either handle the typed error or check for the specific 404 status.
4. **Given** `renderMessage(role, html)` in `js/chatbot.js` accepts raw HTML, **When** the cleanup is applied, **Then** the function either accepts only sanitized DOM nodes or applies sanitization internally, so a future caller cannot accidentally inject unsanitized model output.
5. **Given** `js/knowledge.js` uses `@ts-ignore` to silence a Node-only import in a pure-logic module, **When** `@types/node` is added to `devDependencies`, **Then** the `@ts-ignore` is removed and `tsc --noEmit` continues to pass.
6. **Given** committed coverage artifacts on disk are several days stale, **When** `npm run test:coverage:all` is re-run before handover, **Then** the freshly generated `coverage/unified-summary.json` shows the line-coverage figure cited in CLAUDE.md (≥ 95%) is still accurate; if it is not, CLAUDE.md is updated.

---

### User Story 3 — Permanent Quality-Bar Tightening (Priority: P3)

A senior developer asks "what stops this codebase from drifting back to the state you just cleaned up?" They expect to see automated guardrails that fail CI on quality regressions, not just human discipline. This story raises those guardrails: tighter ESLint thresholds where the project's actual values are stricter than the configured defaults, an honest SQI `moduleSize` band that does not go blind once a single file is oversized, and a CI gate that fails on composite score regression rather than just warning.

**Why this priority**: The cleanups in Stories 1 and 2 are one-off. Without tightened guardrails, the next feature can quietly reintroduce the same issues. The user explicitly called out three SQI improvements (tighter `moduleSize` band, `scripts/**` size/complexity limits, `max-lines-per-function` tightened to 60), raising the composite gate above 80, and making SQI a hard CI failure. Together these turn "we cleaned it up once" into "the bar is permanent."

**Independent Test**: After this story, the SQI composite score on this branch is at least 80; `npm run sqi:json` exits non-zero below that threshold (causing CI failure); the `moduleSize` band reflects the worst file's LOC overage and not only the count of violations; ESLint warns on functions longer than 60 lines in `js/**`; and `scripts/**` carries the same `max-lines` and `complexity` warnings as `js/**` (limits may be more generous when justified).

**Acceptance Scenarios**:

1. **Given** the current `moduleSize` SQI band scores a single violation at 80/100 regardless of how many lines over the threshold the file is, **When** the band is tightened (either to a stricter violation-count scale or, preferably, to factor in the worst file's LOC-overage ratio), **Then** a file at 2× the threshold materially lowers the moduleSize score compared to a file just over the threshold.
2. **Given** the `scripts/**` ESLint override applies neither `max-lines` nor `complexity`, **When** the override is updated, **Then** both rules emit warnings on `scripts/**/*.{js,mjs}` (with limits documented as more generous than `js/**` if scripts legitimately warrant it).
3. **Given** the app-code `max-lines-per-function` limit is currently 80, **When** the limit is tightened to 60, **Then** ESLint warns on any function in `js/**` longer than 60 lines, and these warnings are addressed by refactoring or by per-file override comments that name the justifying constraint — not by silently re-raising the limit.
4. **Given** the SQI composite gate is currently `≥ 60` (with `bandFor()` labelling 60–100 as GREEN), **When** the gate is raised to `≥ 80`, **Then** `scripts/sqi.mjs` exits non-zero below 80, and the dashboard band labels are updated so GREEN starts at 80 (no longer 60).
5. **Given** SQI runs in CI as `npm run sqi:json`, **When** a deliberate regression is introduced (e.g., a 100-line function added to a pure-logic module) that pushes the composite below 80, **Then** the CI workflow run fails at the SQI step.
6. **Given** raising the SQI threshold would trap the project below the new gate if cleanups are incomplete, **When** the threshold change is committed, **Then** the actual composite score on the branch is already at least 80, with the recorded value attached to the PR description.

---

### Edge Cases

- **Splitting `js/calendar.js` changes module load order.** Modules with side-effecting top-level code can subtly reorder initialization. The refactor must preserve current load behavior; the Playwright UI tests must remain green.
- **Tightening `max-lines-per-function` to 60 produces many new warnings.** If a large number of existing functions in `js/**` exceed 60 lines, the cleanup scope expands beyond a small spec. The acceptance criterion is that every remaining warning is either refactored away or covered by a per-file override comment with a named justification; silently re-raising the limit back toward 80 is not acceptable.
- **Composite SQI score is below 80 after all cleanups land.** The threshold raise depends on the project actually scoring at least 80. If the cleanups in Stories 1 and 2 are not enough to clear the bar, additional work is required before the threshold change can merge (otherwise the gate change immediately blocks all future PRs).
- **Coverage artifacts cannot be regenerated locally.** If the developer's environment is broken (e.g., Playwright browsers missing), fall back to a green CI run on this branch and reference its produced figure; do not skip FR-011.
- **A future Dependabot bump pushes the composite below 80.** This is the intended behavior — CI fails, the bump is addressed rather than auto-merged. No work is needed in this spec to handle that; document the expectation in CLAUDE.md (covered by FR-018).
- **Callers of `fetchTimeEntryById` depend on the silent-null behavior.** Each caller must be located via grep and updated to either catch the typed error or check the 404 status; otherwise the behavior change is a regression.
- **CI gate duplication trim breaks the post-merge backstop.** If the duplicate steps in `deploy.yml` are removed rather than justified, the post-merge defense-in-depth posture disappears. The decision must be conscious and documented, not reflexive.

## Requirements _(mandatory)_

### Functional Requirements

**Visible-cruft cleanup (User Story 1):**

- **FR-001**: The comment block at `scripts/oss-generate.mjs:45-46` MUST be rewritten to accurately reflect the current code path (no reference to the deleted `enrichLicensesFromNodeModules` helper; the NOASSERTION-on-`scope: optional` policy is referenced where relevant).
- **FR-002**: The comment at `.github/workflows/release.yml:80` MUST reference the workflow file that actually runs the PR-time drift check today (`ci.yml`, not `deploy.yml`).
- **FR-003**: The CI pipeline order documented in CLAUDE.md MUST match the pipeline actually executed by `.github/workflows/ci.yml`. The `npm audit --audit-level=high` step is either added to `ci.yml` (preferred) or removed from CLAUDE.md's "Quality + security pipeline" sequence.
- **FR-004**: The unreachable `scope === 'excluded'` branches at `scripts/oss-check-licenses.mjs:157` and `:180` MUST be removed.
- **FR-005**: The duplication of SBoM, license, coverage, SQI, and UI-test steps between `ci.yml` and `deploy.yml` MUST be resolved by one of: (a) adding an in-file comment in `deploy.yml` explicitly justifying the post-merge backstop role; or (b) trimming the duplicates so each gate runs in exactly one workflow. Status quo (silent duplication) is not acceptable.

**Structural cleanup (User Story 2):**

- **FR-006**: `js/calendar.js` MUST be reduced below the 500-LOC `max-lines` ESLint threshold by extracting cohesive responsibilities into sibling modules with clear single-purpose names (e.g., a toolbar module and an overlays module). Behavior must be unchanged; the UI test suite must remain green.
- **FR-007**: No `window._calendar*` global property assignments MUST remain in `js/`. Cross-callback state MUST use module-scope variables with explicit accessors, or be passed as function parameters. (Verified by `grep -r "window._calendar" js/` returning zero matches.)
- **FR-008**: `fetchTimeEntryById` in `js/redmine-api.js` MUST throw `RedmineError` on failure, consistent with every other method in that module. Every call site MUST be located and updated to either handle the typed error or check the 404 status explicitly.
- **FR-009**: `renderMessage` in `js/chatbot.js` MUST NOT accept caller-supplied raw HTML without internal sanitization. Either the function applies `DOMPurify.sanitize` internally, or its signature changes to accept only already-sanitized DOM nodes.
- **FR-010**: The `@ts-ignore` directive at `js/knowledge.js:10` MUST be removed by adding `@types/node` to `devDependencies`. `tsc --noEmit` MUST continue to pass.
- **FR-011**: Coverage artifacts MUST be regenerated via `npm run test:coverage:all` on this branch. The resulting line-coverage figure MUST be checked against the value cited in CLAUDE.md (≥ 95%); if divergent, CLAUDE.md is updated to the actual value.

**Quality-bar tightening (User Story 3):**

- **FR-012**: The SQI `moduleSize` band in `scripts/sqi.mjs` MUST be tightened so that a significantly oversized file (e.g., 2× the threshold) materially lowers the score compared to a file just over the threshold. Acceptable implementations include: (a) a stricter violation-count band, (b) a score that factors in the worst file's LOC-overage ratio, or (c) a weighted combination.
- **FR-013**: The ESLint config for `scripts/**/*.{js,mjs}` MUST include both `max-lines` and `complexity` rules. Limits MAY be more generous than the `js/**` limits, provided the rationale is captured in an inline comment.
- **FR-014**: The ESLint `max-lines-per-function` rule applied to `js/**/*.js` MUST be tightened to a `max` of 60 (down from the current 80). Every function in `js/**` that exceeds 60 lines after this change MUST be either refactored to comply, OR carry a per-file ESLint override comment with a short justification naming the constraint. The configured limit MUST NOT be silently raised back toward 80.
- **FR-015**: The SQI composite gate MUST be raised so that `scripts/sqi.mjs` exits non-zero when the composite score is below 80 (interpreting the user's "> 80" as the conventional gate boundary ≥ 80; see Assumptions). The `bandFor()` labels in `scripts/sqi.mjs` MUST be updated so the GREEN label aligns with the gate.
- **FR-016**: SQI MUST remain wired as a hard CI failure: a composite score below 80 MUST cause the `ci.yml` and `deploy.yml` workflow runs to fail. No `|| true`-style suppression or `continue-on-error: true` is permitted on the SQI step.
- **FR-017**: Before FR-015 is merged, the actual composite SQI score on this branch MUST be at least 80, with the recorded value attached to the PR description. This guards against the threshold change immediately blocking subsequent unrelated PRs.

**Documentation:**

- **FR-018**: CLAUDE.md's "Quality + security pipeline" paragraph MUST be updated to reflect (a) the new SQI threshold and GREEN band starting at 80, (b) the resolution chosen for FR-003 (audit step location), and (c) the resolution chosen for FR-005 (CI duplication).
- **FR-019**: Any ESLint `disable` directive added to comply with FR-014 MUST include a short justifying comment naming the constraint (e.g., "DOM glue; structural split deferred to follow-up issue #NNN"). Bare `// eslint-disable-next-line` without explanation is not acceptable.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A reviewer reading the diff of SBoM-related files and CI workflows on this branch finds zero stale references to removed helpers or workflow files.
- **SC-002**: Running the cruft audit (grep for TODO / FIXME / HACK / XXX / WORKAROUND markers and the stale-comment patterns from the original review) on this branch returns zero hits in `js/`, `scripts/`, `css/`, `*.html`, `.github/workflows/`, and root config.
- **SC-003**: After the cleanup, every `js/` source file is below the 500-LOC `max-lines` ESLint threshold (the measure FR-006 names) — `npm run lint` reports zero `max-lines` warnings and SQI `moduleSize` scores 100. Specifically, `js/calendar.js` and its two new siblings are each below 500 LOC by raw `wc -l` as well. (An earlier draft measured _all_ files by raw `wc -l`; that proxy contradicts FR-006 and was never satisfiable — `js/redmine-api.js` has exceeded 500 raw lines since well before this feature. The `max-lines` threshold, which skips blank lines and comments, is the project's actual standard.)
- **SC-004**: `grep -r "window._calendar" js/` returns zero matches.
- **SC-005**: Running `npm run sqi` on this branch reports a composite score of at least 80, and `scripts/sqi.mjs` exits with code 0.
- **SC-006**: A deliberate quality regression (e.g., a temporary 100-line function in a pure-logic module) introduced on a throwaway branch causes the next CI run to fail at the SQI step.
- **SC-007**: `npm run lint` produces zero `max-lines-per-function` warnings under the new `max: 60` rule, OR every remaining warning is suppressed by a per-file override comment that names the justifying constraint.
- **SC-008**: `npm run typecheck` (i.e., `tsc --noEmit`) passes with `@ts-ignore` removed from `js/knowledge.js`.
- **SC-009**: A senior developer reading every comment in `scripts/oss-generate.mjs`, `scripts/oss-check-licenses.mjs`, `.github/workflows/ci.yml`, and `.github/workflows/release.yml` finds no reference that disagrees with the current code.
- **SC-010**: Re-running the three handover audits that produced this spec (cruft audit, architecture review, SBoM/CI review) returns "ready for handover" verdicts on each axis with no remaining concerns from the original lists.

## Assumptions

- "Composite SQI gate > 80" is interpreted as **≥ 80**, the conventional gate boundary. If a strictly greater-than reading is preferred, the threshold constant is trivially adjusted; no functional behavior depends on the off-by-one.
- "SQI should fail CI" is interpreted as a strengthening of the current setup: `scripts/sqi.mjs` already exits non-zero below its threshold and `ci.yml` already runs `npm run sqi:json`. The change in this feature is raising the threshold and confirming no suppression has been added; the wire-up itself already exists (CLAUDE.md "Quality + security pipeline").
- Splitting `js/calendar.js` may introduce 2–3 new sibling modules under `js/` (e.g., `js/calendar-toolbar.js`, `js/calendar-overlays.js`) without additional architectural review beyond what this spec defines. The new modules MUST follow the established single-purpose / module-scope-state / no-window-globals pattern.
- The 95% line-coverage figure cited in CLAUDE.md is assumed to still hold; FR-011 verifies this rather than trusting the document.
- Adding `@types/node` to `devDependencies` is the only dependency change in this feature. Per CLAUDE.md, any dependency change requires `npm run oss:generate` to refresh the committed SBoM and attributions artifacts; this regeneration is part of FR-010's acceptance.
- `fetchTimeEntryById` is assumed to have a small number of callers (≤ 3 based on a quick grep at audit time). If significantly more callers depend on the silent-null contract, FR-008 may be reduced to "document the contract clearly in JSDoc" instead of throwing — but only after concrete evidence in the implementation phase, not preemptively.
- The CI gate duplication decision under FR-005 is left to the implementor's judgment between the two acceptable resolutions; there is no a priori preferred outcome. Defense-in-depth justification and trim-the-duplicates are equally valid.
- The audit findings referenced by FR-001 through FR-005 and FR-006 through FR-011 are exhaustive for this feature; the spec deliberately does NOT include unrelated cleanups (e.g., new SQI metrics like jscpd, test framework changes, broader refactors). Out of scope per the user's "cleanup 1-11" framing.
