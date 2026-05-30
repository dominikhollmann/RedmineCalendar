# Research: User Feedback Button (037)

## R-001: Screenshot Capture — html2canvas

**Decision**: Use `html2canvas` v1.4.1 from the jsdelivr.net CDN.

**Rationale**: The two browser-native alternatives are unsuitable.

- `MediaDevices.getDisplayMedia()` requires a user permission pop-up on every click (bad UX) and captures the OS screen, not just the app DOM.
- `Element.requestFullscreen()` + `ImageCapture` is experimental and not reliably available.

`html2canvas` walks the DOM and renders it to a `<canvas>` element client-side (no server involvement). Output is `canvas.toDataURL('image/png')` — a `data:` URI — which the existing CSP already permits (`img-src 'self' data:`). The CDN domain `https://cdn.jsdelivr.net` is already in `script-src`, so no CSP change is needed. Limitation: does not capture cross-origin iframes; not an issue for this single-origin SPA.

**SBoM impact**: `html2canvas` must be added to `oss-manifest.json` under the `cdn` channel. License: MIT — already in the project SPDX allowlist. `npm run oss:generate` must be re-run after the entry is added.

**Alternatives considered**:

- `getDisplayMedia()`: rejected — requires user permission, captures OS screen not app DOM.
- Puppeteer/headless browser: rejected — requires a backend process; this app is a static SPA.

---

## R-002: Office 365 Mail.Send via Microsoft Graph

**Decision**: Add a dedicated `sendFeedbackEmail(report)` function to `js/outlook.js` that acquires a token with the `Mail.Send` scope and posts to `https://graph.microsoft.com/v1.0/me/sendMail`.

**Rationale**: The existing `acquireToken()` in `js/outlook.js` requests only `['Calendars.Read']`. Requesting `Mail.Send` in the same MSAL call would prompt all calendar users for the mail permission on first sign-in, even if they never use feedback. A separate token-acquisition call with `['Mail.Send']` keeps the permission prompt scoped to the feedback flow only.

**Graph request format** (see also `contracts/graph-mail-api.md`):

```
POST https://graph.microsoft.com/v1.0/me/sendMail
Authorization: Bearer <Mail.Send token>
Content-Type: application/json

{
  "message": {
    "subject": "Bug Report — RedmineCalendar",
    "body": { "contentType": "HTML", "content": "<html>…</html>" },
    "toRecipients": [{ "emailAddress": { "address": "<feedbackEmail>" } }],
    "attachments": [{
      "@odata.type": "#microsoft.graph.fileAttachment",
      "name": "screenshot.png",
      "contentType": "image/png",
      "contentBytes": "<base64 string WITHOUT data URI prefix>"
    }]
  },
  "saveToSentItems": false
}
```

`saveToSentItems: false` prevents cluttering the sender's Sent folder. Attachment is omitted when no screenshot was captured or for Suggestion category.

**Alternatives considered**:

- Adding `Mail.Send` to the shared `SCOPES` constant: rejected — forces all calendar users to grant mail permissions on first Outlook sign-in regardless of whether they ever submit feedback.

---

## R-003: Network Request Log via Fetch Wrapper

**Decision**: Install a `window.fetch` proxy in `js/feedback-context.js` that is called once during app initialization, before any other module runs fetch calls. Uses a 20-entry ring buffer (array shifted when full).

**Implementation pattern**:

```js
const _originalFetch = window.fetch.bind(window);
let _wrapped = false;

export function installFetchLog() {
  if (_wrapped) return;
  _wrapped = true;
  window.fetch = async function (url, options) {
    const start = Date.now();
    const method = (options?.method ?? 'GET').toUpperCase();
    try {
      const resp = await _originalFetch(url, options);
      _pushNetworkEntry({ url: String(url), method, status: resp.status, ms: Date.now() - start });
      return resp;
    } catch (err) {
      _pushNetworkEntry({ url: String(url), method, status: 0, ms: Date.now() - start });
      throw err;
    }
  };
}
```

The guard (`_wrapped`) prevents double-wrapping if the module is evaluated twice. The wrapper re-throws errors unchanged so `redmine-api.js` retry logic is unaffected.

**Alternatives considered**:

- `PerformanceObserver` with `resource` entries: does not capture status codes reliably in all browsers.
- Monkey-patching `XMLHttpRequest`: not needed; the app uses only `fetch`.

---

## R-004: FullCalendar State Access

**Decision**: Export a `getCalendarViewState()` function from `js/calendar.js` (or the module that holds the FullCalendar instance after the 035 split). It returns `{ view, start, end }` using the FullCalendar public API (`calendar.view.type`, `calendar.view.activeStart`, `calendar.view.activeEnd`).

**Rationale**: The 035-handover-readiness feature explicitly removed `window._calendarDayTotals` and other window globals. A clean module export is the correct pattern and consistent with how other modules share state (e.g., `getCentralConfigSync()` in `config-store.js`). Returns `null` if the calendar instance is not yet initialized (defensive).

---

## R-005: localStorage Allowlist for Snapshot

**Decision**: Use an explicit **allowlist** of safe localStorage keys rather than a denylist. Keys on the allowlist:

| Key                                        | Content                       |
| ------------------------------------------ | ----------------------------- |
| `redmine_calendar_theme`                   | `'light'` \| `'dark'`         |
| `redmine_calendar_view_mode`               | current calendar view string  |
| `redmine_calendar_working_hours`           | JSON `{start, end}`           |
| `redmine_calendar_weekly_hours`            | number string                 |
| `redmine_calendar_day_range`               | `'workweek'` \| `'full-week'` |
| `redmine_calendar_voice_privacy_dismissed` | `'true'`                      |

Keys deliberately excluded: `redmine_calendar_credentials` (encrypted credential envelope) and all `msal.*` keys (MSAL token cache).

**Rationale**: Allowlist is safer than denylist — new credential-adjacent keys added in future features are excluded by default.

---

## R-006: App Log Buffer

**Decision**: Introduce a lightweight 50-entry ring buffer for app-level log output. A global `window.onerror` handler and `unhandledrejection` listener populate the Session Error Buffer (max 10 entries, separate from the app log). The app log captures explicit calls to a `log(level, message)` function exported from `js/feedback-context.js`.

**Rationale**: The spec assumption confirms no structured log exists today. Rather than monkey-patching `console.log` (fragile, pollutes DevTools output), we export a thin `log()` function that modules can opt into. Existing modules are not required to adopt it — the feature degrades gracefully (log section is empty or omitted) if no calls are made.

---

## R-007: Module Split — Staying within LOC Gates

**Decision**: Split the feedback feature across two new modules:

- `js/feedback.js` — dialog UI, button init, send orchestration (≤ 500 LOC target, functions ≤ 60 lines each)
- `js/feedback-context.js` — context collection: fetch wrapper, error listener, localStorage snapshot, calendar state, screenshot capture (≤ 500 LOC target)

The email body builder (HTML template and plain-text mailto builder) lives in `js/feedback.js` as small composable helper functions.

**Rationale**: Mirrors the calendar.js → `calendar-overlays.js` + `calendar-toolbar.js` split introduced in 035. Keeps each module under the SQI `moduleSize` band worst-file threshold and the `max-lines-per-function: 60` ESLint gate.
