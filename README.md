# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine/Easy Redmine.

See **[quickstart.md](specs/001-calendar-time-entries/quickstart.md)** for setup instructions and the acceptance checklist.

## Quick start

```bash
# 1. Install the CORS proxy (one-time)
npm install

# 2. Start the proxy (replace the URL in package.json first!)
npm run proxy

# 3. In a second terminal, serve the app
npm run serve
```

Open http://localhost:3000 and enter your Redmine proxy URL + API key on the settings screen.
