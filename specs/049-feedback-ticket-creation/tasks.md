# Tasks: Feedback — Create Ticket Instead of Sending Email

**Input**: Design documents from `specs/049-feedback-ticket-creation/`

**Branch**: `049-feedback-ticket-creation`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/feedback-ticket.md ✓, quickstart.md ✓

**Tests**: Included (SC-006 in spec.md explicitly requires automated unit test coverage for both submission paths; Playwright UI tests required for the opt-in dialog flow.)

**Organization**: Tasks grouped by user story. US1 (Redmine path) delivers an independently functional MVP; US2 (GitHub path) adds the second channel; US3 (consent checkbox) gates context collection on both paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no pending dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type contracts and module-registry updates that unblock all phases.

- [x] T001 Extend `js/types.d.ts`: add `FeedbackConfig` interface; add `feedback?: FeedbackConfig` to `CentralConfig`; add `contextEnabled: boolean` and `SanitizedNetworkEntry` to `FeedbackReport`; remove `feedbackEmail` from `FeedbackReport`; add `TicketOutcome` union type (per `data-model.md`)
- [x] T002 [P] Update `js/knowledge.topics.json`: add `feedback-ticket.js` to the `feedback` topic; remove `feedback-email.js` from any topic entries

**Checkpoint**: Type contracts in place; knowledge routing updated. No functionality changes yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared capabilities that US1, US2, and US3 all require.

**⚠️ CRITICAL**: No user story phase can begin until T003–T006 are complete.

- [x] T003 Add `sanitizeNetworkUrl(url: string): string` export to `js/feedback-context.js`: strip query string and fragment from the URL, keeping only `scheme://host/path`; fall back to the input unchanged when `new URL(url)` throws. Add node Vitest unit tests in `tests/unit/feedback-context.test.js` covering: strips `?query`, strips `#fragment`, strips both combined, passes through non-parseable input unchanged.
- [x] T004 [P] Extend `js/notify.js` `showToast(message, { href } = {})`: when `href` is provided, clear the toast element and append a DOM-constructed `<a href="…" target="_blank">` containing the message text (no `innerHTML` — use `createElement('a')` + `.href` + `.textContent`). All existing call sites pass no second argument and are unaffected. Update the JSDoc signature.
- [x] T005 [P] Add all new i18n keys to `js/i18n/en.js`: `feedback.consent_checkbox`, `feedback.consent_warning`, `feedback.config_missing`, `feedback.creating_ticket`, `feedback.ticket_created`, `feedback.github_form_opened`, `feedback.screenshot_manual_note`, `feedback.upload_failed_partial`, `feedback.fallback_title`. Use placeholder values for `de.js` (matching EN) — German translations are completed in T005b.
- [x] T005b [P] Add all new i18n keys to `js/i18n/de.js` with correct German translations (see research.md §i18n Keys Required for the list). Must be run in parallel with or after T005.
- [x] T006 Delete `js/feedback-email.js` (FR-011 — email body builder no longer used). Remove its import and re-export from `js/feedback.js` (lines 13–14 of current `feedback.js`). Remove the `_openMailto` function and the `isMsalSignedIn`/`sendFeedbackEmail` imports from `outlook.js` in `feedback.js`.

**Checkpoint**: Foundation ready — type contracts, URL sanitizer, toast extension, i18n strings, and email-path removal are complete. US1 / US2 / US3 implementation can now begin.

---

## Phase 3: User Story 1 — Redmine Ticket Creation (Priority: P1) 🎯 MVP

**Goal**: Users can submit feedback and receive a Redmine issue with a clickable ticket link. No consent checkbox yet; context is included if `report.contextEnabled` is true (wired up in US3 phase).

**Independent Test**: Configure `config.json` with `"feedback": { "system": "redmine", "redmineProjectId": <id> }`, submit feedback with the context checkbox absent (base integration only), verify a Redmine issue is created, and a success toast with a link appears.

### Unit Tests for User Story 1

- [x] T007 [P] [US1] Write Vitest unit tests (jsdom) in `tests/unit/feedback-ticket.test.js` — RED before implementation:
  - `buildRedmineIssueBody` with `contextEnabled = false`: output contains description, contains Environment section, does NOT contain Error Log / Network Log / App Log / Calendar State sections
  - `buildRedmineIssueBody` with `contextEnabled = true`: all sections present; network log URLs are sanitized (no query strings)
  - `createRedmineTicket` success path (mocked fetch: upload returns `{upload:{token:"tok"}}`, issue create returns `{issue:{id:42}}`): returns `{ ok: true, ticketUrl: '<redmineUrl>/issues/42' }`
  - `createRedmineTicket` upload failure: issue still created; returns `{ ok: true, ticketUrl }` (partial success)
  - `createRedmineTicket` issue creation failure (HTTP 422): returns `{ ok: false, message }`
  - `createRedmineTicket` network error: returns `{ ok: false, message }`

### Implementation for User Story 1

- [x] T008 [US1] Create `js/feedback-ticket.js` implementing (per `contracts/feedback-ticket.md`):
  - Private `_buildRedmineTitle(report)`: first line of description (max 255 chars), fallback to `t('feedback.fallback_title')`
  - Private `_buildRedmineBody(report)`: Markdown body per `data-model.md` template; calls `sanitizeNetworkUrl` for each network log entry; omits context sections when `report.contextEnabled = false`
  - Private `_uploadScreenshot(screenshotDataUrl, creds, cfg)`: decode base64 PNG to `Uint8Array`, POST to `<proxyUrl>/uploads.json` via `fetchWithRetry` with manually-built auth header (same logic as `buildAuthHeader` in `redmine-api.js` — ~5 lines); return upload token or `null` on failure
  - Export `buildRedmineIssueBody(report)` (pure, calls `_buildRedmineBody`)
  - Export `createRedmineTicket(report, cfg)` → `Promise<TicketOutcome>`: reads credentials via `readCredentials()`, uploads screenshot if `contextEnabled && screenshotDataUrl`, calls `request('issues.json', { method: 'POST', body: … })`, constructs ticket URL from `getCentralConfigSync().redmineUrl + '/issues/' + id`
- [x] T009 [US1] Modify `js/feedback.js` `_handleSubmit()`: replace the `if (isMsalSignedIn())` / `else _openMailto()` dispatch with: (1) read `cfg.feedback`; (2) show `t('feedback.config_missing')` error toast and return when `cfg.feedback` is absent; (3) dispatch to `createRedmineTicket` when `feedback.system === 'redmine'`; use `showToast(t('feedback.ticket_created'), { href: ticketUrl })` on success; use error toast + preserve description text on failure. Import `createRedmineTicket` from `./feedback-ticket.js`.
- [x] T010 [US1] Update `initFeedback()` in `js/feedback.js`: change the activation guard from `if (!cfg?.feedbackEmail) return` to `if (!cfg?.feedback && !cfg?.feedbackEmail) return` (backward-compatible guard per Decision 5 in research.md). The submit handler already handles the config-missing toast when only `feedbackEmail` is present but `feedback` is absent.

**Checkpoint**: Redmine path fully functional. Submit feedback → Redmine issue created → toast with clickable link. SC-001 and SC-002 satisfied.

---

## Phase 4: User Story 2 — GitHub Prefilled Form (Priority: P2)

**Goal**: When `feedback.system = "github"`, opening feedback and submitting opens GitHub's new-issue form in a new tab with title + body prefilled. No GitHub credential anywhere.

**Independent Test**: Configure `config.json` with `"feedback": { "system": "github", "githubOwner": "…", "githubRepo": "…" }`, submit feedback, verify new tab opens at `https://github.com/<owner>/<repo>/issues/new?title=…&body=…`, and a confirmation toast appears saying the form was opened.

### Unit Tests for User Story 2

- [x] T011 [P] [US2] Extend `tests/unit/feedback-ticket.test.js` — RED before implementation:
  - `buildGithubUrl` — basic: URL starts with `https://github.com/<owner>/<repo>/issues/new`, contains `?title=` and `&body=`
  - `buildGithubUrl` — body within budget: total URL length ≤ 7 800 characters
  - `buildGithubUrl` — truncation: when body is very long, result contains `[…truncated]` and length ≤ 7 800
  - `buildGithubUrl` — no credential: URL does not contain any token/key string
  - `buildGithubUrl` — contextEnabled = false: body does not contain log sections

### Implementation for User Story 2

- [x] T012 [US2] Add to `js/feedback-ticket.js`:
  - Private `_buildGithubBody(report)`: plain-text body per data-model.md GitHub template; calls `sanitizeNetworkUrl`; omits log sections when `contextEnabled = false`; appends screenshot-paste note when `contextEnabled = true`
  - Export `buildGithubUrl(report, cfg)` (pure): encodes title + body, truncates body at `MAX_GITHUB_URL = 7_800` total URL characters, appends `\n[…truncated]` before final encode when truncated, returns full prefilled URL string
  - Export `openGithubForm(report, cfg)`: calls `window.open(buildGithubUrl(report, cfg), '_blank')`
- [x] T013 [US2] Extend `js/feedback.js` `_handleSubmit()`: add `else if (feedback.system === 'github')` branch that calls `openGithubForm(report, cfg.feedback)` and shows `showToast(t('feedback.github_form_opened'))`. Must not claim a ticket was created (FR-008).

**Checkpoint**: GitHub path functional. Submit → new tab opens with prefilled form → confirmation toast. SC-003 and SC-004 satisfied.

---

## Phase 5: User Story 3 — Opt-in Consent Checkbox (Priority: P3)

**Goal**: The feedback dialog includes an opt-in checkbox (unchecked by default) adjacent to a plain-language disclosure warning. Checking it gates screenshot capture + log collection. When unchecked, only description text is included in any ticket.

**Independent Test**: Submit feedback with checkbox unchecked → Redmine issue contains only description text (no screenshot, no logs). Submit with checkbox checked → Redmine issue has screenshot attachment and all log sections. SC-008 must hold for both paths.

### Unit Tests for User Story 3

- [x] T014 [P] [US3] Add Playwright UI test in `tests/ui/feedback-ticket.spec.js`:
  - Context checkbox is unchecked on dialog open (default state)
  - Checking the checkbox shows the context preview `<details>` section
  - Unchecking re-hides the context preview
  - Disclosure warning text is visible whenever the checkbox is shown
  - Submit with checkbox unchecked → Redmine issue body has NO "Error Log" / "Network Log" sections (mock API)
  - Submit with checkbox checked → Redmine issue body DOES include log sections (mock API)
  - Submit with checkbox checked on GitHub path → prefilled body includes context text; screenshot-paste note present

### Implementation for User Story 3

- [x] T015 [US3] Add `_buildConsentCheckbox()` builder to `js/feedback.js`: returns `{ checkboxWrapper, checkbox, warning }` where `checkboxWrapper` is a `<div>` containing a labelled `<input type="checkbox">` and a `<p class="feedback-dialog__consent-warning">` with `t('feedback.consent_warning')`. The `<details>` context element is initially hidden (`hidden` attribute); `checkbox.addEventListener('change', …)` toggles its visibility.
- [x] T016 [US3] Integrate consent checkbox into `_buildDialog()` in `js/feedback.js`: insert the checkbox wrapper into the scroll container between the description field and the `<details>` element. Wire `_contextBody` visibility to the checkbox state so the context preview shows/hides on toggle.
- [x] T017 [US3] Update `_handleSubmit()` in `js/feedback.js` to build the `FeedbackReport` with `contextEnabled: _consentCheckbox.checked`. When `contextEnabled = false`, skip `collectBugContext()` / screenshot capture entirely — call `collectBaseContext()` without screenshot, and set `screenshotDataUrl: null`. The downstream `createRedmineTicket` and `buildGithubUrl` already respect `contextEnabled`.
- [x] T018 [US3] Reset consent checkbox on dialog close/cancel in `js/feedback.js` `cancelBtn` listener: add `_consentCheckbox.checked = false` and hide the `<details>` preview when the dialog is reset.

**Checkpoint**: All three user stories fully functional. SC-005, SC-007, SC-008, SC-009 satisfied.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, privacy notice, and final quality gates.

- [x] T019 [P] Update `docs/content.en.md`: add "Feedback Ticket Integration" section documenting the `config.json` `feedback` block (fields: `system`, `redmineProjectId`, `githubOwner`, `githubRepo`; example configs for both systems; note on DPA requirement for Redmine path). (FR-015)
- [x] T020 [P] Update `docs/content.de.md`: German translation of the same "Feedback-Ticket-Integration" section. (FR-015)
- [x] T021 Update `privacy.html` — English section: add "Feedback diagnostic context (optional)" to the data inventory (category, purpose, legal basis Art. 6(1)(a) GDPR — consent, retention = session only, recipients = admin-configured Redmine project or GitHub repository). Update "Data recipients" section with the new external ticket system. Update consent scope description. (DSGVO Q1, Q3, Q5)
- [x] T022 [P] Update `privacy.html` — German section: translate the same additions made in T021 into German. (DSGVO Q1, Q3, Q5)
- [x] T023 Verify `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and `npm run knowledge:check` all pass. Fix any ESLint `no-hardcoded-strings` violations (all new strings must go through `t()`). Verify `feedback-ticket.js` reaches the ≥ 95 % per-file coverage threshold and is removed from the `exclude` list in `tests/vitest.config.js` if previously excluded.
- [x] T024 Run the UAT checklist in `quickstart.md` scenarios 1–9. Mark passing items. Note any failures for a follow-up commit.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately. T001 and T002 are parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1. T003, T004, T005, T005b, T006 can run in parallel with each other once Phase 1 is done.
- **Phase 3 (US1)**: Depends on Phase 2 completion. T007 (tests) → T008 (module) → T009 (wiring) → T010 (guard). T007 can run parallel to T008 (write tests while setting up module scaffold).
- **Phase 4 (US2)**: Depends on Phase 2 completion. Can start in parallel with Phase 3 on the same `feedback-ticket.js` file — however, T008 and T012 both write to the same file, so they should run sequentially (T008 first, T012 extends). T011 (tests) can run parallel to T012.
- **Phase 5 (US3)**: Depends on Phase 3 + Phase 4 completion (`contextEnabled` flag is consumed by both). T014 (Playwright test) can be written before T015–T018 and run red first.
- **Phase 6 (Polish)**: Depends on Phase 5. T019 and T020 are parallel. T021 and T022 are parallel to each other and to T019/T020. T023 requires all implementation tasks complete. T024 requires T023 green.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3. Delivers independent MVP.
- **US2 (P2)**: Can start after Phase 2 — shares `feedback-ticket.js` with US1 (T008 first, then T012).
- **US3 (P3)**: Depends on US1 + US2 completion — adds the consent gate on top of both delivery paths.

### Parallel Opportunities

Within Phase 2 (all parallel after Phase 1):

```
T003 (sanitizeNetworkUrl) ─┐
T004 (showToast)           ├─ run together
T005 + T005b (i18n)        ┤
T006 (delete email path)   ┘
```

Within Phase 3 (US1):

```
T007 (unit tests — write first, red) → T008 → T009 → T010
```

Within Phase 4 (US2, starts after Phase 2; T011 parallel to T012):

```
T011 (unit tests — red) ─┐
T012 (implementation)    ┘ → T013
```

Within Phase 6 (all parallel except T023 and T024):

```
T019 + T020 (docs)  ─┐
T021 + T022 (privacy)┘ → T023 (quality gates) → T024 (UAT)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006)
3. Complete Phase 3: US1 Redmine path (T007–T010)
4. **STOP and VALIDATE**: submit feedback → Redmine issue created → toast with link
5. Ship if time-critical; continue to US2 and US3 for full feature

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → Redmine path working → **Demo/Deploy (MVP)**
3. Phase 4 (US2) → GitHub path working → **Demo/Deploy**
4. Phase 5 (US3) → Consent checkbox working → **Demo/Deploy**
5. Phase 6 → Polish, documentation, UAT → **PR ready for review**

### Commit Strategy

- Commit after Phase 2 (foundation clean)
- Commit after each user story phase passes its independent test
- Commit after Phase 6 (all quality gates green, UAT passes)

---

## Notes

- `[P]` tasks = different files, no pending dependencies between them
- `[Story]` label maps each task to its user story for traceability
- Tests marked as first steps in each story phase MUST run RED before implementation
- The `contextEnabled` flag is the key connector: set in `_handleSubmit`, consumed by `createRedmineTicket` and `buildGithubUrl`
- `feedback-email.js` deletion (T006) will break the existing `_buildHtmlBody` re-export in `feedback.js` — T006 must also patch that re-export removal
- `feedback.js` is a DOM-heavy module (`@ts-nocheck`) — no JSDoc required; Playwright tests are the integration net
- `feedback-ticket.js` must carry full JSDoc on its exports (it is a pure-logic module with no DOM)

## Implementation notes (deviations from the plan, recorded for review)

- **T008 — upload via `request()`, not `fetchWithRetry`**: `redmine-api.js::request()` lets `options.headers` override the default `Content-Type`, so the binary `POST /uploads.json` reuses the shared `request()` client (overriding to `application/octet-stream`) instead of a separate `fetchWithRetry` call with a hand-built auth header. This removes the planned `_uploadScreenshot(creds, cfg)` auth-header duplication entirely (Constitution VII — reuse over re-implement). The screenshot data URL is wrapped in a `Blob` (a valid `BodyInit`, unlike a bare `Uint8Array` under the TS DOM lib).
- **T006 — full email removal**: beyond removing the imports from `feedback.js`, `sendFeedbackEmail`, `acquireFeedbackToken`, and the `FEEDBACK_SCOPES` (`Mail.Send`) constant were removed from `js/outlook.js`, and the corresponding `sendFeedbackEmail` describe block was removed from `tests/unit/outlook-extras.test.js` (FR-011 — no email machinery remains). `isMsalSignedIn` is retained in `outlook.js` (still used by the planning-view modules).
- **T014 — UI tests in the existing spec**: the Playwright assertions were added to the existing `tests/ui/feedback.spec.js` (fully rewritten for the ticket flow) rather than a new `feedback-ticket.spec.js`, since the old spec only covered the now-removed email path. Browser download is blocked in the dev sandbox, so the UI suite runs in GitHub CI (per the project testing architecture).
- **Extra coverage work**: added `tests/unit/notify.test.js` (the `showToast` `href` branch was previously only covered indirectly) to keep `notify.js` at the ≥ 95 % per-file gate.
