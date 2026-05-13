# Implementation Plan: Break-Ticket Booking for Non-Work Calendar Events

**Branch**: `main` (specs land on main per project policy) | **Date**: 2026-05-07 (revised during UAT 2026-05-08) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-break-ticket-booking/spec.md`

> **Updated during UAT (2026-05-08)** — the implementation diverged from this plan in several substantive ways: classifier moved from AI prompt into the tool (FR-015), `vacationTicket` added (FR-016), bank-holiday detection extended with named holidays + Outlook `showAs='oof'` fallback (FR-017), informational and overtime-comp classifiers added (FR-016/FR-018), modal hours-lock redesigned (end editable, duration label `0m (break)` per FR-019), `0.01h` placeholder for Redmine instances that reject `hours: 0` (FR-020). The implementation surface grew to `js/outlook.js`, `js/chatbot-tools.js`, `js/time-entry-form.js`, `js/redmine-api.js`, `js/calendar.js`, `js/i18n.js`, `js/settings.js`, `settings.html`, `css/style.css`, `config.json(.example)`. See spec.md FR-015 through FR-021 for current behavior.

## Summary

Route calendar events the AI classifies as non-work (e.g. "Lunch", "Doctor Appointment", "Mittagessen") to a configurable break ticket at 0 hours so the slot stays visible on the user's Redmine calendar without inflating booked hours. Drop the existing `sensitivity:'private'` filter at `js/outlook.js:118` entirely — classification is purely subject-based via the AI, not flag-based. Move both the break ticket and the legacy holiday ticket to `config.json` (admin-managed), removing the per-user holiday-ticket input from `settings.html`. Lock the time-entry modal's hours field to 0 whenever the break ticket is selected (regardless of how the modal was opened). As a side correction, change the holiday booking shape from `startTime: null` to anchor at the start of working hours (09:00 fallback) so all-day entries — both holiday and break — render with proper time anchoring.

Implementation surface is small: `js/outlook.js` (routing logic + sensitivity filter removal), `js/chatbot-tools.js` (system prompt + tool schema update for AI classification), `js/time-entry-form.js` (modal hours-lock), `js/settings.js` + `settings.html` (remove holiday-ticket input, read `breakTicket` from `config.json`, clean up legacy localStorage), `js/i18n.js` (new strings), `config.json` (admin gains `breakTicket`).

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)
**Primary Dependencies**: FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing — for Outlook Graph), existing chatbot infrastructure from features 014/015/019 (Claude/OpenAI tool-calling APIs via the dev-server CORS proxy)
**Storage**: localStorage (existing keys — `redmine_calendar_working_hours`, `redmine_calendar_weekly_hours`; legacy `redmine_calendar_holiday_ticket` removed per FR-007); `config.json` (admin-managed, server-side — new field `breakTicket: number`, existing field `holidayTicket: number` retained but no longer read from per-user settings)
**Testing**: Vitest for unit tests (deterministic outlook routing, classifier-aware mocked-AI integration, modal hours-lock state machine); Playwright for UI tests (full booking flow with mocked Outlook + AI responses, modal interaction)
**Target Platform**: Browser (desktop Chrome/Firefox/Edge primary; mobile per feature 012)
**Project Type**: Static SPA (single project; no backend except admin-managed `config.json` served as a static file plus the dev/prod CORS proxy)
**Performance Goals**: Per Calendar-First UX (Constitution II) — interactions complete perceived rendering within 300 ms. AI classification runs once per booking session (one batch call covering all unticketed events of the day), not per render. Modal hours-lock toggle is purely synchronous DOM state, well under 300 ms.
**Constraints**: No build step; AI classification is non-deterministic, so unit tests for the AI call use mocked tool responses (live behavior covered by UAT, per spec Assumptions). The Outlook `sensitivity` filter at `js/outlook.js:118` MUST be removed (FR-014) — failure to remove it would silently drop Private-flagged events even after this feature ships.
**Scale/Scope**: A booking session covers a single day, typically ≤50 calendar events; classification batch is bounded by that. No persistence beyond the existing time-entry writes to Redmine.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Compliance | Notes                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Redmine API Contract** | ✅ Pass    | All Redmine I/O continues through existing `redmine-api.js` (REST). No new endpoints, no DB access. Error handling for "break ticket not found / closed" follows existing 422/404 patterns and surfaces actionable messages (FR per Edge Cases).                                                                                                                                                                                   |
| **II. Calendar-First UX**   | ✅ Pass    | The feature's _purpose_ is to put non-work events back on the calendar (SC-001, SC-004) — directly serves Calendar-First. Modal hours-lock is synchronous DOM, ≤300 ms. AI classification is invoked at booking time, not render time, and does not block calendar rendering.                                                                                                                                                      |
| **III. Test-First**         | ✅ Pass    | Tasks (Phase 2) order tests before implementation: Vitest specs for outlook routing, classifier (mocked AI), modal hours-lock state machine; Playwright spec for the full booking flow + modal lock UI. CI is in place from feature 009.                                                                                                                                                                                           |
| **IV. Simplicity & YAGNI**  | ✅ Pass    | No new dependencies. AI classifier piggybacks on the existing chatbot system prompt — a system-prompt change is the simplest classifier surface. The keyword vocabulary lives in the prompt (per Q4: G, no admin-configurable keyword list). Holiday-shape change is a small targeted adjustment to `parseCalendarProposals`, not a new abstraction.                                                                               |
| **V. Security by Default**  | ✅ Pass    | Event titles are already escaped at render time (existing). No new credential pathways — `breakTicket` is a numeric ID, `config.json` is admin-managed and the existing pattern. The AI already sees event subjects today; this feature does not expand the data surface sent to the AI. Removing the sensitivity filter does NOT leak private content because the user explicitly enabled the booking flow on their own calendar. |

**Result**: All five gates pass. No complexity-tracking justifications needed.

**Post-design re-check (after Phase 1)**: Same five gates re-evaluated against the artifacts in `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`. All still pass:

- Phase 1 introduces no new dependencies, no new modules, no new top-level directories.
- The classifier contract (`contracts/classifier.md`) is a system-prompt addition only — no new tool, no new schema.
- The modal lock contract (`contracts/modal-lock.md`) uses native `disabled` semantics, no new framework.
- The data-model addition is one new field on an in-memory shape (`ticketSubject`) and one new enum value (`category: 'break'`); no persistent schema change.
- Test strategy (`research.md` R8) puts Vitest unit tests before implementation per Constitution III, with mocked-AI integration for non-deterministic steps.

## Project Structure

### Documentation (this feature)

```text
specs/025-break-ticket-booking/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (Routing Decision shape, config.json contract)
├── quickstart.md        # Phase 1 output (manual UAT steps)
├── contracts/
│   ├── config-json.md   # Admin config contract (breakTicket field)
│   ├── classifier.md    # System-prompt classification contract (AI tool schema)
│   └── modal-lock.md    # Time-entry modal invariants (FR-012)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
index.html               # (no change)
settings.html            # MODIFY — remove holidayTicket input + label
config.json              # MODIFY — admin adds `breakTicket: <number>`
css/style.css            # MODIFY (light) — disabled-input styling for hours field when locked
js/
├── outlook.js           # MODIFY — remove sensitivity filter (line 118), add AI-classification call site, change holiday/break all-day shape (FR-013), keep ticket-extraction precedence (Q5)
├── chatbot-tools.js     # MODIFY — extend tool schema/system prompt with non-work classification rules (multilingual EN/DE vocabulary baked in), wire breakTicket from central config
├── chatbot.js           # MODIFY (light) — surface "break-routing disabled" one-time notice when breakTicket unset (FR-004)
├── time-entry-form.js   # MODIFY — modal hours-lock invariant (FR-012): on ticket change, if newTicket === breakTicket → set hours=0, disable; else re-enable
├── settings.js          # MODIFY — read breakTicket from central config, clean up legacy `redmine_calendar_holiday_ticket` localStorage on app init (not just on settings page open), remove holidayTicket form-handling code
├── config.js            # MODIFY (light) — STORAGE_KEY_HOLIDAY_TICKET retained as a constant only for the cleanup path
├── i18n.js              # MODIFY — add EN/DE strings: "Break (0h)" label, "break-routing disabled" notice, modal hours-locked aria-label
└── redmine-api.js       # (no change — existing createTimeEntry handles startTime + 0 hours fine)

tests/
├── unit/
│   ├── outlook.test.js              # MODIFY — drop sensitivity-filter cases, add AI-classification fan-out cases (mocked classifier), add holiday-shape regression
│   ├── time-entry-modal.test.js     # NEW — modal hours-lock state machine
│   └── settings-cleanup.test.js     # NEW — legacy localStorage cleanup on app init
└── ui/
    ├── booking-flow.spec.js         # MODIFY — non-work event proposal → break-ticket modal → save 0h
    └── modal-hours-lock.spec.js     # NEW — manual ticket switch in modal toggles hours-disabled state
```

**Structure Decision**: Single project, existing static-SPA layout. No new top-level directories. All changes confined to existing `js/` modules, `tests/unit/`, `tests/ui/`, plus `settings.html` and `config.json`. This matches Constitution IV (Simplicity & YAGNI) — no new abstractions, no new dependencies.

## Complexity Tracking

> Empty — no Constitution Check violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | —          | —                                    |
