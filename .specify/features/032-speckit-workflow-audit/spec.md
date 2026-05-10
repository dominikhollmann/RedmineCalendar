# Feature Specification: Spec Kit + Claude Workflow Audit

**Feature Branch**: `032-speckit-workflow-audit`
**Created**: 2026-05-10
**Status**: Draft
**Input**: User description: "Audit and align the project's spec-kit + Claude customizations against vanilla and community extensions. Decide for each customization (BACKLOG.md workflow, UAT phase, PreToolUse hook, custom scripts, etc.) whether to keep, replace with a community plugin like spec-kit-github-issues or spec-kit-qa, or drop entirely. Land the decisions as concrete config changes in a single PR."

## Background and motivation

Over the lifetime of the RedmineCalendar project, the workflow has accumulated bespoke customizations layered on top of vanilla Spec Kit and Claude Code: a custom `BACKLOG.md` tracker with rich workflow rules, a project-specific `/speckit.uat` skill that auto-merges to `main`, a `PreToolUse` hook in `.claude/settings.json` that gates `git commit` on branch + path, modified `create-new-feature.sh` behaviour, and a custom branch policy ("specs on main, code on branches") encoded across multiple files.

These customizations served a real purpose at the time, but the project is about to be handed to an external development team. Two pressures motivate revisiting them now:

1. **Maintenance surface.** Every divergence from vanilla is a thing the team must learn, debug, and maintain. Where a community plugin does the same job (`spec-kit-github-issues`, `spec-kit-qa`), adopting it offloads that maintenance to upstream.
2. **Workflow consistency.** Branch protection on `main` was just enabled. Several customizations predate it (e.g. the `/speckit.uat` auto-merge, the "specs on main" policy) and now conflict with the server-enforced rules. The conflicting bits must be reconciled regardless.

This feature is an **audit + decision exercise**. The deliverable is a documented set of keep/replace/drop decisions plus the concrete config changes that implement them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Replace BACKLOG.md with GitHub Issues (Priority: P1)

The maintainer (and later the development team) tracks features, status, and version per feature without the custom `BACKLOG.md` table. GitHub Issues — augmented by a community Spec Kit plugin if one fits — becomes the single source of truth, displaying the same lifecycle the table currently encodes (`specify → clarify → plan → tasks → implement → uat → done`).

**Why this priority**: `BACKLOG.md` is the highest-touch customization. Every Spec Kit step that mentions it adds bespoke logic. Replacing it eliminates a large chunk of the workflow's surface area at one stroke. It is also the change most visibly aligned with "professional team workflow."

**Independent Test**: After implementation, opening a new feature via `/speckit.specify` creates a corresponding GitHub Issue with the right labels/status; merging the feature's PR closes it. The maintainer can answer "what features are in flight?" by looking at the Issues board, with no `BACKLOG.md` consulted.

**Acceptance Scenarios**:

1. **Given** GitHub Issues replaces `BACKLOG.md`, **When** the maintainer runs `/speckit.specify "new feature"`, **Then** an Issue is created with status `specify done` and a link to the spec file.
2. **Given** an in-flight feature (e.g. 022) has a BACKLOG row but no Issue, **When** migration runs, **Then** an Issue is created carrying the same lifecycle state.
3. **Given** PR #N implements a feature, **When** the PR merges, **Then** the corresponding Issue is closed automatically (via `Closes #M` or equivalent).
4. **Given** all migration is complete, **When** the maintainer opens the repository, **Then** `BACKLOG.md` either no longer exists or carries a clear "see GitHub Issues" pointer with the table archived.

---

### User Story 2 — Reconcile the UAT phase with branch protection (Priority: P1)

The `/speckit.uat` skill no longer attempts the local `git checkout main && git merge && git push` flow that branch protection now blocks. UAT completes by opening or updating a Pull Request, leaving the actual merge to the GitHub UI (or `gh pr merge` once a separate human approves it). The bespoke UAT step either keeps its current value (interactive walkthrough of `quickstart.md`, status tracking) or is replaced by a community extension that does the same.

**Why this priority**: Today the skill's final step will fail outright on any feature that touches application code (every code feature). It is broken-in-place. Independently of the audit decisions, this must be fixed for the workflow to function under the new server rules.

**Independent Test**: Run `/speckit.uat` against a completed feature branch; the skill walks through `quickstart.md`, marks items as the user confirms, and ends with a PR open and ready for human merge — never touching `main` locally.

**Acceptance Scenarios**:

1. **Given** all `quickstart.md` items pass and a PR exists, **When** UAT finishes, **Then** the skill posts a UAT-passed comment on the PR and tells the user to merge via GitHub.
2. **Given** all items pass but no PR exists, **When** UAT finishes, **Then** the skill creates a PR via `gh pr create` and reports the URL.
3. **Given** a UAT item fails, **When** the user reports the failure, **Then** the skill records the failure in `quickstart.md`, does NOT open or update a PR, and lists what must be fixed.
4. **Given** the community `spec-kit-qa` extension is evaluated, **When** the audit concludes, **Then** the spec records whether it replaces the bespoke skill, supplements it, or is rejected with reasons.

---

### User Story 3 — Audit and decide on remaining customizations (Priority: P2)

For each remaining divergence from vanilla Spec Kit + Claude Code (the `PreToolUse` hook, `PostToolUse` test-runner hook, the disabled `before_specify` git.feature hook, custom `create-new-feature.sh` flags like `--no-branch`, the `branch policy` rule, the speckit policy guard added in PR #12, ESLint i18n regression rule, project knowledge files, etc.), the maintainer records a deliberate keep/replace/drop decision with rationale.

**Why this priority**: Most of these are smaller and individually optional. The audit is still required so that nothing surprises the receiving team — every customization is either explicitly justified or removed. Lower priority than the two systemic changes above because the workflow is functional either way.

**Independent Test**: After the audit document is produced, every file in `.specify/` and `.claude/` that diverges from a freshly-installed vanilla Spec Kit + Claude Code project is referenced in the audit, with a recorded decision and rationale.

**Acceptance Scenarios**:

1. **Given** the audit table is produced, **When** the maintainer reviews it, **Then** every file diff between this repo and a vanilla `specify init` baseline is listed exactly once.
2. **Given** a customization is decided "keep", **When** the team takes over, **Then** they can find the rationale in the audit document and a pointer in CONTRIBUTING.md.
3. **Given** a customization is decided "drop", **When** the implementation lands, **Then** the file/section is gone and no other code references it.
4. **Given** a customization is decided "replace with community extension", **When** the implementation lands, **Then** the community extension is configured and the bespoke version removed.

---

### Edge Cases

- **In-flight features (022, 027–031) during migration.** What happens to their BACKLOG rows when BACKLOG.md is retired? Do they get GitHub Issues created retroactively, or only new features going forward?
- **History preservation.** `BACKLOG.md` carries the verified-version column for ~25 done features. Does that history move to GitHub Issues, or is it archived in a separate `BACKLOG-archive.md` for git-blame purposes?
- **Plugin availability.** What if `spec-kit-github-issues` doesn't support Claude Code (it may be CLI-only) or doesn't match the project's Spec Kit version? The audit must capture compatibility status, not just feature fit.
- **Solo-dev convenience vs. team-friendly defaults.** Some customizations (e.g. the auto-commit `after_*` hooks) are nice for solo work but noisy in a team setting. The audit must explicitly choose which audience the workflow optimises for.
- **CI integration.** Several decisions (closing Issues on merge, posting UAT results to PR comments) imply GitHub Actions changes. The audit must flag any required CI workflow updates.
- **Rollback.** If a "drop" or "replace" decision turns out wrong post-handover, can the team revert easily? The audit should note reversibility for each decision.
- **Spec Kit version drift.** The project is pinned to Spec Kit 0.6.1 but 0.8.7 is current. The bump itself overwrites vanilla files (templates, scripts, command markdown), which collides with our local edits. The audit must sequence: (a) inventory current divergences against 0.6.1, (b) bump to 0.8.7 and re-inventory against the new baseline, (c) re-classify each surviving divergence — some may turn into "drop" because 0.8.7 ships them upstream, others may turn into "keep" because 0.8.7 still doesn't cover them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The audit MUST inventory every file under `.specify/` and `.claude/` that differs from a freshly-initialised vanilla Spec Kit + Claude Code project of the same versions.
- **FR-002**: For each divergence, the audit MUST record one of three decisions — `keep`, `replace`, or `drop` — with a one-paragraph rationale.
- **FR-003**: For every `replace` decision, the audit MUST identify the community extension (or upstream feature) being adopted, including its repository URL and version compatibility note.
- **FR-004**: The audit MUST evaluate at minimum the following candidate community extensions: `spec-kit-github-issues` (https://github.com/Fatima367/spec-kit-github-issues) and `spec-kit-qa` (https://github.com/arunt14/spec-kit-qa). Other extensions surfaced during the audit MAY also be evaluated.
- **FR-005**: `BACKLOG.md` MUST either remain (with a documented reason) or be replaced; if replaced, every in-flight feature row MUST have a corresponding GitHub Issue created carrying the equivalent lifecycle state, and historical (Done section) rows MUST be either migrated as closed Issues or archived in a separate file.
- **FR-006**: `/speckit.uat` MUST function end-to-end under branch protection: no step may attempt `git push origin main` or otherwise rely on direct writes to a protected branch.
- **FR-007**: The `PreToolUse` hook in `.claude/settings.json` MUST have a recorded decision (keep / drop / tighten) explicitly justified relative to server-side branch protection.
- **FR-008**: All decisions MUST land in a single PR against `main`, gated by the standard CI checks (`unit-tests`, `ui-tests`, `Analyze JavaScript`).
- **FR-009**: `CONTRIBUTING.md` MUST be updated to reflect the final workflow; reading it alone (plus README and CLAUDE.md) MUST be sufficient for a new developer to understand how features flow from idea to merged PR.
- **FR-010**: The audit document itself MUST persist in the repository (as `research.md` or equivalent under the feature directory) so that future divergences can be evaluated against the same baseline.
- **FR-011**: Every customization decided as `keep` MUST have a brief justification in CONTRIBUTING.md or CLAUDE.md (whichever is the natural home), so the team is not surprised by it.
- **FR-012**: The PR MUST NOT delete or rename files in ways that break in-flight features (022, 027–031) without an explicit migration step in the implementation plan.
- **FR-013**: Spec Kit MUST be upgraded from the currently-pinned `0.6.1` to the latest stable release at the time of implementation (≥ `0.8.7` as of 2026-05-10). The upgrade MUST be sequenced before the keep/replace/drop decisions are finalised, because the new vanilla baseline changes which customizations are still divergent. `.specify/init-options.json` MUST be updated to record the new version.
- **FR-014**: For every file that the Spec Kit upgrade overwrites where this project had local edits, the audit MUST record one of three resolutions — `accept upstream` (drop our edit), `re-apply ours` (keep our edit on top of new upstream), or `extension hook` (move the edit out of the vendored Spec Kit file into a configured extension). No silent loss of local edits.

### Key Entities *(include if feature involves data)*

- **Customization**: A single file, hook, script, command, or convention that diverges from vanilla. Attributes: location (path), current behaviour, vanilla baseline, decision (keep/replace/drop), rationale, replacement target (if any), reversibility note.
- **Audit Inventory**: The complete set of customizations. Attributes: total count, breakdown by decision, breakdown by category (`.claude/` vs `.specify/` vs root file).
- **Community Extension Evaluation**: A single candidate plugin. Attributes: name, URL, version compatibility, scope of customization it covers, gaps versus our current behaviour, recommendation (adopt / partial-adopt / reject).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Bespoke files under `.specify/` and `.claude/` either reduce in count by at least 30% from the audit's baseline, **or** every retained customization carries a written justification in the audit document. (Either count goes down, or every divergence is explicitly defended.)
- **SC-002**: A new developer can produce, ship, and close a one-line feature end-to-end (open a PR, satisfy CI, merge, see issue closed) using only README + CONTRIBUTING + CLAUDE.md as documentation, without reading any custom script source.
- **SC-003**: 100% of the customizations identified in the audit have a recorded decision; 0% remain "TBD" at the time the PR opens.
- **SC-004**: After the PR merges, every Spec Kit slash command (`/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`, `/speckit.uat`) runs end-to-end against the *next* feature without any step failing because of branch protection or a broken assumption from the old workflow.
- **SC-007**: `.specify/init-options.json` reports a `speckit_version` ≥ `0.8.7`, and a fresh `/speckit.specify "test"` against that version produces the spec scaffolding the new version expects (no warnings about deprecated templates or removed fields).
- **SC-005**: The maintainer can answer "where do I report a bug, request a feature, see what's in flight, see what shipped in v1.x.x" with one source per question (no "look in BACKLOG.md *and* GitHub Issues *and* the spec folder").
- **SC-006**: Excluding the Spec Kit version-bump churn (vendored upstream files), the PR adds at most ~600 lines net of project-owned audit + config changes, and ideally removes more than it adds. The version bump itself is reviewed separately as a single commit so the audit work isn't lost in the noise.

## Assumptions

- **The team will use GitHub** as their primary collaboration surface (Issues, PRs, Actions) rather than Linear/Jira/etc. If they would prefer a different tracker, this changes US1 substantially.
- **Vanilla Spec Kit version 0.8.7** (latest stable as of 2026-05-10) is the **target** comparison baseline. The project is currently on `0.6.1`; FR-013 mandates the bump as part of this feature, and the audit's "vanilla baseline" is measured against `0.8.7` (not `0.6.1`) so we don't lock in customizations that the new version makes redundant.
- **Vanilla Claude Code defaults** as of the `claude-code` CLI's most recent release are the comparison baseline for `.claude/` customizations.
- **Community extensions evaluated must be compatible** with the project's Spec Kit version and the Claude Code integration model (`integration: claude` in `init-options.json`); incompatible plugins are rejected even if feature-fit is good.
- **Branch protection on `main`** is permanent — no decision in this audit may rely on bypassing it.
- **In-flight features** (022, 027–031) are NOT renumbered or restructured by this work; they continue under whichever workflow is in place when they were started, and only future features get the new flow if breaking changes are needed for migration safety.
- **`spec-kit-github-issues` is the leading candidate** for replacing `BACKLOG.md` based on the maintainer's research; if evaluation reveals it does not fit, a vanilla GitHub Issues + Project board approach (no plugin) is the fallback.
- **`spec-kit-qa` is the leading candidate** for replacing the bespoke `/speckit.uat` skill; same fallback applies (vanilla Spec Kit + a PR-comment convention).
- **The audit ITSELF lands as a single PR** to keep review focused; if the decision space turns out larger than anticipated, the spec may be re-scoped to multiple sequential PRs in `/speckit.plan`.
- **The squash-merge default** (now configured at the repo level) means each Spec Kit step's auto-commits inside this branch will collapse into one commit on `main` — the granular history is preserved on the branch and PR for review, but `main` sees a single audit commit.
