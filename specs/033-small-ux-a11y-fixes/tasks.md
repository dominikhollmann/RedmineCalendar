---
description: 'Task list for feature 033 — Small UX & Accessibility Fixes'
---

# Tasks: Small UX & Accessibility Fixes

**Input**: Design documents from `/specs/033-small-ux-a11y-fixes/`
**Prerequisites**: [`spec.md`](spec.md), [`plan.md`](plan.md), [`research.md`](research.md), [`data-model.md`](data-model.md), [`contracts/a11y-contract.md`](contracts/a11y-contract.md), [`quickstart.md`](quickstart.md)

**Tests**: Every implementation task that adds or changes behavior includes its own Vitest unit and/or Playwright UI test in the same task. There is no separate "tests" phase — a task is not done until its tests exist and pass.

**Organization**: Tasks are grouped by user story. Stories US1, US2, US3 are surgical (1–4 tasks each). Story US4 is the bulk of the feature (audit + per-surface remediation across 7 surfaces × 2 themes) and is sub-phased internally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks (different files, no incomplete dependencies between them)
- **[Story]**: User story label (US1, US2, US3, US4) — present for user-story phase tasks only
- File paths in every task are absolute-relative to the repo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new shared infrastructure is needed — this feature edits an existing static SPA. The only shared addition (`@axe-core/playwright`) is story-specific and lives under US4.

_No tasks in this phase._

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None. All four user stories are independently implementable; the only inter-story file overlaps (US1↔US4 in `js/time-entry-form.js`, US3↔US4 in `settings.html`) are handled by sequencing tasks within US4's per-surface remediation phase rather than by a foundational phase.

_No tasks in this phase._

**Checkpoint**: Foundation is the existing codebase — user-story phases can start immediately, in priority order or in parallel.

---

## Phase 3: User Story 1 — Time-entry modal no longer closes on outside click (Priority: P1) 🎯 MVP

**Goal**: Remove the document-level outside-click handler that currently dismisses the time-entry modal. Escape, the X close button, and Cancel remain the only close paths. A drag that starts inside the modal and ends outside it must not be treated as an outside-click.

**Independent Test**: Open the time-entry modal, type partial input, click anywhere on the dim backdrop — modal stays open, input intact. Escape and X still close. See [`quickstart.md`](quickstart.md) § Story 1.

- [x] T001 [US1] Add Playwright UI test cases to `tests/ui/modal.spec.js` (create the file if it does not exist): (a) open modal → type into issue search → click on `.lean-overlay` backdrop → assert `.lean-modal` is still visible AND the search input retains the typed text; (b) open modal → press `Escape` → assert modal hidden; (c) open modal → click the modal's close (X) button → assert modal hidden; (d) open modal → mousedown inside `.lean-card` → mouse-move to `(10,10)` → mouseup outside → assert modal still visible. Run `npm run test:ui -- modal.spec.js` and confirm case (a) and case (d) currently FAIL (red).
- [x] T002 [US1] In `js/time-entry-form.js`, delete the outside-click handler: remove the `let _outsideClickHandler = null;` declaration at line 35; remove the two cleanup blocks at lines 787–790 and 801–804 (the `removeEventListener` calls in `closeModal` and `resetFormState`); remove the entire installation block at lines 859–870 (the `_outsideClickHandler = () => {};` placeholder and the `setTimeout` that replaces it and adds the document `click` listener). Re-run `npm run test:ui -- modal.spec.js` — all four cases pass (green).

**Checkpoint**: User Story 1 is fully functional. The time-entry modal can no longer be accidentally dismissed by clicking outside it.

---

## Phase 4: User Story 2 — Vacation and public-holiday entries are exempt from ArbZG rules (Priority: P1)

**Goal**: Pass admin-configured `holidayTicket` and `vacationTicket` IDs through to `computeArbzgWarnings`, which filters matching entries out of its input. All six warning categories (`daily`, `weekly`, `restPeriod`, `sunday`, `holiday`, `breaks`) see the filtered set, so no warning of any category is raised for vacation/holiday entries.

**Independent Test**: With `holidayTicket: 1001` and `vacationTicket: 1002` in `config.json`, book an 8h entry on ticket 1001 on a Sunday — reload calendar → zero ArbZG warnings of any category. See [`quickstart.md`](quickstart.md) § Story 2.

- [x] T003 [US2] Add Vitest unit tests to `tests/unit/arbzg.test.js` (create or extend): (a) `holidayTicket-only day produces zero warnings of any category` — `entries=[{date:'2026-05-04',issueId:1001,hours:8,startTime:'09:00'}]`, `cfg={holidayTicket:1001}`, year=2026 → assert every category in the result is an empty array/object; (b) `vacationTicket-only day` — same with `issueId:1002`, `cfg={vacationTicket:1002}` → all categories empty; (c) `mixed day evaluates only non-exempt entries` — `[{...1001,4h,'09:00'},{...9999,4h,'14:00'}]` with cfg → `daily/breaks/restPeriod` reflect only the 4h entry; (d) `vacation entry on Sunday does not trigger sunday warning` — Sunday-dated `1002` entry with `cfg={vacationTicket:1002}` → `result.sunday` empty; (e) `missing cfg behaves as today` — snapshot today's behaviour first, then assert byte-equivalence after the change with `cfg=undefined`; (f) `non-positive ticket value treated as unconfigured` — `cfg={holidayTicket:0}` and `cfg={holidayTicket:'bad'}` and `cfg={vacationTicket:null}` → no exemption. Run `npm test -- arbzg` and confirm all new cases FAIL (red — cfg argument is ignored today).
- [x] T004 [US2] In `js/arbzg.js`, extend `computeArbzgWarnings`'s signature from `(entries, year)` to `(entries, year, cfg)`; update the JSDoc to match `ArbzgCfg` from [`data-model.md`](data-model.md); in the function body, replace the existing `filtered = entries.filter(e => !e._isMidnightContinuation)` line with the two-filter form from [`research.md`](research.md) § R-2 (drop midnight-continuation phantoms AND drop entries whose `issueId` matches `cfg.holidayTicket` or `cfg.vacationTicket` when those values are positive integers). Add a local `positiveIntOrNull` helper or import the project's existing `positiveTicketOrNull` from `js/chatbot-tools.js` if it is exportable; if not, duplicate the four-line predicate inline (acceptable per Simplicity & YAGNI — Constitution IV — for a four-line pure predicate). Re-run `npm test -- arbzg` → green.
- [x] T005 [US2] In `js/calendar.js`, update both call sites of `computeArbzgWarnings` (around lines 446 and ~496) to pass the cfg argument: `computeArbzgWarnings(entries, year, { holidayTicket: cfg?.holidayTicket, vacationTicket: cfg?.vacationTicket })`. The `cfg` object is already in scope at both call sites (it is the `centralCfg` / per-user config object loaded a few lines above). Run `npm run test:coverage` and confirm the new filter lines in `js/arbzg.js` hit ≥95% line coverage; if not, add the missing test case to `tests/unit/arbzg.test.js` and re-run.

**Checkpoint**: User Story 2 is fully functional. Booking time on the configured holiday or vacation ticket produces no ArbZG warning of any category, on any surface.

---

## Phase 5: User Story 3 — Settings page no longer shows the server-configuration block (Priority: P2)

**Goal**: Delete the admin-info block (Redmine URL + AI provider + AI model) from the top of the Settings page, along with its rendering function, CSS rules, and i18n keys. No replacement; the information remains admin-managed server-side.

**Independent Test**: Open `settings.html` — no element on the page lists the Redmine URL, AI provider, or AI model. The first content under the page header is the working-hours toggle row. See [`quickstart.md`](quickstart.md) § Story 3.

- [x] T006 [US3] Add a Playwright UI test case to `tests/ui/settings.spec.js` (create the file if it does not exist): navigate to `/settings.html`, wait for `#settings-form` to be visible, then assert that no element on the page has `textContent` matching the loaded `config.json`'s `redmineUrl` value (read the value via `page.evaluate(() => fetch('/config.json').then(r=>r.json()).then(c=>c.redmineUrl))`). Run `npm run test:ui -- settings.spec.js` and confirm FAIL (red — the admin-info block currently renders that URL).
- [x] T007 [US3] In `js/settings.js`, delete the `renderAdminInfo` function (currently lines 77–86) and the single call site at line 151 (`renderAdminInfo(els.adminInfoEl, cfg);`). Also remove the `adminInfoEl` field from the element-lookup object around line 254 (the `document.getElementById('admin-info')` lookup). After this edit, `js/settings.js` must contain no reference to `admin-info`, `adminInfoEl`, or `renderAdminInfo`. Verify with `grep -nE "admin-info|adminInfo|renderAdminInfo" js/settings.js` → no matches.
- [x] T008 [P] [US3] In `settings.html`, delete the line `<div id="admin-info" class="admin-info hidden"></div>` (currently around line 38). Run `npm run htmlhint` → green.
- [x] T009 [P] [US3] In `css/style.css`, delete the two rule blocks for `.admin-info` (one around line 754 and one around line 1795). Confirm `grep -n "\.admin-info" css/style.css` returns no matches. Run `npm run format:check` → green (or `npm run format` to auto-fix if needed).
- [x] T010 [P] [US3] In `js/i18n/en.js`, delete the four keys `admin.heading`, `admin.redmine_url`, `admin.ai_provider`, and `admin.ai_model`. Confirm `grep -nE "admin\.(heading|redmine_url|ai_provider|ai_model)" js/i18n/en.js` returns no matches.
- [x] T011 [P] [US3] In `js/i18n/de.js`, delete the same four keys. Confirm the German file's key set is identical to the English file's after the change: `node -e "const en=Object.keys(require('./js/i18n/en.js').default||{});const de=Object.keys(require('./js/i18n/de.js').default||{});const onlyEn=en.filter(k=>!de.includes(k));const onlyDe=de.filter(k=>!en.includes(k));if(onlyEn.length||onlyDe.length){console.error('mismatch',{onlyEn,onlyDe});process.exit(1)}"` (or the project's existing i18n parity test if one exists). Re-run `npm run test:ui -- settings.spec.js` → green; run `npm run lint && npm run typecheck` → green.

**Checkpoint**: User Story 3 is fully functional. The Settings page renders no admin-info block; no orphan references remain.

---

## Phase 6: User Story 4 — Full-app WCAG 2.2 AA accessibility audit + remediation + CI gate (Priority: P2)

**Goal**: Audit the full application against WCAG 2.2 Level AA, remediate every user-facing surface (calendar desktop + mobile day-view, time-entry modal, settings, chatbot panel, docs panel, voice-input UI) in both light and dark themes, and wire `@axe-core/playwright` into the Playwright UI pipeline as a permanent CI regression gate over the 7-surface × 2-theme matrix (14 zero-violation scans per CI run).

**Independent Test**: Run `npm run test:ui -- a11y.spec.js` — all 14 cells report zero WCAG 2.2 Level A or AA violations. A keyboard-only walkthrough of the journey in [`quickstart.md`](quickstart.md) § Story 4 completes without ever needing a pointer.

### Sub-phase 6A — Harness

- [x] T012 [US4] Add `@axe-core/playwright` as a devDependency in `package.json` (`npm install --save-dev @axe-core/playwright`). Commit both `package.json` and the updated `package-lock.json`. Verify with `node -e "console.log(require('@axe-core/playwright'))"`.
- [x] T013 [US4] Create `tests/ui/a11y.spec.js` implementing the 14-cell surface matrix from [`contracts/a11y-contract.md`](contracts/a11y-contract.md) § Contract 2: one Playwright test per cell (numbered to match the contract table 1..14), each opening the relevant surface in the correct theme, then running `await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']).analyze()` and asserting `results.violations` is an empty array. For surfaces requiring interaction (modal/chatbot/docs panels open, voice-input activated), perform the open via `page.click(...)` then call `analyze()`. For dark theme, set theme by setting `localStorage.redmine_calendar_theme = 'dark'` before navigation. For mobile day-view, set `viewport: { width: 375, height: 667 }` in the test context. Run `npm run test:ui -- a11y.spec.js` and confirm most cells FAIL (red — this is expected; the failures drive Sub-phase 6B).

### Sub-phase 6B — Audit

- [x] T014 [US4] Produce `specs/033-small-ux-a11y-fixes/a11y-audit.md` per the schema in [`data-model.md`](data-model.md): header (date, axe-core version, browser, theme set), summary table, and one section per surface with a per-finding row table. Populate from (a) the axe failures from T013, (b) manual keyboard-only walkthroughs of each surface, (c) screen-reader sanity passes (NVDA on Windows or VoiceOver on macOS), and (d) targeted contrast checks against the Fluent 2 token layer in `css/style.css`. Each row gets a triage decision per FR-014 — default is `Fixed`; `Deferred` requires owner + linked follow-up issue; `N/A` requires rationale. Per Invariant I-2 from `data-model.md`, no surface may have `Fixed = 0 && Findings > 0` without amending the spec's Clarification C2.

### Sub-phase 6C — Cross-cutting remediation (parallel across files)

- [x] T015 [P] [US4] Lang attributes: in `index.html` and `settings.html`, ensure `<html lang="en">` is the static default and is updated at runtime by `js/i18n.js` to match the detected/active locale (`en` or `de`) before page interactivity. Acceptance: `document.documentElement.lang` is `'en'` or `'de'` (never empty) at all times.
- [x] T016 [P] [US4] CSS-only remediation in `css/style.css` (single file — sequential within this task, not parallel with T017/T026): (a) focus indicators on every focusable control with ≥3:1 contrast vs adjacent background in both `:root` (light) and `[data-theme="dark"]` (dark) — replace any solely-colour focus changes with at least one non-colour visual change (outline width or style); (b) mobile day-view tap targets ≥24×24 CSS px (WCAG 2.5.8) at viewport widths ≤768px; (c) Fluent 2 token contrast fixes — for any contrast failure flagged in `a11y-audit.md`, fix in the token definitions in `:root` and `[data-theme="dark"]`, NOT via per-component overrides (per spec edge case). Add Vitest unit test or visual regression test? — N/A; verification is via T013's axe scan re-run after remediation.
- [x] T017 [P] [US4] i18n a11y label keys: add the new keys identified by the audit (e.g., `a11y.modal.close`, `a11y.chatbot.close`, `a11y.docs.close`, `a11y.voice.label_idle`, `a11y.voice.label_listening`, `a11y.voice.label_processing`, `a11y.calendar.anomaly_live_region`) to `js/i18n/en.js` and `js/i18n/de.js`. Keys must be identical sets between the two files (run the i18n parity check from T011). The list of exact keys depends on T014's audit output; this task is owned by the implementer, who adds whatever keys the per-surface remediation tasks (T018–T024) need.

### Sub-phase 6D — Per-surface remediation (parallel — different files)

- [x] T018 [P] [US4] **Time-entry modal — dialog ARIA pattern** in `js/time-entry-form.js` and the corresponding markup section: implement all 8 clauses of [`contracts/a11y-contract.md`](contracts/a11y-contract.md) § Contract 1 — `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the modal heading, initial focus to the issue-search input on open, full Tab focus trap inside `.lean-card` while open, focus restoration to the opener on close (record opener via `document.activeElement` at open time; fall back to `document.body` if it disappeared), `inert` attribute on `#calendar` while the modal is open. Add a Playwright test case to `tests/ui/modal.spec.js` covering each clause (already partially covered by US1's T001; extend that file). **Depends on T002** (US1 must complete first so the file is in the post-US1 shape).
- [x] T019 [P] [US4] **Chatbot panel — dialog ARIA pattern** in `js/chatbot.js` and its markup: apply all 8 clauses of Contract 1. Additionally: add a single `aria-live="polite"` region for streaming assistant responses, with sentence-boundary batching (flush at `.`, `?`, `!` followed by whitespace; not per-token) per [`research.md`](research.md) § R-5. Add Escape-key dismissal if not present. Add Playwright test cases to a new `tests/ui/chatbot-a11y.spec.js` covering focus trap, focus restore, Escape, and sentence-batched live-region updates.
- [x] T020 [P] [US4] **In-app docs panel — dialog ARIA pattern** in `js/docs.js` and its markup: apply all 8 clauses of Contract 1. Markdown-rendered headings inside the panel must use `aria-level` if the project's Markdown renderer omits semantic levels. Add Playwright test cases to a new `tests/ui/docs-a11y.spec.js`.
- [x] T021 [P] [US4] **Voice-input UI** in `js/voice-input.js` and its markup: add a single `aria-live="polite"` region announcing state transitions (`idle` → `listening` → `processing` → `idle`); use `aria-busy="true"` on the region during `processing`; the mic toggle button gets a state-aware `aria-label` (e.g. `t('a11y.voice.label_listening')`) that re-renders on each state change. Add Playwright test cases to a new `tests/ui/voice-a11y.spec.js` verifying the label changes and the live-region content changes between states.
- [x] T022 [P] [US4] **Calendar (desktop + mobile day-view)** — landmarks + dynamic-content announcement: in `index.html`, wrap the calendar in `<main>` if not already; ensure `.app-header` is `<header>`. In `js/calendar.js`, add `aria-live="polite"` to the anomaly-tag rendering wrapper (a single region per page; do not create one per badge) so ArbZG warning changes are announced. Mobile day-view: confirm FullCalendar's own controls receive the focus indicator from T016; no per-control patching needed unless the audit flags otherwise.
- [x] T023 [P] [US4] **Settings page** — landmarks + form-label completeness: in `settings.html`, ensure `<main>` wraps `.settings-card` and the page header sits in `<header>` semantics. Confirm every `<input>` has either an associated `<label for="…">` (already the case for working-hours, weekly-hours, etc.) or `aria-label`. **Depends on T008** (US3's deletion of the admin-info markup must have happened first so this task does not collide on `settings.html`).

### Sub-phase 6E — Verify

- [x] T024 [US4] Re-run `npm run test:ui -- a11y.spec.js` until **all 14 cells report zero violations**. For each failure remaining after T015–T023, either fix the underlying issue or — by exception only — mark the corresponding row in `a11y-audit.md` as `Deferred:<owner>:#<follow-up-issue>` per FR-014; create the follow-up GitHub issue with `gh issue create --title "a11y follow-up: <surface> — <criterion>" --label feature` and record its number in the audit table. Per Invariant I-3, the in-CI axe gate must remain enforcing (no rule disabling).
- [x] T025 [US4] Verify CI integration: confirm the new `tests/ui/a11y.spec.js` runs as part of `npm run test:ui` (it should, automatically, since Playwright discovers `tests/ui/*.spec.js`); check `.github/workflows/deploy.yml` does not need any explicit addition (the existing `npm run test:ui` step covers it). If any per-surface scan needs a CI-only environment toggle (e.g., the voice-input UI may need a headless permission grant), document it in the test file's header comment.

**Checkpoint**: User Story 4 is fully functional. The full app passes WCAG 2.2 AA across both themes; CI permanently gates against regressions on every surface enumerated in Contract 2.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, full-pipeline verification, and final UAT prep.

- [x] T026 [P] Update user documentation in `docs/content.en.md` and `docs/content.de.md` to reflect the four user-visible changes: (a) the time-entry modal no longer closes on outside click (mention Escape / Cancel / X as the dismissal paths); (b) vacation and public-holiday entries no longer trigger ArbZG warnings of any category — mention that this is driven by the admin-configured `holidayTicket` and `vacationTicket`; (c) the Settings page no longer shows the admin-info block (the configured Redmine URL etc. are admin-managed and visible from server logs / admin tooling, not the per-user UI); (d) accessibility improvements — keyboard-only operation, screen-reader support, high-contrast focus indicators, WCAG 2.2 AA compliance across the app. Keep both translations in lock-step.
- [x] T027 Run the full constitutional CI gate locally and confirm green at every step (in this exact order, matching `.github/workflows/deploy.yml`): `npm audit --audit-level=high && npm run lint && npm run format:check && npm run htmlhint && npm run typecheck && npm run test:coverage && npm run sqi:json && npm run test:ui`. If `npm run sqi` drops out of the GREEN band (<60), STOP and remediate the underlying metric per Constitution Principle VI (do NOT retune SQI band anchors to recover GREEN — that's a constitutional violation).
- [x] T028 Walk through [`quickstart.md`](quickstart.md) end-to-end against a running `npm run dev` instance with a `config.json` populated with `holidayTicket`, `vacationTicket`, Redmine URL, and AI settings: reproduce each story's bug (before-state — if the branch still contained it), verify the fix (after-state), and confirm the manual UAT recipes pass. Capture any blocking issues as separate `gh issue create` calls with the `bug` label; non-blocking observations go into the PR comment thread on #98.

---

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 (Setup) and Phase 2 (Foundational) are empty for this feature.
- Phase 3 (US1), Phase 4 (US2), Phase 5 (US3): mutually independent — can start in parallel, in any order, in priority order (P1, P1, P2), or sequentially.
- Phase 6 (US4): has two cross-story file dependencies into US1 and US3 (T018 depends on T002; T023 depends on T008). Otherwise independent of US2 entirely (different files).
- Phase 7 (Polish): depends on US1 + US2 + US3 + US4 all complete.

### Within Story 4

- 6A (T012, T013) must complete before 6B (T014) — the audit needs the failing scan output.
- 6B (T014) must complete before 6C / 6D — the audit drives both cross-cutting and per-surface fix lists.
- 6C and 6D are largely parallel (different files); see [P] markers.
- 6E (T024, T025) must come last — it is the verification gate for the whole story.

### Cross-story file overlap (sequencing only, not blocking the story-level "independent" property)

- `js/time-entry-form.js`: US1 (T002 — deletion) → US4 (T018 — additions). The story-level independence is preserved: shipping US1 alone is a valid increment; shipping US4 alone without US1 is also a valid increment (the modal would have both an outside-click handler AND dialog ARIA), though that combination is not the user-visible end state and is not what the spec intends.
- `settings.html`: US3 (T008 — deletion) → US4 (T023 — landmark additions).

### Parallel opportunities

- **Within US3**: T008, T009, T010, T011 are all marked [P] — four different files; can all run in parallel.
- **Within US4 Sub-phase 6C**: T015, T016, T017 — three different file groups (HTML lang, CSS tokens/focus, i18n).
- **Within US4 Sub-phase 6D**: T018, T019, T020, T021, T022, T023 — six different file groups; all [P] (subject to the US1→US4 / US3→US4 sequencing above).
- **Between stories**: a team with three developers could parallelise US1 / US2 / US3 immediately; once T002 and T008 land, US4's per-surface tasks (T018–T023) can also be split.

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 + 2 are empty — no setup needed.
2. Complete Phase 3 (US1) — T001 + T002. Two tasks total.
3. STOP and VALIDATE — the time-entry modal no longer loses input on backdrop clicks. This alone is a valid, shippable, user-visible win.

### Recommended incremental delivery

1. Ship US1 (Phase 3) — instant UX win, smallest change.
2. Ship US2 (Phase 4) — correctness fix; biggest user-trust improvement on ArbZG warnings.
3. Ship US3 (Phase 5) — clean-up; small visual improvement.
4. Ship US4 (Phase 6) — the bulk of the feature; bring in CI a11y gate + remediation.
5. Phase 7 Polish — documentation + full pipeline gate + UAT walkthrough.

### Parallel team strategy

With three developers and the user's clarified scope:

- **Dev A**: Phase 3 (US1, ~30 min) → Phase 4 (US2, ~2 h).
- **Dev B**: Phase 5 (US3, ~1 h) → then joins Dev C on US4 per-surface tasks.
- **Dev C**: Phase 6 6A + 6B (T012–T014, ~1 day for the audit) → then drives 6D per-surface fixes.
- Daily stand-up to coordinate the two file-overlap pairs (US1↔US4 modal, US3↔US4 settings).

---

## Notes

- [P] = different files, no incomplete dependencies between them.
- [Story] label maps each task to a user story for traceability and selective rollback.
- Each task includes its own Vitest unit and/or Playwright UI tests — no separate test phase.
- Commit after each task or logical group (per CLAUDE.md branch + commit policy).
- Stop at any checkpoint and validate the story independently.
- Per FR-014 invariant I-2, do not silently mark audit findings as `Deferred` to make CI green — escalate to amend Clarification C2 first.
- The full app a11y remediation in US4 is intentionally large; if a specific surface proves to require disproportionate effort during T018–T023, use the per-finding `Deferred:<owner>:#<issue>` escape valve, not silent re-scoping.
