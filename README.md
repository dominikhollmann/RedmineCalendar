# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine/Easy Redmine.

See **[quickstart.md](specs/001-calendar-time-entries/quickstart.md)** for setup instructions and the acceptance checklist.

## Quick start

```bash
# 1. Install dependencies (one-time)
npm install

# 2. Start the CORS proxy — replace the URL with your own Redmine server
npx lcp --proxyUrl https://your-redmine.example.com --port 8010

# 3. In a second terminal, serve the app
npm run serve           # serves the main working directory on port 3000
npm run serve:staging   # serves ../RedmineCalendar-staging on port 3001 (run simultaneously)
```

Open http://localhost:3000 (main) or http://localhost:3001 (staging) and enter your Redmine URL and API key on the settings screen (⚙ icon, top right).
