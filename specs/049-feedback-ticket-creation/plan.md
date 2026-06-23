# Implementation Plan: Feedback — Create Ticket Instead of Sending Email

**Branch**: `049-feedback-ticket-creation` | **Date**: 2026-06-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/049-feedback-ticket-creation/spec.md`

## Summary

Replace the existing email-based feedback delivery (MSAL/Graph email + `mailto:`
fallback) with a dual-channel ticket-creation flow. When the admin sets
`feedback.system = "redmine"` in `config.json`, the app creates a Redmine issue
via the existing stored API key — with an optional screenshot attachment and full
diagnostic logs. When `feedback.system = "github"`, the app opens GitHub's
prefilled new-issue form in a new tab with no GitHub credential involved. Diagnostic
context is strictly opt-in behind a checkbox that displays an explicit privacy
disclosure. Network log URLs are sanitized before inclusion in any ticket payload.
The email-related modules (`feedback-email.js`) and MSAL delivery paths are removed.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged

**Primary Dependencies**: FullCalendar v6 (CDN), MSAL.js v2 (CDN) — unchanged; MSAL import removed from `feedback.js` (no longer needed for feedback); **no new dependencies**

**Storage**: No new localStorage keys. `CentralConfig` extended with a `feedback` object field (read-only from `config.json`). The `feedbackEmail` field in `CentralConfig` remains as a no-op (silently ignored) for backward compatibility with legacy configs.

**Testing**: Vitest (node + jsdom unit) for `feedback-ticket.js` (pure ticket-creation logic) and `feedback-context.js` (URL sanitization); Playwright UI tests for the updated opt-in dialog flow and toast behaviour.

**Target Platform**: Static SPA in evergreen browsers — unchanged

**Project Type**: Single-project static front end (`js/**`, `css/**`)

**Performance Goals**: Redmine ticket creation ≤ 5 s on typical broadband (FR-001 acceptance scenario 1); no calendar render regression.

**Constraints**: Hard module-size cap 600 effective LOC (`tests/unit/module-size.test.js`); soft 500 (SQI). `max-lines-per-function: 60` on `js/**`. SQI composite ≥ 80. Per-file unit coverage ≥ 95 % where the module is on the coverage list.

**Scale/Scope**: Touches 6 source files (`feedback.js`, `feedback-context.js`, `feedback-ticket.js` [new], `feedback-email.js` [deleted], `types.d.ts`, `notify.js`), 4 content files (i18n EN/DE, docs EN/DE), and `privacy.html`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                               | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I — Redmine API Contract**            | ✓ New `feedback-ticket.js` calls Redmine's `/uploads.json` and `/issues.json` endpoints through the existing CORS proxy, using the same `request()` helper from `redmine-api.js` with the same `X-Redmine-API-Key`/Basic auth header. No direct DB access; no new auth surface. The upload step uses a raw `fetch` (binary body — multipart not supported by Redmine's upload endpoint) followed by `request()` for issue creation.                                                |
| **II — Calendar-First UX**              | ✓ Feedback is a side-panel feature entirely outside the calendar render path. The `<dialog>` and submission flow do not touch FullCalendar state. No render-performance impact.                                                                                                                                                                                                                                                                                                    |
| **III — Test-First TDD**                | ✓ `feedback-ticket.js` (Redmine API calls + GitHub URL builder) is pure async logic testable in jsdom/node Vitest with mocked `fetch`. `sanitizeNetworkUrl()` in `feedback-context.js` is a pure function — node unit test first. Playwright covers the dialog opt-in checkbox, disclosure warning, and the two toast variants (success link vs. GitHub form-opened).                                                                                                              |
| **IV — Simplicity / YAGNI**             | ✓ One new module (`feedback-ticket.js`, ~120 eff-LOC) does exactly what the spec requires. No abstraction layers, no plugin system, no support for future ticket systems (JIRA/Linear explicitly out of scope). Removing `feedback-email.js` is a net reduction. `showToast()` in `notify.js` is extended with an optional `href` parameter (DOM-constructed `<a>` — no innerHTML) rather than a new helper function.                                                              |
| **V — Security by Default**             | ✓ No GitHub credential anywhere; GitHub path is a prefilled URL constructed client-side. Redmine path reuses existing stored API key — never logged, never in the ticket body (it travels in a request header). Network log sanitization (FR-013) strips query strings/fragments so search terms and record IDs are not captured. localStorage snapshot is allowlist-based, already excludes `redmine_calendar_credentials`. Screenshot is gated by explicit consent + disclosure. |
| **VI — Continuous Quality Gates**       | ✓ `feedback-ticket.js` added to `knowledge.topics.json`; `feedback-email.js` removed from it. Unit coverage gate extended to cover `feedback-ticket.js`. `dup:check` baseline unaffected (net code reduction).                                                                                                                                                                                                                                                                     |
| **VII — Reuse Before Reimplementation** | ✓ Reuses `request()` from `redmine-api.js` for Redmine issue creation; `fetchWithRetry()` from `http.js` for the binary upload step; `getCentralConfigSync()` from `config-store.js`; `showToast()` from `notify.js` (extended, not forked). No duplicate delivery logic — one module owns all ticket-channel dispatch. See Wiederverwendungs-Audit below.                                                                                                                         |

**Initial Constitution Check: PASS** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/049-feedback-ticket-creation/
├── plan.md              # This file
├── research.md          # Phase 0 — unknowns resolved, design decisions recorded
├── data-model.md        # Phase 1 — FeedbackConfig type, payload shapes, sanitization contract
├── quickstart.md        # Phase 1 — UAT validation guide
├── contracts/           # Phase 1 — feedback-ticket.js module contract
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (affected files)

```text
js/
├── feedback-ticket.js   # NEW — Redmine API ticket creation + GitHub prefilled URL builder
├── feedback.js          # MODIFIED — remove email/MSAL imports; add opt-in checkbox +
│                        #   disclosure warning; dispatch to feedback-ticket.js
├── feedback-context.js  # MODIFIED — add sanitizeNetworkUrl() export (FR-013)
├── feedback-email.js    # DELETED — email body builder (FR-011)
├── notify.js            # MODIFIED — showToast() extended with optional href param
├── types.d.ts           # MODIFIED — add FeedbackConfig interface; add feedback? to
│                        #   CentralConfig; remove feedbackEmail from FeedbackReport
├── i18n/en.js           # MODIFIED — new strings (consent warning, toasts, checkbox label, …)
└── i18n/de.js           # MODIFIED — German translations for all new strings

docs/
├── content.en.md        # MODIFIED — config.json feedback block admin documentation
└── content.de.md        # MODIFIED — German version

privacy.html             # MODIFIED — new data recipient (ticket system), updated consent scope
```

## Wiederverwendungs-Audit

| Capability needed                       | Existing asset                                                       | Decision                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Authenticated Redmine API call          | `redmine-api.js::request()`                                          | **REUSE** — call `request('issues.json', { method: 'POST', body })`                                         |
| Network retry + backoff                 | `http.js::fetchWithRetry()`                                          | **REUSE** — wrap binary upload `fetch` in `fetchWithRetry`                                                  |
| CORS proxy base URL + origin formatting | `config-store.js::getCentralConfigSync()` + `http.js::httpsOrigin()` | **REUSE** — same pattern as `redmine-api.js`                                                                |
| Config read                             | `config-store.js::getCentralConfigSync()`                            | **REUSE**                                                                                                   |
| Success/error toast                     | `notify.js::showToast()`                                             | **EXTEND** — add optional `href` for Redmine ticket link (DOM-constructed `<a>`, no innerHTML); no fork     |
| Diagnostic context collection           | `feedback-context.js` (existing ring buffers)                        | **REUSE** — call existing `collectBugContext()` / `collectBaseContext()`; add `sanitizeNetworkUrl()` inline |
| Screenshot capture                      | `feedback-context.js::captureScreenshotTab()`                        | **REUSE** — no change                                                                                       |
| i18n string lookup                      | `js/i18n.js::t()`                                                    | **REUSE**                                                                                                   |

Nothing in this feature is re-implemented from scratch that already exists.

## Complexity Tracking

> No Constitution violations to justify.

## Phase 0 — Research

All unknowns are resolved by reading the existing source before writing the plan.
No code changes in Phase 0; the output is `research.md`.

### Decision 1 — Redmine screenshot upload mechanism

Redmine's upload endpoint `POST /uploads.json` accepts a raw binary body
(`Content-Type: application/octet-stream`) and returns `{"upload":{"token":"…"}}`.
The token is then referenced in the issue-create payload:

```json
{ "issue": { …, "uploads": [{ "token": "…", "filename": "screenshot.png", "content_type": "image/png" }] } }
```

The screenshot data URL (`data:image/png;base64,…`) is converted to a `Uint8Array` via
`atob()` + `Uint8Array.from()` before posting.

The upload endpoint is distinct from the standard `request()` helper (which uses
`application/json`). The binary upload uses `fetchWithRetry` directly (same retry
semantics) with a manually-built auth header — extracted from a local helper in
`feedback-ticket.js`, not from `redmine-api.js` internals (which does not export
`buildAuthHeader`). The credentials are read from cache via `readCredentials()`.

**Constraint**: `request()` in `redmine-api.js` sets `Content-Type: application/json`
and `Accept: application/json`; it cannot be reused for the binary upload. The issue
creation (second step) can use `request()` directly.

### Decision 2 — showToast() extension for clickable link

Current `showToast(message)` sets `toastEl.textContent` — text only. For FR-008
(Redmine success toast with ticket URL), we need a clickable link. Options:

- **A** Fork to `showToastLink(message, href)` — new export, no change to callers.
- **B** Extend `showToast(message, { href })` — single export, backward-compatible.
- **C** Replace toast content with a DOM-constructed `<a>` element inline in `feedback.js` — bypasses `notify.js`.

Decision: **B** — extend `showToast(message, { href } = {})`. When `href` is
provided, the toast clears its children and appends a DOM-constructed `<a>` element
instead of setting `textContent`. This keeps the single `showToast` callsite pattern
and avoids an XSS vector (no innerHTML). All existing callers are unaffected (no
second argument).

### Decision 3 — GitHub prefilled URL length limit

GitHub's maximum URL length in practice is ~8 000 characters (browser and GitHub
server limits). We reserve ~200 characters for the base URL + query-string keys,
giving ~7 800 characters for the combined title + body. The body is the dominant
consumer. Truncation strategy: encode title first, then body until the character
budget is exhausted, then append `\n[…truncated]` before encoding. This is a pure
string operation; unit-testable without a browser.

### Decision 4 — Opt-in checkbox placement in the dialog

The consent checkbox and disclosure warning replace the existing `<details>` context
preview section. When the checkbox is unchecked, the context preview is hidden (no
DOM rendering). When checked, the preview renders as before. The disclosure warning
text appears immediately below the checkbox, always visible when the checkbox is
shown (not hidden in a `<details>` element).

### Decision 5 — initFeedback() guard condition

Currently `initFeedback()` early-returns when `cfg.feedbackEmail` is absent. The
new guard checks `cfg.feedback` (the new block). If neither `cfg.feedback` nor the
legacy `cfg.feedbackEmail` is present, `initFeedback()` still no-ops. When the
feedback button is shown but `cfg.feedback` is absent/malformed, the submit
handler shows a config-missing error toast (FR-010) — the button remains visible
but submission is blocked.

### Decision 6 — Network URL sanitization location

`sanitizeNetworkUrl(url)` is added to `feedback-context.js` as an exported pure
function. It is called lazily during `collectBugContext()` / at serialization time
in `feedback-ticket.js`, not on log entry insertion, so the raw URLs remain
available for the in-browser preview. The sanitized copy is built fresh when
assembling the ticket payload.

## Phase 1 — Design Artifacts

Phase 1 produces three artifacts: `data-model.md`, `contracts/feedback-ticket.md`,
and `quickstart.md`.

### data-model.md outline

- `FeedbackConfig` shape (mirrors FR-001): `system`, `redmineProjectId`, `githubOwner`, `githubRepo`
- `FeedbackReport` revision: remove `feedbackEmail`; add `contextEnabled: boolean`
- `TicketOutcome` union: `{ ok: true, ticketUrl: string } | { ok: false, message: string } | { ok: 'github-opened' }`
- `SanitizedNetworkEntry`: `{ url: string, method: string, status: number, ms: number }` (url = scheme+host+path only)
- Payload shapes: Redmine issue-create body + upload token reference; GitHub prefilled URL structure

### contracts/feedback-ticket.md outline

```
Module: js/feedback-ticket.js
Exports:
  createRedmineTicket(report, contextEnabled, creds, cfg) → Promise<TicketOutcome>
  openGithubForm(report, contextEnabled, cfg) → void   // opens window.open(url, '_blank')
  buildGithubUrl(report, contextEnabled, cfg) → string // pure, testable
  buildRedmineIssueBody(report) → string               // pure, testable
  sanitizeNetworkUrl(url) → string                     // re-exported from feedback-context.js
```

### quickstart.md outline (UAT checklist items)

Redmine path:

- [ ] Configure `config.json` with `"feedback": { "system": "redmine", "redmineProjectId": <id> }` and reload.
- [ ] Open feedback panel, enter description, leave context checkbox unchecked, submit — verify Redmine issue created with description only (no screenshot, no logs), success toast with link.
- [ ] Open feedback panel, check the context checkbox, read the disclosure warning, submit — verify issue has screenshot attachment + logs in description, success toast with link.
- [ ] Simulate Redmine API error — verify error toast appears and feedback text is preserved.

GitHub path:

- [ ] Configure `config.json` with `"feedback": { "system": "github", "githubOwner": "…", "githubRepo": "…" }` and reload.
- [ ] Submit feedback — verify a new browser tab opens with GitHub new-issue URL prefilled with title and body.
- [ ] Submit feedback with context checkbox checked — verify textual context appears in the prefilled body.
- [ ] Verify no GitHub credential/token appears in any `config.json` field or network request.

General:

- [ ] Remove `feedback` block from `config.json` — verify error toast on submit, feedback form still accessible.
- [ ] Submit without a description — verify inline validation error (no network call made).
- [ ] Verify EN and DE strings render correctly by switching locale (URL parameter or browser language).

## DSGVO Impact Checklist — Feature 049

**Checklist version**: 1.0 (specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md)
**Assessed by**: Claude Code
**Date**: 2026-06-23

| Question                             | Answer | Action taken                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1 — New personal data collection    | Yes    | Feature introduces explicit collection and external transmission of screenshots and diagnostic logs (error log, network log, app log, calendar state, storage snapshot). These may contain personal data (issue titles, project names, time entries). `privacy.html` (DE + EN) data inventory updated to include "Feedback diagnostic context (optional)".                                        |
| Q2 — Changed purpose or legal basis  | No     | n/a                                                                                                                                                                                                                                                                                                                                                                                               |
| Q3 — New data recipient              | Yes    | When feedback is submitted, personal data (screenshot + logs) is sent to the admin-configured Redmine project or GitHub repository — both are external systems not previously listed in `privacy.html`. Added to "Data recipients" section (DE + EN). Admins MUST verify a DPA exists with the recipient organisation before enabling in production.                                              |
| Q4 — Changed retention period        | No     | No new localStorage keys; screenshot and log data are not persisted locally beyond the browser session. n/a                                                                                                                                                                                                                                                                                       |
| Q5 — New or revised consent required | Yes    | Opt-in checkbox with explicit plain-language disclosure gates context inclusion. Evaluated: existing `redmine_calendar_ai_consent` does NOT cover this flow (different data type, different recipient). The new checkbox is the consent mechanism; it is not persisted (re-shown every dialog open) — one-time, per-submission consent. `privacy.html` updated to describe the new consent scope. |

**Privacy notice update required**: Yes
**privacy.html updated (EN)**: Required before PR review
**privacy.html updated (DE)**: Required before PR review
