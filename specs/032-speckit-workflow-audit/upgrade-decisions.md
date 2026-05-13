# Spec Kit 0.6.1 → 0.8.8 upgrade decisions

**Feature**: 032-speckit-workflow-audit
**Pre-upgrade tag**: `pre-speckit-0.8.7-upgrade-032` (commit c35416e)
**Vanilla baselines**: `/tmp/specify-0.6.1-vanilla/`, `/tmp/specify-0.8.8-vanilla/`
**Filelist source**: `upgrade-filelist.txt` (derived from 0.8.8 vanilla `find`; `specify integration upgrade` in 0.8.8 has no `--dry-run` flag)

## Deviations from the spec's pre-measurement assumptions

| Spec assumption                                                                      | Reality                                                                                                                                                                                                                                                                                                                                                                                      | How handled                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upgrade target = Spec Kit **0.8.7**                                                  | Locally installed `specify` is **0.8.8** (one patch newer) — both `git ls-remote` confirmed tag v0.8.8 exists upstream                                                                                                                                                                                                                                                                       | Treating 0.8.8 as "theirs" since that's what `specify integration upgrade claude` would actually produce on this machine. `init-options.json` updated to `"speckit_version": "0.8.8"`. FR-013 requires `≥ 0.8.7`, so satisfied. |
| `specify integration upgrade claude --dry-run` exists and emits a canonical filelist | The `--dry-run` flag was removed (or never shipped) in 0.8.8 — `specify integration upgrade --help` shows only `--force`, `--script`, `--integration-options`                                                                                                                                                                                                                                | Filelist derived deterministically from `find` on the 0.8.8 vanilla scratch tree. Equivalent data, different source.                                                                                                            |
| Initial CLI flag was `--integration claude`                                          | 0.6.1 + 0.8.8 both accept `--ai claude` (plus `--script sh --no-git --force` for scratch-dir use)                                                                                                                                                                                                                                                                                            | Used `--ai claude`                                                                                                                                                                                                              |
| Dropped-upstream files can be cleanly removed                                        | 0.8.8 removed `agent-file-template.md`, `update-agent-context.sh`, `integrations/claude/scripts/update-context.{sh,ps1}` — but all 4 are still referenced by `.specify/integration.json`, `speckit.manifest.json`, `claude.manifest.json`, `.specify/memory/constitution.md`, `.claude/commands/speckit.plan.md`, `.claude/skills/speckit-plan/SKILL.md`, and the dropped scripts themselves | **Retain locally; defer removal to Phase 5 audit** (requires updating each referencing file in lockstep). Recorded as a `keep` row in the Phase 5 inventory.                                                                    |

## Per-file resolution

Legend:

- **accept-upstream**: project version is replaced by 0.8.8 vanilla (no local edits to preserve)
- **re-apply-ours**: project version retained as-is (local customizations essential or file is project content)
- **3-way-merge**: real merge — local edits re-applied on top of upstream changes
- **add-from-upstream**: file missing locally, copy in from 0.8.8 vanilla
- **defer-to-audit**: decision belongs to Phase 5 (project-specific content with no vanilla counterpart, or dropped-upstream with live references)

### A. Already current vs 0.8.8 (no-op)

| File                                          | Resolution            | Notes                      |
| --------------------------------------------- | --------------------- | -------------------------- |
| `.specify/templates/constitution-template.md` | no-op (matches 0.8.8) | Identical to 0.8.8 vanilla |
| `.specify/templates/spec-template.md`         | no-op (matches 0.8.8) | Identical to 0.8.8 vanilla |

### B. Clean accept-upstream (project at 0.6.1, no local edits)

Project's local copy is byte-identical to 0.6.1 vanilla; 0.8.8 vanilla differs. Replacing project with 0.8.8 vanilla copy. No conflict possible.

| File                                            | Resolution      |
| ----------------------------------------------- | --------------- |
| `.claude/skills/speckit-analyze/SKILL.md`       | accept-upstream |
| `.claude/skills/speckit-checklist/SKILL.md`     | accept-upstream |
| `.claude/skills/speckit-clarify/SKILL.md`       | accept-upstream |
| `.claude/skills/speckit-constitution/SKILL.md`  | accept-upstream |
| `.claude/skills/speckit-plan/SKILL.md`          | accept-upstream |
| `.claude/skills/speckit-taskstoissues/SKILL.md` | accept-upstream |
| `.specify/integration.json`                     | accept-upstream |
| `.specify/templates/checklist-template.md`      | accept-upstream |

### C. Add-from-upstream (missing locally, new in 0.8.8 OR present in 0.6.1 but never landed)

| File                                        | Resolution        | Notes                                                                                     |
| ------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `.claude/skills/speckit-specify/SKILL.md`   | add-from-upstream | Present in 0.6.1 vanilla — never landed locally; likely deleted at some point by accident |
| `.specify/scripts/bash/setup-tasks.sh`      | add-from-upstream | New in 0.8.8 (called by the rewritten tasks flow)                                         |
| `.specify/workflows/speckit/workflow.yml`   | add-from-upstream | New in 0.8.8 — workflow-registry mechanism                                                |
| `.specify/workflows/workflow-registry.json` | add-from-upstream | New in 0.8.8                                                                              |

### D. Real 3-way merges (resolved)

| File                                           | `git merge-file` result | Resolution                         | Decision rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.specify/scripts/bash/check-prerequisites.sh` | clean                   | 3-way-merge applied verbatim       | Ours added a `--feature` flag and `shift` bug fixes; theirs added nothing overlapping. Clean union.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `.specify/scripts/bash/common.sh`              | 2 conflicts             | 3-way-merge with manual resolution | **Conflict 1**: ours added `get_feature_dir() { ".specify/features/..." }` + `set_active_feature()`; theirs added `read_feature_json_feature_directory()` + `feature_json_matches_feature_dir()`. Combined: kept ours' path & helper AND added theirs' two helpers. **Conflict 2**: ours used `local branch_name="$2"` + `.specify/features` path; theirs used `branch_name=$(spec_kit_effective_branch_name "$2")` + `specs/` path. Combined: theirs' branch normalization + ours' path (path swap deferred to Phase 5d). |
| `.specify/scripts/bash/create-new-feature.sh`  | clean                   | 3-way-merge applied verbatim       | Ours added `--no-branch` / `--allow-non-main` flags for specs-on-main policy; theirs added orthogonal improvements. Clean union.                                                                                                                                                                                                                                                                                                                                                                                           |
| `.specify/scripts/bash/setup-plan.sh`          | 1 conflict              | Took **theirs**                    | Ours: `[[ ! -f .specify/feature.json ]]` (file-existence check). Theirs: `! feature_json_matches_feature_dir "$REPO_ROOT" "$FEATURE_DIR"` (stricter — requires the pinned dir to actually match). Theirs is more correct (rejects stale feature.json) and the helper is now defined in our `common.sh` per conflict-1 resolution.                                                                                                                                                                                          |
| `.specify/templates/plan-template.md`          | 1 conflict              | Took **ours**                      | Conflict was the path `.specify/features/[###-feature]/` (ours) vs `specs/[###-feature]/` (theirs) AND dot- vs dash-form slash command names. Path stays ours until Phase 5d rename; dot-form slash commands are project standard (rest of the merged template still uses dot-form in 12 places, dash in 7 — that mixed state is a Phase 5 audit item).                                                                                                                                                                    |
| `.specify/templates/tasks-template.md`         | clean                   | 3-way-merge applied verbatim       | Large diff vs both bases (159 / 168 lines) but no overlapping edits — clean union. Adopts T010-numbered tests, per-task inline test requirement, and dropped "Polish and validation" phase.                                                                                                                                                                                                                                                                                                                                |
| `.claude/skills/speckit-implement/SKILL.md`    | clean                   | 3-way-merge applied verbatim       | Clean union of ours' BACKLOG-update step (will be removed in Phase 3) and theirs' phase reorder + "Definition of Done" checklist.                                                                                                                                                                                                                                                                                                                                                                                          |
| `.claude/skills/speckit-tasks/SKILL.md`        | clean                   | 3-way-merge applied verbatim       | Clean union of upstream refinements + our customizations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### E. Re-apply-ours (project content; do not touch)

| File                                          | Resolution              | Notes                                                                                                                                             |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.specify/memory/constitution.md`             | re-apply-ours           | Project's bespoke constitution (6 principles + SQI/CI gates). Per T011 explicit guidance: NOT the Spec Kit template — do not merge with vanilla.  |
| `.specify/integrations/claude.manifest.json`  | re-apply-ours           | Project-specific integration identity. Hash-list inside the manifest should refresh on next `specify integration upgrade`; not a Phase 2 concern. |
| `.specify/integrations/speckit.manifest.json` | re-apply-ours           | Same as above — manifest hashes are derived, not authored.                                                                                        |
| `.specify/init-options.json`                  | already updated in T005 | Bumped version + schema-aligned (dropped `preset`, added `context_file`)                                                                          |
| `CLAUDE.md`                                   | re-apply-ours           | Project's bespoke CLAUDE.md (multi-feature context); 0.8.8 vanilla ships only a starter scaffold.                                                 |

### F. Defer to Phase 5 audit

| File                                                      | Resolution     | Notes                                                                       |
| --------------------------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| `.specify/templates/agent-file-template.md`               | defer-to-audit | Dropped in 0.8.8 vanilla; still referenced by project — see deviation table |
| `.specify/scripts/bash/update-agent-context.sh`           | defer-to-audit | Same as above                                                               |
| `.specify/integrations/claude/scripts/update-context.sh`  | defer-to-audit | Same as above                                                               |
| `.specify/integrations/claude/scripts/update-context.ps1` | defer-to-audit | Same as above                                                               |

## Resolution summary (T015)

Total files in 0.8.8 manifest: **27**

| Resolution                                      | Count | Notes                                                                                                          |
| ----------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| no-op (already matches 0.8.8)                   | 2     | constitution-template.md, spec-template.md                                                                     |
| accept-upstream (clean copy from 0.8.8 vanilla) | 8     | 6 SKILLs + integration.json + checklist-template.md                                                            |
| add-from-upstream (missing locally)             | 4     | speckit-specify SKILL, setup-tasks.sh, 2 workflow files                                                        |
| 3-way merge (clean)                             | 5     | check-prerequisites.sh, create-new-feature.sh, tasks-template.md, speckit-implement SKILL, speckit-tasks SKILL |
| 3-way merge (with conflicts)                    | 3     | common.sh (2 conflicts), setup-plan.sh (1), plan-template.md (1) — all resolved                                |
| re-apply-ours (project content, no merge)       | 5     | constitution.md, both manifests, init-options.json (T005 covered), CLAUDE.md                                   |
| defer-to-audit                                  | 4     | 4 dropped-upstream files still referenced by project — Phase 5                                                 |

Total accounted: 31 (the 4 deferred files appear in 0.6.1 but NOT in the 0.8.8 manifest of 27 — they're "extra" locally).

**Noteworthy upstream changes (theirs ≠ base):**

- 0.8.8 dropped `agent-file-template.md`, `update-agent-context.sh`, and the `claude/scripts/update-context.{sh,ps1}` pair. Project still references them; flagged for Phase 5 audit.
- 0.8.8 introduced a `workflows/` mechanism (`workflow.yml` + `workflow-registry.json`) that supplants the legacy `extensions.yml` hook approach. Project still uses `extensions.yml`. Coexistence is fine; Phase 5 audit decides whether to migrate.
- 0.8.8 added `setup-tasks.sh` (new) and `feature_json_matches_feature_dir` + `spec_kit_effective_branch_name` helpers to `common.sh`.
- 0.8.8 vanilla `init-options.json` schema dropped `preset`, added `context_file`. Applied in T005.
- 0.8.8 vanilla `CLAUDE.md` is a starter scaffold; our project already has a rich CLAUDE.md (re-apply-ours).

**Reversibility**: Tag `pre-speckit-0.8.7-upgrade-032` (commit c35416e) is the rollback anchor. `git checkout pre-speckit-0.8.7-upgrade-032 -- .specify .claude` reverts the upgrade in one shot.
