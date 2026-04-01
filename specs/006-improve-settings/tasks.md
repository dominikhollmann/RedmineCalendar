# Tasks: Improve Settings Page

**Input**: Design documents from `/specs/006-improve-settings/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: No automated test tasks — manual acceptance checklist in `quickstart.md` (Constitution §III exception).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files / independent sections)
- **[Story]**: Which user story this task belongs to
- No story label = setup, foundational, or polish

---

## Phase 1: Setup

**Purpose**: Confirm working environment before touching code.

- [x] T001 Confirm current branch is `006-improve-settings` (run `git branch --show-current`); verify `settings.html`, `js/settings.js`, and `js/redmine-api.js` are the only files to be modified

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update `readConfig()` to accept the new `anonymous` auth type and optional `redmineServerUrl`. Every user story either calls `readConfig()` or assumes the cookie schema is valid — this must land first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Update `readConfig()` in `js/settings.js` to: (a) accept `authType: 'anonymous'` as a valid config (return the object even with no credentials), (b) keep backward-compat defaulting missing `authType` to `'apikey'`, and (c) tolerate a missing `redmineServerUrl` field (it is optional)

**Checkpoint**: `readConfig()` now returns a valid object for anonymous mode and does not reject configs without `redmineServerUrl`.

---

## Phase 3: User Story 1 — Redmine Server URL Field (Priority: P1) 🎯 MVP

**Goal**: User can enter the real Redmine server URL in settings. The page shows a dynamic proxy start command so the user never needs to edit `package.json`.

**Independent Test**: Enter a value in the "Redmine Server URL" field, save, reload settings — value is pre-filled. The command tip reflects the entered URL. See quickstart.md T001–T005.

- [x] T003 [P] [US1] Add a `redmineServerUrl` `<input type="url">` field with label "Redmine server URL" to `settings.html`, placed below the existing proxy URL field; add a `<div id="proxy-tip" class="settings-hint">` below it that will show the dynamic command tip (leave it empty for now — JS will populate it)
- [x] T004 [P] [US1] Add a `<p class="settings-hint">` hint above the proxy URL field in `settings.html` clarifying that the proxy URL is what the app uses for requests (e.g., "http://localhost:8010"), while the server URL is the real Redmine address used to start the proxy
- [x] T005 [US1] Update the pre-fill block in `js/settings.js` (lines 93–104) to always populate ALL stored fields regardless of active auth mode: set `serverUrlInput.value = existing.redmineServerUrl ?? ''`; also always populate `apiKeyInput`, `usernameInput`, and `passwordInput` from the cookie unconditionally (remove the if/else that only fills the active mode's fields); set the correct auth radio based on `existing.authType`
- [x] T006 [US1] In the submit handler in `js/settings.js`, read `redmineServerUrl` from the new `serverUrlInput` DOM element; update the command-tip div (`proxy-tip`) dynamically on every `input` event on `serverUrlInput` to show `lcp --proxyUrl {value} --port 8010`; include `redmineServerUrl` in the `cfg` object built before saving

**Checkpoint**: User Story 1 fully functional. Save + reload shows the server URL pre-filled. Command tip updates live as user types.

---

## Phase 4: User Story 2 — Conditional Auth Fields (Priority: P2)

**Goal**: Only the fields relevant to the selected auth mode are visible. All credentials are persisted across mode switches. Switching modes is instant.

**Independent Test**: Enter values in all three credential fields by switching modes; save; reload; switch modes — all values are pre-filled. See quickstart.md T006–T010.

- [x] T007 [US2] Add an "Anonymous Mode" `<label class="auth-option">` with `<input type="radio" name="authType" value="anonymous">` to the `.auth-toggle` div in `settings.html`, as the third option after "Username & Password"
- [x] T008 [US2] Update `updateAuthFields()` in `js/settings.js` to handle the `'anonymous'` case: when `type === 'anonymous'`, add `'hidden'` to both `fieldApiKey` and `fieldBasic`; remove `'hidden'` from both when neither applies (existing logic already handles `apikey` and `basic` — add the `anonymous` branch)
- [x] T009 [US2] In the submit handler in `js/settings.js`, change the `cfg` object construction to always include ALL credential fields regardless of which mode is active: `cfg = { redmineUrl, redmineServerUrl, authType, apiKey: apiKeyInput.value.trim(), username: usernameInput.value.trim(), password: passwordInput.value }` — keep the per-mode required-field validation before this (blank API key in apikey mode still blocks save, etc.)

**Checkpoint**: User Story 2 fully functional. Mode toggle shows/hides correct fields instantly. All credentials survive mode switches and page reloads.

---

## Phase 5: User Story 4 — Authentication Error Feedback (Priority: P2)

**Goal**: The config cookie is only written after successful credential verification. A failed verify shows an inline error and keeps the user on the settings page. The cookie is never written with bad credentials.

**Independent Test**: Enter a wrong API key, click Save — error message appears, page stays, cookie is NOT written. Fix the key, save again — succeeds. See quickstart.md T015–T020.

- [x] T010 [US4] Reorder the submit handler in `js/settings.js`: move `writeConfig(cfg)` to AFTER the `await getCurrentUser()` call succeeds; the order must be: (1) build `cfg`, (2) `saveBtn.disabled = true`, (3) `await getCurrentUser()`, (4) on success → `writeConfig(cfg)` → redirect; on 403 → `writeConfig(cfg)` → redirect; on other error → show error, re-enable button, do NOT call `writeConfig()`

**Checkpoint**: User Story 4 fully functional. Wrong credentials never persist in cookie.

---

## Phase 6: User Story 3 — Anonymous Mode (Priority: P3)

**Goal**: "Anonymous Mode" is a working auth option. No credentials are sent in API requests. Verification step is skipped on save.

**Independent Test**: Select Anonymous Mode, save — app redirects to calendar. Network tab shows no auth headers on API requests. See quickstart.md T011–T014.

- [x] T011 [US3] Update `request()` in `js/redmine-api.js`: add an `if (cfg.authType === 'anonymous')` branch that sets `authHeader = {}` (empty object, no auth headers); move it before the existing `if (cfg.authType === 'basic')` branch
- [x] T012 [US3] Update the submit handler in `js/settings.js`: add an early-exit path for `authType === 'anonymous'` that calls `writeConfig(cfg)` and immediately redirects to `index.html` without calling `getCurrentUser()`

**Checkpoint**: All four user stories are now independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T013 Execute `specs/006-improve-settings/quickstart.md` tests T001–T023 in full; check off each item; document any failures as bugs to fix before closing the feature
- [x] T014 [P] Update `specs/006-improve-settings/plan.md` Constitution Check section to mark post-design re-evaluation as complete (all five principles still pass)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2; T008 depends on T007
- **US4 (Phase 5)**: Depends on Phase 2; independent of US1/US2 but must run after Phase 4 since T009 (US2) changes the `cfg` object structure that T010 (US4) relies on
- **US3 (Phase 6)**: Depends on Phase 4 (needs the anonymous radio from T007)
- **Polish (Phase 7)**: Depends on all story phases

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational (T002)
- **US2 (P2)**: Depends only on Foundational (T002); T008 depends on T007 (HTML before JS)
- **US4 (P2)**: Depends on US2 completing first (shares the submit handler)
- **US3 (P3)**: Depends on US2 (needs anonymous radio button from T007)

### Files Touched

| File | Tasks |
|------|-------|
| `settings.html` | T003, T004, T007 |
| `js/settings.js` | T002, T005, T006, T008, T009, T010, T012 |
| `js/redmine-api.js` | T011 |

### Parallel Opportunities

- **T003 and T004** can be done together (both are HTML-only additions to `settings.html`)
- **T003/T004 and T002** can run in parallel (different files)
- **T005 and T006** are sequential (T005 restructures pre-fill; T006 adds submit logic on top)
- **T007 and T002** can run in parallel (different files)

---

## Parallel Example: US1 + Foundational

```
Start simultaneously:
  Task T002: Update readConfig() in js/settings.js
  Task T003: Add redmineServerUrl input + proxy-tip div to settings.html
  Task T004: Add clarifying hint above proxy URL field in settings.html

Then sequentially:
  T005 → T006
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: User Story 1 (T003–T006)
4. **STOP and VALIDATE**: quickstart.md T001–T005
5. Continue to US2

### Incremental Delivery

1. T001 → T002 → Foundation ready
2. T003–T006 → US1 done (server URL in settings, command tip)
3. T007–T009 → US2 done (conditional fields, all credentials persist)
4. T010 → US4 done (verify before write)
5. T011–T012 → US3 done (anonymous mode works end-to-end)
6. T013–T014 → Acceptance test + cleanup

---

## Notes

- [P] tasks = different files or independent sections with no ordering conflict
- All changes are confined to `settings.html`, `js/settings.js`, and `js/redmine-api.js`
- No new files needed
- Commit after each completed phase using format: `T00X: <description>`
- T002 is the critical unblocking task — get it right before touching UI
