# Contract: js/feedback-ticket.js

**Module**: `js/feedback-ticket.js`
**Feature**: 049 | **Date**: 2026-06-23

## Purpose

Pure ticket-delivery logic for the feedback feature. All Redmine API calls and
GitHub URL construction live here; no DOM access. `feedback.js` calls this module
after collecting the report; this module has no knowledge of the dialog UI.

## Imports

```js
import { readCredentials } from './config-store.js';
import { fetchWithRetry } from './http.js';
import { request, RedmineError } from './redmine-api.js';
import { sanitizeNetworkUrl } from './feedback-context.js';
import { t } from './i18n.js';
```

## Exported Functions

### `createRedmineTicket(report, cfg)`

```ts
async function createRedmineTicket(
  report: FeedbackReport,
  cfg: FeedbackConfig & { redmineUrl: string }
): Promise<TicketOutcome>;
```

**Behaviour**:

1. If `report.contextEnabled && report.screenshotDataUrl`, upload the PNG via
   `POST /uploads.json` → token. If upload fails, log warning and continue
   without the attachment (ticket is still created — FR-003 partial-failure note).
2. Build the issue description (`_buildRedmineBody(report)`).
3. `POST /issues.json` with the assembled payload via `request()`.
4. On 201 success: return `{ ok: true, ticketUrl: '<redmineUrl>/issues/<id>' }`.
5. On any error: return `{ ok: false, message: err.message }`.

**Preconditions**:

- `cfg.redmineProjectId` is a positive integer.
- Credentials are available in cache (loaded before this call).

**Error handling**:

- Network errors → `RedmineError` with `.status = 0` from `fetchWithRetry`.
- HTTP ≥ 400 from issue creation → returned as `{ ok: false, message }`.
- Upload failure → partial success; issue created without attachment.

---

### `openGithubForm(report, cfg)`

```ts
function openGithubForm(report: FeedbackReport, cfg: FeedbackConfig): void;
```

**Behaviour**:

1. Calls `buildGithubUrl(report, cfg)` to produce the prefilled URL.
2. Calls `window.open(url, '_blank')`.
3. Returns void — no async, no outcome object.

**Side effects**: Opens a new browser tab.

---

### `buildGithubUrl(report, cfg)`

```ts
function buildGithubUrl(report: FeedbackReport, cfg: FeedbackConfig): string;
```

**Pure function** — no side effects; unit-testable in node.

**Behaviour**:

1. Build title string (≤ 255 characters).
2. Build body string from `_buildGithubBody(report)`.
3. While `encodeURIComponent(title) + encodeURIComponent(body)` would exceed
   `MAX_GITHUB_URL - BASE_URL_LENGTH`, trim body by 100 characters and retry.
4. If body was trimmed, append `\n[…truncated]` before final encode.
5. Return `https://github.com/<owner>/<repo>/issues/new?title=…&body=…`.

**Constant**: `MAX_GITHUB_URL = 7_800` (module-level, not exported).

---

### `buildRedmineIssueBody(report)`

```ts
function buildRedmineIssueBody(report: FeedbackReport): string;
```

**Pure function** — unit-testable in node.

Produces the Markdown issue description per the template in `data-model.md`.
Network log entries are sanitized via `sanitizeNetworkUrl()` at call time.
Sections after "Environment" are omitted when `report.contextEnabled = false`.

---

### `sanitizeNetworkUrl(url)` (re-exported from `feedback-context.js`)

```ts
function sanitizeNetworkUrl(url: string): string;
```

Strips query string and fragment from a URL string. Returns `scheme://host/path`.
Falls back to the input unchanged if `new URL(url)` throws.

---

## Private Helpers (not exported)

### `_uploadScreenshot(screenshotDataUrl, creds, cfg)`

Converts the base64 data URL to `Uint8Array`, POSTs to `<proxyUrl>/uploads.json`
using `fetchWithRetry` with a manually-built auth header (same pattern as
`buildAuthHeader` in `redmine-api.js` — not imported, duplicated locally as
~5 lines to avoid exposing a non-exported function from `redmine-api.js`).
Returns the upload token string, or `null` on failure.

### `_buildRedmineTitle(report)`

Returns `report.description.split('\n')[0].slice(0, 255)` or
`t('feedback.fallback_title')` when the description is empty or whitespace-only.

### `_buildGithubBody(report)`

Same structure as `buildRedmineIssueBody` but plain-text (no Markdown tables),
because the GitHub editor renders Markdown but the URL-encoded preview must still
be human-readable as plain text.

---

## Size Estimate

~150 effective LOC. Well within the 600 hard cap and 500 SQI soft cap.
`max-lines-per-function: 60` ESLint rule is satisfied by the helper decomposition
above (largest function `createRedmineTicket` ≈ 35 lines).

---

## Test Contract

| Test                                                  | Type                      | What it verifies                                    |
| ----------------------------------------------------- | ------------------------- | --------------------------------------------------- |
| `buildGithubUrl` — body within budget                 | node Vitest               | URL length ≤ MAX_GITHUB_URL                         |
| `buildGithubUrl` — body truncated                     | node Vitest               | `[…truncated]` marker present when body is long     |
| `buildRedmineIssueBody` — context disabled            | node Vitest               | No errors/network/logs sections in output           |
| `buildRedmineIssueBody` — context enabled             | node Vitest               | All sections present; network URLs sanitized        |
| `sanitizeNetworkUrl` — strips query                   | node Vitest               | `?foo=bar` absent from result                       |
| `sanitizeNetworkUrl` — strips fragment                | node Vitest               | `#anchor` absent from result                        |
| `sanitizeNetworkUrl` — invalid URL fallback           | node Vitest               | Returns input unchanged                             |
| `createRedmineTicket` — success path                  | jsdom Vitest (mock fetch) | Returns `{ ok: true, ticketUrl }`                   |
| `createRedmineTicket` — upload failure, issue created | jsdom Vitest              | Returns `{ ok: true, ticketUrl }` (partial success) |
| `createRedmineTicket` — API error                     | jsdom Vitest              | Returns `{ ok: false, message }`                    |
