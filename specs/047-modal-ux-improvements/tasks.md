# Tasks: Modal UX Improvements (047)

**Input**: Design documents from `specs/047-modal-ux-improvements/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story (P1→P4) in priority order. Each story is independently testable. Unit tests and Playwright tests are written before their respective implementations (Constitution III — Test-First).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependency)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup — Baseline Verification

**Purpose**: Confirm the test suite is green before any changes are made.

- [ ] T001 Run `npm test` and `npm run test:ui:failed` to confirm zero pre-existing failures in the modal/settings test surfaces

---

## Phase 2: Foundational — Write Failing Unit Tests

**Purpose**: Write and verify all unit-test failures BEFORE any implementation. These tests must be RED before the corresponding implementation tasks.

- [ ] T002 In `tests/unit/time-entry-form-utils.test.js`, update the `capLastUsed` default-cap test (currently titled "trims to the default cap of 8") to expect cap 20: rename the test, update the fixture list to 20 items, assert `toHaveLength(20)` after adding a 21st — run `npm test` and confirm RED
- [ ] T003 In `tests/unit/time-entry-form-utils.test.js`, add a `getFastMode` describe block: import `getFastMode` from `js/time-entry-form-utils.js`, write three cases: absent key → `true`; `localStorage` set to `'false'` → `false`; `localStorage` set to `'true'` → `true` — run `npm test` and confirm RED (function not yet exported)

**Checkpoint**: Both unit tests are RED. No implementation started.

---

## Phase 3: User Story 1 — View Toggle Blocked by Modal Backdrop (P1) 🎯 MVP

**Goal**: The planning FAB / view toggle must not respond while the booking modal is open.

**Independent Test**: Open modal → click FAB → view unchanged → close modal → FAB works again.

### Tests for US1 (write first — must FAIL before T006)

- [ ] T004 [US1] In `tests/ui/modal.spec.js`, add test: open the booking modal, attempt to click `#planning-view-toggle`, assert the planning view did NOT activate (calendar grid still visible) — run `npm run test:ui:failed` and confirm RED

### Implementation for US1

- [ ] T005 [US1] In `css/time-entry.css`, change `.lean-overlay { z-index: 300 }` → `z-index: 9000` and `.modal-overlay { z-index: 300 }` → `z-index: 9000` (leave the existing mobile override at `z-index: 10000` unchanged) — run `npm run test:ui:failed` and confirm T004 GREEN

**Checkpoint**: T004 GREEN. View toggle is non-interactive while modal is open.

---

## Phase 4: User Story 2 — Favourite Star Toggle on Last Used Entries (P2)

**Goal**: Every Last Used row in the booking modal has a star icon that toggles Favourite status immediately.

**Independent Test**: Open modal → Last Used row has star → click unfilled star → entry appears in Favourites → click filled star → entry removed → close + reopen → state persisted.

### Tests for US2 (write first — must FAIL before T008)

- [ ] T006 [US2] In `tests/ui/modal.spec.js`, add test: pre-seed `localStorage` `redmine_calendar_last_used` with one ticket, open modal, assert star icon present on the Last Used row, click it, assert entry appears in `redmine_calendar_favourites` — run `npm run test:ui:failed` and confirm RED
- [ ] T007 [P] [US2] In `tests/ui/modal.spec.js`, add keyboard test: focus the star icon via Tab, press Space, assert Favourite state toggled — run `npm run test:ui:failed` and confirm RED

### Implementation for US2

- [ ] T008 [US2] In `js/time-entry-form-view.js`, update `renderLastUsed` (line ~203): after `makeRow(ticket, onSelect)`, compute `isFav` from `getFavourites().some(f => f.id === ticket.id)`, call `makeStar(ticket, isFav, () => { toggleFavourite(ticket); renderLastUsed(onSelect); renderFavs(onSelect); })`, append star to row — import `toggleFavourite` from `./time-entry-form-utils.js` if not already imported — run `npm run test:ui:failed` and confirm T006 + T007 GREEN

**Checkpoint**: T006, T007 GREEN. Star icon functional on all Last Used rows.

---

## Phase 5: User Story 3 — Last Used List Expanded to 20 with Scroll (P3)

**Goal**: Last Used list stores and displays up to 20 entries; list is scrollable when it overflows.

**Independent Test**: Seed 21 entries → modal shows 20 most recent → list is scrollable → oldest entry absent.

### Tests for US3 (write first — must FAIL before T010/T011)

- [ ] T009 [US3] In `tests/ui/modal.spec.js`, add test: seed `redmine_calendar_last_used` with 20 entries via `localStorage`, open modal, count rows in `#lean-list-lastused`, assert count is 20 — run `npm run test:ui:failed` and confirm RED

### Implementation for US3

- [ ] T010 [US3] In `js/time-entry-form-utils.js`, change `const RECENT_CAP = 8` to `const RECENT_CAP = 20` — run `npm test` and confirm T002 GREEN; run `npm run test:ui:failed` and confirm T009 GREEN
- [ ] T011 [P] [US3] In `css/time-entry.css`, add rule `.lean-col--secondary .lean-list { max-height: 200px; }` after the existing `.lean-list` block (removes the "no max-height" comment and activates scrolling for the secondary columns) — visually verify scroll appears with 20 entries in the browser

**Checkpoint**: T002, T009 GREEN. Last Used list shows 20 entries and scrolls.

---

## Phase 6: User Story 4 — Fast Mode Setting (P4)

**Goal**: A Settings checkbox lets users disable auto-close on ticket selection. Default ON preserves existing behaviour.

**Independent Test**: Disable Fast Mode in Settings → open modal → click Favourite → modal stays open → fill comment → Save → entry submitted → re-enable → click Favourite → modal closes immediately.

### Tests for US4 (write first — must FAIL before T013–T019)

- [ ] T012 [US4] In `tests/ui/modal.spec.js` (or `tests/ui/settings.spec.js`), add test: set `localStorage.redmine_calendar_fast_mode = 'false'`, open booking modal, click a Favourite row, assert modal is still visible (not hidden) — run `npm run test:ui:failed` and confirm RED
- [ ] T013 [P] [US4] In `tests/ui/settings.spec.js`, add test: verify "Fast mode" checkbox exists on settings page, is checked by default, can be unchecked, and `localStorage.redmine_calendar_fast_mode` is set to `'false'` after unchecking — run `npm run test:ui:failed` and confirm RED

### Implementation for US4

- [ ] T014 [US4] In `js/config.js`, add `export const STORAGE_KEY_FAST_MODE = 'redmine_calendar_fast_mode';` after the existing storage-key exports
- [ ] T015 [US4] In `js/time-entry-form-utils.js`, add `import { STORAGE_KEY_FAST_MODE } from './config.js';` if not already present, then add `export function getFastMode() { return localStorage.getItem(STORAGE_KEY_FAST_MODE) !== 'false'; }` — run `npm test` and confirm T003 GREEN
- [ ] T016 [US4] In `js/time-entry-form.js`, import `getFastMode` from `./time-entry-form-utils.js`, then in `selectAndSave()` (line ~221) replace the unconditional `doSave()` call with `if (getFastMode()) doSave();` — run `npm run test:ui:failed` and confirm T012 GREEN
- [ ] T017 [P] [US4] In `js/i18n/en.js`, add `'settings.fast_mode': 'Fast mode'` and `'settings.fast_mode_hint': 'When on, selecting a ticket closes the modal immediately. Turn off to keep the modal open for adding a comment.'`
- [ ] T018 [P] [US4] In `js/i18n/de.js`, add `'settings.fast_mode': 'Schnellmodus'` and `'settings.fast_mode_hint': 'Wenn aktiv, schließt die Auswahl eines Tickets das Modal sofort. Deaktivieren, um das Modal für einen Kommentar offen zu halten.'`
- [ ] T019 [US4] In `settings.html`, add a checkbox row for Fast Mode following the existing pattern (after the Dark Mode row): `<input type="checkbox" id="settingFastMode" />` with a `<label>` wired to `t('settings.fast_mode')` and a hint element wired to `t('settings.fast_mode_hint')`
- [ ] T020 [US4] In `js/settings-page.js`, add: import `STORAGE_KEY_FAST_MODE` from `./config.js`; get `#settingFastMode` checkbox; set `checked = getFastMode()`; add `onChange` → `localStorage.setItem(STORAGE_KEY_FAST_MODE, fastCheckbox.checked ? 'true' : 'false')` — run `npm run test:ui:failed` and confirm T013 GREEN

**Checkpoint**: T003, T012, T013 GREEN. Fast Mode works end-to-end.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T021 Run `npm run lint` — fix any new ESLint warnings introduced (especially `max-lines-per-function` if `renderLastUsed` grew); run `npm run format:check`
- [ ] T022 Run `npm run typecheck` — verify no new JSDoc/tsc errors
- [ ] T023 Run `npm run knowledge:check` — no new uncovered modules (no new JS files added, so should pass automatically)
- [ ] T024 Run `npm run dup:check` — confirm no new token-identical clones above baseline
- [ ] T025 Run full `npm run test:ui` — all Playwright tests GREEN including the four new scenarios
- [ ] T026 Run `npm run sqi` — confirm composite ≥ 80 GREEN
- [ ] T027 [P] Update `docs/content.en.md` — document Fast Mode setting and the expanded Last Used list under the booking modal section
- [ ] T028 [P] Update `docs/content.de.md` — same updates in German

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (baseline): No dependencies
- **Phase 2** (unit tests): Depends on Phase 1 — must confirm RED before implementation
- **Phase 3** (US1): Depends on Phase 1 only — CSS-only, independent
- **Phase 4** (US2): Depends on Phase 1 only — view-only change, independent
- **Phase 5** (US3): Depends on Phase 2 (T002 must be RED before T010) — same utils.js file as Phase 6, but different lines
- **Phase 6** (US4): Depends on Phase 2 (T003 must be RED before T015) — adds to utils.js after P3 is done
- **Phase 7** (polish): Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Independent — only `css/time-entry.css`
- **US2 (P2)**: Independent — only `js/time-entry-form-view.js`
- **US3 (P3)**: Shares `js/time-entry-form-utils.js` with US4; complete US3 before US4 to avoid merge conflicts on that file
- **US4 (P4)**: Shares `js/time-entry-form-utils.js` with US3; also touches `js/time-entry-form.js`, `js/config.js`, `settings.html`, `js/settings-page.js`, `js/i18n/`

### Within Each User Story

- Test tasks MUST be written and confirmed RED before implementation tasks
- Within US4: T014 (config) → T015 (utils) → T016 (form.js) → T017+T018 (i18n, parallel) → T019 (HTML) → T020 (settings-page.js)

### Parallel Opportunities

- T004, T006, T007 can all run in parallel (different test files / different describes)
- T009 can run in parallel with T004/T006/T007
- T012, T013 can run in parallel
- T017, T018 (i18n) can run in parallel
- T027, T028 (docs) can run in parallel

---

## Implementation Strategy

### MVP (US1 only — bug fix, zero risk)

1. Phase 1 → Phase 3 (T001 → T004 → T005)
2. Verify T004 GREEN — ship the z-index fix

### Full Incremental Delivery

1. Phase 1 + 2 → baseline + failing tests
2. Phase 3 → US1 (bug fix)
3. Phase 4 → US2 (star icon)
4. Phase 5 → US3 (cap + scroll)
5. Phase 6 → US4 (fast mode)
6. Phase 7 → Polish + full CI

---

## Notes

- [P] tasks touch different files with no shared state; safe to run in parallel
- `time-entry-form-utils.js` is shared between US3 (T010) and US4 (T014+T015) — do US3 first to avoid editing the same file twice in the same session
- `time-entry-form.js` is at 598 LOC. T016 adds ~3 lines. If the hard 600-LOC gate triggers, extract `getFastMode` check into a helper and call it from `selectAndSave` to keep the function under 60 lines
- Commit after each checkpoint (T005, T008, T011, T020) with message format `T00N: <description>` per commit policy
