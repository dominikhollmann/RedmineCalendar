# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine/Easy Redmine.

> **Quick links** —
> If you are a **developer** setting this up locally, jump to [Quick start (local development)](#quick-start-local-development).
> If you are an **admin** deploying this for your company, jump to [Company deployment (multi-user)](#company-deployment-multi-user).
> If you are a **maintainer** working on the code, see [Available scripts](#available-scripts), [Testing](#testing), and [Code quality and security](#code-quality-and-security).

## Quick start (local development)

### 1. Install dependencies (one-time)

```bash
npm install
```

### 2. Create config.json

Copy `config.json.example` to `config.json` and fill in your values:

```bash
cp config.json.example config.json
```

Edit `config.json`:

```json
{
  "redmineUrl": "http://localhost:8010/proxy",
  "redmineServerUrl": "https://your-redmine.example.com",
  "aiProvider": "anthropic",
  "aiModel": "claude-haiku-4-5-20251001",
  "aiProxyUrl": "http://localhost:8011/proxy",
  "azureClientId": "",
  "holidayTicket": 0,
  "vacationTicket": 0,
  "breakTicket": 0,
  "redmineAcceptsZeroHours": false
}
```

| Field                     | Required | Description                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `redmineUrl`              | Yes      | CORS proxy URL for Redmine API requests                                                                                                                                                                                                                                                                                                                     |
| `redmineServerUrl`        | Yes      | Actual Redmine server URL (must be HTTPS)                                                                                                                                                                                                                                                                                                                   |
| `aiProvider`              | No       | AI provider identifier (e.g., `anthropic`, `openai`)                                                                                                                                                                                                                                                                                                        |
| `aiModel`                 | No       | AI model identifier                                                                                                                                                                                                                                                                                                                                         |
| `aiProxyUrl`              | No       | CORS proxy URL for AI API requests. Must point to a proxy that fronts the provider's API endpoint (`api.anthropic.com`, `api.openai.com`, etc.) **and injects the API key server-side** (see below). When set, the AI assistant is enabled.                                                                                                                 |
| `azureClientId`           | No       | Azure AD app client ID for Outlook calendar integration. If empty, Outlook features are disabled. Set to `"demo"` for demo mode with fake calendar events (no M365 needed).                                                                                                                                                                                 |
| `azureTenantId`           | No       | Azure AD tenant ID. When set, restricts sign-in to your organization's accounts only (single-tenant). When empty, the app uses the `/common` endpoint which allows any Microsoft account — **not recommended for enterprise deployments**. See [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md#step-5--microsoft-outlook-integration-optional) for setup steps. |
| `holidayTicket`           | No       | Numeric Redmine issue ID for **bank/public holidays** (Christmas, Karfreitag, Bank Holiday, …). When unset (`0` or absent), holiday all-day events fall through to "needs your input" in the chat booking flow. Used by feature 025.                                                                                                                        |
| `vacationTicket`          | No       | Numeric Redmine issue ID for **personal vacation / OOO** (Urlaub, vacation, day off, abwesend). Distinct from `holidayTicket` so reporting can separate public holidays from personal absences.                                                                                                                                                             |
| `breakTicket`             | No       | Numeric Redmine issue ID for **non-work events** (lunch, doctor, gym, Mittagessen) and **overtime compensation** (Überstundenausgleich, comp time). Saved at 0 hours so the calendar slot is visible without inflating booked hours. When unset, break-routing is disabled.                                                                                 |
| `redmineAcceptsZeroHours` | No       | Boolean. Set to `true` if your Redmine instance allows time entries with `hours: 0` (Easy Redmine admin setting "Accept 0h timelogs"). When `false`, break entries are saved as `0.01h` placeholder; the UI still treats them as breaks. Defaults to `false`.                                                                                               |

### 3. Serve the app + proxies (localhost)

**Recommended (one command, all-in-one):**

```bash
AI_API_KEY=sk-ant-... npm run dev    # HTTPS app on :3000 + Redmine proxy on :8010 + AI proxy on :8011
```

The `dev` script runs `scripts/dev-server.mjs`, which serves the SPA over HTTPS and runs both CORS proxies in the same process. Proxy targets are configured in the `proxies` array at the top of that file.

The AI API key is **never** placed in `config.json` (it would be readable by any browser client — see issue #114). Instead the dev AI proxy reads it from the `AI_API_KEY` environment variable and injects the provider-specific auth header (`x-api-key` for Anthropic, `Authorization: Bearer …` for OpenAI) server-side. If `AI_API_KEY` is unset the dev server strips `aiProxyUrl` from the served `config.json`, so the chat button is hidden entirely rather than showing 401 errors.

**HTTP-only alternative** (no certs, separate proxy process required):

```bash
npm run serve   # app on :3000
# Then run a CORS proxy of your choice on :8010 (Redmine) and :8011 (AI).
# `npm run dev` is preferred — it bundles HTTPS + both proxies in one process.
```

### 4. Open the app

Open `https://localhost:3000` (or `http://localhost:3000` if using `npm run serve`) and enter your personal Redmine API key.

## Development server (cross-device testing)

To test from other devices on your network (Windows PC, mobile), you need HTTPS because the app uses the Web Crypto API (which requires a secure context).

### 1. Generate a self-signed certificate (one-time)

```bash
mkdir -p .certs
openssl req -x509 -newkey rsa:2048 \
  -keyout .certs/key.pem -out .certs/cert.pem \
  -days 365 -nodes -subj "/CN=YOUR_IP" \
  -addext "subjectAltName=IP:YOUR_IP"
```

Replace `YOUR_IP` with your machine's local IP (e.g., `192.168.178.47`).

### 2. Update config.json

Point proxy URLs to your IP instead of localhost:

```json
{
  "redmineUrl": "https://YOUR_IP:8010",
  "redmineServerUrl": "https://your-redmine.example.com",
  "aiProxyUrl": "https://YOUR_IP:8011",
  ...
}
```

### 3. Start everything with one command

```bash
npm run dev
```

This starts:

- **App server**: `https://0.0.0.0:3000` (with SSL, auto-redirects HTTP→HTTPS on the same port)
- **Redmine CORS proxy**: `https://0.0.0.0:8010` → your Redmine server
- **AI CORS proxy**: `https://0.0.0.0:8011` → Anthropic API
- **Cert download**: `http://YOUR_IP:3000/cert` → download CA cert for mobile install

The proxy targets are configured in `scripts/dev-server.mjs`. Edit the `proxies` array to change URLs.

### 4. Accept certificates on each device

**Desktop (Windows/Linux)**: Open each URL and accept the self-signed certificate warning:

- `https://YOUR_IP:3000` (app — or just `http://YOUR_IP:3000`, it auto-redirects)
- `https://YOUR_IP:8010` (Redmine proxy)
- `https://YOUR_IP:8011` (AI proxy)

**Mobile (Android/iOS)**: Install the CA certificate for a smoother experience:

1. Open `http://YOUR_IP:3000/cert` on the device — downloads the certificate
2. Install it via Settings → Security → Install a certificate → CA certificate
3. Then open `http://YOUR_IP:3000` — it redirects to HTTPS automatically
4. Also accept the cert on `:8010` and `:8011` (visit each URL once)

## Available scripts

### Run / serve

| Script                | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| `npm run serve`       | HTTP app server on port 3000 (localhost only)                              |
| `npm run serve:https` | HTTPS app server on port 3000 (requires `.certs/`)                         |
| `npm run dev`         | HTTPS app + Redmine proxy + AI proxy (all-in-one for cross-device testing) |

### Test

| Script                         | Description                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                     | Unit tests (Vitest, single run)                                                                                                                                                                        |
| `npm run test:watch`           | Unit tests in watch mode (re-runs on file change)                                                                                                                                                      |
| `npm run test:coverage`        | Unit tests + line/branch coverage report (text + HTML in `coverage/unit/`). Enforces per-file thresholds: 95% lines/statements, 75% functions, 65% branches.                                           |
| `npm run test:ui`              | UI tests (Playwright, headless Chromium)                                                                                                                                                               |
| `npm run test:ui:coverage`     | UI tests with Playwright JS-coverage capture (raw V8 dumps in `coverage/.tmp/playwright/`)                                                                                                             |
| `npm run test:coverage:merged` | Aggregates Playwright dumps via monocart (writes `coverage/ui/`), then computes per-file line-level **union** of unit+UI coverage and prints a unified table. Outputs `coverage/unified-summary.json`. |
| `npm run test:coverage:all`    | Full pipeline: unit + UI + merged. Use this for a single command that produces every report.                                                                                                           |
| `npm run test:all`             | All tests (no coverage)                                                                                                                                                                                |

### Lint, format, type-check, security

| Script                 | Description                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`         | ESLint v9 (flat config in `eslint.config.js`) — semantic checks + i18n guard + complexity / max-lines warnings                                                                                        |
| `npm run lint:fix`     | Same, with `--fix` (auto-corrects what it can)                                                                                                                                                        |
| `npm run format`       | Prettier — write all formattable files in place                                                                                                                                                       |
| `npm run format:check` | Prettier — fail if any file would be reformatted (CI gate)                                                                                                                                            |
| `npm run htmlhint`     | HTMLHint — checks `index.html` + `settings.html` for tag/attr/id/alt/title/inline-style issues                                                                                                        |
| `npm run typecheck`    | `tsc --noEmit` — static type checking via JSDoc + `js/types.d.ts` (no build step; types are comments)                                                                                                 |
| `npm run sqi`          | Software Quality Index dashboard — single 0-100 composite from 8 metrics (cycles, ACD, coverage, sizes, complexity, warnings, vulnerabilities). See [Code quality](#code-quality-and-security) below. |
| `npm run sqi:json`     | Same dashboard plus `coverage/sqi.json` artifact for CI                                                                                                                                               |

A pre-commit hook (Husky + lint-staged) auto-runs ESLint + Prettier on staged files before each commit, so most issues are caught before they hit CI.

## Company deployment (multi-user)

### Prerequisites

**Hosting / proxies:**

- A static file web server (nginx, Apache, IIS, or any file server) with HTTPS
- A shared CORS proxy or reverse proxy for Redmine API access
- (Optional) A shared AI proxy for the AI assistant feature
- (Optional) An Azure AD app registration for Outlook calendar integration

**Redmine instance:**

- **Easy Redmine** is the supported target (per the project constitution). Vanilla Redmine may work for the basic features but is not actively tested.
- Check the **"Accept 0h timelogs"** admin setting (Administration → Time tracking on Easy Redmine). If it's off, set `redmineAcceptsZeroHours: false` in `config.json` so break entries are saved as `0.01h` placeholders. If it's on, set the field to `true` for cleaner reporting.
- Create three Redmine tickets that all employees can log time against:
  - One for **bank/public holidays** → `holidayTicket`
  - One for **personal vacation / OOO** → `vacationTicket`
  - One for **breaks / non-work / overtime compensation** → `breakTicket`
- Make sure each ticket is open (status not closed) and the activity types include something employees can pick (e.g. "Other"). The user's own time-entry permissions still apply.

### Setup

1. **Copy all files** to the web server's document root.

2. **Create `config.json`** in the document root (next to `index.html`). Include all admin fields — see the field table in the [Quick start](#2-create-configjson) section above for descriptions:

   ```json
   {
     "redmineUrl": "https://proxy.company.internal/redmine",
     "redmineServerUrl": "https://redmine.company.internal",
     "aiProvider": "openai",
     "aiModel": "gpt-4o",
     "aiProxyUrl": "https://proxy.company.internal/ai",
     "azureClientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
     "holidayTicket": 2133,
     "vacationTicket": 2135,
     "breakTicket": 2134,
     "redmineAcceptsZeroHours": true
   }
   ```

3. **Set up the CORS proxy** for Redmine on a shared server accessible to all employees. This proxies requests from the app to the Redmine server with appropriate CORS headers.

4. **(Optional) Set up the AI proxy** on a shared server. This proxies requests to the AI provider and **injects the company API key server-side** — the key must NOT be placed in `config.json`, which is served as a static file readable by any browser client (see issue #114). The proxy must add the provider's auth header itself (`x-api-key` for Anthropic, `Authorization: Bearer …` for OpenAI) and strip any auth header sent by the browser. The reference dev proxy (`scripts/dev-server.mjs`) reads the key from the `AI_API_KEY` env var; mirror that pattern in your production proxy.

5. **(Optional) Register an Azure AD app** for Outlook integration:
   - Go to Azure Portal → App registrations → New registration
   - Name: "RedmineCalendar" (or your preferred name)
   - Redirect URI: `https://your-app-url/index.html` (type: **SPA**)
   - Under API permissions → Add `Calendars.Read` (delegated, Microsoft Graph)
   - Grant admin consent for the organization (allows silent SSO for all users)
   - Copy the Application (client) ID into `config.json` as `azureClientId`

6. **Employees** open the tool URL and enter only their personal Redmine API key. All other settings come from `config.json`. Outlook authentication happens silently via company SSO — no additional login needed.

### Per-user settings (informational)

Each employee configures on the in-app settings page:

- **Redmine API key** — personal authentication (stored encrypted in browser)
- **Working hours** — start/end time for the calendar display
- **Weekly hours** — contractual weekly hours (used for holiday/vacation time calculations)

The holiday / vacation / break tickets are admin-managed via `config.json` and are **not** editable per user (feature 025 FR-006).

### Verifying the deployment

After uploading the files and `config.json`:

1. Open the deployed URL — the app should load and show the Settings screen if no API key is stored yet.
2. Check `https://<your-deploy-url>/version.json` — should return `{"version":"vX.Y.Z"}` matching the latest tag.
3. Enter your Redmine API key on the Settings screen → calendar should render with your time entries.
4. (If `azureClientId` is set) Open the chatbot → say "Book my time for today" → should propose Outlook events.
5. Browser DevTools console should be free of errors after the page settles.

### Updating an existing deployment

- **Static webserver**: copy the new files over the document root, keep `config.json` untouched.
- **GitHub Pages**: push to `main` — CI/CD redeploys automatically (see [CI/CD](#cicd) below).
- No data migration is needed between releases — there is no server-side database. Per-user state (encrypted credentials, working hours, favourites) lives in each user's browser localStorage and persists across upgrades.

### Backup

There is no server-side database. Back up `config.json`. Per-user state lives in each user's browser and is the user's own responsibility.

### Security (deployment)

- Employee API keys are stored **encrypted** in each user's browser (AES-GCM via Web Crypto API). They are never sent to the web server.
- The encryption key is non-exportable and stored in IndexedDB. It cannot be read via browser DevTools.
- Admin-managed settings (Redmine URL, AI key, Azure client ID) are in `config.json` on the server.
- No credentials are stored in cookies or in plain text.
- Outlook tokens are managed by MSAL.js using delegated permissions — each user can only access their own calendar. The app never has access to other users' data.

#### CORS proxy security

> **Warning**: `npm run dev` / `scripts/dev-server.mjs` is a **development tool only**.
> Its CORS policy is restricted to `localhost` and RFC-1918 private addresses, but it
> must never be reachable from the public internet. Do not use it as your production proxy.

For production, your reverse proxy **must** restrict `Access-Control-Allow-Origin` to
your app's exact domain — never use a wildcard (`*`):

```
Access-Control-Allow-Origin: https://redmine-calendar.company.internal
```

A wildcard allows any website to make cross-origin requests through your proxy using
the visiting user's browser context — effectively letting a malicious page read or
write Redmine time entries on behalf of any employee who has the app open.

Recommended hardening checklist for the production proxy:

- **Restrict `Access-Control-Allow-Origin`** to your app domain (not `*`).
- **Include `Vary: Origin`** in responses so caches don't serve one user's CORS
  response to another.
- **Enumerate `Access-Control-Allow-Headers`** explicitly (`X-Redmine-API-Key,
Content-Type, Accept`) — do not use `*`.
- **Enforce HTTPS** — redirect HTTP to HTTPS; set `Strict-Transport-Security`.
- **IP allowlist** — restrict the proxy ports to your company's network range (firewall
  rule or `ngx_http_access_module` / Apache `Require ip`).
- **AI proxy**: strip any `Authorization` / `x-api-key` header sent by the browser
  and inject the server-side company key yourself (the dev proxy already does this —
  mirror that pattern in production).

See [`deploy/nginx.conf.example`](deploy/nginx.conf.example) and
[`deploy/apache.conf.example`](deploy/apache.conf.example) for complete,
copy-paste-ready configurations.

For a full step-by-step production deployment guide — including TLS setup, AI rate
limiting, Azure App Registration, GDPR documentation template, employee
onboarding/offboarding, and SRI hash maintenance — see
[`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md).

#### Content Security Policy

Every HTML page ships with a `<meta http-equiv="Content-Security-Policy">` baseline that covers `script-src`, `style-src`, `img-src`, `object-src`, and `base-uri`. It blocks inline script injection (only the theme-detection snippet is whitelisted by hash) and restricts remote scripts to `cdn.jsdelivr.net`.

Two directives **cannot** be set via a `<meta>` tag and **must** be delivered as server-side HTTP response headers:

- **`frame-ancestors`** — the spec explicitly forbids it in `<meta>` tags. Without it the app can be embedded in any third-party `<iframe>`, enabling clickjacking attacks where a malicious page tricks an employee into creating or deleting time entries by overlaying invisible UI on top of theirs.
- **`connect-src`** — depends on your deployment's proxy URLs, which are not known at build time.

Set both on every response for the SPA files (your main `server` / `VirtualHost` block, not the proxy locations). Replace the `connect-src` origins to match your `config.json`:

**nginx**

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net 'sha256-f7b1YAOPSc0ietZktOxGbxW1keQBQjgFgS4S1ioVfsY=';
  style-src 'self' 'unsafe-inline';
  connect-src 'self'
    https://proxy.company.internal
    https://graph.microsoft.com
    https://login.microsoftonline.com;
  img-src 'self' data:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
" always;
```

**Apache**

```apache
Header always set Content-Security-Policy "\
  default-src 'self'; \
  script-src 'self' https://cdn.jsdelivr.net 'sha256-f7b1YAOPSc0ietZktOxGbxW1keQBQjgFgS4S1ioVfsY='; \
  style-src 'self' 'unsafe-inline'; \
  connect-src 'self' https://proxy.company.internal https://graph.microsoft.com https://login.microsoftonline.com; \
  img-src 'self' data:; \
  font-src 'self' data:; \
  object-src 'none'; \
  base-uri 'self'; \
  frame-ancestors 'none';"
```

**IIS (`web.config`)**

```xml
<httpProtocol>
  <customHeaders>
    <add name="Content-Security-Policy"
         value="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'sha256-f7b1YAOPSc0ietZktOxGbxW1keQBQjgFgS4S1ioVfsY='; style-src 'self' 'unsafe-inline'; connect-src 'self' https://proxy.company.internal https://graph.microsoft.com https://login.microsoftonline.com; img-src 'self' data:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';" />
  </customHeaders>
</httpProtocol>
```

**Customise these values:**

- Replace `https://proxy.company.internal` with the values of `redmineUrl` and `aiProxyUrl` from your `config.json`. If both proxy at the same hostname, one entry is enough.
- If Outlook integration is disabled (`azureClientId` is empty or absent), you can drop `graph.microsoft.com` and `login.microsoftonline.com` from `connect-src`.
- If you embed the app inside a company portal or intranet frame, replace `frame-ancestors 'none'` with `frame-ancestors 'self' https://portal.company.internal`.

When the server-side header is present it takes precedence over the `<meta>` baseline for the directives it covers. The two are additive for `script-src` and `connect-src` — the browser applies the more restrictive value.

(For codebase-level security tooling — Dependabot, CodeQL, `npm audit` gating — see [Code quality and security](#code-quality-and-security) below.)

## Code quality and security

The codebase carries a layered quality + security stack on top of the test suite. Everything below runs locally on demand and on every CI run.

### Software Quality Index (SQI)

`npm run sqi` collapses eight metrics into a single 0-100 composite (7 structural metrics + 1 supply-chain extension). The bands are:

| Composite | Band   | Note                     |
| --------- | ------ | ------------------------ |
| ≥ 80      | GREEN  | no / minor action needed |
| 50 – 80   | YELLOW | significant problems     |
| 10 – 50   | RED    | stop development         |
| < 10      | BLACK  | rewrite                  |

Each individual metric also has a minimum score of 80 — CI fails if any single metric falls below its floor, even when the composite is GREEN. The ACD metric is currently failing (score 41, target ≤ 6) and is tracked in issue #194.

Metrics + weights (defined as constants at the top of `scripts/sqi.mjs` for tuning):

| Metric                | Source                          | Weight | Detects                                |
| --------------------- | ------------------------------- | -----: | -------------------------------------- |
| Module cycles         | `madge --circular`              |     15 | Static dependency cycles in `js/`      |
| ACD (Lakos)           | `madge` graph closure           |     15 | Average transitive coupling per module |
| Test coverage (lines) | `coverage/unified-*`            |     20 | % of lines hit by unit ∪ UI tests      |
| Module size           | ESLint `max-lines`              |     10 | Files over 500 LOC                     |
| Function length       | ESLint `max-lines-per-function` |     10 | Functions over 60 LOC                  |
| Cyclomatic complexity | ESLint `complexity`             |     15 | Functions over McCabe 15               |
| Compiler warnings     | ESLint warn + err count         |      5 | All ESLint findings on `js/**`         |
| Vulnerable deps       | `npm audit --json`              |     10 | Worst severity present in dep tree     |

CI runs `npm run sqi:json` after the test step and uploads `coverage/sqi.json` alongside the coverage HTML in the `coverage-report` artifact.

### Style + lint stack

- **ESLint v9** flat config (`eslint.config.js`) — `eslint:recommended` plus targeted rules: `prefer-const`, `eqeqeq` (with `null:'ignore'` for the `x != null` idiom), `no-var`, `no-unused-vars`, `no-console` (warn-only, allows `warn`/`error`/`info`), and a custom `no-restricted-syntax` rule that blocks the hardcoded ` `Issue #${id}` ` template-literal pattern (regression catch from a past i18n audit).
- **Prettier** (`.prettierrc.json`) — printWidth 100, single quotes, semis, ES5 trailing commas. `eslint-config-prettier` is appended to the ESLint chain so the two don't fight over style.
- **HTMLHint** (`.htmlhintrc`) — markup-level checks (lowercase tags/attrs, unique IDs, alt-required, no inline style).
- **Husky v9** + **lint-staged** — pre-commit hook auto-runs `eslint --fix` + `prettier --write` on staged files only, plus `htmlhint` on touched HTML. Catches most issues before they reach CI.

### Type checking (no build step)

- **TypeScript ^5.6** is added as a dev-dep solely for `tsc --noEmit -p tsconfig.json` — JSDoc tags are read as types, no code is transpiled, no compilation step is added to deployment.
- Domain types live in `js/types.d.ts` (`TimeEntry`, `Credentials`, `CentralConfig`, `ToolCall`, `ArbzgWarning`, `CalendarProposal`, …) plus ambient declarations for the CDN globals (`FullCalendar`, `DOMPurify`, `marked`, `msal`).
- The pure-logic modules (`arbzg`, `chatbot-api`, `config-store`, `crypto`, `i18n`, `knowledge`, `notify`, `outlook`, `redmine-api`, `version`) carry full JSDoc on public exports.
- The DOM-heavy modules (`calendar`, `time-entry-form`, `chatbot`, `chatbot-tools`, `settings`, `settings-page`) opt out via `// @ts-nocheck` — the runtime checks them via the test suite. This keeps the type pass usefully strict on the modules where types matter most.

### Dependency security

- **`npm audit --audit-level=high`** runs in CI before tests; high or critical vulnerabilities fail the build.
- **Dependabot** (`.github/dependabot.yml`) opens grouped weekly PRs for npm + github-actions bumps. Dev tooling and testing deps are bundled to keep the PR queue calm.
- **CodeQL** (`.github/workflows/codeql.yml`) runs the `security-extended` JavaScript query suite on every push, every PR, and weekly on a schedule. Findings appear in the repo's Security tab.
- **GitHub secret scanning + push protection** is on by default for the repository. Pushed commits with detected API keys / tokens are blocked at the server side.

## CI/CD

**CI**: GitHub Actions runs the full quality pipeline on every push to any branch:

1. `npm ci`
2. `npm audit --audit-level=high` (fail on high/critical)
3. `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck`
4. `npm run test:coverage` (Vitest unit tests + per-file coverage thresholds)
5. `npm run sqi:json` (SQI dashboard, written to `coverage/sqi.json`)
6. Coverage + SQI artifact upload (`coverage-report`, 14-day retention)
7. `npm run test:ui` (Playwright UI tests against headless Chromium)

CodeQL runs as a separate workflow (`.github/workflows/codeql.yml`) — push, PR, weekly schedule.

**CD**: On merge to `main`, tests run again. If all pass, the app deploys automatically to GitHub Pages.

To set up GitHub Pages deployment, configure these GitHub Actions variables/secrets:

- `REDMINE_PROXY_URL` — CORS proxy URL for Redmine
- `REDMINE_SERVER_URL` — Redmine server URL
- `AI_PROVIDER`, `AI_MODEL`, `AI_PROXY_URL` — AI assistant config
- `AI_API_KEY` (secret) — AI API key
- `AZURE_CLIENT_ID` (optional) — Azure AD app client ID for Outlook integration
- `HOLIDAY_TICKET`, `VACATION_TICKET`, `BREAK_TICKET` (optional, integers) — Redmine ticket IDs for the agentic-booking flow (see field table above). Default to `0` (disabled) if unset.
- `REDMINE_ACCEPTS_ZERO_HOURS` (optional, boolean) — set to `true` if your Redmine instance allows 0-hour time entries; `false` (default) makes the app use a `0.01h` placeholder.

## Testing

```bash
npm test          # Run unit tests (Vitest)
npm run test:ui   # Run UI tests (Playwright, headless Chromium)
npm run test:all  # Run both
```

Unit tests cover business logic (API client, settings, crypto, ArbZG, Outlook calendar parsing). UI tests cover all user-facing features (settings, calendar, time entries, copy-paste, working hours, favourites, chatbot, docs, Outlook booking).

Tests are self-contained — no live Redmine connection needed. API responses are stubbed from `tests/fixtures/`.
