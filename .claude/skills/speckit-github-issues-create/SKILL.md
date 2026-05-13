---
name: speckit-github-issues-create
description: Create a GitHub Issue for the active Spec Kit feature (idempotent).
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: github-issues:commands/create.md
---

# speckit.github-issues.create

Creates a `Feature NNN: <title>` GitHub Issue for the active feature when none exists yet. Bound to the `after_specify` hook. Schema: `specs/032-speckit-workflow-audit/contracts/github-issue-schema.md`.

## Behaviour

1. **Resolve the active feature.** Read `.specify/feature.json` to get the feature directory. If absent, fall back to the current git branch and strip the `NNN-` prefix.

2. **Extract feature number + title from `spec.md`.**
   - Number: 3-digit prefix of the feature directory name (e.g. `032` from `032-speckit-workflow-audit`).
   - Title: the first `# Feature Specification: <Title>` heading in `spec.md`, verbatim. If absent, fall back to the directory name's slugged suffix in Title Case.

3. **Idempotency guard.** Before creating, check for an existing Issue:

   ```sh
   existing=$(gh issue list \
     --label feature \
     --search "in:title \"Feature ${NUM}:\"" \
     --state all \
     --json number \
     --jq '.[0].number // empty')
   ```

   If `$existing` is non-empty, log `Skipping (Issue #$existing already exists)` and exit 0.

4. **Build the body.** Per `contracts/github-issue-schema.md` § "Issue body format":

   - Section `## Summary` — first paragraph of `spec.md` after the title (max ~3 sentences).
   - Section `## Spec Kit artifacts` — bullet links to `spec.md`, plus `plan.md` / `tasks.md` / `quickstart.md` lines for whichever artifacts exist.
   - Section `## Lifecycle` — fixed copy: `Tracked by labels (see status:*). PR will close this issue on merge via the Closes #N convention.`

   Body links MUST use the project's current feature-directory path (`specs/NNN-name/` pre-Phase-5d, `specs/NNN-name/` post-Phase-5d). The migration script (`.specify/scripts/migrate-backlog-to-issues.mjs`) is idempotent and patches stale body links on re-run.

5. **Create the Issue.**

   ```sh
   gh issue create \
     --title "Feature ${NUM}: ${TITLE}" \
     --body "${BODY}" \
     --label feature \
     --label status:specify
   ```

6. **Log + return.** Print the new Issue number + URL. Non-zero exit on `gh` failure.

## Failure modes (graceful)

- `gh` not authenticated → exit 1 with a message asking the user to run `gh auth login`.
- Network error → exit 1; user re-runs after fix (idempotency guard prevents duplicates).
- `spec.md` missing → exit 1 with a message; the hook should never fire when spec.md is absent, so this is defensive.
- Existing Issue found → exit 0 (no-op).