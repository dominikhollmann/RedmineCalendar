---
name: speckit-publish-run
description: Commit any uncommitted phase output, push the feature branch, then open
  or update the feature's draft PR. Bound to every after_<step> hook.
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: publish:commands/run.md
---

# speckit.publish.run

Fires automatically at the end of every Spec Kit phase (`after_specify`, `after_clarify`, `after_plan`, `after_tasks`, `after_implement`). Three jobs:

1. **Commit** any uncommitted phase output (no-op if nothing changed).
2. **Push** the feature branch (auto-sets the upstream tracking branch on first push).
3. **Open or update** the feature's **draft** PR.

The hook executor passes `--phase <name>` (from `args.phase` in `.specify/extensions.yml`). Valid values: `specify`, `clarify`, `plan`, `tasks`, `implement`. The phase drives both the commit message and which line in the PR body gets the ✓ check.

## Behaviour

### Step 1 — Resolve feature context

```sh
# Derive feature number + directory from current branch (NNN-short-name or
# YYYYMMDD-HHMMSS-short-name). check-prerequisites.sh already enforces the
# branch name shape — if we're called, the branch is feature-shaped.
branch=$(git rev-parse --abbrev-ref HEAD)
num=$(printf '%s\n' "$branch" | sed -nE 's/^([0-9]{3,}|[0-9]{8}-[0-9]{6})-.*/\1/p')
[ -n "$num" ] || { echo "speckit.publish.run: branch '$branch' is not feature-shaped — aborting" >&2; exit 1; }
feature_dir="specs/$branch"
[ -d "$feature_dir" ] || feature_dir=$(ls -d specs/${num}-* 2>/dev/null | head -1)
title=$(awk '/^# Feature Specification:/{sub(/^# Feature Specification:[[:space:]]*/, ""); print; exit}' "$feature_dir/spec.md" 2>/dev/null)
[ -n "$title" ] || title="$(printf '%s' "$branch" | sed -E 's/^[^-]+-//;s/-/ /g' | sed -E 's/\b(.)/\U\1/g')"
```

### Step 2 — Commit (only when there are changes)

```sh
if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A
  case "$PHASE" in
    specify)   msg="docs(${num}): spec for ${title}" ;;
    clarify)   msg="docs(${num}): clarify spec for ${title}" ;;
    plan)      msg="docs(${num}): plan + design artifacts for ${title}" ;;
    tasks)     msg="docs(${num}): tasks for ${title}" ;;
    implement) msg="chore(${num}): finalize implementation for ${title}" ;;
    *)         msg="chore(${num}): publish ${PHASE} output for ${title}" ;;
  esac
  git commit -m "$msg"
else
  echo "speckit.publish.run: nothing to commit for phase ${PHASE} — skipping commit"
fi
```

### Step 3 — Push (with `-u origin <branch>` on first push)

```sh
if git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1; then
  git push
else
  git push -u origin "$branch"
fi
```

### Step 4 — Open or update the draft PR

Find existing PR:

```sh
issue_num=$(gh issue list --label feature --search "in:title \"Feature ${num}:\"" --state all --json number --jq '.[0].number // empty')
pr_num=$(gh pr list --head "$branch" --state all --json number --jq '.[0].number // empty')
```

Build the body (canonical layout — same shape at every phase, more ✓s as the feature progresses):

```sh
phase_check() { case "$1" in y) echo "✓" ;; *) echo "·" ;; esac; }

# Read which phases this feature has reached, based on which artifacts exist.
has_spec=$([ -f "$feature_dir/spec.md" ] && echo y)
has_clarify=$(grep -q '^## Clarifications' "$feature_dir/spec.md" 2>/dev/null && echo y)
has_plan=$([ -f "$feature_dir/plan.md" ] && echo y)
has_tasks=$([ -f "$feature_dir/tasks.md" ] && echo y)
# implement isn't an artifact — derive from current phase being at or past it
has_impl=$(case "$PHASE" in implement) echo y ;; esac)

summary=$(awk '/^## Summary/{flag=1; next} /^##/{flag=0} flag && NF{print; exit}' "$feature_dir/spec.md" 2>/dev/null)
[ -n "$summary" ] || summary=$(awk 'NR>1 && /^[^#]/ && NF{print; exit}' "$feature_dir/spec.md" 2>/dev/null)
[ -n "$summary" ] || summary="(draft — summary will be filled in as the feature progresses.)"

artifact_lines=""
[ -f "$feature_dir/spec.md" ]        && artifact_lines="${artifact_lines}- Spec: [\`${feature_dir}/spec.md\`](${feature_dir}/spec.md)"$'\n'
[ -f "$feature_dir/plan.md" ]        && artifact_lines="${artifact_lines}- Plan: [\`${feature_dir}/plan.md\`](${feature_dir}/plan.md)"$'\n'
[ -f "$feature_dir/tasks.md" ]       && artifact_lines="${artifact_lines}- Tasks: [\`${feature_dir}/tasks.md\`](${feature_dir}/tasks.md)"$'\n'
[ -f "$feature_dir/quickstart.md" ]  && artifact_lines="${artifact_lines}- Quickstart: [\`${feature_dir}/quickstart.md\`](${feature_dir}/quickstart.md)"$'\n'

body=$(cat <<EOF
## Summary

${summary}

## Spec Kit progress

- [$(phase_check "$has_spec")] specify
- [$(phase_check "$has_clarify")] clarify
- [$(phase_check "$has_plan")] plan
- [$(phase_check "$has_tasks")] tasks
- [$(phase_check "$has_impl")] implement
- [ ] uat (filled in by \`/speckit.uat.run\` on completion)

## Spec Kit artifacts

${artifact_lines}
## Test plan

(Filled in by \`/speckit.uat.run\` — the UAT walkthrough records the per-item pass/fail/skip results here.)

---

Closes #${issue_num}
EOF
)
```

Apply:

```sh
if [ -n "$pr_num" ]; then
  gh pr edit "$pr_num" --body "$body"
  echo "speckit.publish.run: updated draft PR #${pr_num} for phase ${PHASE}"
else
  pr_url=$(gh pr create --draft --base main --head "$branch" \
    --title "Feature ${num}: ${title}" \
    --body "$body")
  echo "speckit.publish.run: opened draft PR ${pr_url}"
fi
```

### Step 5 — Report

Print a one-line summary to stdout for the hook executor:

```
speckit.publish.run: phase=${PHASE} feature=${num} pushed=<branch> pr=<num-or-url>
```

## Failure modes (graceful)

- **No `gh` auth** → exit 1 with `gh auth login` hint. The Spec Kit step that fired the hook still succeeded; only the publication step is blocked.
- **Branch protection rejects the push** → very unlikely on a feature branch (only `main` is protected), but if it happens, exit 1 with the gh error surfaced. User can retry manually.
- **No upstream Issue** for `Closes #N` → log a warning and write the PR body without the `Closes` line. The lifecycle workflow won't auto-close on merge, but the human can fix that by adding `Closes #N` to the PR body manually.
- **No spec.md yet** (called before specify completed somehow) → exit 1; this shouldn't happen because the hook fires `after_specify`.

## Why this exists

Before this hook, the workflow committed/pushed/PR'd only at `/speckit.uat.run` time — all the work-in-progress was invisible until UAT. That meant: CI didn't run on the early phases; reviewers had nothing to look at until the very end; a network blip mid-implementation could lose hours of uncommitted work. This hook fixes all three by publishing at each natural phase boundary as a **draft** PR, so visibility is high but the PR signals "not ready for review yet" until `/speckit.uat.run` flips it.

Branch protection is still the gate — no auto-merge, no force-push, no work-around. The draft state is the protection against accidentally requesting review on incomplete work.