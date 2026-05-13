# Data Model: Spec Kit + Claude Workflow Audit

**Phase 1 output for `032-speckit-workflow-audit`** | Date: 2026-05-10

This feature has no relational database. The "data" is configuration files, GitHub Issues, and the audit document itself. The entities below capture what the implementation produces and consumes.

---

## Entity 1: Customization

A single divergence between this project and a freshly-initialised vanilla Spec Kit + Claude Code project of the same versions.

**Identifier**: `path` (the file or hook key under `.specify/` or `.claude/`).

**Attributes**:

| Field                | Type            | Notes                                                                                                                        |
| -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `path`               | string          | Absolute or repo-relative path. Unique per audit.                                                                            |
| `category`           | enum            | `claude-config` / `claude-command` / `specify-config` / `specify-template` / `specify-script` / `github-config` / `root-doc` |
| `current_state`      | string          | Brief description of what this file/hook does today                                                                          |
| `vanilla_baseline`   | string          | What vanilla 0.8.7 ships at the same path (or "(not present)" if our addition)                                               |
| `decision`           | enum            | `keep` / `replace` / `drop` (set during implementation; never empty in the final audit doc)                                  |
| `rationale`          | string          | One paragraph explaining the decision; references the value vs maintenance cost balance from Q5                              |
| `replacement_target` | nullable string | If `decision == replace`: the upstream feature, plugin, or convention adopted; null otherwise                                |
| `reversibility`      | enum            | `trivial` (one-line revert) / `straightforward` (single PR) / `non-trivial` (requires re-design); per Q5's edge case         |

**Validation**:

- `decision` MUST be set before the implementation PR is opened (FR-002, SC-003).
- If `decision == replace`, `replacement_target` MUST be non-null (FR-003).
- `path` is unique (no duplicate audit rows for the same file).
- `vanilla_baseline` and `current_state` together MUST justify the `decision` (a reviewer can read the row alone and understand the call).

**State transitions** (for the audit row itself, not the file):

```
identified → decided → implemented → verified
```

`identified` happens during `/speckit.tasks` (T001 produces the inventory). `decided` happens during the implementation tasks. `implemented` happens when the file change lands in this PR. `verified` happens when the SC-004 smoke test passes (the next feature post-merge runs cleanly through every slash command).

---

## Entity 2: AuditInventory

The complete set of `Customization` entries produced by the audit. One per audit; lives as a markdown table in `research.md` (or a sibling `audit.md` if the table grows large).

**Attributes**:

| Field              | Type    | Notes                                                                                   |
| ------------------ | ------- | --------------------------------------------------------------------------------------- |
| `total_count`      | integer | Number of `Customization` rows; baseline value captured in Phase 0 (~10-15 expected)    |
| `count_keep`       | integer | How many decided `keep`                                                                 |
| `count_replace`    | integer | How many decided `replace`                                                              |
| `count_drop`       | integer | How many decided `drop`                                                                 |
| `pct_reduction`    | float   | `(count_drop + count_replace) / total_count` — the SC-001 honesty signal                |
| `version_baseline` | string  | Spec Kit version the inventory was measured against (set to `"0.8.7"` post-FR-013-bump) |

**Validation**:

- `count_keep + count_replace + count_drop == total_count` (no rows without a decision per SC-003).
- If `pct_reduction < 0.30`, the audit doc MUST include a paragraph explaining why so few items were dropped (per SC-001 reframed by Q5).

---

## Entity 3: ExtensionEvaluation

A single candidate community extension considered for adoption. One per evaluated repo. Documented in `research.md`.

**Attributes**:

| Field                        | Type            | Notes                                                                                     |
| ---------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `name`                       | string          | e.g., `spec-kit-github-issues`, `spec-kit-qa`                                             |
| `repo_url`                   | string          | GitHub URL                                                                                |
| `claude_compatible`          | boolean         | Hard prereq per FR-004                                                                    |
| `speckit_min_version`        | string          | From the extension's manifest (e.g., `">=0.1.0"`)                                         |
| `speckit_max_tested_version` | nullable string | If the extension's CI tests against a specific version                                    |
| `coverage_pct`               | string          | Estimated coverage of our needs (rough bucket: `<20%`, `20-50%`, `50-80%`, `>80%`)        |
| `maintenance_status`         | enum            | `active` / `dormant` / `unmaintained` (heuristic: last commit date + open issue activity) |
| `gaps`                       | string[]        | List of features we'd lose by adopting                                                    |
| `recommendation`             | enum            | `adopt` / `partial-adopt` / `reject`                                                      |
| `rationale`                  | string          | One paragraph                                                                             |

**Validation**:

- Both required candidates from FR-004 (`spec-kit-github-issues`, `spec-kit-qa`) MUST appear in the inventory.
- Any additional extensions surfaced during the FR-004-broadened search MUST also appear with full rationale.
- A `partial-adopt` recommendation MUST list which features are taken and which are NOT.

**State**: Not stateful; produced once during research, consumed during implementation, frozen in `research.md`.

---

## Entity 4: GitHubIssue (migrated)

A GitHub Issue created by the migration script, representing one feature row from the now-defunct `BACKLOG.md`.

**Identifier**: GitHub assigns the Issue number.

**Attributes**:

| Field            | Type            | Notes                                                                                           |
| ---------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `number`         | integer         | GitHub-assigned, immutable                                                                      |
| `title`          | string          | Format: `Feature NNN: <title>` (per `contracts/github-issue-schema.md`)                         |
| `body`           | string          | Templated; includes link to spec.md, plan.md, tasks.md, quickstart.md                           |
| `labels`         | string[]        | Always includes `feature` + one `status:*` + (if shipped) one `version:vX.Y.Z`                  |
| `state`          | enum            | `open` (in-flight features) / `closed` (already-Done features)                                  |
| `assignees`      | string[]        | Empty by default; team can assign post-handover                                                 |
| `milestone`      | nullable string | Optional; not used by initial migration                                                         |
| `feature_number` | integer         | Derived from `BACKLOG.md` row's `#` column; encoded in title for `gh issue list` regex matching |

**Validation**:

- `feature_number` MUST be unique across all Issues (we don't create two Issues for the same feature).
- Migration script MUST be **idempotent**: re-running it after partial failure detects existing Issues by `feature` label + title regex match `^Feature \d{3}:` and skips them.
- For Done features: `state == closed` AND a `version:vX.Y.Z` label MUST be present (read from the BACKLOG row's Version column).

**State transitions** (post-migration, in normal use):

```
created (by /speckit.specify) → status:specify
  → status:clarify (after /speckit.clarify, if run)
  → status:plan (after /speckit.plan)
  → status:tasks (after /speckit.tasks)
  → status:implement (after /speckit.implement starts)
  → status:uat (after /speckit.uat starts)
  → closed + version:vX.Y.Z (when implementing PR merges and deploy.yml tags the version)
```

These transitions are encoded as label updates by either:

- `/speckit.*` slash commands (for the in-conversation transitions), OR
- a GitHub Actions workflow `.github/workflows/issue-lifecycle.yml` (for the close-on-PR-merge + version-label-on-tag transitions).

---

## Entity 5: AuditDocument

The persistent record of every customization's decision (FR-010). Lives at `.specify/features/032-speckit-workflow-audit/research.md` (this Phase 0 file, expanded in Phase 2 implementation).

Not a stateful entity — it's the artifact. Mentioned here to make the FR-010 binding explicit: research.md is the "audit document" called out in the spec.

---

## Relationships

```
AuditInventory 1 ─── * Customization
                         │
                         └─ replacement_target ───> ExtensionEvaluation (optional, when decision=replace)

GitHubIssue * ─── 1 Feature (BACKLOG row, identified by feature_number)

AuditDocument 1 ─── * Customization (the document IS the table view of all Customizations)
                1 ─── * ExtensionEvaluation (the document also tabulates evaluations)
```

There is no shared persistence layer between these entities. They live in:

- **`Customization` + `AuditInventory` + `AuditDocument` + `ExtensionEvaluation`**: in `research.md` (markdown tables and prose; git is the storage)
- **`GitHubIssue`**: on github.com under this repo (canonical), reflected by `gh` CLI calls
