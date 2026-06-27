# Tasks: Unified Tooltips + Full-Text Event Hover

**Feature**: 053-unified-tooltips · **Branch**: `053-unified-tooltips`
**Input**: [`plan.md`](./plan.md), [`spec.md`](./spec.md), [`research.md`](./research.md), [`data-model.md`](./data-model.md), [`contracts/tooltip-api.md`](./contracts/tooltip-api.md), [`quickstart.md`](./quickstart.md)

**Tests**: Included — the project enforces Test-First (Constitution III) and a coverage gate. Node + jsdom unit tests are written before the implementation they cover; Playwright/axe verify integration + a11y.

**Conventions**: `[P]` = parallelizable (different file, no incomplete dependency). Story labels `[US1]`/`[US2]`/`[US3]` map to the spec's user stories. Setup/Foundational/Polish carry no story label.

---

## Phase 1: Setup

- [ ] T001 Audit existing tooltip i18n keys and add any missing user-visible tooltip strings to `js/i18n/en.js` and `js/i18n/de.js` (most labels already exist — `docs.open_btn`, `chatbot.open_btn`, `calendar.*`, `modal.add_favourite`, etc.; the event tooltip reuses existing subject/project/time formatting). Do not introduce hardcoded strings later.

---

## Phase 2: Foundational (blocks US1 and US2)

**Goal**: One shared tooltip mechanism, extended (not forked) per Constitution VII. Everything below is a prerequisite for both event tooltips (US1) and label tooltips (US2).

- [ ] T002 [P] Write jsdom unit test `tests/unit/attach-tooltip.test.js` (fails first): `attachFixedTooltip` with a `string[]` renders one `.anomaly-tooltip__line` per entry and adds `--multiline`; sets `role="tooltip"` + trigger `aria-describedby`; shows on `focusin`, hides + removes node on `focusout`; `attachLabelTooltip` removes the trigger's native `title` and wires hover+focus.
- [ ] T003 Extend `attachFixedTooltip(trigger, text, tooltipId)` in `js/anomaly-render.js` to accept `string | string[]`: array ⇒ one child line element per entry (set via `textContent`) + `anomaly-tooltip--multiline` class; string path unchanged (backward compatible). See [`contracts/tooltip-api.md`](./contracts/tooltip-api.md).
- [ ] T004 Add `attachLabelTooltip(trigger, text, tooltipId?)` to `js/anomaly-render.js`: generate an id when omitted, remove any native `title` on the trigger, delegate to `attachFixedTooltip` (single-line), guarantee `aria-describedby`; no-op on empty `text`.
- [ ] T005 [P] Add `.anomaly-tooltip--multiline` + `.anomaly-tooltip__line` rules to `css/calendar-overlays.css` (design tokens only — no raw literals; respect the strict-value gate), keeping the existing dark tooltip surface in light + dark themes.

**Checkpoint**: tooltip primitive supports multi-line + label use, jsdom tests green.

---

## Phase 3: User Story 1 — Full-text tooltip on calendar & planning events (Priority: P1) 🎯 MVP

**Goal**: Hovering/focusing any calendar or planning event (booking, Outlook, Teams) shows one tooltip with the complete event text.

**Independent test**: Hover + keyboard-focus a short 15-min booking in the calendar and an event in the planning view; confirm issue, project, time range + duration, and comment all appear and that absent fields are omitted (quickstart Scenarios 1–2).

- [ ] T006 [P] [US1] Write node unit test `tests/unit/event-tooltip.test.js` (fails first) for `buildEventTooltipText(fields, t)`: ordered lines `[issue, project?, time?, comment?]`; omit project/time/comment when absent; issue line uses localized fallback when subject null; deterministic; injected `t`.
- [ ] T007 [US1] Create pure leaf `js/event-tooltip.js` exporting `buildEventTooltipText(fields, t)` per [`data-model.md`](./data-model.md) + [`contracts/tooltip-api.md`](./contracts/tooltip-api.md); reuse `formatProject` + `formatDuration`; no DOM, no module-level i18n.
- [ ] T008 [US1] Register `js/event-tooltip.js` in `js/knowledge.topics.json` (a relevant topic) so `npm run knowledge:check` passes; confirm `js/event-tooltip.js` reaches per-file coverage thresholds and is NOT on the `tests/vitest.config.js` exclude list.
- [ ] T009 [US1] In `js/calendar-overlays.js` event mount (`eventDidMount`), attach `attachFixedTooltip(info.el, buildEventTooltipText(adaptEntry(entry), t), id)` and REMOVE the per-row native `issueDiv.title` / `projDiv.title` (lines ~457, ~476); ensure teardown on `eventWillUnmount`.
- [ ] T010 [US1] In `js/planning-view-column-base.js` event mount, attach the same full-text tooltip for bookings + Outlook/Teams cards via a small `fields` adapter; ensure it is not clipped by the scrollable column (uses the portaled `--fixed` variant).
- [ ] T011 [P] [US1] Add Playwright test `tests/ui/tooltips.spec.js`: hover AND keyboard-focus a calendar event and a planning event → full-text tooltip visible with all populated lines; event without a comment omits the comment line; tooltip hides on mouseleave/blur.

**Checkpoint**: US1 independently demoable — short clipped events reveal full content on hover/focus.

---

## Phase 4: User Story 2 — One consistent tooltip style app-wide (Priority: P2)

**Goal**: Every targeted native `title` tooltip is replaced by the custom style; no native browser tooltips remain on those controls.

**Independent test**: Hover header buttons, toolbar controls, feedback button, booking-modal star/rows, settings hints → all show the custom style; none triggers a native tooltip (quickstart Scenario 3).

- [ ] T012 [US2] Migrate header settings/help/chat buttons in `js/page-init.js` (lines ~7/15/20) to `attachLabelTooltip`; remove `.title =` assignments.
- [ ] T013 [P] [US2] Migrate calendar toolbar buttons in `js/calendar-toolbar.js` (overflow indicator, working-hours hint, refresh, prev/next day) to `attachLabelTooltip`.
- [ ] T014 [P] [US2] Migrate the feedback button in `js/feedback.js` (line ~526) to `attachLabelTooltip`.
- [ ] T015 [P] [US2] Migrate the docs-help button in `js/settings-page.js` (line ~30) to `attachLabelTooltip`.
- [ ] T016 [P] [US2] Migrate booking-modal ticket/project rows + favourite star in `js/time-entry-form.js` (~129/133) and `js/time-entry-form-view.js` (~184/214/220/232) to `attachLabelTooltip`.
- [ ] T017 [US2] Remove the static `title=""` from the settings-link in `index.html` (line 49) — the tooltip is now attached in JS via `attachLabelTooltip`; keep `aria-label`.
- [ ] T018 [P] [US2] Extend `tests/ui/tooltips.spec.js`: assert the targeted controls have NO `title` attribute after init and show the custom tooltip on hover; verify light + dark style parity.

**Checkpoint**: US2 independently verifiable — single consistent tooltip style, zero native tooltips on targeted controls.

---

## Phase 5: User Story 3 — Keyboard + screen-reader accessibility (Priority: P2)

**Goal**: Every migrated tooltip is reachable by keyboard and exposed to assistive tech with no new axe violations.

**Independent test**: Tab to each trigger → tooltip shows on focus, hides on blur, and the trigger exposes the tooltip text as an accessible description; axe matrix clean (quickstart Scenario 5).

- [ ] T019 [US3] Review all migrated sites for name/description correctness: icon buttons keep their `aria-label` (name), tooltip provides `aria-describedby` (description), native `title` removed — no triple-announce (per [`research.md`](./research.md) R6).
- [ ] T020 [P] [US3] Extend `tests/ui/tooltips.spec.js` with the existing 7-surface × 2-theme axe scans (`@axe-core/playwright`) asserting zero new violations, plus a keyboard-focus-reveals-tooltip assertion.

**Checkpoint**: a11y parity proven; US3 complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T021 Update `docs/content.en.md` and `docs/content.de.md` to mention the full-text event tooltip (user-facing behavior change); skip only if deemed purely internal.
- [ ] T022 [P] Complete the DSGVO impact checklist (`specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md`) — all five triggers "No" (no new data/consent/recipient/retention); paste the completed block into the PR description.
- [ ] T023 Run the full local pipeline and fix any failures: `npm run lint` (eslint + stylelint), `npm run typecheck`, `npm run knowledge:check`, `npm run dup:check`, `npm run test:coverage`, `npm run sqi` (composite ≥ 80), `npm run test:ui` (Playwright + axe).
- [ ] T024 Run the full `quickstart.md` acceptance checklist manually (Scenarios 1–7) via `/speckit-uat-run` and record results.

---

## Dependencies & Execution Order

```
Phase 1 (Setup: T001)
   ↓
Phase 2 (Foundational: T002 → T003 → T004; T005 ∥) ── blocks everything below
   ↓
Phase 3 (US1: T006 → T007 → T008 → T009 → T010; T011 ∥)   ┐
Phase 4 (US2: T012 → T013/T014/T015/T016 ∥ → T017; T018 ∥) ├ US1 & US2 independent after Foundational
   ↓
Phase 5 (US3: T019 → T020)  ── verifies tooltips from US1 + US2
   ↓
Phase 6 (Polish: T021, T022 ∥, T023, T024)
```

- **US1 and US2 are independent** after Phase 2 and may proceed in parallel (different files).
- **US3** depends on US1 + US2 being wired (it audits/scans their output).
- Within a story, test task precedes the implementation it covers (Test-First).

## Parallel Execution Examples

- After Phase 2: run **T011** (US1 Playwright) authoring alongside **T013/T014/T015/T016** (US2 migrations) — different files.
- Foundational: **T002** (test) and **T005** (CSS) are `[P]` with each other; T003/T004 edit the same file (`anomaly-render.js`) so they are sequential.

## Implementation Strategy

- **MVP = User Story 1** (T001–T011): full-text event hover — the core value. Shippable on its own.
- **Increment 2 = User Story 2** (T012–T018): app-wide style unification.
- **Increment 3 = User Story 3** (T019–T020): a11y verification.
- **Finish**: Polish (T021–T024) before UAT/PR-ready.

**Total tasks**: 24 — Setup 1 · Foundational 4 · US1 6 · US2 7 · US3 2 · Polish 4.
