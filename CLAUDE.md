# RedmineCalendar Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-25

## Active Technologies
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — `calendar.setOption('slotMinTime', …)` / `setOption('slotMaxTime', …)` for dynamic range switching; `customButtons` for the toolbar toggle (005-working-hours-view)
- `localStorage` — keys `redmine_calendar_working_hours` (JSON) and `redmine_calendar_view_mode` (string). Credentials stored in encrypted localStorage. (005-working-hours-view)
- FullCalendar v6 `hiddenDays` option for day-column switching; `redmine_calendar_day_range` localStorage key (`'workweek'`|`'full-week'`). Week total displayed in `.app-header`. (002-calendar-view-totals)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — unchanged; `local-cors-proxy` (npm, CLI only) (006-improve-settings)
- Encrypted localStorage (`redmine_calendar_credentials`) — credential storage pattern (006-improve-settings)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — unchanged; no new dependencies (007-lean-time-entry)
- `localStorage` — keys `redmine_calendar_favourites`, `redmine_calendar_last_used` (007-lean-time-entry)
- `js/i18n.js` — inline ES module; exports `t(key, vars?)`, `locale` (`'en'|'de'`), `formatDate(dateStr)`; locale detected via `navigator.languages[0]`; no external library (003-entry-form-ux)
- In-memory clipboard (`_clipboard` module var in `calendar.js`) + `_selectedEvent` selection state; no new storage keys; double-click detected via timing in `eventClick` (FullCalendar v6 has no native dblclick callback); clipboard banner `#clipboard-banner` in `index.html` (004-copy-paste-time-entries)
- CSS3, JavaScript ES2022 (no changes to JS) + FullCalendar v6 (CDN) — existing; no new dependencies (011-visual-appearance)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — already present; no new dependencies (010-arbzg-compliance)
- N/A (computed at render time from `window._calendarDayTotals` and time-entry events) (010-arbzg-compliance)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN), Web Crypto API (browser-native), IndexedDB (browser-native) (008-multi-user-deployment)
- localStorage (encrypted credentials + plain-text preferences), IndexedDB (non-exportable encryption key), config.json (admin-managed, server-side) (008-multi-user-deployment)
- JavaScript ES2022 (vanilla ES modules, no transpilation) + Vitest (unit tests), Playwright (UI tests), GitHub Actions (CI/CD) (009-automated-testing)
- N/A (test fixtures only) (009-automated-testing)
- JavaScript ES2022 (vanilla ES modules) + Claude API (tool calling), OpenAI API (tool calling), existing chatbot infrastructure (feature 014) (015-chat-calendar-actions)
- CSS3 media queries + JavaScript ES2022 (touch events) + FullCalendar v6 (already has timeGridDay view), existing CSS (012-mobile-calendar)
- JavaScript ES2022 (vanilla, no transpilation) + Web Speech API (browser-native), FullCalendar v6 (existing, unchanged) (main)
- localStorage — key `redmine_calendar_voice_privacy_dismissed` (boolean) (main)

- HTML5, CSS3, JavaScript ES2022 (no transpilation) (001-calendar-time-entries)

## Project Structure

```text
index.html          # Calendar view (main entry point)
settings.html       # Settings screen (API key + Redmine URL)
css/style.css       # Global styles + FullCalendar overrides
js/config.js        # Constants (slot duration, comment tag regex)
js/i18n.js          # Locale detection + translation lookup (003)
js/settings.js      # Cookie read/write for Config
js/redmine-api.js   # Redmine REST API client (fetch wrapper)
js/time-entry-form.js  # Entry form: issue search, activity, submit
js/calendar.js      # FullCalendar init, event mapping, callbacks
package.json        # npm scripts: proxy, serve
```

## Commands

```bash
npm run serve          # Serve main working directory on port 3000
# CORS proxy: run the command shown in the app's Settings page after entering your Redmine server URL
# e.g. npx lcp --proxyUrl https://your-redmine.example.com --port 8010
```

## Code Style

- Vanilla ES2022 modules (`<script type="module">`); no build step, no bundler
- FullCalendar v6 loaded via CDN `<script>` tag
- `fetch()` for all HTTP calls; always include `X-Redmine-API-Key` header
- Cookie name: `redmine_calendar_config` (JSON: `{ redmineUrl, apiKey }`)
- **Localization**: ALL user-visible strings MUST be added to `js/i18n.js` and accessed via `t('key')`. Hardcoded English strings in UI code are not allowed. This applies to every feature, including error messages, tooltips, labels, and warnings.

## Recent Changes
- main: Added JavaScript ES2022 (vanilla, no transpilation) + Web Speech API (browser-native), FullCalendar v6 (existing, unchanged)
- 012-mobile-calendar: Added CSS3 media queries + JavaScript ES2022 (touch events) + FullCalendar v6 (already has timeGridDay view), existing CSS
- 015-chat-calendar-actions: Added JavaScript ES2022 (vanilla ES modules) + Claude API (tool calling), OpenAI API (tool calling), existing chatbot infrastructure (feature 014)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
