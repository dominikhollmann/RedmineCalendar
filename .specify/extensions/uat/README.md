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
   the UAT result, includes a `Closes #N` reference to the feature's GitHub
   Issue. Does NOT merge — that's the human's call via the GitHub UI.
5. The `.github/workflows/issue-lifecycle.yml` workflow closes the Issue
   and stamps the `version:vX.Y.Z` label automatically when the PR merges.

## Why this lives in an extension

The original `/speckit.uat` skill (`.claude/commands/speckit.uat.md`)
tried to do `git checkout main && git merge --no-ff && git push` locally —
broken under branch protection. The fix moves the skill to a project-local
extension so it (a) survives `specify integration upgrade` and (b) drops
the local-merge step entirely. See feature 032's `.specify/features/032-
speckit-workflow-audit/contracts/uat-extension-manifest.md` for the full
contract.

## Opt-out

```bash
specify extension remove uat
```

This removes the extension and the registered `speckit.uat.run` skill.
