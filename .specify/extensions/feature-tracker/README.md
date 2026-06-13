# GitHub Issues Extension for Spec Kit

Replaces the legacy `BACKLOG.md` ledger with GitHub Issues as the canonical feature tracker. New features auto-create an Issue at `/speckit.specify` time; each subsequent Spec Kit step transitions the Issue's `status:*` label; PR merge closes the Issue and assigns the shipped milestone (vX.Y.Z).

## Requirements

- Spec Kit ≥ 0.8.7 (relies on the hook system contract shipped at this version)
- `gh` CLI ≥ 2.0.0, authenticated against this repo
- `git` ≥ 2.30

## Usage

The extension binds itself to the Spec Kit lifecycle automatically once `.specify/extensions.yml` has its hooks pointing at it. No direct invocation needed for normal workflow.

Manual invocation (rare, for recovery):

- `/speckit.feature-tracker.create` — create the Issue for the active feature (idempotent; skips if one already exists).
- `/speckit.feature-tracker.update-status --status <name>` — transition the Issue label. Valid: `clarify`, `plan`, `tasks`, `implement`, `uat`. (`done` is reserved for `issue-lifecycle.yml` on PR merge.)

## Behavior

| Spec Kit step | Hook | Effect |
|---|---|---|
| `/speckit.specify` | `after_specify` → `speckit.feature-tracker.create` | Creates `Feature NNN: <Title>` Issue with `feature` + `status:specify` labels |
| `/speckit.clarify` | `after_clarify` → `speckit.feature-tracker.update-status` | `status:specify` → `status:clarify` |
| `/speckit.plan` | `after_plan` → `speckit.feature-tracker.update-status` | → `status:plan` |
| `/speckit.tasks` | `after_tasks` → `speckit.feature-tracker.update-status` | → `status:tasks` |
| `/speckit.implement` | `after_implement` → `speckit.feature-tracker.update-status` | → `status:implement` |
| `/speckit.uat.run` | (no hook — human-invoked UAT) | Optionally → `status:uat` via manual `gh issue edit` |
| PR merge | `.github/workflows/issue-lifecycle.yml` | → `status:done` + close Issue; release.yml assigns milestone + creates Release |

Issue schema (title, body sections, label set, idempotency rules): see `specs/032-speckit-workflow-audit/contracts/github-issue-schema.md`.

## Installation

```bash
specify extension add --dev .specify/extensions/feature-tracker
```

The lifecycle workflow file (`workflows/issue-lifecycle.yml`) lives inside the extension. After install, copy it once to `.github/workflows/issue-lifecycle.yml` so GitHub Actions picks it up. (Future versions of `specify extension add` may automate this.)

## Starting from an existing GitHub Issue

If a GitHub Issue already exists for a feature (e.g. created manually or triaged before spec work begins), you can adopt it instead of letting the extension create a duplicate.

**Workflow:**

1. Tell Claude: `/speckit-specify issue #177`
2. Claude reads issue #177 from GitHub, uses its title/body as spec context, and writes `.specify/feature.json` with `"issue_number": 177` before starting.
3. When `after_specify` fires, `speckit.feature-tracker.create` finds `issue_number` in `feature.json`, skips creation, and applies `status:specify` + `feature` labels to issue #177.
4. All subsequent lifecycle hooks (`after_clarify`, `after_plan`, etc.) resolve the issue via `issue_number` directly — no title-search needed.

**Manual adoption (if you need to adopt mid-flow):**

Add `"issue_number": 177` to `.specify/feature.json`:

```json
{
  "feature_directory": "specs/039-undo-scope",
  "issue_number": 177
}
```

Then re-run `/speckit-feature-tracker-create` to apply labels to the adopted issue.

## Opt-out

```bash
specify extension remove feature-tracker
```

This removes the extension and unregisters its hooks. Manually delete `.github/workflows/issue-lifecycle.yml` if you no longer want PR-merge → Issue-close automation.
