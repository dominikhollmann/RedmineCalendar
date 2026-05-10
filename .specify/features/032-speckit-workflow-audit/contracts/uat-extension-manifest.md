# Contract: UAT extension manifest + structure

**Audience**: implementers building the project-local Spec Kit extension that hosts the UAT slash command.

This contract defines the on-disk shape of the UAT extension produced by Phase 2 (per Decision 3 / Q2-Decision in research.md). The same shape applies — with different file names — to the sibling `github-issues` extension. Implementers MUST follow this layout so both extensions survive `specify integration upgrade` and behave consistently with the community catalog precedent (`Fatima367/spec-kit-github-issues`, `aaronrsun/spec-kit-issue`).

---

## Directory layout

```text
.specify/extensions/uat/
├── extension.yml         # Manifest (required)
├── commands/
│   └── run.md            # The `/speckit.uat.run` slash command body
└── README.md             # Human-readable overview, requirements, opt-out
```

No other files are required. No tests directory (the extension wraps interactive logic — testability is via dry-run invocation against a sample feature, recorded in the extension's README).

---

## `extension.yml` schema

```yaml
name: uat                                  # MUST match the directory name
version: 1.0.0                             # SemVer; bump on any contract-changing edit
description: Interactive UAT walkthrough that reads quickstart.md, marks items, and posts results to a PR.
homepage: https://github.com/dominikhollmann/RedmineCalendar
license: MIT

requires:
  speckit_version: ">=0.8.7"               # Hard floor — relies on extension hook system shipped at this version
  tools:
    - gh: ">=2.0.0"                        # `gh pr create`, `gh pr comment`, `gh pr view`
    - git: ">=2.30"

commands:
  - name: uat.run                          # Resolves to `/speckit.uat.run`
    file: commands/run.md
    description: Walk the user through quickstart.md UAT items; post results to PR.

hooks: []                                  # No automatic hooks — UAT is human-invoked
```

**Notes**:

- `name: uat` (not `speckit-uat`) — Spec Kit prepends `speckit.` automatically when registering the slash command.
- No `hooks` block — UAT is always human-invoked; auto-firing on `after_implement` would surprise the user (UAT requires a clean working tree + an open PR + active human attention).
- `requires.speckit_version: ">=0.8.7"` is a hard floor because the hook system contract changed between 0.6.x and 0.8.x. We never want this extension installed in a project still on 0.6.x.

---

## `commands/run.md` shape

The command file is a Claude Code slash-command markdown file with frontmatter. The body is the UAT skill currently living at `.claude/commands/speckit.uat.md`, with these required modifications:

1. **Drop the local-merge step entirely.** The block that does `git checkout main && git merge --no-ff … && git push` is removed. Replace with PR-comment integration:
    - If a PR exists for the feature branch: `gh pr comment <num> --body "UAT passed for feature NNN. Ready to merge via the GitHub UI."`
    - If no PR exists: `gh pr create --base main --head <branch> --title "<title>" --body "<UAT-passed body>"`
    - Tell the user the PR URL; do not attempt the merge.

2. **Drop the `git push origin --delete <branch>` + `git branch -D <branch>` cleanup steps.** Both are post-merge actions; under branch protection + auto-delete-on-merge, GitHub handles them after the human merges.

3. **Keep everything else.** The interactive walkthrough of `quickstart.md` `- [ ]` items, the per-item commit-when-fix-needed flow, the tasks.md update on completion, the BACKLOG.md update — wait, BACKLOG.md is going away (per FR-005). Replace BACKLOG.md update with `gh issue edit <num> --remove-label status:uat --add-label status:done` — actually no, the close-on-PR-merge workflow handles `status:done`. So just remove the BACKLOG update; the lifecycle workflow does the rest.

4. **Add a final `Closes #N` reminder** to the PR-comment body so when the user clicks merge on GitHub, the linked Issue auto-closes.

5. **Frontmatter**: `name: speckit.uat.run` (the leading `speckit.` is required for the registry to discover it).

---

## `README.md` shape

Minimum sections:

```markdown
# UAT Extension for Spec Kit

Interactive User Acceptance Testing walkthrough for the RedmineCalendar
Spec Kit workflow. Reads `quickstart.md`, walks the user through each
`- [ ]` item, marks `[x]` on confirmation, opens or comments on a PR
when complete.

## Requirements

- Spec Kit ≥ 0.8.7
- `gh` CLI ≥ 2.0.0, authenticated
- An active feature with `quickstart.md`

## Usage

`/speckit.uat.run` — invoke against the active feature.
`/speckit.uat.run <feature-num>` — invoke against a specific feature.

## Behavior

1. Reads `<FEATURE_DIR>/quickstart.md`.
2. Walks each open `- [ ]` item interactively. User responds `check` /
   `fail <reason>` / `skip` / `stop`. Items are marked `[x]` immediately on
   `check`.
3. Detects source-code changes during UAT and offers to commit them to the
   feature branch (NEVER to main).
4. On completion: opens a PR if one doesn't exist, comments on the PR with
   the UAT result, marks the feature's Issue with `status:uat`. Does NOT
   merge — that's the human's call via the GitHub UI.

## Opt-out

Remove this directory or unregister the extension via
`specify extension uninstall uat`. The hook system has no UAT bindings,
so removal has no transitive effect.
```

---

## Sibling extension: `.specify/extensions/github-issues/`

The sibling extension uses the same shape, with these differences in `extension.yml`:

```yaml
name: github-issues
version: 1.0.0
requires:
  speckit_version: ">=0.8.7"
  tools:
    - gh: ">=2.0.0"

commands:
  - name: github-issues.create
    file: commands/create.md
    description: Create a GitHub Issue for the active feature.
  - name: github-issues.update-status
    file: commands/update-status.md
    description: Move the feature's Issue to a new status:* label.

hooks:
  after_specify:
    - command: github-issues.create
      enabled: true
      optional: false
      description: Auto-create the GitHub Issue after a new spec is written.
  after_clarify:
    - command: github-issues.update-status
      enabled: true
      optional: false
      args: { status: clarify }
  after_plan:
    - command: github-issues.update-status
      enabled: true
      optional: false
      args: { status: plan }
  after_tasks:
    - command: github-issues.update-status
      enabled: true
      optional: false
      args: { status: tasks }
  after_implement:
    - command: github-issues.update-status
      enabled: true
      optional: false
      args: { status: implement }
```

**Plus**: a `workflows/issue-lifecycle.yml` file that the extension's installer copies into `.github/workflows/` (per `contracts/github-issue-schema.md`'s lifecycle workflow contract). This is the only file the extension installs OUTSIDE its own directory.

**Migration script**: lives at `scripts/migrate-backlog-to-issues.mjs` (NOT inside the extension). It's a one-shot tool, used once, then can be deleted from the repo (or kept around as documentation of the migration). Putting it in the extension would muddy the extension's purpose (which is the ongoing lifecycle automation, not the one-time history backfill).

---

## Validation rules

- `extension.yml` MUST parse as valid YAML (CI gate via `yq` or similar).
- `commands.<n>.file` paths MUST exist relative to the extension directory.
- `requires.speckit_version` MUST be present and pinned to a real version.
- `hooks.<step>.<n>.command` MUST refer to a command defined in the same extension's `commands` list, or to a command from another *installed* extension (the resolver checks at hook execution time).
- The extension MUST be installable via `specify extension install <path>` from a fresh checkout — i.e., everything needed is committed to the repo and reachable from the manifest.
