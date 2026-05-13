---
description: 'Task list for feature 031 — Fluent 2 UI Redesign with Corporate Identity'
---

# Tasks: Fluent 2 UI Redesign with Corporate Identity

**Input**: Design documents from `specs/031-fluent2-ui-redesign/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/README.md ✅ · quickstart.md ✅
**Hard prerequisite**: feature 030 must be merged (or at minimum, its frozen contract must be honoured by the working tree this feature is based on).

**Tests**: Every implementation task includes its own unit and/or UI tests. TDD per Constitution Principle III. For visual changes, "test-first" means establishing the visual baseline before re-skinning.

**Organization**: tasks are grouped by user story. Three stories: US1 (P1, Fluent 2 visual language across surfaces), US2 (P2, CI overlay), US3 (P3, light + dark variants aligned with the design system — inherits 030).

## Format: `[ID] [P?] [Story?] Description with file path`

## Path Conventions

Single-project static SPA. New code in `js/`; tests in `tests/unit/` and `tests/ui/`. Styles in `css/style.css`. i18n in `js/i18n.js`. HTML in `index.html`, `settings.html`. Admin schema in `config.json`.

---

## Phase 1: Setup

- [x] T001 [P] Create empty stub `js/branding.js` exporting `applyCorporateIdentity`, `isValidCi` placeholders.
- [x] T002 [P] Create empty test files: `tests/unit/branding.test.js`, `tests/ui/visual.spec.js`.
- [x] T003 [P] Add an empty `<img class="brand-logo" alt="" hidden>` element inside the existing `.app-header` of both `index.html` and `settings.html`. (No-op until US2 sets `src`.)
- [x] T004 [P] Verify feature 030 is merged: `git log origin/main --oneline | grep -E '030|dark.mode'` should show 030's commits. If not merged, STOP and wait for 030.

---

## Phase 2: Foundational

**Purpose**: Fluent 2 token layer + 030 token re-binding. This sets up the design-system base that all stories use.

- [x] T005 Add Fluent 2 token block to `css/style.css` `:root` per research.md §R1: neutrals (foreground 1/2, background 1–5, stroke 1/2), semantic (`--brand-primary`, `--accent`, `--success`, `--warning`, `--danger`), type scale (`--font-base-size` etc.), spacing scale (`--space-1` through `--space-8`), radii (`--radius-small/medium/large`), elevations (`--shadow-2/4/8`), motion (`--duration-fast/normal/slow`, `--curve-decelerate-mid`).
- [x] T006 Add `:root[data-theme="dark"]` overrides for the dark Fluent 2 neutral ramp + semantic colors. (Light values stay in `:root`.)
- [x] T007 Re-bind 030's 10 baseline tokens (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-muted`, `--color-primary`, `--color-danger`, `--color-success`, `--color-unknown-bg`, `--color-unknown-bd`) to point at Fluent tokens (per research.md §R1 mapping table). Token names stay UNCHANGED — 030's contract is preserved.
- [x] T008 Run the existing Vitest + Playwright suites against the new token bindings. Expected: full pass — no surface should break visually yet because every old `var(--color-x)` reference still resolves to a real value.

**Checkpoint**: design-system base is in place. 030's contract intact. Ready for the per-surface Fluent re-skin.

---

## Phase 3: User Story 1 — Consistent Fluent 2 visual language across all surfaces (Priority: P1) 🎯 MVP

**Goal**: every surface uses Fluent 2 spacing/type/elevation/motion + the Fluent neutral palette.

**Independent Test**: visual baselines for ≥ 12 surfaces in light + dark, CI empty, look like Fluent 2 (cross-checked against the published Fluent 2 reference). quickstart.md S1–S5.

### Visual baseline first (test-first for visual changes)

- [x] T009 [US1] In `tests/ui/visual.spec.js` set up a Playwright project with `toHaveScreenshot()` assertions and `maxDiffPixelRatio: 0.02`. Add scenarios for the 12 baseline surfaces × {light, dark} × {CI-empty} = 24 baselines. (CI-set baselines come in US2.) Capture initial baselines (these are the "old" UI; they will fail when the re-skin lands and need to be updated — the failure is expected and signals the re-skin worked).

### Re-skin per surface

- [x] T010 [US1] Audit `css/style.css` line by line; replace bespoke spacing values with `var(--space-N)`, bespoke type sizes with `var(--font-X)`, bespoke radii with `var(--radius-X)`, bespoke shadows with `var(--shadow-X)`. Hard-coded color literals already migrated in 030 (T009/T010 of 030's tasks); double-check coverage.
- [x] T011 [US1] Re-skin the calendar header (`.app-header`) on Fluent 2: spacing rhythm, type scale, neutral background, subtle elevation.
- [x] T012 [US1] Re-skin time-entry blocks (`.fc-event`) on Fluent 2: corner radius, type, padding, subtle shadow on hover.
- [x] T013 [US1] Re-skin the Settings form on Fluent 2: input fields, labels, buttons, fieldsets.
- [x] T014 [US1] Re-skin modals (entry form, confirmation dialogs): elevation, neutral background, header type scale.
- [x] T015 [US1] Re-skin the chatbot panel: panel chrome, message bubbles, input.
- [x] T016 [US1] Re-skin the docs panel and any tooltip / popover surfaces.
- [x] T017 [US1] Re-skin banners (ArbZG warning, error, info): background, border, corner radius, type.
- [x] T018 [US1] Verify FullCalendar variables render correctly with the new Fluent tokens (research.md §R5). Adjust the FC variable bindings under `:root` and `:root[data-theme="dark"]` if needed.

### Re-baseline

- [x] T019 [US1] Re-run `npx playwright test tests/ui/visual.spec.js --update-snapshots` to capture the NEW baselines. Reviewer eyeballs each new screenshot for Fluent 2 alignment + contrast (SC-003 in spirit). The diff against the old baselines is the visible change of the feature.

### Mobile parity

- [x] T020 [US1] Verify the mobile layout (`< 768 px`) re-skins identically. Add at least one mobile baseline (S5).
- [x] T021 [US1] Run `npx playwright test tests/ui/visual.spec.js` — Green.

**Checkpoint US1**: Fluent 2 visual language consistent across all surfaces in both themes.

---

## Phase 4: User Story 2 — Corporate-identity overlay (Priority: P2)

**Goal**: admin-set CI block in `config.json` overlays brand primary/accent/logo/font on top of the design system.

**Independent Test**: with `config-full-ci.json`, primary buttons are the brand color; logo visible; brand font applied. With `config-empty-ci.json`, design-system defaults are used. quickstart.md S6–S10.

### TDD: pure helper

- [x] T022 [US2] In `tests/unit/branding.test.js` write Vitest cases for `applyCorporateIdentity(rootEl, ci)`:
  - Valid hex `brandPrimary` → sets `--ci-primary` on rootEl.
  - Invalid hex (`'red'`, `'#zzz'`, `'12345'`) → does NOT set; logs ONE warning.
  - Valid `brandAccent` → sets `--ci-accent`.
  - Valid `brandLogoUrl` (https) → updates `.brand-logo` `src` and clears `hidden`.
  - Invalid logo URL (`'http://...'`, `'javascript:...'`, `'data:...'`) → logo stays hidden.
  - Valid `brandFontFamily` → sets `--ci-font-family`.
  - Invalid font (empty, > 200 chars, contains `}`) → does NOT set.
  - Empty `ci` object → all `--ci-*` cleared, logo hidden (idempotent reset).
  - Idempotent: applying the same ci twice yields the same DOM state.
  - `isValidCi({})` → false; `isValidCi({brandPrimary: '#fff'})` → true; `isValidCi({brandPrimary: 'foo'})` → false (no valid fields).
  - Mixed: one valid + one invalid field → only the valid one is applied; one warning logged.
- [x] T023 [US2] Run `npx vitest run tests/unit/branding.test.js` — Red.
- [x] T024 [US2] Implement `applyCorporateIdentity` and `isValidCi` in `js/branding.js` per data-model.md and research.md §R4. Pure helpers; validation regexes; one warning per invalid field.
- [x] T025 [US2] Run vitest — Green.

### CSS overlay hooks

- [x] T026 [US2] In `css/style.css`, change every primary-action rule (`button.primary`, `.btn-confirm`, etc.) to use the fallback pattern: `background: var(--ci-primary, var(--brand-primary))`. Same for accent rules. Same for `body { font-family: var(--ci-font-family, var(--font-base-family)) }`.

### HTML wiring

- [x] T027 [US2] In `index.html` and `settings.html`, after the existing config-load logic resolves, call `applyCorporateIdentity(document.documentElement, cfg)`. (Place AFTER 030's theme-bootstrap script — the theme script runs before paint; CI applies after config fetch, which is acceptable per the spec since the CI overlay is admin-controlled and admins can use a small inline script if first-paint CI is critical. Document this in the open question carry-over.)

### i18n

- [x] T028 [US2] Add the `branding.logoAlt` key (EN + DE) to `js/i18n.js`. Default empty strings (decorative).

### Visual baselines

- [x] T029 [US2] Extend `tests/ui/visual.spec.js` with CI-set scenarios using a fixture `config-full-ci.json` that injects via Playwright route interception. Capture 12 surfaces × 2 themes × CI-set baselines (24 more screenshots, total 48).
- [x] T030 [US2] Run `npx playwright test tests/ui/visual.spec.js` — Green.

**Checkpoint US2**: CI overlay applied; validation works; visual baselines cover all four states.

---

## Phase 5: User Story 3 — Light + Dark variants aligned with the design system (Priority: P3)

**Goal**: 030's toggle drives both light and dark variants of the new Fluent 2 + CI design. No second toggle anywhere.

**Independent Test**: toggling theme on Settings re-styles every surface to the dark Fluent 2 variant; CI colors stay constant; quickstart.md S11–S14.

- [x] T031 [US3] Verify `<html data-theme="dark">` flows through every Fluent 2 token (the dark overrides from T006 already do this for the new tokens; T007 preserves 030's old tokens).
- [x] T032 [US3] Verify CI colors do NOT flip on theme change (CI is theme-independent — `--ci-primary` lives outside the `[data-theme="dark"]` block). Add a Playwright assertion that a button's computed background is the same hex in both themes when CI is set.
- [x] T033 [US3] Verify Settings still has exactly ONE theme toggle (the one from 030). Inspect with `page.locator('input[name="theme"]').count()` — should equal 1 fieldset (2 radio inputs).
- [x] T034 [US3] Verify the calendar toolbar contains NO theme controls (SC-006 holds for 031 too).
- [x] T035 [US3] Verify no-flash on first paint (S13) still holds with CI applied — 030's bootstrap script runs before paint; CI applies after config fetch but the design-system default is correct so first paint is never broken.
- [x] T036 [US3] Run the Playwright visual suite again — Green in both themes.

**Checkpoint US3**: theme inherited cleanly from 030; no second toggle; CI is theme-independent; no-flash preserved.

---

## Phase 6: Polish & Cross-Cutting

- [x] T037 [P] Run full Vitest suite (`npx vitest`) — no regressions in any other module's tests.
- [x] T038 [P] Run full Playwright suite (`npx playwright test`) — no regressions in functional tests (entry CRUD, copy-paste, working-hours toggle, ArbZG, AI assistant, Outlook import). SC-007 invariant.
- [x] T039 [P] Manually walk every quickstart scenario S1–S18 on desktop (Chrome, Firefox, Safari) and on mobile-emulation (`< 768 px`); zero console errors.
- [x] T040 [P] Visual review of all 48 baselines for contrast and Fluent 2 alignment.
- [x] T041 [P] Verify SC-002 / Constitution II timing budgets are unchanged: time the calendar render, theme toggle, and entry-form open in the new skin.
- [x] T042 [P] Verify `js/theme.js` is unchanged from 030 (no edits sneaked in).
- [x] T043 Update sample `config.json` in the repo (or its documentation) with the four new optional CI fields.
- [x] T044 Resolve open question 1 (exact Fluent tokens adopted): commit the final list as research.md §R1 update if it diverged.
- [x] T045 Resolve open question 4 (visual-baseline OS variance): document tolerance settings used, any per-OS baseline directories.
- [x] T046 Update BACKLOG.md row for 031: `plan ✅`, `tasks ✅`, status `tasks done — ready for implement (after 030)`.

---

## Dependencies

- T001/T002/T003/T004 [P]: parallel.
- T004 is a hard gate: do NOT start Phase 2 if 030 is not merged.
- Phase 2 (T005–T008) is sequential and foundational.
- US1 (Phase 3) depends on Phase 2.
- US2 (Phase 4) depends on Phase 2 + the CSS overlay hooks (T026 specifically depends on Fluent tokens being defined).
- US3 (Phase 5) depends on US1 + US2 (it verifies the integration of both with 030's theming).
- Polish (Phase 6) runs after all three stories are green.

## Parallel Execution Opportunities

- **Setup [P]**: T001/T002/T003.
- **Per-surface re-skin (T011–T017)**: can be parallelized across implementers because each surface targets a different CSS selector group; merge conflicts only on `style.css` line ordering.
- **Polish [P]**: T037/T038/T039/T040/T041/T042 fully parallel.

## Implementation Strategy

- **MVP scope** = US1 (Fluent 2 visual language). Ship US1 alone if scope tightens — the app then looks like a default-Fluent 2 app with no CI overlay (which is the spec's "neutral default" fallback).
- **Incremental commits**:
  - (a) scaffolds + Phase 2 token layer (T001–T008)
  - (b) per-surface re-skin batches (T010–T018)
  - (c) visual baselines re-captured (T019–T021)
  - (d) US2 branding helper TDD + CSS hooks + HTML wiring (T022–T030)
  - (e) US3 verification (T031–T036)
  - (f) Polish (T037–T046)

## Format Validation

All 46 tasks above use the canonical `- [ ] Tnnn [P?] [Story?] description with file path` checklist format. Setup/Foundational/Polish tasks have no story label; Phase-3 tasks carry `[US1]`; Phase-4 tasks carry `[US2]`; Phase-5 tasks carry `[US3]`.

## Open Questions Carry-Over

The 5 open questions in plan.md are partly resolved by these tasks:

- Q1 (exact Fluent tokens) → T044.
- Q2 (partial-CI fallback) → covered by T022 unit tests; resolved as "independent per field".
- Q3 (font loading) → resolved as "admin's responsibility"; documented in contracts/README.md.
- Q4 (visual baseline OS variance) → T045.
- Q5 (process note) → not a functional concern; tasks remain tooling-agnostic.

## Notes for reviewers

- This feature has the largest CSS surface in the repo. PR review should focus on: (a) the variable-fallback pattern is consistent (`var(--ci-x, var(--brand-x))`), (b) 030's contract is intact (no renamed tokens, same DOM signal), (c) visual baselines look right.
- The "CSS rewrite" commits are intentionally large; line-by-line review is less useful than the visual-baseline diff.
