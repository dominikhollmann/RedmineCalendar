# Quickstart UAT: Spec Kit + Claude Workflow Audit

**Feature**: 032 | **Audience**: Maintainer verifying the audit landed cleanly + the new workflow runs end-to-end

This script verifies the audit achieved its goals (FR-001 through FR-015 + SC-001 through SC-007), the Spec Kit version bump is clean, and the new GitHub Issues + extension-based workflow works for a fresh feature.

---

## Prerequisites

- [ ] PR for feature 032 is merged into `main` (squash commit visible at `git log main`).
- [ ] `npm install` ran successfully on the merged main (`node_modules/` present, no errors).
- [ ] `gh` CLI authenticated as you (`gh auth status` shows green).
- [ ] Working tree is clean (`git status` reports nothing).

---

## UAT-1 — Spec Kit version bump verified (FR-013, SC-007)

```bash
jq -r '.speckit_version' /home/dominik/RedmineCalendar/.specify/init-options.json
```

- [ ] Output is `"0.8.7"` (or higher).

```bash
specify --version 2>&1 | head -1
```

- [ ] Reports the same version (or `specify` is not installed locally — check the manifest if so).

```bash
specify integration upgrade claude --dry-run 2>&1 | grep -E "modified|conflict" | head -5
```

- [ ] Output shows zero "modified" or "conflict" lines (i.e., our `.specify/` matches vanilla 0.8.7 + extensions, no orphan local edits).

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-2 — Audit document + decisions complete (FR-002, FR-010, SC-003)

```bash
ls /home/dominik/RedmineCalendar/.specify/features/032-speckit-workflow-audit/research.md
grep -c "^| \`\`" /home/dominik/RedmineCalendar/.specify/features/032-speckit-workflow-audit/research.md
```

- [ ] `research.md` exists.
- [ ] Customization inventory table contains every divergence (count matches Phase 0 baseline plus any added during implementation).
- [ ] **Zero rows** have a `decision` column value of `TBD`, `?`, or empty.
- [ ] Every row decided as `replace` has a non-empty `replacement_target` cell.
- [ ] If `pct_reduction < 30%`, a paragraph explains why (per SC-001 reframed).

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-3 — BACKLOG.md replacement complete (FR-005)

```bash
[ -f /home/dominik/RedmineCalendar/BACKLOG.md ] && echo "STILL PRESENT" || echo "REMOVED"
```

- [ ] Output: `REMOVED` (BACKLOG.md is gone).

```bash
gh issue list --label feature --state all --limit 100 --json number | jq 'length'
```

- [ ] Output is **≥ 31** (6 in-flight + ~25 Done).

```bash
gh issue list --label "status:done" --label feature --state closed --limit 100 --json number | jq 'length'
```

- [ ] Output is **≥ 25** (all historically Done features migrated as closed Issues).

Spot check 3 random issues by clicking through:

- [ ] Each has the `feature` label, exactly one `status:*` label, and (if closed) a `version:vX.Y.Z` label.
- [ ] Each links to its `spec.md` in the body.
- [ ] Issue title matches `^Feature \d{3}:` regex.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-4 — Extension structure clean (Decision 3 verification)

```bash
ls /home/dominik/RedmineCalendar/.specify/extensions/uat/extension.yml
ls /home/dominik/RedmineCalendar/.specify/extensions/github-issues/extension.yml
[ -f /home/dominik/RedmineCalendar/.claude/commands/speckit.uat.md ] && echo "STILL PRESENT" || echo "REMOVED"
```

- [ ] Both extensions present at the right paths.
- [ ] Old `.claude/commands/speckit.uat.md` is REMOVED (no leftover stale skill).

```bash
specify extension list 2>&1
```

- [ ] Both `uat` and `github-issues` extensions are listed as installed.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-5 — `/speckit.uat` no longer attempts a local merge (FR-006)

```bash
grep -E "git push origin main|git merge.*main|git checkout main" \
  /home/dominik/RedmineCalendar/.specify/extensions/uat/commands/run.md
```

- [ ] Zero matches (no instructions to push / merge / checkout main remain).

```bash
grep -E "gh pr (create|comment)" \
  /home/dominik/RedmineCalendar/.specify/extensions/uat/commands/run.md
```

- [ ] At least one match each (the new PR-create + PR-comment integration is in place).

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-6 — `PreToolUse` hook decision honored (FR-007)

```bash
jq -r '.hooks.PreToolUse[0].hooks[0].command // "removed"' \
  /home/dominik/RedmineCalendar/.claude/settings.json | head -2
```

- [ ] Output matches the decision recorded in `research.md` for the PreToolUse hook (`drop` → "removed"; `keep` → unchanged; `tighten` → updated to block ANY commit on main).

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-7 — Documentation reflects the new workflow (FR-009, FR-011, SC-002)

Open `CONTRIBUTING.md` and verify:

- [ ] Branch + commit policy section now references "GitHub Issues" instead of "BACKLOG.md".
- [ ] Spec Kit workflow section mentions the extension-based slash commands (`/speckit.uat.run`, `/speckit.github-issues.*`).
- [ ] Reading CONTRIBUTING.md alone (plus README and CLAUDE.md) is sufficient to understand the new flow without consulting the audit doc.

Open `CLAUDE.md` and verify:

- [ ] No mentions of `BACKLOG.md`.
- [ ] Project Structure section reflects the new `.specify/extensions/` directory.
- [ ] Branch + commit policy section is updated.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-8 — Smoke test: a fresh feature runs end-to-end (SC-004)

In a fresh terminal session:

```bash
# Start a tiny throwaway feature to exercise every slash command.
# Don't worry — the spec is a 1-liner and we'll close it at the end.
```

Walk through `/speckit.specify "test-feature: throwaway smoke test that exercises the new workflow"`:

- [ ] Feature branch created (e.g., `999-smoke-test` or whatever short name the agent picks).
- [ ] `spec.md` written.
- [ ] **GitHub Issue auto-created** (check `gh issue list --label feature --search "smoke test"`).
- [ ] Issue has `feature` + `status:specify` labels.
- [ ] Issue body links to the new spec.

```bash
# /speckit.plan against the smoke-test feature
```

- [ ] `plan.md` + `research.md` + `data-model.md` + `quickstart.md` all written.
- [ ] Issue label transitioned to `status:plan` (no longer `status:specify`).

```bash
# /speckit.tasks
```

- [ ] `tasks.md` written.
- [ ] Issue label transitioned to `status:tasks`.

Cleanup:

```bash
gh issue close <smoke-issue-num> --reason "not planned"
git checkout main
git branch -D 999-smoke-test  # if user policy permits; else leave it
```

- [ ] Smoke-test feature closed cleanly with no orphan branches or stuck Issues.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-9 — Migration script idempotency (FR-005 + idempotency contract)

```bash
node /home/dominik/RedmineCalendar/scripts/migrate-backlog-to-issues.mjs --dry-run 2>&1 | tail -5
```

- [ ] Output reports "Skipping #N (already migrated)" for every feature; "Created N new Issues" reads `0`.
- [ ] Script exits with code 0 (idempotent re-run is a no-op).

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-10 — No regression in existing CI (SC-006 implicit)

```bash
cd /home/dominik/RedmineCalendar
npm run lint && npm run typecheck && npm test && npm run sqi
```

- [ ] All four green. (Tests count = 791; SQI ≥ 88.0 GREEN; lint = 2 known warnings on calendar.js + time-entry-form.js; typecheck = 0 errors.)

```bash
gh run list --limit 1 --branch main --json conclusion --jq '.[0].conclusion'
```

- [ ] Latest CI run on main is `success`.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## Sign-off

- [ ] All 10 UATs pass.
- [ ] No new console errors during the smoke test (UAT-8).
- [ ] Audit document is the team's reference for "why does the project look like this?" — accessible without re-running any analysis.
- [ ] Total commits on this PR squash-merge into one tidy commit on `main`.

**Tested by**: ___________________ &nbsp; &nbsp; **Date**: ___________
