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

5. **End-of-run summary**: After all open tests have been presented:
   - Report: total tested, passed, failed, skipped.
   - List any failures with their descriptions.
   - If all testable items are now `[x]`:
     - Update `BACKLOG.md` in the repository root: find the row for this feature and set the UAT column to `✅` and Status to `**done**`.
     - Tell the user the feature is now complete.
   - If failures remain:
     - Tell the user which items need fixing before the feature can be marked done.
     - Do NOT update BACKLOG.md UAT or Status columns.

6. **Update tasks.md**: If `FEATURE_DIR/tasks.md` exists, find the task that references running the quickstart acceptance checklist (typically the last task in the Polish phase, e.g. "Run the full quickstart.md acceptance checklist manually") and mark it as `[x]`.

7. **Merge and clean up** (only if all tests passed):

   Derive the feature branch name from the FEATURE_DIR basename (e.g. `specs/011-visual-appearance` → `011-visual-appearance`).

   1. Note the current branch.
   2. `git checkout main`
   3. `git merge <feature-branch> --no-ff -m "merge: <feature-branch> into main\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"`
   4. `git push`
   5. Delete the remote feature branch: `git push origin --delete <feature-branch>`
   6. Return to the feature branch: `git checkout <feature-branch>`
   7. Tell the user: "Merged `<feature-branch>` into `main`, pushed, and deleted the remote branch."

   If the merge fails (e.g. conflicts), stop and report the conflict to the user — do not force or skip.
   If the feature branch does not exist as a remote branch, skip step 5 silently.

## Notes

- Always update quickstart.md immediately after each "check" — never defer writes.
- Do not skip tests marked only with comments like *(nicht testbar)* — these are already excluded from the open-test scan in step 3.
- The BACKLOG.md update in step 5 should preserve the existing table structure — only change the UAT cell and Status cell for the matching feature row.
- If the user says "check" for an entire section at once (e.g., "all check"), mark all open items in that section as `[x]` at once.
