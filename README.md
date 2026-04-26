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
  "azureClientId": ""
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `redmineUrl` | Yes | CORS proxy URL for Redmine API requests |
| `redmineServerUrl` | Yes | Actual Redmine server URL (must be HTTPS) |
| `aiProvider` | No | AI provider identifier (e.g., `anthropic`, `openai`) |
| `aiModel` | No | AI model identifier |
| `aiApiKey` | No | AI API key for the assistant feature |
| `aiProxyUrl` | No | CORS proxy URL for AI API requests |
| `azureClientId` | No | Azure AD app client ID for Outlook calendar integration. If empty, Outlook features are disabled. |

### 3. Serve the app (localhost only)
```bash
npm run serve           # HTTP on port 3000
```

### 4. Run CORS proxies
```bash
npx lcp --proxyUrl https://your-redmine.example.com --port 8010   # Redmine
npx lcp --proxyUrl https://api.anthropic.com --port 8011           # AI (optional)
```

### 5. Open the app
Open http://localhost:3000 and enter your personal Redmine API key.

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
| `npm test` | Unit tests |
| `npm run test:ui` | UI tests |
| `npm run test:all` | All tests |

## Company deployment (multi-user)

### Prerequisites
- A static file web server (nginx, Apache, IIS, or any file server) with HTTPS
- A shared CORS proxy or reverse proxy for Redmine API access
- (Optional) A shared AI proxy for the AI assistant feature
- (Optional) An Azure AD app registration for Outlook calendar integration

### Setup

1. **Copy all files** to the web server's document root.

2. **Create `config.json`** in the document root (next to `index.html`):
   ```json
   {
     "redmineUrl": "https://proxy.company.internal/redmine",
     "redmineServerUrl": "https://redmine.company.internal",
     "aiProvider": "openai",
     "aiModel": "gpt-4o",
     "aiApiKey": "sk-company-key...",
     "aiProxyUrl": "https://proxy.company.internal/ai",
     "azureClientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
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

### Employee settings

Each employee can configure on the settings page:
- **Redmine API key** — personal authentication (stored encrypted in browser)
- **Working hours** — start/end time for the calendar display
- **Weekly hours** — contractual weekly hours (used for holiday time calculations)
- **Holiday ticket** — Redmine ticket number for booking holidays/OOO days

### Security

- Employee API keys are stored **encrypted** in each user's browser (AES-GCM via Web Crypto API). They are never sent to the web server.
- The encryption key is non-exportable and stored in IndexedDB. It cannot be read via browser DevTools.
- Admin-managed settings (Redmine URL, AI key, Azure client ID) are in `config.json` on the server.
- No credentials are stored in cookies or in plain text.
- Outlook tokens are managed by MSAL.js using delegated permissions — each user can only access their own calendar. The app never has access to other users' data.
