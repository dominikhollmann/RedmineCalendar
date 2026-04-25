---
description: Guide the user through the user acceptance tests in quickstart.md, track results, and update BACKLOG.md on completion.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Locate the feature**: Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json` from repo root and parse FEATURE_DIR. All paths must be absolute.

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
     1. **Commit the fixes** with a descriptive message (e.g., "fix: adjust help button spacing per UAT feedback").
     2. **Check if spec/plan/tasks need updating**: Ask the user:
        > "Code was changed during UAT. Do any of these changes affect the spec, plan, or task descriptions? (yes/no)"
     3. If **yes**: Walk through each changed file and ask the user what needs updating. Then update the relevant docs (spec.md, plan.md, tasks.md) to reflect the change. Commit the doc updates separately.
     4. If **no**: Proceed — the changes are cosmetic/implementation-only tweaks that don't affect upstream docs.
     5. **Check if user documentation needs updating**: If `docs/` directory exists at repository root and the feature is user-facing, check whether the UAT changes affect user-facing behavior (new UI elements, changed interactions, updated shortcuts, etc.). If yes, update `docs/content.en.md` and `docs/content.de.md` to reflect the changes. Commit separately.
   - If no source code changes detected, skip this step.

6. **End-of-run summary**: After all open tests have been presented:
   - Report: total tested, passed, failed, skipped.
   - List any failures with their descriptions.
   - If all testable items are now `[x]`:
     - Update `BACKLOG.md` in the repository root: find the row for this feature, set the UAT column to `[✅](.specify/features/<feature-dir>/quickstart.md)` (linked to the quickstart file) and Status to `**done**`, then move the row from its current section (e.g. "In Progress") to the **top** of the "Done" table. This maintains descending order by release version. **Preserve existing links** on other columns — do not strip `[✅](path)` formatting.
     - Tell the user the feature is now complete.
   - If failures remain:
     - Tell the user which items need fixing before the feature can be marked done.
     - Do NOT update BACKLOG.md UAT or Status columns.

7. **Update tasks.md**: If `FEATURE_DIR/tasks.md` exists, find the task that references running the quickstart acceptance checklist (typically the last task in the Polish phase, e.g. "Run the full quickstart.md acceptance checklist manually") and mark it as `[x]`.

8. **Merge and clean up** (only if all tests passed):

   Derive the feature branch name from the FEATURE_DIR basename (e.g. `.specify/features/011-visual-appearance` → `011-visual-appearance`).

   1. Note the current branch.
   2. `git checkout main`
   3. `git merge <feature-branch> --no-ff -m "merge: <feature-branch> into main\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"`
   4. `git push`
   5. Delete the remote feature branch: `git push origin --delete <feature-branch>`
   6. Delete the local feature branch: `git branch -D <feature-branch>`
   7. Tell the user: "Merged `<feature-branch>` into `main`, pushed, and deleted the branch."

   If the merge fails (e.g. conflicts), stop and report the conflict to the user — do not force or skip.
   If the feature branch does not exist as a remote branch, skip step 5 silently.

## Notes

- Always update quickstart.md immediately after each "check" — never defer writes.
- Do not skip tests marked only with comments like *(nicht testbar)* — these are already excluded from the open-test scan in step 3.
- The BACKLOG.md update should move the feature row to the top of the "Done" section (not just update cells in place). The Done section is sorted descending by release version — inserting at the top maintains this order since newer features finish later.
- If the user says "check" for an entire section at once (e.g., "all check"), mark all open items in that section as `[x]` at once.
