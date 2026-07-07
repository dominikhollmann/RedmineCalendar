# Quickstart UAT: Spec Kit Toolchain Upgrade (0.9.3 → 0.12.4)

**Feature**: 056 | **Audience**: Maintainer verifying the bump landed cleanly and the `/speckit-*` pipeline still works

Per the 2026-07-06 clarification, this feature's own remaining phases (`/speckit-tasks` → `/speckit-implement` → `/speckit-uat-run`) double as the US1 pipeline-verification test — there is no separate throwaway feature. This checklist is what `/speckit-uat-run` walks through.

## Prerequisites

- [x] Working tree is clean (`git status` reports nothing) before UAT starts.
- [x] `jq` is available (`jq --version`) — used by several checks below.

## Scenario 1 — Version bump landed correctly (FR-001, SC-002)

- [x] `jq -r '.speckit_version' .specify/init-options.json` prints `0.12.4` (or a newer stable release if one shipped since this spec was written, per the Assumptions section).
- [x] `jq -r '.feature_numbering // "MISSING"' .specify/init-options.json` prints `sequential` (not `MISSING` — confirms the `branch_numbering` → `feature_numbering` rename landed).

## Scenario 2 — Breaking-change touchpoints verified, not assumed (FR-003, FR-004, SC-004)

- [x] `data-model.md`'s "Breaking Change Touchpoint" table has an explicit affected/not-affected verdict for both the git-extension-opt-in change and the extension-manifest schema change (open the file and confirm neither row says "assumed" or is blank).
- [x] `grep -n "speckit.git.validate" .specify/extensions/uat/commands/run.md` returns a match (confirms the UAT branch-validation fix landed).

## Scenario 3 — Vendored-file ledger is complete (FR-005, SC-003)

- [x] `data-model.md`'s "Vendored File Conflict" table lists every file this project had locally edited before the bump, each with a resolution (`accept upstream` / `keep ours` / `moved to extension`) — spot-check by opening the file, no unresolved rows.
- [x] `.specify/extensions/feature-tracker/` and `.specify/extensions/publish/` are untouched by this feature (`git diff main -- .specify/extensions/feature-tracker .specify/extensions/publish` is empty), confirming FR-006.

## Scenario 4 — This feature's own pipeline ran clean end-to-end (FR-002, US1, SC-001)

- [ ] `/speckit-plan` (this plan) completed with the `before_plan` (`speckit.git.rebase-check`) hook firing and the `after_plan` hooks (`feature-tracker.update-status`, `publish.run`, `agent-context.update`) all completing without error — check the session transcript / PR history for this feature.
- [ ] `/speckit-tasks` completed with its `before_tasks`/`after_tasks` hooks firing without error.
- [ ] `/speckit-implement` completed with its `before_implement`/`after_implement` hooks firing without error, including `speckit.git.test` (unit + UI suites) passing.
- [ ] This `/speckit-uat-run` itself is running — i.e., you're reading this via the UAT skill, which itself depends on `check-prerequisites.sh` (post-bump core script) + the `speckit.git.validate` fix from Scenario 2 working correctly.

## Scenario 5 — New-feature-candidate decisions are recorded and none are half-adopted (FR-007, FR-008, SC-005)

- [ ] `research.md`'s "New Feature Candidates" table has a decision for at least: label-driven bug-fix/bug-test workflows, the `init` workflow step type, and `/analyze` in a forked subagent.
- [ ] For every row decided "adopt" (if any), the corresponding config change is present in this PR's diff. _(Expected: none are "adopt" in this bump — verify no partial/dead config exists for any deferred/rejected item, e.g. no stray `.github/workflows/bug-fix.md`.)_

## Scenario 6 — In-flight branch impact documented (FR-009, SC-006)

- [ ] The PR description states that `055-booking-modal-redesign` was already merged to `main` before this bump landed (verified in research.md), so no other branch needs a rebase call-out.

## Scenario 7 — Standard CI gate passes unmodified (FR-010)

- [ ] The PR's CI run is green: `npm audit`, `lint/format/htmlhint/typecheck`, `knowledge:check`, `dup:check`, `oss:drift`/`oss:licenses`, `test:coverage`, `sqi:json`, `test:ui` — all pass (expected trivially, since no `js/`/`css`/`html` file changes).

## Scenario 8 — Decision ledger persisted (FR-011)

- [ ] `specs/056-update-spec-kit/research.md` is committed and contains the full breaking-change + vendored-file + new-feature-candidate ledger (not just this quickstart's summary).
