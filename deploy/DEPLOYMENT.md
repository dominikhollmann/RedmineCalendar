# RedmineCalendar — Production Deployment Guide

Step-by-step guide for deploying RedmineCalendar in a company environment
(tested for 10–200 users on an internal network).

---

## Prerequisites

- nginx ≥ 1.18 (recommended) **or** Apache 2.4+
- A valid TLS certificate for your domain (Let's Encrypt, internal CA, or commercial CA)
- Access to your company network firewall / VPN configuration
- Your Redmine server URL and admin credentials
- (Optional) Company AI provider account (Anthropic or OpenAI)
- (Optional) Azure AD app registration if Outlook calendar integration is needed

---

## Step 1 — Upload static files

Copy the repository contents (all `.html`, `css/`, `js/`, `docs/`, `version.json`,
`sbom.json`, `attributions.json`) to your web server's document root:

```bash
rsync -av --exclude='node_modules' --exclude='.git' \
  /path/to/RedmineCalendar/ user@server:/var/www/redmine-calendar/
```

---

## Step 2 — Create config.json

Copy `config.json.example` to `config.json` in the document root and fill in your values:

```json
{
  "redmineUrl": "https://redmine-calendar.company.internal/redmine",
  "redmineServerUrl": "https://redmine.company.internal",
  "aiProvider": "anthropic",
  "aiModel": "claude-haiku-4-5-20251001",
  "aiProxyUrl": "https://redmine-calendar.company.internal:8011/proxy",
  "azureClientId": "",
  "azureTenantId": "",
  "holidayTicket": 0,
  "vacationTicket": 0,
  "breakTicket": 0,
  "redmineAcceptsZeroHours": false,
  "feedback": {
    "system": "redmine",
    "redmineProjectId": 0,
    "redmineTrackerBug": 0,
    "redmineTrackerSuggestion": 0,
    "githubOwner": "",
    "githubRepo": ""
  },
  "bookingDeadline": {
    "enabled": false,
    "dayOfWeek": 5,
    "hour": 22,
    "minute": 0
  }
}
```

For the full per-field reference (including `bookingDeadline`, the `feedback.*`
sub-fields, and the privacy fields covered in the
[Privacy notice configuration](#privacy-notice-configuration-privacyhtml) section
below), see the [config.json field table in the README](../README.md#2-create-configjson).
The `bookingDeadline` block is optional and disabled by default; when
`enabled` is `true` it shows a soft "continue anyway?" warning for time entries
booked after that week's deadline (`dayOfWeek`: `0` = Sunday … `6` = Saturday,
default Friday; `hour`/`minute` in 24-hour local time, default 22:00).

**Important**: `config.json` is served as a static file readable by every browser
client. It must **not** contain the AI API key — inject that server-side only
(see Step 4).

---

## Step 3 — Configure the reverse proxy

### nginx (recommended)

Copy `deploy/nginx.conf.example` to `/etc/nginx/sites-available/redmine-calendar`
and replace every ALL_CAPS placeholder:

| Placeholder        | Replace with                                                       |
| ------------------ | ------------------------------------------------------------------ |
| `APP_DOMAIN`       | Your app domain, e.g. `redmine-calendar.company.internal`          |
| `REDMINE_UPSTREAM` | Your Redmine base URL, e.g. `https://redmine.company.internal`     |
| `AI_UPSTREAM`      | AI provider base, e.g. `https://api.anthropic.com`                 |
| `AI_API_KEY`       | Your company AI API key (or use a secret manager — see note below) |
| `COMPANY_IP_CIDR`  | Company network range, e.g. `10.0.0.0/8` or `192.168.1.0/24`       |
| `CERT_PATH`        | Path to TLS certificate, e.g. `/etc/ssl/certs/company.crt`         |
| `KEY_PATH`         | Path to TLS private key, e.g. `/etc/ssl/private/company.key`       |

**AI_API_KEY security note**: Embedding the key as a literal string in the nginx
config requires filesystem access to read it, but it will appear in `nginx -T` output
and config backups. For higher security, use the
[`ngx_http_lua_module`](https://github.com/openresty/lua-nginx-module) or a small
Node.js shim (see `scripts/dev-server.mjs` as a reference) that reads the key from an
environment variable or a secret manager (HashiCorp Vault, AWS Secrets Manager, etc.)
and run nginx as a proxy to that shim.

Enable and reload:

```bash
ln -s /etc/nginx/sites-available/redmine-calendar /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Apache

Copy `deploy/apache.conf.example` and follow the same placeholder substitution.
Enable required modules first:

```bash
a2enmod ssl proxy proxy_http headers rewrite
systemctl restart apache2
```

---

## Step 4 — Set the AI API key (server-side only)

The AI API key must be injected server-side — it must **never** appear in `config.json`.

If you use the nginx AI proxy block from `nginx.conf.example`, replace `AI_API_KEY`
in the config. For a more secure approach, run a small proxy process that reads the
key from an environment variable:

```bash
# Example using the bundled dev-server as a reference proxy (not for production —
# replace with a hardened proxy; scripts/dev-server.mjs shows the correct pattern):
AI_API_KEY=sk-ant-... node scripts/dev-server.mjs
```

**Set an API spend cap** to protect against runaway usage:

- Anthropic: <https://console.anthropic.com/settings/limits>
- OpenAI: <https://platform.openai.com/account/limits>

Recommended: set a monthly hard cap at 2–3× the expected normal usage, and an
email alert at 50% and 80% of the cap.

The nginx config already applies **rate limiting** (10 req/min per IP, burst 5) on
the AI endpoint to guard against accidental or malicious overuse.

---

## Step 5 — Microsoft Outlook integration (optional)

Skip this step if you don't need Outlook calendar integration.

1. In **Azure Portal** → Azure Active Directory → App registrations → **New registration**:
   - Name: `RedmineCalendar`
   - Supported account types: **Accounts in this organizational directory only**
     (single-tenant — prevents personal Microsoft accounts from signing in)
   - Redirect URI: `Single-page application (SPA)` →
     `https://APP_DOMAIN/index.html` (exact URL, no trailing slash)

2. Copy the **Application (client) ID** into `config.json` as `"azureClientId"`.

3. Copy the **Directory (tenant) ID** into `config.json` as `"azureTenantId"`.
   Setting `azureTenantId` restricts sign-in to your organization only.
   If left empty, the app uses the `/common` endpoint which allows any Microsoft
   account — **this is not recommended for enterprise deployment**.

4. Under **API permissions**, verify `User.Read` and `Calendars.Read` are granted
   (delegated). `Mail.Send` is **not** required — feedback is delivered via Redmine
   ticket creation or a prefilled GitHub issue, not email.

5. Under **Authentication**, confirm the redirect URI added in step 1 is listed and
   the **Access tokens** and **ID tokens** checkboxes are enabled.

---

## Step 6 — Verify the deployment

After uploading files and setting up the proxy:

1. Open `https://APP_DOMAIN` — the app should load and show the Settings screen.
2. Check `https://APP_DOMAIN/version.json` — should return `{"version":"vX.Y.Z"}`.
3. Open Settings → enter your Redmine API key → the calendar should load entries.
4. (If AI configured) Open the chatbot → type "what can you do?" → should respond.
5. (If Outlook configured) Open the chatbot → say "Book my time for today" →
   should list Outlook events.
6. Open browser DevTools → Network tab → verify responses include:
   - `Content-Security-Policy: ... frame-ancestors 'none'; ...`
   - `Strict-Transport-Security: max-age=63072000; ...`

---

## Rate-limit monitoring

The nginx AI proxy logs rate-limit rejections at `warn` level:

```bash
# Check for rate-limit hits:
grep 'limiting requests' /var/log/nginx/error.log

# Watch in real time:
tail -f /var/log/nginx/error.log | grep 'limiting requests'
```

Frequent `429` responses may indicate:

- A user's browser tab stuck in a retry loop (check the chatbot session)
- A misconfigured or runaway script accessing the AI endpoint directly
- An attempt to exhaust the company AI API budget

Consider adding a log-based alert (e.g., via `logwatch`, `fail2ban`, or your SIEM)
that triggers when more than 20 rate-limit hits occur within 5 minutes.

---

## Employee onboarding

1. Share the app URL with the employee.
2. The employee opens the app and enters their personal Redmine API key in Settings.
3. All other settings (Redmine server, AI provider, Outlook) come from `config.json` —
   no per-user configuration needed.
4. If Outlook is enabled, the employee clicks "Connect Outlook" in Settings and signs in
   with their company Microsoft account. SSO handles authentication automatically.

---

## Employee offboarding

The app stores only the employee's personal Redmine API key (encrypted in their
browser's localStorage). There is no server-side user database.

When an employee leaves:

1. **Revoke their Redmine API key** in Redmine admin:
   Administration → Users → [employee] → API access key → Reset or delete.
2. **Revoke their Azure AD access** if Outlook integration is used:
   Azure Portal → Users → [employee] → Revoke sessions.
3. Their encrypted browser data will become inert once the Redmine API key is revoked
   (API calls will return 401). No server-side cleanup is required.

---

## Screen-lock policy

The app has no server-side session and no automatic logout. Credentials persist in
the user's browser until manually cleared.

**Recommendation**: Enforce a company policy that employees lock their screen when
leaving their desk (Windows: `Win+L`, macOS: `Ctrl+Cmd+Q`). Prefer personal
workstations over shared or kiosk machines. If shared machines are unavoidable,
consider deploying the app with a browser policy that clears storage on browser close.

---

## DSGVO / GDPR template

The following is a starting point for documenting the app's data processing with your
Data Protection Officer (DPO) or works council (Betriebsrat). Adapt to your specific
circumstances and applicable legal framework.

### Data categories processed

| Category                                               | Where stored                                                                                                         | Who can access                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Redmine API key                                        | Encrypted in user's browser (AES-GCM, IndexedDB key, non-exportable)                                                 | User only — key is never sent to the web server         |
| Time-entry data (project, issue, hours, comment, date) | Redmine server                                                                                                       | Redmine admins + the individual user                    |
| Calendar/Outlook events                                | Microsoft 365 only — never stored by this app                                                                        | User only (delegated permission)                        |
| AI chatbot messages                                    | Sent to AI provider (Anthropic or OpenAI) for the duration of the conversation; **not stored by the app**            | AI provider retains per their data-processing agreement |
| Voice input (microphone)                               | Processed by the browser's Web Speech API (Google/OS speech service depending on browser); **not stored by the app** | Browser speech service                                  |

### Lawful basis (GDPR Art. 6)

Suggested: **Legitimate interest** (Art. 6(1)(f)) — time-tracking is a necessary
business activity; the app is a tool to streamline that activity for employees.
Alternatively, if a works agreement (Betriebsvereinbarung) covers the tooling:
**performance of a contract** (Art. 6(1)(b)).

### AI data egress

If the AI chatbot is enabled (`aiProxyUrl` is set in `config.json`), user messages
and relevant source-code excerpts from the app itself are sent to the configured AI
provider (Anthropic or OpenAI). **No Redmine credentials or personal API keys are
included** — they are redacted before transmission.

Actions required before enabling the chatbot:

- Sign a **Data Processing Agreement (DPA)** with the AI provider.
- Confirm the AI provider uses a **regional endpoint** within the EU if required
  (Anthropic: currently US-only; OpenAI: EU data residency available for enterprise).
- Alternatively, **disable the chatbot** by leaving `aiProxyUrl` empty in `config.json`.

### Privacy notice configuration (`privacy.html`)

The app ships an in-app privacy notice (`privacy.html`) reachable from the Settings
footer. Before go-live, set the following fields in `config.json` so the notice shows
accurate controller information:

```json
{
  "privacyControllerName": "Acme GmbH",
  "privacyControllerEmail": "datenschutz@acme.example",
  "privacyDpoEmail": "dpo@acme.example",
  "planningDataRetentionDays": 30
}
```

- **`privacyControllerName` / `privacyControllerEmail`**: legal name and contact of the
  data controller (GDPR Art. 13(1)(a)). Must match your organization's registration.
- **`privacyDpoEmail`**: Data Protection Officer contact (Art. 13(1)(b)). Omit if your
  organization has no mandatory DPO — the field will be hidden from the notice.
- **`planningDataRetentionDays`**: how long planning snapshots are retained in the user's
  browser (default: 30 days). Users can delete these at any time via Settings →
  "Planning data" → "Delete planning data". Set to your organization's minimum necessary
  retention period.

### Retention

Time-entry data retention is governed by your Redmine server configuration, not this
app. The app does not store time entries independently.

Planning-view snapshots (AI consent record and planning data) are retained in the user's
browser for `planningDataRetentionDays` days (see above), then purged automatically.

### Data subject rights

Employees can delete their browser-side data (Redmine API key, preferences) at any time
via Settings → "Clear all local data" or by clearing browser storage for the app's
origin. Planning data specifically can be removed via Settings → "Planning data" →
"Delete planning data". Time-entry data on the Redmine server is subject to Redmine's
own retention and access controls.

---

## SRI hash updates (when bumping CDN versions)

The `index.html` file includes `integrity="sha384-..."` attributes on all CDN scripts
to protect against CDN compromise. When Dependabot bumps a CDN package version,
the hashes must be updated manually:

```bash
# Compute new hash for a CDN URL:
curl -sL <new-cdn-url> | openssl dgst -sha384 -binary | openssl base64 -A

# Then update the integrity attribute in index.html.

# Verify all CDN scripts have integrity attributes:
npm run sri:check
```

CI will fail if any CDN script tag is missing an `integrity` attribute.
