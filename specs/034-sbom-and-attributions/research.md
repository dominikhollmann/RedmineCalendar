# Phase 0 Research — SBoM & Open-Source Attributions

**Feature**: 034-sbom-and-attributions
**Spec**: [`spec.md`](spec.md)
**Date**: 2026-05-18

This document records the tool / pattern / integration decisions that resolve every `NEEDS CLARIFICATION` in the plan's Technical Context, and the design choices for the three CI-level integrations (drift, license, release).

---

## R1 — SBoM generator tool

**Decision**: `@cyclonedx/cyclonedx-npm` (CLI form, invoked from `scripts/oss-generate.mjs`).

**Rationale**:

- CycloneDX is the OWASP-maintained industry-standard SBoM format named in Assumption "SBoM format" of the spec and adopted as the reference profile by the EU Cyber Resilience Act, US EO 14028 implementations, and BSI TR-03183.
- `@cyclonedx/cyclonedx-npm` is the official CycloneDX project's npm tool — same vendor as the schema, so format-compliance is not a homemade-parser risk.
- Emits CycloneDX 1.6 JSON natively; supports both `--output-format JSON` and the `--spec-version 1.6` flag we need for FR-006.
- Reads from `package-lock.json` (npm) and supports the `--package-lock-only` mode that does not require `node_modules` to be installed — important for the offline drift check (FR-013).
- Distinguishes production vs dev deps via the standard CycloneDX `scope` field, which we surface in the SBoM (FR-008a) for downstream consumers to filter on.
- Permissive licence (Apache-2.0); zero conflicts with our allowlist.

**Alternatives considered**:

- **Hand-rolled SBoM** by walking `package-lock.json` ourselves. Rejected: this is a regulated-artifact obligation; a parser bug would silently produce non-conformant SBoMs that fail audit. The OWASP tool's test coverage exceeds anything we'd write.
- **`@cyclonedx/cyclonedx-cli`** (Go binary, different family). Rejected: native-npm tool keeps us in the existing Node 20 CI runner with no extra installer step.
- **SPDX (via `npm sbom --sbom-format=spdx`)**. Rejected here, kept as a follow-up. The spec's clarification chose CycloneDX 1.6 JSON; the same dependency dataset could feed an SPDX emitter later if a downstream consumer requires it. No present need.

---

## R2 — License-expression parsing for the allowlist gate

**Decision**: `spdx-expression-parse` (npm, dev-only).

**Rationale**:

- The allowlist gate (FR-014) must correctly handle SPDX _expressions_ like `MIT OR Apache-2.0`, `(MIT AND BSD-3-Clause)`, and refs (`MIT WITH GPL-3.0-or-later-with-classpath-exception`). FR-017 explicitly requires "treat the package as acceptable if at least one term in the expression is on the allowlist" for OR-form expressions.
- `spdx-expression-parse` is the canonical SPDX-TC-maintained reference implementation. It produces an AST our gate can walk to check the OR/AND semantics correctly.
- Few-KB footprint, zero transitive deps beyond `spdx-license-ids` (which itself ships the SPDX identifier list we validate against), MIT-licensed (passes our own allowlist), > 50 M weekly downloads (battle-tested at scale).

**Alternatives considered**:

- **String-match the `licenses` field of each SBoM component** (e.g. exact equality against `"MIT"`). Rejected: brittle; misses every expression form (`MIT OR Apache-2.0` would always fail). Also misses `LicenseRef-*` and `WITH`-clause exceptions.
- **`license-checker` / `license-checker-rseidelsohn` / `oss-attribution-generator`**. Rejected: these tools re-walk `node_modules` and produce their own report, duplicating what the CycloneDX SBoM already contains. Two sources of truth = two sources of drift. The SBoM is authoritative; we read its `licenses` field.

---

## R3 — Single source of truth (FR-005 / FR-009)

**Decision**: One generator (`scripts/oss-generate.mjs`) emits two committed files from one invocation:

1. `sbom.json` — CycloneDX 1.6 JSON, full tree, including dev (`scope: optional`).
2. `attributions.json` — a runtime-only projection (filter on `scope: required` + CDN/vendored entries from `oss-manifest.json`), normalized for the in-app licenses page.

**Rationale**:

- FR-009 mandates a single generator; FR-005 requires the attributions page not drift from the SBoM. One invocation → both files satisfies both requirements by construction.
- The projection step is pure (deterministic JSON transform), so byte-identical regeneration is achievable — required for the drift check to work via simple `diff` (R5).
- The in-app page consumes `attributions.json` rather than walking the SBoM directly: keeps the page's render code small (no need to understand CycloneDX schema, scope filtering, or `pkg:` URLs) and decouples the UI's data shape from the SBoM's regulatory format.

**Alternatives considered**:

- **Two separate generators** (one for SBoM, one for attributions). Rejected: violates FR-009 and re-introduces the drift risk the feature is meant to fix.
- **No `attributions.json` — render the SBoM directly in the browser**. Rejected: 200+ KB of CycloneDX JSON shipped to every user vs. ~10 KB of projected data; UI code couples to a regulatory format that evolves on its own timeline.

---

## R4 — `oss-manifest.json` (CDN-loaded + vendored sources)

**Decision**: One committed JSON file `oss-manifest.json` at repo root, hand-maintained, listing every open-source library shipped in the build that is **not** covered by `package-lock.json` — i.e. CDN-loaded runtime libs (FullCalendar, MSAL.js) and vendored / in-tree sources (`.specify/` Spec Kit tree).

**Schema**: `contracts/oss-manifest.schema.json` (see Phase 1).

**Rationale**:

- The spec's FR-010 (CDN manifest) and Clarification Q3 (vendored code is in scope for the license-allowlist gate) both need a place outside `package-lock.json`. One unified file keeps the surface area small.
- The `supplier` field on each entry (`cdn` | `vendored`) preserves the distinction for consumers that care (SBoM emitter sets the CycloneDX `externalReferences` URL accordingly; attributions UI shows them all uniformly per FR-002 acceptance scenario 3).
- Hand-maintained because CDN and vendored deps change rarely (years between FullCalendar / MSAL majors). The drift check (R5) detects when a hand-edit to `oss-manifest.json` is not accompanied by regenerated `sbom.json` / `attributions.json`.

**Alternatives considered**:

- **Two files** (`cdn-runtime.json` for CDN, `vendored-deps.json` for vendored). Rejected: same shape, same generator-input role — splitting them adds files without buying anything.
- **Auto-detect CDN libs by scanning `index.html`** for `<script src="https://...">`. Rejected: brittle (CDN URL ≠ canonical homepage; license/copyright are not in the URL), and provides no path for vendored sources. Hand-maintenance forces a deliberate review when a CDN-loaded lib changes, which is the right default for ~2 entries that change every few years.

---

## R5 — Drift check algorithm (FR-011, FR-013)

**Decision**: `scripts/oss-drift-check.mjs` runs the generator into a temporary directory, then byte-compares against the committed `sbom.json` and `attributions.json`. Any difference fails the check. Implemented in Node, no shell `diff` dependency.

**Rationale**:

- FR-013 requires fully offline operation. The generator's `--package-lock-only` mode (R1) reads only the committed `package-lock.json` + `oss-manifest.json`; both are committed inputs, so the same input produces the same output deterministically.
- Byte-comparison is the strictest possible drift signal — it catches both content drift (added/removed/version-bumped dep) and structural drift (someone hand-edited the file).
- A scratch directory under `os.tmpdir()` keeps the working tree clean and avoids any chance of partial-write contamination.
- On mismatch, the error message names the stale file(s) and the exact local regeneration command (`npm run oss:generate`), satisfying FR-012.

**Alternatives considered**:

- **Hash-of-inputs comparison** (compute SHA of `package-lock.json` + `oss-manifest.json`, compare to a hash committed in the generated files). Rejected: re-implements what `diff` already does, and adds a tampering risk (someone could edit the hash to match a stale file).
- **CI-side `git diff --exit-code` after regenerating in-place**. Rejected: leaves a dirty working tree on the CI runner and the developer's machine; the temp-dir + compare approach is read-only against the working tree.

---

## R6 — License-allowlist gate (FR-014, FR-015, FR-016, FR-017)

**Decision**: `scripts/oss-check-licenses.mjs` reads `sbom.json` (the SBoM is authoritative — R3), iterates every component, and:

1. If the component's `licenses` array contains a single SPDX `id`, check directly against the allowlist.
2. If the component's `licenses` array contains an `expression`, parse with `spdx-expression-parse` (R2) and apply FR-017's "any term on the allowlist passes" rule by walking the parsed AST (OR-nodes pass if any child passes; AND-nodes pass only if all children pass).
3. If the component has no licenses, an unparseable expression, or `NOASSERTION`, fail unless an explicit `name@version` exemption is present in `oss-allowlist.json`.

Exemptions are scoped to exact `name@version` — never wildcard, never name-only. An exemption MUST carry a non-empty `justification` string.

**Allowlist defaults** (per spec Assumption): `MIT`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `ISC`, `MPL-2.0`, `0BSD`, `Unlicense`, `CC0-1.0`.

**Rationale**:

- Reading the SBoM (rather than re-walking `node_modules`) preserves the single-source-of-truth principle (R3) and ensures the allowlist gate's view is identical to what the deployed app's attributions page shows.
- The exact-version pin on exemptions prevents "exempt MIT-licensed lodash@4.17.21" from accidentally covering "AGPL-licensed lodash@5.0.0-fork" after a typosquat or namespace hijack.
- Mandatory justification on exemptions makes the file self-documenting at code-review time.

**Alternatives considered**:

- **Allowlist by package name** (e.g. exempt entire `pkg-name`). Rejected: defeats the version-pinning safety; supply-chain attacks frequently exploit name-only trust.
- **Block-by-license-only without an exemption mechanism**. Rejected: real codebases occasionally need a borderline-but-acceptable dep (e.g. a tool under WTFPL or BSD-4-Clause that's been audited as safe for our use). The exemption file makes the trade-off explicit.

---

## R7 — Release-pipeline integration (FR-006, FR-007, FR-020)

**Decision**: Edit `.github/workflows/release.yml` to add **two new steps** in the existing release job, _before_ the `gh release create` step:

1. **Validate SBoM against the CycloneDX 1.6 JSON schema.** Run a schema-validate step that exits non-zero on any error. If this step fails, the release job fails and the `gh release create` step does not run — no tag, no Release. This satisfies FR-020's "no partial release" requirement.
2. **Upload `sbom.json` as a Release asset.** Modify the existing `gh release create` invocation to pass the committed `sbom.json` as a positional file argument.

The schema-validation step uses `@cyclonedx/cyclonedx-npm`'s own bundled schema (or, equivalently, a schema-validation step in the same CycloneDX tooling family). No extra dev dependency.

**Rationale**:

- The drift check at PR time (R5) already guarantees `sbom.json` is current; release.yml is the gate that ensures it is also _valid_ against the spec — defence in depth against a tool-version mismatch or a schema-evolution edge case slipping past PR-time generation.
- Failure of the validation step prevents the tag from being pushed and the Release from being created, because GitHub Actions stops the job at the first non-zero exit and `gh release create` only runs if all prior steps succeed.
- No regeneration at release time: the committed `sbom.json` is the authoritative artifact (one file, one source, one history). Regenerating at release time would risk producing a different SBoM than the one CI validated at PR time.

**Alternatives considered**:

- **Regenerate at release time** (rather than validating the committed file). Rejected: introduces a window where the released SBoM differs from what CI verified at PR time; doubles the run-time of `release.yml`; and adds a network dependency (`npm install` of the SBoM tool) inside the release path.
- **Validate at PR time only**. Rejected: lets a tool upgrade between PR-merge and release-cut silently produce an invalid Release asset.

---

## R8 — PR-pipeline integration (FR-011, FR-014, FR-018)

**Decision**: Edit `.github/workflows/deploy.yml` to add **two new steps inside the existing `test` job**, run after `npm run typecheck` and before `npm run test:coverage`:

```yaml
- name: SBoM + attributions drift check
  run: npm run oss:drift
- name: License allowlist check
  run: npm run oss:licenses
```

Both run on every PR and on every push to `main`. Both are cheap (< 10 s each in CI; together well under the 30 s upper bound implied by SC-006).

**Rationale**:

- Placing them after `typecheck` and before `test:coverage` keeps the existing pipeline order (lint → type → tests → SQI → UI) intact. The new gates fit naturally as "static checks of repo state" alongside lint/typecheck.
- Both gates are deterministic and fast, so they don't bloat PR-feedback time.
- Wiring through `npm run` script names (not inline shell) keeps the local-developer workflow identical to CI (FR-012: same one-step regeneration command works both places).

**Alternatives considered**:

- **Separate workflow file** (`.github/workflows/oss.yml`). Rejected: would split required-status-checks across two workflows for no benefit and double the GitHub Actions billable runtime.
- **Run only on dependency-change PRs** (gated on a paths filter). Rejected: explicitly violates FR-011 acceptance scenario 4 — the check must catch hand-edits to the generated files even on PRs that don't touch `package.json`.

---

## R9 — `/sbom.json` serving (FR-008)

**Decision**: Commit `sbom.json` at the repo root. The existing GitHub Pages deploy uploads the repo root (`actions/upload-pages-artifact@v5` with `path: .` in `deploy.yml:106`), so the committed file is served automatically at `https://<deploy>/sbom.json` with no workflow change.

**Rationale**:

- Same model as `version.json` (also a static file served at `/version.json` after deploy — see `js/version.js:22` which `fetch('version.json')`s it).
- Public/unauthenticated per Clarification Q1 — exactly matches the static-asset serving model.
- No backend, no router, no auth shim required.

**Alternatives considered**:

- **Generate at deploy time** (like `version.json` is generated in `deploy.yml:82-83`). Rejected: would make the served `sbom.json` diverge from the committed one (which is the SBoM CI validated against). Single source of truth wins.
- **Serve from a CDN or external host**. Rejected: adds a separate availability dependency for the SBoM that the deploy URL itself doesn't have.

---

## R10 — Attributions page UI route

**Decision**: Dedicated static page `licenses.html` at repo root, mirroring the existing `index.html` / `settings.html` pattern. Linked from a discreet footer entry on `settings.html`. JS module `js/licenses.js` `fetch()`es `attributions.json` and renders a sortable list (table layout) of entries.

**Rationale**:

- The spec's Assumption "The page itself is a dedicated route/view (not a modal), so URL-sharing and right-click-open-in-new-tab work as users expect" requires a real URL — a separate static file delivers that without introducing a SPA router (which the project does not have today).
- Mirrors the existing two-page pattern (calendar + settings), keeping cognitive load minimal.
- The page is fully data-driven (renders whatever is in `attributions.json`), so future dep additions / removals don't touch the page code.
- Existing CSS variables from feature 030 (dark mode) + feature 031 (Fluent 2 token layer) give us light/dark theming for free — no new CSS-variable surface.

**Alternatives considered**:

- **Render into a section of `settings.html`** (collapsible card or tab). Rejected: a 200-row license list pushes other settings off-screen and is not the right primary use of the Settings page.
- **Render as a markdown article in the existing in-app docs panel** (`js/docs.js`). Rejected: forces the data through the markdown pipeline (manual maintenance + harder for screen-readers to navigate the table semantics); panel state is also not a real URL. May still add a "see also" docs-panel entry that _links_ to `licenses.html` for discoverability — see the spec's "MAY also appear" Assumption.

---

## R11 — i18n keys for the new page chrome

**Decision**: Add the following keys to `js/i18n/en.js` and `js/i18n/de.js` (FR-004 — page chrome localized; library metadata not translated):

| Key                     | EN                                                           | DE                                                              |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `licenses.link`         | `Open-source licenses`                                       | `Open-Source-Lizenzen`                                          |
| `licenses.title`        | `Open-source licenses`                                       | `Open-Source-Lizenzen`                                          |
| `licenses.intro`        | `This application uses the following open-source libraries.` | `Diese Anwendung nutzt die folgenden Open-Source-Bibliotheken.` |
| `licenses.col.name`     | `Library`                                                    | `Bibliothek`                                                    |
| `licenses.col.version`  | `Version`                                                    | `Version`                                                       |
| `licenses.col.license`  | `License`                                                    | `Lizenz`                                                        |
| `licenses.col.homepage` | `Homepage`                                                   | `Webseite`                                                      |
| `licenses.back`         | `Back to settings`                                           | `Zurück zu den Einstellungen`                                   |
| `licenses.copyright`    | `Copyright`                                                  | `Copyright`                                                     |

**Rationale**: Project convention (CLAUDE.md "Localization" rule) requires every user-visible string to live in `js/i18n/{en,de}.js` and to be accessed via `t('key')`. The set above covers the chrome of the licenses page and the Settings-page link label.

---

## R12 — Test strategy (Constitution III)

**Decision**:

- **Unit tests (Vitest, ≥ 95 % line coverage per file):**
  - `tests/unit/oss-generate.test.js` — given a fixture `package-lock.json` + `oss-manifest.json`, asserts:
    - `sbom.json` has every npm package + every manifest entry, scoped correctly (required vs optional)
    - `attributions.json` contains only runtime-scoped entries
    - dual-license expressions are preserved verbatim in both outputs
    - same-package-two-versions emits both entries with distinct `purl`s
  - `tests/unit/oss-check-licenses.test.js` — asserts:
    - allowlisted single license passes (`MIT`, `Apache-2.0`, etc.)
    - non-allowlisted single license fails (`GPL-3.0-only`, `AGPL-3.0-only`)
    - `OR` expression with at least one allowlisted term passes (FR-017)
    - `AND` expression with any non-allowlisted term fails
    - missing license fails (FR-015)
    - exact-match exemption passes (FR-016)
    - same-name-different-version is NOT covered by an exemption pinned to another version
  - `tests/unit/oss-drift-check.test.js` — asserts:
    - clean repo (generator output matches committed files) passes
    - hand-edit to `attributions.json` triggers failure with a message naming the stale file + the regeneration command
    - manifest-only edit (without regenerating) also fails

- **UI test (Playwright):** `tests/ui/oss-licenses.spec.js` — asserts:
  - Settings page footer contains a link labelled "Open-source licenses" / "Open-Source-Lizenzen" depending on locale
  - Clicking the link navigates to `/licenses.html`
  - Page renders ≥ 1 row from `attributions.json` (fixture asserts the exact runtime libs)
  - Page passes the axe-core scan inherited from feature 033 (zero WCAG 2.2 AA failures), in both light and dark themes

- **No new contract tests** beyond the schema files in `contracts/` (those are validated by JSON-schema check in the unit tests).

**Rationale**: Constitution III mandates TDD for business logic + data transformation layers. The generator and the two CI checks are pure-function business logic and pass that bar; the UI page is mostly static rendering, so a single end-to-end Playwright test is sufficient. Coverage threshold ≥ 95 % per file is the existing project standard.

---

## R13 — Effect on Software Quality Index (Constitution VI)

**Decision**: New code is small and pure (script + page + tests), with deliberate effort to keep the per-metric impact bounded:

- **Module dependency cycles**: zero introduced (scripts are leaves; UI module is leaf).
- **Lakos ACD**: negligible delta (~1 new module on the JS side, ~3 new modules on the scripts side, none deeply imported).
- **Line coverage**: ≥ 95 % per file maintained via the test plan in R12.
- **Module size**: each new file targets < 200 LOC (target rather than hard cap; the generator may go higher but stays under 400).
- **Function length**: keep functions < 50 LOC.
- **Cyclomatic complexity**: each function < 10.
- **Compiler warnings**: zero (typecheck step covers).
- **Vulnerable deps**: `npm audit --audit-level=high` already runs first in CI; new deps must clear it.

SQI must remain ≥ 60 GREEN per the constitutional gate. If a tasks-phase implementation hits a metric ceiling, the right response is restructuring (split a long function, factor a helper) rather than relaxing the SQI bands — that re-tuning would itself be a constitution violation (Principle VI explicit anti-gaming clause).

---

## Open items resolved

| `NEEDS CLARIFICATION` from Technical Context                                            | Resolution |
| --------------------------------------------------------------------------------------- | ---------- |
| _(none — all Technical Context entries are filled with concrete decisions from R1–R13)_ | —          |

**All Phase 0 research complete. Proceeding to Phase 1.**
