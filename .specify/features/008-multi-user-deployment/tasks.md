# Tasks: Multi-User Deployment & Security Hardening

**Input**: Design documents from `.specify/features/008-multi-user-deployment/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Manual acceptance tests via quickstart.md (no automated tests — see plan.md Complexity Tracking).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create new files and project structure needed for this feature

- [ ] T001 Create `config.json.example` in project root with documented schema (redmineUrl, redmineServerUrl, aiProvider, aiModel, aiApiKey, aiProxyUrl)
- [ ] T002 Create `js/crypto.js` with Web Crypto API helpers: `getOrCreateKey()` (AES-GCM-256, non-exportable, IndexedDB store `redmine_calendar_keystore`), `encrypt(plaintext)`, `decrypt(ciphertext)` — returns `{ iv, ciphertext }` base64 format

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Add config.json loading to `js/settings.js`: export async `loadCentralConfig()` that fetches `/config.json`, parses JSON, validates required fields (`redmineUrl`), and returns the config object. On 404 or parse error, throw with a descriptive message.
- [ ] T004 Rewrite credential storage in `js/settings.js`: replace `readConfig()`/`writeConfig()` cookie functions with `readCredentials()`/`writeCredentials()` that use `js/crypto.js` to encrypt/decrypt credentials in localStorage key `redmine_calendar_credentials`. Keep `readWorkingHours()`/`writeWorkingHours()`/`clearWorkingHours()` unchanged.
- [ ] T005 Add new i18n keys to `js/i18n.js` for: config.json errors (missing, malformed, missing required fields), setup screen instructions (what is an API key, where to find it in Redmine), credential decryption failure message, read-only admin field labels

**Checkpoint**: Foundation ready — crypto module, config loading, and encrypted credential storage in place

---

## Phase 3: User Story 1 — Employee Accesses the Tool (Priority: P1) 🎯 MVP

**Goal**: An employee opens the tool, enters their Redmine API key once, and can log time against their own Redmine account.

**Independent Test**: Open the tool URL, enter a Redmine API key, verify time entries load for that user. Reopen browser — verify calendar loads without re-entering the key.

### Implementation for User Story 1

- [ ] T006 [US1] Update `js/redmine-api.js` `request()` function: instead of calling `readConfig()` (cookie-based), call `loadCentralConfig()` for the proxy URL and `readCredentials()` for the API key/auth. Merge both into the request headers.
- [ ] T007 [US1] Update `js/calendar.js` startup: load `config.json` via `loadCentralConfig()` before initializing FullCalendar. If config loading fails, show error banner. If no credentials found, redirect to settings.
- [ ] T008 [US1] Update `settings.html` form: remove Redmine URL field from user input (will be read-only from config.json). Keep API key field, auth type toggle, and personal preferences (working hours).
- [ ] T009 [US1] Update `js/settings.js` settings page wiring: on page load, call `loadCentralConfig()` and display Redmine URL as read-only text. Load existing encrypted credentials into form fields (decrypted). On submit, validate API key, encrypt credentials via `writeCredentials()`, verify against Redmine, then redirect to calendar.
- [ ] T010 [US1] Handle credential decryption failure in `js/settings.js`: if `readCredentials()` throws (IndexedDB key lost, corrupt data), clear stored credentials and show a message asking the user to re-enter their API key.

**Checkpoint**: User Story 1 complete — employees can access the tool with their own API key, credentials encrypted at rest

---

## Phase 4: User Story 2 — Administrator Configures the Shared Instance (Priority: P2)

**Goal**: An admin sets up `config.json` once; employees see admin settings pre-filled and non-editable.

**Independent Test**: Create `config.json` with Redmine URL, open the tool, verify URL is pre-filled and not editable. Update `config.json`, reload, verify change is reflected. Delete `config.json`, verify error message.

### Implementation for User Story 2

- [ ] T011 [US2] Display admin config as read-only in `settings.html`: add a read-only info section showing Redmine URL, CORS proxy URL, and AI settings from `config.json`. Style with CSS to distinguish from editable fields.
- [ ] T012 [US2] Add error page handling in `js/calendar.js` and `js/settings.js`: when `config.json` is missing or malformed, display a full-page error message (not just a banner) with instructions for the administrator to create the file. Reference `config.json.example`.
- [ ] T013 [US2] Update `css/style.css`: add styles for read-only admin config display and config-error page

**Checkpoint**: User Story 2 complete — admin can configure the shared instance via config.json, users see it as read-only

---

## Phase 5: User Story 3 — Self-Service Onboarding (Priority: P3)

**Goal**: A first-time employee can set up the tool and log their first time entry without IT help.

**Independent Test**: Open the tool with no saved credentials, verify clear setup instructions appear, complete setup and log one time entry in under 3 minutes.

### Implementation for User Story 3

- [ ] T014 [US3] Create first-time setup screen in `settings.html`: when no credentials are stored, show a guided setup view explaining what the Redmine API key is, where to find it in Redmine (with a link to the Redmine "My account" page using the URL from config.json), and a single input field for the key.
- [ ] T015 [US3] Add setup flow logic in `js/settings.js`: detect first-time vs returning user. First-time users see the guided setup view. Returning users see the normal settings form with their existing (decrypted) credentials pre-filled.

**Checkpoint**: User Story 3 complete — new employees can onboard themselves without IT help

---

## Phase 6: User Story 4 — Credentials Protected at Rest (Priority: P4)

**Goal**: Credentials are encrypted in the browser; not visible in DevTools.

**Independent Test**: Save an API key, open DevTools → localStorage, verify ciphertext (not plain text). Check IndexedDB — verify key shows as `[CryptoKey]`.

### Implementation for User Story 4

- [ ] T016 [US4] Remove all cookie-based credential storage from `js/settings.js`: delete the `redmine_calendar_config` cookie reading/writing code. Remove `COOKIE_NAME` from `js/config.js` if no longer used. Ensure no credentials are written to cookies anywhere.
- [ ] T017 [US4] Update `js/settings.js` API key field: render as `type="password"` with a show/hide toggle button. Add i18n keys for toggle label.
- [ ] T018 [US4] Audit all files for plain-text credential leaks: grep for `console.log`, `console.debug`, and any logging that might expose API keys, passwords, or tokens. Remove or redact any found.

**Checkpoint**: User Story 4 complete — all credentials encrypted at rest, no plain-text leaks

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T019 [P] Update AI chatbot integration in `js/chatbot.js`: read AI config (provider, model, API key, proxy URL) from `config.json` via `loadCentralConfig()` instead of from the user cookie. Remove AI API key input from settings form.
- [ ] T020 [P] Update `README.md` with deployment instructions: local development setup (npm run serve + local CORS proxy), company hosting setup (static file server + shared CORS proxy + config.json), config.json documentation with all fields explained
- [ ] T021 Remove obsolete code: delete any remaining references to the old cookie-based config pattern, unused imports of `COOKIE_NAME`, `PROXY_PORT`, `AI_PROXY_PORT` constants if replaced by config.json values. Clean up `js/config.js`.
- [ ] T022 Run quickstart.md acceptance tests: execute all checklist items in `.specify/features/008-multi-user-deployment/quickstart.md` to validate the full feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T002 needed by T004) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — first MVP increment
- **User Story 2 (Phase 4)**: Depends on Phase 2 — can start after Phase 2, independent of US1
- **User Story 3 (Phase 5)**: Depends on Phase 3 (needs the settings form from US1)
- **User Story 4 (Phase 6)**: Depends on Phase 3 (needs encrypted storage from US1 working)
- **Polish (Phase 7)**: Depends on all user stories being complete

### Within Each User Story

- Core implementation before integration
- Story complete before moving to next priority (recommended sequential: US1 → US2 → US3 → US4)

### Parallel Opportunities

- T001 and T002 can run in parallel (Phase 1)
- T003, T004, T005 can run in parallel within Phase 2 (different files)
- T019 and T020 can run in parallel (Phase 7)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T005)
3. Complete Phase 3: User Story 1 (T006–T010)
4. **STOP and VALIDATE**: Test US1 independently — can an employee log in and use the calendar?
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test → MVP deployed
3. Add US2 → Test → Admin config working
4. Add US3 → Test → Self-service onboarding
5. Add US4 → Test → Security hardened
6. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No automated tests — manual acceptance via quickstart.md
- Commit after each task: `T0XX: <description>`
- The old cookie-based settings flow is fully replaced (no backward compatibility)
