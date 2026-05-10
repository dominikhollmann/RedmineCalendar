# Contract: GitHub Issue schema for migrated + new features

**Audience**: implementers of the migration script + the `/speckit.specify` slash command + the `issue-lifecycle.yml` GitHub Actions workflow.

This contract defines the exact shape of GitHub Issues that replace `BACKLOG.md`. The schema MUST be respected by every producer (migration script, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`, `/speckit.uat`, the lifecycle workflow) so the Issues board stays consistent and `gh issue list` filters work.

---

## Issue title format

```
Feature NNN: <Title from spec.md>
```

- `NNN` is the 3-digit zero-padded feature number (`027`, not `27`).
- `<Title>` matches the `# Feature Specification: <title>` heading in the corresponding `spec.md`, verbatim.
- No emoji, no status indicators, no version suffix in the title — those go in labels.

**Examples:**

- `Feature 027: Weekly Hours Target Tracking`
- `Feature 032: Spec Kit + Claude Workflow Audit`

**Regex** for `gh issue list` filtering: `^Feature (\d{3}):`

---

## Issue body format

Markdown. Three sections, no more:

```markdown
## Summary

<Copied from the spec.md "Background and motivation" first paragraph,
or from "Summary" if present, max ~3 sentences.>

## Spec Kit artifacts

- Spec: [`.specify/features/NNN-short-name/spec.md`](.specify/features/NNN-short-name/spec.md)
- Plan: [`.specify/features/NNN-short-name/plan.md`](.specify/features/NNN-short-name/plan.md) <!-- omit line if not yet created -->
- Tasks: [`.specify/features/NNN-short-name/tasks.md`](.specify/features/NNN-short-name/tasks.md) <!-- omit line if not yet created -->
- Quickstart: [`.specify/features/NNN-short-name/quickstart.md`](.specify/features/NNN-short-name/quickstart.md) <!-- omit line if not yet created -->

## Lifecycle

Tracked by labels (see `status:*`). PR will close this issue on merge via the `Closes #N` convention.
```

**Rationale**: link-only — no spec content duplication. The spec.md remains the single source of truth, GitHub Issue is just the tracker. The "omit line if not yet created" comments in the template are processed by the producing tool (slash command appends sections as files appear).

---

## Labels

Every Issue MUST carry exactly:

- One `feature` label (always — distinguishes feature Issues from bug reports / questions / etc.)
- Exactly one `status:*` label (mutually exclusive — see lifecycle below)
- Zero or one `version:*` label (only present after the feature ships)

### Status labels (mutually exclusive)

| Label | Meaning | Set by |
|---|---|---|
| `status:specify` | `/speckit.specify` ran; spec.md exists | `/speckit.specify` slash command |
| `status:clarify` | `/speckit.clarify` ran; spec.md has Clarifications section | `/speckit.clarify` slash command (optional step) |
| `status:plan` | `/speckit.plan` ran; plan.md + research.md + data-model.md exist | `/speckit.plan` slash command |
| `status:tasks` | `/speckit.tasks` ran; tasks.md exists | `/speckit.tasks` slash command |
| `status:implement` | `/speckit.implement` started or in progress | `/speckit.implement` slash command |
| `status:uat` | Implementation done, `/speckit.uat` in progress | `/speckit.uat` slash command |
| `status:done` | PR merged, feature shipped | `issue-lifecycle.yml` workflow on PR merge |
| `status:planned` | Feature spec'd but explicitly deferred (e.g., depends on another feature) | Manually applied; mutually exclusive with above |

**Transitions**: a slash command MUST remove the previous `status:*` label before adding the new one. Use `gh issue edit <num> --remove-label "status:foo" --add-label "status:bar"` (single command).

### Version labels (zero or one)

Format: `version:vX.Y.Z` matching the SemVer tag from `git tag` (e.g., `version:v1.15.4`).

Set by `issue-lifecycle.yml` when the feature's PR merges to `main` AND the deploy workflow tags a new version. Migration script sets this for already-Done features by reading the BACKLOG.md Version column.

---

## Migration: mapping `BACKLOG.md` rows to Issues

The one-shot migration script reads `BACKLOG.md`, parses each table row, and emits one Issue per row.

| `BACKLOG.md` column | Issue field |
|---|---|
| `#` | `feature_number` (encoded in title as `Feature NNN:`) |
| `Feature` | Issue title (after the `Feature NNN:` prefix) |
| `specify` / `clarify` / `plan` / `tasks` / `implement` / `UAT` | Used to derive the *highest reached* lifecycle stage; sets the `status:*` label accordingly. Done section rows always get `status:done` (closed) regardless of which columns are filled. |
| `Status` | Captured in the Issue body's "Migration note" appendix only; not parsed into labels (the column is free-text, e.g., `**done** · verified v1.15.4`). |
| `Version` | If non-empty AND the row is in the Done section: sets `version:vX.Y.Z` label and closes the Issue. |

For Done features, the migration script:
1. Creates the Issue
2. Adds `feature` + `status:done` + `version:vX.Y.Z` labels
3. Closes the Issue with `--reason completed`
4. Posts a single comment: `Migrated from BACKLOG.md by scripts/migrate-backlog-to-issues.mjs on YYYY-MM-DD. See spec for details.`

For in-flight features, the migration script:
1. Creates the Issue (open)
2. Adds `feature` + `status:<highest reached>` labels (no `version:*`)
3. Posts the same migration comment

---

## Idempotency contract

The migration script MUST be safely re-runnable. Before creating any Issue, it MUST check:

```bash
existing=$(gh issue list --label feature --search "in:title \"Feature NNN:\"" --state all --json number --jq '.[0].number // empty')
if [ -n "$existing" ]; then echo "Skipping #$existing (already migrated)"; continue; fi
```

If an Issue matching the regex already exists for that feature number, the script MUST skip creating a duplicate. This handles partial migration failure (network blip mid-loop) without needing manual cleanup.

---

## Lifecycle workflow contract (`issue-lifecycle.yml`)

A new GitHub Actions workflow listens for `pull_request: closed` (merged) and updates the linked Issue:

1. Parses the PR body for `Closes #N` / `Fixes #N` / `Resolves #N` references.
2. For each referenced Issue, removes any `status:*` label and adds `status:done`.
3. Reads the version from the latest matching tag (set by the deploy workflow); adds `version:vX.Y.Z` label.
4. If `pull_request.merged == true` AND the Issue is open: closes the Issue with `--reason completed`.

This workflow is the only place that writes the `status:done` label — all other transitions are agent-driven via slash commands.
