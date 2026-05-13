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

## Clarifications

### Session 2026-05-10

- Q: For BACKLOG.md replacement, what's our adoption stance? → A: Locked-in: BACKLOG.md will be replaced by GitHub Issues. (Plugin choice — `spec-kit-github-issues` vs vanilla GitHub Issues + Actions — is decided in `/speckit.plan` after evaluation.)
- Q: For `/speckit.uat` plugin evaluation, what's the adoption stance? → A: Defer to `/speckit.plan`; broaden the candidate search beyond `spec-kit-qa` to include other Spec-Kit-compatible UAT/QA extensions discovered during research.
- Q: How are in-flight + historical features migrated to GitHub Issues? → A: Retroactive for both in-flight (~6: 022 + 027–031) AND already-Done (~25). Full history mirrored as Issues; closed Issues for done features carry status + version labels. BACKLOG.md is removed entirely (no archive file needed since Issues are the canonical record).
- Q: How is the Spec Kit version bump (0.6.1 → ≥0.8.7) carried out? → A: 3-way merge per file. Fetch vanilla 0.6.1 (base) + vanilla 0.8.7 (theirs) + our `.specify/` (ours), then run `git merge-file` per overlapping file. Conflicts surface explicitly per FR-014. (If `specify` ships an upgrade subcommand at 0.8.7, `/speckit.plan` may substitute it as long as it produces equivalent per-file conflict visibility.)
- Q: What's the audit's overall completion strategy? → A: Balanced. Drop customizations where ongoing maintenance cost > value delivered; keep + justify the rest. No overall % target — SC-001's 30% reduction becomes a signal that the audit was honest, not a goal to game. Per-customization judgment.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Replace BACKLOG.md with GitHub Issues (Priority: P1)

The maintainer (and later the development team) tracks features, status, and version per feature without the custom `BACKLOG.md` table. GitHub Issues — augmented by a community Spec Kit plugin if one fits, otherwise vanilla GitHub Issues + GitHub Actions — becomes the single source of truth, displaying the same lifecycle the table currently encodes (`specify → clarify → plan → tasks → implement → uat → done`). **The BACKLOG.md replacement itself is decided; only the implementation choice (plugin vs vanilla) is open and will be settled in `/speckit.plan`.**

**Why this priority**: `BACKLOG.md` is the highest-touch customization. Every Spec Kit step that mentions it adds bespoke logic. Replacing it eliminates a large chunk of the workflow's surface area at one stroke. It is also the change most visibly aligned with "professional team workflow."

**Independent Test**: After implementation, opening a new feature via `/speckit.specify` creates a corresponding GitHub Issue with the right labels/status; merging the feature's PR closes it. The maintainer can answer "what features are in flight?" by looking at the Issues board, with no `BACKLOG.md` consulted.

**Acceptance Scenarios**:

1. **Given** GitHub Issues replaces `BACKLOG.md`, **When** the maintainer runs `/speckit.specify "new feature"`, **Then** an Issue is created with status `specify done` and a link to the spec file.
2. **Given** an in-flight feature (e.g. 022) has a BACKLOG row but no Issue, **When** migration runs, **Then** an Issue is created carrying the same lifecycle state.
3. **Given** PR #N implements a feature, **When** the PR merges, **Then** the corresponding Issue is closed automatically (via `Closes #M` or equivalent).
4. **Given** all migration is complete, **When** the maintainer opens the repository, **Then** `BACKLOG.md` no longer exists (per FR-005 + Q3 clarification — Issues are the canonical record, no archive file).

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

- **In-flight features (022, 027–031) during migration.** _(Resolved by Q3 clarification: retroactive Issues for both in-flight and Done; see FR-005.)_
- **History preservation.** _(Resolved by Q3 clarification: ~25 Done features get closed Issues with `status:done` + `version:vX.Y.Z` labels; BACKLOG.md is removed.)_
- **Bulk Issue creation rate limits.** Migration creates ~30 Issues. GitHub REST API rate-limits to 5,000 authenticated requests/hour, well within budget, but the migration script SHOULD batch with a small delay between calls to avoid secondary abuse-detection limits, and MUST be re-runnable / idempotent in case of partial failure (e.g. by checking for an existing Issue with a matching title or label before creating).
- **Plugin availability.** What if `spec-kit-github-issues` doesn't support Claude Code (it may be CLI-only) or doesn't match the project's Spec Kit version? The audit must capture compatibility status, not just feature fit.
- **Solo-dev convenience vs. team-friendly defaults.** Some customizations (e.g. the auto-commit `after_*` hooks) are nice for solo work but noisy in a team setting. The audit must explicitly choose which audience the workflow optimises for.
- **CI integration.** Several decisions (closing Issues on merge, posting UAT results to PR comments) imply GitHub Actions changes. The audit must flag any required CI workflow updates.
- **Rollback.** If a "drop" or "replace" decision turns out wrong post-handover, can the team revert easily? The audit should note reversibility for each decision.
- **Spec Kit version drift.** The project is pinned to Spec Kit 0.6.1 but 0.8.7 is current. The bump itself overwrites vanilla files (templates, scripts, command markdown), which collides with our local edits. The audit must sequence: (a) inventory current divergences against 0.6.1, (b) bump to 0.8.7 and re-inventory against the new baseline, (c) re-classify each surviving divergence — some may turn into "drop" because 0.8.7 ships them upstream, others may turn into "keep" because 0.8.7 still doesn't cover them.
- **Folder-layout realignment.** The project currently keeps feature directories under `.specify/features/<NNN>/` instead of vanilla `specs/<NNN>/`. Reverting to vanilla per FR-016 is mechanically simple (`git mv`) but touches every cross-reference. The audit's chosen sequencing is to perform the rename late (Phase 5d, after migration); a brief window exists where ~31 newly-migrated GitHub Issues link to a `specs/` path that does not yet exist on the feature branch. The window closes when the PR merges. The trade-off is documented in `tasks.md` Phase 5d and accepted; alternative sequencings (rename before migration, or post-migration Issue-body sweep) were considered and rejected for implementation simplicity.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The audit MUST inventory every file under `.specify/` and `.claude/` that differs from a freshly-initialised vanilla Spec Kit + Claude Code project of the same versions.
- **FR-002**: For each divergence, the audit MUST record one of three decisions — `keep`, `replace`, or `drop` — with a one-paragraph rationale.
- **FR-003**: For every `replace` decision, the audit MUST identify the community extension (or upstream feature) being adopted, including its repository URL and version compatibility note.
- **FR-004**: The audit MUST evaluate at minimum the following candidate community extensions: `spec-kit-github-issues` (https://github.com/Fatima367/spec-kit-github-issues) and `spec-kit-qa` (https://github.com/arunt14/spec-kit-qa). The `/speckit.plan` research step MUST also broaden the search for additional Spec-Kit-compatible UAT / QA extensions (e.g. by searching the Spec Kit ecosystem) and include any meaningful candidates in the evaluation. Compatibility with Claude Code integration + Spec Kit ≥ 0.8.7 is a hard prerequisite for any plugin considered.
- **FR-005**: `BACKLOG.md` MUST be replaced by GitHub Issues. Every feature currently in `BACKLOG.md` — both in-flight (022 + 027–031, ~6 total) and already-Done (~25 total) — MUST have a corresponding GitHub Issue created during migration. Done-feature Issues are created in the closed state and carry labels recording their final status and shipped version (e.g. `status:done`, `version:v1.15.4`). After migration completes successfully, `BACKLOG.md` is removed from the repository (no archive file is needed; Issues are the canonical record). The choice between adopting `spec-kit-github-issues` (or another community extension) versus a vanilla GitHub Issues + Actions implementation is made in `/speckit.plan`.
- **FR-006**: `/speckit.uat` MUST function end-to-end under branch protection: no step may attempt `git push origin main` or otherwise rely on direct writes to a protected branch.
- **FR-007**: The `PreToolUse` hook in `.claude/settings.json` MUST have a recorded decision (keep / drop / tighten) explicitly justified relative to server-side branch protection.
- **FR-008**: All decisions MUST land in a single PR against `main`, gated by the standard CI checks (`unit-tests`, `ui-tests`, `Analyze JavaScript`).
- **FR-009**: `CONTRIBUTING.md` MUST be updated to reflect the final workflow; reading it alone (plus README and CLAUDE.md) MUST be sufficient for a new developer to understand how features flow from idea to merged PR.
- **FR-010**: The audit document itself MUST persist in the repository (as `research.md` or equivalent under the feature directory) so that future divergences can be evaluated against the same baseline.
- **FR-011**: Every customization decided as `keep` MUST have a brief justification in CONTRIBUTING.md or CLAUDE.md (whichever is the natural home), so the team is not surprised by it.
- **FR-012**: The PR MUST NOT delete or rename files in ways that break in-flight features (022, 027–031) without an explicit migration step in the implementation plan.
- **FR-013**: Spec Kit MUST be upgraded from the currently-pinned `0.6.1` to the latest stable release at the time of implementation (≥ `0.8.7` as of 2026-05-10). The upgrade MUST be sequenced before the keep/replace/drop decisions are finalised, because the new vanilla baseline changes which customizations are still divergent. `.specify/init-options.json` MUST be updated to record the new version.
- **FR-014**: For every file that the Spec Kit upgrade overwrites where this project had local edits, the audit MUST record one of three resolutions — `accept upstream` (drop our edit), `re-apply ours` (keep our edit on top of new upstream), or `extension hook` (move the edit out of the vendored Spec Kit file into a configured extension). No silent loss of local edits.
- **FR-015**: The Spec Kit upgrade MUST be carried out via the 3-way merge methodology (vanilla 0.6.1 = base, our `.specify/` = ours, vanilla 0.8.7 = theirs; `git merge-file` per overlapping file). Conflicts surface explicitly per file so FR-014 resolutions are visible at review time. If the `specify` CLI at 0.8.7 ships an official upgrade subcommand, `/speckit.plan` MAY substitute it provided the substitute produces equivalent per-file conflict visibility (i.e. no silent file overwrites).
- **FR-016**: All feature directories MUST live at the vanilla Spec Kit path `specs/<NNN>-name/` (not the current `.specify/features/<NNN>-name/`). The 31 existing feature directories MUST be relocated via `git mv` in a single commit so per-file history follows. The `SPECS_DIR` constant in `.specify/scripts/bash/common.sh` and `.specify/scripts/bash/create-new-feature.sh` MUST `accept-upstream` during Phase 2's 3-way merge so the runtime path matches the on-disk layout. Cross-cutting path references (CLAUDE.md, CONTRIBUTING.md, README.md, every spec/plan/tasks markdown, the migration script's Issue-body template, the `contracts/github-issue-schema.md` example link) MUST be updated in the same PR. The stray `github-workflows/` directory at repo root MUST be reconciled with `.github/workflows/` (deduplicated or deleted) and the decision recorded in `research.md`.

### Key Entities _(include if feature involves data)_

- **Customization**: A single file, hook, script, command, or convention that diverges from vanilla. Attributes: location (path), current behaviour, vanilla baseline, decision (keep/replace/drop), rationale, replacement target (if any), reversibility note.
- **Audit Inventory**: The complete set of customizations. Attributes: total count, breakdown by decision, breakdown by category (`.claude/` vs `.specify/` vs root file).
- **Community Extension Evaluation**: A single candidate plugin. Attributes: name, URL, version compatibility, scope of customization it covers, gaps versus our current behaviour, recommendation (adopt / partial-adopt / reject).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Per the Q5 clarification, the audit follows a balanced strategy: every customization in scope receives a per-item judgment (keep / replace / drop) based on whether its ongoing maintenance cost exceeds the value it delivers. Both arms must hold: (a) every dropped or replaced customization actually disappears in the implementation, and (b) every retained customization carries a written justification in the audit document. The historical "30% file-count reduction" target is retained as an honesty signal — if the final reduction is ≪ 30%, the audit document MUST state explicitly why so few items were dropped (e.g. "most customizations earn their keep") rather than masking the result.
- **SC-002**: A new developer can produce, ship, and close a one-line feature end-to-end (open a PR, satisfy CI, merge, see issue closed) using only README + CONTRIBUTING + CLAUDE.md as documentation, without reading any custom script source.
- **SC-003**: 100% of the customizations identified in the audit have a recorded decision; 0% remain "TBD" at the time the PR opens.
- **SC-004**: After the PR merges, every Spec Kit slash command (`/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`, `/speckit.uat`) runs end-to-end against the _next_ feature without any step failing because of branch protection or a broken assumption from the old workflow.
- **SC-007**: `.specify/init-options.json` reports a `speckit_version` ≥ `0.8.7`, and a fresh `/speckit.specify "test"` against that version produces the spec scaffolding the new version expects (no warnings about deprecated templates or removed fields).
- **SC-005**: The maintainer can answer "where do I report a bug, request a feature, see what's in flight, see what shipped in v1.x.x" with one source per question (no "look in BACKLOG.md _and_ GitHub Issues _and_ the spec folder").
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
