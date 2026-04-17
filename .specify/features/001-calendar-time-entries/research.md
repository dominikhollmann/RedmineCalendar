# Research: Weekly Calendar Time Tracking

**Branch**: `001-calendar-time-entries` | **Date**: 2026-03-31
**Input**: Technical unknowns from plan.md Technical Context

---

## Decision 1: JavaScript Calendar Library

**Decision**: FullCalendar v6 (MIT license)

**Rationale**:
- Native `slotDuration: '00:15:00'` — exact match for quarter-hour precision requirement
- `selectable: true` → click-to-create; drag across slots → duration selection; all built-in
- `editable: true` → drag bottom edge to resize (FR-010 drag-to-resize out of the box)
- No jQuery, no Moment.js — pure ES2022 modules
- Available via CDN (no build step required), satisfying the Simplicity principle
- MIT license — no restrictions for personal or commercial use

**Alternatives considered**:
- **Toast UI Calendar**: MIT but 15-minute slot precision is not natively supported
  (GitHub issue #187); would require significant custom code.
- **Vanilla JS**: Full control but ~40–60 hours to build equivalent drag behavior;
  violates Simplicity & YAGNI (constitution principle IV).

**CDN usage** (no build step):
```html
<link href='https://cdn.jsdelivr.net/npm/fullcalendar@6/index.global.min.css' rel='stylesheet' />
<script src='https://cdn.jsdelivr.net/npm/fullcalendar@6/index.global.min.js'></script>
```

---

## Decision 2: CORS Strategy

**Decision**: `local-cors-proxy` npm package run locally alongside the app

**Rationale**:
- Redmine (including Easy Redmine) has no built-in CORS support; browser blocks
  cross-origin `fetch()` from `localhost` / `file://` to the remote Redmine domain.
- `local-cors-proxy` is a single CLI command, zero configuration, MIT license.
- Runs as a local HTTP proxy on a chosen port (e.g., 8010); all Redmine API calls
  are routed through `http://localhost:8010/` instead of directly to Redmine.
- Keeps the API key in the browser cookie visible only to the local proxy requests.

**Setup** (one-time per session):
```bash
npm install -g local-cors-proxy
lcp --proxyUrl https://your-redmine.example.com --port 8010
```

**Frontend usage**:
```js
// Instead of fetch('https://your-redmine.example.com/time_entries.json')
fetch('http://localhost:8010/time_entries.json', { headers: { 'X-Redmine-API-Key': apiKey } })
```

**Alternatives considered**:
- **cors-anywhere**: More configurable but requires a small Node.js server file to write.
- **Browser CORS extension**: Disables CORS globally — security risk; not reproducible.
- **Redmine plugin**: Requires server admin/plugin installation access; SaaS Easy Redmine
  does not expose plugin management to end users.
- **Nginx/Apache header config**: Requires server admin access; not available for cloud
  Easy Redmine instances.

---

## Decision 3: Application Stack

**Decision**: Vanilla HTML5 + CSS3 + JavaScript (ES2022) — no framework, no build step

**Rationale**:
- Spec is single-user, single-developer, personal tool. Constitution principle IV (Simplicity)
  prohibits frameworks not justified by a concrete present need.
- FullCalendar via CDN eliminates the only complex UI problem.
- `fetch()` is sufficient for all Redmine API calls — no HTTP library needed.
- `document.cookie` API handles config persistence — no state management library needed.

**Alternatives considered**:
- **React + Vite**: Adds build tooling complexity; no concrete benefit for a single-page,
  single-user tool with one library (FullCalendar).
- **Vue/Svelte**: Same argument as React — unjustified complexity for this scope.

---

## Decision 4: Start-Time Metadata Encoding

**Decision**: Append `[start:HH:MM]` tag to end of Redmine time entry comment field

**Rationale**: User selected this in `/speckit.clarify` (Option A). Redmine stores only
date + duration; no native start-time field exists. Encoding in the comment survives
across all browsers/devices because it is stored server-side in Redmine.

**Implementation rules**:
- Tag format: `[start:09:00]` (24-hour, zero-padded)
- Parse regex: `/\[start:(\d{2}:\d{2})\]$/`
- Strip from displayed comment: `comment.replace(/\s*\[start:\d{2}:\d{2}\]$/, '')`
- Append/replace on save: strip first, then append `' [start:HH:MM]'` to end
- Entries without tag (created in Redmine directly): displayed at top of day column
  with a visual "?" indicator

---

## Decision 5: Development Server

**Decision**: `npx serve .` (zero-install static file server)

**Rationale**: Simplest way to serve static files from localhost without installing
anything globally. `npx serve .` runs from the repo root; no config file needed.

**Alternatives considered**:
- Python `http.server`: Viable but requires Python; `serve` is more user-friendly.
- Live-server: Hot reload is nice-to-have but not required for this tool.
