# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine and Easy Redmine.

---

## Quick Start

```bash
# 1. Install dependencies (one-time)
npm install

# 2. Start the CORS proxy — replace the URL with your own Redmine server
npx lcp --proxyUrl https://your-redmine.example.com --port 8010

# 3. In a second terminal, serve the app
npm run serve:staging   # serves ../RedmineCalendar-staging on port 3000 (UAT)
# or
npm run serve           # serves the main working directory on port 3000 (dev)
```

Open **http://localhost:3000** — you will be redirected to the Settings page on first use.

---

## Settings

All settings are stored in your browser (cookie). Nothing is sent to a server.

### Connection

| Field | Description |
|-------|-------------|
| **Redmine server URL** | The URL of your Redmine instance (e.g. `https://redmine.example.com`). Used to generate a tip for the proxy URL — not used directly for API calls. |
| **Redmine proxy URL** | The URL the app uses for all API requests. When running locally this is `http://localhost:8010/proxy` (the CORS proxy). |

> The CORS proxy is required because browsers block direct API calls to Redmine from a different origin. `npm run proxy` starts it on port 8010 and forwards requests to your Redmine server.

### Authentication

Choose one method:

**API Key** *(recommended)*  
Enter your personal Redmine API key. Find it under **My Account → API access key** in Redmine.

**Username & Password**  
Enter your Redmine login credentials directly.

### Working Hours

Set your working day start and end times (e.g. 08:00 – 17:00). The calendar will highlight and focus on this range. Leave both fields empty to disable the working hours view.

---

## Project Structure

```
index.html            # Calendar view (main entry point)
settings.html         # Settings screen
css/style.css         # Global styles + FullCalendar overrides
js/config.js          # Constants (slot duration, comment tag regex)
js/settings.js        # Cookie read/write for Config
js/redmine-api.js     # Redmine REST API client
js/time-entry-form.js # Entry form: issue search, activity, submit
js/calendar.js        # FullCalendar init, event mapping, callbacks
package.json          # npm scripts: proxy, serve
specs/                # Feature specifications (Spec Kit)
```

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run serve` | Serve the main working directory on http://localhost:3000 |
| `npm run serve:staging` | Serve `../RedmineCalendar-staging` on http://localhost:3000 (UAT) |
| `npm run serve:dev` | Serve the main working directory on http://localhost:3001 (dev alongside staging) |

---

## Technology

- Vanilla JavaScript ES2022 — no build step, no bundler
- [FullCalendar v6](https://fullcalendar.io/) via CDN
- [local-cors-proxy](https://github.com/garmeeh/local-cors-proxy) for development
