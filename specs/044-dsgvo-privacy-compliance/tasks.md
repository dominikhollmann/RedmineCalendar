# Tasks: DSGVO / GDPR Privacy Compliance for Planning Features

**Branch**: `044-dsgvo-privacy-compliance`

**Input**: Design documents from `/specs/044-dsgvo-privacy-compliance/`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[Story]**: Maps to user story (US1–US4 from spec.md)
- Exact file paths are included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add new storage key constants and admin config accessors that every subsequent phase depends on.

- [x] T001 Add `STORAGE_KEY_AI_CONSENT = 'redmine_calendar_ai_consent'` and `STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX = 'redmine_calendar_planning_snapshot_'` constants to `js/config.js`
- [x] T002 Add `getPrivacyControllerName()`, `getPrivacyControllerEmail()`, `getPrivacyDpoEmail()`, `getPlanningDataRetentionDays()` getter exports to `js/config-store.js` (reads from loaded config; `planningDataRetentionDays` falls back to `30` if absent or invalid)
- [x] T003 [P] Add `privacyControllerName`, `privacyControllerEmail`, `privacyDpoEmail`, and `planningDataRetentionDays` test-fixture values to `tests/fixtures/config.json` (use `"Test Controller GmbH"`, `"privacy@test-controller.example"`, `"dpo@test-controller.example"`, `30`)

**Checkpoint**: Storage constants and config accessors in place — Phase 2 can begin.

---

## Phase 2: Foundational — `js/privacy-store.js` + Startup Hook

**Purpose**: Implement the pure-logic privacy module that all user stories consume. TDD: write tests first, verify they fail, then implement.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Write unit tests for all seven `js/privacy-store.js` exports in `tests/unit/privacy-store.test.js` — cover: initial state (no key → `hasPlanningAiConsent()` false), consent record creation, withdrawal, re-consent, deletion scope (planning keys removed; non-planning key untouched), data listing, retention cleanup (expired key removed; recent key kept; malformed `_writtenAt` handled gracefully). Tests MUST FAIL before T005–T008.
- [x] T005 [P] Create `js/privacy-store.js` module skeleton: ES module header, JSDoc types for `ConsentRecord` and the return types of all seven exports, imports of `STORAGE_KEY_AI_CONSENT` and `STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX` from `js/config.js`; stub bodies that throw `new Error('not implemented')` so T004 tests remain failing
- [x] T006 Implement `hasPlanningAiConsent()`, `recordPlanningAiConsent()`, `withdrawPlanningAiConsent()`, `getPlanningAiConsentRecord()` in `js/privacy-store.js` (state derivation rules from `data-model.md`: active consent = `consentedAt` set AND (`withdrawnAt` null OR `withdrawnAt < consentedAt`))
- [x] T007 Implement `deletePlanningData()` and `listPlanningData()` in `js/privacy-store.js` (enumerate all localStorage keys matching `STORAGE_KEY_AI_CONSENT` + `STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX*` + the three planning preference flags from `js/config.js`; `deletePlanningData` returns `{ removed: string[], errors: string[] }`; `listPlanningData` returns `Record<string, unknown>` of parsed values)
- [x] T008 Implement `runRetentionCleanup(retentionDays)` in `js/privacy-store.js` (enumerate `localStorage` keys matching `STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX*`; parse `_writtenAt`; remove if `Date.now() - Date.parse(_writtenAt) > retentionDays * 86400000`; skip keys with missing/invalid `_writtenAt`; return `{ removed: string[], error: Error | null }`)
- [x] T009 Add `js/privacy-store.js` to `js/knowledge.topics.json` under a `privacy` topic entry (or extend the nearest existing topic); verify `npm run knowledge:check` passes
- [x] T010 Add startup retention cleanup call to `js/calendar.js` in the `DOMContentLoaded` handler: `import { runRetentionCleanup } from './privacy-store.js'`; call `runRetentionCleanup(getPlanningDataRetentionDays())`; on `error` show a non-blocking toast via `showToast()` informing the user that stale planning data may remain (fail-open per FR-011)

**Checkpoint**: `npm test` (unit) green on `tests/unit/privacy-store.test.js`. All seven exports exercised. Foundation ready.

---

## Phase 3: User Story 1 — Privacy Notice Access (Priority: P1) 🎯 MVP

**Goal**: `privacy.html` reachable from the Settings footer; bilingual GDPR Art. 13 notice with admin-configured controller details and active retention period.

**Independent Test**: Open Settings → click "Privacy" / "Datenschutz" footer link → `privacy.html` loads without auth; page shows controller name from fixture config; switches locale correctly; no untranslated strings.

- [x] T011 [P] [US1] Write Playwright tests in `tests/ui/privacy.spec.js`: (a) footer link visible in `settings.html` and opens `privacy.html`; (b) page renders without console errors; (c) locale switches (EN/DE) produce fully-translated content; (d) controller name matches fixture value; (e) retention period `30` is visible on the page. Tests MUST FAIL before T014–T017.
- [x] T012 [P] [US1] Add English privacy UI chrome i18n keys to `js/i18n/en.js`: `privacy.link` (footer label), `privacy.title`, `privacy.intro`, `privacy.controller.heading`, `privacy.rights.heading`, `privacy.data.heading`, `privacy.retention.heading`, `privacy.ttdsg.heading`, `privacy.betriebsrat.heading`
- [x] T013 [P] [US1] Add German equivalents of the privacy i18n keys to `js/i18n/de.js` (`privacy.*` keys matching `en.js` additions from T012)
- [x] T014 [P] [US1] Add CSS for the privacy page card to `css/settings.css` (mirror the `.licenses-card` selector pattern used by `licenses.html`; add `.privacy-card` or reuse `.licenses-card` with a new class alias — whichever avoids duplication per Constitution VII)
- [x] T015 [US1] Create `privacy.html`: copy the structural template of `licenses.html` (same CSP `<meta>`, same dark-theme inline `<script>`, same `<link>` for `css/base.css` and `css/settings.css`, same `<main>` wrapper); replace content area with privacy-specific `data-i18n` headings for all Art. 13 GDPR fields; wire `<script type="module" src="js/privacy.js">`
- [x] T016 [US1] Create `js/privacy.js`: import `t`, `locale` from `./i18n.js`; import `getPrivacyControllerName`, `getPrivacyControllerEmail`, `getPrivacyDpoEmail`, `getPlanningDataRetentionDays` from `./config-store.js`; on `DOMContentLoaded` render: controller details, DPO email, retention period, GDPR Art. 13–17 fields for each planning data category, TTDSG § 25 decision (strictly necessary storage → no banner), Betriebsrat note (PC-activity and Teams-logging features gated via `config.json` flags)
- [x] T017 [US1] Add "Privacy" (`data-i18n="privacy.link"`) footer link to `settings.html` adjacent to the existing "Licenses" link inside `<footer class="settings-footer">` pointing to `href="privacy.html"`

**Checkpoint**: Playwright `privacy.spec.js` green. Footer link visible. `privacy.html` bilingual and complete.

---

## Phase 4: User Story 2 — Delete Planning Data (Priority: P2)

**Goal**: "Delete planning data" button in Settings removes all planning-specific storage keys with a confirmation prompt; leaves credential and non-planning preference keys intact; shows success or error notification.

**Independent Test**: Write a `redmine_calendar_ai_consent` test key → open Settings → click Delete → cancel → key still present → confirm → key gone; `redmine_calendar_credentials` key untouched; empty-state click completes gracefully.

- [x] T018 [P] [US2] Write Playwright tests in `tests/ui/settings-privacy.spec.js`: (a) delete button present in Settings; (b) cancel confirmation leaves keys intact; (c) confirm removes planning keys; (d) non-planning keys unaffected; (e) empty-state delete is graceful (no error). Tests MUST FAIL before T019–T021.
- [x] T019 [P] [US2] Add delete-section i18n keys to `js/i18n/en.js` and `js/i18n/de.js`: `settings.deleteData.heading`, `settings.deleteData.description`, `settings.deleteData.button`, `settings.deleteData.confirm`, `settings.deleteData.success`, `settings.deleteData.error`
- [x] T020 [US2] Add "Delete planning data" section to `settings.html`: heading, description paragraph (mention planning snapshots, consent record, preference flags), and a `<button id="delete-planning-data-btn" data-i18n="settings.deleteData.button">` inside the Settings page body
- [x] T021 [US2] Wire the delete button in `js/settings-page.js`: on click show a `confirm()` dialog (`t('settings.deleteData.confirm')`); if confirmed call `deletePlanningData()` from `js/privacy-store.js`; show `showToast(t('settings.deleteData.success'))` on success or `showToast(t('settings.deleteData.error'))` if `errors.length > 0`

**Checkpoint**: Playwright `settings-privacy.spec.js` tests (a)–(e) green. Delete flow end-to-end verified.

---

## Phase 5: User Story 3 — AI Consent Gate, Withdrawal & Art. 15 Data View (Priority: P2)

**Goal**: Hard consent gate before first planning-AI tool execution; consent modal names the AI provider and data categories; acknowledgement persists across reloads; withdrawal from Settings triggers re-prompt on next planning-AI call; collapsible "My stored planning data" section shows all planning storage keys.

**Independent Test**: Clear storage → trigger `book_outlook_day` chatbot tool → consent modal appears → decline cancels (no data transmitted) → trigger again → modal reappears → accept → action proceeds → reload → trigger again → no modal → open Settings → withdraw → trigger again → modal reappears.

- [x] T022 [P] [US3] Write Playwright tests in `tests/ui/chatbot-consent.spec.js`: (a) planning tool with no consent shows modal; (b) decline cancels tool execution; (c) accept stores consent and proceeds; (d) subsequent call skips modal; (e) withdrawal via Settings causes re-prompt. Tests MUST FAIL before T023–T027.
- [x] T023 [P] [US3] Add consent modal + data viewer i18n keys to `js/i18n/en.js` and `js/i18n/de.js`: `consent.modal.title`, `consent.modal.body` (names AI provider, data categories, purpose), `consent.modal.accept`, `consent.modal.decline`, `settings.consent.heading`, `settings.consent.status.active`, `settings.consent.status.none`, `settings.consent.withdraw`, `settings.dataViewer.heading`, `settings.dataViewer.empty`
- [x] T024 [US3] Add `PLANNING_TOOLS` Set and consent gate to `js/chatbot-tools.js`: define `const PLANNING_TOOLS = new Set(['book_outlook_day'])` at module scope; in `executeTool(name, input)`, before dispatching to the `book_outlook_day` case (and any other name in `PLANNING_TOOLS`), call `hasPlanningAiConsent()` from `js/privacy-store.js`; if `false` return `{ requiresConsent: true }` immediately without executing the tool
- [x] T025 [US3] Detect `requiresConsent` sentinel in `js/chatbot.js`: in the tool-result handler, check if the result is `{ requiresConsent: true }`; if so, display the consent disclosure modal (`consent.modal.*` i18n keys); on Accept call `recordPlanningAiConsent()` and re-invoke the tool call; on Decline update the chat with a cancellation message and do nothing further
- [x] T026 [US3] Add consent withdrawal toggle and collapsible "My stored planning data" section markup to `settings.html`: a consent status line with a "Withdraw" button (`id="withdraw-consent-btn"`); a `<details>` element (`id="planning-data-viewer"`) with `<summary data-i18n="settings.dataViewer.heading">` and an inner `<div id="planning-data-content">` for the rendered key/value list
- [x] T027 [US3] Wire consent withdrawal and data viewer in `js/settings-page.js`: on page load call `hasPlanningAiConsent()` and render the consent status label; on "Withdraw" button click call `withdrawPlanningAiConsent()` and refresh the status label; on `<details>` `toggle` event call `listPlanningData()` and render a `<table>` of keys + formatted values inside `#planning-data-content` (or show `t('settings.dataViewer.empty')` if the map is empty)

**Checkpoint**: Playwright `chatbot-consent.spec.js` and `settings-privacy.spec.js` data-viewer tests green. AI gate, consent persistence, withdrawal, and Art. 15 view verified end-to-end.

---

## Phase 6: User Story 4 — Cookie / Storage Banner (Priority: P3)

**Goal**: TTDSG § 25 legal decision documented in `privacy.html`; all current storage is strictly necessary → no banner required for v1.

**Independent Test**: `privacy.html` contains the TTDSG § 25 section with the "strictly necessary" rationale. (Verified by the existing Playwright test T011e.)

- [x] T028 [US4] In `js/privacy.js`, render a "Storage" section that states: all localStorage keys written by this app (credentials, preferences, consent record) qualify as technically strictly necessary under TTDSG § 25 Abs. 2 Nr. 2 for the provision of the service explicitly requested by the user; no separate cookie consent banner is therefore required; this determination is reviewed whenever a new non-essential storage mechanism is introduced (reference the DSGVO impact checklist)

**Checkpoint**: `privacy.html` storage-decision section visible. Playwright `privacy.spec.js` passes with no regressions.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, quality gates, final UAT.

- [x] T029 [P] Update `docs/content.en.md` to document the three new user-facing features: (a) Privacy footer link in Settings, (b) Delete planning data action, (c) AI data-sharing consent gate and withdrawal
- [x] T030 [P] Update `docs/content.de.md` with German equivalents of the T029 documentation additions
- [x] T031 Run `npm run lint && npm run typecheck && npm run test:coverage && npm run sqi` and resolve any regressions; confirm SQI composite remains ≥ 80 GREEN; confirm no new ESLint warnings; confirm `npm run knowledge:check` and `npm run dup:check` pass
- [x] T032 Run the full Playwright suite `npm run test:ui` and verify all tests green (including the three new spec files from T011, T018, T022); fix any regressions in existing tests before marking the feature complete

**Checkpoint**: All CI gates pass locally. Feature ready for UAT (`/speckit-uat-run`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T001–T003 are independent and can run in parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001 for config.js constants, T002 for config-store.js accessors). T004 (unit tests) must be written and verified to fail before T005–T008. T005 can start in parallel with T004. T009–T010 can start once T005 skeleton exists.
- **Phase 3 (US1)**: Depends on Phase 2 completion (privacy-store.js implemented + tests green). T011–T014 can run in parallel. T015 depends on T012+T013 (i18n keys). T016 depends on T015 (page must exist). T017 (footer link) depends on T015+T016.
- **Phase 4 (US2)**: Depends on Phase 2 (needs `deletePlanningData()`). T018 (tests) can start while Phase 3 is in progress. T019 in parallel with T018. T020 depends on T019 (i18n keys). T021 depends on T020 (DOM element must exist).
- **Phase 5 (US3)**: Depends on Phase 2 (needs `hasPlanningAiConsent()`, `recordPlanningAiConsent()`, `withdrawPlanningAiConsent()`, `listPlanningData()`). T022+T023 in parallel. T024 depends on T023 (i18n for any error messages). T025 depends on T024 (needs `PLANNING_TOOLS` + sentinel). T026–T027 are independent of T024–T025.
- **Phase 6 (US4)**: Depends on T016 (js/privacy.js must exist to add content).
- **Phase 7 (Polish)**: Depends on all user story phases complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 complete. No dependency on other user stories.
- **US2 (P2)**: Can start after Phase 2 complete. Independent of US1 (different DOM sections + different privacy-store exports).
- **US3 (P2)**: Can start after Phase 2 complete. The consent withdrawal UI in settings.html coexists with US2's delete section — add to the same Settings page but different DOM sections.
- **US4 (P3)**: Depends on T016 (js/privacy.js) from US1 being created. Single content addition.

### Parallel Opportunities

- T001, T002, T003 — all Phase 1 setup tasks can run in parallel.
- T004 (writing unit tests) can overlap with T005 (skeleton): write the test file while the skeleton is being created.
- T011, T012, T013, T014 — i18n + CSS tasks for US1 can all run in parallel.
- T018, T019 — US2 test + i18n can run in parallel.
- T022, T023 — US3 test + i18n can run in parallel.
- T029, T030 — docs updates can run in parallel.

---

## Parallel Example: Phase 2 (Foundational)

```text
Start in parallel:
  Task T004: Write unit tests for privacy-store.js in tests/unit/privacy-store.test.js
  Task T005: Create js/privacy-store.js skeleton

After T004 confirmed failing and T005 skeleton in place:
  Task T006: Implement consent record functions (hasPlanningAiConsent, recordPlanningAiConsent, etc.)

After T006:
  Task T007: Implement deletePlanningData + listPlanningData
  Task T008: Implement runRetentionCleanup

After T005 skeleton (T009–T010 depend only on file existing):
  Task T009: Update js/knowledge.topics.json
  Task T010: Wire startup cleanup in js/calendar.js
```

## Parallel Example: Phase 3 (US1 — Privacy Notice)

```text
Start in parallel immediately (after Phase 2 done):
  Task T011: Write Playwright tests for privacy.html
  Task T012: Add EN i18n keys
  Task T013: Add DE i18n keys
  Task T014: Add CSS to settings.css

After T012 + T013:
  Task T015: Create privacy.html
  Task T016: Create js/privacy.js

After T015 + T016:
  Task T017: Add footer link to settings.html
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 (T001–T003) — ~30 min
2. Complete Phase 2 (T004–T010) — ~2 h (unit tests + privacy-store.js implementation)
3. Complete Phase 3 (T011–T017) — ~2 h (privacy.html + i18n + footer link)
4. **STOP and VALIDATE**: Run `npm run test:ui` on `privacy.spec.js`; manually verify `privacy.html` in both locales
5. MVP is a visible, navigable, bilingual privacy notice — legal compliance foundation in place

### Incremental Delivery

1. Phase 1 + 2 → `js/privacy-store.js` tested and green → Foundation
2. Phase 3 → `privacy.html` live → US1 done (P1 complete)
3. Phase 4 → Delete action wired → US2 done
4. Phase 5 → Consent gate active → US3 done
5. Phase 6 → TTDSG decision documented → US4 done (content addition to existing file)
6. Phase 7 → Docs + CI gates + UAT → Feature shippable

---

## Notes

- `[P]` tasks operate on different files and have no dependency on each other's completion; they can be executed concurrently.
- Unit tests (T004) MUST be written before implementation (T006–T008) and MUST fail when first run.
- Playwright tests (T011, T018, T022) should be written before their corresponding implementation phases and MUST fail until the implementation is in place.
- Commit after each task or logical group (e.g., "T006: implement consent record functions in js/privacy-store.js").
- The `[P]` i18n tasks (T012/T013, T019, T023) update different files (`en.js` vs `de.js`) and can be split between parallel agents if available.
- `privacy.html` must NOT use inline `style` attributes (HTMLHint `style-disabled` rule enforced in CI lint).
- All user-visible strings MUST use `data-i18n` attributes or `t()` calls — no hardcoded English strings in JS or HTML.
