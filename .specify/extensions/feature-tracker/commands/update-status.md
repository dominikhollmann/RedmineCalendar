---
name: speckit.feature-tracker.update-status
description: Transition the active feature's GitHub Issue to a new status:* label.
---

# speckit.feature-tracker.update-status

Moves the active feature's GitHub Issue from its current `status:*` label to a new one. Bound to `after_clarify`, `after_plan`, `after_tasks`, and `after_implement` in `.specify/extensions.yml`, each with its own `args.status` value.

## Behaviour

1. **Read target status.** The hook executor passes `--status <name>` as the command argument (from `extensions.yml`'s `args.status` value). Valid values: `clarify`, `plan`, `tasks`, `implement`, `uat`. `done` is set by the `issue-lifecycle.yml` workflow on PR merge — this command MUST refuse to set it.

2. **Resolve the active feature.** Same as `speckit.feature-tracker.create` — read `.specify/feature.json` or fall back to the branch name.

3. **Look up the Issue.**

   ```sh
   issue_num=$(gh issue list \
     --label feature \
     --search "in:title \"Feature ${NUM}:\"" \
     --state all \
     --json number \
     --jq '.[0].number // empty')
   ```

   If empty, log `No Issue found for Feature ${NUM} — skipping (project may have drifted; run scripts/migrate-backlog-to-issues.mjs)` and exit 0. **This is graceful degradation, not an error** — the hook should never block a Spec Kit step.

4. **Identify the existing `status:*` label.**

   ```sh
   current_status=$(gh issue view "$issue_num" \
     --json labels \
     --jq '[.labels[].name | select(startswith("status:"))][0] // empty')
   ```

5. **Transition.** In a single `gh issue edit` call (atomic):

   ```sh
   if [ -n "$current_status" ]; then
     gh issue edit "$issue_num" \
       --remove-label "$current_status" \
       --add-label "status:${TARGET}"
   else
     gh issue edit "$issue_num" --add-label "status:${TARGET}"
   fi
   ```

6. **Log + return.** Print `Feature ${NUM}: status:${current_status:-none} → status:${TARGET} (Issue #${issue_num})`. Non-zero exit on `gh` failure.

## Guard against setting `status:done`

If the executor passes `--status done`, log a warning and exit 0 without making changes. The `done` transition is reserved for `issue-lifecycle.yml` on PR merge (so the version label can be attached atomically).

## Failure modes (graceful)

- No Issue found → exit 0, log skip reason.
- Multiple `status:*` labels present on the Issue (corrupt state) → still works; `gh` allows removing one label that may not be on the issue. Log the anomaly.
- `gh` not authenticated → exit 1 with `gh auth login` hint.
