---
description: 'Task list for Pre-Handover Cleanup and Quality-Bar Tightening (Feature 035)'
---

# Tasks: Pre-Handover Cleanup and Quality-Bar Tightening

**Input**: Design documents from `specs/035-handover-readiness/`
**Prerequisites**: [`plan.md`](plan.md), [`spec.md`](spec.md), [`research.md`](research.md), [`data-model.md`](data-model.md), [`contracts/redmine-api-error-surface.md`](contracts/redmine-api-error-surface.md), [`quickstart.md`](quickstart.md)

**Tests**: Every implementation task that adds or changes behavior includes its own unit and/or UI tests. Tests are part of completing each task — a task is not done until its tests exist and pass.

**Organization**: Tasks are grouped by user story (US1 = P1 visible-cruft, US2 = P2 structural, US3 = P3 quality-bar tightening) so each story can be implemented, tested, and merged independently. US1 alone is an internal "MVP" (smallest credible handover-readiness signal).

**User documentation**: SKIPPED. This feature is purely internal — refactoring (`calendar.js` split, `window._calendar*` removal), internal API tightening (`fetchTimeEntryById`, `renderMessage` defense-in-depth), tooling/lint configuration, and developer-facing documentation. No user-visible behavior changes, so `docs/content.en.md` and `docs/content.de.md` remain untouched.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3) — required for story-phase tasks only

## Path Conventions

Single-project static SPA. JS sources in `js/`, Node-side tooling in `scripts/`, tests in `tests/unit/` and `tests/ui/`, CI workflows in `.github/workflows/`. Paths in task descriptions are repository-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project-level prerequisites that must land before user-story work begins.

- [x] T001 Add `@types/node` to `devDependencies` in `package.json` (use a current LTS-compatible version range, e.g. `^20.0.0`); run `npm install` to refresh `package-lock.json` — unlocks T019 (FR-010 prerequisite)
- [x] T002 Regenerate `sbom.json` and `attributions.json` via `npm run oss:generate` after T001; verify `npm run oss:drift` and `npm run oss:licenses` both exit 0 (CLAUDE.md policy: any dependency change requires SBoM regeneration before the PR can merge)
- [x] T003 [P] Run `npm run sqi` on the pre-cleanup tree and record the baseline composite score + per-metric scores in PR #105's description as `## SQI baseline (before cleanup)`; this is the reference value that FR-017 will compare against after US2 + US3 land

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational layer is required for this feature. The cleanup items are independent file-level edits; the only cross-story ordering is documented in **Dependencies & Execution Order** below (US3's FR-015 threshold raise cannot land until US2's `calendar.js` split has cleared the moduleSize band at ≥ 80).

**Checkpoint**: After Phase 1 completes, all three user stories can begin in parallel.

---

## Phase 3: User Story 1 — Visible-Cruft Cleanup (Priority: P1) 🎯 MVP

**Goal**: Remove the small but highly visible defects surfaced by the handover audit (stale comments, CLAUDE.md/CI drift, dead branches, unjustified CI duplication) so the first impression to a senior reviewer is clean.

**Independent Test**: After this phase, the cruft-audit grep commands from `quickstart.md` UAT-001, UAT-002, and UAT-003 all return zero unexpected hits, and no comment in the touched files disagrees with current code.

- [x] T004 [P] [US1] Rewrite the comment block at `scripts/oss-generate.mjs:45-46` to accurately reflect the current code path; remove the reference to the deleted `enrichLicensesFromNodeModules` helper and reference the NOASSERTION-on-`scope: optional` policy implemented in `scripts/oss-check-licenses.mjs` (FR-001)
- [x] T005 [P] [US1] Fix the stale comment in `.github/workflows/release.yml:80` so the parenthetical references `ci.yml` instead of `deploy.yml` (FR-002)
- [x] T006 [US1] Add `- run: npm audit --audit-level=high` as the first step of the `lint-and-format` job in `.github/workflows/ci.yml`; place it before the existing `npm ci` so the audit runs against the committed lock file (FR-003, aligns CI execution with CLAUDE.md and Constitution Principle VI step order)
- [x] T007 [P] [US1] Remove the unreachable `scope === 'excluded'` branches at `scripts/oss-check-licenses.mjs:157` and `:180`; if an existing unit test under `tests/unit/oss-check-licenses.test.js` references the excluded scope, update or remove the assertion (FR-004)
- [x] T008 [P] [US1] Add a multi-line comment block to `.github/workflows/deploy.yml` immediately above the duplicated gate steps (oss:drift, oss:licenses, test:coverage, sqi:json, test:ui) explaining the post-merge defense-in-depth role per [`research.md`](research.md) Decision 8 (FR-005)

**Checkpoint**: US1 stands alone — running UAT-001, UAT-002, UAT-003 from quickstart should all pass. This is the smallest credible "handover-readiness" signal and can be merged independently if cleanup time-pressure increases.

---

## Phase 4: User Story 2 — Structural Cleanup of God-Module and API Inconsistencies (Priority: P2)

**Goal**: Address the structural issues a senior would notice on a second read — split the 1199-LOC `calendar.js` god-module, eliminate `window._calendar*` cross-callback globals, bring `fetchTimeEntryById` into line with the rest of the `redmine-api` error contract, tighten the chatbot's HTML path, and remove the last `@ts-ignore`.

**Independent Test**: After this phase, `wc -l js/*.js | sort -n` shows the largest JavaScript file under 500 LOC; `grep -r "window._calendar" js/` returns zero matches; `tsc --noEmit` passes with no `@ts-ignore` directives in `js/knowledge.js`; `tests/unit/redmine-api.test.js` asserts `RedmineError` on 404 (no `null`); `tests/ui/` Playwright suite remains green.

### Calendar split + globals elimination (TDD per [`research.md`](research.md) Decision 1)

- [x] T009 [US2] Write `tests/unit/calendar-toolbar.test.js` asserting the planned public surface of `installToolbarButtons(calendar, deps)` (workhours toggle wiring, day-range toggle wiring, custom-button registration); tests should fail initially because the module does not exist yet
- [x] T010 [US2] Create `js/calendar-toolbar.js` exporting `installToolbarButtons(calendar, deps)`; move toolbar/custom-button code from `js/calendar.js` (currently around lines 577–680 per the audit reference); update `js/calendar.js` to import and call `installToolbarButtons(calendar, deps)` at the existing init point; satisfy T009 tests; depends on T009 (FR-006 part 1)
- [x] T011 [US2] Write `tests/unit/calendar-overlays.test.js` asserting the planned public surface of `attachOverlayHooks(calendar, { getArbzgWarnings, getAnomalies, getDayTotals })` returning `{ updateOverlays(entries) }`; tests should fail initially
- [x] T012 [US2] Convert the three `window._calendar*` properties in `js/calendar.js` to module-scope `let` bindings; add and export accessor functions `getArbzgWarnings()`, `getAnomalies()`, `getDayTotals()` per [`research.md`](research.md) Decision 2; verify `grep -r "window._calendar" js/` returns zero matches (FR-007); depends on T010
- [x] T013 [US2] Create `js/calendar-overlays.js` exporting `attachOverlayHooks(calendar, deps)`; move ArbZG/anomaly/day-totals overlay decoration code from `js/calendar.js`; wire `js/calendar.js` to call `attachOverlayHooks(calendar, { getArbzgWarnings, getAnomalies, getDayTotals })` and invoke `updateOverlays(entries)` at the existing render hook; satisfy T011 tests; depends on T011, T012 (FR-006 part 2 + FR-007 cross-module wiring)
- [x] T014 [US2] Run `npm run test:ui` (full Playwright suite); fix any regressions introduced by T010–T013; depends on T013 (verifies US2 acceptance scenarios #1 + #2)

### Redmine API error-surface alignment (per [`contracts/redmine-api-error-surface.md`](contracts/redmine-api-error-surface.md))

- [x] T015 [P] [US2] Update `fetchTimeEntryById` at `js/redmine-api.js:203-209`: remove the silent-null `try/catch`, return `time_entry` directly, let `RedmineError` propagate; preserve JSDoc but update return type to non-nullable (FR-008)
- [x] T016 [US2] Update the sole caller at `js/chatbot-tools.js:306`: wrap `fetchTimeEntryById(entry_id)` in `try/catch`, translate `err instanceof RedmineError && err.status === 404` to the existing "time entry not found" tool response, re-throw other errors; depends on T015
- [x] T017 [US2] Update `tests/unit/redmine-api.test.js`: replace the existing `expect(result).toBeNull()` assertion on 404 with `expect(...).rejects.toThrow(RedmineError)` plus a status check; add a new assertion that a 500 response also throws (was previously untestable because of silent-null); depends on T015

### Chatbot HTML-path tightening (per [`research.md`](research.md) Decision 7)

- [x] T018 [P] [US2] Move the `DOMPurify.sanitize(...)` call inside `renderMessage(role, html)` in `js/chatbot.js`; simplify the existing `renderText` caller (no longer needs to call sanitize before passing to renderMessage); add a unit test in `tests/unit/chatbot-render.test.js` (create file if absent) asserting that input like `<script>alert(1)</script>` is stripped by renderMessage even when called directly (FR-009)

### `@ts-ignore` retirement

- [x] T019 [P] [US2] Remove the `@ts-ignore` line at `js/knowledge.js:10`; rerun `npm run typecheck` to confirm `tsc --noEmit` still passes; depends on Setup T001 (`@types/node` available) (FR-010, SC-008)

### Coverage refresh

- [x] T020 [US2] Run `npm run test:coverage:all` to regenerate `coverage/unified-summary.json` on the branch; verify `total.lines.pct >= 95`; if the value diverges from CLAUDE.md's `≥ 95%` claim, update CLAUDE.md to the actual figure; depends on T010, T013, T015, T016, T018 (so coverage measures the post-cleanup state) (FR-011)

**Checkpoint**: US2 + US1 together remove all eleven audit findings. The codebase is now in the post-cleanup state that US3's quality-bar tightening will lock in. UAT-004 through UAT-009 from quickstart should pass.

---

## Phase 5: User Story 3 — Permanent Quality-Bar Tightening (Priority: P3)

**Goal**: Lock in the quality bar so the codebase cannot drift back to its pre-cleanup state silently. Redesign the SQI `moduleSize` band so file size actually shows up in the score; raise the composite gate to ≥ 80 as a hard CI failure; tighten ESLint thresholds permanently.

**Independent Test**: After this phase, `npm run sqi` reports composite ≥ 80 with exit code 0; a deliberate regression (100-line function added to a pure-logic module on a throwaway branch) causes the next `npm run sqi` to exit 1 and fail CI; `eslint.config.js` shows `max-lines-per-function: 60` on `js/**` and `max-lines: 600` + `complexity: 20` on `scripts/**`.

### SQI band + threshold

- [x] T021 [P] [US3] Redesign the `moduleSize` scoring in `scripts/sqi.mjs` per [`research.md`](research.md) Decision 3: replace the violation-count-only band with a worst-file-overage scorer (`worstFile.loc / 500` → anchors `[1.0,100][1.2,80][1.5,50][2.0,20][3.0,0]`) multiplied by a violation-count multiplier (`1.0` at 1 violation, `0.8` at 2–3, `0.5` at 4+); update the `BANDS.moduleSize` constant and the metric record so the displayed score reflects the new formula; add unit test `tests/unit/sqi-modulesize.test.js` asserting the three corner cases (1x = 100, 2x = ~20×1.0 = 20, four violations = ~×0.5) (FR-012)
- [x] T022 [P] [US3] Add `max-lines: ['warn', { max: 600, skipBlankLines: true, skipComments: true }]` and `complexity: ['warn', { max: 20 }]` to the `scripts/**` override block in `eslint.config.js` per [`research.md`](research.md) Decision 4; add an inline comment justifying why these limits are more generous than the `js/**` limits (CLI-tool main functions and option-parsing branching); run `npm run lint` to confirm no current scripts file fires the new warnings (FR-013)

### ESLint `max-lines-per-function: 60`

- [x] T023 [US3] Change `max-lines-per-function` in `eslint.config.js:69` from `{ max: 80 }` to `{ max: 60, skipBlankLines: true, skipComments: true }`; run `npm run lint -- js/` and capture the list of offending functions into a temporary file or note (FR-014)
- [x] T024 [US3] For each offender from T023: either refactor the function below 60 lines (preferred) OR add a `// eslint-disable-next-line max-lines-per-function — <justification>` line above the function with a short em-dash-separated reason per FR-019; **budget: up to 3 exceptions** per [`research.md`](research.md) Decision 5; if more than 3 exceptions are needed, stop and flag in PR #105 description that the cleanup scope expanded; depends on T023 (FR-014, FR-019)

### Composite gate raise to ≥ 80

- [x] T025 [US3] Run `npm run sqi` after T021, T022, T024 (and US2 complete); verify the composite score is ≥ 80 with the new `moduleSize` band; record the value in PR #105 description as `## SQI post-cleanup (with new band, before threshold raise)`; if composite < 80, do not proceed to T026 — open a sub-task to address the lowest-scoring metric (FR-017)
- [x] T026 [US3] Update `scripts/sqi.mjs`: change the `bandFor()` GREEN threshold from `>= 60` to `>= 80` and YELLOW lower bound accordingly (e.g., `>= 30` could stay as RED upper bound or shift — pick a coherent set and document in the file's comment block); update the `process.exit(composite >= 60 ? 0 : 1)` line at the bottom to `>= 80`; update the dashboard "Bands:" footer string in `renderText()` to match; add unit test `tests/unit/sqi-threshold.test.js` asserting `process.exit(1)` behavior below 80 and `process.exit(0)` at/above 80 (use child-process spawn or mock `process.exit`); depends on T025 (FR-015)
- [x] T027 [US3] Search `.github/workflows/ci.yml` and `deploy.yml` for any `continue-on-error: true` or `|| true` suppression on the SQI step; if none, document the negative finding in PR #105 description; if any exist, remove them; capture grep evidence (`grep -B1 -A3 sqi.json .github/workflows/*.yml`) (FR-016)

**Checkpoint**: US3 closes the regression-prevention loop. Quickstart UAT-010, UAT-011 should pass; the regression-check sub-test in UAT-011 should fire correctly (deliberate 100-line function pushes the next SQI run below 80 and CI fails).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation alignment, constitution amendment, and final UAT verification.

- [x] T028 [P] Update CLAUDE.md "Quality + security pipeline" paragraph to reflect: (a) the new SQI threshold (`≥ 80 GREEN`) replacing the previous `≥ 60`; (b) the `npm audit` step location resolution from T006; (c) a brief note that `deploy.yml` gates run post-merge as a backstop, justified inline per T008 (FR-018)
- [x] T029 [P] Update `.specify/memory/constitution.md` Principle VI to replace the band text `**≥ 60 GREEN** (mergeable), **30–59 YELLOW**` with `**≥ 80 GREEN** (mergeable), **50–79 YELLOW**` (or a coherent equivalent — preserve the four-band shape); update the Sync Impact Report comment at the top of the file with the version bump 1.5.0 → 1.5.1, a one-line description of the threshold change, and "Templates reviewed: ✅ aligned (threshold value only, no structural change)"; update the `**Version**: 1.5.0 ... **Last Amended**:` line at the bottom to `1.5.1 ... 2026-05-19` (or current date) — depends on T026 having landed first so the codebase and constitution are in sync (Plan Constitution Check Decision 10)
- [x] T030 Run the full `quickstart.md` UAT walkthrough (UAT-001 through UAT-014); record per-step results in a comment on PR #105 ready for `/speckit-uat-run` to ingest at the UAT phase; if any step fails, open a follow-up task and do NOT advance to `/speckit-uat-run` until resolved — no bypass via `--no-verify`, `|| true`, or `continue-on-error` per FR-016 and Constitution Principle VI (verifies SC-001 through SC-010)

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: T001 → T002 (oss:generate after install); T003 independent of T001 (baseline measure can run on the pre-T001 tree to capture the absolute starting point)
- **Phase 2 (Foundational)**: empty (see note in phase body)
- **Phase 3 (US1)**: depends only on Phase 1 completing; no internal sequence
- **Phase 4 (US2)**: depends on Phase 1 (specifically T001 for T019); internal sequence detailed below
- **Phase 5 (US3)**: depends on Phase 1; T025 depends on Phases 4 + tasks T021/T022/T024 completing so the SQI score has the new band applied and `calendar.js` is split; T026 depends on T025
- **Phase 6 (Polish)**: T028, T029 depend on T026 (so the constitution and CLAUDE.md reflect the actually-landed threshold); T030 depends on everything else complete

### User Story dependencies

- **US1**: independent — can start as soon as Phase 1 is done.
- **US2**: independent of US1 — can start in parallel; the only Phase-1 prerequisite (T001) is shared.
- **US3**: **partially dependent on US2**. T021 + T022 (new band design, scripts/** lint config) and T023 + T024 (max-lines-per-function tightening) can run in parallel with US2 — they don't read the cleaned-up state. But T025 (the verification that composite ≥ 80) depends on US2's calendar.js split (FR-006) having landed, because the new moduleSize band scores ~20 with the current 1199-LOC calendar.js. T026 (the threshold raise itself) depends on T025. So **US3's tooling-config work can start anytime; US3's threshold raise (T025 → T026) must follow US2's calendar split (T010 → T013)\*\*.

### Within US2 (internal sequence)

- T009 → T010 (TDD: test first, then create module + move code)
- T011 + T012 must precede T013 (overlay test + globals-to-accessor refactor unblock the overlays module creation)
- T010 → T012 → T013 → T014 (UI regression check after all calendar.js work)
- T015 → T016 → T017 (API change first, then caller, then test updates)
- T018, T019 are independent of the calendar split and of the redmine-api work
- T020 depends on T010, T013, T015, T016, T018 (so coverage measures the final state)

### Parallel opportunities

- **Within Phase 1**: T002 and T003 can run in parallel (T003 doesn't need T001; T002 depends on T001)
- **Within US1**: T004, T005, T007, T008 are all [P] — different files, no dependencies on each other. T006 touches `ci.yml` and is independent of T005 (which touches `release.yml`).
- **Within US2**: T015, T018, T019 are [P] with each other and with the calendar-split chain (T009 → T010 → T011 → T012 → T013)
- **Within US3**: T021 and T022 are [P] with each other and with T023; T024 is sequential after T023
- **Within Polish**: T028 and T029 are [P]; T030 is sequential after everything else

---

## Parallel Example: US1 (full phase in parallel)

```bash
# US1 has no internal dependencies beyond Phase 1 — kick all five off together:
Task T004: "Rewrite stale comment in scripts/oss-generate.mjs:45-46"
Task T005: "Fix stale comment in .github/workflows/release.yml:80"
Task T006: "Add npm audit --audit-level=high to ci.yml lint-and-format job"
Task T007: "Remove scope === 'excluded' dead branches in scripts/oss-check-licenses.mjs"
Task T008: "Add post-merge backstop justification comment to .github/workflows/deploy.yml"
```

## Parallel Example: US2 (independent strands)

```bash
# After T009 (toolbar test written), kick off in three parallel strands:
# Strand A: T010 → T011 → T012 → T013 → T014 (calendar.js split + globals)
# Strand B: T015 → T016 → T017 (redmine-api error surface)
# Strand C: T018 (chatbot HTML) and T019 (knowledge.js @ts-ignore) — both [P]
# Then merge to T020 (coverage refresh) once all three strands done.
```

---

## Implementation Strategy

### MVP First (US1 only)

US1 is the highest-leverage credibility win for the lowest cost. If time pressure mounts:

1. Complete Phase 1 setup.
2. Complete Phase 3 (US1) — all five visible-cruft fixes.
3. **STOP and validate**: run UAT-001, UAT-002, UAT-003 from quickstart.
4. Merge US1 independently as a small "pre-handover housekeeping" PR; defer US2 + US3 to a follow-up.

This still removes every visible-to-first-impression defect surfaced by the audit. A senior skimming the diff sees a clean, small, focused PR rather than a 30-task megachange.

### Full incremental delivery (recommended)

1. Phase 1 → Phase 3 (US1) → independent merge or hold for the full PR
2. Phase 4 (US2) — biggest phase, depends on US1 only via shared Phase 1; refactor + tests
3. Phase 5 (US3 tooling-config) — T021–T024 in parallel with the tail of US2
4. Phase 5 (US3 threshold raise) — T025 → T026 → T027 once US2 calendar split lands
5. Phase 6 polish — T028 + T029 in parallel, then T030 UAT walkthrough
6. `/speckit-uat-run` to flip PR #105 from draft to ready-for-review

### Parallel team strategy

With multiple contributors:

1. Person A: Phase 1 setup + US1 (visible-cruft cleanup, ~1–2 hours)
2. Person B: US2 calendar split (T009 → T014, ~4–6 hours — the largest single effort)
3. Person C: US2 redmine-api + chatbot + knowledge.js (T015 → T020, ~2–3 hours) in parallel with B
4. Person D: US3 tooling (T021 → T024, ~2–3 hours) in parallel with B + C
5. After US2 lands: any of A–D picks up US3 threshold raise (T025 → T027) and Phase 6 polish

---

## Notes

- **No user documentation task.** This feature is purely internal — no user-visible behavior change. `docs/content.en.md` and `docs/content.de.md` are intentionally not touched (skill instruction explicitly permits omission for refactoring / testing / infrastructure features).
- **No new dependencies beyond `@types/node`.** Plan and research already settled this; T001 is the only `package.json` change.
- **The constitution amendment (T029) is part of this feature's PR**, not a separate constitution-only PR. The threshold change in code (T026) and the constitution text update must land in the same merge so they cannot drift; this is required by Constitution Principle VI itself ("deliberate, code-reviewed act — not a silent knob").
- **Stop at any checkpoint** to validate the story independently. After US1, the audit's worst signals are already removed; after US2, the codebase is in its final clean state; after US3, the guardrails are locked.
- **Commits**: per Constitution Development Workflow, commit after each task or logical task group, referencing the task ID (e.g., `T010: split calendar.js — extract toolbar module`).
