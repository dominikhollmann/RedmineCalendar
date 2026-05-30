# Data Model: User Feedback Button (037)

All entities are **in-memory only** — nothing is persisted to localStorage or IndexedDB. Data lives for the current browser session and is discarded on page unload.

---

## FeedbackReport

Assembled at submit time from all collected context. Passed to `sendFeedbackEmail()` (Office 365 path) or `buildMailtoUrl()` (fallback path).

| Field                  | Type                        | Always present | Description                                                          |
| ---------------------- | --------------------------- | -------------- | -------------------------------------------------------------------- |
| `category`             | `'bug' \| 'suggestion'`     | Yes            | Mandatory user selection                                             |
| `description`          | `string`                    | Yes            | User-typed text                                                      |
| `identity`             | `string`                    | Yes            | Display name, Redmine username, or `'Anonymous'`                     |
| `timestamp`            | `string`                    | Yes            | ISO-8601, captured when dialog opens                                 |
| `pageUrl`              | `string`                    | Yes            | `window.location.href`                                               |
| `userAgent`            | `string`                    | Yes            | `navigator.userAgent`                                                |
| `os`                   | `string`                    | Yes            | Extracted from `userAgent` (e.g. `'Windows 11'`, `'macOS 14'`)       |
| `viewportWidth`        | `number`                    | Yes            | `window.innerWidth`                                                  |
| `viewportHeight`       | `number`                    | Yes            | `window.innerHeight`                                                 |
| `screenshotDataUrl`    | `string \| null`            | Both           | `data:image/png;base64,…` from html2canvas; `null` if capture failed |
| `errors`               | `SessionError[]`            | Bug only       | Up to 10 most-recent captured errors                                 |
| `networkLog`           | `NetworkLogEntry[]`         | Bug only       | Up to 20 most-recent network requests                                |
| `localStorageSnapshot` | `Record<string, string>`    | Bug only       | Allowlisted localStorage keys                                        |
| `calendarState`        | `CalendarViewState \| null` | Bug only       | Active FullCalendar view; `null` if not initialized                  |
| `appLog`               | `AppLogEntry[]`             | Bug only       | Up to 50 most-recent log entries                                     |

---

## SessionError

Captured by the global `window.onerror` + `unhandledrejection` listener installed at app startup by `feedback-context.js`.

| Field       | Type             | Description                               |
| ----------- | ---------------- | ----------------------------------------- |
| `message`   | `string`         | Error message                             |
| `stack`     | `string \| null` | Stack trace string; `null` if unavailable |
| `timestamp` | `string`         | ISO-8601                                  |

Buffer limit: **10 entries** (oldest discarded when full).

---

## NetworkLogEntry

Captured by the `window.fetch` proxy wrapper installed at app startup by `feedback-context.js`.

| Field    | Type     | Description                                       |
| -------- | -------- | ------------------------------------------------- |
| `url`    | `string` | Full request URL                                  |
| `method` | `string` | HTTP method (uppercased: `'GET'`, `'POST'`, …)    |
| `status` | `number` | HTTP status code; `0` for network error / timeout |
| `ms`     | `number` | Round-trip time in milliseconds                   |

Buffer limit: **20 entries** (ring buffer — oldest discarded when full).

---

## AppLogEntry

Written by opt-in calls to `log(level, message)` exported from `feedback-context.js`. No existing modules are required to adopt it.

| Field       | Type                         | Description |
| ----------- | ---------------------------- | ----------- |
| `level`     | `'log' \| 'warn' \| 'error'` | Severity    |
| `message`   | `string`                     | Log message |
| `timestamp` | `string`                     | ISO-8601    |

Buffer limit: **50 entries** (ring buffer — oldest discarded when full).

---

## CalendarViewState

Returned by `getCalendarViewState()` exported from `js/calendar.js`.

| Field   | Type     | Description                                                     |
| ------- | -------- | --------------------------------------------------------------- |
| `view`  | `string` | FullCalendar view type (e.g. `'timeGridWeek'`, `'timeGridDay'`) |
| `start` | `string` | ISO date of the visible range start                             |
| `end`   | `string` | ISO date of the visible range end                               |

Returns `null` if the calendar instance is not yet initialized (e.g. on `settings.html`).

---

## config.json Extension

One new admin-managed field added to the existing `CentralConfig` schema:

| Field           | Type     | Required | Description                                                                                            |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `feedbackEmail` | `string` | No       | Recipient email address for feedback submissions. When absent, the feedback button is hidden entirely. |

Example:

```json
{
  "redmineUrl": "https://redmine.example.com",
  "feedbackEmail": "dev-team@example.com"
}
```

---

## TypeScript Type Additions (`js/types.d.ts`)

```ts
export interface FeedbackReport {
  category: 'bug' | 'suggestion';
  description: string;
  identity: string;
  timestamp: string;
  pageUrl: string;
  userAgent: string;
  os: string;
  viewportWidth: number;
  viewportHeight: number;
  screenshotDataUrl: string | null;
  errors?: SessionError[];
  networkLog?: NetworkLogEntry[];
  localStorageSnapshot?: Record<string, string>;
  calendarState?: CalendarViewState | null;
  appLog?: AppLogEntry[];
}

export interface SessionError {
  message: string;
  stack: string | null;
  timestamp: string;
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status: number;
  ms: number;
}

export interface AppLogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface CalendarViewState {
  view: string;
  start: string;
  end: string;
}
```

`CentralConfig` (existing) gains one optional field:

```ts
feedbackEmail?: string;
```
