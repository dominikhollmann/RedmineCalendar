# Implementation Plan: Planning View

**Branch**: `038-planning-view` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/038-planning-view/spec.md`

## Summary

The Planning View is a desktop-only day view that places existing Redmine bookings alongside Outlook calendar appointments in a side-by-side multi-column layout, letting users drag Outlook events to create time entries without leaving the page. It reuses the existing `parseCalendarProposals` classification engine (deterministic, no AI), the existing Redmine API client, and a dedicated FullCalendar `timeGridDay` instance for the Bookings column. The Outlook column uses custom DOM with HTML5 native drag-and-drop.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged

**Primary Dependencies**:

- FullCalendar v6 (CDN, existing) — `timeGridDay` view for the Bookings column
- MSAL.js v2 (CDN, existing) — Outlook Graph token acquisition via existing `js/outlook.js`
- HTML5 Drag and Drop API (browser-native) — drag source for Outlook event cards + drop overlay
- No new runtime dependencies

**Storage**: `localStorage` — one new key:

- `redmine_calendar_planning_source_outlook` (`'1'` / `'0'`, default `'1'`) — Outlook source enabled/disabled (FR-013)

**Testing**: Vitest (unit tests for pure logic), Playwright (UI tests for interaction flows) — existing infrastructure

**Target Platform**: Browser desktop (viewport ≥ 768 px); entirely hidden on mobile via CSS `@media` (FR-019)

**Project Type**: SPA feature addition — toggle-in-place within `index.html`

**Performance Goals**:

- SC-004: Full Planning View render (both columns loaded) within 3 s on broadband
- Perceived initial render (Bookings column visible, Outlook column showing spinner): ≤ 300 ms (Constitution II)

**Constraints**:

- Max 500 effective LOC per module (SQI `moduleSize` hard gate via `tests/unit/module-size.test.js`)
- Max 60 LOC per function (`max-lines-per-function` ESLint rule on `js/**`)
- SQI composite ≥ 80 GREEN required for CI merge gate
- DOMPurify (already loaded on the page via CDN) MUST be used on all Outlook event text before DOM insertion (Constitution V)

**Scale/Scope**: Single-user desktop SPA; Planning View adds 3 new JS modules + 1 new CSS file + modifications to 8 existing files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Redmine API Contract — PASS

All Redmine time-entry reads and writes go through the existing `js/redmine-api.js` client
(`fetchTimeEntries`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`). No new Redmine API
calls introduced. API key remains in encrypted `localStorage` — unchanged. API errors surfaced via
the existing `showToast` / `showError` helpers.

### II. Calendar-First UX — PASS

The Planning View extends the calendar metaphor: a day-scoped time-grid with Bookings and Outlook
columns. The Bookings column uses a real FullCalendar `timeGridDay` instance — identical interaction
model to the classic calendar (click-to-create, double-click-to-edit, drag-to-move). Mobile is
explicitly **not supported** — the feature and its toggle button are hidden via CSS at `< 768 px`
(FR-019, declared in spec Assumptions). The Bookings column renders independently and immediately;
Outlook data fetches do not block it (FR-007).

### III. Test-First — REQUIRED

Mandatory unit tests (Vitest) to be written **before** implementation:

- `classifyProposal(proposal, skippedInformational)` → `'bookable' | 'needs-ticket' | 'excluded'`
- `isFullyCovered(event, bookings)` → `boolean` (FR-016 coverage greyout)
- Day-navigation arithmetic: prev/next with Mo–Fr toggle active, Today override on weekends (FR-018)
- Batch booking result accumulation: continue-all, per-entry outcome aggregation (FR-021b)

Mandatory UI tests (Playwright) to be written before implementation:

- Planning View opens with both columns (US1)
- Drag bookable event → immediate Redmine entry, no modal (US2)
- Drag needs-ticket event → modal opens with pre-filled times (US2)
- Toggle back restores calendar to week of last Planning Day (US3)
- Day prev/next navigation, Today shortcut (US4)
- Planning View toggle hidden on `< 768 px` viewport (FR-019)

### IV. Simplicity — PASS

No new runtime dependencies. Reuses: `parseCalendarProposals` (classification + time rounding),
`fetchTimeEntries` (Bookings data), `fetchCalendarEvents` (Outlook data), `openForm` (booking
modal), `showToast`/`showError` (notifications), `getEffectiveTimeRange` (working-hours slot range),
`getInitialHiddenDays` logic (Mo–Fr navigation). The Outlook column is custom DOM with HTML5 DnD —
no additional library.

Justified complexity: splitting into 3 new JS modules is required by the 500 effective-LOC hard
gate. See Complexity Tracking.

### V. Security — PASS (requires active care)

Outlook event `subject` and body fields are sourced from Microsoft Graph and MUST be treated as
untrusted. **DOMPurify** (already loaded on the page) MUST be applied before inserting any Outlook
text into the DOM. Redmine data (issue titles from `ticketSubject`) must use `textContent`
assignment or the existing `_esc` escaping pattern — never `innerHTML`. No new credential storage
introduced.

### VI. Continuous Quality Gates — PASS

- `npm audit`: no new packages → no new advisories
- `npm run lint && typecheck`: new modules follow existing conventions; `// @ts-nocheck` on
  DOM-heavy files, full JSDoc on pure-logic exports
- `npm run test:coverage`: ≥ 95% per-file line coverage on all unit-testable logic modules
- `npm run sqi:json`: SQI currently 85; new modules ≤ 500 effective LOC, functions ≤ 60 LOC
- `npm run test:ui`: new Playwright scenarios cover all P1 user stories

## Project Structure

### Documentation (this feature)

```text
specs/038-planning-view/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── planning-view-api.md   # Exported module API
│   └── storage-keys.md        # New localStorage keys
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
# New files
js/planning-view.js           # Orchestrator: show/hide, day navigation, toggle wiring, batch dispatch
js/planning-view-bookings.js  # Bookings column: FullCalendar timeGridDay instance + Redmine data
js/planning-view-outlook.js   # Outlook column: rendering, classification, selection, drag source
css/planning-view.css         # Two-column layout, event cards, FAB, greyout, mobile hide

# Modified files
index.html                    # Add #planning-view-main container, planning toggle FAB, CSS link
js/feedback.js                # Relocate feedback FAB → app-header toolbar button (FR-001b)
js/calendar.js                # Wire dblclick on day column headers (FR-003); expose planningDay on toggle-back (FR-004)
js/config.js                  # Add STORAGE_KEY_PLANNING_SOURCE_OUTLOOK constant
js/settings-page.js           # Add "Planning View sources" section with Outlook toggle (FR-013)
js/i18n/en.js                 # New planning.* i18n keys (see contracts/planning-view-api.md)
js/i18n/de.js                 # German translations for new keys
js/knowledge.topics.json      # Add planning-view entry for AI knowledge routing
js/types.d.ts                 # Add PlanningEvent, PlanningState, PlanningEventCategory types

# Documentation (updated per CLAUDE.md housekeeping rule)
docs/content.en.md            # User-facing documentation for Planning View
docs/content.de.md            # German user-facing documentation
```

**Structure Decision**: Toggle-in-place SPA. `#calendar-main` and `#planning-view-main` coexist in
the DOM; `hidden` toggles between them. Three JS modules stay under the 500-LOC gate and align with
natural responsibility boundaries (orchestration / Bookings FC / Outlook DOM).

## Complexity Tracking

| Violation                                          | Why Needed                                                                                       | Simpler Alternative Rejected Because                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3 new modules instead of 1                         | Each concern is 200–400 effective LOC alone; a single file would breach the 500-LOC CI hard gate | Merging into one file exceeds `module-size.test.js` threshold and makes pure-logic unit isolation impossible                                                      |
| Custom drop overlay (not FullCalendar `droppable`) | HTML5 native DnD carries multiple selected event IDs in `dataTransfer` in a single drag action   | FullCalendar's `Draggable` API is one-instance-per-element; adapting it for multi-select requires significant extra state machinery with no architectural benefit |
