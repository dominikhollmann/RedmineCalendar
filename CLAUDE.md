# RedmineCalendar Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-31

## Active Technologies

- HTML5, CSS3, JavaScript ES2022 (no transpilation) (001-calendar-time-entries)

## Project Structure

```text
index.html          # Calendar view (main entry point)
settings.html       # Settings screen (API key + Redmine URL)
css/style.css       # Global styles + FullCalendar overrides
js/config.js        # Constants (slot duration, comment tag regex)
js/settings.js      # Cookie read/write for Config
js/redmine-api.js   # Redmine REST API client (fetch wrapper)
js/time-entry-form.js  # Entry form: issue search, activity, submit
js/calendar.js      # FullCalendar init, event mapping, callbacks
package.json        # npm scripts: proxy, serve
```

## Commands

```bash
npm run proxy   # Start local CORS proxy (lcp --proxyUrl <redmine-url> --port 8010)
npx serve .     # Serve static files on localhost:3000
```

## Code Style

- Vanilla ES2022 modules (`<script type="module">`); no build step, no bundler
- FullCalendar v6 loaded via CDN `<script>` tag
- `fetch()` for all HTTP calls; always include `X-Redmine-API-Key` header
- Cookie name: `redmine_calendar_config` (JSON: `{ redmineUrl, apiKey }`)
- Start-time tag format in comments: `[start:HH:MM]` (24h, appended to end)

## Recent Changes

- 001-calendar-time-entries: Added HTML5, CSS3, JavaScript ES2022 (no transpilation)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
