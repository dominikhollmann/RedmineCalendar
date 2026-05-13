# Publish Extension for Spec Kit

At the end of every Spec Kit phase (`/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`), automatically:

1. **Commit** any uncommitted phase output (no-op if nothing changed).
2. **Push** the feature branch (sets the upstream on first push).
3. **Open** or **update** the feature's **draft** GitHub PR.

The PR stays in **draft** state through every phase — only `/speckit.uat.run` flips it to ready-for-review (after the user explicitly confirms).

## Requirements

- Spec Kit ≥ 0.8.7
- `gh` CLI ≥ 2.0.0, authenticated
- `git` ≥ 2.30
- GitHub branch protection on `main` (assumed — the draft-PR-first workflow exists to work *with* branch protection, not around it)

## Why this exists

Before this extension, the workflow committed/pushed/PR'd only at `/speckit.uat.run` time. That meant:

- CI didn't run until UAT — late feedback on broken tests / lint.
- Reviewers had nothing to look at during specify / plan / tasks — no incremental review.
- A network blip mid-implementation could lose hours of uncommitted work.

This extension fixes all three by publishing at each natural phase boundary as a **draft** PR.

## Hook bindings

| Hook | Action | Commit message |
|---|---|---|
| `after_specify` | commit `spec.md` + push + open draft PR | `docs(NNN): spec for <title>` |
| `after_clarify` | commit edits + push + refresh PR body | `docs(NNN): clarify spec for <title>` |
| `after_plan` | commit plan + research + data-model + quickstart + contracts + push + refresh | `docs(NNN): plan + design artifacts for <title>` |
| `after_tasks` | commit `tasks.md` + push + refresh | `docs(NNN): tasks for <title>` |
| `after_implement` | commit leftovers + push + refresh | `chore(NNN): finalize implementation for <title>` |

Each step is a no-op for its own commit if there's nothing to commit (e.g. `/speckit.implement` typically commits as it goes; the `after_implement` publish hook's commit step finds nothing to do and skips). Push + PR-body update always run.

## PR body shape

Same shape at every phase, more `✓` checks as the feature progresses:

```markdown
## Summary

<first paragraph of spec.md>

## Spec Kit progress

- [✓] specify
- [✓] clarify
- [·] plan
- [ ] tasks
- [ ] implement
- [ ] uat

## Spec Kit artifacts

- Spec: specs/NNN-name/spec.md
- Plan: specs/NNN-name/plan.md     (← appears when /speckit.plan ran)
...

## Test plan

(Filled in by /speckit.uat.run)

---

Closes #<issue-num>
```

## Opt-out

```bash
specify extension remove publish
```

Restores the pre-feature-032 behaviour (commit + push + PR happen only at UAT time).

## Compatibility

Works alongside the project's other extensions:

- **`github-issues`** — runs first in each `after_*` hook list (Issue label transition), then `publish` runs (commit + push + PR update).
- **`uat`** — handles the final transition: marks PR ready for review, posts UAT-result comment, and includes `Closes #N` so `issue-lifecycle.yml` closes the Issue on merge.

The hook executor runs commands in the order they appear in `.specify/extensions.yml`. The `publish.run` entries are added AFTER the `github-issues.update-status` entries on each hook, so label transitions happen before publication.
