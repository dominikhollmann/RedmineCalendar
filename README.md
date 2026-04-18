# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine/Easy Redmine.

## Testing

```bash
npm test          # Run unit tests (Vitest)
npm run test:ui   # Run UI tests (Playwright, headless Chromium)
npm run test:all  # Run both
```

Unit tests cover business logic (API client, settings, crypto, ArbZG). UI tests cover all user-facing features (settings, calendar, time entries, copy-paste, working hours, favourites, chatbot, docs).

Tests are self-contained — no live Redmine connection needed. API responses are stubbed from `tests/fixtures/`.

## CI/CD

**CI**: GitHub Actions runs unit + UI tests on every push to any branch. Test results are visible on pull requests.

**CD**: On merge to `main`, tests run again. If all pass, the app deploys automatically to GitHub Pages.

To set up GitHub Pages deployment, configure these GitHub Actions variables/secrets:
- `REDMINE_PROXY_URL` — CORS proxy URL for Redmine
- `REDMINE_SERVER_URL` — Redmine server URL
- `AI_PROVIDER`, `AI_MODEL`, `AI_PROXY_URL` — AI assistant config
- `AI_API_KEY` (secret) — AI API key

**Note**: The workflow files need to be moved from `github-workflows/` to `.github/workflows/` (see below).

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
  "aiProxyUrl": "http://localhost:8011/proxy"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `redmineUrl` | Yes | CORS proxy URL for Redmine API requests |
| `redmineServerUrl` | Yes | Actual Redmine server URL (must be HTTPS) |
| `aiProvider` | No | AI provider identifier (e.g., `anthropic`) |
| `aiModel` | No | AI model identifier |
| `aiApiKey` | No | AI API key for the assistant feature |
| `aiProxyUrl` | No | CORS proxy URL for AI API requests |

### 3. Serve the app
```bash
npm run serve           # port 3000
```

### 4. Run CORS proxy for Redmine
```bash
npx lcp --proxyUrl https://your-redmine.example.com --port 8010
```

### 5. Run AI proxy (optional)
```bash
npx lcp --proxyUrl https://api.anthropic.com --port 8011
```

### 6. Open the app
Open http://localhost:3000 and enter your personal Redmine API key.

## Company deployment (multi-user)

### Prerequisites
- A static file web server (nginx, Apache, IIS, or any file server)
- A shared CORS proxy or reverse proxy for Redmine API access
- (Optional) A shared AI proxy for the AI assistant feature

### Setup

1. **Copy all files** to the web server's document root.

2. **Create `config.json`** in the document root (next to `index.html`):
   ```json
   {
     "redmineUrl": "https://proxy.company.internal:8010/proxy",
     "redmineServerUrl": "https://redmine.company.internal",
     "aiProvider": "anthropic",
     "aiModel": "claude-haiku-4-5-20251001",
     "aiApiKey": "sk-ant-company-key...",
     "aiProxyUrl": "https://proxy.company.internal:8011/proxy"
   }
   ```

3. **Set up the CORS proxy** for Redmine on a shared server accessible to all employees (e.g., `proxy.company.internal:8010`). This proxies requests from the app to the Redmine server.

4. **(Optional) Set up the AI proxy** on a shared server (e.g., `proxy.company.internal:8011`). This proxies requests to the AI provider using the company API key.

5. **Employees** open the tool URL and enter only their personal Redmine API key. All other settings come from `config.json`.

### Security

- Employee API keys are stored **encrypted** in each user's browser (AES-GCM via Web Crypto API). They are never sent to the web server.
- The encryption key is non-exportable and stored in IndexedDB. It cannot be read via browser DevTools.
- Admin-managed settings (Redmine URL, AI key) are in `config.json` on the server.
- No credentials are stored in cookies or in plain text.
