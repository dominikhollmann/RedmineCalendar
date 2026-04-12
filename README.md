# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine/Easy Redmine.

See **[quickstart.md](specs/001-calendar-time-entries/quickstart.md)** for setup instructions and the acceptance checklist.

## Quick start

```bash
# 1. Install dependencies (one-time)
npm install

# 2. Serve the app
npm run serve           # port 3000
npm run serve:staging   # port 3001 (run simultaneously for side-by-side testing)
```

Open http://localhost:3000 and go to Settings (⚙ icon, top right). Enter your Redmine server URL and API key — the settings page will show the exact CORS proxy command to run in a second terminal.
