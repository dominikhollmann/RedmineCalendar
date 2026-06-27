---
description: 'Task list — Feature 052: route typography, radii & modal elevation through design tokens'
---

# Tasks: Route typography, radii, and modal elevation through design tokens

**Input**: Design documents from `specs/052-fluent2-token-migration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: This is a CSS/tooling change with no new business logic. The _enforcement gate itself_ is the testable artifact (red→green); existing Playwright + axe suites guard behavioral/a11y regressions. No new Vitest unit suite is required (Constitution III, as adapted in plan.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 typography · US2 radius · US3 elevation · US4 spacing · US5 enforcement gate

**Critical sequencing**: US5 (enable the gate) MUST be last — enabling the strict-value rule before US1–US4 cleanup turns CI red. Adding tokens (Foundational) MUST precede all cleanup. Within cleanup, run `npx stylelint 'css/**/*.css' --config <(...)` ad hoc to list a category's offenders, but the rule is only committed in US5.

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Install `stylelint-declaration-strict-value` as a devDependency (`npm install -D stylelint-declaration-strict-value`) and register it in the `plugins` array of `.stylelintrc.json` (do NOT add the rule yet — that lands in US5 so the build stays green during cleanup).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the new tokens every cleanup story will reference, and protect the token-definition blocks. **No cleanup story may begin until this phase is complete.**

- [x] T002 [P] Add caption type tokens to the `:root` block in `css/base.css`: `--font-caption-size: 12px` / `--font-caption-line-height: 16px` and `--font-caption-small-size: 10px` / `--font-caption-small-line-height: 14px` (per contracts/design-tokens.contract.md).
- [x] T003 [P] Add radius tokens to the `:root` block in `css/base.css`: `--radius-xlarge: 12px` and `--radius-circular: 9999px`.
- [x] T004 Add elevation tokens to `css/base.css`: `--shadow-16: 0 8px 16px rgb(0 0 0 / 14%)` and `--shadow-28: 0 14px 28px rgb(0 0 0 / 14%)` in light `:root`, plus matching `/ 50%` overrides in the dark-theme block (alongside the existing `--shadow-2/4/8` overrides).
- [x] T005 Wrap the light + dark `:root` token-definition blocks in `css/base.css` with a block-level `/* stylelint-disable scale-unlimited/declaration-strict-value */ … /* stylelint-enable */` region so token _definitions_ are never flagged while use sites are (mirrors the existing `color-no-hex` disable pattern).

**Checkpoint**: All new tokens exist and are theme-correct. Cleanup stories can now begin.

---

## Phase 3: User Story 1 — Typography on the type scale (Priority: P1) 🎯 MVP

**Goal**: Every component `font-size` resolves from a `--font-*-size` token (incl. new caption tokens) or a documented exception.

**Independent Test**: `npx stylelint` with only `font-size` gated reports zero violations; manual walkthrough confirms text sizes look unchanged across surfaces × themes × density.

Use the px-snap mapping table in data-model.md §2 for every literal. Add the matching `line-height` token where the rule sets one.

- [x] T006 [P] [US1] Migrate all `font-size` literals in `css/base.css` (9 sites) to type-scale tokens.
- [x] T007 [P] [US1] Migrate all `font-size` literals in `css/calendar.css` (24 sites; dense event meta → `--font-caption-small-size`/`--font-caption-size`).
- [x] T008 [P] [US1] Migrate all `font-size` literals in `css/calendar-overlays.css` (4 sites).
- [x] T009 [P] [US1] Migrate all `font-size` literals in `css/docs.css` (23 sites).
- [x] T010 [P] [US1] Migrate all `font-size` literals in `css/time-entry.css` (26 sites).
- [x] T011 [P] [US1] Migrate all `font-size` literals in `css/settings.css` (30 sites).
- [x] T012 [P] [US1] Migrate all `font-size` literals in `css/feedback.css` (14 sites).
- [x] T013 [P] [US1] Migrate all `font-size` literals in `css/planning-view.css` (5 sites).

**Checkpoint**: Typography fully tokenized.

---

## Phase 4: User Story 2 — Corner roundings on the radius scale (Priority: P2)

**Goal**: Every `border-radius` resolves from a `--radius-*` token (per data-model.md §3).

**Independent Test**: switch track + pill button render fully rounded; sheet keeps its larger corner; docs corners unchanged.

- [x] T014 [US2] In `css/calendar.css`, change the working-hours switch track `border-radius: 10px` → `var(--radius-circular)`.
- [x] T015 [US2] In `css/docs.css`, change both `border-radius: 3px` (lines ~166, ~316) → `var(--radius-medium)`.
- [x] T016 [US2] Change the pill-button `border-radius: 2rem` → `var(--radius-circular)` and the bottom-sheet `border-radius: 12px 12px 0 0` → `var(--radius-xlarge) var(--radius-xlarge) 0 0` in their stylesheets (feedback button / mobile sheet — confirm exact file via `grep`).

**Checkpoint**: All radii tokenized.

---

## Phase 5: User Story 3 — Modal/panel elevation on the shadow ramp (Priority: P2)

**Goal**: Every raised-surface `box-shadow` resolves from a `--shadow-*` token (per data-model.md §4); focus-ring outlines annotated as exceptions.

**Independent Test**: open each modal/panel in both themes — elevation reads the same and switches correctly on theme toggle.

- [x] T017 [P] [US3] Migrate `box-shadow` in `css/time-entry.css` (`0 8px 32px …` ×3 → `var(--shadow-28)`); annotate the `0 0 0 2px …` focus rings (lines ~235, ~527, ~532) with an inline strict-value disable + "focus ring, not elevation" rationale.
- [x] T018 [P] [US3] Migrate `box-shadow` in `css/feedback.css` (`0 8px 32px …` → `var(--shadow-28)`).
- [x] T019 [P] [US3] Migrate `box-shadow` in `css/planning-view.css` (`0 4px 12px …` → `var(--shadow-16)`).
- [x] T020 [P] [US3] Migrate `box-shadow` in `css/calendar-overlays.css` (`0 2px 8px …` → `var(--shadow-8)`, `0 2px 6px …` → `var(--shadow-4)`).
- [x] T021 [P] [US3] Migrate `box-shadow` in `css/docs.css` (`-4px 0 16px …` side panel → `var(--shadow-16)`; annotate the `0 0 0 6px transparent` focus ring as an exception).

**Checkpoint**: All elevations tokenized; focus rings annotated.

---

## Phase 6: User Story 4 — Spacing on the spacing scale (Priority: P3)

**Goal**: Every `padding`/`margin`/`gap` resolves from `--space-*` (Band A exact / Band B snap) or a documented Band-C exception (per data-model.md §6, research D6).

**Independent Test**: layout rhythm unchanged; dense calendar event padding not bloated (Band-C kept sub-token).

- [x] T022 [P] [US4] Migrate spacing in `css/base.css` (Band A/B → `--space-*`; `0`/`auto` untouched).
- [x] T023 [P] [US4] Migrate spacing in `css/calendar.css`; annotate Band-C 1–3px dense micro-padding (`2px 4px`, `1px 3px 0`, `gap: 0.1rem`, etc.) with inline strict-value disable + "dense calendar chrome — sub-token by design".
- [x] T024 [P] [US4] Migrate spacing in `css/calendar-overlays.css` (incl. `margin-left: 4px` → `--space-1`, `margin-right: 3px` → Band-C exception or `--space-1` per nearest; `6px 10px` → `--space-2 --space-3`).
- [x] T025 [P] [US4] Migrate spacing in `css/docs.css`.
- [x] T026 [P] [US4] Migrate spacing in `css/time-entry.css`.
- [x] T027 [P] [US4] Migrate spacing in `css/settings.css`.
- [x] T028 [P] [US4] Migrate spacing in `css/feedback.css`.
- [x] T029 [P] [US4] Migrate spacing in `css/planning-view.css`.

**Checkpoint**: All spacing tokenized or annotated.

---

## Phase 7: User Story 5 — Enforce token usage (Priority: P1, runs LAST) 🔒

**Goal**: The strict-value gate is enabled and the full `css/**` tree is green; future raw literals fail CI.

**Independent Test**: re-introducing a raw literal for each gated property turns `npm run lint` red; removing it returns green (quickstart Scenario 2).

- [x] T030 [US5] Migrate the remaining `transition`-timing literals (`opacity 0.3s` → `var(--duration-slow)`, `0.15s` → `var(--duration-fast)`, etc.) in `css/base.css`, `css/calendar.css`, `css/docs.css`, and any other use sites (per data-model.md §5).
- [x] T031 [US5] Add the `scale-unlimited/declaration-strict-value` rule to `.stylelintrc.json` exactly as specified in contracts/stylelint-rule.contract.md (property list incl. spacing, `ignoreValues`, `ignoreFunctions`, `disableFix`, message).
- [x] T032 [US5] Run `npm run lint`; resolve any remaining offenders surfaced (either tokenize or add a justified escape-hatch annotation) until it is fully green.
- [x] T033 [US5] Red→green proof: temporarily insert a raw literal for each gated category (font-size, border-radius, box-shadow, transition, padding), confirm `npm run lint` fails each time, revert; confirm green. (Maps to quickstart Scenario 2.)

**Checkpoint**: Gate active and green; regressions blocked.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T034 Regenerate OSS artifacts: `npm run oss:generate`; confirm `sbom.json` includes `stylelint-declaration-strict-value`; run `npm run oss:drift` and `npm run oss:licenses` (MIT) — both pass.
- [x] T035 Run `npm run sqi` and confirm the composite stays ≥ 80 (GREEN); run `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck`.
- [x] T036 Run `npm run test:ui` (full Playwright + axe a11y matrix) — all pass (no visual/a11y regression from the token swap).
- [x] T037 Complete the manual reviewer walkthrough (quickstart Scenarios 4–5) across the 7 surfaces × 2 themes × calendar density levels; record the result. (UAT 2026-06-27: all surfaces pass; pre-existing settings planning-data table overflow fixed in `a5a36a2`.)
- [x] T038 DSGVO impact check (`specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md`): all five triggers "No" (purely visual, no data/consent/recipient change) → no `privacy.html` update; docs (`content.en/de.md`) unchanged (no user-visible behavior change). Paste the completed checklist block into the PR description.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T005)** → cleanup stories.
- **US1/US2/US3/US4 cleanup (T006–T029)**: all depend only on Foundational. Different-file tasks are `[P]`. Where two stories touch the same file (e.g. `calendar.css` appears in US1 font, US2 radius, US4 spacing), serialize those edits on that file (do not run two `calendar.css` tasks simultaneously).
- **US5 (T030–T033)**: MUST run after ALL cleanup — enabling the rule (T031) before cleanup is complete breaks CI (FR-011). T030 (transitions) is a cleanup prerequisite folded here because it has no dedicated story.
- **Polish (T034–T038)**: after US5 green.

### Parallel Opportunities

- T002, T003 in parallel (both `base.css` `:root` but distinct lines — coordinate or serialize; T004/T005 also `base.css`, serialize the `base.css` edits if done by one worker).
- US1 font tasks T006–T013 are `[P]` across 8 distinct files.
- US3 shadow tasks T017–T021 are `[P]` across distinct files.
- US4 spacing tasks T022–T029 are `[P]` across distinct files (but serialize any file also being edited by a still-open US1/US2/US3 task).

## Implementation Strategy

This feature is **atomic by design**: the gate (US5) cannot ship without the cleanup, so the deliverable is the whole set in one PR. Recommended order for a single implementer:

1. Setup + Foundational (T001–T005).
2. Cleanup file-by-file — do all five categories (font, radius, shadow, spacing, transition) for one stylesheet before moving on, to minimize re-opening files. (The story phases above are organized by _category_ for traceability; a _file-major_ execution order is equivalent and more efficient for one worker.)
3. Enable the gate (T031), drive `npm run lint` to green (T032), prove red→green (T033).
4. Polish: OSS regen, SQI, full UI suite, manual walkthrough, DSGVO check.

**MVP note**: US1 (typography) is the largest standalone-valuable slice, but a shippable PR requires US1–US5 together because the gate must land green.

## Notes

- Commit after each logical group (e.g. per file or per category), referencing the task ID.
- Use the data-model.md mapping tables as the single source of truth for every literal→token decision.
- When in doubt between two tokens (equidistant snap), favor legibility (type) / the established Fluent value, and note it for the walkthrough.
- Keep escape-hatch annotations to genuine cases (focus rings, Band-C dense padding); each carries a one-line rationale.

---

## Implementation Notes (as-built, 2026-06-27)

- **T005 (not needed)**: marked done but no change was required — the `:root` blocks define custom properties (`--font-*`, `--radius-*`, `--shadow-*`, `--space-*`), which are not the gated `font-size`/`border-radius`/`box-shadow`/spacing properties, so the strict-value rule never inspects them. No block-level disable was added.
- **Gate config refinements (US5)**: `ignoreFunctions` is a boolean (`true`) in this plugin, not a list; a `"/^[a-z][a-z-]*$/"` `ignoreValues` regex ignores bare keyword identifiers (transition-property names, easing keywords, `inset`) so the rule only catches real length/time literals; a `comment-empty-line-before` exception (`ignore: ["stylelint-commands"]`) lets inline disable comments sit above a declaration.
- **Documented exceptions (escape-hatch, with `-- rationale`)**: focus/pulse-ring `box-shadow` widths (`time-entry.css`, `docs.css`); two directional drawer-panel shadows (`docs.css`); Band-C sub-`--space-1` dense micro-padding (`calendar.css`, `docs.css`, `feedback.css`, `time-entry.css`); one comma-joined multi-value `transition` the plugin can't parse though fully tokenized (`docs.css`).
- **T032/T033**: `npm run lint` (eslint + stylelint) green; red→green proof passes for all six gated categories (font-size, border-radius, box-shadow, transition, padding, gap/margin).
- **T034**: `sbom.json` regenerated (562 components incl. `stylelint-declaration-strict-value`); `attributions.json` unchanged (dev-only dep → not in the runtime projection); `oss:drift` + `oss:licenses` (MIT) pass.
- **T035**: SQI composite **96.44 GREEN**; htmlhint, typecheck, knowledge:check, dup:check, format:check all pass.
- **T036**: full Playwright + axe suite — **196 passed**, 7 failed. The 7 failures are all in `planning-view-teams.spec.js` and reproduce **identically on the baseline (pre-migration) CSS** (a sandbox Teams-Graph-mock/browser timing issue, unrelated to this change). The token migration introduces zero new failures; GitHub CI runs the suite in the pinned browser.
- **T037 (open — UAT)**: the manual reviewer visual walkthrough (quickstart Scenarios 4–5) is a human step for `/speckit-uat-run`.
- **T038 (DSGVO)**: all five trigger questions are **No** — no new data collected, no changed legal basis, no new recipient, no changed retention, no new consent. Purely visual/CSS-token change. No `privacy.html` or data-inventory update required; `docs/content.{en,de}.md` unchanged (no user-visible behavior change).
