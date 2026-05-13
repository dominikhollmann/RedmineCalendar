# Contract: Final shape of `.specify/extensions.yml`

**Audience**: implementers reviewing per-hook keep/replace/drop decisions.

This contract is the _target_ shape of `.specify/extensions.yml` after the audit lands. Use it as the diff reference when implementing per-hook decisions. Each hook entry below is annotated with its current state and proposed final state — Phase 2 implementation MAY revise these per the actual audit findings, but the structural shape (one `before_<step>` + one `after_<step>` per Spec Kit phase) MUST be preserved.

---

## Top-level shape

```yaml
installed: [] # populated by `specify integration install`; not project-managed
settings:
  auto_execute_hooks: true # KEEP — needed for git auto-commit hooks to run unattended
hooks:
  before_constitution: … # see per-hook table
  before_specify: …
  before_clarify: …
  before_plan: …
  before_tasks: …
  before_implement: …
  before_checklist: …
  before_analyze: …
  before_taskstoissues: …
  after_constitution: …
  after_specify: …
  after_clarify: …
  after_plan: …
  after_tasks: …
  after_implement: …
  after_checklist: …
  after_analyze: …
  after_taskstoissues: …
```

---

## Per-hook proposed decisions

Each row: hook key → current binding → proposed final state → rationale.

### `before_*` hooks (pre-step gates)

| Hook key               | Current                                                                  | Proposed                                                                                                                              | Rationale                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `before_constitution`  | `git.initialize` (mandatory, enabled)                                    | **Keep**                                                                                                                              | One-time gate for new repos; harmless on existing ones. Vanilla Spec Kit ships this.                                                                                            |
| `before_specify`       | `git.feature` (mandatory, **disabled** with note "specs belong on main") | **Drop the disabled stub** + revisit decision. Replace with `git.feature` (enabled) so every spec gets its own branch from the start. | Branch protection requires PRs for everything now — there is no "specs on main" path anymore. The `git.feature` hook re-enabled produces the right default behaviour.           |
| `before_clarify`       | `git.commit` (mandatory)                                                 | **Drop**                                                                                                                              | Auto-commit before each step is solo-dev convenience; team workflow prefers explicit commits at logical boundaries (per Q5 balanced strategy: this is "low value, high noise"). |
| `before_plan`          | `git.commit` (mandatory)                                                 | **Drop**                                                                                                                              | Same as above.                                                                                                                                                                  |
| `before_tasks`         | `git.commit` (mandatory)                                                 | **Drop**                                                                                                                              | Same as above.                                                                                                                                                                  |
| `before_implement`     | `git.commit` (mandatory)                                                 | **Drop**                                                                                                                              | Same as above.                                                                                                                                                                  |
| `before_checklist`     | `git.commit` (mandatory)                                                 | **Drop**                                                                                                                              | Same as above.                                                                                                                                                                  |
| `before_analyze`       | `git.commit` (mandatory)                                                 | **Drop**                                                                                                                              | Same as above.                                                                                                                                                                  |
| `before_taskstoissues` | `git.commit` (mandatory)                                                 | **Drop**                                                                                                                              | Same as above.                                                                                                                                                                  |

### `after_*` hooks (post-step actions)

| Hook key              | Current                                                              | Proposed                                                               | Rationale                                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `after_constitution`  | `git.commit` (mandatory)                                             | **Drop**                                                               | Same auto-commit reasoning as `before_*`.                                                                                                                                                                                             |
| `after_specify`       | `git.commit` (mandatory)                                             | **Replace** with `github-issues.create` (project-internal command)     | Replaces BACKLOG.md auto-update; creates the GitHub Issue per `contracts/github-issue-schema.md`.                                                                                                                                     |
| `after_clarify`       | `git.commit` (mandatory)                                             | **Replace** with `github-issues.update-status` (sets `status:clarify`) | Lifecycle label transition.                                                                                                                                                                                                           |
| `after_plan`          | `git.commit` (mandatory)                                             | **Replace** with `github-issues.update-status` (sets `status:plan`)    | Same.                                                                                                                                                                                                                                 |
| `after_tasks`         | `git.commit` (mandatory)                                             | **Replace** with `github-issues.update-status` (sets `status:tasks`)   | Same.                                                                                                                                                                                                                                 |
| `after_implement`     | `git.commit` + `bugfix.verify` + `verify.run` + `git.test` (4 hooks) | **Trim to** `git.test` only (Vitest + Playwright)                      | The bugfix-verify and verify.run extensions weren't earning their cost (each was a separate slow step); CI runs the same tests anyway on PR push, so the local pre-PR test gate is the only one with marginal value. Drop the others. |
| `after_checklist`     | `git.commit` (mandatory)                                             | **Drop**                                                               | Same auto-commit reasoning.                                                                                                                                                                                                           |
| `after_analyze`       | `git.commit` (mandatory)                                             | **Drop**                                                               | Same.                                                                                                                                                                                                                                 |
| `after_taskstoissues` | `git.commit` (mandatory)                                             | **Drop**                                                               | Same.                                                                                                                                                                                                                                 |

---

## New hook commands needed

Two new project-local Spec Kit **extensions** (per Decision 3 in `research.md` — installed under `.specify/extensions/<name>/`, NOT as `.claude/commands/` files, so they survive `specify integration upgrade`):

### `github-issues.create`

- **Lives at**: `.specify/extensions/github-issues/commands/create.md`
- **Trigger**: bound from `after_specify` in `extensions.yml`
- **Action**: Reads `FEATURE_DIR/spec.md`, extracts feature number + title, runs `gh issue create --title "Feature NNN: Title" --body "<templated>" --label feature --label status:specify`. Idempotent: skips if an Issue with `Feature NNN:` already exists.
- **Schema**: per `contracts/github-issue-schema.md`.

### `github-issues.update-status`

- **Lives at**: `.specify/extensions/github-issues/commands/update-status.md`
- **Trigger**: bound from `after_clarify`, `after_plan`, `after_tasks`, `after_implement` in `extensions.yml` (each with an `args.status` value).
- **Action**: Looks up the feature's Issue by `Feature NNN:` title regex, removes the existing `status:*` label, adds the new one. No-op if no Issue exists (graceful degradation if the project drifts).
- **Note**: the `status:done` transition + Issue close + `version:vX.Y.Z` label are NOT done by this command — they're done by the `issue-lifecycle.yml` GitHub Actions workflow on PR merge (per `contracts/github-issue-schema.md`).

### UAT extension (`speckit.uat.run`)

- **Lives at**: `.specify/extensions/uat/commands/run.md`
- **Trigger**: human-invoked only (no automatic hook binding).
- **Schema**: per `contracts/uat-extension-manifest.md`.
- **Replaces**: the current `.claude/commands/speckit.uat.md` (which gets DELETED in Phase 2).

---

## Net change summary (informational)

- **Before**: 18 hooks total (1 conditional + 17 mandatory).
- **After**: 6 hooks total (1 keep + 1 re-enable + 4 replace + 12 drop). Net: −12 hooks.
- **Behavioral change**: no more silent auto-commit at every step boundary; explicit commits expected. Lifecycle now lives in GitHub Issues, not BACKLOG.md.

These numbers are _proposed_; final values land in the audit tally per FR-002.
