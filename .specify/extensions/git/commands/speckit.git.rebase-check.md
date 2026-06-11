---
description: "Check whether the feature branch has diverged from main and offer to rebase before implementation starts"
---

# Rebase Check Before Implementation

Before any implementation work begins, verify the feature branch is up to date with
`origin/main`. If main has moved on since the branch was created, surface the new
commits and offer a rebase so that implementation starts against the current codebase.

## Behavior

1. Run `git fetch origin main` to ensure the remote ref is current.
2. Run `git log --oneline HEAD..origin/main` to list commits on main that are not
   on the current branch.
3. **If the list is empty**: print a short confirmation (`Branch is up to date with
   origin/main`) and exit — no action needed.
4. **If the list is non-empty**: display the commits to the user and explain that
   the plan and tasks were written against an older state of main. Ask:

   > "main has N new commit(s) since this branch was created. Rebase now so
   > implementation starts against the current codebase? (Recommended — lets you
   > spot any plan assumptions that may have changed before writing code.)"

5. **If the user agrees to rebase**: run `git rebase origin/main`.
   - If the rebase completes cleanly: confirm success and remind the user to scan
     the plan for any file paths or API shapes that may have changed.
   - If there are conflicts: list the conflicting files, instruct the user to
     resolve them manually (`git rebase --continue` after each), and pause
     implementation until the rebase is finished.
6. **If the user declines**: acknowledge the choice, note that plan assumptions may
   not match the current state of main, and continue to implementation.

## Execution

```bash
git fetch origin main
git log --oneline HEAD..origin/main
```

No dedicated script — the above two commands plus the interactive decision above are
sufficient.

## Graceful Degradation

- If Git is not available or the working directory is not a repository: skip with a warning.
- If `origin/main` does not exist (e.g., offline or different remote name): skip with a warning.
- If the branch is already at the tip of `origin/main` (merge-base equals remote tip): confirm and exit.
