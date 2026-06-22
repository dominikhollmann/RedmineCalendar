---
description: 'Task list for feature 048 — DRY Deduplication & Baseline Tightening'
---

# Tasks: DRY Deduplication & Baseline Tightening

**Input**: Design documents from `specs/048-dry-deduplication/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — the spec (FR-003) and plan (Constitution III, research Decision 9)
mandate TDD for every extracted pure function and the existing Playwright suite as the
behaviour-preservation net.

**Organization**: Tasks are grouped by the three user stories (US1 audit → US2 unify →
US3 baseline) so each is independently completable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- File paths are exact. Clone numbers (#n) reference plan.md Wiederverwendungs-Audit Part A.

---

## Phase 1: Setup (Baseline capture)

**Purpose**: Record the pre-refactor state so behaviour-preservation and the duplication/SQI
deltas are measurable.

- [ ] T001 [P] Run `npm ci`, then `npm run dup:report` and confirm the working clone inventory matches plan.md Part A (`coverage/jscpd/jscpd-report.json` — expect 23 clones / 1.45 %).
- [ ] T002 [P] Run `npm run test:ui` to establish the green behaviour-preservation baseline (first-run pass/fail list per the fast-iteration workflow).
- [ ] T003 [P] Run `npm run sqi:json` and record the pre-refactor SQI composite (for the ≥ 80 comparison at the end).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared scaffolding required before any user story.

**None required.** This is a behaviour-preserving refactor of existing modules; there is no
shared schema, framework, or infra to stand up. Each shared abstraction is created within its
own US2 cluster. Proceed directly to User Story 1.

**Checkpoint**: Baselines captured → audit finalisation can begin.

---

## Phase 3: User Story 1 — Documented codebase-wide DRY audit (Priority: P1) 🎯 MVP

**Goal**: A complete, evidence-based audit: every token-clone dispositioned (already in
plan.md Part A), the semantic/`scripts/**` survey finished, and every behaviour-divergence
investigated and decided. This is an independently valuable deliverable even with zero
refactoring.

**Independent Test**: Review plan.md Wiederverwendungs-Audit — Parts A/B/C are complete, every
clone has a disposition, each cross-file semantic pair is marked same/different, and every
ambiguous divergence has a recorded product-owner decision.

- [ ] T004 [US1] Complete the `scripts/**` semantic survey (`scripts/sqi.mjs`, `scripts/coverage-merge.mjs`, `scripts/dup-check.mjs`, `scripts/oss-generate.mjs`) for same-purpose helpers; record findings in plan.md Part B.
- [ ] T005 [P] [US1] Divergence diff #1 — read `js/chatbot.js` (213-220, 556-584) vs `js/docs.js` (204-243); determine whether markdown sanitisation/syntax behaviour matches; record same/different in plan.md Part C.
- [ ] T006 [P] [US1] Divergence diff #2 — read `js/calendar.js` (504-524) vs `js/planning-view-bookings.js` (234-254); compare booking→event rounding/title/comment/class assignment; record in plan.md Part C.
- [ ] T007 [P] [US1] Divergence diff #3 — read `js/outlook.js` (53-58, 424-429), `js/planning-view-teams.js` (54-59), `js/time-entry-form-utils.js` (53-58); confirm date/time rounding/formatting agree; record in plan.md Part C.
- [ ] T008 [US1] For every divergence found AND ambiguous (intended vs. accidental unclear), escalate to the product owner (per FR-005a) and record the decision in plan.md Part C / Complexity Tracking.
- [ ] T009 [US1] Finalise all dispositions in plan.md Wiederverwendungs-Audit + Complexity Tracking (confirm #15 keep; lock each cluster's "will fix" vs "kept").

**Checkpoint**: Audit complete — US1 deliverable shippable on its own.

---

## Phase 4: User Story 2 — Unify same-purpose code via shared abstractions (Priority: P2)

**Goal**: Every "will fix" duplication replaced by a single shared abstraction; intended
behaviour preserved; any accidental divergence converged with sign-off.

**Independent Test**: Each "will fix" clone has exactly one surviving implementation; unit
suites for the new pure functions pass; the full Playwright suite passes (green where preserved,
updated where a divergence was converged).

### Cluster A — Planning-view render orchestrator (audit P1; clones #3, #4 + identical `rerender*`)

- [ ] T010 [US2] Create `js/planning-view-column-render.js` exporting `renderPlanningColumn(config)` + `rerenderPlanningColumn(col, fcRef, planningEvents)` per `contracts/shared-abstractions.md`.
- [ ] T011 [US2] Refactor `js/planning-view-outlook.js` to delegate the preamble/guard/fetch/mount/closing + rerender to the orchestrator (inject `_checkOutlookAvailability` + `_fetchAndParseProposals`/`_buildItems`).
- [ ] T012 [US2] Refactor `js/planning-view-teams.js` to delegate likewise (inject `_checkTeamsAvailability` + `_fetchTeamsActivity`/normalise/`_buildTeamsItems`).
- [ ] T013 [US2] Route `planning-view-column-render` in `js/knowledge.topics.json`; run `npm run test:ui:failed` for `tests/ui/planning-view*.spec.js`.

### Cluster B — Shared panel controller (clones #9, #12, #13) — CORRECTED per plan Part D

> Audit correction: these clones are panel open/close/resize/Escape machinery, NOT
> markdown. Decision (Q1): **converge — docs panel also shifts layout** via a width var.

- [ ] T014 [P] [US2] Write failing jsdom unit test `tests/unit/panel-controller.test.js` for the shared open/close/resize behaviour (incl. width-CSS-var update).
- [ ] T015 [US2] Create `js/panel-controller.js` exporting a factory `createPanelController({ panelSelector, handleSelector, openClass, widthCssVar })` providing open/close/resize/Escape wiring.
- [ ] T016 [US2] Refactor `js/chatbot.js` to consume the controller (keeps `--chatbot-panel-w`).
- [ ] T017 [US2] Refactor `js/docs.js` to consume the controller AND set its own width var so the docs panel shifts the layout like chatbot (CONVERGE Q1 — flag in PR, add assertion).
- [ ] T018 [US2] Route `panel-controller` in `js/knowledge.topics.json`.

### Cluster C — Shared `httpsOrigin` + retry constants (clone #16) — CORRECTED per plan Part D

> Audit correction: #16 is the byte-identical `httpsOrigin(url)` helper + retry-status
> constants, NOT a generic `fetchJson`. The retry **error mapping** differs by design
> (AI vs `RedmineError`) and stays per-client.

- [ ] T019 [P] [US2] Write failing unit test `tests/unit/https-origin.test.js` for `httpsOrigin(url)` (valid URL → `https://host/`; invalid → passthrough).
- [ ] T020 [US2] Create `js/http.js` exporting `httpsOrigin(url)` and the shared retry-status constants (`RETRY_STATUSES`, `RETRY_COUNT`, `RETRY_BASE_MS`).
- [ ] T021 [US2] Refactor `js/chatbot-api.js` to import `httpsOrigin` + retry constants (keep `fetchAiWithRetry` error mapping local).
- [ ] T022 [US2] Refactor `js/redmine-api.js` to import `httpsOrigin` + retry constants (keep `RedmineError` mapping + `X-Redmine-API-Key` header + HTTPS target local — Constitution I/V).
- [ ] T023 [US2] Route `http` in `js/knowledge.topics.json`.

### Cluster D — Shared undo-listener factory (clones #18, #19) — CORRECTED per plan Part D

> Audit correction: #18/#19 are the `undo:preAnimate` + `undo:eventChanged` document
> listeners, NOT a booking mapper. Decision (Q2): **converge — planning-bookings also
> recomputes day totals**.

- [ ] T024 [P] [US2] Write failing jsdom unit test `tests/unit/undo-listeners.test.js` for the shared listener factory (calendar accessor + active-guard + optional `onAfterChange`).
- [ ] T025 [US2] Create `js/undo-listeners.js` `registerUndoListeners({ getCal, isActive, onAfterChange })` covering `undo:preAnimate` + `undo:eventChanged` (+ `eventDeleted`/`eventAdded` if shared).
- [ ] T026 [US2] Refactor `js/calendar.js` (502-525) to register via the factory (`onAfterChange = recomputeDayTotals`).
- [ ] T027 [US2] Refactor `js/planning-view-bookings.js` (232-260) to register via the factory, passing `onAfterChange = recomputeDayTotals` (CONVERGE Q2 — flag in PR, add assertion).
- [ ] T028 [US2] Route `undo-listeners` in `js/knowledge.topics.json`.

### Cluster E — `resolveConfigTicket` leaf (clone #21)

- [ ] T029 [P] [US2] Write failing unit test `tests/unit/config-store-ticket.test.js` for `resolveConfigTicket(field)`.
- [ ] T030 [US2] Add `resolveConfigTicket(field)` to `js/config-store.js`.
- [ ] T031 [US2] Refactor `js/event-classes.js` and `js/calendar-overlays.js` (54-60) to consume `resolveConfigTicket`.

### Cluster F — Shared date/time utils (clones #6, #7)

- [ ] T032 [P] [US2] Write failing unit test(s) for the shared date util (#6) and time util (#7).
- [ ] T033 [US2] Extract the shared date helper (#6) consumed by `js/outlook.js` (53-58) and `js/planning-view-teams.js` (54-59).
- [ ] T034 [US2] Unify `timeToMins` (#7) on the exported `js/time-entry-form-utils.js` `timeToMins`: replace the private copy in `js/outlook.js` (424-427) AND `toMins` in `js/planning-view-column-base.js` (22-25) with imports (3-way dedupe per plan Part D).

### Cluster G — Local self-clones → private helpers (one file each)

- [ ] T035 [P] [US2] Extract a private helper in `js/undo-actions.js` (#1, lines 122-127 / 176-181).
- [ ] T036 [P] [US2] Extract a private helper in `js/planning-view-dates.js` (#5, lines 22-27 / 40-45).
- [ ] T037 [P] [US2] Extract a private DOM-builder helper in `js/feedback.js` (#8, lines 110-120 / 134-144).
- [ ] T038 [P] [US2] Extract private helper(s) in `js/chatbot-tools-entries.js` (#14, lines 215-222 / 254-261).
- [ ] T039 [P] [US2] Extract a private helper in `js/calendar-toolbar.js` (#20, lines 110-119 / 155-164).
- [ ] T040 [P] [US2] Extract a private helper in `js/anomaly-render.js` (#23, lines 90-116 / 164-177).
- [ ] T041 [US2] Extract a private helper in `js/time-entry-form-utils.js` (#2, lines 131-137 / 146-151) — same file as T034, sequence after it.
- [ ] T042 [US2] Extract private helpers in `js/chatbot.js` (#10/#11, lines 482-493 / 498-512) — same file as T016, sequence after it.
- [ ] T043 [US2] Extract a local `openCreateForm(prefill, wasPaste)` helper in `js/calendar.js` (#17, the duplicated `openForm(null, prefill, …)` block at 362-368 / 393-399) — same file as T026, sequence after it.
- [ ] T044 [US2] Extract a private helper in `js/calendar-overlays.js` (#22, lines 219-226 / 230-237) — same file as T031, sequence after it.

### Cluster H — Convergence + regression

- [ ] T045 [US2] For each accidental divergence converged (T005-T007 + T008 decisions), update the affected test assertions and record before/after behaviour in the PR description (FR-006).
- [ ] T046 [US2] Run the full `npm run test:ui`; iterate with `npm run test:ui:failed` until green — confirm intended behaviour preserved across all clusters.

**Checkpoint**: All "will fix" clones unified; suites green.

---

## Phase 5: User Story 3 — Tighten the jscpd ratchet baseline (Priority: P3)

**Goal**: Lock in the unification by lowering the committed baseline to measured + small headroom.

**Independent Test**: `dup-baseline.json` records `clones < 20` and `percentage ≤ 1.5`; `npm run dup:check` passes on the cleaned tree.

- [ ] T047 [US3] Run `npm run dup:report`; confirm clone count < 20 and line duplication ≤ 1.5 %; capture the measured `{clones, percentage}`.
- [ ] T048 [US3] Re-seed `dup-baseline.json` via `node scripts/dup-check.mjs --seed`, then add the small headroom (≈ +1-2 clones) — ensuring the committed value stays `< 20` and `≤ 1.5 %` (FR-008; gate stays `js/`-scoped).
- [ ] T049 [US3] Run `npm run dup:check` and confirm the ratchet passes on the cleaned tree; spot-check that exceeding the headroom would fail (FR-009).

**Checkpoint**: Baseline tightened and enforced.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T050 [P] Run `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck` — all green.
- [x] T051 [P] Run `npm run knowledge:check` — every new module (`planning-view-column-render`, `markdown`, `http`, `booking-event-map`, any date/time util) is routed.
- [x] T052 [P] Run `npm run test:coverage`; for each new pure-fn module that meets per-file thresholds (95 % lines, 75 % fns, 90 % branches), remove its entry from the `exclude` array in `tests/vitest.config.js` per the coverage-promotion rule.
- [x] T053 [P] Run `npm run oss:drift` — confirm no SBoM drift (no dependency change expected; new source files do not alter `sbom.json`).
- [x] T054 Run `npm run sqi:json` — confirm composite ≥ 80 (GREEN) and not worse than the T003 baseline.
- [x] T055 Run the full `npm run test:ui` — final behaviour-preservation confirmation.
- [x] T056 Walk through quickstart **Scenario 6** — review every non-identical unification one by one with the product owner; record decisions + before/after in the PR description.
- [ ] T057 [P] Complete the DSGVO impact checklist (`specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md`) and paste it into the PR (expected all-"No" — internal refactor).
- [x] T058 [P] Update `docs/content.en.md` + `docs/content.de.md` ONLY if any user-visible behaviour changed (e.g. a converged divergence); otherwise note "N/A — internal refactor" in the PR.
- [x] T059 Run quickstart Scenarios 1-5 (audit/baseline, planning view, chat/docs markdown, calendar/API, gates) as the final UAT.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (P1)** → no deps.
- **Foundational (P2)** → none (empty).
- **US1 (P3 audit)** → after Setup. Its divergence diffs (T005-T008) feed the corresponding US2 clusters.
- **US2 (P4)** → after US1 (needs the divergence decisions for clusters B/D/F). Clusters A/C/E/G have no divergence dependency and can start once the audit is final.
- **US3 (P5)** → after US2 substantially complete (baseline reflects unified code).
- **Polish (P6)** → after US2 + US3.

### Cross-story / file-conflict notes

- T015 (markdown) depends on T005 (divergence #1). T025 (booking mapper) depends on T006. T033/T034 (date/time) depend on T007.
- **Same-file sequencing** (NOT parallel): `chatbot.js` → T016 before T042; `calendar.js` → T026 before T043; `calendar-overlays.js` → T031 before T044; `time-entry-form-utils.js` → T034 before T041.
- Each cluster's consumer-refactor tasks depend on that cluster's create task (e.g. T011/T012 after T010; T016/T017 after T015; T021/T022 after T020; T026/T027 after T025; T031 after T030).

### Parallel opportunities

- Setup T001-T003 all [P].
- US1 divergence diffs T005-T007 all [P] (different file pairs).
- US2 test-first tasks T014, T019, T024, T029, T032 all [P] (different test files).
- US2 self-clone extractions T035-T040 all [P] (distinct files with no cluster overlap).
- Polish T050-T053, T057, T058 all [P].

---

## Implementation Strategy

### MVP (User Story 1 only)

Complete Setup → US1. The documented, finalised audit (every clone dispositioned, every
divergence decided) is a shippable deliverable on its own — it tells the team exactly what to
unify and what to keep, even before any code moves.

### Incremental delivery

1. Setup + US1 → audit done (MVP).
2. US2 cluster-by-cluster (A render orchestrator first — highest value, the Constitution VII
   case), running `test:ui:failed` after each cluster → behaviour preserved.
3. US3 → re-seed baseline, gate green.
4. Polish → full gates + Scenario 6 walkthrough + UAT.

### Quality discipline

- Write each pure-fn unit test FIRST and watch it fail (Red-Green-Refactor).
- Never weaken sanitisation (VR-4) or the Redmine header path (VR-5).
- Never re-seed the baseline without genuine unification (Constitution VI/VII anti-gaming).
- Commit after each task/cluster referencing the task ID.

---

## Notes

- [P] = different files, no incomplete-task dependency.
- 59 tasks: Setup 3 · Foundational 0 · US1 6 · US2 37 · US3 3 · Polish 10.
- Each user story is independently testable; US1 alone is a complete deliverable.
- The new shared modules _remove_ LOC from large files (`chatbot.js`, the planning-view pair),
  lowering max module size rather than raising it.
