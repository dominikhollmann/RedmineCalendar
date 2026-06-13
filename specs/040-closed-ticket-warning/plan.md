# Implementation Plan: Closed Ticket Booking Gate

**Branch**: `040-closed-ticket-warning` | **Date**: 2026-06-13 | **Spec**: [`spec.md`](spec.md)

**Input**: Feature specification from `specs/040-closed-ticket-warning/spec.md`

## Summary

Adds a two-layer safety mechanism for all six time-entry booking paths when the target ticket has `is_closed: true` in Redmine: (1) an inline warning badge beneath the issue field in the time-entry modal (visible as soon as a closed ticket is detected), and (2) a blocking confirmation dialog that must be explicitly confirmed before any Redmine API write occurs. The Outlook planning view additionally renders a ⚠️ badge on source events whose resolved ticket is closed.

A new shared `js/confirm-dialog.js` module centralises the dialog across all callers. A new `fetchIssueStatus()` / `fetchIssueStatuses()` pair in `js/redmine-api.js` provides the `is_closed` boolean without impacting existing query paths. See `research.md` for the full decision log.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)

**Primary Dependencies**: FullCalendar v6 (CDN, existing); MSAL.js v2 (CDN, existing — Outlook Graph); no new runtime dependencies

**Storage**: No new storage keys. `is_closed` status is checked at runtime and never persisted. The `_selectedIssue` in-memory state in `time-entry-form.js` is extended with `is_closed?: boolean`.

**Testing**: Vitest (unit), Playwright (UI); per project convention ≥95% line coverage on pure-logic modules

**Target Platform**: Modern desktop browsers (Chrome, Firefox, Safari, Edge); mobile out of scope per spec

**Project Type**: Static SPA (no build step); all new modules are plain ES module files

**Performance Goals**: `is_closed` badge appears ≤1 s after ticket selection (SC-001); planning view badge rendered synchronously from pre-fetched data (no per-event mid-render fetch)

**Constraints**: Module effective-LOC ≤500 (soft SQI gate), ≤600 (hard CI gate); `max-lines-per-function: 60`; no new npm runtime dependencies; all strings via `t()` i18n

**Scale/Scope**: Single-user SPA; planning view typically shows ≤30 Outlook events per day; batch status fetch is at most 30 issue IDs

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle               | Status  | Notes                                                                                                                                                                                    |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Redmine API Contract | ✅ Pass | All `is_closed` reads use `GET /issues/{id}.json` (official REST). No direct DB access.                                                                                                  |
| II. Calendar-First UX   | ✅ Pass | Feature is additive; calendar render path unchanged. Badge + dialog are non-blocking on the happy path (open tickets).                                                                   |
| III. Test-First         | ✅ Pass | Unit tests for `fetchIssueStatus`, `fetchIssueStatuses`, `showConfirmDialog` logic, and the gate injection written before implementation. Playwright UI tests for all six booking paths. |
| IV. Simplicity & YAGNI  | ✅ Pass | Single new JS module (`confirm-dialog.js`). Reuses existing confirm-overlay HTML structure. No new npm dependency.                                                                       |
| V. Security by Default  | ✅ Pass | No new credential surface. `is_closed` API response validated before use.                                                                                                                |
| VI. Quality Gates       | ✅ Pass | New module + extended modules stay within LOC limits (verified in research). SQI composite expected to remain GREEN.                                                                     |

**Post-design re-check**: See bottom of research.md — all principles hold after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/040-closed-ticket-warning/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions + rationale
├── data-model.md        # Phase 1 — type shapes + state transitions
├── quickstart.md        # Phase 1 — UAT validation guide
├── contracts/
│   ├── confirm-dialog-api.md      # showConfirmDialog() interface
│   └── redmine-issue-status-api.md # fetchIssueStatus / fetchIssueStatuses
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
js/
├── redmine-api.js            # + fetchIssueStatus(id), fetchIssueStatuses(ids[])
├── confirm-dialog.js         # NEW — shared showConfirmDialog(); exported to all callers
├── time-entry-form.js        # + is_closed badge injection; gate in doSave()
├── calendar.js               # + is_closed gate in eventDrop()
├── planning-view-outlook.js  # + is_closed badge in _buildCardContent(); batch fetch on load
├── planning-view.js          # + is_closed gate in _bookOne() (uses cached status)
├── i18n/en.js                # + closedTicketWarning, closedTicketConfirmTitle,
│                             #   closedTicketConfirmBody, confirm, cancel
├── i18n/de.js                # + same keys in German
└── knowledge.topics.json     # + confirm-dialog.js → 'time-entry' topic

css/
└── time-entry.css            # + .closed-ticket-badge styles (amber, reuses token vars)

index.html                    # + <div id="confirm-dialog"> at document root
tests/
├── unit/
│   ├── closed-ticket-status.test.js  # fetchIssueStatus / fetchIssueStatuses logic
│   └── confirm-dialog.test.js        # showConfirmDialog open/confirm/cancel behaviour
└── ui/
    └── closed-ticket.spec.js         # Playwright: all 6 booking paths (badge + dialog)
```

## Complexity Tracking

No constitution violations. No additional complexity tracking required.
