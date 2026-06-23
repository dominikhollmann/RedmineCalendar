# Data Model: Feedback — Create Ticket Instead of Sending Email

**Feature**: 049 | **Branch**: `049-feedback-ticket-creation` | **Date**: 2026-06-23

## FeedbackConfig (new — in `config.json` + `types.d.ts`)

Admin-managed block inside `/config.json`:

```json
{
  "feedback": {
    "system": "redmine",
    "redmineProjectId": 42
  }
}
```

```json
{
  "feedback": {
    "system": "github",
    "githubOwner": "example-org",
    "githubRepo": "redmine-calendar"
  }
}
```

TypeScript interface (added to `js/types.d.ts`):

```ts
export interface FeedbackConfig {
  system: 'redmine' | 'github';
  redmineProjectId?: number; // required when system = 'redmine'
  githubOwner?: string; // required when system = 'github'
  githubRepo?: string; // required when system = 'github'
}
```

`CentralConfig` gains:

```ts
feedback?: FeedbackConfig;
```

The legacy `feedbackEmail?: string` field is retained in `CentralConfig` as a
no-op (backward compatibility — unknown config keys are already ignored by the
loader). No code reads it after this feature.

---

## FeedbackReport (modified — in `types.d.ts`)

```ts
export interface FeedbackReport {
  category: 'bug' | 'suggestion';
  description: string;
  contextEnabled: boolean; // NEW — true iff opt-in checkbox was checked
  pageUrl: string;
  userAgent: string;
  os: string;
  viewportWidth: number;
  viewportHeight: number;
  screenshotDataUrl: string | null; // null when contextEnabled = false
  errors?: SessionError[]; // populated when contextEnabled = true, category = 'bug'
  networkLog?: SanitizedNetworkEntry[]; // sanitized copy; populated when contextEnabled = true
  appLog?: AppLogEntry[]; // populated when contextEnabled = true
  calendarState?: CalendarViewState | null;
  localStorageSnapshot?: Record<string, string>;
  timestamp: string; // ISO-8601
  // REMOVED: feedbackEmail (was the old email address field)
}
```

`feedbackEmail` is removed from `FeedbackReport` (it was only used by the deleted
`feedback-email.js` and `_openMailto` paths).

---

## SanitizedNetworkEntry (new — in `types.d.ts`)

```ts
export interface SanitizedNetworkEntry {
  url: string; // scheme + host + path only (query string + fragment stripped)
  method: string;
  status: number;
  ms: number;
}
```

Produced by mapping `NetworkLogEntry[]` through `sanitizeNetworkUrl()` at
payload-assembly time in `feedback-ticket.js`.

---

## TicketOutcome (new — in `types.d.ts`)

```ts
export type TicketOutcome =
  | { ok: true; ticketUrl: string } // Redmine: issue created, URL known
  | { ok: false; message: string } // Redmine: creation failed
  | { ok: 'github-opened' }; // GitHub: prefilled form opened
```

---

## Redmine API Payloads

### Step 1 — Binary screenshot upload

```
POST /uploads.json
Content-Type: application/octet-stream
X-Redmine-API-Key: <key>   (or Authorization: Basic …)
Body: <raw PNG bytes>

Response 201:
{ "upload": { "token": "abc123…" } }
```

### Step 2 — Issue creation

```
POST /issues.json
Content-Type: application/json
X-Redmine-API-Key: <key>

Body:
{
  "issue": {
    "project_id": <redmineProjectId>,
    "subject": "<sanitized title — max 255 chars>",
    "description": "<markdown body>",
    "uploads": [                     // omitted when contextEnabled = false or upload failed
      {
        "token": "<upload token>",
        "filename": "screenshot.png",
        "content_type": "image/png"
      }
    ]
  }
}

Response 201:
{ "issue": { "id": 1234, … } }
```

The ticket URL is constructed as:

```
<redmineUrl>/issues/<id>
```

where `redmineUrl` comes from `getCentralConfigSync().redmineUrl`.

### Redmine issue description template

```markdown
## Feedback

**Category**: Bug Report | Suggestion
**Submitted**: <ISO timestamp>

<user description>

---

## Environment

| Key        | Value       |
| ---------- | ----------- |
| App URL    | <pageUrl>   |
| User Agent | <userAgent> |
| OS         | <os>        |
| Viewport   | <W> × <H>   |

---

## Error Log

<ol of errors or "None">

---

## Network Log

| URL (sanitized) | Method | Status | Duration |
| --------------- | ------ | ------ | -------- |
| …               | …      | …      | …        |

---

## App Log
```

[LEVEL] timestamp message
…

```

---

## Calendar State

| Key | Value |
|-----|-------|
| View | … |
| Start | … |
| End | … |

---

## Storage Snapshot

| Key | Value |
|-----|-------|
| … | … |
```

Sections after "Environment" are omitted when `contextEnabled = false`.

---

## GitHub Prefilled URL Structure

```
https://github.com/<githubOwner>/<githubRepo>/issues/new
  ?title=<encodeURIComponent(title)>
  &body=<encodeURIComponent(body)>
```

Maximum total URL length: `MAX_GITHUB_URL = 7_800` characters (constant in
`feedback-ticket.js`). When the encoded body would exceed this budget, the
plaintext body is truncated and `\n[…truncated]` is appended before encoding.

GitHub body template (when `contextEnabled = true`):

```
## Feedback

**Category**: Bug Report | Suggestion
**Submitted**: <ISO timestamp>

<user description>

---

## Environment

- App URL: <pageUrl>
- OS: <os>
- Viewport: <W> × <H>

---

## Logs (truncated to URL limit)

**Errors**: <first N errors as text>
**Network**: <sanitized URL | method | status | ms …>
**App log**: <first N entries>

---
*(Screenshot: please paste manually into this GitHub issue)*
```

The screenshot-paste note is only appended when `contextEnabled = true`.

---

## Storage Impact

No new `localStorage` keys. No `IndexedDB` usage. The `contextEnabled` flag is
not persisted — the checkbox resets to unchecked every time the dialog opens.
