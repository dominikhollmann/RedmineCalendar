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

## Opt-out

```bash
specify extension remove feature-tracker
```

This removes the extension and unregisters its hooks. Manually delete `.github/workflows/issue-lifecycle.yml` if you no longer want PR-merge → Issue-close automation.
