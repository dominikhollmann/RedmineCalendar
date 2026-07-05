---
description: 'Task list for Settings Page Redesign (054)'
---

# Tasks: Settings Page Redesign

**Input**: Design documents from `specs/054-settings-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Design reference**: `design_handoff_settings_redesign/README.md` (tokens, per-component specs, state machine, a11y, checklist)
**Tests**: Included (Constitution III Test-First — required for this repo).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US7 (maps to spec.md user stories). Setup/Foundational/Polish carry no story label.
- Paths are repo-root relative.

## Priorities (from spec.md)

- **P1**: US1 (grouped layout + nav), US2 (explicit connection), US3 (choose & order sources / #274)
- **P2**: US4 (display switches instant-apply), US5 (app entry gated on connection), US7 (mobile)
- **P3**: US6 (data & privacy danger zone)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Storage key, module registration, and empty module skeletons so later phases only fill in behavior.

- [x] T001 Add `STORAGE_KEY_PLANNING_SOURCE_ORDER = 'redmine_calendar_planning_source_order'` and `DEFAULT_PLANNING_SOURCE_ORDER = ['outlook','teams']` exports to `js/config.js`
- [x] T002 [P] Create empty ES-module skeletons with JSDoc headers: `js/source-order.js`, `js/settings-connection.js`, `js/settings-nav.js`, `js/settings-sources.js`
- [x] T003 [P] Register the four new modules in `js/knowledge.topics.json` under a relevant topic (so `npm run knowledge:check` passes)
- [x] T004 [P] Add empty Playwright + Vitest test files: `tests/unit/source-order.test.js`, `tests/unit/settings-connection.test.js`, `tests/ui/settings-redesign.spec.js`

**Checkpoint**: `npm run knowledge:check` and `npm run lint` pass with stubs in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens, page scaffold, theme header, i18n base, and the a11y live region — every user story builds on these.

**⚠️ CRITICAL**: No user-story phase can start until this phase is complete.

- [x] T005 Add new component tokens (light + dark) to the stylelint-disabled `:root` block in `css/base.css` per `contracts/storage-and-tokens.md`: `--neutral-stroke-strong`, `--nav-active-bg`, `--switch-on-thumb`, `--switch-off-border`, `--switch-off-thumb`, `--status-connected-dot`, `--status-checking-dot`, `--status-disconnected-dot`, `--reorder-grip` (reuse semantic tokens / `color-mix` where noted)
- [x] T006 Add the dark-mode CI contrast safeguard to `:root[data-theme='dark']` in `css/base.css` (D3): lighten link/focus tokens via `color-mix(in srgb, var(--color-primary) 55%, white)` so a dark `--ci-primary` keeps ≥3:1
- [x] T007 Restructure `settings.html` markup into the card/scaffold shell: header (app mark, title block, help button, theme-toggle button), section-nav container (rail/chip-bar), `max-width:980` centered card column with five `<section>` cards (Anzeige, Arbeitszeiten, Authentifizierung, Quellen, Daten & Datenschutz), sticky footer with "Kalender öffnen →", and a visually-hidden `role="status" aria-live="polite"` region. Remove the global `#save-btn` and the `settingDarkMode` checkbox row (D4/D5)
- [x] T008 Implement the card-shell + page scaffold styles in `css/settings.css` (card border/radius/shadow/padding, 14px card gap, header, footer) using `var(--token)` only — no literals
- [x] T009 [P] Add all new i18n keys to `js/i18n/en.js` and `js/i18n/de.js`: five section titles, switch labels, three connection states + error reasons, segmented labels, button labels (Verbinden/Anzeigen/Verbergen/Kalender öffnen/Löschen/Widerrufen/Ansehen), helper texts, the "Zugangsdaten geändert" + "Zuerst mit Redmine verbinden…" hints, source reorder announcements, and all aria-labels
- [x] T010 Wire the header theme toggle in `js/settings-page.js` reusing `theme.js` (`getTheme`/`setTheme`/`applyTheme`/`subscribeOnChange`); keep the first-paint inline theme script in `settings.html`; toggle `aria-label` flips dark/light (D4)
- [x] T011 [P] Add a small shared `announce(message)` helper (writes to the live region) used by connection + reorder; place in `js/settings-page.js` or a tiny shared util

**Checkpoint**: Page renders the five empty cards + header + nav container + footer in both themes; theme toggle works; `npm run lint` green.

---

## Phase 3: User Story 1 — Find and change a setting quickly (P1) 🎯 MVP

**Goal**: Grouped cards + section nav (desktop rail / mobile chip-bar) with scroll-spy and click-to-scroll; Anzeige + Arbeitszeiten cards rendered.

**Independent Test**: Five cards render; clicking nav scrolls to a section and marks it active; scrolling updates the active item; on mobile the active chip auto-scrolls into view.

### Tests (write first, must FAIL)

- [x] T012 [P] [US1] Playwright tests in `tests/ui/settings-redesign.spec.js`: five cards present; desktop rail click scrolls + marks active; scroll-spy updates active; mobile chip-bar active chip centered via manual `scrollLeft` (not page scroll)

### Implementation

- [x] T013 [US1] Implement `js/settings-nav.js`: build nav items from sections, `isMobile` (640px, re-eval on resize), scroll-spy (threshold +140 desktop / +120 mobile), click-scroll (offset −96 / −104), mobile chip auto-scroll via `scrollTo({left, behavior:'auto'})` (per research R10)
- [x] T014 [US1] Render nav (rail + chip-bar) styles in `css/settings.css` (active = brand left-border/wash/600; chips pill-shaped, ≥36px); wire `settings-nav.js` from `js/settings-page.js`
- [x] T015 [US1] Render the Arbeitszeiten card content (Start/Ende/Wochenstunden fields) with instant-apply persistence + validation (0–60 weekly), reusing `js/settings.js` helpers; desktop 3-up row / mobile split layout

**Checkpoint**: US1 fully testable; T012 passes.

---

## Phase 4: User Story 2 — Connect to Redmine deliberately, with clear status (P1)

**Goal**: Auth card with segmented method control, show/hide key, status pill, real `getCurrentUser()` Verbinden flow with error states, invalidate-on-edit.

**Independent Test**: Pill cycles Nicht verbunden → Verbindung wird geprüft… → Verbunden on valid creds; invalid/network/server give distinct errors; editing a credential returns to Nicht verbunden with the reconnect hint.

### Tests (write first, must FAIL)

- [x] T016 [P] [US2] Unit tests in `tests/unit/settings-connection.test.js` for the pure core: `mapError` (401/403→invalid, fetch/TypeError→network, 5xx→server), `nextState` transitions (per `contracts/connection-state-machine.md`), `isFooterEnabled`
- [x] T017 [P] [US2] Playwright tests in `tests/ui/settings-redesign.spec.js`: connect success path; invalid-key error; network/server error (mocked); invalidate-on-edit hint; segmented-control field switching; show/hide key

### Implementation

- [x] T018 [US2] Implement the pure core in `js/settings-connection.js`: `mapError`, `nextState` reducer, `isFooterEnabled` (DOM-free) — make T016 pass
- [x] T019 [US2] Implement the DOM binder (pill render, button `disabled`/`aria-busy`, hint, `announce`) in `js/settings-connection.js`/`settings-page.js`, calling `getCurrentUser()` from `js/redmine-api.js`; persist credentials on connect via `js/settings.js` (move write out of the removed save button, D5)
- [x] T020 [US2] Build the auth card UI: segmented method control (`role="group"`, full-width 2-up on mobile), API-key field + show/hide toggle + helper/account link, basic-auth fields; status pill markup; styles in `css/settings.css`
- [x] T021 [US2] Wire invalidate-on-edit: editing apiKey/username/password or switching method → `disconnected` + reconnect hint + footer disabled

**Checkpoint**: US2 fully testable; T016/T017 pass.

---

## Phase 5: User Story 3 — Choose and order planning sources (P1, #274)

**Goal**: Source rows with enable checkbox + reorder (drag + keyboard + mobile arrows) + position badges; order persists and drives the planning views; every move announced.

**Independent Test**: Toggle persists; reorder via drag, via keyboard, and via arrow buttons; badges renumber; planning view columns follow the order; moves announced.

### Tests (write first, must FAIL)

- [x] T022 [P] [US3] Unit tests in `tests/unit/source-order.test.js` for pure logic: `readOrder` normalization (drop unknown, de-dupe, append missing known, default on absent), `writeOrder`, `move`/`moveUp`/`moveDown` (no-op at ends), `canMoveUp`/`canMoveDown`
- [x] T023 [P] [US3] Playwright tests in `tests/ui/settings-redesign.spec.js`: enable toggle persists; desktop drag reorder; keyboard grab/↑↓/drop with focus retention; mobile arrow buttons (disabled at ends); aria-live announcement; planning-view column order reflects the stored order

### Implementation

- [x] T024 [US3] Implement pure logic in `js/source-order.js` (`readOrder`/`writeOrder`/`move`/`moveUp`/`moveDown`/`canMoveUp`/`canMoveDown`) per `contracts/source-reorder.md` — make T022 pass
- [x] T025 [US3] Implement source-list UI in `js/settings-sources.js`: render rows (grip button, enable checkbox, label, position badge) in stored order; HTML5 drag; keyboard grab/arrows/drop with focus retention; mobile up/down arrow buttons; per-move badge update + `announce`; dispatch `planning:sources-changed`
- [x] T026 [US3] Source-row + grip + badge + grabbed-state styles in `css/settings.css` (≥48px rows, ≥44px arrow buttons, grabbed = nav-active bg + brand border + shadow)
- [x] T027 [US3] Consume the order in `js/planning-view.js`: read `source-order.readOrder()` where columns/headers are assembled (~L521/L552); bookings column stays first, outlook/teams columns + headers emitted in stored order; re-render on `planning:sources-changed`
- [x] T028 [US3] Add the auto-refresh row to the Quellen card (number input, 0 = off) reusing the existing `redmine_calendar_auto_refresh_interval` handling from `settings-page.js`

**Checkpoint**: US3 fully testable; T022/T023 pass; #274 satisfied.

---

## Phase 6: User Story 4 — Toggle display preferences with immediate effect (P2)

**Goal**: Anzeige preferences as `role="switch"` toggles, instant-apply, no save button.

**Independent Test**: The three switches reflect current values, toggling persists immediately, calendar reflects the change.

### Tests (write first, must FAIL)

- [x] T029 [P] [US4] Playwright tests in `tests/ui/settings-redesign.spec.js`: each preference renders as `role="switch"` with `aria-checked`; toggling persists (reload) with no save button

### Implementation

- [x] T030 [US4] Convert the Anzeige rows to switch controls in `settings.html` (`role="switch"`, `aria-checked`, `aria-label`) for "Nur Arbeitszeit", "Nur Mo–Fr", "Schnellmodus"; keep instant-apply bindings in `js/settings-page.js`
- [x] T031 [US4] Switch component styles in `css/settings.css` (40×20 track, 14×14 thumb, ON = brand, OFF = bordered) using tokens; ≥44px row hit target on mobile

**Checkpoint**: US4 testable; T029 passes.

---

## Phase 7: User Story 5 — Enter the app only when connected (P2)

**Goal**: Sticky footer "Kalender öffnen →" enabled only when `connected`, else disabled with hint.

**Independent Test**: Disabled + hint while disconnected; enabled + navigates when connected; disables again on invalidation.

**Depends on**: US2 (connection state).

### Tests (write first, must FAIL)

- [x] T032 [P] [US5] Playwright tests in `tests/ui/settings-redesign.spec.js`: footer disabled + hint when disconnected; enabled + navigates to calendar when connected; disables after credential edit

### Implementation

- [x] T033 [US5] Wire footer CTA enablement to `isFooterEnabled(connection)` in `js/settings-page.js`; disabled style + hint text; navigation target = calendar (index.html)

**Checkpoint**: US5 testable; T032 passes.

---

## Phase 8: User Story 7 — Use it comfortably on mobile (P2)

**Goal**: Single-column <640px layout, chip-bar, ≥44px targets, split working-hours, full-width auth/footer, arrow-button reorder.

**Independent Test**: At <640px everything from desktop is reachable and all interactive targets are ≥44px.

### Tests (write first, must FAIL)

- [x] T034 [P] [US7] Playwright tests (mobile viewport) in `tests/ui/settings-redesign.spec.js`: single-column layout, chip-bar present, 44px targets on switches/chips/arrow buttons/primary buttons, full-width auth/footer buttons, working-hours split

### Implementation

- [x] T035 [US7] Add the `@640px` responsive rules in `css/settings.css` (single column, chip-bar, full-width buttons, split working-hours, 44px targets) — consolidate any mobile rules added in earlier phases

**Checkpoint**: US7 testable; T034 passes.

---

## Phase 9: User Story 6 — Manage data & privacy safely (P3)

**Goal**: Daten & Datenschutz danger zone with privacy link + two confirmed destructive actions.

**Independent Test**: Card is danger-styled and separated; privacy link opens the policy; each destructive action confirms before acting and actually clears data/consent.

### Tests (write first, must FAIL)

- [x] T036 [P] [US6] Playwright tests in `tests/ui/settings-redesign.spec.js`: danger card present + separated; privacy link present; delete + withdraw require confirm and clear data/consent on confirm

### Implementation

- [x] T037 [US6] Move the existing delete-planning-data + AI-consent withdraw/grant controls into the danger-zone card markup in `settings.html`; add the privacy-policy link row; keep wiring from `js/settings-page.js` (`deletePlanningData`, `withdraw/recordPlanningAiConsent`) with confirm dialogs
- [x] T038 [US6] Danger-zone styles in `css/settings.css` (danger border, outline-danger buttons) using tokens; version + licenses footer line

**Checkpoint**: US6 testable; T036 passes.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [x] T039 [P] Extend the axe-core matrix to cover the redesigned settings surface in both themes in `tests/ui/` (Feature 033 a11y gate)
- [x] T040 [P] Add an explicit dark-mode contrast assertion with a purple CI fixture (`withConfig({ brandPrimary: '#6c2bd9' })`) verifying link + focus-ring ≥3:1 (D3)
- [x] T041 [P] Update user docs: `docs/content.en.md` and `docs/content.de.md` for the new settings behavior (instant-apply, explicit connect, source reorder, danger zone, theme in header)
- [x] T042 Complete the DSGVO impact checklist (`specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md`); update `privacy.html` (DE+EN) only if a trigger question is "Yes" (danger zone reorganizes existing delete/consent — likely no new processing); paste the completed block into the PR
- [x] T043 Coverage-gate promotion: run `npm run test:coverage`; if `source-order.js` / `settings-connection.js` reach per-file thresholds, remove them from the `exclude` array in `tests/vitest.config.js` with a comment; otherwise leave excluded
- [x] T044 Run full gates: `npm run lint && format:check && htmlhint && typecheck && knowledge:check && dup:check && test:coverage && sqi` (SQI ≥ 80) and fix any structural issues (no metric-gaming)
- [x] T045 Run `npm run test:ui` (full Playwright incl. axe) and the quickstart.md scenarios end-to-end — _UAT passed 2026-07-05: a11y.spec.js (15) + settings-redesign.spec.js (16) green; all 41 quickstart items verified. Two fixes applied during UAT (mobile chip-bar overflow, weekly-hours over-max message)._

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (P1)** → **Foundational (P2)** blocks everything → **User Stories (P3–P9)** → **Polish (P10)**.
- Token tasks T005/T006 precede all CSS that references them.
- T001 (config key) precedes T024 (source-order). T024 precedes T025/T027 (sources UI + planning-view consume).
- T018 (connection core) precedes T019/T021 and US5 (T033).

### User-story dependencies

- US1, US2, US3 (P1) independent of each other after Foundational.
- US4 independent (after Foundational).
- US5 depends on US2.
- US7 consolidates responsive rules — best after US1–US3 land their per-section mobile bits.
- US6 independent (after Foundational).

### Parallel opportunities

- Setup: T002/T003/T004 in parallel.
- Foundational: T009 (i18n) and T011 (announce) parallel to token/CSS work.
- Tests-first tasks across stories (T012, T016/T017, T022/T023, T029, T032, T034, T036) are `[P]` within their phase.
- Polish: T039/T040/T041 parallel.

---

## Implementation Strategy

### MVP (P1 stories)

1. Phase 1 Setup → Phase 2 Foundational (CRITICAL).
2. Phase 3 US1 (grouped layout + nav) → validate → demo (visible MVP).
3. Phase 4 US2 (connection) + Phase 5 US3 (reorder/#274) → validate each independently.

### Incremental delivery

Add US4 → US5 → US7 → US6, each independently testable, then Polish (a11y matrix, docs, DSGVO, gates).

---

## Notes

- `[P]` = different files, no incomplete dependency.
- Tests are written first and must fail before implementation (Constitution III).
- Keep new modules < 500 effective LOC and functions ≤ 60 LOC; colors via `var()` only.
- Commit after each task or logical group; push uses `--no-verify` locally until issue #283 (CRLF) lands.
