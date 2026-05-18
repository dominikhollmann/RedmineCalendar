---
description: 'Task list for feature 034: SBoM & Open-Source Attributions'
---

# Tasks: SBoM & Open-Source Attributions

**Input**: Design documents from `specs/034-sbom-and-attributions/`
**Prerequisites**: [`plan.md`](plan.md), [`spec.md`](spec.md), [`research.md`](research.md), [`data-model.md`](data-model.md), [`contracts/`](contracts/), [`quickstart.md`](quickstart.md)

**Tests**: Every implementation task that adds or changes behavior includes its own unit and/or UI tests. Tests are not a separate phase — they are part of completing each task.

**Organization**: Phase 1 (setup) and Phase 2 (foundational, blocking) come first. The four user stories from `spec.md` (US1, US2, US3, US4) each get their own phase. Polish is the final phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 / US4 — Setup, Foundational, and Polish tasks have no story label
- Each task includes its own tests (unit and/or UI) where applicable

## Path Conventions

- Single project (Option 1) — static SPA tree
- Static assets at repo root (`index.html`, `settings.html`, `*.json`, etc.)
- JS modules under `js/`, generator scripts under `scripts/`, tests under `tests/unit/` and `tests/ui/`
- CI workflows under `.github/workflows/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the two new dev-deps and the npm script names so every later task can invoke `npm run oss:*` without forward-references.

- [ ] T001 Add `@cyclonedx/cyclonedx-npm` and `spdx-expression-parse` to `devDependencies` in `package.json`; add three new scripts `oss:generate` (runs `scripts/oss-generate.mjs`), `oss:drift` (runs `scripts/oss-drift-check.mjs`), `oss:licenses` (runs `scripts/oss-check-licenses.mjs`); run `npm install` to update `package-lock.json`
- [ ] T002 [P] Add `sbom.json` and `attributions.json` to `.prettierignore` so prettier does not reformat the generator's output (and the lint-staged pre-commit hook does not block on them); add the same two paths to `.gitattributes` with `linguist-generated=true` so GitHub's diff view marks them as generated
- [ ] T003 [P] Verify `npm install` passes `npm audit --audit-level=high` (new deps must not introduce vulnerabilities); add a single-line note to the PR description if any new advisory appears so reviewers see it explicitly

**Checkpoint**: Dev-deps installed, scripts wired, generated files protected from auto-formatters.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Author the hand-maintained input file (`oss-manifest.json`), build the generator that both US1 (attributions page) and US2 (SBoM publication) consume, and produce the initial committed outputs so every subsequent CI gate has a baseline to compare against.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — every story phase depends on the generator existing and on `sbom.json` + `attributions.json` being committed.

- [ ] T004 Create `oss-manifest.json` at repo root populated with the real CDN-loaded and vendored entries this project ships today: FullCalendar (read the exact version + CDN URL from the `<script>` tag in `index.html`), MSAL.js (same — from `index.html` or wherever the Outlook integration script loads), and Spec Kit (`supplier: "vendored"`, `vendoredPath: ".specify/"`, version from `.specify/init-options.json`'s `speckit_version`); each entry MUST conform to `specs/034-sbom-and-attributions/contracts/oss-manifest.schema.json` (validate before committing)
- [ ] T005 [P] Add a Vitest unit test `tests/unit/oss-manifest-schema.test.js` that loads `oss-manifest.json`, validates it against `contracts/oss-manifest.schema.json` using a JSON-schema validator (e.g. tiny inline ajv-free check or a tested dev-dep — pick the simpler), and fails on schema violation; treat this as a "regression catch" that fires if anyone hand-edits `oss-manifest.json` into an invalid shape
- [ ] T006 Implement `scripts/oss-generate.mjs` (the single-source-of-truth generator per plan R3): reads `package-lock.json` + `oss-manifest.json`; invokes `@cyclonedx/cyclonedx-npm` (with `--package-lock-only --spec-version 1.6 --output-format JSON`) for the npm side; merges in CDN + vendored entries with the correct `purl` shape per data-model.md (pkg:generic/...?download_url=… for CDN; pkg:generic/...?vcs_url=… for vendored); emits `sbom.json` (full tree, CycloneDX 1.6 JSON) AND `attributions.json` (runtime-only projection, sorted alphabetically by name then by version) in one pass; both files share an identical `generatedAt` / `metadata.timestamp`. Co-author `tests/unit/oss-generate.test.js` covering: (a) npm walking from a fixture `package-lock.json`, (b) manifest merge, (c) dual-license expressions preserved verbatim, (d) same-package-two-versions emits both with distinct purls, (e) `scope: required` vs `scope: optional` split is correct, (f) attributions.json contains only `runtime` entries, (g) attributions.json sort order, (h) generatedAt fields are byte-identical between the two outputs, (i) cross-file invariant: for any `(name, version)`, the `license` + `copyright` + `homepageUrl` values match between `sbom.json` and `attributions.json` (per data-model.md "Cross-file invariants")
- [ ] T007 Run `npm run oss:generate` once locally; commit the resulting `sbom.json` and `attributions.json` at repo root; manually inspect the committed files for sanity (right number of components, FullCalendar + MSAL + Spec Kit appear in `attributions.json`, no obvious malformed entries)

**Checkpoint**: Generator works, baseline outputs committed. User stories can now begin in parallel.

---

## Phase 3: User Story 1 — Open-source attributions reachable from the app (Priority: P1) 🎯 MVP

**Goal**: A user can reach a discreet "Open-source licenses" link from the Settings page footer, lands on `/licenses.html`, and sees every runtime open-source library the app ships with name, version, license, homepage, copyright. Page chrome is localised (en + de); library data is not. Page respects dark mode.

**Independent Test** (from spec): From any in-app screen, the user reaches the attributions page in ≤ 2 clicks. The page lists every runtime dependency (FullCalendar, MSAL, npm runtime deps, vendored sources) with name, version, SPDX license id, and an outbound link. Sort is alphabetical; CDN + npm + vendored entries appear interleaved with no visual distinction.

- [ ] T008 [US1] Add the following keys to `js/i18n/en.js` and `js/i18n/de.js` (translations per plan R11 table): `licenses.link`, `licenses.title`, `licenses.intro`, `licenses.col.name`, `licenses.col.version`, `licenses.col.license`, `licenses.col.homepage`, `licenses.back`, `licenses.copyright`; co-author a Vitest unit test `tests/unit/i18n-licenses.test.js` asserting the same key set exists in both locales (no missing keys / no orphan keys), matching the existing i18n-parity test pattern this project uses
- [ ] T009 [P] [US1] Create `licenses.html` at repo root following the existing `settings.html` shape (`<!doctype html>`, `<html lang="…">`, head with `<meta charset>`, `<title>` populated from `t('licenses.title')`, link to `css/style.css`, body with a header containing the page title + a "Back to settings" link, a `<main>` element that `js/licenses.js` populates, footer/version readout if matching settings.html's pattern); script tag loads `js/licenses.js` as `type="module"`
- [ ] T010 [P] [US1] Implement `js/licenses.js`: on `DOMContentLoaded`, call `t()`-aware DOM updates for the page chrome, `fetch('attributions.json')`, render the entries as an accessible HTML `<table>` with semantic `<th scope="col">` headers (Library / Version / License / Homepage; Copyright shown only when non-null, either as a 5th column or as a row caption — pick whichever yields the better axe-core score in T013); each homepage cell is `<a href rel="noopener" target="_blank">` ; render gracefully on fetch failure (visible error message keyed off `licenses.error`, also added in T008 if not already); render in browser locale via the existing `i18n.js`. Includes Vitest unit tests `tests/unit/licenses.test.js` covering: render with empty list, render with single entry, render with null copyright (cell/row collapses cleanly), HTML escaping of `name` / `homepageUrl` / `copyright` (security)
- [ ] T011 [P] [US1] Add a minimal CSS rule set to `css/style.css` (scoped via a `.licenses-page` body class) for the attributions table — full-width, alternating row backgrounds via `var(--surface-alt)` or equivalent existing Fluent-2 token, sufficient horizontal padding for legibility; rule set MUST consume only existing CSS variables from features 030 (dark mode) + 031 (Fluent 2 token layer) — no new variables — so light/dark themes work for free
- [ ] T012 [P] [US1] In `settings.html`, add a `<footer>` element (or extend the existing footer if one exists) containing a single discreet `<a href="licenses.html">` link with text `data-i18n="licenses.link"`; placement: visually distinct from the user-controlled settings (small text, muted colour via existing CSS variable), positioned at the bottom of the page below all other content; ensure the link is keyboard-focusable and has a visible focus ring (inherits feature 033's a11y baseline). No JS edit needed if the rest of the settings page does not need to know the link exists.
- [ ] T013 [US1] Playwright UI test `tests/ui/oss-licenses.spec.js` covering: (a) Settings page footer contains the link with the en label, then with the de label after switching locale; (b) clicking the link navigates to `/licenses.html`; (c) page renders at least the three known runtime entries (FullCalendar, MSAL, Spec Kit) — assert by name + version match against the committed `attributions.json`; (d) right-click → "Open in new tab" gives a real shareable URL (assert page is reachable directly via `page.goto('/licenses.html')`); (e) page passes axe-core scan with zero WCAG 2.2 AA failures (inherits feature 033's `@axe-core/playwright` setup) in both light and dark themes
- [ ] T014 [US1] Add `licenses.html` to deploy.yml's `paths:` trigger list (line 6-15) and to playwright/htmlhint scopes if those tools have explicit file lists; otherwise verify no config change is required by running `npm run htmlhint` + `npm run test:ui` locally

**Checkpoint**: User Story 1 functional and independently testable end-to-end. MVP gate can ship here.

---

## Phase 4: User Story 2 — SBoM published with every release (Priority: P1)

**Goal**: Every GitHub Release cut from `main` carries `sbom.json` as a downloadable asset; the same file is served at `/sbom.json` by the deployed app; both copies are byte-identical for the same version; the release fails (no tag, no Release) if the SBoM is invalid against the CycloneDX 1.6 schema.

**Independent Test** (from spec): After a release is cut, the GitHub Release page lists `sbom.json` as an asset. The file validates against the CycloneDX 1.6 JSON schema. `curl https://<deploy>/sbom.json` returns the same SBoM. Every runtime entry in `attributions.json` appears in `sbom.json` with matching version + license.

- [ ] T015 [US2] Edit `.github/workflows/release.yml` to add a **"Validate SBoM against CycloneDX 1.6 schema"** step BEFORE the existing "Create GitHub Release with auto-generated notes" step (around release.yml:140); the validation step invokes the schema-validator subcommand of `@cyclonedx/cyclonedx-npm` (or `@cyclonedx/bom-validate` if the subcommand is not available — research at task-time per plan contract `sbom-reference.md`); the step MUST run only when `steps.scope.outputs.is_app == 'true'` so process-only PRs skip it; on non-zero exit the job fails and the subsequent release-creation step does not run, satisfying FR-020 "no partial release"
- [ ] T016 [US2] Modify the existing "Create GitHub Release" step (release.yml:140-151) so that `gh release create` uploads `sbom.json` as a Release asset (positional file argument: `gh release create "$NEW" sbom.json --title …`); verify the upload succeeds by reading the asset list in the "Summary" step (release.yml:153-164) and emitting a `::notice::` if the asset is present
- [ ] T017 [US2] Verify `/sbom.json` serving requires no change to `.github/workflows/deploy.yml`: the existing `actions/upload-pages-artifact@v5` step uploads the repo root (`path: .` at deploy.yml:106), so the committed `sbom.json` is served automatically. Document this fact as a one-line comment in deploy.yml near the upload step so a future maintainer doesn't refactor it away. No code-change required beyond the comment.
- [ ] T018 [US2] Add a Vitest unit test `tests/unit/sbom-validity.test.js` that loads the committed `sbom.json`, asserts `bomFormat === "CycloneDX"`, `specVersion === "1.6"`, every component has the required minimum fields per FR-008a (`name`, `version`, `licenses`, `purl`, `scope`), and parses the document with a JSON-schema validator against the CycloneDX 1.6 JSON schema (downloaded once and cached locally for the test — or fetched at test time if test runtime is online; pick the simpler. Fall back to required-field assertions if the validator dep is too heavy). This is the local mirror of T015's CI-side gate.
- [ ] T019 [US2] Add a Vitest unit test `tests/unit/sbom-attributions-parity.test.js` that loads both `sbom.json` and `attributions.json`, builds a `(name, version)`-keyed map of each, and asserts that every entry in `attributions.json` has a matching `scope: required` entry in `sbom.json` with identical `license` (or `licenses[0].license.id`/`expression`) and identical `homepageUrl`. This is the runtime enforcement of data-model.md cross-file invariants 1–4.

**Checkpoint**: User Story 2 functional. Combined with US1, the MVP-plus-compliance set is shippable. Next post-merge release will carry the SBoM.

---

## Phase 5: User Story 3 — CI drift gate keeps attributions + SBoM current (Priority: P1)

**Goal**: A PR that changes the dependency tree (npm or CDN/vendored manifest) without regenerating the committed files fails CI on a named "SBoM + attributions drift check" step with a message naming the stale file(s) and the local regeneration command. A PR that hand-edits the generated files also fails. The check runs on every PR (not only manifest-touching ones) and is fully offline.

**Independent Test** (from spec): Open a PR adding an npm dep, do not regenerate; CI fails with a clear message. Run `npm run oss:generate` locally, commit the regenerated files, push; CI passes. Repeat with an `oss-manifest.json` edit — same behaviour.

- [ ] T020 [US3] Implement `scripts/oss-drift-check.mjs`: invokes the same code path as `scripts/oss-generate.mjs` but writes outputs to a fresh `os.tmpdir()` directory; then byte-compares both temp files against the committed `sbom.json` and `attributions.json`; on any difference, prints a clear error naming the stale file(s) and the exact command (`npm run oss:generate`) to regenerate them, then exits 1; on match exits 0. Co-author unit test `tests/unit/oss-drift-check.test.js` covering: (a) clean repo passes with exit 0, (b) hand-edited `attributions.json` fails with a message naming that file, (c) edited `oss-manifest.json` without regeneration fails with a message naming both output files, (d) the failure message includes the regeneration command verbatim (FR-012)
- [ ] T021 [US3] Edit `.github/workflows/deploy.yml` to add a **"SBoM + attributions drift check"** step in the existing `test` job (around deploy.yml:40), positioned after `npm run typecheck` and before `npm run test:coverage`. The step runs `npm run oss:drift` and fails the job on non-zero exit. The step runs on every PR (no `paths` filter — FR-011 AS4 requires it to fire even on PRs that don't touch dependency files).

**Checkpoint**: User Story 3 functional. Any future drift between manifests and generated files is caught at PR time.

---

## Phase 6: User Story 4 — CI blocks dependencies under disallowed licenses (Priority: P2)

**Goal**: A PR introducing a dependency (npm direct/transitive, CDN-runtime manifest entry, or vendored source) declaring a non-allowlisted SPDX license fails CI with a clear message naming the package + license. Exemptions exist as a per-`name@version` escape hatch with mandatory justification.

**Independent Test** (from spec): Add a fake dep with `GPL-3.0-only` → CI fails. Add it to the exemption list → CI passes. Bump the version → CI fails again (exemption is version-pinned). Add a dep with no license → CI fails.

- [ ] T022 [US4] Create `oss-allowlist.json` at repo root with `allowedLicenses` containing the default permissive set per spec Assumption (`MIT`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `ISC`, `MPL-2.0`, `0BSD`, `Unlicense`, `CC0-1.0`) and `exemptions: []`; the file MUST conform to `contracts/oss-allowlist.schema.json` (validate before committing)
- [ ] T023 [US4] Implement `scripts/oss-check-licenses.mjs` per plan R6: reads `sbom.json` (the SBoM is authoritative — single source of truth from R3) and `oss-allowlist.json`; for each component, applies the allowlist rules from FR-014/FR-015/FR-016/FR-017 (single SPDX id → direct match; SPDX expression → parse with `spdx-expression-parse`, OR-node passes if ANY child passes, AND-node passes only if ALL children pass; missing/unparseable/`NOASSERTION` → fail unless an exact `name@version` exemption exists); on failure prints a clear message naming the offending `(name, version, license, channel: npm|cdn|vendored)` plus a hint to add an exemption with justification; exits 1. Co-author `tests/unit/oss-check-licenses.test.js` covering: (a) single allowlisted license passes (MIT, Apache-2.0), (b) single non-allowlisted license fails (GPL-3.0-only), (c) `OR` expression passes if any term is allowlisted (FR-017), (d) `AND` expression fails if any term is non-allowlisted, (e) missing license fails (FR-015), (f) `NOASSERTION` fails (FR-015), (g) exact `name@version` exemption passes, (h) exemption pinned to `1.0.0` does NOT cover the same package at `1.0.1` (FR-016), (i) exemption with empty/short justification rejected at file-load time (schema bound: `minLength: 20`), (j) vendored + CDN entries are also checked (FR-014 Q3 scope)
- [ ] T024 [US4] Add a Vitest unit test `tests/unit/oss-allowlist-schema.test.js` that validates `oss-allowlist.json` against `contracts/oss-allowlist.schema.json` (twin of T005 for the allowlist file); fires if anyone hand-edits the allowlist into an invalid shape
- [ ] T025 [US4] Edit `.github/workflows/deploy.yml` to add a **"License allowlist check"** step in the existing `test` job, positioned immediately after the drift check step from T021. Step runs `npm run oss:licenses` and fails on non-zero exit.
- [ ] T026 [US4] Run `npm run oss:licenses` locally against the current dependency tree (post-T007 generation); the check MUST pass with zero exemptions OR — for any dep that legitimately needs one — add the exemption to `oss-allowlist.json` with a substantive justification (≥ 20 chars, audit date, scope, approver per the schema's spirit); commit the populated allowlist as the project's starting state

**Checkpoint**: User Story 4 functional. Future supply-chain license risk is gated at PR time.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: User-facing documentation, CLAUDE.md update, full-pipeline verification, and a clean UAT pass before flipping the draft PR to ready-for-review.

- [ ] T027 Update user documentation in `docs/content.en.md` and `docs/content.de.md` to describe the new "Open-source licenses" page: where to find it (Settings page footer), what it shows (every open-source library the app ships, with version + license + link), why it exists (license compliance + transparency), and the fact that the SBoM is also available at `/sbom.json` for tooling. Mirror the section in German.
- [ ] T028 Update `CLAUDE.md` "Quality + security pipeline" section to mention the two new CI gates (`oss:drift` after typecheck, `oss:licenses` immediately after) and the single `npm run oss:generate` regeneration command; mention that `sbom.json` and `attributions.json` are committed generated files (not hand-edited)
- [ ] T029 [P] Run `npm run test:coverage` and confirm every new file (generator, drift script, license check, `js/licenses.js`) reaches the project's ≥ 95 % per-file line-coverage threshold; if any file falls short, add the missing test cases before considering the task done
- [ ] T030 [P] Run `npm run sqi` and confirm the score remains in the GREEN band (≥ 60); if it dropped, identify which metric regressed and fix the underlying issue (per Constitution VI's explicit anti-gaming clause, do NOT re-tune SQI bands to recover GREEN)
- [ ] T031 Run the full quickstart.md UAT walkthrough (sections 1–8) manually; record any deviation as a follow-up task or fix it in-place before sign-off; this is the gate that flips the draft PR to ready-for-review

**Checkpoint**: Feature is complete, tested, documented, and ready for `/speckit-uat-run` → merge.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies — start immediately
- **Phase 2 (Foundational)**: depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: depends on Phase 2 (needs `attributions.json` to render)
- **Phase 4 (US2)**: depends on Phase 2 (needs `sbom.json` to validate and upload)
- **Phase 5 (US3)**: depends on Phase 2 (the drift check compares against the Phase-2 outputs)
- **Phase 6 (US4)**: depends on Phase 2 (the license check reads `sbom.json`)
- **Phase 7 (Polish)**: depends on all user stories being complete

### User Story Independence Post-Phase-2

After Phase 2 finishes, US1, US2, US3, US4 are logically independent and can be implemented in parallel by separate developers:

- US1 touches `licenses.html`, `js/licenses.js`, `css/style.css`, `settings.html`, `js/i18n/{en,de}.js`, `tests/ui/oss-licenses.spec.js`, `tests/unit/{licenses,i18n-licenses}.test.js`
- US2 touches `.github/workflows/release.yml`, `tests/unit/{sbom-validity,sbom-attributions-parity}.test.js`
- US3 touches `scripts/oss-drift-check.mjs`, `.github/workflows/deploy.yml`, `tests/unit/oss-drift-check.test.js`
- US4 touches `oss-allowlist.json`, `scripts/oss-check-licenses.mjs`, `.github/workflows/deploy.yml`, `tests/unit/{oss-check-licenses,oss-allowlist-schema}.test.js`

**File-level conflict**: US3 (T021) and US4 (T025) both edit `.github/workflows/deploy.yml`. They MUST be sequenced (US3 first, US4 second) at integration time. Within a single developer's flow, this is trivial; for parallel work, the second to merge rebases.

### Within Each User Story

- Models / data shapes → script implementation → CI integration → smoke test
- Each task includes its own tests — a task is not done until tests pass
- Story complete = independent test from spec.md passes end-to-end

### Parallel Opportunities

- **Phase 1**: T002 + T003 can run in parallel with each other (different files / different concerns); T001 must run first because they reference the updated package.json
- **Phase 2**: T005 can run in parallel with T006 (different files); T004 must finish before T006 (generator reads manifest); T007 depends on both T004 and T006
- **Phase 3 (US1)**: T009, T010, T011, T012 are all [P] (different files); T008 should run first or in parallel; T013 (Playwright) depends on T009 + T010 + T011 + T012 being present; T014 is a config-touch and effectively serial
- **Phase 4 (US2)**: T015 and T016 are the same file (sequential within release.yml); T017 is independent; T018 + T019 are independent unit tests
- **Phase 5 (US3)**: T020 first (script + tests); T021 second (CI wiring)
- **Phase 6 (US4)**: T022 + T024 + T023 can run in parallel after Phase 2; T025 last; T026 is the final verification

### Stories that share a file (cross-story sequencing)

- `.github/workflows/deploy.yml` edited by US3 (T021) and US4 (T025) → US3 first, US4 second
- `.github/workflows/release.yml` edited only by US2 (T015 + T016) → no cross-story conflict

---

## Parallel Example — Phase 3 (US1)

After Phase 2 checkpoint, a single developer can fan out US1 like this:

```bash
# T008 first (i18n keys — drives later HTML data-i18n / t() calls)
# Then in parallel:
#   T009 (licenses.html shell)
#   T010 (js/licenses.js render code + unit tests)
#   T011 (css/style.css additions)
#   T012 (settings.html footer link)
# Once all four land:
#   T013 (Playwright + axe-core test)
#   T014 (deploy.yml paths trigger + smoke-run)
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 (Setup) — T001–T003
2. Phase 2 (Foundational) — T004–T007
3. Phase 3 (US1) — T008–T014
4. **STOP and VALIDATE**: every step of UAT-1 in `quickstart.md` passes manually + Playwright green + axe-core clean
5. PR is mergeable as a partial-feature MVP at this point: the app has an attributions page; SBoM + CI gates are still missing but each can land later as a follow-up PR if needed

### Recommended Sequential Delivery

US1 → US2 → US3 → US4 → Polish. Each phase ends in a logical commit + push so reviewers see incremental, scoped diffs.

### Parallel Team Strategy (if multiple developers)

- Developer A: Phase 1 + Phase 2 (foundation)
- After Phase 2 checkpoint:
  - Developer A: US1 + Polish
  - Developer B: US2 + US3
  - Developer C: US4
- Coordinate on `deploy.yml` edits (US3 + US4 both touch it — US3 first)

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks
- `[US#]` label maps a task to a specific user story for traceability
- Setup, Foundational, and Polish tasks have NO `[US#]` label
- Each task includes its own tests — no separate test phases; a task is done only when its tests exist AND pass
- Commit after each task or logical group, following the project's `chore(034): …` / `feat(034): …` / `docs(034): …` convention; commit messages SHOULD reference the task ID (e.g. `T006: implement scripts/oss-generate.mjs`)
- Pre-commit hook (lint-staged + prettier) will run on every commit; allow it to format code — but do NOT let it touch `sbom.json` / `attributions.json` (T002 adds them to `.prettierignore`)
- Stop at any checkpoint to validate the latest story independently
- Avoid: cross-story file rewrites, vague task descriptions, hand-edits to `sbom.json` / `attributions.json` (regenerate via `npm run oss:generate` instead)
