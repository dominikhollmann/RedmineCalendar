---
description: 'Task list for feature implementation'
---

# Tasks: Spec Kit Toolchain Upgrade (0.9.3 → 0.12.4)

**Input**: Design documents from `/specs/056-update-spec-kit/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present)

**Tests**: Not requested for this feature (no application business logic — Constitution III is N/A per plan.md's Constitution Check; verification is behavioral, via this feature's own remaining pipeline run and `quickstart.md`).

**Organization**: Tasks are grouped by user story (US1 = P1 "don't break the pipeline", US2 = P1 "resolve conflicts without losing customizations", US3 = P2 "evaluate new features"), per spec.md.

## Path Conventions

Single project. All paths below are repository-relative under `.specify/` and `.claude/skills/`. No `src/`/`tests/` — this feature touches only vendored toolchain + two local extensions.

---

## Phase 1: Setup

**Purpose**: Produce (or confirm) the verified 0.12.4 upstream reference baseline that every later task diffs/copies against — this is what `research.md`'s Methodology section already did once; this task makes it reproducible for implementation.

- [x] T001 Ensure a 0.12.4 `specify-cli` reference baseline exists in the scratchpad (reuse if already present from planning): `pip install specify-cli==0.12.4` into a scratch venv, then in an empty scratch directory run `specify init --here --integration claude --script sh --force --ignore-agent-tools`, then `specify extension add git` and `specify extension add agent-context` inside it. This directory is the source of truth for every "replace wholesale" / "port from upstream" task below.

**Checkpoint**: Reference baseline available for diffing/copying in every subsequent task.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The actual version bump — mechanical, zero-local-edit-loss file replacement (per `data-model.md`'s Vendored File Conflict table, all "accept upstream" rows) plus the version/config bump. **Both US1 and US2 depend on this being done first** — there is nothing to verify (US1) or nothing to have "resolved conflicts" in (US2) until the bump itself has happened.

- [x] T002 Replace `.specify/scripts/bash/common.sh`, `check-prerequisites.sh`, `create-new-feature.sh`, `setup-plan.sh`, `setup-tasks.sh` wholesale with the T001 reference baseline's versions (verified zero local edits — `data-model.md` Vendored File Conflict table)
- [x] T003 [P] Replace `.specify/scripts/powershell/*.ps1` (same five scripts) wholesale with the T001 reference baseline's versions
- [x] T004 [P] Replace `.specify/templates/*` (plan/spec/tasks/checklist templates etc.) wholesale with the T001 reference baseline's versions
- [x] T005 Replace the nine core skill files wholesale with the T001 reference baseline's versions: `.claude/skills/speckit-analyze/SKILL.md`, `.claude/skills/speckit-checklist/SKILL.md`, `.claude/skills/speckit-clarify/SKILL.md`, `.claude/skills/speckit-constitution/SKILL.md`, `.claude/skills/speckit-implement/SKILL.md`, `.claude/skills/speckit-plan/SKILL.md`, `.claude/skills/speckit-specify/SKILL.md`, `.claude/skills/speckit-tasks/SKILL.md`, `.claude/skills/speckit-taskstoissues/SKILL.md`
- [x] T006 Update `.specify/init-options.json`: set `"speckit_version": "0.12.4"`; rename the `"branch_numbering"` key to `"feature_numbering"` (same value, `"sequential"`)

**Checkpoint**: Toolchain version bump is mechanically complete. `jq -r '.speckit_version' .specify/init-options.json` prints `0.12.4`. User story work can now begin.

---

## Phase 3: User Story 1 — Bump Spec Kit without breaking the feature pipeline (Priority: P1) 🎯 MVP

**Goal**: Every `before_*`/`after_*` hook in `.specify/extensions.yml` still fires exactly as before, with no step erroring, warning about a removed flag, or silently no-opping.

**Independent Test**: Per the 2026-07-06 clarification, this feature's own remaining phases (`/speckit-tasks` already run to produce this file → `/speckit-implement` → `/speckit-uat-run`) ARE the test. The one concrete regression `research.md` Finding 2 identified — UAT's documented reliance on a now-removed core branch check — is fixed in this phase so that test can actually pass.

### Implementation for User Story 1

- [x] T007 [US1] Fix `.specify/extensions/uat/commands/run.md` Outline step 1: insert an explicit call to this project's own `speckit.git.validate` command before running `check-prerequisites.sh`, replacing the now-false claim that `check-prerequisites.sh` enforces branch naming via `check_feature_branch` in core `common.sh` (removed in T002)
- [x] T008 [US1] Mirror the same fix into `.claude/skills/speckit-uat-run/SKILL.md` (kept in sync with the extension's command markdown, per this project's existing skill-mirroring convention)
- [x] T009 [US1] Smoke-test the Phase 2 bump: rerun `.specify/scripts/bash/setup-tasks.sh --json` and `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and confirm `FEATURE_DIR` still resolves to `specs/056-update-spec-kit` with no errors (validates `get_feature_paths()`'s new feature.json-only resolution, per research.md Finding 2, against this project's real state)

**Checkpoint**: The one known pipeline regression is fixed. User Story 1's actual pass/fail verdict is delivered by this feature continuing through `/speckit-implement` → `/speckit-uat-run` without any hook error.

---

## Phase 4: User Story 2 — Resolve upstream/local file conflicts without losing customizations (Priority: P1)

**Goal**: Every vendored file this project had locally edited has a recorded, applied resolution; nothing is silently lost.

**Independent Test**: Diff `.specify/extensions/git/` and `.specify/extensions/agent-context/` against the T001 reference baseline afterward — remaining diffs should be exactly the project's intentional local additions (documented in `data-model.md`), nothing else.

### Implementation for User Story 2

- [x] T010 [P] [US2] Port `spec_kit_effective_branch_name()` and the refined `check_feature_branch()` regex logic from the T001 reference baseline into `.specify/extensions/git/scripts/bash/git-common.sh`, preserving this project's existing function signature and call sites
- [x] T011 [P] [US2] Port the same change into `.specify/extensions/git/scripts/powershell/git-common.ps1`
- [x] T012 [P] [US2] Port the three upstream hardening fixes from the T001 reference baseline into `.specify/extensions/agent-context/scripts/bash/update-agent-context.sh`: resolve the plan path from `.specify/feature.json` first (falling back to the mtime heuristic only when absent), validate the selected Python interpreter can `import yaml`, and reject absolute/`..`-traversal `context_file`/`context_files` values
- [x] T013 [P] [US2] Port the same three fixes into `.specify/extensions/agent-context/scripts/powershell/update-agent-context.ps1`
- [x] T014 [US2] Update `.specify/extensions/agent-context/commands/speckit.agent-context.update.md` wording to document the feature.json-first resolution order and the path-validation rule; mirror the wording into `.claude/skills/speckit-agent-context-update/SKILL.md`
- [x] T015 [US2] Port the upstream 3-tier fallback (`git-config.yml``branch_numbering` → `init-options.json``feature_numbering` → `init-options.json``branch_numbering` deprecated) into `.specify/extensions/git/commands/speckit.git.feature.md`, replacing the current 2-tier check
- [x] T016 [US2] Mirror the same 3-tier fallback wording into `.claude/skills/speckit-git-feature/SKILL.md`
- [x] T017 [US2] Verify `.specify/extensions/feature-tracker/**` and `.specify/extensions/publish/**` are untouched by this feature (`git diff main -- .specify/extensions/feature-tracker .specify/extensions/publish` empty), confirming FR-006 — these two extensions have no upstream lineage and are out of scope

**Checkpoint**: Both upstream-descended local extensions (`git`, `agent-context`) carry the verified-safe upstream improvements on top of their existing local customizations; the two pure-local extensions are untouched.

---

## Phase 5: User Story 3 — Evaluate new upstream features for adoption (Priority: P2)

**Goal**: A short, decided (not open-ended) adopt/defer/reject list for new upstream capabilities, with zero partial/dead configuration for anything not adopted.

**Independent Test**: Read `research.md`'s "New Feature Candidates" table; confirm every "adopt" entry (there are none in this bump) has landed, and confirm no stray config exists for any deferred/rejected item.

### Implementation for User Story 3

- [x] T018 [US3] Verify `research.md`'s New Feature Candidates table has a recorded decision for at least the three FR-007-named candidates (label-driven bug-fix/bug-test workflows, the `init` workflow step type, `/analyze` in a forked subagent) and confirm no partial configuration exists in the repo for any of them (e.g. no stray `.github/workflows/bug-fix.md`, no `context_files` multi-file config, no `specify workflow` YAML) — this is a verification-only task, no code changes expected since every candidate is decided defer/reject

**Checkpoint**: FR-007/FR-008/SC-005 satisfied — decisions recorded, nothing half-adopted.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final gate checks before UAT.

- [x] T019 Confirm the CLAUDE.md housekeeping "user documentation" rule does not apply: this feature changes no user-facing application behavior (no `js/`/`css`/`html` diff), so `docs/content.en.md`/`docs/content.de.md` intentionally require no update — record this in the PR description
- [x] T020 Confirm the CLAUDE.md housekeeping "DSGVO impact check" does not apply: this feature touches no application code, so the `specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md` gate (scoped to "every PR that touches application code") is N/A — record this in the PR description
- [x] T021 Run `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck` from repo root and confirm zero new errors (expected trivially — no `js/`/`css`/`html` files changed by this feature)
- [ ] T022 Run `/speckit-uat-run` and work through every scenario in `quickstart.md`, recording pass/fail per item

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on T001. **Blocks** Phases 3–5 — none of US1/US2/US3's tasks are meaningful before the version bump itself lands.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Independent of US2/US3.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Independent of US1/US3 (T010–T016 touch different files than Phase 3; T017 is a pure verification task).
- **User Story 3 (Phase 5)**: Depends on Phase 2 (in principle — in practice it only reads `research.md`, already complete). Independent of US1/US2.
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5 all being complete — T022 (`/speckit-uat-run`) is the final gate and exercises US1's actual pass/fail verdict.

### Within Each User Story

- US1: T007 → T008 (same fix, two files, do the source-of-truth extension file first) → T009 (smoke test, depends on T007/T008 plus the Phase 2 bump).
- US2: T010–T013 are independent file pairs, parallelizable; T014 depends on T012/T013 (its wording documents what those scripts now do); T015 → T016 (same fix, two files); T017 has no dependency, can run anytime after Phase 2.
- US3: T018 has no dependency beyond `research.md` already existing.

### Parallel Opportunities

- T003, T004 can run in parallel with each other and with T002 (different files).
- Within US2: T010/T011 (git-common.sh + .ps1) and T012/T013 (update-agent-context.sh + .ps1) are two independent file pairs — all four can run in parallel with each other.
- US1, US2, and US3 phases can be worked in parallel once Phase 2 completes, since they touch disjoint files (`uat` extension vs. `git`+`agent-context` extensions vs. read-only verification).

---

## Parallel Example: Phase 2 (Foundational)

```bash
# These three replacements touch disjoint file sets and can run together:
Task: "Replace .specify/scripts/bash/* wholesale with 0.12.4 reference (T002)"
Task: "Replace .specify/scripts/powershell/* wholesale with 0.12.4 reference (T003)"
Task: "Replace .specify/templates/* wholesale with 0.12.4 reference (T004)"
```

## Parallel Example: User Story 2

```bash
Task: "Port git-common.sh fix (T010)"
Task: "Port git-common.ps1 fix (T011)"
Task: "Port update-agent-context.sh fixes (T012)"
Task: "Port update-agent-context.ps1 fixes (T013)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational) — the mechanical version bump.
2. Complete Phase 3 (US1) — fix the one known regression (UAT branch-validation call site).
3. **STOP and VALIDATE**: this is enough for the pipeline to be provably safe — the MVP claim of issue #293 ("don't break the daily workflow").

### Incremental Delivery

1. Setup + Foundational → toolchain bumped, nothing broken yet (fixes not yet ported).
2. Add US1 → pipeline-safety regression fixed → this feature's own remaining phases can run end-to-end.
3. Add US2 → local-extension improvements ported, ledger fully discharged.
4. Add US3 → new-feature decisions confirmed complete, nothing half-adopted.
5. Polish → CI gate + full UAT walkthrough.

---

## Notes

- No `[Story]` label on Setup/Foundational/Polish tasks, per convention.
- This feature has no test-writing tasks (Constitution III N/A — see plan.md Constitution Check); verification is entirely behavioral via T009, T017, T018, and T022.
- Commit after each phase checkpoint, consistent with this project's `speckit.publish.run` hook cadence.
