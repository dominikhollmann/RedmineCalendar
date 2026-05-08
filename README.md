# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine/Easy Redmine.

## Testing

```bash
npm test          # Run unit tests (Vitest)
npm run test:ui   # Run UI tests (Playwright, headless Chromium)
npm run test:all  # Run both
```

Unit tests cover business logic (API client, settings, crypto, ArbZG, Outlook calendar parsing). UI tests cover all user-facing features (settings, calendar, time entries, copy-paste, working hours, favourites, chatbot, docs, Outlook booking).

Tests are self-contained — no live Redmine connection needed. API responses are stubbed from `tests/fixtures/`.

## CI/CD

**CI**: GitHub Actions runs unit + UI tests on every push to any branch. Test results are visible on pull requests.

**CD**: On merge to `main`, tests run again. If all pass, the app deploys automatically to GitHub Pages.

To set up GitHub Pages deployment, configure these GitHub Actions variables/secrets:
- `REDMINE_PROXY_URL` — CORS proxy URL for Redmine
- `REDMINE_SERVER_URL` — Redmine server URL
- `AI_PROVIDER`, `AI_MODEL`, `AI_PROXY_URL` — AI assistant config
- `AI_API_KEY` (secret) — AI API key
- `AZURE_CLIENT_ID` (optional) — Azure AD app client ID for Outlook integration
- `HOLIDAY_TICKET`, `VACATION_TICKET`, `BREAK_TICKET` (optional, integers) — Redmine ticket IDs for the agentic-booking flow (see field table below). Default to `0` (disabled) if unset.
- `REDMINE_ACCEPTS_ZERO_HOURS` (optional, boolean) — set to `true` if your Redmine instance allows 0-hour time entries; `false` (default) makes the app use a `0.01h` placeholder.

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
  "aiApiKey": "sk-ant-...",
  "aiProxyUrl": "http://localhost:8011/proxy",
  "azureClientId": "",
  "holidayTicket": 0,
  "vacationTicket": 0,
  "breakTicket": 0,
  "redmineAcceptsZeroHours": false
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `redmineUrl` | Yes | CORS proxy URL for Redmine API requests |
| `redmineServerUrl` | Yes | Actual Redmine server URL (must be HTTPS) |
| `aiProvider` | No | AI provider identifier (e.g., `anthropic`, `openai`) |
| `aiModel` | No | AI model identifier |
| `aiApiKey` | No | AI API key for the assistant feature |
| `aiProxyUrl` | No | CORS proxy URL for AI API requests. Must point to a CORS proxy that fronts the provider's API endpoint (`api.anthropic.com`, `api.openai.com`, etc.). |
| `azureClientId` | No | Azure AD app client ID for Outlook calendar integration. If empty, Outlook features are disabled. Set to `"demo"` for demo mode with fake calendar events (no M365 needed). |
| `holidayTicket` | No | Numeric Redmine issue ID for **bank/public holidays** (Christmas, Karfreitag, Bank Holiday, …). When unset (`0` or absent), holiday all-day events fall through to "needs your input" in the chat booking flow. Used by feature 025. |
| `vacationTicket` | No | Numeric Redmine issue ID for **personal vacation / OOO** (Urlaub, vacation, day off, abwesend). Distinct from `holidayTicket` so reporting can separate public holidays from personal absences. |
| `breakTicket` | No | Numeric Redmine issue ID for **non-work events** (lunch, doctor, gym, Mittagessen) and **overtime compensation** (Überstundenausgleich, comp time). Saved at 0 hours so the calendar slot is visible without inflating booked hours. When unset, break-routing is disabled. |
| `redmineAcceptsZeroHours` | No | Boolean. Set to `true` if your Redmine instance allows time entries with `hours: 0` (Easy Redmine admin setting "Accept 0h timelogs"). When `false`, break entries are saved as `0.01h` placeholder; the UI still treats them as breaks. Defaults to `false`. |

### 3. Serve the app + proxies (localhost)

**Recommended (one command, all-in-one):**

```bash
npm run dev    # HTTPS app on :3000 + Redmine proxy on :8010 + AI proxy on :8011
```

The `dev` script runs `scripts/dev-server.mjs`, which serves the SPA over HTTPS and runs both CORS proxies in the same process. Proxy targets are configured in the `proxies` array at the top of that file.

**Legacy alternative** (HTTP only, separate processes):

```bash
npm run serve                                                       # app on :3000
npx lcp --proxyUrl https://your-redmine.example.com --port 8010    # Redmine
npx lcp --proxyUrl https://api.anthropic.com --port 8011            # AI (optional)
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

### Available scripts

| Script | Description |
|--------|-------------|
| `npm run serve` | HTTP app server on port 3000 (localhost only) |
| `npm run serve:https` | HTTPS app server on port 3000 (requires `.certs/`) |
| `npm run dev` | HTTPS app + Redmine proxy + AI proxy (all-in-one for cross-device testing) |
| `npm test` | Unit tests (Vitest, single run) |
| `npm run test:watch` | Unit tests in watch mode (re-runs on file change) |
| `npm run test:ui` | UI tests (Playwright, headless Chromium) |
| `npm run test:all` | All tests |

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
     "aiApiKey": "sk-company-key...",
     "aiProxyUrl": "https://proxy.company.internal/ai",
     "azureClientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
     "holidayTicket": 2133,
     "vacationTicket": 2135,
     "breakTicket": 2134,
     "redmineAcceptsZeroHours": true
   }
   ```

3. **Set up the CORS proxy** for Redmine on a shared server accessible to all employees. This proxies requests from the app to the Redmine server with appropriate CORS headers.

4. **(Optional) Set up the AI proxy** on a shared server. This proxies requests to the AI provider using the company API key.

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
- **GitHub Pages**: push to `main` — CI/CD redeploys automatically (see below).
- No data migration is needed between releases — there is no server-side database. Per-user state (encrypted credentials, working hours, favourites) lives in each user's browser localStorage and persists across upgrades.

### Backup

There is no server-side database. Back up `config.json`. Per-user state lives in each user's browser and is the user's own responsibility.

### Security

- Employee API keys are stored **encrypted** in each user's browser (AES-GCM via Web Crypto API). They are never sent to the web server.
- The encryption key is non-exportable and stored in IndexedDB. It cannot be read via browser DevTools.
- Admin-managed settings (Redmine URL, AI key, Azure client ID) are in `config.json` on the server.
- No credentials are stored in cookies or in plain text.
- Outlook tokens are managed by MSAL.js using delegated permissions — each user can only access their own calendar. The app never has access to other users' data.
