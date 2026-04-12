# RedmineCalendar Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-12

## Active Technologies
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — `calendar.setOption('slotMinTime', …)` / `setOption('slotMaxTime', …)` for dynamic range switching; `customButtons` for the toolbar toggle (005-working-hours-view)
- `localStorage` — keys `redmine_calendar_working_hours` (JSON) and `redmine_calendar_view_mode` (string). Credentials remain in cookie (unchanged). (005-working-hours-view)
- FullCalendar v6 `hiddenDays` option for day-column switching; `redmine_calendar_day_range` localStorage key (`'workweek'`|`'full-week'`). Week total displayed in `.app-header`. (002-calendar-view-totals)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — unchanged; `local-cors-proxy` (npm, CLI only) (006-improve-settings)
- SameSite=Strict browser cookie (`redmine_calendar_config`, JSON) — existing pattern (006-improve-settings)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — unchanged; no new dependencies (007-lean-time-entry)
- `localStorage` — keys `redmine_calendar_favourites`, `redmine_calendar_last_used` (007-lean-time-entry)

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
- 007-lean-time-entry: Added JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — unchanged; no new dependencies
- 006-improve-settings: Added JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — unchanged; `local-cors-proxy` (npm, CLI only)
- 002-calendar-view-totals: FullCalendar `hiddenDays` for workweek/full-week toggle; week total in app header; `redmine_calendar_day_range` localStorage key


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
