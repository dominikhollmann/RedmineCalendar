# Implementation Plan: Spec Kit + Claude Workflow Audit

**Branch**: `032-speckit-workflow-audit` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/.specify/features/032-speckit-workflow-audit/spec.md`

## Summary

Audit every divergence the project has accumulated from vanilla Spec Kit + Claude Code defaults; for each, decide **keep / replace / drop** with documented rationale. Land the decisions as concrete config changes in a single PR. Two systemic changes are pre-decided per `/speckit.clarify`: (a) `BACKLOG.md` is replaced by GitHub Issues with full historical migration; (b) Spec Kit upgrades from 0.6.1 → ≥0.8.7 via 3-way merge before keep/replace/drop decisions are finalised. Plugin commitments (`spec-kit-github-issues` for Issues lifecycle; UAT plugin selection) are settled in this plan's Phase 0 research, not in the spec.

## Technical Context

**Language/Version**: Markdown (Spec Kit + audit docs); Bash 5+ (migration script, Spec Kit shell scripts); YAML (`.specify/extensions.yml`, `.github/workflows/`, dependabot.yml); JSON (Claude Code `.claude/settings.json`, `.specify/init-options.json`). No application source-code changes.
**Primary Dependencies**: Spec Kit (vendored, currently 0.6.1, target ≥0.8.7); Claude Code CLI (host runtime); GitHub CLI (`gh` ≥ 2.x for migration script); `git` ≥ 2.30 (for `git merge-file` 3-way merges). Optionally: `spec-kit-github-issues` plugin (decision in Phase 0); a UAT/QA plugin TBD (Phase 0).
**Storage**: GitHub Issues become the canonical feature tracker (replacing `BACKLOG.md`). Issue labels encode lifecycle (`status:specify`, `status:plan`, …, `status:done`) and shipped version (`version:v1.15.4`). No new local persistence; the project already uses git history for feature artifacts (`spec.md`, `plan.md`, `tasks.md`, `quickstart.md`).
**Testing**: Vitest unit suite (existing; not affected). Playwright UI suite (existing; not affected). Migration script gets a small bash test harness (or a manual dry-run mode) since it's run once and idempotently. UAT for this feature is the `quickstart.md` checklist itself — the workflow is self-validating ("does the next feature go through `/speckit.specify` cleanly?").
**Target Platform**: Developer workstation (Linux/macOS, Bash + git + gh installed). GitHub Actions for CI (`unit-tests`, `ui-tests`, `Analyze JavaScript`/CodeQL — already in place). GitHub Issues + Project board (web-app surface for the team).
**Project Type**: Process/tooling change — config files + scripts + documentation. Not a conventional source-code feature; no new modules under `js/`, no UI.
**Performance Goals**: Migration script completes within 10 minutes for ~31 Issues (well under GitHub's 5,000 req/h authenticated limit; primary bound is request latency × N). `/speckit.specify` and other slash commands MUST complete in the same wall-clock time as before the audit (no perceptible regression from new Issue-creation hooks).
**Constraints**: Branch protection on `main` (no direct pushes, PR + CI required). Linear-history requirement (squash merges only). `npm install` requires Node 20 (already pinned in `.nvmrc`). The audit MUST not break in-flight features 022 + 027–031 (FR-012). The 3-way merge of Spec Kit files MUST surface every conflict explicitly per FR-014/FR-015 — no silent overwrites.
**Scale/Scope**: ~31 features to migrate to Issues (6 in-flight + ~25 Done). ~30-50 customization files in scope under `.specify/` and `.claude/` (exact count produced by Phase 0 inventory). One PR for the whole audit (single squash commit on `main`). Estimated net diff ≤ 600 lines of project-owned audit + config changes (excluding vendored Spec Kit upgrade churn — see SC-006).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|---|---|---|
| **I. Redmine API Contract** | N/A | No Redmine integration code is touched. |
| **II. Calendar-First UX** | N/A | No UI / calendar code is touched. |
| **III. Test-First** | Partial — justified | The migration script is the only new executable artifact. It will be developed with a dry-run mode + manual smoke tests rather than a full Vitest harness, because: (a) it's a one-shot operation, (b) idempotency is enforced by checking for existing Issues before creating, (c) the tradeoff matches Constitution IV (simplicity for one-off code). All other changes are config / docs / vendored upstream files — no executable business logic to test. Recorded in Complexity Tracking below. |
| **IV. Simplicity & YAGNI** | ✅ Pass — this is the principle the feature *enacts* | The whole audit is a YAGNI pass on accumulated workflow customizations. No new architectural layers or speculative dependencies are added; the net direction is removal or replacement-with-upstream. Any plugin adopted (Phase 0) MUST justify itself per Q1's adoption framework: it covers ≥80% of need out-of-the-box, otherwise we go vanilla. |
| **V. Security by Default** | ✅ Pass with notes | Migration script uses `gh` CLI auth (already-configured personal token); never echoes the token in logs or commits. GitHub Actions workflows for Issue lifecycle use `GITHUB_TOKEN` (managed by Actions, not a long-lived PAT). No new credential storage in browser or app code. CodeQL + Dependabot security updates remain enabled (configured in PR #20/#21–#25/#30). |

**Gate result: PASS** — proceed to Phase 0. The Test-First partial is documented in Complexity Tracking and is not a violation requiring blocking.

## Project Structure

### Documentation (this feature)

```text
.specify/features/032-speckit-workflow-audit/
├── plan.md                             # This file (/speckit.plan command output)
├── research.md                         # Phase 0 output — plugin evaluations + upgrade-cmd check + customization inventory
├── data-model.md                       # Phase 1 output — Customization, AuditInventory, ExtensionEvaluation, Issue schemas
├── quickstart.md                       # Phase 1 output — UAT checklist (validates the new workflow runs end-to-end)
├── contracts/
│   ├── github-issue-schema.md          # Issue title/body/label format for migrated + new features
│   └── spec-kit-extensions-yml.md      # Final shape of .specify/extensions.yml after audit
├── spec.md                             # Locked
├── checklists/requirements.md          # Locked (all items ✅)
└── tasks.md                            # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

This feature changes process/tooling files, not application source. The "delivered structure" looks like:

```text
.specify/                              # Spec Kit (vendored)
├── extensions.yml                     # MODIFIED — hooks list possibly trimmed per audit decisions
├── feature.json                       # Touched per feature (no permanent change)
├── init-options.json                  # MODIFIED — speckit_version bumped to ≥0.8.7
├── memory/constitution.md             # Possibly minor wording update if branch policy text changes
├── scripts/bash/                      # 3-way merged with vanilla 0.8.7
├── templates/                         # 3-way merged with vanilla 0.8.7
└── features/032-speckit-workflow-audit/   # The audit lives here

.claude/                               # Claude Code config
├── commands/                          # /speckit.* slash commands; some may be removed in favor of community plugins
│   ├── speckit.specify.md             # MODIFIED if Issues lifecycle adds a step
│   └── speckit.uat.md                 # MODIFIED — drop local merge step, add PR-comment step
└── settings.json                      # MODIFIED — PreToolUse hook decision per FR-007

.github/                               # GitHub config
├── ISSUE_TEMPLATE/feature.yml         # NEW — feature Issue template matching contracts/github-issue-schema.md
├── workflows/issue-lifecycle.yml      # NEW — closes Issue when its PR merges; adds status:* labels on /speckit.* triggers
└── (existing workflows unchanged: deploy.yml, codeql.yml, ci.yml)

scripts/
└── migrate-backlog-to-issues.mjs      # NEW — one-shot migration: reads BACKLOG.md, creates ~31 Issues via gh CLI

CONTRIBUTING.md                        # MODIFIED — reflect Issue-driven workflow + branch protection + PR-only flow
CLAUDE.md                              # MODIFIED — drop BACKLOG.md references; describe Issue-driven flow
README.md                              # Likely unchanged (admin/dev/maintainer sections still apply)
BACKLOG.md                             # DELETED after migration completes successfully
```

**Structure Decision**: This is a **process/tooling change**, not a conventional source-code feature. No new files under `js/`, no new tests under `tests/unit/` or `tests/ui/`. Changes are concentrated in `.specify/`, `.claude/`, `.github/`, `scripts/`, and root markdown. The single new executable artifact (`scripts/migrate-backlog-to-issues.mjs`) is a one-shot migration tool, gated behind a `--dry-run` flag for safe inspection before live execution.

## Complexity Tracking

| Violation / partial | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Test-First partial (no automated tests for `migrate-backlog-to-issues.mjs`) | One-shot migration; idempotent via existing-Issue check; dry-run mode covers the smoke test | A full Vitest harness for a script that runs once contradicts Constitution IV (simplicity). Manual dry-run + idempotent re-run is the right ergonomic for one-shot tooling. |
| New transitive dependency (`spec-kit-github-issues` plugin, *if adopted in Phase 0*) | Offloads BACKLOG-row → Issue lifecycle to upstream maintainers; reduces our scripting surface | Vanilla GitHub Issues + a custom workflow would require us to maintain the lifecycle glue ourselves. Adopt only if Phase 0 confirms ≥80% out-of-the-box fit per Q1 adoption framework; otherwise fall back to vanilla. |
| Spec Kit version bump in same PR | Per FR-013 + Q4: the audit MUST sequence the bump first so divergences are measured against the new baseline | A separate PR for the bump alone would split the audit's review across two PRs and risk the post-bump audit being deferred indefinitely. SC-006 explicitly excludes the bump churn from the project-owned line budget so review attention isn't drowned out. |
