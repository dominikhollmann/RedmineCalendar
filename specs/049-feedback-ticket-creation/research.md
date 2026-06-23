# Research: Feedback — Create Ticket Instead of Sending Email

**Feature**: 049 | **Branch**: `049-feedback-ticket-creation` | **Date**: 2026-06-23

## Scope

Phase 0 research for the plan. All decisions are recorded here before any code
is written. No unknowns remain after this pass.

---

## Codebase Survey

### Existing feedback pipeline (to be modified)

| File | Role | Disposition |
| ---- | ---- | ----------- |
| `js/feedback.js` | Dialog UI, `_handleSubmit`, `initFeedback` | MODIFY — replace email dispatch with ticket dispatch; add consent checkbox |
| `js/feedback-context.js` | Ring-buffer capture (network, errors, app log, screenshot) | MODIFY — add `sanitizeNetworkUrl()` export |
| `js/feedback-email.js` | HTML email body builder | DELETE (FR-011) |
| `js/outlook.js` | `sendFeedbackEmail` + `isMsalSignedIn` | No change to file; `feedback.js` removes its import |

### Reused modules

| Module | What is reused |
| ------ | -------------- |
| `js/redmine-api.js` | `request(path, options)` — authenticated JSON API call through CORS proxy; `readCredentials()` via `config-store.js` for upload auth header; `RedmineError` for typed errors |
| `js/http.js` | `fetchWithRetry(doFetch, onNetworkError)` — retry + exponential backoff for binary screenshot upload |
| `js/config-store.js` | `getCentralConfigSync()` — sync config read; `readCredentials()` — credentials for upload auth |
| `js/notify.js` | `showToast(message, { href })` — extended with optional link (Decision 2) |
| `js/i18n.js` | `t(key)` — all new strings route through this |

---

## Decision Log

### Decision 1 — Redmine screenshot upload mechanism

Redmine's binary upload endpoint (`POST /uploads.json`) does not accept JSON:
it requires `Content-Type: application/octet-stream` and returns:
```json
{ "upload": { "token": "abc123" } }
```
The token is referenced in the subsequent issue-create payload:
```json
{
  "issue": {
    "project_id": <redmineProjectId>,
    "subject": "<title>",
    "description": "<body>",
    "uploads": [
      { "token": "abc123", "filename": "screenshot.png", "content_type": "image/png" }
    ]
  }
}
```

The screenshot data URL (`data:image/png;base64,…`) is decoded to binary:
```js
const b64 = dataUrl.split(',')[1];
const binary = atob(b64);
const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
```

`request()` in `redmine-api.js` hardcodes `Content-Type: application/json` and
is unsuitable for the binary step. The binary upload uses `fetchWithRetry` directly
with a manually-built auth header (local helper in `feedback-ticket.js`).
The issue-create step (second API call) uses `request()` normally.

**Resolved**: two-step flow: upload → token → create issue.

### Decision 2 — showToast() extension for clickable link

`notify.js::showToast(message)` currently sets `toastEl.textContent`.
For the Redmine success toast (FR-008), we need a clickable `<a>` linking to the
created ticket.

Chosen approach: extend signature to `showToast(message, { href } = {})`.
When `href` is provided, the toast element is cleared and a DOM-constructed
`<a href="…" target="_blank">` is appended — no innerHTML, no XSS risk.
All existing call sites pass no second argument and are unaffected.

### Decision 3 — GitHub prefilled URL character budget

GitHub's effective URL limit is ~8 000 characters (browser address bar + GitHub
server). Budget allocation:
- Base URL + `?title=` + encoded title: ~200 + title-length characters
- Body: remainder, up to ~7 800 total

Truncation strategy (pure function, unit-testable):
1. Encode title (no truncation — title is always short).
2. Encode body until cumulative length reaches `MAX_GITHUB_URL = 7_800`.
3. Append `\n[…truncated]` before the final `encodeURIComponent` call.

Constant `MAX_GITHUB_URL` lives in `feedback-ticket.js`.

### Decision 4 — Opt-in checkbox placement

The existing `<details>` element (context preview) is gated by the checkbox:
- Checkbox unchecked (default): `<details>` hidden entirely, no context collected.
- Checkbox checked: `<details>` shown with full context preview.
- Disclosure warning (`<p class="feedback-dialog__consent-warning">`) always rendered
  beneath the checkbox label — not inside `<details>` — so the user sees it before
  checking the box.

The `_buildContextDetails()` function in `feedback.js` gains a sibling
`_buildConsentCheckbox()` builder function.

### Decision 5 — initFeedback() activation guard

Old guard: `if (!cfg?.feedbackEmail) return;`
New guard:
```js
if (!cfg?.feedback && !cfg?.feedbackEmail) return;
```
This preserves the existing no-op behaviour for unconfigured deployments. When the
button is visible but `cfg.feedback` is absent on submit, the handler shows
`t('feedback.config_missing')` error toast (FR-010). Legacy `feedbackEmail`-only
configs: the button shows but submission hits the config-missing toast (intentional
— admins must migrate to the new `feedback` block).

### Decision 6 — URL sanitization timing

`sanitizeNetworkUrl(url)` strips query string and fragment, retaining only
`scheme://host/path`:
```js
export function sanitizeNetworkUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}
```
Called in `feedback-ticket.js` at payload-assembly time (not on ring-buffer insert),
so the in-browser preview retains full URLs while the ticket body uses sanitized copies.

### Decision 7 — FeedbackReport.contextEnabled flag

The existing `FeedbackReport` type in `types.d.ts` collects context fields
unconditionally. Feature 049 makes context collection conditional on the opt-in
checkbox. To avoid threading a boolean down through every helper, the `contextEnabled`
flag is carried in the report object:
```ts
interface FeedbackReport {
  …
  contextEnabled: boolean;  // true iff the opt-in checkbox was checked
}
```
`feedback-ticket.js` reads `report.contextEnabled` to decide whether to include
screenshots/logs in the payload.

### Decision 8 — No new module for upload-only path

The binary upload helper is ~30 lines and is only called from one place
(`createRedmineTicket` in `feedback-ticket.js`). Extracting it to its own module
would create a file with a single consumer that is never reused — a YAGNI violation.
It stays as a private function within `feedback-ticket.js`.

---

## Security Analysis

| Risk | Mitigation |
|------|-----------|
| Screenshot captures personal data (issue titles, time entries) | Opt-in checkbox + plain-language disclosure warning (FR-012) |
| Network log URLs expose query-string parameters (record IDs, search terms) | `sanitizeNetworkUrl()` strips query string/fragment (FR-013) |
| GitHub token exposure via client-fetched `config.json` | No GitHub token — prefilled URL only; user's own browser session (FR-004) |
| Redmine API key in ticket payload | API key travels in `X-Redmine-API-Key` header only; `buildAuthHeader()` mirrors redmine-api.js pattern; localStorage allowlist excludes credentials |
| localStorage snapshot includes sensitive keys | `STORAGE_ALLOWLIST` in `feedback-context.js` already excludes `redmine_calendar_credentials`, `redmine_calendar_ai_consent`, and all other credential-like keys |

---

## i18n Keys Required

New keys (EN + DE required):

```
feedback.consent_checkbox          # "Include diagnostic context (screenshot & logs)"
feedback.consent_warning           # "Warning: the screenshot captures your current screen …"
feedback.config_missing            # "Feedback is not configured. Contact your admin."
feedback.creating_ticket           # "Creating ticket…"
feedback.ticket_created            # "Ticket created:"  (followed by link)
feedback.github_form_opened        # "GitHub issue form opened in a new tab."
feedback.screenshot_manual_note    # "Paste the screenshot manually into the GitHub form."
feedback.upload_failed_partial     # "Screenshot upload failed; ticket created without attachment."
feedback.fallback_title            # "Feedback from RedmineCalendar"
```

Existing keys retained (no change):
`feedback.sending`, `feedback.sent`, `feedback.send_failed`, `feedback.submit_btn`,
`feedback.cancel_btn`, `feedback.category_label`, `feedback.category_bug`,
`feedback.category_suggestion`, `feedback.category_required`,
`feedback.description_required`, `feedback.description_placeholder`,
`feedback.dialog_title`, `feedback.context_heading`, `feedback.section_screenshot`,
`feedback.section_environment`, `feedback.section_errors`, `feedback.section_network`,
`feedback.section_app_log`, `feedback.section_calendar`, `feedback.section_storage`,
`feedback.add_screenshot_btn`, `feedback.screenshot_capturing`, `feedback.toolbar_label`.

---

## Open Questions

None — all questions answered by the spec and codebase survey.
