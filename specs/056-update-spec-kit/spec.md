# Feature Specification: Spec Kit Toolchain Upgrade (0.9.3 → latest)

**Feature Branch**: `056-update-spec-kit`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "github iss #293 — Update the vendored Spec Kit toolchain to the latest version. Particularly this needs to cover: breaking changes; new features that could be helpful for our situation; merge conflicts."

## Background and motivation

The project's `.specify/` toolchain is pinned at Spec Kit `0.9.3` (recorded in `.specify/init-options.json`, installed during the [032-speckit-workflow-audit](../032-speckit-workflow-audit/spec.md) migration). Upstream has since shipped roughly twenty releases — `0.9.4` through `0.12.4` (latest as of this spec) — spanning three minor version bumps. GitHub issue [#293](https://github.com/dominikhollmann/RedmineCalendar/issues/293) asks for the toolchain to be brought current and for the extensions/hooks that drive this project's `/speckit-*` workflow (git branch automation, GitHub Issue lifecycle tracking, draft-PR publishing, agent-context refresh, UAT) to be verified working after the bump.

This project's setup is unusually exposed to upstream churn compared to a vanilla install: it runs five **local, hand-built extensions** (`git`, `feature-tracker`, `publish`, `uat`, `agent-context`) wired into every `before_*`/`after_*` hook slot in `.specify/extensions.yml`, and the entire feature lifecycle (spec → clarify → plan → tasks → implement → UAT → merge) is automated through them. A silent behavioural change in the vendored core — a renamed script flag, a new required extension-manifest field, a relocated hook — can break the pipeline without any code review catching it, because the breakage shows up only the next time someone runs `/speckit-specify`.

Preliminary research against the upstream release notes (`0.9.4`–`0.12.4`) surfaced two changes that plausibly intersect with this project's setup and need an explicit decision before merge, not just "hope it still works":

1. **`0.10.0` — the git extension became opt-in.** Vanilla `specify init` no longer auto-installs a git extension, and the `--no-git` init flag was removed. This project's `git` extension is a local, hand-authored one (not the vanilla catalog one), so it is very likely unaffected — but this must be verified, not assumed, since the vanilla `create-new-feature` scripts our extension is descended from may have moved underneath it.
2. **`0.10.2` / `0.12.0` — the extension manifest schema gained `category` and `effect` as first-class fields, and the (built-in) `agent-context` extension became "a full opt-in."** All five of this project's `extension.yml` manifests currently omit `category`/`effect`. Whether the upgraded `specify` CLI now treats these as required, warns on their absence, or ignores older manifests entirely is unverified and must be resolved.

Beyond risk containment, the same twenty releases shipped features that may be directly useful to this project's GitHub-Issues-driven workflow — most notably label-driven "bug-fix" and "bug-test" agentic workflow step types (`0.12.4`), which line up naturally with the `status:*` / lifecycle labels the `feature-tracker` extension already drives.

## Clarifications

### Session 2026-07-06

- Q: Which feature is used to exercise the post-upgrade pipeline test (US1/SC-001)? → A: This feature (056) itself — its own remaining Spec Kit phases (clarify → plan → tasks → implement → uat) double as the pipeline verification test. No separate throwaway feature is created, and 055 is only required to survive a routine rebase (FR-009/SC-006), not to serve as the test vehicle.
- Q: If the pipeline verification (US1/SC-001) fails after the bump, what's the required response? → A: Fix-forward within the same PR — attempt a targeted fix for the specific failing hook/step and re-run verification; if still failing after a bounded attempt, escalate to the maintainer for a go/no-go call (full abort/revert is the fallback only if fix-forward genuinely stalls, not the default response to any failure).

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Bump Spec Kit without breaking the feature pipeline (Priority: P1)

The maintainer runs the full `/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-implement → /speckit-uat-run` pipeline on a throwaway or already-in-flight feature after the bump, and every step behaves exactly as it did on `0.9.3`: the `before_specify` git-branch hook fires, `after_specify`/`after_clarify`/`after_plan`/`after_tasks` fire the feature-tracker status transition + publish + agent-context hooks in order, and no step errors, warns about a removed flag, or silently no-ops.

**Why this priority**: This is the only outcome that actually matters from issue #293 — a version number bump that breaks the daily workflow is worse than not bumping at all. Everything else (new-feature evaluation) is only worth doing once the baseline pipeline is proven intact.

**Independent Test**: Bump `.specify/init-options.json` `speckit_version` and the vendored core files during this feature's (`056-update-spec-kit`) own implementation phase, then continue this feature through its own remaining phases (`/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` → `/speckit-uat-run`) and confirm every hook in `.specify/extensions.yml` still fires with the expected exit behaviour — this feature's own lifecycle IS the pipeline verification test, per the 2026-07-06 clarification.

**Acceptance Scenarios**:

1. **Given** the toolchain is bumped to the latest stable release, **When** `/speckit-specify` runs, **Then** the `before_specify` git hook creates the feature branch and `specs/<NNN>-name/` directory exactly as before, and the `after_specify` hooks (feature-tracker create, publish, agent-context) all complete without error.
2. **Given** the bump is applied, **When** `specify check` (or the equivalent CLI validation) is run against this project's five `extension.yml` manifests, **Then** no manifest is rejected or silently ignored because it predates the `category`/`effect` schema fields — either the fields are added, or the CLI is confirmed to tolerate their absence, with the finding recorded.
3. **Given** the bump is applied, **When** the vanilla git-extension-opt-in change (`0.10.0`) is reviewed against this project's local `git` extension, **Then** the spec/plan records explicitly whether the local extension is affected and, if so, the fix applied.
4. **Given** an in-flight feature branch exists at bump time, **When** the bump lands on `main`, **Then** that branch's remaining Spec Kit steps continue to work once it rebases onto the new `main`.

---

### User Story 2 — Resolve upstream/local file conflicts without losing customizations (Priority: P1)

For every vendored file (templates, scripts, command markdown under `.claude/skills/speckit-*`, `.specify/scripts/`, `.specify/templates/`) where this project's copy has diverged from the `0.9.3` baseline, the upgrade records an explicit resolution — accept the new upstream version, keep the local edit, or move the edit into an extension hook — using the same three-way-merge discipline established in [032-speckit-workflow-audit](../032-speckit-workflow-audit/spec.md) (FR-014/FR-015 there). No local customization disappears silently as a side effect of overwriting a file wholesale.

**Why this priority**: The 032 audit deliberately routed almost all customization into the five local extensions specifically so that future vendored-file bumps would be low-conflict. This story verifies that containment held, and catches anything that leaked back into vendored files since (e.g. constitution or CLAUDE.md template tweaks).

**Independent Test**: Diff this project's current `.specify/templates/`, `.specify/scripts/`, and `.claude/skills/speckit-*` files against a fresh `specify init` at `0.9.3` to find local edits, then diff again against the same files at the new target version to confirm each surviving local edit has a recorded resolution.

**Acceptance Scenarios**:

1. **Given** a vendored file has a local edit relative to `0.9.3`, **When** the upgrade runs, **Then** the file's resolution (accept-upstream / keep-ours / moved-to-extension) is recorded in a research/decision document, matching the FR-014-style ledger from the 032 audit.
2. **Given** no local edits exist in a given vendored file, **When** the upgrade runs, **Then** that file is simply replaced with the upstream version and requires no entry in the ledger.
3. **Given** the ledger is complete, **When** the maintainer reviews the PR, **Then** zero vendored-file diffs remain unaccounted for.

---

### User Story 3 — Evaluate new upstream features for adoption (Priority: P2)

The maintainer gets a short, decided (not open-ended) list of the new Spec Kit capabilities shipped between `0.9.3` and the target version that are plausibly useful for this project's GitHub-Issues-driven, extension-heavy setup, each with an adopt / defer / reject call and one-line rationale. At minimum this covers: the label-driven bug-fix and bug-test agentic workflow step types (`0.12.4`), the `init` workflow step type (`0.11.2`), and running `/analyze` in a forked subagent (`0.11.3`, Claude-specific).

**Why this priority**: These are genuine opportunities, not obligations — issue #293 explicitly asks for them to be surfaced, but nothing in the project currently depends on them. They are correctly lower priority than "don't break the pipeline" and "don't lose customizations."

**Independent Test**: Read the decision list; for every "adopt" entry, confirm the corresponding extension/workflow config change actually landed in the same PR (no adopted-but-not-implemented items).

**Acceptance Scenarios**:

1. **Given** the label-driven bug-fix/bug-test workflow step types exist upstream, **When** they are evaluated against the `feature-tracker` extension's existing `status:*` label lifecycle, **Then** the decision (adopt now / defer / reject, with rationale) is recorded.
2. **Given** an item is decided "adopt", **When** the PR is reviewed, **Then** the corresponding extension or workflow config is present and functional (per US1's pipeline test).
3. **Given** an item is decided "defer" or "reject", **When** the PR is reviewed, **Then** no partial or dead configuration for it exists in the repo.

---

### Edge Cases

- **`specify` ships an official upgrade/migrate subcommand at the target version.** If so, it MAY be used in place of a manual three-way merge, provided it produces the same per-file conflict visibility that US2 requires (no silent overwrites) — same substitution rule as 032's FR-015.
- **A custom `extension.yml` is rejected by stricter schema validation.** If the upgraded CLI hard-fails on a manifest missing `category`/`effect`, all five local manifests must be updated in the same PR before any hook is exercised.
- **The git-extension-opt-in change turns out to affect our local `git` extension's underlying scripts.** If `.specify/extensions/git/scripts/bash/create-new-feature.sh` (or its PowerShell twin) depended on a vendored core script/flag that vanilla `0.10.0`+ removed or relocated, the fix is scoped and applied before the bump is considered complete — this is not optional cleanup, it is a pipeline-breaking regression per US1.
- **In-flight feature branches other than this one at bump time** (currently `055-booking-modal-redesign`) must not have their remaining Spec Kit steps broken by the bump landing on `main` first. Per the 2026-07-06 clarification, `055` is not the pipeline test vehicle (this feature, `056`, is) — `055` only needs to keep working after a routine rebase; the bump PR must document that expectation.
- **A new upstream feature looks useful but requires a community catalog extension not yet installed.** Installing a new catalog extension is out of scope for this feature unless it directly fixes a US1/US2 breaking-change item; net-new catalog adoption is a `defer` by default per US3, to keep this PR focused on the version bump itself.
- **Rollback.** Per the 2026-07-06 clarification, a pipeline verification failure is handled fix-forward first: a targeted fix for the specific failing hook/step, then re-verify. Only if fix-forward stalls (the failure isn't resolved after a bounded attempt) does the maintainer get an explicit go/no-go escalation, with full revert (`.specify/init-options.json` version pin + vendored files back to `0.9.3`) as the fallback — the five extension directories are never touched by a rollback, since those hold the project's actual customizations and are the more valuable, harder-to-reconstruct asset.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The vendored Spec Kit toolchain MUST be upgraded from `0.9.3` to the latest stable release available at implementation time (`0.12.4` as of this spec's creation date, 2026-07-06). `.specify/init-options.json`'s `speckit_version` field MUST be updated to match.
- **FR-002**: The upgrade MUST be sequenced so that, after it completes, this feature's (`056-update-spec-kit`) own remaining Spec Kit phases (`/speckit-clarify` onward through `/speckit-uat-run`) complete with every `before_*`/`after_*` hook in `.specify/extensions.yml` firing exactly as it did pre-upgrade, per US1. This feature's own lifecycle serves as the pipeline verification test; no separate throwaway feature is created for this purpose.
- **FR-003**: The `0.10.0` "git extension is now opt-in" change MUST be evaluated against this project's local `git` extension (`.specify/extensions/git/`). The spec/plan MUST record whether the local extension or its underlying scripts are affected, and any required fix MUST land in the same PR.
- **FR-004**: The `0.10.2` extension-manifest schema addition (`category`, `effect` fields) and the `0.12.0` "agent-context is a full opt-in" change MUST be evaluated against all five local `extension.yml` manifests (`git`, `feature-tracker`, `publish`, `uat`, `agent-context`). If the upgraded `specify` CLI requires, warns on, or otherwise changes behavior based on these fields, all five manifests MUST be updated accordingly in the same PR.
- **FR-005**: For every vendored file (`.specify/templates/`, `.specify/scripts/`, `.claude/skills/speckit-*` command markdown) where this project's copy diverges from the `0.9.3` baseline, the upgrade MUST record one of three resolutions — `accept upstream`, `keep ours`, or `moved to extension` — following the same three-way-merge ledger discipline as [032-speckit-workflow-audit](../032-speckit-workflow-audit/spec.md) FR-014/FR-015. No local edit may be silently lost.
- **FR-006**: The upgrade MUST NOT modify, remove, or rename any file under `.specify/extensions/{git,feature-tracker,publish,uat,agent-context}/` except where FR-003 or FR-004 requires a targeted fix; these directories hold the project's actual customizations and are out of scope for wholesale replacement.
- **FR-007**: New upstream capabilities shipped between `0.9.3` and the target version MUST be evaluated for adoption, covering at minimum: the label-driven bug-fix/bug-test agentic workflow step types (`0.12.4`), the `init` workflow step type (`0.11.2`), and running `/analyze` in a forked subagent (`0.11.3`). Each MUST receive a recorded adopt/defer/reject decision with a one-line rationale.
- **FR-008**: Every item decided "adopt" under FR-007 MUST have its corresponding extension/workflow configuration change land in this same PR and MUST NOT break the US1 pipeline test.
- **FR-009**: The in-flight feature branch(es) present at bump time MUST NOT be broken by the bump. The PR description MUST document any action (e.g. rebase) an in-flight branch needs to take to remain compatible.
- **FR-010**: The upgrade MUST land in a single PR against `main`, gated by the standard CI checks (lint/format/typecheck, `knowledge:check`, `dup:check`, `oss:drift`/`oss:licenses`, `test:coverage`, `sqi:json`, `test:ui`).
- **FR-011**: The upgrade decision ledger (FR-003, FR-004, FR-005, FR-007) MUST persist in the repository (e.g. as `research.md` or `upgrade-decisions.md` under this feature's spec directory), so a future bump can start from the same baseline discipline.
- **FR-012**: If the pipeline verification test (FR-002/US1) fails on any step, the response MUST be fix-forward-first: apply a targeted fix to the specific failing hook/step and re-run verification. Only if the failure is not resolved after a bounded fix-forward attempt MUST the maintainer be given an explicit go/no-go escalation; a full revert to `speckit_version: 0.9.3` is the fallback for that escalation, not the default response to any single failure.

### Key Entities _(include if feature involves data)_

- **Vendored File Conflict**: A single file under `.specify/templates/`, `.specify/scripts/`, or `.claude/skills/speckit-*` whose local copy diverges from the pre-upgrade upstream baseline. Attributes: path, nature of local edit, resolution (accept upstream / keep ours / moved to extension), rationale.
- **Breaking Change Touchpoint**: A specific upstream behavioural change (e.g. git-extension opt-in, extension-schema fields) identified as plausibly affecting this project. Attributes: upstream version introduced, affected local component, verified impact (yes/no), fix applied (if any).
- **New Feature Candidate**: An upstream capability shipped since `0.9.3` evaluated for adoption. Attributes: name, upstream version, relevance to this project's setup, decision (adopt/defer/reject), rationale.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After the upgrade, this feature's (`056-update-spec-kit`) own remaining phases through `/speckit-uat-run` complete with zero hook failures and zero steps silently skipped — the same behavior as observed on `0.9.3` before the bump.
- **SC-002**: `.specify/init-options.json` reports `speckit_version` matching the latest stable release identified at implementation time, with no deprecation warnings emitted by the `specify` CLI against this project's configuration.
- **SC-003**: 100% of vendored-file diffs between the pre-upgrade and post-upgrade baselines that touch a file this project had locally edited carry a recorded resolution; 0% are unaccounted-for at PR review time.
- **SC-004**: Both breaking-change touchpoints identified in the Background (git-extension opt-in, extension-manifest schema fields) have an explicit "affected" or "not affected" verdict recorded before the PR merges — neither is left as an assumption.
- **SC-005**: At least the three new-feature candidates named in FR-007 have a recorded adopt/defer/reject decision; any "adopt" decision is fully implemented (not partially) in the same PR.
- **SC-006**: The in-flight feature branch active at bump time (`055-booking-modal-redesign`) requires no more than a routine rebase (no manual conflict resolution beyond git's own merge markers) to keep functioning after the bump lands on `main`.

## Assumptions

- **Latest stable Spec Kit at implementation time is `0.12.4`** (released 2026-07-02, per upstream GitHub releases as of this spec's creation on 2026-07-06). If a newer release ships before `/speckit-plan` executes, the target version updates to that release without requiring a new spec.
- **This project's five local extensions (`git`, `feature-tracker`, `publish`, `uat`, `agent-context`) are the correct containment boundary** for customization, as established by the 032 audit; this feature does not revisit that architectural decision, only verifies it survived the version gap.
- **No community catalog extensions are installed** beyond the built-in `agent-context` entry already recorded in `.specify/extensions.yml`'s `installed:` list; this upgrade does not add new catalog extensions unless FR-007's evaluation surfaces one that directly fixes a breaking-change touchpoint (which current research does not indicate).
- **`gh` CLI and GitHub API access** used by the `feature-tracker`, `publish`, and `uat` extensions are unaffected by the Spec Kit CLI version and are out of scope for this upgrade.
- **The three-way-merge methodology from the 032 audit remains the right tool** for resolving vendored-file conflicts, unless the upgraded `specify` CLI ships an official upgrade/migrate subcommand with equivalent per-file conflict visibility (per Edge Cases), in which case `/speckit-plan` may substitute it.
