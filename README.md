# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine/Easy Redmine.

See **[quickstart.md](specs/001-calendar-time-entries/quickstart.md)** for setup instructions and the acceptance checklist.

## Quick start

# 1. Install dependencies (one-time)
```bash
npm install
```

# 2. Serve the app
```bash
npm run serve           # port 3000
npm run serve:staging   # port 3001 (run simultaneously for side-by-side testing)
```

3. Open http://localhost:3000 (main) or http://localhost:3001 (staging) and go to **Settings** (⚙ icon, top right). Enter your Redmine server URL and API key.

4. Run the CORS proxy command shown on the Settings page in a second terminal.
