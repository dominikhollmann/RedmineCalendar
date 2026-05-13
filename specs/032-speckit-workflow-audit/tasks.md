# Tasks: Spec Kit + Claude Workflow Audit

**Feature**: 032-speckit-workflow-audit | **Branch**: `032-speckit-workflow-audit` | **Last updated**: 2026-05-10
**Input**: design docs in `specs/032-speckit-workflow-audit/`

This feature is a process/tooling change. Tasks land config + extension files + a one-shot migration script + documentation. No application source code is touched (`js/`, `tests/unit/`, `tests/ui/`, `css/`, `*.html`).

---

## Phase 1: Setup

Foundation that every later phase builds on. Spec Kit must be at the new baseline before audit decisions are finalised (per FR-013 + Q4 clarification).

- [ ] T001 Tag the pre-upgrade state as `pre-speckit-0.8.7-upgrade-032` in git so the 3-way merge has a clean ancestor reference. Run from repo root: `git tag pre-speckit-0.8.7-upgrade-032 && git push origin pre-speckit-0.8.7-upgrade-032`.
- [ ] T002 In a scratch directory outside the repo (e.g. `/tmp/specify-0.6.1-vanilla/`), run `specify init --here --integration claude` pinned to Spec Kit 0.6.1 to capture the vanilla 0.6.1 baseline. Save the resulting `.specify/` + `.claude/` trees as the merge "base".
- [ ] T003 In a second scratch directory (e.g. `/tmp/specify-0.8.7-vanilla/`), run `specify init --here --integration claude` against Spec Kit 0.8.7 to capture the vanilla 0.8.7 target. Save as the merge "theirs".
- [ ] T004 Run `specify integration upgrade claude --dry-run` from the repo root and capture the file-list output to `specs/032-speckit-workflow-audit/upgrade-filelist.txt`. This is the canonical list of Spec-Kit-managed files that need 3-way merge per FR-015.
- [ ] T005 Update `.specify/init-options.json`: set `"speckit_version": "0.8.7"`. Single-line JSON edit.

---

## Phase 2: Foundational — Spec Kit upgrade (blocking; must complete before audit phase 5)

3-way merge of every file the upgrade touches, per FR-014/FR-015. Each merge produces an explicit `accept-upstream` / `re-apply-ours` / `extension-hook` decision. No silent overwrites.

- [ ] T006 [P] 3-way merge `.specify/templates/spec-template.md` (base = 0.6.1 vanilla, ours = current, theirs = 0.8.7 vanilla). Resolve conflicts; record decision per file in `specs/032-speckit-workflow-audit/upgrade-decisions.md`.
- [ ] T007 [P] 3-way merge `.specify/templates/plan-template.md`. Same procedure as T006.
- [ ] T008 [P] 3-way merge `.specify/templates/tasks-template.md`. Same procedure.
- [ ] T009 [P] 3-way merge `.specify/templates/checklist-template.md`. Same procedure.
- [ ] T010 [P] 3-way merge `.specify/templates/agent-file-template.md`. Same procedure.
- [ ] T011 [P] 3-way merge `.specify/templates/constitution-template.md`. Same procedure (note: our constitution at `.specify/memory/constitution.md` is project content, not the template — DO NOT touch it here).
- [ ] T012 [P] 3-way merge each `.specify/scripts/bash/*.sh` file listed in T004's filelist. Same procedure per script.
- [ ] T013 [P] 3-way merge each `.claude/commands/speckit.*.md` slash-command file (analyze, checklist, clarify, constitution, implement, plan, specify, tasks, taskstoissues — note: `speckit.uat.md` is handled separately in Phase 4 by being moved to an extension; do NOT 3-way-merge it).
- [ ] T014 [P] 3-way merge each `.claude/skills/speckit-*/SKILL.md` file. Most of these are pure-vanilla and will accept-upstream cleanly; flag any with local edits.
- [ ] T015 Write a paragraph in `specs/032-speckit-workflow-audit/upgrade-decisions.md` summarising the per-file resolutions: total files merged, count by resolution (`accept-upstream` / `re-apply-ours` / `extension-hook`), and any noteworthy upstream changes (e.g. removed deprecated fields, new template sections).
- [ ] T016 Run `npm test && npm run lint && npm run typecheck` to confirm the upgrade didn't break the existing test suite or linters. The merge should be invisible to application tests, but verify.

---

## Phase 3: User Story 1 — Replace BACKLOG.md with GitHub Issues (Priority: P1)

**Story goal**: GitHub Issues become the canonical feature tracker. New features auto-create Issues; phase transitions update labels; PR merge closes the Issue + applies the version label. All ~31 historical features migrated.

**Independent test criteria**: After this phase, running `/speckit.specify "test feature"` creates a corresponding Issue with `feature` + `status:specify` labels. The migration script run produces ≥ 31 Issues (6 in-flight open + ~25 Done closed). `BACKLOG.md` is deleted.

### Phase 3a: github-issues extension scaffolding

- [ ] T017 [US1] Create directory `.specify/extensions/github-issues/`.
- [ ] T018 [US1] Write `.specify/extensions/github-issues/extension.yml` with the manifest defined in `contracts/uat-extension-manifest.md` § "Sibling extension: github-issues" (name, version, requires.speckit_version ≥ 0.8.7, gh ≥ 2.0.0; commands list of `github-issues.create` + `github-issues.update-status`; hooks bound to after_specify, after_clarify, after_plan, after_tasks, after_implement).
- [ ] T019 [P] [US1] Create `.specify/extensions/github-issues/commands/create.md`. The slash command body: read `FEATURE_DIR/spec.md`, extract feature number + title, build the templated body per `contracts/github-issue-schema.md`, call `gh issue create --title "Feature NNN: …" --body … --label feature --label status:specify`. MUST be idempotent: skip if `gh issue list --search "in:title \"Feature NNN:\"" --state all` returns a hit.
- [ ] T020 [P] [US1] Create `.specify/extensions/github-issues/commands/update-status.md`. The slash command body: accept `--status <name>` arg; look up Issue by `Feature NNN:` title regex; remove existing `status:*` label; add `status:<name>`. No-op if no Issue exists. Reads `FEATURE_DIR` from environment as set by the Spec Kit hook executor.
- [ ] T021 [P] [US1] Create `.specify/extensions/github-issues/workflows/issue-lifecycle.yml` per `contracts/github-issue-schema.md` § "Lifecycle workflow contract": triggers on `pull_request: closed (merged)`, parses `Closes #N` from PR body, sets `status:done` + `version:vX.Y.Z` (from latest matching `git tag`), closes the Issue.
- [ ] T022 [P] [US1] Write `.specify/extensions/github-issues/README.md` documenting the extension per the layout in `contracts/uat-extension-manifest.md` § README.md shape. Sections: requirements, usage, behavior, opt-out.

### Phase 3b: Wire up + install

- [ ] T023 [US1] Copy `.specify/extensions/github-issues/workflows/issue-lifecycle.yml` to `.github/workflows/issue-lifecycle.yml` (this is the only file the extension installs outside its own directory; per `contracts/uat-extension-manifest.md`).
- [ ] T024 [US1] Update `.specify/extensions.yml`: add `github-issues.create` to `after_specify` hooks; add `github-issues.update-status` (with `args.status: <phase>`) to `after_clarify`, `after_plan`, `after_tasks`, `after_implement` hooks. Replace the existing `git.commit` entries on those keys (per the per-hook proposal in `contracts/spec-kit-extensions-yml.md`). Run `specify extension install .specify/extensions/github-issues` to register the extension if `specify` requires it (verify by checking `specify extension list`).

### Phase 3c: Migration script

- [ ] T025 [US1] Create `scripts/migrate-backlog-to-issues.mjs`. Node ESM script. Parses `BACKLOG.md`, iterates each table row (skipping header + separator), maps the row to an Issue per `contracts/github-issue-schema.md` § "Migration: mapping BACKLOG.md rows to Issues" (Done rows → closed with `version:vX.Y.Z`; in-flight rows → open with `status:<highest reached>`). **Issue-body template MUST link to `specs/<NNN>-name/spec.md`** (post-rename path per FR-016), not `specs/...`. Idempotent: checks for existing `Feature NNN:` title before creating; if found, also patches body to current path (so a re-run after Phase 5d corrects any stale links). Supports `--dry-run` flag (prints what would be done, makes no API calls).
- [ ] T026 [US1] Run the migration script in `--dry-run` mode against the current `BACKLOG.md` and verify the planned action for each row (~31 rows). Save the dry-run output as `specs/032-speckit-workflow-audit/migration-dryrun.txt` for review before live execution.
- [ ] T027 [US1] **Manual gate** — review T026's output. If correct, run the migration script live (without `--dry-run`). Verify with `gh issue list --label feature --state all --limit 100 --json number | jq 'length'` that the resulting count is ≥ 31. This task is a single live API call set; do not retry blindly on failure (the script's idempotency guard handles partial failure, but inspect first).

### Phase 3d: Cleanup

- [ ] T028 [US1] Delete `BACKLOG.md` (per FR-005).
- [ ] T029 [US1] Update `.claude/commands/speckit.specify.md`: remove the BACKLOG.md row-append step (currently §8 "Update BACKLOG.md"). Replace with a short note: "Issue creation now happens via the `after_specify` hook bound to the `github-issues.create` extension command. See `.specify/extensions/github-issues/`."

### Phase 3e: Documentation

- [ ] T030 [P] [US1] Update `CONTRIBUTING.md`: replace all `BACKLOG.md` references with "GitHub Issues"; update the Spec Kit workflow section to mention the new lifecycle labels + the `issue-lifecycle.yml` close-on-merge behavior.
- [ ] T031 [P] [US1] Update `CLAUDE.md`: same scope as T030 — drop BACKLOG.md references, document the Issues-driven flow.

---

## Phase 4: User Story 2 — Reconcile UAT phase with branch protection (Priority: P1)

**Story goal**: `/speckit.uat` no longer attempts the broken local-merge step. UAT logic lives in a project-local extension that survives Spec Kit upgrades. The skill ends by opening or commenting on a PR; the human merges via GitHub.

**Independent test criteria**: After this phase, running `/speckit.uat.run <feature>` against a feature with a clean `quickstart.md` walks the user through the items, marks `[x]` on confirms, and ends with a PR-comment + "merge via GitHub" message. Zero references to `git push origin main` or `git merge --no-ff` remain in the extension's commands.

- [ ] T032 [US2] Create directory `.specify/extensions/uat/`.
- [ ] T033 [US2] Write `.specify/extensions/uat/extension.yml` per `contracts/uat-extension-manifest.md` § extension.yml schema. Single command (`uat.run`), no automatic hooks (human-invoked only).
- [ ] T034 [US2] Copy the body of `.claude/commands/speckit.uat.md` to `.specify/extensions/uat/commands/run.md`. Apply the modifications listed in `contracts/uat-extension-manifest.md` § "commands/run.md shape": (a) drop the local-merge step entirely; (b) drop the `git push origin --delete` + `git branch -D` steps; (c) replace BACKLOG.md update with no-op (lifecycle workflow handles `status:done`); (d) add `gh pr create` (if no PR exists) or `gh pr comment` (if one does) for UAT result; (e) add `Closes #N` reminder; (f) update frontmatter `name: speckit.uat.run`.
- [ ] T035 [US2] Write `.specify/extensions/uat/README.md` per `contracts/uat-extension-manifest.md` § README.md shape.
- [ ] T036 [US2] Delete `.claude/commands/speckit.uat.md` (the bespoke skill is now relocated to the extension).
- [ ] T037 [US2] Run `specify extension install .specify/extensions/uat` to register the extension. Verify with `specify extension list` that `uat` appears alongside `github-issues`. Verify `/speckit.uat.run` is discoverable (the slash command list should include it).
- [ ] T038 [P] [US2] Update `CLAUDE.md`: in the Commands section, change `/speckit.uat` references to `/speckit.uat.run`. Note in the Project Structure section that `.specify/extensions/uat/` exists.
- [ ] T039 [P] [US2] Update `CONTRIBUTING.md`: same scope — slash command rename + extension-based architecture note.

---

## Phase 5: User Story 3 — Audit + decide remaining customizations (Priority: P2)

**Story goal**: Every divergence between this project and a freshly-initialised vanilla Spec Kit 0.8.7 + Claude Code is recorded in the audit document with a `keep` / `replace` / `drop` decision and rationale. No surprises for the team.

**Independent test criteria**: After this phase, `research.md` contains a Customization inventory table with one row per divergence, every row has a non-empty `decision` cell, every `replace` row has a non-empty `replacement_target`, and the table covers everything in `.specify/`, `.claude/`, `.github/`, root markdown that differs from vanilla.

### Phase 5a: Inventory

- [ ] T040 [P] [US3] Diff `.specify/` against the 0.8.7-vanilla scratch from T003. Produce an inventory of project-specific files (anything not in vanilla, anything modified vs vanilla). Capture path, current_state, vanilla_baseline per `data-model.md` § Customization. Append the rows to the inventory table in `specs/032-speckit-workflow-audit/research.md` § "Local customization inventory" (replacing the placeholder rows there with the real measured inventory).
- [ ] T041 [P] [US3] Same diff process for `.claude/`. Append inventory rows.
- [ ] T042 [P] [US3] Same diff process for `.github/` (note: GitHub Actions workflows + dependabot.yml + Issue templates are NOT vanilla Spec Kit — they're project-specific tooling, all in scope for the audit).
- [ ] T043 [P] [US3] Same diff process for root markdown / config files: `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`, `.nvmrc`, `.prettierrc.json`, `.prettierignore`, `.htmlhintrc`, `eslint.config.js`, `tsconfig.json`, `.husky/`. (Most are not Spec Kit-related; record them anyway for completeness.)

### Phase 5b: Per-customization decisions

- [ ] T044 [US3] For each row in the inventory tables T040-T043, fill in `decision` (`keep` / `replace` / `drop`) + `rationale` (one paragraph) + `replacement_target` (if `replace`) + `reversibility` (`trivial` / `straightforward` / `non-trivial`). Use the per-hook proposal in `contracts/spec-kit-extensions-yml.md` as the starting point for `.specify/extensions.yml` decisions; apply per-customization judgment for everything else per the balanced strategy from Q5.
- [ ] T045 [US3] For the `PreToolUse` hook in `.claude/settings.json`, record the decision per FR-007. Recommended: **drop** (server-side branch protection now covers it; the local UX value is small relative to the maintenance surface). Apply the decision in the file: if `drop`, remove the entire `PreToolUse` block.
- [ ] T046 [US3] For the `PostToolUse` `npm test` hook in `.claude/settings.json`, record the decision. Recommended: **drop** for team handover (auto-run tests on every JS edit are noisy in a team setting; `npm test` on save is an editor-config concern). Apply the decision.
- [ ] T047 [US3] For the `PostToolUse` `gh run list` hook (post-push CI status check), record the decision. Recommended: **keep** — genuinely useful, low noise. Apply (or leave) accordingly.
- [ ] T048 [US3] Update the `.specify/extensions.yml` per the audit's per-hook decisions. Apply the proposal from `contracts/spec-kit-extensions-yml.md` if the audit confirmed it; otherwise apply the actual decisions made in T044.

### Phase 5c: Audit completeness gate

- [ ] T049 [US3] Compute the AuditInventory totals per `data-model.md` § Entity 2: `total_count`, `count_keep`, `count_replace`, `count_drop`, `pct_reduction`, `version_baseline=0.8.7`. Append the summary table to `research.md`. If `pct_reduction < 30%`, write the explanatory paragraph required by the reframed SC-001.
- [ ] T050 [US3] Validate the audit per the data-model rules: every row has a non-empty `decision`; every `replace` row has a non-empty `replacement_target`; no duplicate `path` keys. If any row fails, fix it before proceeding.
- [ ] T051 [US3] For every `keep`-decisioned customization, add a one-sentence justification to `CONTRIBUTING.md` (or `CLAUDE.md` if the natural home) per FR-011. Goal: a new dev can find the rationale for any retained customization without reading `research.md`.

---

## Phase 5d: Folder-layout realignment (FR-016)

**Story goal**: Revert the project's feature-directory layout to vanilla Spec Kit `specs/<NNN>-name/`, accept-upstream the script paths, sweep cross-references, and reconcile the stray `github-workflows/`. Reversibility: trivial (`git revert` of the rename commit + opposite `git mv`).

**Independent test criteria**: After this phase, `ls specs/ | wc -l` returns 31 (the migrated feature directories); `specs/` no longer exists; `grep -rn '\specs/' .` returns zero hits across project-owned files (vendored Spec Kit history is excluded); the next `/speckit.specify "smoke"` (T056) creates its directory under `specs/`, not `specs/`.

**Sequencing note**: this phase runs after T051 and before Phase 6. The chosen variant accepts a brief window where the ~31 newly-migrated GitHub Issues (T027) carry `specs/<NNN>/spec.md` body links pointing at a path that doesn't yet exist on the feature branch. The window closes when the PR merges to main. Per the Edge Cases note in `spec.md`, this trade-off is documented and accepted.

- [ ] T051a [US3] Tag the pre-rename state for reversibility: `git tag pre-folder-rename-032 && git push origin pre-folder-rename-032`. Then move every feature directory in a single commit: `git mv specs/* specs/ && git commit -m "T051a: relocate feature directories to vanilla specs/ per FR-016"`. Verify history follows with `git log --follow specs/001-calendar-time-entries/spec.md` (should show the full pre-rename history).
- [ ] T051b [US3] Update `.specify/feature.json` so `feature_directory` points to `specs/032-speckit-workflow-audit` (was `specs/032-speckit-workflow-audit`). Single-line JSON edit.
- [ ] T051c [US3] Revisit T012's 3-way-merge resolution for `.specify/scripts/bash/common.sh` and `.specify/scripts/bash/create-new-feature.sh`: switch to **accept-upstream** for the `SPECS_DIR` definition (vanilla `specs/`) now that the on-disk layout matches. If T012 originally re-applied ours, override here with a follow-up commit and record the override in `specs/032-speckit-workflow-audit/upgrade-decisions.md`.
- [ ] T051d [US3] Sweep cross-cutting path references. Run `grep -rn '\specs/' . --include='*.md' --include='*.json' --include='*.mjs' --include='*.yml'` from the repo root and replace each project-owned hit with `specs/`. Files expected: `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, all 31 `specs/<NNN>/*.md` files (cross-feature references), `specs/032-speckit-workflow-audit/contracts/github-issue-schema.md` (example link), `specs/032-speckit-workflow-audit/research.md` (Decision-1 example link), `scripts/migrate-backlog-to-issues.mjs` if T025 used the old path. Skip vendored upstream content under `.specify/templates/`, `.specify/scripts/`, `.specify/skills/` (these belong to Spec Kit, not us).
- [ ] T051e [US3] If T027 already ran, re-run `node scripts/migrate-backlog-to-issues.mjs` (no flag — the script's idempotency guard triggers the body-patch path per the amended T025) so the ~31 already-migrated Issues pick up the corrected `specs/<NNN>/spec.md` links. If T027 has not yet run, this is a no-op — the live run will use the new paths from the start.
- [ ] T051f [US3] Decide on the stray `github-workflows/` directory at repo root (currently contains `ci.yml` + `deploy.yml`). Diff each file against its counterpart in `.github/workflows/`. If duplicate or stale, `git rm -r github-workflows/` and record the decision in `specs/032-speckit-workflow-audit/research.md` § Local customization inventory. If genuinely distinct (unlikely), document the reason for the parallel path.

---

## Phase 6: Polish & cross-cutting concerns

- [ ] T052 [P] Update `CHANGELOG.md` `[Unreleased]` section: add bullets summarising the workflow audit (Spec Kit version bump, BACKLOG → Issues migration, UAT extension, hook trim).
- [ ] T053 [P] Update `README.md` if any user-facing docs reference BACKLOG.md or the old slash command names.
- [ ] T054 Run the full local pipeline: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run sqi`. All must pass with no NEW warnings vs main. Existing 2 lint warnings (calendar.js + time-entry-form.js file-length) are tolerated.
- [ ] T055 Run `specify integration upgrade claude --dry-run` and verify it reports zero modified-but-unupgraded files (i.e., our 3-way merge resolutions all stick after install/upgrade). This is the SC-007 gate.
- [ ] T056 Smoke test (per `quickstart.md` UAT-8): start a throwaway feature `/speckit.specify "smoke test"`, verify Issue auto-created with `feature` + `status:specify` labels, run `/speckit.plan`, verify label transition to `status:plan`, run `/speckit.tasks`, verify label transition to `status:tasks`. Close the smoke Issue + delete the smoke branch when done. This validates the full new workflow end-to-end (SC-004).
- [ ] T056b In-flight feature regression check (FR-012): for each of 022, 027, 028, 029, 030, 031, verify (a) a corresponding GitHub Issue exists with the expected `status:*` label matching the BACKLOG state at migration time, (b) the feature's branch's `quickstart.md` parses cleanly under the new `/speckit.uat.run` (dry-run only — do not advance state). Record results in `specs/032-speckit-workflow-audit/inflight-regression-check.md` (post-rename path; pre-rename: `specs/032-speckit-workflow-audit/inflight-regression-check.md`). If any check fails, fix before T058.
- [ ] T057 Run the full UAT script `quickstart.md` (UAT-1 through UAT-10) and record results inline in the file. This is the gate before opening the PR for review.
- [ ] T058 Review the PR description on the feature PR (look up the number with `gh pr view --json number,url`). Ensure the body lists every behavior change for the team (BACKLOG → Issues, slash command renames, dropped hooks, version bump, folder-layout reversion). Verify SC-006 budget: run `git diff main...HEAD --shortstat -- ':!.specify/scripts/' ':!.specify/templates/' ':!.claude/skills/speckit-*/' ':!.claude/commands/speckit.*.md'`. Net project-owned diff MUST be ≤ 600 lines per SC-006. If over budget, reduce scope or document the overage in the PR body. Move the PR from draft to ready-for-review.

---

## Dependency graph

```
Phase 1 (Setup):       T001 ─→ T002 ─→ T003
                                 ↓        ↓
                                T004 ──→ T005

Phase 2 (Upgrade):     T006…T014 (parallel, all need T002+T003+T004)
                          ↓
                         T015 (consolidates) ─→ T016 (verify)

Phase 3 (US1, P1):     T017 ─→ T018 ─→ {T019, T020, T021, T022} (parallel)
                                          ↓
                                         T023 ─→ T024 (wire up)
                                                   ↓
                                                  T025 ─→ T026 ─→ T027 (live migration)
                                                                    ↓
                                                                   T028 ─→ T029
                                                                              ↓
                                                                           {T030, T031} (parallel)

Phase 4 (US2, P1):     T032 ─→ T033 ─→ T034 ─→ T035 ─→ T036 ─→ T037
                                                                  ↓
                                                              {T038, T039} (parallel)

Phase 5 (US3, P2):     {T040, T041, T042, T043} (parallel) ─→ T044 ─→ {T045, T046, T047} (parallel)
                                                                          ↓
                                                                         T048 ─→ T049 ─→ T050 ─→ T051
                                                                                                  ↓
Phase 5d (FR-016):                                                T051a ─→ T051b ─→ T051c ─→ T051d ─→ T051e ─→ T051f

Phase 6 (Polish):      {T052, T053} (parallel) ─→ T054 ─→ T055 ─→ T056 ─→ T056b ─→ T057 ─→ T058
```

**Cross-phase dependencies:**

- **Phase 2 must complete before Phase 5** (audit decisions are made against the new 0.8.7 vanilla baseline, per Q4).
- **Phase 3 must complete before Phase 5b's `.specify/extensions.yml` audit** (T048) because T024 already makes hook changes; the audit just confirms / refines them.
- **Phase 4 is independent of Phases 3 + 5** in principle, but the documentation tasks (T030/T031/T038/T039) all touch CONTRIBUTING.md + CLAUDE.md — serialise those (or do single-file edits) to avoid merge conflicts within the branch.
- **Phase 5d MUST complete before Phase 6's smoke test (T056)** so the smoke run validates the new `specs/` layout end-to-end. T051e (Issue-body sweep) compensates retroactively if T027 ran before Phase 5d — but the cleaner sequencing is to insert Phase 5d as Phase 2.5 and never produce broken-link Issues in the first place.
- **Phase 6 must come last** — it includes the smoke test that exercises the full end-to-end workflow.

---

## Parallel execution opportunities

**Phase 2 (10 parallel 3-way merges):** T006-T014 can all run in parallel by separate agents; each operates on a distinct file. T015 collects results.

**Phase 3 extension scaffolding:** T019, T020, T021, T022 can run in parallel (different files in `github-issues/`). T023 + T024 must run after.

**Phase 5 inventory:** T040, T041, T042, T043 each diff a different directory tree → trivially parallel.

**Phase 5b individual decisions:** T045, T046, T047 each touch different sections of `.claude/settings.json` → can be split across parallel agents if T044 produced the decision matrix.

**Phase 5d:** Strictly serial — every task depends on the previous (rename → feature.json → script merge → markdown sweep → Issue-body sweep → github-workflows/ decision). Do not parallelize.

**Doc updates within phases:** T030+T031, T038+T039, T052+T053 are pairs that touch the same files (CONTRIBUTING.md, CLAUDE.md) — serialise within each pair.

---

## Implementation strategy

**MVP scope = Phase 1 + Phase 2 + Phase 3.**

That alone produces:

- Spec Kit upgraded to 0.8.7 cleanly.
- BACKLOG.md replaced by GitHub Issues with full historical migration.
- New extension architecture in place for ongoing lifecycle automation.

If time-pressed, this is shippable as the team-handover state. Phases 4 + 5 are tractable follow-ups but not blocking — the workflow already works without them (the bespoke `/speckit.uat` continues to work in its current form once the local-merge step is gone, even if not yet relocated to an extension).

**Recommended delivery order:**

1. **Phase 1 + 2 first** (1-2 working days) — non-trivial 3-way merges; do this when you have focus.
2. **Phase 3 next** (1 day) — extension scaffolding is mechanical once the contracts are clear.
3. **Phase 4** (half day) — pure relocation + small modifications.
4. **Phase 5** (1 day) — the audit fill-in is the most subjective work; benefits from doing 3 + 4 first so you have concrete decisions to evaluate.
5. **Phase 6** (half day) — polish + smoke test + PR readiness.

Total estimated effort: ~4-5 working days for one engineer. Most of Phase 2 is parallelizable across agents to compress.

---

## Format validation

All 65 tasks above follow the required format: `- [ ] T### [P?] [Story?] Description with file path`. Story labels appear on Phase 3-5 tasks only (matching the user-story phases); Setup, Foundational, and Polish phases carry no story label. Every task names its target file path (or directory). (58 original + T056b from FR-012 regression check + T051a–T051f from Phase 5d folder-layout realignment per FR-016.)
