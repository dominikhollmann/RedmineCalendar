# Implementation Plan: Agentic AI Time-Booking — Phase 1: Outlook Calendar

**Branch**: `019-agentic-time-booking` | **Date**: 2026-04-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `.specify/features/019-agentic-time-booking/spec.md`

## Summary

Add Outlook calendar integration to the AI assistant. When the user says "Book my time for today", the assistant fetches the day's calendar events via Microsoft Graph API (authenticated with MSAL.js using the company's Azure AD SSO), extracts ticket numbers from meeting titles, and walks the user through booking each meeting as a Redmine time entry. Includes weekly hours setting and holiday/all-day event handling.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)
**Primary Dependencies**: FullCalendar v6 (existing), MSAL.js v2 (new — CDN, Microsoft Authentication Library for browser)
**Storage**: localStorage — existing keys + new `redmine_calendar_weekly_hours`, `redmine_calendar_holiday_ticket`
**Testing**: Vitest (unit), Playwright (UI)
**Target Platform**: Modern desktop and mobile browsers with Azure AD SSO
**Project Type**: Web application (static SPA)
**Performance Goals**: Calendar fetch + processing < 3 seconds; booking flow responsive (< 300ms per step)
**Constraints**: No server-side changes for Phase 1; MSAL.js handles all Graph API auth from browser; admin must register Azure AD app
**Scale/Scope**: Single-user interaction; ~10-20 meetings per day typical; shared deployment via static web server

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | ✅ Pass | Uses existing Redmine REST API for time entry creation via existing `create_time_entry` tool. Graph API is a read-only data source, not a Redmine bypass. |
| II. Calendar-First UX | ✅ Pass | Enhances the calendar workflow — booking proposals appear in the chat panel, entries appear on the calendar immediately after confirmation. |
| III. Test-First | ✅ Pass | Unit tests for calendar parsing, ticket extraction, time rounding, overlap detection. UI tests for the booking flow. |
| IV. Simplicity & YAGNI | ✅ Pass | One new dependency (MSAL.js via CDN). Extends existing chatbot tool pattern. No new abstractions — Graph API called directly from a new module. |
| V. Security by Default | ✅ Pass | MSAL.js delegated permissions (Calendars.Read) — users can only access their own calendar. SSO session — no new credentials stored. Token lifecycle managed by MSAL.js. **Note on token storage**: MSAL.js stores short-lived OAuth tokens in browser sessionStorage. This is a controlled deviation from Principle V's "never in client-side storage" — tokens are ephemeral, auto-refreshed, scoped to read-only calendar access, and managed entirely by the MSAL.js library (not application code). No application-managed credentials are stored in plain text. |

## Project Structure

### Documentation (this feature)

```text
.specify/features/019-agentic-time-booking/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
js/
├── outlook.js           # NEW — MSAL.js init, Graph API calendar fetch, event parsing
├── chatbot-tools.js     # MODIFIED — add book_outlook_day tool + executeBookOutlookDay handler
├── settings.js          # MODIFIED — load azureClientId from config.json, read/write weekly hours + holiday ticket
├── knowledge.js         # MODIFIED — update system prompt with booking instructions, add topic keywords
├── i18n.js              # MODIFIED — add outlook/booking translation keys
├── config.js            # MODIFIED — add WEEKLY_HOURS_KEY, HOLIDAY_TICKET_KEY constants

index.html               # MODIFIED — add MSAL.js CDN script tag
settings.html            # MODIFIED — add weekly hours + holiday ticket fields

tests/
├── unit/
│   └── outlook.test.js         # NEW — unit tests for calendar parsing, ticket extraction, rounding
├── ui/
│   └── outlook-booking.spec.js # NEW — UI tests for booking flow
```

**Structure Decision**: One new module (`outlook.js`) handles all MSAL.js + Graph API interaction. The chatbot tool pattern is extended with a single new tool. Settings page gets two new fields. No new architectural layers.

## Complexity Tracking

No violations — no complexity justifications needed.

## Design Decisions

### MSAL.js Silent Auth via SSO

MSAL.js `acquireTokenSilent()` leverages the user's existing Azure AD SSO session (same as Outlook/Teams). No login popup in the normal case. Admin registers one Azure AD app with `Calendars.Read` delegated permission and puts the client ID in `config.json`. Popup fallback only for first-time consent.

### Single Tool: book_outlook_day

One new chatbot tool (`book_outlook_day`) handles the entire flow:
1. Fetches today's calendar events from Graph API
2. Filters out already-booked time slots (checks existing Redmine entries)
3. Extracts ticket numbers from titles (`#\d+` pattern)
4. Categorizes all-day events (holidays → auto-book with daily hours; others → ask user)
5. Returns a summary to the LLM, which then walks the user through confirmation using the existing `create_time_entry` tool

This keeps the tool boundary clean — `book_outlook_day` is a data-gathering tool, while `create_time_entry` handles the actual booking (already exists and tested).

### Quarter-Hour Rounding

All times rounded to nearest 15-minute boundary before presenting to user:
- 10:03 → 10:00
- 10:08 → 10:15
- 10:22 → 10:15
- 10:38 → 10:45

### All-Day Event Handling

All-day events categorized by the LLM based on title:
- Holidays/OOO → propose booking daily hours (weekly hours / 5) to the user's holiday ticket
- Other (birthdays, reminders) → ask user whether to book or skip

Weekly hours and holiday ticket are user settings stored in localStorage.

### Config Extension

`config.json` gets one new admin field:
```json
{
  "azureClientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

If `azureClientId` is not configured, the Outlook booking feature is disabled (tool not registered, no MSAL.js initialization).
