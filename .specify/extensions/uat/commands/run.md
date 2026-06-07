---
name: speckit.uat.run
description: Guide the user through the user acceptance tests in quickstart.md, track results, and post completion to a GitHub PR (no local merge).
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Locate the feature**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR. All paths must be absolute.

   The script enforces that the current git branch matches the Spec Kit feature-branch naming convention (`NNN-short-name` or `YYYYMMDD-HHMMSS-short-name`) via `check_feature_branch` in `common.sh`. If the user is not on a feature branch, the script exits non-zero and you should stop and ask them to `git switch <branch>` first — UAT only ever runs against the branch's own feature.

   If the user input contains a feature number (e.g., "021") that does NOT match the current branch, refuse to run: tell the user to switch to that feature's branch first (`git switch 021-...`). Do not attempt to override the branch enforcement.

2. **Load quickstart.md**: Read `FEATURE_DIR/quickstart.md`. If it does not exist, stop and tell the user that no quickstart file was found — suggest running `/speckit.checklist` first.

3. **Identify open tests**: Scan quickstart.md for all lines matching `- [ ]`. Group them by section heading. Skip lines marked as "nicht testbar" or similar non-actionable annotations.

   - If there are no open tests, tell the user all tests are already marked as passed and ask if they want to re-run any section.
   - Otherwise, report how many open tests remain and which sections they are in.

4. **Run tests interactively**, section by section:

   For each section:
   - Print the section heading.
   - For each open test item in that section:
     - Print the test description clearly.
     - If the test has sub-steps (nested `- [ ]` lines), print each sub-step.
     - Wait for the user to respond:
       - **"check"** or **"ok"** → mark the item (and all its sub-steps) as `[x]` in quickstart.md, continue to next item.
       - **"fail"** or **"bug"** + description → note the failure, do NOT mark as done, continue to next item and note open issues at the end.
       - **"skip"** → leave as `[ ]`, continue.
       - **"stop"** → save progress so far, report summary, stop.
     - After marking, immediately write the updated checkbox to quickstart.md (do not batch updates).

5. **Detect code changes and update upstream docs**: After all tests have been presented (or when the user says "stop"), check if any source code was modified during the UAT session (implementation fixes, tweaks, etc.):

   - Run `git diff --name-only HEAD` to detect uncommitted changes to source files (js/, css/, *.html, docs/).
   - If source code changes exist:
     1. **Commit the fixes** with a descriptive message (e.g., "fix: adjust help button spacing per UAT feedback"). Commit to the **feature branch** — never to main.
     2. **Check if spec/plan/tasks need updating**: Ask the user:
        > "Code was changed during UAT. Do any of these changes affect the spec, plan, or task descriptions? (yes/no)"
     3. If **yes**: Walk through each changed file and ask the user what needs updating. Then update the relevant docs (spec.md, plan.md, tasks.md) to reflect the change. Commit the doc updates separately.
     4. If **no**: Proceed — the changes are cosmetic/implementation-only tweaks that don't affect upstream docs.
     5. **Check if user documentation needs updating**: If `docs/` directory exists at repository root and the feature is user-facing, check whether the UAT changes affect user-facing behavior (new UI elements, changed interactions, updated shortcuts, etc.). If yes, update `docs/content.en.md` and `docs/content.de.md` to reflect the changes. Commit separately.
   - If no source code changes detected, skip this step.

6. **Documentation confirmation** (mandatory, always runs): Before writing the summary, ask:

   > "Docs check: Has `docs/content.en.md` + `docs/content.de.md` been updated for this feature? (yes — updated / n/a — purely internal change with no UX impact)"

   - **yes** or **n/a** → proceed to step 7.
   - **no** / **not yet** → stop here. Tell the user: "User documentation must be updated before UAT can be marked as passed. Update `docs/content.en.md` and `docs/content.de.md`, then re-run `/speckit-uat-run`." Do NOT proceed to step 7.

7. **End-of-run summary**: After all open tests have been presented:
   - Report: total tested, passed, failed, skipped.
   - List any failures with their descriptions.
   - If all testable items are now `[x]`:
     - **Issue lookup**: derive the feature number from the FEATURE_DIR basename's 3-digit prefix (e.g. `032-speckit-workflow-audit` → `032`). Find the GitHub Issue with `gh issue list --label feature --search 'in:title "Feature 032:"' --state all --json number --jq '.[0].number // empty'`.
     - Tell the user the feature is now complete and that PR creation will follow.
   - If failures remain:
     - Tell the user which items need fixing before the feature can be marked done.
     - Skip steps 8 + 9.

8. **Update tasks.md**: If `FEATURE_DIR/tasks.md` exists, find the task that references running the quickstart acceptance checklist (typically the last task in the Polish phase, e.g. "Run the full quickstart.md acceptance checklist manually") and mark it as `[x]`.

9. **Confirm with the user, then flip the PR to ready-for-review** (only if all tests passed):

   Derive the feature branch name from the FEATURE_DIR basename (e.g. `specs/032-speckit-workflow-audit` → `032-speckit-workflow-audit`). Push outstanding feature-branch commits first if needed: `git push -u origin <branch>` (or bare `git push` if upstream is already set).

   **Ask the user**:

   > "All UAT items passed. Mark the PR as ready-for-review? (yes / no / not-yet)"

   - **yes** → proceed to step 9a.
   - **no** / **not-yet** → leave the PR in draft. Tell the user "PR left as draft. Use `gh pr ready <num>` to flip it when ready." Skip 9a; still post the UAT-result comment in 9b so reviewers know UAT passed.

   **9a — flip to ready** (only on `yes`):

   ```sh
   pr_num=$(gh pr list --head <branch> --state open --json number --jq '.[0].number // empty')
   if [ -n "$pr_num" ]; then
     gh pr ready "$pr_num"
   fi
   ```

   The `publish` extension has been opening this PR as a draft at every Spec Kit phase. By the time UAT passes, it almost always already exists. The rare "no PR yet" case (e.g. the `publish` hook never fired because the user disabled it) is handled by the create-or-comment logic in 8b below.

   **9b — post the UAT result**:

   - **If a PR already exists** (the normal case):
     ```sh
     gh pr comment "$pr_num" --body "$(cat <<'EOF'
     ## UAT passed ✓

     All quickstart.md acceptance items are marked `[x]`. Feature is ready to merge via the GitHub UI (branch protection blocks local merges; that is by design).

     Closes #<issue-num>
     EOF
     )"
     ```
   - **If no PR exists** (only happens when the `publish` extension is disabled):
     ```sh
     gh pr create \
       --base main \
       --head <branch> \
       --title "Feature <NUM>: <Title>" \
       --body "$(cat <<'EOF'
     ## Summary

     <2-3 sentence summary of what shipped, drawn from spec.md.>

     ## UAT result

     UAT passed (all quickstart.md items marked `[x]`).

     ## Test plan

     See `<FEATURE_DIR>/quickstart.md` for the acceptance test list.

     ---

     Closes #<issue-num>
     EOF
     )"
     ```
     If the user said `yes` in the confirmation prompt, this should be created with `gh pr create` (NOT `--draft`) so it opens ready-for-review. Otherwise pass `--draft`.

   - Report the PR URL to the user. **Do NOT attempt to merge** — branch protection requires a human to click merge in the GitHub UI. The `issue-lifecycle.yml` workflow will close the linked Issue and assign the milestone + create the Release with auto-generated notes on merge (via release.yml).

   If the feature branch has no remote tracking branch, run `git push -u origin <branch>` first.

## Notes

- Always update quickstart.md immediately after each "check" — never defer writes.
- Do not skip tests marked only with comments like *(nicht testbar)* — these are already excluded from the open-test scan in step 3.
- The `Closes #N` reference in the PR body is what triggers `.github/workflows/issue-lifecycle.yml` on merge — without it the Issue lifecycle won't update. Double-check the Issue number resolves to a real Issue before posting.
- The local-merge step that used to live here has been removed: branch protection requires PRs. The human merges via the GitHub UI; the workflows handle cleanup (Issue close + version milestone + release notes) automatically.
- If the user says "check" for an entire section at once (e.g., "all check"), mark all open items in that section as `[x]` at once.
