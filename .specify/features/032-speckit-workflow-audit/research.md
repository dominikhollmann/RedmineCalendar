# Research: Spec Kit + Claude Workflow Audit

**Phase 0 output for `032-speckit-workflow-audit`** | Date: 2026-05-10

## Decision 1 — GitHub Issues integration approach (FR-004 evaluation, broadened)

**Decision**: **Roll our own** spec → Issue + label-lifecycle + close-on-merge layer as a **project-local Spec Kit extension** (see Decision 4 below for why "extension" not "skill"). **Keep** the vanilla `/speckit.taskstoissues` command that ships in 0.8.7 unchanged — it's free and orthogonal to our needs. **Reject** all community extensions evaluated.

**What 0.8.7 ships built-in** (verified during Phase 0 follow-up research):

- `/speckit.taskstoissues` is **vanilla** in 0.8.7 — listed in the bundled `SKILL_DESCRIPTIONS` dict and shipped as `templates/commands/taskstoissues.md`. It iterates `tasks.md` and creates one GitHub Issue per task via the `github/github-mcp-server/issue_write` MCP tool. **One-way create only**: no close, no label, no sync. Useful as-is for spinning up issue trackers from a tasks list, but does NOT cover our spec → Issue / lifecycle / close-on-merge needs.
- `specify init` does NOT install any GitHub Actions workflows or `extensions.yml` hooks for Issue lifecycle. The only GitHub-related CLI flag (`--github-token`) is marked `Deprecated (no-op)` at v0.8.7.
- The `--github-token` deprecation is a strong signal that built-in Issue lifecycle integration is **not** on the Spec Kit roadmap; user projects are expected to compose `gh` CLI + Actions themselves.

**Community extensions evaluated** (both from the official `extensions/catalog.community.json` at v0.8.7):

| Extension | Direction | Hooks | Our coverage |
|---|---|---|---|
| `Fatima367/spec-kit-github-issues` | Issue → spec only | Zero hooks declared | <20% of our needs (no spec→Issue, no labels, no close) |
| `aaronrsun/spec-kit-issue` | Issue → spec only | Zero hooks declared | <20% (functionally a leaner clone of Fatima367's) |

Both extensions are import-only (you start with an Issue, the extension generates a spec from it). **Neither implements the spec → Issue direction we need.** Neither uses the `extensions.yml` hook system, so there's no reference implementation to fork. Both are single-commit (2026-04-12), low-stars, sole-maintainer projects.

**Rationale for rolling our own**:

- The four capabilities we need (auto-create on `/speckit.specify`, status-label lifecycle, PR-merge auto-close, idempotent bulk migration of ~31 BACKLOG.md rows) are entirely absent from the community ecosystem. Adoption would mean writing all four ourselves on top of someone else's extension API.
- Total surface is small: ~10 lines of bash to create an Issue, ~30 lines for label transitions across 6 phases, ~50 lines for the close-on-merge GitHub Actions workflow, ~150 lines for the migration script. Much smaller than learning + maintaining an external plugin.
- Built as a **project-local extension** (not a slash command in `.claude/commands/`), our roll-your-own survives `specify integration upgrade` cleanly. See Decision 4.

**Alternatives considered**:

- *Adopt `Fatima367/spec-kit-github-issues` and write missing pieces.* Rejected: we'd be writing 95% of the code anyway, with the extension as dead weight.
- *Wait for Spec Kit to ship built-in Issue lifecycle.* Rejected: `--github-token` deprecation suggests this is explicitly NOT on the roadmap.
- *Use `/speckit.taskstoissues` for everything.* Rejected: it operates on tasks (sub-feature units), not features. It would create ~50-100 Issues per feature, not one per feature — wrong granularity.

---

## Decision 2 — UAT/QA plugin search (FR-004 broadened scope per Q2 clarification)

**Decision**: **REJECT both candidates evaluated.** Keep our bespoke `/speckit.uat` skill but fix it for branch protection (drop local-merge step, add PR-comment integration). The candidate evaluation:

| Candidate | Repo | What it does | Fit | Verdict |
|---|---|---|---|---|
| `spec-kit-qa` | https://github.com/arunt14/spec-kit-qa | Single command `/speckit.qa.run` — agent autonomously runs Playwright/Puppeteer or CLI test runner, captures screenshots, writes structured QA report in `FEATURE_DIR/qa/qa-{ts}.md`. | **Different paradigm** — automated agent execution, not human-in-the-loop walkthrough. Replaces `npm run test:ui`, not our UAT. | Reject for UAT replacement. *Optional partial-adopt:* lift the `qa-template.md` report shape if we ever want a structured Playwright report alongside our existing CI output. |
| (none other found) | GitHub topic [`spec-kit-extension`](https://github.com/topics/spec-kit-extension) | 20 extensions total in the ecosystem; closest adjacent: `spec-kit-fixit`, `spec-kit-retrospective`, `luno/spec-kit-plan-review-gate`. **No interactive UAT walkthrough extension exists.** | N/A | N/A |

**Rationale for keeping bespoke `/speckit.uat`**:

- Our skill is *interactive* (Claude reads `quickstart.md`, asks user "check?" per `- [ ]` item, marks `[x]` on confirm, commits fixes mid-UAT, updates `tasks.md`). The community ecosystem has nothing equivalent.
- The only broken bit is the final auto-merge step (incompatible with branch protection). Fixing that is a small, surgical change — replace the local `git checkout main && git merge && git push` block with `gh pr create` (if no PR exists) + a UAT-passed PR comment + "now merge via GitHub" message to user.
- The interactive walkthrough is genuinely valuable for catching browser-only edge cases the automated tests can't cover (font rendering, console warnings, perceived performance).

**Alternatives considered**:

- *Adopt `spec-kit-qa` and replace UAT.* Loses the human-in-the-loop walkthrough; that's the whole point of UAT.
- *Adopt `spec-kit-qa` alongside, as an additional automated step.* We already have Vitest + Playwright running in CI on every PR — a second automated runner is duplication, not coverage.
- *Drop UAT entirely.* Our prior shipped features benefited from manual UAT; the project's domain (calendar UX, ArbZG compliance) has visual / behavioral edge cases automated tests don't catch.

---

## Decision 3 — Package the bespoke UAT logic + new GitHub Issues integration as project-local Spec Kit extensions

**Decision**: **Move the bespoke UAT logic out of `.claude/commands/speckit.uat.md` and into a project-local extension under `.specify/extensions/uat/`** so it survives `specify integration upgrade`. New invocation: `/speckit.uat.run`. Same goes for the new GitHub Issues integration logic — package as `.specify/extensions/github-issues/`, expose `/speckit.github-issues.create` and `/speckit.github-issues.update-status`.

**Rationale**:

- **Files in `.claude/commands/` are vendored by `specify integration install/upgrade`** — they get overwritten when we bump Spec Kit. Our current `.claude/commands/speckit.uat.md` is a custom file living in a vendored directory; future upgrades risk silently overwriting it (per FR-014 concern).
- **Files under `.specify/extensions/<name>/` are user-managed.** The Spec Kit upgrade command (`specify integration upgrade`) doesn't touch them. Extension manifests (`extension.yml`) survive cleanly across version bumps.
- **Extensions are the documented integration mechanism** in Spec Kit 0.8.7 — the `specify extension install/list/uninstall` subcommand surface treats them as first-class. Two community extensions (`spec-kit-github-issues`, `spec-kit-issue`) already follow this structure as the model.
- **Naming pattern**: extension-provided slash commands are conventionally namespaced as `/speckit.<extension-name>.<verb>` (e.g., `/speckit.github-issues.import` from Fatima367's plugin). Our UAT becomes `/speckit.uat.run` — clean separation from the (nonexistent) vanilla `/speckit.uat`.
- **Future-proof**: if the project ever wants to publish either extension to the Spec Kit community catalog (or a private internal catalog), the structure is already correct.

**Extension structure** (per the contract in `contracts/uat-extension-manifest.md`, written in Phase 1):

```
.specify/extensions/uat/
├── extension.yml                         # Manifest: name, version, requires.speckit_version, commands list, hooks list
├── commands/
│   └── run.md                            # The `/speckit.uat.run` slash command body (was .claude/commands/speckit.uat.md)
└── README.md                             # Usage, requirements, opt-out instructions

.specify/extensions/github-issues/
├── extension.yml                         # Manifest
├── commands/
│   ├── create.md                         # `/speckit.github-issues.create` — called from after_specify hook
│   └── update-status.md                  # `/speckit.github-issues.update-status` — called from after_clarify/plan/tasks/implement
├── workflows/
│   └── issue-lifecycle.yml               # GitHub Actions workflow installed into .github/workflows/ during extension install
└── README.md
```

**`.specify/extensions.yml` change**: hooks bind to extension commands by namespaced name, e.g., `command: github-issues.create` instead of `command: git.commit`. The hook executor resolves these against the installed extensions list.

**Implementation note for Phase 2**: the move from `.claude/commands/speckit.uat.md` to `.specify/extensions/uat/commands/run.md` is a **delete + create**, not a rename — the file is in a different directory tree with a different surrounding manifest. The old slash command (`/speckit.uat`) MUST also be removed so users don't accidentally invoke a stale copy.

**Alternatives considered**:

- *Keep `.claude/commands/speckit.uat.md` and just fix the merge step.* Rejected per the user's course correction: leaves us exposed to future `integration upgrade` overwrites.
- *Publish the extension to the public Spec Kit community catalog now.* Rejected for this PR — focus is workflow audit + handover. Public publication can be a follow-up if the team finds it worth contributing.
- *Use `.specify/extensions/<name>/` but keep the old `.claude/commands/speckit.uat.md` as a redirect/deprecation stub.* Rejected — adds maintenance, no value (no third-party tools call the old name).

---

## Decision 4 — Spec Kit upgrade methodology (FR-013 / FR-015)

**Decision**: **Manual 3-way merge per file** (`git merge-file --merge` with vanilla 0.6.1 base + ours + vanilla 0.8.7 theirs), using `specify integration upgrade claude` purely as the **file-list source-of-truth** for which Spec Kit-managed files exist at 0.8.7.

**Rationale**: The `specify` CLI at 0.8.7 has two upgrade subcommands and neither does what FR-014/FR-015 require:

| Subcommand | What it does | Why insufficient |
|---|---|---|
| `specify self upgrade` | **Stub.** Prints "specify self upgrade is not implemented yet" and exits 0 (lines 1846-1860 of `src/specify_cli/__init__.py` at v0.8.7). | Does nothing. |
| `specify integration upgrade <agent>` | Diff-aware. Hashes manifest files at install, compares on upgrade, **blocks on locally-modified files unless `--force`**. With `--force`, silently overwrites. | Surfaces the file list (good), but `--force` overwrites silently — violates FR-014 ("no silent loss of local edits"). |
| `specify init --here --force --integration claude` | Broader: overwrites `.specify/scripts/`, `.specify/templates/`, and `.specify/memory/constitution.md`. Per official docs, `git restore` is the recommended "workaround" for the constitution overwrite. | Even more aggressive than the integration upgrade; same overwrite problem. |

**Recommended workflow** (driven by Phase 2 tasks):

1. Snapshot current `.specify/` + `.claude/` state (a tag like `pre-speckit-upgrade-032` in git is sufficient — git already preserves it).
2. `specify integration upgrade claude --force` in a *scratch directory* with vanilla 0.6.1 freshly initialized. This produces the canonical 0.6.1→0.8.7 file diff.
3. For each file in that diff, do a 3-way `git merge-file --merge`:
    - Base: vanilla 0.6.1 file
    - Ours: our current customized file
    - Theirs: vanilla 0.8.7 file
4. Resolve conflicts manually per FR-014 (`accept upstream` / `re-apply ours` / `extension hook`).
5. Update `.specify/init-options.json` to `"speckit_version": "0.8.7"`.

**Alternatives considered**:

- *Trust `--force` and reapply our changes from git history.* Risky — easy to miss a quietly-overwritten file (e.g., a small wording change in `constitution.md` that drifted into our local copy).
- *Wait for `specify self upgrade` to ship.* Per the source comment ("Actual self-upgrade is planned as follow-up work") there's no ETA. Blocking on it indefinitely defeats FR-013.

---

## Local customization inventory (Phase 0 baseline)

The audit will produce a final keep/replace/drop table during implementation. This is the inventory baseline against vanilla Spec Kit 0.6.1 + Claude Code defaults, captured at planning time so the implementation has a starting point.

### `.specify/` divergences from vanilla 0.6.1

| File | Divergence | Likely Phase 2 decision |
|---|---|---|
| `.specify/extensions.yml` | All custom hook bindings (`git.commit` after every step; `git.feature` disabled; bugfix/verify/test extensions on `after_implement`) | **Audit per-hook** — some kept (e.g. `after_implement` test gate), some likely dropped (e.g. `after_constitution` git.commit, low-value) |
| `.specify/init-options.json` | `branch_numbering: "sequential"`, `here: true`, `script: "sh"`, `speckit_version: "0.6.1"` | **Keep** (correct project config) — bump version to 0.8.7 |
| `.specify/extension-catalogs.yml` | Custom catalog of installed extensions | **Audit** — probably keep, list updated post-bump |
| `.specify/extensions/.registry` | Generated by extension installs | **Keep** — managed by tooling |
| `.specify/integrations/{claude,speckit}.manifest.json` | Generated by `specify integration install` | **Keep** — managed by tooling, refreshed by upgrade |
| `.specify/memory/constitution.md` | Project-specific (not vanilla) | **Keep** — possibly minor wording on branch policy section after audit |
| `.specify/templates/*.md` | Likely diverged from 0.8.7 (need 3-way merge) | **3-way merge per FR-015** |
| `.specify/scripts/bash/*` | `create-new-feature.sh` modified to support `--no-branch`, `--allow-non-main`, etc.; speckit policy guard added in PR #12 | **3-way merge** + audit each custom flag for current value |

### `.claude/` divergences from vanilla Claude Code defaults

| File | Divergence | Likely Phase 2 decision |
|---|---|---|
| `.claude/settings.json` permissions allow/deny | Project-specific (npm + git allowlist; secret/destructive denylist) | **Keep** — every entry justified for security/UX |
| `.claude/settings.json` PreToolUse hook | Blocks `git commit` on `main` with non-process files | **Decide per FR-007** — likely **drop** (server-side branch protection now covers it) OR **tighten** to "block any commit on main" for consistency |
| `.claude/settings.json` PostToolUse `npm test` after Write/Edit `*.js` | Auto-runs unit tests after JS edits | **Audit** — useful for solo dev (instant feedback), noisy for team (every keystroke triggers a test run). Likely **drop** with team handover. |
| `.claude/settings.json` PostToolUse `gh run list` after `git push` | Auto-checks CI status after push | **Audit** — likely **keep** (genuinely useful), or replace with the standard `gh pr status` invocation. |
| `.claude/commands/speckit.uat.md` | Bespoke UAT skill with auto-merge step | **Modify** — drop local-merge step (per Decision 2 above) + add PR-comment integration |
| `.claude/commands/speckit.specify.md` | Modified to update `BACKLOG.md` | **Modify** — replace BACKLOG.md update with `gh issue create` |
| `.claude/commands/speckit.{plan,tasks,implement,clarify,checklist,analyze,constitution,taskstoissues}.md` | May have minor mods | **3-way merge per FR-015**; most likely **accept upstream** for 0.8.7 |
| `.claude/skills/speckit-*/SKILL.md` (17 skills) | Vendored from speckit integration | **Keep** — managed by `specify integration install/upgrade`, not project edits |

### Root + `.github/` divergences

| File | Divergence | Likely Phase 2 decision |
|---|---|---|
| `.github/workflows/{ci,deploy,codeql}.yml` | Custom CI pipeline (lint+test+sqi+deploy + CodeQL) | **Keep** — every workflow earns its place; possibly add `issue-lifecycle.yml` for close-on-PR-merge |
| `.github/dependabot.yml` | Project-specific groups + ignore rules | **Keep** — added in PR #20/#30, justified |
| `.github/ISSUE_TEMPLATE/*` | Bug + feature templates | **Keep** — landed in PR #20 |
| `.github/PULL_REQUEST_TEMPLATE.md` | Project-specific quality checklist | **Keep** — landed in PR #20 |
| `BACKLOG.md` | The custom feature tracker | **DROP after migration** per FR-005 |
| `CONTRIBUTING.md` | Mentions BACKLOG.md flow + branch policy | **Modify** — replace BACKLOG references with Issues; document new PR-only workflow |
| `CHANGELOG.md` | Keep-a-Changelog format, project history | **Keep** — landed in PR #20 |
| `CLAUDE.md` | Active Technologies + Commands + Recent Changes | **Modify** — drop BACKLOG.md references in branch + commit policy section |
| `LICENSE`, `.nvmrc`, `.prettierrc.json`, `.prettierignore`, `.htmlhintrc`, `eslint.config.js`, `tsconfig.json`, `.husky/` | Standard tooling config | **Keep** — none of these are Spec Kit-related |

**Estimated scope**: ~10-15 customizations need explicit per-item decisions (most others are clearly keep-as-tooling or drop-after-migration). The audit document produced in Phase 2 will tabulate every one with rationale.

---

## Open items for `/speckit.tasks`

These are tactical decisions that don't need `/speckit.clarify` rounds — they belong in the task breakdown:

1. **Issue title format**: `Feature 027: Weekly Hours Target Tracking` vs `[027] Weekly Hours Target Tracking` (cosmetic; pick one and keep consistent). Codify in `contracts/github-issue-schema.md`.
2. **Issue body format**: link-only (`See spec: .specify/features/027-…/spec.md`) vs full spec.md content embedded. Recommend link-only — spec.md is in repo, no duplication risk.
3. **Label namespace**: `status:specify`, `status:done` vs `phase:specify`, `phase:done` (pick one). Recommend `status:` for lifecycle, `version:vX.Y.Z` for shipped version.
4. **Migration script language**: Node `mjs` (matches `scripts/dev-server.mjs`, `scripts/sqi.mjs` already in this project) vs Bash. Recommend Node — easier `gh api` JSON handling.
