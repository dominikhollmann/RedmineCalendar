# Tasks: User Feedback Button (037)

**Input**: Design documents from `specs/037-feedback-button/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Every implementation task that adds or changes behavior MUST include its own unit and/or UI tests. A task is not done until its tests exist and pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: CDN dependency registration and SBoM housekeeping — must precede HTML changes that load html2canvas.

- [x] T001 Add `html2canvas` v1.4.1 entry to `oss-manifest.json` under the `cdn` channel (license: MIT, source: `https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js`) and run `npm run oss:generate` to regenerate `sbom.json` and `attributions.json`; commit all three files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, translations, all session-collection primitives, and FullCalendar state export. MUST be complete before any user-story work begins — every phase depends on these.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [x] T002 [P] Extend `js/types.d.ts` with the five new interfaces (`FeedbackReport`, `SessionError`, `NetworkLogEntry`, `AppLogEntry`, `CalendarViewState`) and add the optional `feedbackEmail?: string` field to the existing `CentralConfig` interface, following the existing type-declaration style in that file

- [x] T003 [P] Add all `feedback.*` i18n keys to `js/i18n/en.js`: button label, dialog title, category labels ("Bug Report" / "Suggestion"), description placeholder, submit/cancel buttons, context section heading, screenshot unavailable message, sending/sent/send-failed toasts, validation messages (category required, description required), and section headings (Errors, Network Log, App Log, Environment, Calendar State, Storage); follow the existing key-grouping style

- [x] T004 [P] Add the same `feedback.*` keys in German to `js/i18n/de.js` (parallel with T003 — different file)

- [x] T005 Create `js/feedback-context.js` with `installFetchLog()`: wraps `window.fetch` with an idempotent proxy (guarded by a `_wrapped` flag) that records each request into a 20-entry ring buffer (`_networkLog`) storing `{ url, method, status, ms }`; exports `getNetworkLog()` to read a copy of the buffer; re-throws all errors unchanged so existing retry logic is unaffected; add unit tests in `tests/unit/feedback-context.test.js` covering: ring-buffer overflow (21st entry drops the first), failed-request `status: 0`, idempotency guard, and method uppercasing

- [x] T006 Add `installErrorLog()` and `log()` to `js/feedback-context.js`: `installErrorLog()` attaches `window.onerror` and `window.addEventListener('unhandledrejection')` listeners that push `{ message, stack, timestamp }` into a 10-entry `_errorLog` ring buffer; `log(level, message)` pushes `{ level, message, timestamp }` into a 50-entry `_appLog` ring buffer; export `getErrorLog()` and `getAppLog()`; add unit tests covering: ring-buffer limits for both buffers, `unhandledrejection` capture, and `log()` level values

- [x] T007 Add `getLocalStorageSnapshot()` to `js/feedback-context.js`: reads an explicit allowlist of 6 keys (`redmine_calendar_theme`, `redmine_calendar_view_mode`, `redmine_calendar_working_hours`, `redmine_calendar_weekly_hours`, `redmine_calendar_day_range`, `redmine_calendar_voice_privacy_dismissed`), returns a `Record<string, string>` containing only the keys that are present; add unit tests covering: all keys present, subset present, no keys present, and confirming `redmine_calendar_credentials` is never included even if explicitly in storage

- [x] T008 [P] Export `getCalendarViewState()` from `js/calendar.js` (or whichever sibling module holds the FullCalendar instance after the 035 split): returns `{ view: calendar.view.type, start: calendar.view.activeStart.toISOString().slice(0,10), end: calendar.view.activeEnd.toISOString().slice(0,10) }` when the calendar is initialized, or `null` when not; add unit tests covering: initialized state returns correct shape, uninitialized returns null

- [x] T009 Add `captureScreenshot()`, `collectBaseContext()`, and `collectBugContext()` to `js/feedback-context.js`: `captureScreenshot()` calls `html2canvas(document.body)` and returns `canvas.toDataURL('image/png')`, catching all errors and returning `null`; `collectBaseContext()` returns `{ pageUrl, userAgent, os, viewportWidth, viewportHeight, screenshotDataUrl }` synchronously (screenshot captured async and awaited); OS is extracted from `userAgent` using a simple string match for `Windows`, `Mac OS`, `Linux`, `iOS`, `Android`; `collectBugContext()` calls `collectBaseContext()` plus all ring-buffer getters, `getLocalStorageSnapshot()`, and an imported `getCalendarViewState()`; add unit tests for OS extraction (5 platforms + unknown fallback), `collectBaseContext()` shape, and `collectBugContext()` shape (with mocked sub-calls)

**Checkpoint**: All session collectors, ring buffers, and FullCalendar state export are in place and unit-tested. User-story implementation can now begin.

---

## Phase 3: User Story 1 — Bug Report with Auto-Collected Context (Priority: P1) 🎯 MVP

**Goal**: User clicks the button, selects "Bug Report", sees all diagnostic context auto-filled, submits, and feedback arrives as a rich HTML email with screenshot attachment via Office 365 (or falls back to a pre-filled mailto: if not signed in).

**Independent Test**: Trigger a JS error in DevTools, open the dialog, select Bug Report, verify all context sections are populated, submit — verify email arrives with screenshot attachment and all log sections (UAT scenarios 1 and 4).

- [ ] T010 [P] Extend `js/outlook.js` with three new exports: `isMsalSignedIn()` returns `true` if `getMsalInstance()?.getAllAccounts().length > 0`; `acquireFeedbackToken()` acquires a token with scope `['Mail.Send']` via silent-then-popup fallback (same pattern as `acquireToken()` but separate scope list); `sendFeedbackEmail(report)` posts to `https://graph.microsoft.com/v1.0/me/sendMail` with the JSON body defined in `contracts/graph-mail-api.md` — strips the `data:image/png;base64,` prefix from `report.screenshotDataUrl` before setting `contentBytes`, omits `attachments` array when screenshot is null; add unit tests covering: `isMsalSignedIn()` with 0 and 1 accounts, `sendFeedbackEmail()` builds correct JSON shape (mocked fetch), attachment omitted when screenshotDataUrl is null

- [ ] T011 [P] Add floating button CSS and dialog CSS to `css/style.css`: `.feedback-fab` — `position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9000; border-radius: 2rem; padding: .5rem 1rem` with hover/focus states; `.feedback-dialog` — modal dialog styles matching the existing `.modal` visual language; `.feedback-dialog__context` collapsible section, `.feedback-dialog__error` error message area, `.feedback-context__table` for network/storage tables, `.feedback-context__pre` for stack traces/logs; dark-mode variants via `[data-theme="dark"]` selector following the existing pattern in `css/style.css`

- [ ] T012 Create `js/feedback.js` with `initFeedback()`: imports `getCentralConfigSync` and checks for `feedbackEmail`; if absent, returns immediately without creating any DOM; otherwise injects `<button class="feedback-fab">` into `document.body` with the `t('feedback.button_label')` label and `aria-label`; add unit tests (mocked DOM) covering: no button when feedbackEmail absent, button created when present, button has correct aria-label

- [ ] T013 Add dialog HTML construction and `openFeedbackDialog()` to `js/feedback.js`: the `<dialog class="feedback-dialog">` contains a `<form>`: category `<select>` (Bug Report / Suggestion, required), `<textarea>` for description, collapsible `<details>` context section, error message `<p>`, Submit and Cancel `<button>`s; `openFeedbackDialog()` calls `collectBaseContext()` async (populates screenshot immediately), shows the dialog via `dialog.showModal()`; Cancel button calls `dialog.close()` and resets the form; Escape key handled natively by `<dialog>`; add unit tests covering: dialog element created in DOM, cancel resets form, dialog closes on cancel

- [ ] T014 Add Bug Report context section rendering to `js/feedback.js`: a `_renderBugContext(bugCtx)` helper builds the inner HTML of the `<details>` section for "Bug Report" — screenshot `<img>`, environment table (URL, user-agent, OS, viewport), errors list with `<pre>` stack traces, network log `<table>` (URL, method, status with failure highlight, ms), app log `<pre>`, localStorage `<table>`, calendar state; each sub-section is only rendered when data is present; all user-supplied strings (description text) are set via `textContent` not `innerHTML` to prevent XSS; add unit tests covering: screenshot img src set correctly, missing screenshot shows fallback text, empty errors list omits errors section, network failures highlighted, localStorage table shows only present keys

- [ ] T015 Add form validation and submit dispatch to `js/feedback.js`: `_handleSubmit(e)` prevents default, checks category selected (shows `t('feedback.category_required')`) and description non-empty (shows `t('feedback.description_required')`); if Bug Report calls `collectBugContext()` else `collectBaseContext()` for context; assembles `FeedbackReport` object; if `isMsalSignedIn()` calls `sendFeedbackEmail(report)` (async, shows sending state), else calls `_openMailto(report)`; on success: `dialog.close()` + `showToast(t('feedback.sent'))`; on failure: shows error message in dialog, preserves description text; add unit tests covering: empty category blocked, empty description blocked, correct context collector called per category, success path closes dialog, failure path preserves description

- [ ] T016 Add `_openMailto(report)` to `js/feedback.js`: builds a plain-text body containing category, description, identity, URL, user-agent, OS, viewport; URL-encodes subject and body; if total body exceeds 1800 characters, truncates with a `[…truncated]` note; opens via `window.open('mailto:…')`; dialog closes after opening (user reviews in mail client); add unit tests covering: subject contains category, body contains all base fields, truncation applied at 1800 chars, screenshot and log data NOT included in body

- [ ] T017 Add HTML email body builder `_buildHtmlBody(report)` to `js/feedback.js`: produces a self-contained HTML string following the section order in `contracts/graph-mail-api.md` (header badge → description → environment → screenshot → errors → network log → app log → calendar state → localStorage); uses a template-literal builder split into one helper per section (each helper ≤ 60 lines); all dynamic values escaped via a small `_esc(str)` helper (`str.replace(/&/g,'&amp;').replace(/</g,'&lt;')…`); this body is passed to `sendFeedbackEmail()`; add unit tests covering: XSS escape in description, network log table has correct row count, Bug Report includes all sections, Suggestion includes only header+description+environment+screenshot, screenshot section shows "unavailable" note when null

- [ ] T018 Wire `js/feedback.js` into both HTML pages: in `index.html` add the html2canvas CDN `<script>` tag after the existing CDN scripts and add `<script type="module" src="js/feedback.js"></script>` then call `initFeedback()` after `loadCentralConfig()` resolves; apply same changes to `settings.html`; add Playwright UI tests in `tests/ui/feedback.spec.js` for UAT scenario 1 (bug report full flow with Office 365 mocked) and UAT scenario 4 (button hidden when feedbackEmail absent from config)

**Checkpoint**: User Story 1 fully functional — button appears, dialog opens, Bug Report populates all context, Office 365 send and mailto fallback both work, button hidden when unconfigured.

---

## Phase 4: User Story 2 — Share an Improvement Idea (Priority: P2)

**Goal**: User selects "Suggestion", sees only screenshot in context section (no log sections), submits a lighter email body.

**Independent Test**: Open dialog, select Suggestion, verify error/network/localStorage/calendar sections are absent, submit — email body contains only description + screenshot + environment (UAT scenario 2).

- [ ] T019 Implement the Suggestion category branch in `js/feedback.js`: when "Suggestion" is selected, `_renderSuggestionContext(baseCtx)` renders the `<details>` section with only screenshot and environment (no errors, network log, app log, localStorage, calendar state); `_buildHtmlBody()` already handles this via the category flag — verify the Suggestion path omits log sections; the category `<select>` change event toggles between the two render functions, re-rendering the context section immediately on change; add unit tests covering: context section contains only screenshot + environment for Suggestion, switching from Bug to Suggestion hides log sections, switching back shows them again

- [ ] T020 Add Playwright UI tests for US2 in `tests/ui/feedback.spec.js`: UAT scenario 2 (suggestion flow — category switch, context shows screenshot only, submit sends lighter email), UAT scenario 2 cancel flow (dialog closes without submit, no email sent)

**Checkpoint**: User Stories 1 AND 2 both independently functional and tested.

---

## Phase 5: User Story 3 — Screenshot Capture Fails Gracefully (Priority: P3)

**Goal**: When html2canvas throws or the browser blocks capture, dialog still opens, shows "Screenshot unavailable", and submission completes successfully.

**Independent Test**: Simulate screenshot failure (mock `html2canvas` to throw), open dialog — context section shows "Screenshot unavailable", submit succeeds and email body notes the failure (UAT scenario 5).

- [ ] T021 Handle screenshot failure in `js/feedback-context.js` and `js/feedback.js`: `captureScreenshot()` already returns `null` on error (from T009); ensure `_renderBugContext()` and `_renderSuggestionContext()` show `t('feedback.screenshot_unavailable')` text instead of an `<img>` when `screenshotDataUrl` is null; `_buildHtmlBody()` already notes "Screenshot unavailable" in the screenshot section when null; `sendFeedbackEmail()` already omits the attachment when null; add unit tests covering: null screenshot renders unavailable text, submission without screenshot does not throw, email body contains unavailable note; add Playwright UI test for UAT scenario 5 (screenshot capture mocked to fail via `window._simulateScreenshotFailure` flag in test mode)

**Checkpoint**: All three user stories independently functional. Graceful degradation confirmed.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, settings-page verification, documentation, and final quality gate.

- [ ] T022 [P] Keyboard accessibility — audit `js/feedback.js` dialog for correct focus management: `dialog.showModal()` moves focus into the dialog automatically; verify tab order is category → description → Submit → Cancel; add a focus trap if needed (prevent Tab from escaping the open dialog); verify Escape closes the dialog (native `<dialog>` behaviour); add Playwright test for UAT scenario 6 (keyboard-only navigation through the full submit flow)

- [ ] T023 [P] Settings-page verification — confirm `initFeedback()` renders the button correctly on `settings.html` (no FullCalendar instance present, `getCalendarViewState()` returns null gracefully); add Playwright test for UAT scenario 7 (feedback button visible on settings page, dialog opens, screenshot shows settings page state)

- [ ] T024 Update `docs/content.en.md` and `docs/content.de.md` with a new "Give Feedback" section describing the floating button, the two categories (Bug Report vs Suggestion), what context is auto-collected for each, how the Office 365 send path differs from the mailto fallback, and how admins enable the button via `feedbackEmail` in `config.json`

- [ ] T025 Run full quality gate and fix any issues: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run sqi && npm run test:ui`; SQI composite must remain ≥ 80 GREEN; per-file unit coverage must be ≥ 95% for `js/feedback-context.js`; all Playwright scenarios must pass on both `index.html` and `settings.html`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (oss-manifest updated before HTML changes that load html2canvas)
- **Phase 3 (US1)**: Depends on Phase 2 complete — all collectors and types must exist
- **Phase 4 (US2)**: Depends on Phase 3 — Suggestion branch built on top of the same dialog
- **Phase 5 (US3)**: Depends on Phase 3 (screenshot path) — can overlap with Phase 4
- **Phase 6 (Polish)**: Depends on Phases 3–5 complete

### User Story Dependencies

- **US1 (P1)**: Requires foundational collectors — no dependency on US2/US3
- **US2 (P2)**: Requires US1's dialog infrastructure; independently testable once the category selector toggles context rendering
- **US3 (P3)**: Cross-cutting; depends on Phase 3 screenshot path being in place

### Within Phase 2 — Parallel Opportunities

```bash
# These can be launched together (different files):
T002  # types.d.ts
T003  # i18n/en.js
T004  # i18n/de.js
T008  # calendar.js (different from feedback-context.js)

# These are sequential (all write to js/feedback-context.js):
T005 → T006 → T007 → T009
```

### Within Phase 3 — Parallel Opportunities

```bash
# Different files — can start in parallel once Phase 2 is done:
T010  # outlook.js
T011  # css/style.css

# Sequential (all write to js/feedback.js):
T012 → T013 → T014 → T015 → T016 → T017 → T018
```

---

## Parallel Execution Example: Phase 2

```bash
# Stream 1 — feedback-context.js (sequential within stream):
T005: installFetchLog()
T006: installErrorLog() + log()
T007: getLocalStorageSnapshot()
T009: captureScreenshot() + collectBaseContext() + collectBugContext()

# Stream 2 — parallel with Stream 1 (different files):
T002: types.d.ts
T003: i18n/en.js
T004: i18n/de.js
T008: calendar.js → getCalendarViewState()
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: T001 (SBoM)
2. Phase 2: T002–T009 (all foundational)
3. Phase 3: T010–T018 (Bug Report full flow)
4. **STOP and VALIDATE**: Run UAT scenarios 1 and 4 from `quickstart.md`
5. Bug Report + button-hidden path fully operational

### Incremental Delivery

1. Phase 1+2+3 → Bug Report MVP, deploy
2. Phase 4 → Suggestion flow added, deploy
3. Phase 5 → Graceful degradation, deploy
4. Phase 6 → Polish + docs + quality gate, merge

---

## Notes

- `[P]` tasks touch different files and have no shared file dependencies within their phase
- Each task includes its own tests — a task is not done until tests pass
- Commit after each completed task with message format: `T00N: <description> (037)`
- `js/feedback-context.js` and `js/feedback.js` must each stay ≤ 500 LOC and all functions ≤ 60 lines (ESLint + SQI gates)
- SQI composite must remain ≥ 80 GREEN at every commit — run `npm run sqi` locally before pushing
- All user-visible strings must use `t('feedback.*')` — no hardcoded English in JS
