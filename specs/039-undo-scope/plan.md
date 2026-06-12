# Implementation Plan: Undo for Time-Entry Changes

**Branch**: `039-undo-scope` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/039-undo-scope/spec.md`

## Summary

Adds a keyboard-driven undo/redo stack (Ctrl+Z / Ctrl+Shift+Z) that reverses any Redmine write the app performs in the current session. A pure-logic `js/undo-manager.js` module manages the bounded in-memory stack (~20 entries). A DOM-glue `js/undo-actions.js` module instruments every write call site across both views, executes API inversions via the existing Redmine API client, navigates to the affected date, highlights the changed entry, and shows a confirmatory toast. No new runtime dependencies, no persistence, no delay before writes.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged

**Primary Dependencies**:
- FullCalendar v6 (CDN, existing) — calendar instances for navigation and event manipulation via custom DOM events
- No new runtime dependencies

**Storage**: In-memory only (`undo-manager.js` holds the two stacks as plain arrays) — no localStorage, no IndexedDB

**Testing**: Vitest (unit tests for `undo-manager.js` pure logic); Playwright (UI tests for undo/redo user flows)

**Target Platform**: Desktop browsers (keyboard shortcuts; mobile users are unaffected — no layout changes)

**Project Type**: SPA feature addition — two new modules + instrumentation of six existing modules

**Performance Goals**: SC-004 — undo/redo complete and calendar reflects result within 2 s on normal network

**Constraints**:
- Max 500 effective LOC per module (hard CI gate)
- Max 60 LOC per function (ESLint)
- SQI composite ≥ 80 GREEN

**Scale/Scope**: 2 new JS modules (~80 + ~150 effective LOC), 1 new CSS block, 1 new test module (unit) + 1 Playwright spec, instrumentation of 6 existing modules

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Redmine API Contract — PASS

All undo/redo inversions call the existing `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry` from `js/redmine-api.js`. No new Redmine endpoints or request patterns. API key remains in encrypted localStorage — unchanged. Errors surfaced via existing `showToast` / `showError` helpers.

### II. Calendar-First UX — PASS

The undo UX is designed around the calendar metaphor: Ctrl+Z navigates the view to the affected date and highlights the changed entry, mirroring how tools like Word jump to the undone location. Mobile is unaffected (keyboard shortcuts only; no layout changes below 768 px).

### III. Test-First — REQUIRED

**Mandatory unit tests (Vitest) — before implementation:**
- `pushAction` / `undoAction` / `redoAction` — LIFO stack behaviour
- Depth-limit eviction at cap (oldest entry dropped)
- Redo-stack cleared on new push
- Empty stack returns `null`

**Mandatory Playwright UI tests — before implementation:**
- Undo single delete (US1): entry reappears on calendar
- Undo form edit (US2): entry reverts to prior values
- Undo drag-move (US3): entry returns to original date
- Undo add (US4): entry disappears after delay; red-tint animation visible
- Ctrl+Z in text input has no effect on undo stack (SC-003)
- Redo after undo (US7): action reapplied

### IV. Simplicity & YAGNI — PASS

Two new modules, no new dependencies, in-memory state only. Stack management is a plain array — no cursor/linked-list complexity. Calendar integration uses decoupled custom DOM events (`undo:navigate`, `undo:preAnimate`, `undo:eventChanged`, `undo:eventDeleted`) rather than tight coupling to FullCalendar internals.

### V. Security — PASS (N/A)

No new input surfaces or credential handling. Snapshot data (entry field values) never leaves browser memory. No `innerHTML` usage — toast messages go through `showToast(t(...))`, which sets `textContent`.

### VI. Continuous Quality Gates — PASS

- `npm audit`: no new packages → no new advisories
- `npm run lint && typecheck`: new modules follow existing conventions; `// @ts-nocheck` on DOM-heavy `undo-actions.js`, full JSDoc on pure-logic `undo-manager.js` exports
- `npm run test:coverage`: ≥ 95% per-file line coverage on `undo-manager.js`
- `npm run sqi:json`: both new modules ≤ 500 effective LOC, functions ≤ 60 LOC; no new cycles
- `npm run test:ui`: all Playwright undo scenarios pass

## Project Structure

### Documentation (this feature)

```text
specs/039-undo-scope/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── undo-manager-api.md   # Exported pure-logic API for undo-manager.js
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
# New files
js/undo-manager.js              # Pure-logic: action types, stack push/undo/redo, depth limit (~80 LOC)
js/undo-actions.js              # DOM glue: keyboard listener, API inversions, navigation events, animations, toasts (~150 LOC)

tests/unit/undo-manager.test.js # Vitest: stack behaviour, depth limit, redo-clear
tests/ui/undo.spec.js           # Playwright: full undo/redo flows for all action types

# Modified files — write-call instrumentation
js/time-entry-form.js           # Push add/paste/edit/delete actions after persistTimeEntry / deleteTimeEntry resolve
js/entry-commands.js            # Push bulk-delete action; stub comment for future bulk-move instrumentation
js/calendar.js                  # Push move/resize actions in eventDrop/eventResize; listen for undo:navigate + undo:eventChanged + undo:eventDeleted + undo:preAnimate; register undo-actions on page load
js/planning-view-bookings.js    # Push move/resize actions in _onEventDrop/_onEventResize; listen for undo:* events
js/planning-view.js             # Push add action after createTimeEntry in _bookOne/_bookBatch; listen for undo:navigate

# Modified files — i18n + docs
js/i18n/en.js                   # New undo.* and redo.* translation keys (see contracts/undo-manager-api.md)
js/i18n/de.js                   # German translations
js/knowledge.topics.json        # Add undo-manager.js and undo-actions.js to a relevant topic entry

# New CSS — animation keyframes
css/time-entry.css              # .fc-event--undo-highlight (flash), .fc-event--undo-add-fade (red tint + fade)

# Documentation (CLAUDE.md housekeeping rule)
docs/content.en.md              # Document Ctrl+Z / Ctrl+Shift+Z shortcuts and undo scope
docs/content.de.md              # German
```

**Structure Decision**: Single-project SPA. `undo-manager.js` is the only pure-logic module (no DOM, no API), making it trivially unit-testable in isolation. `undo-actions.js` holds all the DOM/API glue and imports from both. All write call sites push to a module-level singleton manager exported from `undo-manager.js`.

## Complexity Tracking

_No Constitution violations — no entries._
