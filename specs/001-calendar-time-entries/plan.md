# Implementation Plan: Weekly Calendar Time Tracking

**Branch**: `001-calendar-time-entries` | **Date**: 2026-03-31
**Spec**: `specs/001-calendar-time-entries/spec.md`
**Input**: Feature specification from `/specs/001-calendar-time-entries/spec.md`

## Summary

Build a local static HTML/JS single-page application that displays the authenticated user's
Redmine time entries in a quarter-hour week calendar grid (similar to Outlook Calendar).
Users can create entries by clicking or dragging on the grid, select the Redmine ticket and
activity type in a form, and save back to Redmine via REST API. Existing entries can be
edited, deleted, or resized by dragging the bottom edge. Authentication is via a Redmine API
key stored in a browser cookie; a local CORS proxy bridges the cross-origin restriction.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2022 (no transpilation)
**Primary Dependencies**:
- FullCalendar v6 (MIT) — week grid, 15-min slots, drag-to-create, drag-to-resize
- local-cors-proxy (MIT) — CORS bridge between localhost and remote Redmine
- `npx serve` — zero-config static file server for local development
**Storage**: Browser cookie (`redmine_calendar_config`) — stores Redmine URL + API key only
**Testing**: Manual acceptance tests per `quickstart.md` checklist (personal single-user tool)
**Target Platform**: Modern desktop browser (Chrome/Firefox/Safari latest); localhost only
**Project Type**: Static web application (no backend, no build step)
**Performance Goals**: Calendar load < 3s; interactions respond < 200ms; issue search < 2s
**Constraints**: CORS via local proxy; cookie-stored config; no framework; no build tooling
**Scale/Scope**: Single user; ~50 time entries/week; ~25 issue search results

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | ✅ PASS | REST API only via `/users/current`, `/time_entries`, `/issues`, `/enumerations`. No direct DB. API key in cookie, never in source. |
| II. Calendar-First UX | ✅ PASS (v1.1.0 exception) | FullCalendar week view with 15-min slots is the primary and only view. Mobile out of scope per spec Assumptions — permitted by v1.1.0 MAY-defer clause. |
| III. Test-First | ✅ PASS (v1.1.0 exception) | Personal single-user tool; no CI; no shared contributors. Manual acceptance checklist in `quickstart.md` covers all FR and US acceptance scenarios. Deviation justified in Complexity Tracking. |
| IV. Simplicity & YAGNI | ✅ PASS | Vanilla JS, no framework, no build step. FullCalendar via CDN. Single justified external dependency. No speculative features. |
| V. Security by Default | ✅ PASS (v1.1.0 exception) | API key stored in `SameSite=Strict` same-origin browser cookie — permitted by v1.1.0 local-tool exception. Cookie never transmitted to third parties. `[start:HH:MM]` tag stripped before display (no XSS surface). Issue titles escaped by FullCalendar. Proxy target MUST use `https://`. |

**Post-Phase-1 re-check**: All principles pass under constitution v1.1.0. The `[start:HH:MM]`
tag encoding correctly strips the tag before rendering; FullCalendar escapes event title text
by default — XSS surface is zero for Principle V.

## Project Structure

### Documentation (this feature)

```text
specs/001-calendar-time-entries/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── redmine-api.md   # Redmine REST API contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
index.html                  # Calendar view (main entry point)
settings.html               # Settings screen (API key + Redmine URL)
css/
└── style.css               # Global styles + FullCalendar slot/event overrides
js/
├── config.js               # Constants: slot duration, comment tag regex, default hours range
├── settings.js             # Cookie read/write for Config; settings form logic
├── redmine-api.js          # All Redmine REST API calls (fetch wrapper + error handling)
├── time-entry-form.js      # New/edit entry form: issue search, activity dropdown, submit
└── calendar.js             # FullCalendar init, event mapping, create/resize callbacks
package.json                # npm scripts: "proxy" (lcp) and "serve" (npx serve)
```

**Structure Decision**: Single project, pure frontend. No `src/` subdirectory — files live
at the repository root for maximum simplicity. No build step; `index.html` loads FullCalendar
via CDN `<script>` tag and imports local JS files as ES modules.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| No automated tests (Principle III deviation) | Personal single-user tool; no CI; no shared contributors | Writing tests for a vanilla JS + CDN app with no test runner would require adding a test framework (Vitest/Jest), which violates Principle IV (no unjustified tooling). Manual quickstart checklist provides equivalent validation for this scope. |

## Phase 0: Research Output

See `research.md` for all decisions. Summary:

| Unknown | Decision |
|---------|----------|
| Calendar library | FullCalendar v6 (MIT, native 15-min slots, drag built-in) |
| CORS strategy | `local-cors-proxy` — one CLI command, zero config |
| Stack | Vanilla HTML/CSS/JS, no framework, no build step |
| Start-time storage | `[start:HH:MM]` appended to Redmine comment field |
| Dev server | `npx serve .` |

## Phase 1: Design Output

| Artifact | Path | Status |
|----------|------|--------|
| Data model | `specs/001-calendar-time-entries/data-model.md` | ✅ Complete |
| Redmine API contract | `specs/001-calendar-time-entries/contracts/redmine-api.md` | ✅ Complete |
| Quickstart | `specs/001-calendar-time-entries/quickstart.md` | ✅ Complete |
