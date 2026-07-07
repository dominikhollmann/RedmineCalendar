# Implementation Plan: Spec Kit Toolchain Upgrade (0.9.3 → 0.12.4)

**Branch**: `056-update-spec-kit` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/056-update-spec-kit/spec.md`

## Summary

Bump the vendored Spec Kit toolchain from `0.9.3` to `0.12.4` (20 releases) without breaking this project's five hand-authored local extensions (`git`, `feature-tracker`, `publish`, `uat`, `agent-context`) or the `/speckit-*` skill pipeline they drive. Phase 0 research (this plan's `research.md`) used real scratch installs of `specify-cli` at both boundary versions (via PyPI, since direct GitHub read access to `github/spec-kit` is out of this session's repo scope) to produce exact file-level diffs rather than inferred behavior. Findings: this project's vendored core scripts, templates, and core skill files carry **zero local edits**, so they can be replaced wholesale; the two breaking changes flagged in the spec (git-extension opt-in, extension-manifest schema) are **verified empirically** — the first requires one small, scoped fix (UAT's branch-validation call site), the second requires none. This feature's own remaining phases (`/speckit-tasks` → `/speckit-implement` → `/speckit-uat-run`) serve as the pipeline-verification test per the 2026-07-06 clarification.

## Technical Context

**Language/Version**: Markdown (Spec Kit skill/command files); Bash 5+ (`.specify/scripts/bash/*`, `.specify/extensions/*/scripts/bash/*`); PowerShell (`.specify/scripts/powershell/*`, kept in lockstep though unused — project's `script` setting is `sh`); YAML (`.specify/extensions.yml`, `extension.yml` manifests); JSON (`.specify/init-options.json`, `.specify/feature.json`). No application source-code (`js/`, `css/`, `*.html`) changes.

**Primary Dependencies**: Spec Kit (vendored, `0.9.3` → `0.12.4`); Claude Code CLI (host runtime, unchanged); `specify-cli` (PyPI, used only as a research/scaffolding tool in a throwaway scratch venv — not a project dependency); `git` ≥ 2.30.

**Storage**: N/A — no new persistence. `.specify/feature.json` continues as the sole authoritative feature pointer (its role is actually strengthened by this bump: core scripts now resolve *exclusively* from it, with no branch-name-prefix fallback).

**Testing**: No application test suite is touched (Vitest/Playwright unaffected — this feature has no `js/`/`css`/`html` diff). Verification is behavioral: this feature's own remaining Spec Kit phases must complete with every hook firing as documented in `research.md`'s "Summary of required changes." `npm run ci:local`-equivalent gates still apply to the PR (lint/format/typecheck run over the touched Markdown/YAML/JSON/Bash is out of scope — those files aren't linted by the JS toolchain — but the PR still goes through the standard CI gate list per FR-010, all of which pass trivially since no `js/` file changes).

**Target Platform**: Developer workstation / Claude Code session (Linux/macOS, Bash). GitHub (Issues, PR, Actions) for the surrounding feature-tracker/publish/CI machinery — unaffected by this bump.

**Project Type**: Process/tooling change — vendored-toolchain files + two local extensions' scripts/docs. No new modules, no UI.

**Performance Goals**: N/A — no runtime/perf-sensitive code touched.

**Constraints**: FR-006 — `.specify/extensions/{git,feature-tracker,publish,uat,agent-context}/` MUST NOT be modified except where FR-003/FR-004 require a targeted fix (this plan touches `git` and `agent-context` scripts/docs only, and `uat`'s command markdown, all under that exception). FR-010 — single PR against `main`, standard CI gate. FR-009/SC-006 — in-flight branches at bump time must not break; verified (research.md) that `055-booking-modal-redesign` already merged to `main` before this plan ran, so there is no other in-flight branch to protect.

**Scale/Scope**: ~20 upstream releases collapsed into one bump. Touches: 3 JSON/config files (`init-options.json` + two command-markdown references), ~40 wholesale-replaced vendored files (core `scripts/bash/*`, `scripts/powershell/*`, `templates/*`, 9 core skill `SKILL.md` files — all zero-local-edit accept-upstream per research.md Finding 1), and ~6 targeted edits inside the `git`/`agent-context`/`uat` extensions. Net project-owned diff (excluding wholesale vendored-file replacement) ≈ 150–250 lines.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> Same framing as [032-speckit-workflow-audit](../032-speckit-workflow-audit/plan.md): this is a process/tooling feature with no application source-code diff, so most principles are N/A by scope rather than by exemption.

| Principle | Compliance | Notes |
|---|---|---|
| **I. Redmine API Contract** | N/A | No Redmine integration code touched. |
| **II. Calendar-First UX** | N/A | No UI/calendar code touched. |
| **III. Test-First** | N/A — no business logic added | The only "new code" is the targeted Bash edits inside `git-common.sh` (port a helper function) and `update-agent-context.sh` (port three defensive checks) — both are direct ports of already-shipped, already-tested upstream logic (verified running cleanly in the 0.12.4 scratch install), not novel logic requiring a fresh TDD cycle. Verification is behavioral per this feature's own US1 pipeline test, documented in `quickstart.md`. |
| **IV. Simplicity & YAGNI** | ✅ Pass | Every "new feature candidate" surfaced in research.md is decided **defer** or **reject** with rationale (FR-007/SC-005) — no speculative infrastructure (`gh aw` workflows, multi-file agent-context config, `specify workflow` DSL) is adopted without a concrete present need. The upgrade itself is scoped to exactly what US1/US2 require. |
| **V. Security by Default** | ✅ Pass with notes | The adopted `update-agent-context.sh` changes *add* a path-traversal/absolute-path validation for context-file config (net security improvement). No credentials or new external calls are introduced. |
| **VI. Continuous Quality Gates** | ✅ Pass | No `js/`/`css`/`html` files change, so `lint`/`typecheck`/`test:coverage`/`sqi:json`/`test:ui` all run against an unchanged application surface and pass trivially. FR-010's CI gate list still runs unmodified. |
| **VII. Reuse Before Reimplementation** | ✅ Pass | The plan explicitly reuses upstream's already-written, already-tested fixes (git-common.sh helper, update-agent-context.sh hardening) rather than re-deriving equivalent logic locally — the opposite of duplication. |

**Gate result: PASS** — proceed to Phase 1 design (research.md already produced during this planning pass, per this project's established convention of doing Phase 0 research inline in `/speckit-plan`).

## Project Structure

### Documentation (this feature)

```text
specs/056-update-spec-kit/
├── plan.md                  # This file (/speckit-plan command output)
├── research.md              # Phase 0 output — verified upstream diffs, breaking-change verdicts, FR-007 decision ledger
├── data-model.md            # Phase 1 output — Vendored File Conflict / Breaking Change Touchpoint / New Feature Candidate entities
├── quickstart.md            # Phase 1 output — UAT checklist (this feature's own pipeline run IS the verification, per clarification)
├── spec.md                  # Locked
├── checklists/requirements.md  # Locked
└── tasks.md                 # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

### Source Code (repository root)

This feature changes vendored toolchain + local-extension files, not application source. No `contracts/` directory — there is no external API/CLI surface this feature exposes to users or other systems (the "interfaces" here are the `.specify/extensions.yml` hook contract and the `extension.yml` manifest schema, both of which are upstream-owned formats this feature conforms to, not defines).

```text
.specify/
├── init-options.json                          # MODIFIED — speckit_version: 0.12.4; branch_numbering → feature_numbering
├── scripts/bash/*                             # REPLACED wholesale (0.12.4, zero local edits per research.md Finding 1)
├── scripts/powershell/*                       # REPLACED wholesale (kept in lockstep, unused but not left stale)
├── templates/*                                # REPLACED wholesale (zero local edits)
├── extensions/git/scripts/bash/git-common.sh  # MODIFIED — port spec_kit_effective_branch_name() + refined check_feature_branch()
├── extensions/git/scripts/powershell/git-common.ps1  # MODIFIED — PowerShell twin of the above
├── extensions/git/commands/speckit.git.feature.md   # MODIFIED — three-tier feature_numbering/branch_numbering fallback
├── extensions/uat/commands/run.md             # MODIFIED — explicit speckit.git.validate call replacing removed core branch check
├── extensions/agent-context/scripts/bash/update-agent-context.sh        # MODIFIED — feature.json-first resolution, PyYAML check, path validation
├── extensions/agent-context/scripts/powershell/update-agent-context.ps1 # MODIFIED — PowerShell twin
├── extensions/agent-context/commands/speckit.agent-context.update.md   # MODIFIED — doc wording to match
└── extensions/{feature-tracker,publish}/**    # UNTOUCHED — pure-local extensions, no upstream lineage, out of scope

.claude/skills/
├── speckit-{analyze,checklist,clarify,constitution,implement,plan,specify,tasks,taskstoissues}/SKILL.md  # REPLACED wholesale (mirrors core scripts/templates bump)
├── speckit-git-feature/SKILL.md               # MODIFIED — mirrors extensions/git/commands/speckit.git.feature.md
├── speckit-uat-run/SKILL.md                   # MODIFIED — mirrors extensions/uat/commands/run.md
└── speckit-agent-context-update/SKILL.md      # MODIFIED — mirrors extensions/agent-context/commands/speckit.agent-context.update.md
```

**Structure Decision**: No new source directories. Changes are confined to `.specify/` (vendored core + two upstream-descended extensions) and their `.claude/skills/` command mirrors. `feature-tracker` and `publish` (pure local, no upstream lineage — confirmed in research.md) are untouched, satisfying FR-006.

## Complexity Tracking

> No Constitution Check violations — table intentionally empty.
